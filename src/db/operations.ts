// Operațiile tranzacționale ale Lotului 6a (D38), pe același model ca serviciul cererilor (service.ts):
// blocarea zilelor → idempotența → starea din baza de date → motorul (neschimbat) → scrierea diferenței → COMMIT.
// - aplicarea unei alternative propuse (altă pereche/zi sau ruperea blocului, cu acordul profesorului, D20);
// - anularea unei rezervări;
// - închiderea unei săli cu repararea automată (cazul 5, D19).

import type pg from 'pg';
import { allocate, type AllocateOptions, type Alternative } from '../engine/allocate.ts';
import { repairClosure, type RepairReport } from '../engine/repair.ts';
import type { Booking, Closure, Request, State } from '../engine/types.ts';
import { canonical, IdempotencyConflictError, submitRequest, type ServiceDecision, type SubmitResult, type TestHooks } from './service.ts';
import { insertBooking, readInstance, readState } from './store.ts';

export class OperationError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Blochează zilele în ordine crescătoare (aceeași ordine peste tot, deci fără blocaje reciproce). */
async function lockDays(client: pg.PoolClient, days: string[]): Promise<void> {
  for (const d of [...new Set(days)].sort()) await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`ra:day:${d}`]);
}

async function replay<T>(client: pg.PoolClient, key: string, payload: string): Promise<T | null> {
  const prev = await client.query<{ payload: unknown; decision: T }>('SELECT payload, decision FROM requests WHERE key = $1', [key]);
  if (!prev.rows[0]) return null;
  if (canonical(prev.rows[0].payload) !== payload) throw new IdempotencyConflictError(key);
  return prev.rows[0].decision;
}

/**
 * Scrie diferența dintre două stări: rezervări șterse, săli schimbate (la aceeași oră), statut schimbat, rezervări noi.
 * O rezervare înghețată sau fixă își schimbă sala doar aici, la închiderea sălii ei (D19): statutul devine
 * temporar `movable` pentru mutare, apoi se pune la loc (trigger-ul H8 rămâne activ pentru orice altă scriere).
 */
export async function applyDiff(client: pg.PoolClient, before: State, after: State): Promise<void> {
  const old = new Map(before.bookings.map((b) => [b.id, b] as const));
  const now = new Map(after.bookings.map((b) => [b.id, b] as const));
  for (const b of before.bookings) if (!now.has(b.id)) await client.query('DELETE FROM bookings WHERE id = $1', [b.id]);
  const restore: Booking[] = [];
  for (const b of after.bookings) {
    const o = old.get(b.id);
    if (!o) continue;
    if (o.date !== b.date || o.start !== b.start || o.length !== b.length) throw new Error(`eroare internă: ${b.id} și-ar schimba ora`);
    if (o.roomId !== b.roomId) {
      if (o.status !== 'movable') await client.query("UPDATE bookings SET status = 'movable' WHERE id = $1", [b.id]);
      const r = await client.query('UPDATE bookings SET room_id = $3 WHERE id = $1 AND room_id = $2', [b.id, o.roomId, b.roomId]);
      if (r.rowCount !== 1) throw new Error(`eroare internă: mutarea ${b.id} nu corespunde stării`);
      restore.push(b);
    } else if (o.status !== b.status || (o.blockId ?? null) !== (b.blockId ?? null)) {
      await client.query('UPDATE bookings SET status = $2, block_id = $3, split_approved = $4 WHERE id = $1', [b.id, b.status, b.blockId ?? null, b.splitApproved ?? false]);
    }
  }
  for (const b of restore) await client.query('UPDATE bookings SET status = $2 WHERE id = $1', [b.id, b.status]);
  for (const b of after.bookings) if (!old.has(b.id)) await insertBooking(client, b);
}

async function inTransaction<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

const SPLIT_OPTIONS: AllocateOptions = { alternatives: 0, split: false };

/** Aplică o alternativă propusă de motor, confirmată de profesor. Fiecare alternativă are cheia ei de idempotență. */
export async function applyAlternative(pool: pg.Pool, request: Request, alt: Alternative, options: AllocateOptions & { hooks?: TestHooks } = {}): Promise<SubmitResult> {
  if (alt.kind === 'slot') {
    const moved: Request = { ...request, date: alt.date, start: alt.start, latest: undefined };
    return submitRequest(pool, moved, { ...options, key: `${request.id}@${alt.date}/${alt.start}` });
  }
  const [p1, p2] = alt.parts;
  if (!p1 || !p2 || alt.date !== request.date || p1.start !== request.start || p1.start + p1.length !== p2.start || p1.length + p2.length !== request.length) {
    throw new OperationError(400, 'INVALID_ALTERNATIVE', 'ruperea blocului nu corespunde cererii');
  }
  const key = `${request.id}@split/${alt.date}/${p1.start}+${p1.length}`;
  const payload = canonical({ request, alternative: alt });
  return inTransaction(pool, async (client) => {
    await lockDays(client, [request.date]);
    await options.hooks?.afterLock?.();
    const prev = await replay<ServiceDecision>(client, key, payload);
    if (prev) return { decision: prev, replayed: true };
    const instance = await readInstance(client);
    const state = await readState(client);
    const maxMoves = options.maxMoves ?? 2;
    const base: Request = { ...request, latest: undefined };
    const first = allocate(instance, state, { ...base, id: `${request.id}#1`, start: p1.start, length: p1.length }, { ...options, ...SPLIT_OPTIONS, maxMoves });
    const second =
      first.kind === 'accepted'
        ? allocate(instance, first.state, { ...base, id: `${request.id}#2`, start: p2.start, length: p2.length }, { ...options, ...SPLIT_OPTIONS, maxMoves: Math.max(0, maxMoves - first.moves.length) })
        : null;
    let decision: ServiceDecision;
    if (first.kind === 'accepted' && second?.kind === 'accepted') {
      const ids = new Set([`${request.id}#1`, `${request.id}#2`]);
      const after: State = { ...second.state, bookings: second.state.bookings.map((b) => (ids.has(b.id) ? { ...b, blockId: request.id, splitApproved: true } : b)) };
      await applyDiff(client, state, after);
      decision = {
        kind: 'accepted',
        requestId: request.id,
        booking: after.bookings.find((b) => b.id === `${request.id}#2`),
        moves: [...first.moves, ...second.moves],
        evaluation: second.evaluation,
        reasons: [],
        alternatives: [],
        explanation: [
          `Blocul ${request.id} a fost rupt cu acordul profesorului (D20): ${first.booking.roomId} pentru ${p1.length} ${p1.length === 1 ? 'pereche' : 'perechi'}, ${second.booking.roomId} pentru ${p2.length}.`,
          ...first.explanation,
          ...second.explanation,
        ],
      };
    } else {
      const failed = first.kind === 'rejected' ? first : second!.kind === 'rejected' ? second! : null;
      decision = {
        kind: 'rejected',
        requestId: request.id,
        moves: [],
        reasons: failed?.kind === 'rejected' ? failed.reasons : [],
        alternatives: [],
        explanation: [`Ruperea blocului ${request.id} nu mai este posibilă: starea s-a schimbat de la propunere.`, ...(failed?.explanation ?? [])],
      };
    }
    await client.query('INSERT INTO requests (key, payload, outcome, decision) VALUES ($1, $2, $3, $4)', [key, payload, decision.kind, JSON.stringify(decision)]);
    await options.hooks?.beforeCommit?.();
    return { decision, replayed: false };
  });
}

export interface CancelResult {
  bookingId: string;
  cancelled: boolean;
  replayed: boolean;
}

/**
 * Anularea unei rezervări (D38). Fără autentificare reală (D37): profesorul anulează doar rezervările lui;
 * administratorul, orice rezervare.
 */
export async function cancelBooking(pool: pg.Pool, bookingId: string, by: { teacher?: string; admin?: boolean }): Promise<CancelResult> {
  const key = `cancel:${bookingId}`;
  const payload = canonical({ bookingId });
  const day = (await pool.query<{ day: string }>("SELECT to_char(day, 'YYYY-MM-DD') AS day FROM bookings WHERE id = $1", [bookingId])).rows[0]?.day;
  return inTransaction(pool, async (client) => {
    if (day) await lockDays(client, [day]);
    const prev = await replay<CancelResult>(client, key, payload);
    if (prev) return { ...prev, replayed: true };
    const row = (await client.query<{ teacher: string | null }>('SELECT teacher FROM bookings WHERE id = $1 FOR UPDATE', [bookingId])).rows[0];
    if (!row) throw new OperationError(404, 'NOT_FOUND', `rezervarea ${bookingId} nu există`);
    if (!by.admin && row.teacher !== (by.teacher ?? null)) throw new OperationError(403, 'FORBIDDEN', `rezervarea ${bookingId} aparține altui profesor`);
    await client.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    const result: CancelResult = { bookingId, cancelled: true, replayed: false };
    await client.query('INSERT INTO requests (key, payload, outcome, decision) VALUES ($1, $2, $3, $4)', [key, payload, 'cancelled', JSON.stringify(result)]);
    return result;
  });
}

/** Raportul reparării, fără starea completă (aceasta rămâne în baza de date). */
export type ClosureReport = Omit<RepairReport, 'state'>;

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/**
 * Închiderea unei săli cu repararea automată (D19, D38): rezervările afectate se realocă întâi la aceeași oră;
 * cele nerezolvate ies din orar și rămân în raport, cu alternativele propuse (decizie umană).
 * Se blochează toate zilele închiderii, ca nicio cerere simultană să nu ocupe sala închisă.
 */
export async function closeRoom(pool: pg.Pool, closure: Closure, options: AllocateOptions & { hooks?: TestHooks } = {}): Promise<{ report: ClosureReport; replayed: boolean }> {
  const days = daysBetween(closure.from, closure.to);
  if (!days.length || days.length > 366) throw new OperationError(400, 'INVALID_RANGE', 'intervalul închiderii trebuie să aibă între 1 și 366 de zile');
  const key = `closure:${closure.roomId}:${closure.from}:${closure.to}`;
  const payload = canonical(closure);
  return inTransaction(pool, async (client) => {
    await lockDays(client, days);
    await options.hooks?.afterLock?.();
    const prev = await replay<ClosureReport>(client, key, payload);
    if (prev) return { report: prev, replayed: true };
    const instance = await readInstance(client);
    if (!instance.rooms.some((r) => r.id === closure.roomId)) throw new OperationError(404, 'NOT_FOUND', `sala ${closure.roomId} nu există`);
    const state = await readState(client);
    const { state: after, ...report } = repairClosure(instance, state, closure, options);
    if (report.violations.length) throw new Error(`eroare internă la reparare: ${report.violations.map((v) => v.message).join('; ')}`);
    await applyDiff(client, state, after);
    await client.query('INSERT INTO closures (room_id, from_day, to_day, reason, report) VALUES ($1, $2, $3, $4, $5)', [closure.roomId, closure.from, closure.to, closure.reason, JSON.stringify(report)]);
    await client.query('INSERT INTO requests (key, payload, outcome, decision) VALUES ($1, $2, $3, $4)', [key, payload, 'closure', JSON.stringify(report)]);
    await options.hooks?.beforeCommit?.();
    return { report, replayed: false };
  });
}
