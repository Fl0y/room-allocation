// Setul sintetic al facultății (Lotul 3a.2): determinist, valid, fără nume care să pară reale.

import { describe, expect, it } from 'vitest';
import { buildWeek, parseDataset, serializeDataset } from '../../src/data/format.ts';
import { generateFaculty } from '../../src/sim/faculty.ts';

describe('facultatea sintetică', () => {
  it('același seed dă exact aceleași fișiere; alt seed dă alt set', () => {
    expect(serializeDataset(generateFaculty(5).dataset)).toEqual(serializeDataset(generateFaculty(5).dataset));
    expect(serializeDataset(generateFaculty(6).dataset).timetable).not.toEqual(serializeDataset(generateFaculty(5).dataset).timetable);
  });

  it('pe 10 seed-uri: tot orarul încape și trece validarea fără erori (H1–H7)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = generateFaculty(seed);
      expect(r.unscheduled, `seed ${seed}`).toEqual([]);
      const p = parseDataset(serializeDataset(r.dataset));
      const w = buildWeek(p.dataset, p.issues);
      expect(w.issues.filter((i) => i.severity === 'error'), `seed ${seed}`).toEqual([]);
      expect(w.issues, `seed ${seed}`).toEqual([]);
    }
  });

  it('profesorii au doar pseudonime; sursa este marcată sintetică', () => {
    const d = generateFaculty(1).dataset;
    expect(d.manifest.source).toBe('synthetic');
    expect(d.manifest.seed).toBe(1);
    for (const t of d.teachers) expect(t.name).toMatch(/^Profesor P-\d{3}$/);
  });

  it('structura: fluxuri cu grupe, subgrupe doar sub grupe, laboratoare doar în laboratoare', () => {
    const d = generateFaculty(2).dataset;
    const kind = new Map(d.units.map((u) => [u.id, u.kind] as const));
    for (const u of d.units) {
      if (u.kind === 'group') expect(kind.get(u.parent!)).toBe('flux');
      if (u.kind === 'subgroup') expect(kind.get(u.parent!)).toBe('group');
    }
    const rooms = new Map(d.rooms.map((r) => [r.id, r] as const));
    const assignments = new Map(d.assignments.map((a) => [a.id, a] as const));
    for (const s of d.timetable) if (assignments.get(s.assignment)!.activity === 'lab') expect(rooms.get(s.room)!.type).toBe('lab');
  });
});
