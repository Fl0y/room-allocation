// Criteriul 1 al Lotului 2 (plan.md §4bis).

import { describe, expect, it } from 'vitest';
import { roomMismatch } from '../../src/engine/compat.ts';
import { overlaps } from '../../src/engine/grid.ts';
import { atomsOf, buildUnitIndex, intersects, sizeOf, validateUnits } from '../../src/engine/units.ts';
import { generateWorkload } from '../../src/sim/generator.ts';

describe('generatorul de date sintetice', () => {
  it('același seed → aceeași instanță și același șir de cereri; seed diferit → alt șir', () => {
    expect(JSON.stringify(generateWorkload(7, 0.7))).toBe(JSON.stringify(generateWorkload(7, 0.7)));
    expect(JSON.stringify(generateWorkload(8, 0.7).requests)).not.toBe(JSON.stringify(generateWorkload(7, 0.7).requests));
  });

  for (const load of [0.5, 0.7, 0.85, 0.95]) {
    it(`încărcarea ${load}: unități valide, fără suprapuneri de persoane, încărcare în ±5%, fiecare cerere are o sală compatibilă`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const w = generateWorkload(seed, load);
        expect(validateUnits(w.instance.units)).toEqual([]);
        expect(Math.abs(w.achievedLoad - load)).toBeLessThanOrEqual(0.05 * load);
        const idx = buildUnitIndex(w.instance.units);
        const rs = w.requests;
        for (let i = 0; i < rs.length; i++) {
          const a = rs[i]!;
          const n = sizeOf(idx, a.units);
          expect(w.instance.rooms.some((r) => roomMismatch(r, a.needs, n) === null)).toBe(true);
          for (let j = i + 1; j < rs.length; j++) {
            const b = rs[j]!;
            if (!overlaps(a, b)) continue;
            expect(a.teacher).not.toBe(b.teacher);
            expect(intersects(atomsOf(idx, a.units), atomsOf(idx, b.units))).toBe(false);
          }
        }
      }
    });
  }
});
