// Serviciul tranzacțional (Lotul 5b, D35): o cerere = o tranzacție.
//   1. blocarea zilei cererii (cererile pentru aceeași zi trec una după alta; zilele diferite merg în paralel);
//   2. idempotența: aceeași cheie → aceeași decizie, fără o a doua rezervare;
//   3. citirea stării din baza de date;
//   4. decizia motorului (src/engine/allocate.ts, neschimbat);
//   5. scrierea mutărilor și a rezervării noi, apoi a deciziei, și COMMIT — totul sau nimic.
// Constrângerile din baza de date (001_schema.sql) rămân a doua linie de apărare: dacă ceva scapă, COMMIT-ul eșuează.

import type pg from 'pg';
import { allocate, type AllocateOptions, type Alternative, type Decision, type Move, type Reason } from '../engine/allocate.ts';
import type { RoomEvaluation } from '../engine/score.ts';
import type { Booking, Request } from '../engine/types.ts';
import { insertBooking, moveBooking, readInstance, readState } from './store.ts';

/** Decizia, fără starea completă (aceasta rămâne în baza de date). Se păstrează în tabelul `requests`. */
export interface ServiceDecision {
  kind: 'accepted' | 'rejected';
  requestId: string;
  booking?: Booking;
  moves: Move[];
  evaluation?: RoomEvaluation;
  reasons: Reason[];
  alternatives: Alternative[];
  explanation: string[];
}

export interface SubmitResult {
  decision: ServiceDecision;
  /** Adevărat dacă cererea cu aceeași cheie fusese deja tratată: nu s-a scris nimic nou. */
  replayed: boolean;
}

/** Puncte de oprire pentru teste (starea intermediară, întreruperea la mijloc). Nu se folosesc în producție. */
export interface TestHooks {
  afterLock?: () => Promise<void> | void;
  afterMoves?: () => Promise<void> | void;
  beforeCommit?: () => Promise<void> | void;
}

export interface SubmitOptions extends AllocateOptions {
  /** Cheia de idempotență; implicit identificatorul cererii. */
  key?: string;
  hooks?: TestHooks;
}

export class IdempotencyConflictError extends Error {
  constructor(key: string) {
    super(`cheia ${key} a fost folosită deja pentru o cerere diferită`);
    this.name = 'IdempotencyConflictError';
  }
}

function toServiceDecision(d: Decision): ServiceDecision {
  return d.kind === 'accepted'
    ? { kind: 'accepted', requestId: d.requestId, booking: d.booking, moves: d.moves, evaluation: d.evaluation, reasons: [], alternatives: [], explanation: d.explanation }
    : { kind: 'rejected', requestId: d.requestId, moves: [], reasons: d.reasons, alternatives: d.alternatives, explanation: d.explanation };
}

/** JSON cu cheile ordonate, ca două cereri identice să fie recunoscute indiferent de ordinea câmpurilor. */
function canonical(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonical).join(',')}]`;
  if (x && typeof x === 'object')
    return `{${Object.keys(x)
      .filter((k) => (x as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((x as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(x);
}

export async function submitRequest(pool: pg.Pool, request: Request, options: SubmitOptions = {}): Promise<SubmitResult> {
  const { key = request.id, hooks, ...allocOptions } = options;
  const payload = canonical(request);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1. blocarea zilei: eliberată automat la COMMIT / ROLLBACK
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`ra:day:${request.date}`]);
    await hooks?.afterLock?.();

    // 2. idempotența (după blocare: două cereri identice simultane nu trec amândouă)
    const prev = await client.query<{ payload: unknown; decision: ServiceDecision }>('SELECT payload, decision FROM requests WHERE key = $1', [key]);
    if (prev.rows[0]) {
      await client.query('COMMIT');
      if (canonical(prev.rows[0].payload) !== payload) throw new IdempotencyConflictError(key);
      return { decision: prev.rows[0].decision, replayed: true };
    }

    // 3–4. starea din baza de date și decizia motorului
    const instance = await readInstance(client);
    const state = await readState(client);
    const decision = toServiceDecision(allocate(instance, state, request, allocOptions));

    // 5. scrierea
    if (decision.kind === 'accepted') {
      for (const m of decision.moves) await moveBooking(client, m.bookingId, m.from, m.to);
      await hooks?.afterMoves?.();
      await insertBooking(client, decision.booking!);
    }
    await client.query('INSERT INTO requests (key, payload, outcome, decision, booking_id) VALUES ($1, $2, $3, $4, $5)', [
      key,
      payload,
      decision.kind,
      JSON.stringify(decision),
      decision.booking?.id ?? null,
    ]);
    await hooks?.beforeCommit?.();
    await client.query('COMMIT');
    return { decision, replayed: false };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
