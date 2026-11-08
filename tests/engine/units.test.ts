import { describe, expect, it } from 'vitest';
import { atomsOf, buildUnitIndex, sizeOf, validateUnits } from '../../src/engine/units.ts';
import type { Unit } from '../../src/engine/types.ts';

const units: Unit[] = [
  { id: 'TI-23' },
  { id: 'TI-231', parent: 'TI-23' },
  { id: 'TI-231/1', parent: 'TI-231', size: 13 },
  { id: 'TI-231/2', parent: 'TI-231', size: 13 },
  { id: 'TI-232', parent: 'TI-23', size: 24 },
];

describe('ierarhia flux → grupă → subgrupă (D21)', () => {
  it('acceptă o ierarhie corectă', () => {
    expect(validateUnits(units)).toEqual([]);
  });

  it('unitățile atomice: subgrupele sau grupa fără subgrupe', () => {
    const idx = buildUnitIndex(units);
    expect([...atomsOf(idx, ['TI-23'])].sort()).toEqual(['TI-231/1', 'TI-231/2', 'TI-232']);
    expect([...atomsOf(idx, ['TI-231'])].sort()).toEqual(['TI-231/1', 'TI-231/2']);
    expect([...atomsOf(idx, ['TI-232'])]).toEqual(['TI-232']);
  });

  it('mărimea se calculează din unitățile atomice, fără dubluri', () => {
    const idx = buildUnitIndex(units);
    expect(sizeOf(idx, ['TI-23'])).toBe(50);
    expect(sizeOf(idx, ['TI-231'])).toBe(26);
    expect(sizeOf(idx, ['TI-231', 'TI-231/1'])).toBe(26);
  });

  it('respinge mărimea declarată pe o unitate cu copii, unitățile atomice fără mărime, părinții necunoscuți și duplicatele', () => {
    const errors = validateUnits([
      { id: 'A', size: 30 },
      { id: 'A/1', parent: 'A', size: 15 },
      { id: 'B' },
      { id: 'C', parent: 'X', size: 5 },
      { id: 'C', size: 5 },
    ]);
    expect(errors.some((e) => e.startsWith('A: mărimea se declară'))).toBe(true);
    expect(errors.some((e) => e.startsWith('B: unitatea atomică'))).toBe(true);
    expect(errors.some((e) => e.includes('părinte necunoscut'))).toBe(true);
    expect(errors.some((e) => e.includes('duplicată'))).toBe(true);
  });

  it('detectează ciclurile', () => {
    const errors = validateUnits([
      { id: 'A', parent: 'B' },
      { id: 'B', parent: 'A' },
    ]);
    expect(errors.some((e) => e.includes('ciclu'))).toBe(true);
  });
});
