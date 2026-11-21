// Citirea și scrierea modelului motorului în baza de date (Lotul 5). Conversia rând ↔ obiect, fără logică
// de alocare: deciziile rămân în src/engine/ (neschimbat).

import type pg from 'pg';
import type { Booking, Closure, Instance, Room, State, Unit } from '../engine/types.ts';
import { DEFAULT_GRID } from '../engine/grid.ts';

type Queryable = pg.Pool | pg.PoolClient;

/** Perechile [start, start + length) ca literal int4range. */
export const periodsOf = (start: number, length: number) => `[${start},${start + length})`;

function parseRange(r: string): { start: number; length: number } {
  const m = /^\[(\d+),(\d+)\)$/.exec(r);
  if (!m) throw new Error(`interval de perechi neașteptat: ${r}`);
  const lo = Number(m[1]);
  return { start: lo, length: Number(m[2]) - lo };
}

export async function readInstance(db: Queryable): Promise<Instance> {
  const rooms = (await db.query('SELECT id, type, capacity, computers, projector, board FROM rooms ORDER BY id')).rows as Room[];
  const units = (await db.query<{ id: string; parent: string | null; size: number | null }>('SELECT id, parent, size FROM units ORDER BY id')).rows.map((u) => {
    const unit: Unit = { id: u.id };
    if (u.parent !== null) unit.parent = u.parent;
    if (u.size !== null) unit.size = u.size;
    return unit;
  });
  const dates = (await db.query<{ day: string }>("SELECT to_char(day, 'YYYY-MM-DD') AS day FROM calendar_days ORDER BY day")).rows.map((r) => r.day);
  return { grid: DEFAULT_GRID, rooms, units, dates };
}

interface BookingRow {
  id: string;
  teacher: string | null;
  units: string[];
  activity: Booking['activity'];
  needs: Booking['needs'];
  day: string;
  periods: string;
  students: number;
  room_id: string;
  status: Booking['status'];
  block_id: string | null;
  split_approved: boolean;
}

export function bookingFromRow(r: BookingRow): Booking {
  const { start, length } = parseRange(r.periods);
  const b: Booking = {
    id: r.id,
    teacher: r.teacher ?? '',
    units: r.units,
    activity: r.activity,
    needs: r.needs,
    date: r.day,
    start,
    length,
    students: r.students,
    roomId: r.room_id,
    status: r.status,
  };
  if (r.block_id !== null) b.blockId = r.block_id;
  if (r.split_approved) b.splitApproved = true;
  return b;
}

export async function readState(db: Queryable): Promise<State> {
  const bookings = (
    await db.query<BookingRow>(
      "SELECT id, teacher, units, activity, needs, to_char(day, 'YYYY-MM-DD') AS day, periods::text AS periods, students, room_id, status, block_id, split_approved FROM bookings ORDER BY id",
    )
  ).rows.map(bookingFromRow);
  const closures = (
    await db.query<{ room_id: string; from_day: string; to_day: string; reason: Closure['reason'] }>(
      "SELECT room_id, to_char(from_day, 'YYYY-MM-DD') AS from_day, to_char(to_day, 'YYYY-MM-DD') AS to_day, reason FROM closures ORDER BY id",
    )
  ).rows.map((c) => ({ roomId: c.room_id, from: c.from_day, to: c.to_day, reason: c.reason }));
  return { bookings, closures };
}

export async function insertBooking(db: Queryable, b: Booking): Promise<void> {
  await db.query(
    `INSERT INTO bookings (id, teacher, units, activity, needs, day, periods, students, room_id, status, block_id, split_approved)
     VALUES ($1, $2, $3, $4, $5, $6, $7::int4range, $8, $9, $10, $11, $12)`,
    [b.id, b.teacher || null, b.units, b.activity, JSON.stringify(b.needs), b.date, periodsOf(b.start, b.length), b.students, b.roomId, b.status, b.blockId ?? null, b.splitApproved ?? false],
  );
}

/** Mutarea de sală (H8); refuză dacă rezervarea nu mai este în sala de plecare. */
export async function moveBooking(db: Queryable, id: string, from: string, to: string): Promise<void> {
  const r = await db.query('UPDATE bookings SET room_id = $3 WHERE id = $1 AND room_id = $2', [id, from, to]);
  if (r.rowCount !== 1) throw new Error(`mutarea ${id}: ${from} → ${to} nu mai corespunde stării din baza de date`);
}

export interface World {
  instance: Instance;
  state: State;
  /** Profesorii (pseudonime); dacă lipsesc, se iau din rezervări. */
  teachers?: { id: string; name: string }[];
  rooms?: { id: string; name: string }[];
  units?: { id: string; kind: 'flux' | 'group' | 'subgroup'; name: string }[];
}

/** Șterge datele (nu și schema) și încarcă o instanță cu starea ei. Într-o singură tranzacție. */
export async function loadWorld(pool: pg.Pool, w: World, extraTeachers: string[] = []): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE requests, booking_atoms, bookings, closures, calendar_days, teachers, units, rooms');
    const roomName = new Map((w.rooms ?? []).map((r) => [r.id, r.name] as const));
    for (const r of w.instance.rooms)
      await client.query('INSERT INTO rooms (id, name, type, capacity, computers, projector, board) VALUES ($1, $2, $3, $4, $5, $6, $7)', [r.id, roomName.get(r.id) ?? '', r.type, r.capacity, r.computers, r.projector, r.board]);
    // părinții înaintea copiilor
    const meta = new Map((w.units ?? []).map((u) => [u.id, u] as const));
    const hasChildren = new Set(w.instance.units.map((u) => u.parent).filter((p): p is string => !!p));
    const pending = [...w.instance.units];
    const inserted = new Set<string>();
    while (pending.length) {
      const before = pending.length;
      for (let i = 0; i < pending.length; ) {
        const u = pending[i]!;
        if (u.parent && !inserted.has(u.parent)) {
          i++;
          continue;
        }
        const kind = meta.get(u.id)?.kind ?? (hasChildren.has(u.id) ? (u.parent ? 'group' : 'flux') : u.parent ? 'subgroup' : 'group');
        await client.query('INSERT INTO units (id, kind, parent, size, name) VALUES ($1, $2, $3, $4, $5)', [u.id, kind, u.parent ?? null, u.size ?? null, meta.get(u.id)?.name ?? '']);
        inserted.add(u.id);
        pending.splice(i, 1);
      }
      if (pending.length === before) throw new Error(`unități cu părinte necunoscut sau ciclu: ${pending.map((u) => u.id).join(', ')}`);
    }
    const teachers = new Map((w.teachers ?? []).map((t) => [t.id, t.name] as const));
    for (const b of w.state.bookings) if (b.teacher && !teachers.has(b.teacher)) teachers.set(b.teacher, '');
    for (const t of extraTeachers) if (t && !teachers.has(t)) teachers.set(t, '');
    for (const [id, name] of teachers) await client.query('INSERT INTO teachers (id, name) VALUES ($1, $2)', [id, name]);
    for (const d of w.instance.dates) await client.query('INSERT INTO calendar_days (day) VALUES ($1)', [d]);
    for (const c of w.state.closures) await client.query('INSERT INTO closures (room_id, from_day, to_day, reason) VALUES ($1, $2, $3, $4)', [c.roomId, c.from, c.to, c.reason]);
    for (const b of w.state.bookings) await insertBooking(client, b);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
