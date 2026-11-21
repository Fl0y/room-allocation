// Lotul 5c, criteriile 2 și 3 (plan.md §4ter): serviciul tranzacțional pe baza de date reală.
// - aceleași decizii ca motorul în memorie (scenariile 1–4 și 6–10);
// - cereri simultane pentru ultima sală: exact una reușește; nicio stare intermediară vizibilă;
// - mutările unei cereri: toate sau niciuna; idempotența; blocarea pe zi.

import { afterAll, describe, expect, it } from 'vitest';
import { submitRequest, IdempotencyConflictError } from '../../src/db/service.ts';
import { readState } from '../../src/db/store.ts';
import type { Request } from '../../src/engine/types.ts';
import { case1, case2, case3, case4, case6, case7, case8, case9, case10, coordinatorExample } from '../../src/scenarios/cases.ts';
import { runScenario, type Scenario } from '../../src/scenarios/run.ts';
import { DAY, DAY2, smallWorld, withWorld, type TestDb } from './support.ts';

const opened: TestDb[] = [];
afterAll(async () => {
  for (const db of opened) await db.drop();
});
async function open(world = smallWorld(), extraTeachers: string[] = []) {
  const db = await withWorld(world, extraTeachers);
  opened.push(db);
  return db;
}

const requestsOf = (sc: Scenario) => sc.steps.flatMap((s) => (s.kind === 'request' ? [s.request] : []));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('aceleași decizii ca motorul în memorie', () => {
  for (const sc of [case1, case2, case3, case4, case6, case7, case8, case9, case10, coordinatorExample]) {
    it(sc.title.split(' — ')[0]!, async () => {
      const db = await open({ instance: sc.instance, state: sc.initial }, requestsOf(sc).map((r) => r.teacher));
      const expected = runScenario(sc);
      for (const res of expected) {
        if (res.step.kind !== 'request') continue;
        const { decision } = await submitRequest(db.pool, res.step.request, sc.options ?? {});
        const want = res.decision!;
        expect(decision.kind).toBe(want.kind);
        if (want.kind === 'accepted') {
          expect(decision.booking).toEqual(want.booking);
          expect(decision.moves).toEqual(want.moves);
        } else {
          expect(decision.reasons).toEqual(want.reasons);
          expect(decision.alternatives).toEqual(want.alternatives);
        }
        expect(decision.explanation).toEqual(want.explanation);
      }
      // starea din baza de date = starea finală a scenariului
      const final = expected[expected.length - 1]!.after;
      const sort = (bs: { id: string }[]) => [...bs].sort((a, b) => a.id.localeCompare(b.id));
      expect(sort((await readState(db.pool)).bookings)).toEqual(sort(final.bookings));
    });
  }
});

describe('concurența', () => {
  const labRequest = (i: number, extra: Partial<Request> = {}): Request => ({
    id: `q${i}`,
    teacher: `T${i}`,
    units: [`U${i}`],
    activity: 'lab',
    needs: { roomTypes: ['lab'], minComputers: 15 },
    date: DAY,
    start: 3,
    length: 1,
    ...extra,
  });
  function worldWithUnits(n: number) {
    const w = smallWorld();
    w.instance.units.push(...Array.from({ length: n }, (_, i) => ({ id: `U${i}`, size: 15 })));
    w.teachers = Array.from({ length: n }, (_, i) => ({ id: `T${i}`, name: '' }));
    return w;
  }

  it('12 cereri simultane pentru ultimul laborator: exact una reușește, celelalte primesc refuz motivat', async () => {
    const db = await open(worldWithUnits(12));
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => submitRequest(db.pool, labRequest(i), { maxMoves: 2 })));
    const accepted = results.filter((r) => r.decision.kind === 'accepted');
    expect(accepted).toHaveLength(1);
    for (const r of results.filter((x) => x.decision.kind === 'rejected')) expect(r.decision.reasons[0]!.code).toBe('ROOM_UNAVAILABLE');
    const bookings = await db.pool.query('SELECT id, room_id FROM bookings');
    expect(bookings.rows).toEqual([{ id: accepted[0]!.decision.requestId, room_id: 'L1' }]);
    expect(Number((await db.pool.query('SELECT count(*) FROM requests')).rows[0].count)).toBe(12);
  });

  it('cererile pentru aceeași zi așteaptă; cele pentru zile diferite merg în paralel', async () => {
    const db = await open(worldWithUnits(3));
    const hold = deferred();
    const holding = submitRequest(db.pool, labRequest(0), { hooks: { afterLock: () => hold.promise } });
    // altă zi: se termină cât timp prima cerere ține blocată ziua ei
    const timeout = new Promise<'blocat'>((r) => setTimeout(() => r('blocat'), 5000));
    const otherDay = await Promise.race([submitRequest(db.pool, labRequest(1, { date: DAY2 })), timeout]);
    if (otherDay === 'blocat') {
      hold.resolve();
      await holding;
      throw new Error('cererea pentru altă zi a așteptat blocarea altei zile');
    }
    expect(otherDay.decision.kind).toBe('accepted');
    // aceeași zi: așteaptă
    let sameDayDone = false;
    const sameDay = submitRequest(db.pool, labRequest(2)).then((r) => ((sameDayDone = true), r));
    await new Promise((r) => setTimeout(r, 300));
    expect(sameDayDone).toBe(false);
    hold.resolve();
    const [first, second] = await Promise.all([holding, sameDay]);
    expect(first.decision.kind).toBe('accepted');
    expect(second.decision.kind).toBe('rejected'); // laboratorul a fost luat de prima
  });

  it('nicio stare intermediară nu e vizibilă: mutările și rezervarea nouă apar deodată, la COMMIT', async () => {
    const db = await open({ instance: case1.instance, state: case1.initial }, requestsOf(case1).map((r) => r.teacher));
    const [b, a] = requestsOf(case1) as [Request, Request];
    await submitRequest(db.pool, b);
    const before = await readState(db.pool);
    const seen: string[] = [];
    const result = await submitRequest(db.pool, a, {
      hooks: {
        beforeCommit: async () => {
          // altă conexiune, în timp ce tranzacția are deja mutările și rezervarea scrise, dar necomise
          const outside = await readState(db.pool);
          seen.push(JSON.stringify(outside.bookings));
        },
      },
    });
    expect(result.decision.moves).toHaveLength(2);
    expect(seen).toEqual([JSON.stringify(before.bookings)]);
    const after = await readState(db.pool);
    expect(after.bookings).toHaveLength(before.bookings.length + 1);
  });
});

describe('atomicitatea și idempotența', () => {
  it('întreruperea după mutări: nimic nu rămâne aplicat; cererea se poate trimite din nou', async () => {
    const db = await open({ instance: case1.instance, state: case1.initial }, requestsOf(case1).map((r) => r.teacher));
    const [b, a] = requestsOf(case1) as [Request, Request];
    await submitRequest(db.pool, b);
    const before = await readState(db.pool);
    await expect(
      submitRequest(db.pool, a, {
        hooks: {
          afterMoves: () => {
            throw new Error('întrerupere simulată');
          },
        },
      }),
    ).rejects.toThrow('întrerupere simulată');
    expect(await readState(db.pool)).toEqual(before);
    expect((await db.pool.query('SELECT key FROM requests ORDER BY key')).rows).toEqual([{ key: 'B-lab' }]);
    const again = await submitRequest(db.pool, a);
    expect(again.decision.kind).toBe('accepted');
    expect(again.decision.moves).toHaveLength(2);
  });

  it('aceeași cerere de două ori: o singură rezervare, a doua oară aceeași decizie', async () => {
    const db = await open(undefined, ['T9']);
    const r: Request = { id: 'once', teacher: 'T9', units: ['H'], activity: 'seminar', needs: { roomTypes: ['seminar'] }, date: DAY, start: 2, length: 1 };
    const first = await submitRequest(db.pool, r);
    const second = await submitRequest(db.pool, { ...r });
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.decision).toEqual(JSON.parse(JSON.stringify(first.decision)));
    expect((await db.pool.query('SELECT id FROM bookings')).rows).toEqual([{ id: 'once' }]);
  });

  it('aceeași cerere trimisă de 6 ori simultan: o singură rezervare', async () => {
    const db = await open(undefined, ['T9']);
    const r: Request = { id: 'dup', teacher: 'T9', units: ['H'], activity: 'seminar', needs: { roomTypes: ['seminar'] }, date: DAY, start: 2, length: 1 };
    const results = await Promise.all(Array.from({ length: 6 }, () => submitRequest(db.pool, { ...r })));
    expect(results.filter((x) => !x.replayed)).toHaveLength(1);
    expect((await db.pool.query('SELECT id FROM bookings')).rows).toEqual([{ id: 'dup' }]);
  });

  it('aceeași cheie pentru o cerere diferită: eroare, nimic scris', async () => {
    const db = await open(undefined, ['T9']);
    const r: Request = { id: 'k', teacher: 'T9', units: ['H'], activity: 'seminar', needs: { roomTypes: ['seminar'] }, date: DAY, start: 2, length: 1 };
    await submitRequest(db.pool, r);
    await expect(submitRequest(db.pool, { ...r, start: 4 })).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect((await db.pool.query('SELECT id FROM bookings')).rows).toEqual([{ id: 'k' }]);
  });
});
