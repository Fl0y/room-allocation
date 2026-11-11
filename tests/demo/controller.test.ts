// Criteriile 4–5 ale Lotului 2: logica demo-ului, testată fără DOM.

import { describe, expect, it } from 'vitest';
import { checkState } from '../../src/engine/checker.ts';
import {
  applyAlternative,
  closeRoom,
  compareStrategies,
  generatedScenario,
  hasNextStep,
  load,
  nextStep,
  reset,
  setOptions,
  submit,
  undo,
} from '../../src/demo/controller.ts';
import { request } from '../../src/scenarios/build.ts';
import { allCases, case1, case2, case4, coordinatorExample } from '../../src/scenarios/cases.ts';
import { runScenario } from '../../src/scenarios/run.ts';

describe('demo — logica', () => {
  it('pas cu pas, cazurile 1–5 dau aceleași decizii ca rularea scenariului', () => {
    for (const sc of allCases) {
      let d = load(sc);
      while (hasNextStep(d)) d = nextStep(d);
      const expected = runScenario(sc);
      expect(d.log.length).toBe(expected.length);
      expect(JSON.stringify(d.state)).toBe(JSON.stringify(expected.at(-1)!.after));
      expect(checkState(sc.instance, d.state)).toEqual([]);
    }
  });

  it('„Înapoi” revine exact la starea anterioară; „Resetează” revine la starea inițială', () => {
    let d = load(case1);
    d = nextStep(d);
    const afterFirst = JSON.stringify(d.state);
    d = nextStep(d);
    expect(JSON.stringify(d.state)).not.toBe(afterFirst);
    d = undo(d);
    expect(JSON.stringify(d.state)).toBe(afterFirst);
    expect(d.stepIndex).toBe(1);
    d = reset(nextStep(d));
    expect(d.state).toBe(case1.initial);
    expect(d.log).toEqual([]);
  });

  it('strategia și M se pot schimba: cazul 1 cu M = 0 refuză cererea lui A', () => {
    let d = setOptions(load(case1), { maxMoves: 0 });
    d = nextStep(nextStep(d));
    const last = d.log.at(-1)!;
    expect(last.kind === 'decision' && last.decision.kind).toBe('rejected');
  });

  it('o cerere nouă refuzată primește alternative; aplicarea alternativei o acceptă', () => {
    let d = load(case4);
    const req = request({ id: 'F-recuperare', teacher: 'Prof. F', units: ['TI-231'], activity: 'seminar', date: '2026-11-18', start: 2, students: 26 });
    d = submit(d, req);
    const entry = d.log.at(-1)!;
    if (entry.kind !== 'decision' || entry.decision.kind !== 'rejected') throw new Error('se aștepta un refuz');
    const alt = entry.decision.alternatives[0]!;
    d = applyAlternative(d, req, alt);
    const applied = d.log.at(-1)!;
    expect(applied.kind === 'decision' && applied.decision.kind).toBe('accepted');
    expect(d.state.bookings.find((b) => b.id === 'F-recuperare')).toMatchObject({ date: '2026-11-18', start: 1 });
    expect(checkState(case4.instance, d.state)).toEqual([]);
  });

  it('ruperea blocului (D20) se aplică doar ca alternativă confirmată, cu blockId și acordul marcat', () => {
    // cazul 2 cu M = 0 și o sală suplimentară pentru perechea 4
    const sc = {
      ...case2,
      instance: { ...case2.instance, rooms: [...case2.instance.rooms, { id: 'L-300', type: 'lab' as const, capacity: 20, computers: 20, projector: true, board: false }] },
      initial: {
        ...case2.initial,
        bookings: [
          ...case2.initial.bookings,
          { ...case2.initial.bookings[0]!, id: 'X', teacher: 'Prof. X', units: ['CIB-231/1'], roomId: 'L-300', start: 2, length: 2, students: 10 },
        ],
      },
    };
    let d = setOptions(load(sc), { maxMoves: 0 });
    d = nextStep(d);
    const entry = d.log.at(-1)!;
    if (entry.kind !== 'decision' || entry.decision.kind !== 'rejected') throw new Error('se aștepta un refuz');
    const split = entry.decision.alternatives.find((a) => a.kind === 'split');
    expect(split).toBeDefined();
    d = applyAlternative(d, entry.request, split!);
    const parts = d.state.bookings.filter((b) => b.blockId === 'D-bloc');
    expect(parts.length).toBe(2);
    expect(parts.every((p) => p.splitApproved)).toBe(true);
    expect(new Set(parts.map((p) => p.roomId)).size).toBe(2);
    expect(checkState(sc.instance, d.state)).toEqual([]);
  });

  it('închiderea unei săli produce raportul de reparare și o stare validă', () => {
    let d = load(case1);
    d = nextStep(nextStep(d));
    d = closeRoom(d, { roomId: 'L-201', from: '2026-11-17', to: '2026-11-17', reason: 'repair' });
    const entry = d.log.at(-1)!;
    expect(entry.kind).toBe('repair');
    expect(d.state.bookings.some((b) => b.roomId === 'L-201')).toBe(false);
    expect(checkState(case1.instance, d.state)).toEqual([]);
  });

  it('compararea strategiilor nu modifică starea și reproduce exemplul pentru coordonator', () => {
    let d = load(coordinatorExample);
    d = nextStep(d); // r1 cu scorul V0 → S-14
    const r2 = coordinatorExample.steps[1]!.kind === 'request' ? coordinatorExample.steps[1]!.request : (undefined as never);
    const before = d.state;
    const cmp = compareStrategies(d, r2);
    expect(d.state).toBe(before);
    expect(cmp.map((c) => c.id)).toEqual(['A', 'B', 'C', 'C+M2']);
    expect(cmp.every((c) => c.decision.kind === 'accepted')).toBe(true);
  });

  it('scenariul generat este determinist și rulează complet fără încălcări', () => {
    const a = generatedScenario(5, 0.8);
    expect(JSON.stringify(a)).toBe(JSON.stringify(generatedScenario(5, 0.8)));
    let d = load(a);
    while (hasNextStep(d)) d = nextStep(d);
    expect(d.log.length).toBe(a.steps.length);
    expect(checkState(a.instance, d.state)).toEqual([]);
  });
});
