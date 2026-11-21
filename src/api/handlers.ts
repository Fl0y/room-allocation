// Logica API-ului (Lotul 6a, D38), separată de Next.js: fiecare funcție primește conexiunea și datele deja citite
// și întoarce { status, body }. Fișierele din app/api/ doar le apelează; testele le apelează direct.

import type pg from 'pg';
import type { z } from 'zod';
import { timeLabel, DEFAULT_GRID } from '../engine/grid.ts';
import { applyAlternative, cancelBooking, closeRoom, OperationError } from '../db/operations.ts';
import { IdempotencyConflictError, submitRequest } from '../db/service.ts';
import { bookingFromRow } from '../db/store.ts';
import { alternativeSchema, bookingsQuerySchema, cancelSchema, closureSchema, submitSchema } from './schemas.ts';
import type { Request } from '../engine/types.ts';

export interface ApiResult {
  status: number;
  body: unknown;
}

/** Strategia folosită de aplicație: scorul D25/D31, cel mult 2 mutări (results.md §3.5). */
export const APP_OPTIONS = { strategy: 'score' as const, maxMoves: 2, alternatives: 5, split: true };

const ok = (body: unknown, status = 200): ApiResult => ({ status, body });
const fail = (status: number, code: string, message: string, issues?: unknown): ApiResult => ({ status, body: { error: { code, message, ...(issues ? { issues } : {}) } } });

function parse<S extends z.ZodType>(schema: S, input: unknown): { ok: true; data: z.infer<S> } | { ok: false; result: ApiResult } {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, result: fail(400, 'VALIDATION', 'date invalide', r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))) };
}

async function guard(op: () => Promise<ApiResult>): Promise<ApiResult> {
  try {
    return await op();
  } catch (e) {
    if (e instanceof IdempotencyConflictError) return fail(409, 'IDEMPOTENCY_CONFLICT', e.message);
    if (e instanceof OperationError) return fail(e.status, e.code, e.message);
    const code = (e as { code?: string }).code;
    if (code === '23P01' || code === '23505' || code === '23514' || code === '23503') return fail(409, 'CONFLICT', `baza de date a refuzat scrierea (${code}); reîncercați`);
    console.error(e);
    return fail(500, 'INTERNAL', 'eroare internă');
  }
}

export async function getMeta(pool: pg.Pool): Promise<ApiResult> {
  const [rooms, units, teachers, days] = await Promise.all([
    pool.query('SELECT id, name, type, capacity, computers, projector, board FROM rooms ORDER BY id'),
    pool.query('SELECT u.id, u.kind, u.parent, u.name, (SELECT COALESCE(sum(a.size), 0)::int FROM units a WHERE a.id IN (SELECT unit_atoms(ARRAY[u.id]))) AS students FROM units u ORDER BY u.id'),
    pool.query('SELECT id, name FROM teachers ORDER BY id'),
    pool.query("SELECT to_char(day, 'YYYY-MM-DD') AS day FROM calendar_days ORDER BY day"),
  ]);
  return ok({ grid: DEFAULT_GRID, rooms: rooms.rows, units: units.rows, teachers: teachers.rows, days: days.rows.map((r) => r.day) });
}

export async function listBookings(pool: pg.Pool, query: Record<string, string | undefined>): Promise<ApiResult> {
  const p = parse(bookingsQuerySchema, query);
  if (!p.ok) return p.result;
  const q = p.data;
  const where: string[] = [];
  const args: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    args.push(v);
    where.push(sql.replace('?', `$${args.length}`));
  };
  if (q.day) add('b.day = ?', q.day);
  if (q.from) add('b.day >= ?', q.from);
  if (q.to) add('b.day <= ?', q.to);
  if (q.room) add('b.room_id = ?', q.room);
  if (q.teacher) add('b.teacher = ?', q.teacher);
  // o unitate vede tot ce o privește: activitățile ei, ale părinților și ale subgrupelor (unități atomice comune)
  if (q.unit) add('b.id IN (SELECT booking_id FROM booking_atoms WHERE atom_id IN (SELECT unit_atoms(ARRAY[?::text])))', q.unit);
  const rows = (
    await pool.query(
      `SELECT b.id, b.teacher, b.units, b.activity, b.needs, to_char(b.day, 'YYYY-MM-DD') AS day, b.periods::text AS periods, b.students,
              b.room_id, b.status, b.block_id, b.split_approved, r.name AS room_name, t.name AS teacher_name
         FROM bookings b JOIN rooms r ON r.id = b.room_id LEFT JOIN teachers t ON t.id = b.teacher
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY b.day, lower(b.periods), b.room_id`,
      args,
    )
  ).rows;
  return ok({
    bookings: rows.map((r) => {
      const b = bookingFromRow(r);
      return { ...b, roomName: r.room_name as string, teacherName: (r.teacher_name as string | null) ?? '', time: timeLabel(DEFAULT_GRID, b.start, b.length) };
    }),
  });
}

export function submit(pool: pg.Pool, input: unknown): Promise<ApiResult> {
  const p = parse(submitSchema, input);
  if (!p.ok) return Promise.resolve(p.result);
  return guard(async () => {
    const r = await submitRequest(pool, p.data.request as Request, { ...APP_OPTIONS, key: p.data.key });
    return ok(r, r.replayed ? 200 : 201);
  });
}

export function applyAlt(pool: pg.Pool, input: unknown): Promise<ApiResult> {
  const p = parse(alternativeSchema, input);
  if (!p.ok) return Promise.resolve(p.result);
  return guard(async () => {
    const r = await applyAlternative(pool, p.data.request as Request, p.data.alternative, APP_OPTIONS);
    return ok(r, r.replayed ? 200 : 201);
  });
}

export function cancel(pool: pg.Pool, bookingId: string, input: unknown): Promise<ApiResult> {
  const p = parse(cancelSchema, input ?? {});
  if (!p.ok) return Promise.resolve(p.result);
  return guard(async () => ok(await cancelBooking(pool, bookingId, p.data)));
}

export async function listClosures(pool: pg.Pool): Promise<ApiResult> {
  const rows = (
    await pool.query(
      "SELECT id, room_id, to_char(from_day, 'YYYY-MM-DD') AS from_day, to_char(to_day, 'YYYY-MM-DD') AS to_day, reason, report FROM closures ORDER BY id",
    )
  ).rows;
  return ok({ closures: rows.map((c) => ({ id: Number(c.id), roomId: c.room_id, from: c.from_day, to: c.to_day, reason: c.reason, report: c.report })) });
}

export function close(pool: pg.Pool, input: unknown): Promise<ApiResult> {
  const p = parse(closureSchema, input);
  if (!p.ok) return Promise.resolve(p.result);
  return guard(async () => {
    const r = await closeRoom(pool, p.data, APP_OPTIONS);
    return ok(r, r.replayed ? 200 : 201);
  });
}

export async function health(pool: pg.Pool): Promise<ApiResult> {
  try {
    const r = await pool.query<{ n: string }>('SELECT count(*) AS n FROM schema_migrations');
    return ok({ ok: true, migrations: Number(r.rows[0]!.n) });
  } catch (e) {
    return fail(503, 'DATABASE_UNAVAILABLE', `baza de date nu răspunde: ${(e as Error).message}`);
  }
}
