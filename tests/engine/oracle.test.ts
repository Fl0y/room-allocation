// Criteriul 5 din plan.md §4: pe instanțe mici aleatoare, motorul găsește un plan cu ≤ M mutări
// dacă și numai dacă oracolul exhaustiv găsește unul, iar numărul de mutări ales este minim.

import { describe, expect, it } from 'vitest';
import { allocate } from '../../src/engine/allocate.ts';
import { checkState, checkTransition } from '../../src/engine/checker.ts';
import { oracleMinMoves } from '../oracle/bruteforce.ts';
import { randomCase } from '../support/random.ts';

const N = 2000;

describe(`motor vs. oracol exhaustiv (${N} instanțe, seed-uri 1..${N})`, () => {
  for (const maxMoves of [0, 1, 2]) {
    it(`M = ${maxMoves}`, () => {
      let accepted = 0;
      let withMoves = 0;
      for (let seed = 1; seed <= N; seed++) {
        const { instance, state, request } = randomCase(seed);
        const expected = oracleMinMoves(instance, state, request, maxMoves);
        const d = allocate(instance, state, request, { maxMoves, alternatives: 0, split: false });
        const got = d.kind === 'accepted' ? d.moves.length : null;
        if (got !== expected) {
          throw new Error(`seed ${seed}, M=${maxMoves}: motor=${got}, oracol=${expected}`);
        }
        if (d.kind === 'accepted') {
          accepted++;
          if (d.moves.length) withMoves++;
          expect(checkState(instance, d.state)).toEqual([]);
          expect(checkTransition(state, d.state).violations).toEqual([]);
        }
      }
      // instanțele trebuie să exercite ambele rezultate (și mutări, pentru M > 0)
      expect(accepted).toBeGreaterThan(N * 0.1);
      expect(accepted).toBeLessThan(N);
      if (maxMoves > 0) expect(withMoves).toBeGreaterThan(100);
    });
  }
});
