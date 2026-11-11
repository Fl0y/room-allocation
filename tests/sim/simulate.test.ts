// Criteriul 2 al Lotului 2 (plan.md §4bis).

import { describe, expect, it } from 'vitest';
import { generateWorkload } from '../../src/sim/generator.ts';
import { CONFIGS, meanCI, runOnce, simulate, summarize, tCritical95, type RunMetrics } from '../../src/sim/simulate.ts';

const strip = (m: RunMetrics) => ({ ...m, timeMedianMs: 0, timeP95Ms: 0 });

describe('simulatorul', () => {
  it('fiecare strategie: stare finală fără încălcări, fiecare pas respectă tranzițiile (H8), contorii sunt coerenți', () => {
    for (const seed of [11, 12]) {
      const w = generateWorkload(seed, 0.9);
      for (const c of CONFIGS) {
        const m = runOnce(w, c, { checkTransitions: true });
        expect(m.violations).toBe(0);
        expect(m.requests).toBe(w.requests.length);
        expect(m.accepted + m.rejectedNoRoomType + m.rejectedUnavailable + m.rejectedOther).toBe(m.requests);
        // șirul generat nu are conflicte de persoane și are mereu o sală compatibilă
        expect(m.rejectedOther).toBe(0);
        expect(m.rejectedNoRoomType).toBe(0);
        expect(m.periodsRequested).toBe(w.requestedPeriods);
        if (c.maxMoves === 0) expect(m.moves).toBe(0);
      }
    }
  });

  it('comparație pereche: toate strategiile primesc același șir de cereri', () => {
    const results = simulate({ seeds: [21, 22], loads: [0.7] });
    for (const seed of [21, 22]) {
      const rs = results.filter((r) => r.seed === seed);
      expect(rs.map((r) => r.config)).toEqual(CONFIGS.map((c) => c.id));
      expect(new Set(rs.map((r) => r.requests)).size).toBe(1);
      expect(new Set(rs.map((r) => r.periodsRequested)).size).toBe(1);
    }
  });

  it('reproductibil: același seed → aceleași cifre (în afara timpilor)', () => {
    const a = simulate({ seeds: [31], loads: [0.85] }).map(strip);
    const b = simulate({ seeds: [31], loads: [0.85] }).map(strip);
    expect(a).toEqual(b);
  });

  it('statistica: media, intervalul de încredere și diferența pereche', () => {
    expect(tCritical95(1)).toBeCloseTo(12.706);
    expect(tCritical95(29)).toBeCloseTo(2.045);
    const s = meanCI([1, 2, 3, 4, 5]);
    expect(s.mean).toBe(3);
    expect(s.hi - s.mean).toBeCloseTo((2.776 * Math.sqrt(2.5)) / Math.sqrt(5), 3);
    const results = simulate({ seeds: [41, 42, 43], loads: [0.7] });
    const cells = summarize(results, 'periodsPct');
    const a = cells.find((c) => c.config === 'A')!;
    const cc = cells.find((c) => c.config === 'C')!;
    expect(a.diff).toBeNull();
    expect(cc.diff!.n).toBe(3);
    expect(cc.diff!.mean).toBeCloseTo(cc.value.mean - a.value.mean, 9);
  });
});
