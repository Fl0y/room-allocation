// Criteriile de acceptare 2–4 din plan.md §4: cazurile 1–5 din concept §6 și exemplul pentru coordonator.

import { describe, expect, it } from 'vitest';
import { allocate, type Accepted, type Decision, type Rejected } from '../../src/engine/allocate.ts';
import { checkState, checkTransition } from '../../src/engine/checker.ts';
import type { State } from '../../src/engine/types.ts';
import { request } from '../../src/scenarios/build.ts';
import { case1, case2, case3, case4, case5, coordinatorExample } from '../../src/scenarios/cases.ts';
import { runScenario, type Scenario } from '../../src/scenarios/run.ts';

function accepted(d: Decision | undefined): Accepted {
  expect(d?.kind).toBe('accepted');
  return d as Accepted;
}
function rejected(d: Decision | undefined): Rejected {
  expect(d?.kind).toBe('rejected');
  return d as Rejected;
}
function expectValid(sc: Scenario, before: State, after: State) {
  expect(checkState(sc.instance, after)).toEqual([]);
  expect(checkTransition(before, after).violations).toEqual([]);
}
const totalExcess = (sc: Scenario, st: State) =>
  st.bookings.reduce((sum, b) => sum + sc.instance.rooms.find((r) => r.id === b.roomId)!.capacity - b.students, 0);

describe('Cazul 1 — ultimul laborator', () => {
  it('B primește singurul laborator liber; A este refuzat cu M = 0 și M = 1', () => {
    for (const maxMoves of [0, 1]) {
      const [b, a] = runScenario(case1, { maxMoves });
      expect(accepted(b!.decision).booking.roomId).toBe('L-201');
      expect(rejected(a!.decision).reasons[0]!.code).toBe('ROOM_UNAVAILABLE');
    }
  });

  it('cu M = 2: C → S-12, B → L-105, A primește L-201 (2 mutări)', () => {
    const [, a] = runScenario(case1, { maxMoves: 2 });
    const d = accepted(a!.decision);
    expect(d.booking.roomId).toBe('L-201');
    expect(d.moves).toEqual([
      { bookingId: 'B-lab', from: 'L-201', to: 'L-105' },
      { bookingId: 'C-seminar', from: 'L-105', to: 'S-12' },
    ]);
    expectValid(case1, a!.before, a!.after);
  });

  it('preventiv: seminarul lui C, sosit când S-12 era liberă, nu ar fi ocupat laboratorul (raritate)', () => {
    const c = request({ id: 'C', teacher: 'Prof. C', units: ['MK-231'], activity: 'seminar', date: '2026-11-17', start: 3, students: 15 });
    const empty: State = { bookings: [], closures: [] };
    expect(accepted(allocate(case1.instance, empty, c)).booking.roomId).toBe('S-12');
    // best-fit simplu ar alege laboratorul L-105 (16 locuri, excedent 1)
    expect(accepted(allocate(case1.instance, empty, c, { strategy: 'best-fit' })).booking.roomId).toBe('L-105');
  });

  it('dacă B este în orizontul înghețat, A este refuzat cu alternative valide', () => {
    const [b] = runScenario(case1);
    const frozen: State = {
      ...b!.after,
      bookings: b!.after.bookings.map((x) => (x.id === 'B-lab' ? { ...x, status: 'frozen' as const } : x)),
    };
    const d = rejected(allocate(case1.instance, frozen, case1.steps[1]!.kind === 'request' ? case1.steps[1]!.request : (undefined as never)));
    expect(d.reasons[0]!.code).toBe('ROOM_UNAVAILABLE');
    expect(d.alternatives.length).toBeGreaterThan(0);
    expect(d.alternatives[0]).toMatchObject({ kind: 'slot', date: '2026-11-17' });
  });
});

describe('Cazul 2 — blocul rupt de o pereche izolată', () => {
  it('cu M = 0: refuz; cu M = 2: E → L-105, blocul 2–4 întreg în L-201 (1 mutare)', () => {
    expect(rejected(runScenario(case2, { maxMoves: 0 })[0]!.decision).reasons[0]!.code).toBe('ROOM_UNAVAILABLE');
    const [step] = runScenario(case2, { maxMoves: 2 });
    const d = accepted(step!.decision);
    expect(d.booking).toMatchObject({ roomId: 'L-201', start: 2, length: 3 });
    expect(d.moves).toEqual([{ bookingId: 'E-lab', from: 'L-201', to: 'L-105' }]);
    expectValid(case2, step!.before, step!.after);
  });
});

describe('Cazul 3 — auditoriul ocupat de o grupă mică', () => {
  it('cu M = 0: refuz; cu M = 2: seminarul → S-12, fluxul în A-1; locurile neocupate 95 → 15', () => {
    expect(rejected(runScenario(case3, { maxMoves: 0 })[0]!.decision).reasons[0]!.code).toBe('ROOM_UNAVAILABLE');
    const [step] = runScenario(case3, { maxMoves: 2 });
    const d = accepted(step!.decision);
    expect(d.booking.roomId).toBe('A-1');
    expect(d.booking.students).toBe(110);
    expect(d.moves).toEqual([{ bookingId: 'G-seminar', from: 'A-1', to: 'S-12' }]);
    expect(totalExcess(case3, step!.before)).toBe(95);
    expect(totalExcess(case3, step!.after)).toBe(15);
    expectValid(case3, step!.before, step!.after);
  });
});

describe('Cazul 4 — conflict de persoane', () => {
  it('refuz GROUP_BUSY care numește ambele laboratoare ale subgrupelor', () => {
    const d = rejected(runScenario(case4)[0]!.decision);
    expect(d.reasons.map((r) => r.code)).toEqual(['GROUP_BUSY']);
    expect(d.reasons[0]!.bookings).toEqual(['P-lab-sg1', 'Q-lab-sg2']);
  });

  it('alternativele sunt valide pentru profesor și grupă (confirmat de verificator), cele din aceeași zi întâi', () => {
    const d = rejected(runScenario(case4)[0]!.decision);
    expect(d.alternatives.length).toBe(5);
    const req = case4.steps[0]!.kind === 'request' ? case4.steps[0]!.request : (undefined as never);
    for (const alt of d.alternatives) {
      if (alt.kind !== 'slot') continue;
      expect(alt.start).not.toBe(3); // prof. F predă la perechea 3
      const st: State = {
        closures: [],
        bookings: [...case4.initial.bookings, { ...req, date: alt.date, start: alt.start, students: 26, roomId: alt.roomId, status: 'movable' }],
      };
      expect(checkState(case4.instance, st)).toEqual([]);
    }
    expect(d.alternatives[0]).toMatchObject({ kind: 'slot', date: '2026-11-18', start: 1 });
  });

  it('TEACHER_BUSY când profesorul are deja activitate la perechea cerută', () => {
    const req = request({ id: 'F-p3', teacher: 'Prof. F', units: ['TI-231'], activity: 'seminar', date: '2026-11-18', start: 3, students: 26 });
    const d = rejected(allocate(case4.instance, case4.initial, req));
    expect(d.reasons.map((r) => r.code)).toEqual(['TEACHER_BUSY']);
  });
});

describe('Cazul 5 — reparare după închiderea sălii', () => {
  const [step] = runScenario(case5);
  const r = step!.repair!;

  it('toate cele 9 rezervări afectate sunt numărate exact o dată', () => {
    const ids = [...r.sameTimeDirect.map((x) => x.bookingId), ...r.sameTimeWithMoves.map((x) => x.bookingId), ...r.unresolved.map((u) => u.booking.id)];
    expect(ids.sort()).toEqual([...r.affected].sort());
    expect(r.affected.length).toBe(9);
  });

  it('fixarea examenului se anulează (D19) și examenul rămâne la aceeași oră', () => {
    expect(r.unfixed).toEqual(['b3-examen']);
    const exam = r.state.bookings.find((b) => b.id === 'b3-examen');
    if (exam) expect(exam).toMatchObject({ date: '2026-11-16', start: 4, status: 'fixed' });
  });

  it('starea finală nu are încălcări; nimic nu rămâne în sala închisă; doar rezervările mutabile neafectate se mută', () => {
    expect(r.violations).toEqual([]);
    expect(r.state.bookings.filter((b) => b.roomId === 'L-201')).toEqual([]);
    const affected = new Set(r.affected);
    const before = new Map(case5.initial.bookings.map((b) => [b.id, b] as const));
    for (const b of r.state.bookings) {
      const old = before.get(b.id)!;
      if (!affected.has(b.id) && old.roomId !== b.roomId) expect(old.status).toBe('movable');
    }
  });

  it('nerezolvatele au motiv și alternative valide', () => {
    for (const u of r.unresolved) {
      expect(u.reasons.length).toBeGreaterThan(0);
      for (const alt of u.alternatives) {
        if (alt.kind !== 'slot') continue;
        const st: State = {
          closures: r.state.closures,
          bookings: [...r.state.bookings, { ...u.booking, date: alt.date, start: alt.start, roomId: alt.roomId }],
        };
        // alternativele fără mutări trebuie să fie valide pe starea finală
        if (alt.moves === 0) expect(checkState(case5.instance, st)).toEqual([]);
      }
    }
  });
});

describe('Exemplul pentru coordonator (calculat de mână în feedback-coordonator.md)', () => {
  const rooms = (opts: Parameters<typeof runScenario>[1]) =>
    runScenario(coordinatorExample, opts).map((s) => (s.decision!.kind === 'accepted' ? s.decision!.booking.roomId : 'refuz'));

  it('prima sală liberă: 4/5, r4 refuzat', () => {
    expect(rooms({ strategy: 'first-fit', maxMoves: 0 })).toEqual(['A-1', 'L-201', 'S-12', 'refuz', 'L-105']);
  });
  it('best-fit: 4/5, r2 refuzat', () => {
    expect(rooms({ strategy: 'best-fit', maxMoves: 0 })).toEqual(['L-201', 'refuz', 'S-12', 'A-1', 'L-105']);
  });
  it('scor cu raritate: 5/5', () => {
    expect(rooms({ strategy: 'score', maxMoves: 0 })).toEqual(['S-14', 'L-201', 'S-12', 'A-1', 'L-105']);
  });
  it('best-fit + reparare (M = 1): 5/5, cu mutarea r1 → S-14', () => {
    const res = runScenario(coordinatorExample, { strategy: 'best-fit', maxMoves: 1 });
    expect(res.map((s) => s.decision!.kind)).toEqual(Array(5).fill('accepted'));
    expect(accepted(res[1]!.decision).moves).toEqual([{ bookingId: 'r1', from: 'L-201', to: 'S-14' }]);
  });
});
