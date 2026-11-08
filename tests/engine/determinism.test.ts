// Criteriul 6 din plan.md §4: aceeași intrare → aceeași decizie și explicație, indiferent de ordinea
// sălilor, a rezervărilor existente și a datelor din orizont (strategia `score`).

import { describe, expect, it } from 'vitest';
import { allocate } from '../../src/engine/allocate.ts';
import type { Instance, State } from '../../src/engine/types.ts';
import { allCases } from '../../src/scenarios/cases.ts';
import { runScenario } from '../../src/scenarios/run.ts';
import { mulberry32, randomCase } from '../support/random.ts';

function shuffle<T>(xs: readonly T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const normalize = (x: unknown) => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && Array.isArray((v as { bookings?: unknown }).bookings) ? { ...v, bookings: [...(v as State).bookings].sort((a, b) => (a.id < b.id ? -1 : 1)) } : v));

describe('determinism', () => {
  it('cazurile 1–5 dau același rezultat cu sălile, rezervările și datele amestecate', () => {
    for (const sc of allCases) {
      const reference = normalize(runScenario(sc).map((r) => r.decision ?? r.repair));
      for (let seed = 1; seed <= 20; seed++) {
        const rnd = mulberry32(seed);
        const instance: Instance = { ...sc.instance, rooms: shuffle(sc.instance.rooms, rnd), dates: shuffle(sc.instance.dates, rnd) };
        const initial: State = { ...sc.initial, bookings: shuffle(sc.initial.bookings, rnd) };
        const got = normalize(runScenario({ ...sc, instance, initial }).map((r) => r.decision ?? r.repair));
        expect(got).toBe(reference);
      }
    }
  });

  it('instanțele aleatoare dau aceeași decizie cu ordinea amestecată', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { instance, state, request } = randomCase(seed);
      const reference = normalize(allocate(instance, state, request));
      const rnd = mulberry32(seed * 7919);
      const shuffled = allocate(
        { ...instance, rooms: shuffle(instance.rooms, rnd) },
        { ...state, bookings: shuffle(state.bookings, rnd) },
        request,
      );
      expect(normalize(shuffled)).toBe(reference);
    }
  });
});
