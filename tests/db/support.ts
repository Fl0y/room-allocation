// Pentru testele pe baza de date (Lotul 5c): fiecare test își creează o bază de date nouă, aplică migrațiile
// și o șterge la final. Necesită PostgreSQL pornit (npm run db:up) și un utilizator care poate crea baze de date.

import pg from 'pg';
import { migrate } from '../../src/db/migrate.ts';
import { createPool, databaseUrl } from '../../src/db/pool.ts';
import { loadWorld, type World } from '../../src/db/store.ts';
import type { Instance, Room, State, Unit } from '../../src/engine/types.ts';
import { DEFAULT_GRID } from '../../src/engine/grid.ts';

export interface TestDb {
  pool: pg.Pool;
  name: string;
  drop: () => Promise<void>;
}

let counter = 0;

export async function freshDb(): Promise<TestDb> {
  const adminUrl = databaseUrl();
  const name = `ra_test_${process.pid}_${Date.now().toString(36)}_${counter++}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const pool = createPool(url.toString(), 30);
  await migrate(pool);
  return {
    pool,
    name,
    drop: async () => {
      await pool.end();
      const a = new pg.Client({ connectionString: adminUrl });
      await a.connect();
      await a.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await a.end();
    },
  };
}

export const DAY = '2026-11-17';
export const DAY2 = '2026-11-18';

/** O lume mică: săli S1, S2 (seminar), L1 (laborator 20); flux F → grupa G → G/1, G/2; grupa H; profesori T1–T3. */
export function smallWorld(): World {
  const rooms: Room[] = [
    { id: 'S1', type: 'seminar', capacity: 30, computers: 0, projector: true, board: true },
    { id: 'S2', type: 'seminar', capacity: 30, computers: 0, projector: true, board: true },
    { id: 'L1', type: 'lab', capacity: 20, computers: 20, projector: true, board: true },
  ];
  const units: Unit[] = [{ id: 'F' }, { id: 'G', parent: 'F' }, { id: 'G/1', parent: 'G', size: 10 }, { id: 'G/2', parent: 'G', size: 10 }, { id: 'H', size: 20 }];
  const instance: Instance = { grid: DEFAULT_GRID, rooms, units, dates: [DAY, DAY2] };
  const state: State = { bookings: [], closures: [] };
  return { instance, state, teachers: [1, 2, 3].map((i) => ({ id: `T${i}`, name: `Profesor T${i}` })) };
}

export async function withWorld(world: World = smallWorld(), extraTeachers: string[] = []): Promise<TestDb> {
  const db = await freshDb();
  await loadWorld(db.pool, world, extraTeachers);
  return db;
}

/** Inserare SQL directă, fără motor și fără serviciu. */
export function rawInsert(
  db: pg.Pool | pg.PoolClient,
  b: { id: string; teacher: string | null; units: string[]; room: string; start: number; length?: number; day?: string; status?: string },
) {
  return db.query(
    `INSERT INTO bookings (id, teacher, units, activity, needs, day, periods, students, room_id, status)
     VALUES ($1, $2, $3, 'seminar', '{"roomTypes":["seminar","lab","auditorium"]}', $4, int4range($5, $6), 10, $7, $8)`,
    [b.id, b.teacher, b.units, b.day ?? DAY, b.start, b.start + (b.length ?? 1), b.room, b.status ?? 'movable'],
  );
}

/** Codul de eroare PostgreSQL al unei operații, sau null dacă a reușit. */
export async function errorCode(op: () => Promise<unknown>): Promise<string | null> {
  try {
    await op();
    return null;
  } catch (e) {
    return (e as { code?: string }).code ?? 'ERROR';
  }
}
