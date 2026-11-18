// Lotul 4 (criteriul 2 din plan.md §4ter): pe instanțe mici aleatoare cu interval, motorul acceptă dacă și numai
// dacă oracolul exhaustiv găsește o variantă, cu numărul minim de mutări, iar varianta aleasă este minimă după
// ordinea D31 (raritate → ferestrele studenților → excedent → fragmentare). Plus: validarea intervalului,
// compatibilitatea cu ora fixă și determinismul.

import { describe, expect, it } from 'vitest';
import { allocate, type Accepted } from '../../src/engine/allocate.ts';
import { checkState, checkTransition } from '../../src/engine/checker.ts';
import type { Request } from '../../src/engine/types.ts';
import { oracleBestInterval, totalWindows } from '../oracle/bruteforce.ts';
import { randomCase, randomIntervalCase } from '../support/random.ts';

const N = 600;

describe(`cereri cu interval: motor vs. oracol exhaustiv (${N} instanțe)`, () => {
  for (const [maxMoves, useWindows] of [
    [0, true],
    [1, true],
    [2, true],
    [1, false],
  ] as const) {
    it(`M = ${maxMoves}, criteriul ferestrelor ${useWindows ? 'activ' : 'dezactivat'}`, () => {
      let accepted = 0;
      let movedStart = 0;
      let windowsDecided = 0;
      for (let seed = 1; seed <= N; seed++) {
        const { instance, state, request } = randomIntervalCase(seed);
        const expected = oracleBestInterval(instance, state, request, maxMoves, useWindows);
        const d = allocate(instance, state, request, { maxMoves, alternatives: 0, split: false, windows: useWindows });
        if (!expected) {
          expect(d.kind, `seed ${seed}`).toBe('rejected');
          continue;
        }
        expect(d.kind, `seed ${seed}`).toBe('accepted');
        const a = d as Accepted;
        accepted++;
        if (a.booking.start !== request.start) movedStart++;
        const e = a.evaluation;
        const windows = totalWindows(instance, a.state.bookings) - totalWindows(instance, state.bookings);
        expect(e.windows, `seed ${seed}: ferestrele raportate`).toBe(windows);
        const got = [a.moves.length, e.rarity, useWindows ? e.windows : 0, e.excess, e.fragmentation, a.booking.start];
        const want = [expected.moves, ...expected.key];
        // cu mutări, după fragmentare urmează cheile rezervărilor mutate, apoi perechea: se compară până la fragmentare
        expect(expected.moves === 0 ? got : got.slice(0, 5), `seed ${seed}`).toEqual(expected.moves === 0 ? want : want.slice(0, 5));
        if (useWindows && windows < totalWindows(instance, [...state.bookings, { ...a.booking, start: request.start }]) - totalWindows(instance, state.bookings)) windowsDecided++;
        expect(checkState(instance, a.state)).toEqual([]);
        expect(checkTransition(state, a.state).violations).toEqual([]);
        expect(a.booking.start).toBeGreaterThanOrEqual(request.start);
        expect(a.booking.start + a.booking.length - 1).toBeLessThanOrEqual(request.latest!);
      }
      // instanțele exercită ambele rezultate și alegerea perechii
      expect(accepted).toBeGreaterThan(N * 0.3);
      expect(accepted).toBeLessThan(N);
      expect(movedStart).toBeGreaterThan(20);
      if (useWindows) expect(windowsDecided).toBeGreaterThan(5);
    });
  }
});

describe('cereri cu interval: validare și compatibilitate', () => {
  const { instance, state, request } = randomCase(3);

  it('fără `latest`, decizia este identică cu cea pentru `latest` = sfârșitul blocului', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const c = randomCase(seed);
      const a = allocate(c.instance, c.state, c.request, { alternatives: 0, split: false });
      const b = allocate(c.instance, c.state, { ...c.request, latest: c.request.start + c.request.length - 1 }, { alternatives: 0, split: false });
      expect(b.kind).toBe(a.kind);
      if (a.kind === 'accepted' && b.kind === 'accepted') {
        expect(b.booking).toEqual(a.booking);
        expect(b.moves).toEqual(a.moves);
      }
    }
  });

  it('intervalul trebuie să cuprindă blocul și să rămână în grilă', () => {
    const bad: Request[] = [
      { ...request, start: 3, length: 2, latest: 3 },
      { ...request, start: 2, length: 1, latest: 8 },
      { ...request, start: 2, length: 1, latest: 2.5 },
    ];
    for (const r of bad) {
      const d = allocate(instance, state, r);
      expect(d.kind).toBe('rejected');
      if (d.kind === 'rejected') expect(d.reasons[0]!.code).toBe('INVALID_REQUEST');
    }
  });

  it('determinism: aceeași decizie cu sălile și rezervările în altă ordine', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const c = randomIntervalCase(seed);
      const a = allocate(c.instance, c.state, c.request, { alternatives: 0, split: false });
      const shuffled = allocate(
        { ...c.instance, rooms: [...c.instance.rooms].reverse() },
        { ...c.state, bookings: [...c.state.bookings].reverse() },
        c.request,
        { alternatives: 0, split: false },
      );
      expect(shuffled.kind).toBe(a.kind);
      if (a.kind === 'accepted' && shuffled.kind === 'accepted') {
        expect(shuffled.booking).toEqual(a.booking);
        expect([...shuffled.moves].sort((x, y) => x.bookingId.localeCompare(y.bookingId))).toEqual([...a.moves].sort((x, y) => x.bookingId.localeCompare(y.bookingId)));
      }
    }
  });
});
