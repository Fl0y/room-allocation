// Săptămâna în simulator (Lotul 3a.3): cereri suplimentare peste orar, aceleași pentru fiecare strategie.

import { describe, expect, it } from 'vitest';
import { buildWeek, parseDataset, serializeDataset } from '../../src/data/format.ts';
import { checkState } from '../../src/engine/checker.ts';
import { overlaps } from '../../src/engine/grid.ts';
import { atomsOf, buildUnitIndex, intersects } from '../../src/engine/units.ts';
import { generateFaculty } from '../../src/sim/faculty.ts';
import { CONFIGS, runOnce } from '../../src/sim/simulate.ts';
import { generateExtras, weekWorkload } from '../../src/sim/week.ts';
import { miniFiles } from '../support/mini.ts';

function synthetic(seed = 1) {
  const p = parseDataset(serializeDataset(generateFaculty(seed).dataset));
  return { dataset: p.dataset, week: buildWeek(p.dataset, p.issues) };
}

describe('cererile suplimentare', () => {
  it('sunt deterministe și ating încărcarea cerută', () => {
    const { dataset, week } = synthetic();
    const a = generateExtras(dataset, week, 3, 0.5);
    expect(JSON.stringify(generateExtras(dataset, week, 3, 0.5))).toBe(JSON.stringify(a));
    expect(a.requestedPeriods / a.freePeriods).toBeGreaterThan(0.48);
    expect(a.requestedPeriods / a.freePeriods).toBeLessThan(0.52);
    expect(new Set(a.requests.map((r) => r.kind))).toEqual(new Set(['makeup', 'consultation', 'event']));
  });

  it('nu au conflicte de persoane cu orarul și între ele; evenimentele sunt fixe', () => {
    const { dataset, week } = synthetic();
    const index = buildUnitIndex(week.instance.units);
    const { requests } = generateExtras(dataset, week, 4, 0.75);
    const all = [...week.state.bookings, ...requests];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const x = all[i]!;
        const y = all[j]!;
        if (!overlaps(x, y)) continue;
        expect(x.teacher === y.teacher, `${x.id}/${y.id}`).toBe(false);
        expect(intersects(atomsOf(index, x.units), atomsOf(index, y.units)), `${x.id}/${y.id}`).toBe(false);
      }
    for (const r of requests) expect(r.status === 'fixed').toBe(r.kind === 'event');
  });
});

describe('rularea săptămânii', () => {
  it('pe setul sintetic: fiecare tranziție respectă H8, starea finală nu are încălcări, orarul inițial rămâne neatins', () => {
    const { dataset, week } = synthetic(2);
    const before = JSON.stringify(week.state);
    const w = weekWorkload(dataset, week, 1, 0.6);
    for (const c of CONFIGS) {
      const m = runOnce(w, c, { checkTransitions: true });
      expect(m.violations, c.id).toBe(0);
      expect(m.accepted, c.id).toBeGreaterThan(0);
      expect(m.finalPeriods, c.id).toBe(week.state.bookings.reduce((s, b) => s + b.length, 0) + m.periodsAccepted);
    }
    expect(JSON.stringify(week.state)).toBe(before);
    expect(checkState(week.instance, week.state)).toEqual([]);
  });

  it('pe exemplul mic din Git (fără folderul extern)', () => {
    const p = parseDataset(miniFiles());
    const week = buildWeek(p.dataset, p.issues);
    const w = weekWorkload(p.dataset, week, 1, 0.5);
    expect(w.requests.length).toBeGreaterThan(0);
    for (const c of CONFIGS) expect(runOnce(w, c, { checkTransitions: true }).violations).toBe(0);
  });
});
