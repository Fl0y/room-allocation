// Lotul 5c, criteriile 1 și 4 (plan.md §4ter): baza de date refuză singură suprapunerile — SQL direct, fără motor —
// iar scoaterea oricărei constrângeri face ca suprapunerea corespunzătoare să treacă (testul o detectează).

import { afterAll, describe, expect, it } from 'vitest';
import type { TestDb } from './support.ts';
import { DAY2, errorCode, rawInsert, withWorld } from './support.ts';

const EXCLUSION = '23P01';
const CHECK = '23514';
const FK = '23503';

interface Probe {
  name: string;
  /** Încercarea interzisă; întoarce codul de eroare (null = a trecut). */
  run: (db: TestDb) => Promise<string | null>;
  expected: string;
  /** Ce se scoate din schemă la testul de mutație. */
  removal: string[];
}

const PROBES: Probe[] = [
  {
    name: 'H1 — aceeași sală, perechi suprapuse',
    expected: EXCLUSION,
    removal: ['ALTER TABLE bookings DROP CONSTRAINT bookings_room_no_overlap'],
    run: async ({ pool }) => {
      await rawInsert(pool, { id: 'a', teacher: 'T1', units: ['H'], room: 'S1', start: 1, length: 2 });
      return errorCode(() => rawInsert(pool, { id: 'b', teacher: 'T2', units: ['G/1'], room: 'S1', start: 2 }));
    },
  },
  {
    name: 'H2 — același profesor în două săli în același timp',
    expected: EXCLUSION,
    removal: ['ALTER TABLE bookings DROP CONSTRAINT bookings_teacher_no_overlap'],
    run: async ({ pool }) => {
      await rawInsert(pool, { id: 'a', teacher: 'T1', units: ['H'], room: 'S1', start: 3 });
      return errorCode(() => rawInsert(pool, { id: 'b', teacher: 'T1', units: ['G/1'], room: 'S2', start: 3 }));
    },
  },
  {
    name: 'H3 — grupa și una dintre subgrupele ei în același timp',
    expected: EXCLUSION,
    removal: ['ALTER TABLE booking_atoms DROP CONSTRAINT booking_atoms_no_overlap'],
    run: async ({ pool }) => {
      await rawInsert(pool, { id: 'a', teacher: 'T1', units: ['G'], room: 'S1', start: 4 });
      return errorCode(() => rawInsert(pool, { id: 'b', teacher: 'T2', units: ['G/2'], room: 'L1', start: 4 }));
    },
  },
  {
    name: 'H3 — fluxul și o subgrupă (unitățile atomice calculate de trigger)',
    expected: EXCLUSION,
    removal: ['DROP TRIGGER bookings_atoms ON bookings'],
    run: async ({ pool }) => {
      await rawInsert(pool, { id: 'a', teacher: 'T1', units: ['G/1'], room: 'L1', start: 5 });
      return errorCode(() => rawInsert(pool, { id: 'b', teacher: 'T2', units: ['F'], room: 'S1', start: 5 }));
    },
  },
  {
    name: 'unitate necunoscută',
    expected: FK,
    removal: ['DROP TRIGGER bookings_atoms ON bookings'],
    run: ({ pool }) => errorCode(() => rawInsert(pool, { id: 'a', teacher: 'T1', units: ['NU-EXISTA'], room: 'S1', start: 1 })),
  },
  {
    name: 'H8 — schimbarea orei unei rezervări existente',
    expected: CHECK,
    removal: ['DROP TRIGGER bookings_guard ON bookings'],
    run: async ({ pool }) => {
      await rawInsert(pool, { id: 'a', teacher: 'T1', units: ['H'], room: 'S1', start: 1 });
      return errorCode(() => pool.query("UPDATE bookings SET periods = '[2,3)' WHERE id = 'a'"));
    },
  },
  {
    name: 'H8 — mutarea unei rezervări înghețate',
    expected: CHECK,
    removal: ['DROP TRIGGER bookings_guard ON bookings'],
    run: async ({ pool }) => {
      await rawInsert(pool, { id: 'a', teacher: 'T1', units: ['H'], room: 'S1', start: 1, status: 'frozen' });
      return errorCode(() => pool.query("UPDATE bookings SET room_id = 'S2' WHERE id = 'a'"));
    },
  },
];

const opened: TestDb[] = [];
afterAll(async () => {
  for (const db of opened) await db.drop();
});
async function world() {
  const db = await withWorld();
  opened.push(db);
  return db;
}

describe('baza de date refuză singură (SQL direct, fără motor)', () => {
  for (const p of PROBES) {
    it(p.name, async () => {
      const db = await world();
      expect(await p.run(db)).toBe(p.expected);
    });
  }

  it('permite ce nu se suprapune: perechi alăturate, altă zi, grupe diferite, subgrupe surori, mutarea unei rezervări mutabile', async () => {
    const { pool } = await world();
    await rawInsert(pool, { id: 'a', teacher: 'T1', units: ['H'], room: 'S1', start: 1, length: 2 });
    await rawInsert(pool, { id: 'b', teacher: 'T2', units: ['G/1'], room: 'S1', start: 3 });
    await rawInsert(pool, { id: 'c', teacher: 'T3', units: ['H'], room: 'S1', start: 1, day: DAY2 });
    await rawInsert(pool, { id: 'd', teacher: 'T3', units: ['G/2'], room: 'L1', start: 3 });
    await pool.query("UPDATE bookings SET room_id = 'S2' WHERE id = 'b'");
    const atoms = await pool.query("SELECT booking_id, atom_id FROM booking_atoms ORDER BY booking_id, atom_id");
    expect(atoms.rows).toEqual([
      { booking_id: 'a', atom_id: 'H' },
      { booking_id: 'b', atom_id: 'G/1' },
      { booking_id: 'c', atom_id: 'H' },
      { booking_id: 'd', atom_id: 'G/2' },
    ]);
  });

  it('un lanț de mutări este valid doar la final: verificarea sălii are loc la COMMIT', async () => {
    const { pool } = await world();
    await rawInsert(pool, { id: 'a', teacher: 'T1', units: ['H'], room: 'S1', start: 1 });
    await rawInsert(pool, { id: 'b', teacher: 'T2', units: ['G/1'], room: 'S2', start: 1 });
    const c = await pool.connect();
    try {
      // schimbul de săli: după primul UPDATE, S2 are temporar două rezervări
      await c.query('BEGIN');
      await c.query("UPDATE bookings SET room_id = 'S2' WHERE id = 'a'");
      await c.query("UPDATE bookings SET room_id = 'S1' WHERE id = 'b'");
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    const rooms = await pool.query('SELECT id, room_id FROM bookings ORDER BY id');
    expect(rooms.rows).toEqual([
      { id: 'a', room_id: 'S2' },
      { id: 'b', room_id: 'S1' },
    ]);
  });

  it('două tranzacții simultane, fără blocarea serviciului: a doua eșuează la COMMIT (a doua linie de apărare)', async () => {
    const { pool } = await world();
    const c1 = await pool.connect();
    const c2 = await pool.connect();
    try {
      await c1.query('BEGIN');
      await c2.query('BEGIN');
      await rawInsert(c1, { id: 'a', teacher: 'T1', units: ['H'], room: 'S1', start: 6 });
      await rawInsert(c2, { id: 'b', teacher: 'T2', units: ['G/1'], room: 'S1', start: 6 });
      await c1.query('COMMIT');
      expect(await errorCode(() => c2.query('COMMIT'))).toBe(EXCLUSION);
    } finally {
      c1.release();
      c2.release();
    }
    expect((await pool.query('SELECT id FROM bookings')).rows).toEqual([{ id: 'a' }]);
  });
});

describe('testele de mutație: fără constrângere, încălcarea trece (deci testul de mai sus ar pica)', () => {
  for (const p of PROBES) {
    it(`${p.name} — fără: ${p.removal.join('; ')}`, async () => {
      const db = await world();
      for (const sql of p.removal) await db.pool.query(sql);
      expect(await p.run(db)).toBeNull();
    });
  }
});
