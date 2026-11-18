// Generator de instanțe mici aleatoare, cu seed, pentru comparația cu oracolul.

import { checkState } from '../../src/engine/checker.ts';
import { DEFAULT_GRID } from '../../src/engine/grid.ts';
import type { ActivityType, Booking, BookingStatus, Instance, Needs, Request, Room, State, Unit } from '../../src/engine/types.ts';
import { buildUnitIndex, sizeOf } from '../../src/engine/units.ts';

export { mulberry32 } from '../../src/sim/rng.ts';
import { mulberry32 } from '../../src/sim/rng.ts';

const int = (rnd: () => number, lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;

const DATE = '2026-12-01';

function needs(activity: ActivityType, students: number): Needs {
  if (activity === 'lab') return { roomTypes: ['lab'], minComputers: students };
  if (activity === 'lecture') return { roomTypes: ['auditorium', 'seminar'] };
  return { roomTypes: ['seminar', 'lab', 'auditorium'] };
}

export interface RandomCase {
  instance: Instance;
  state: State;
  request: Request;
}

/** O zi, 2 perechi folosite (ocupare densă), 3–5 săli, 4–9 rezervări existente valide, o cerere nouă. */
export function randomCase(seed: number): RandomCase {
  const rnd = mulberry32(seed);
  const nRooms = int(rnd, 3, 5);
  const rooms: Room[] = [];
  for (let i = 0; i < nRooms; i++) {
    const type = pick(rnd, ['lab', 'lab', 'seminar', 'seminar', 'auditorium'] as const);
    const capacity = type === 'auditorium' ? int(rnd, 25, 40) : int(rnd, 8, 24);
    rooms.push({ id: `R${i}`, type, capacity, computers: type === 'lab' ? capacity : 0, projector: true, board: true });
  }
  const units: Unit[] = [];
  const nGroups = int(rnd, 6, 9);
  for (let g = 0; g < nGroups; g++) {
    if (rnd() < 0.4) {
      units.push({ id: `G${g}` });
      units.push({ id: `G${g}/1`, parent: `G${g}`, size: int(rnd, 4, 10) });
      units.push({ id: `G${g}/2`, parent: `G${g}`, size: int(rnd, 4, 10) });
    } else {
      units.push({ id: `G${g}`, size: int(rnd, 6, 18) });
    }
  }
  // Unitate și profesor proprii cererii noi (în 80% din cazuri), ca să predomine conflictele de sală.
  units.push({ id: 'GR', size: int(rnd, 6, 18) });
  const instance: Instance = { grid: DEFAULT_GRID, rooms, units, dates: [DATE] };
  const index = buildUnitIndex(units);
  const unitIds = units.map((u) => u.id).filter((id) => id !== 'GR');
  const teachers = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];

  const makeSpec = (id: string) => {
    const activity = pick(rnd, ['lab', 'seminar', 'lecture'] as const);
    const u = [pick(rnd, unitIds)];
    const students = sizeOf(index, u);
    const length = rnd() < 0.3 ? 2 : 1;
    const start = int(rnd, 1, 3 - length);
    return { id, teacher: pick(rnd, teachers), units: u, activity, needs: needs(activity, students), date: DATE, start, length, students };
  };

  const bookings: Booking[] = [];
  const target = int(rnd, 4, 9);
  for (let tries = 0; bookings.length < target && tries < 200; tries++) {
    const spec = makeSpec(`b${tries}`);
    const status: BookingStatus = rnd() < 0.75 ? 'movable' : 'frozen';
    const b: Booking = { ...spec, roomId: pick(rnd, rooms).id, status };
    if (checkState(instance, { bookings: [...bookings, b], closures: [] }).length === 0) bookings.push(b);
  }
  const spec = makeSpec('new');
  if (rnd() < 0.8) {
    spec.teacher = 'TR';
    spec.units = ['GR'];
    spec.students = sizeOf(index, ['GR']);
    spec.needs = needs(spec.activity, spec.students);
  }
  const request: Request = {
    id: spec.id,
    teacher: spec.teacher,
    units: spec.units,
    activity: spec.activity,
    needs: spec.needs,
    date: spec.date,
    start: spec.start,
    length: spec.length,
  };
  return { instance, state: { bookings, closures: [] }, request };
}

/**
 * Instanță mică pentru cererile cu interval (Lotul 4): o zi, perechile 1–4, 3–4 săli, 4–8 rezervări;
 * cererea are un interval de 2–3 începuturi și, de obicei, o unitate care are deja activități în ziua aceea
 * (ca ferestrele să conteze).
 */
export function randomIntervalCase(seed: number): RandomCase {
  const rnd = mulberry32(seed * 7919 + 13);
  const nRooms = int(rnd, 3, 4);
  const rooms: Room[] = [];
  for (let i = 0; i < nRooms; i++) {
    const type = pick(rnd, ['lab', 'seminar', 'seminar', 'auditorium'] as const);
    const capacity = type === 'auditorium' ? int(rnd, 25, 40) : int(rnd, 8, 24);
    rooms.push({ id: `R${i}`, type, capacity, computers: type === 'lab' ? capacity : 0, projector: true, board: true });
  }
  const units: Unit[] = [
    { id: 'F' },
    { id: 'G1', parent: 'F' },
    { id: 'G1/1', parent: 'G1', size: int(rnd, 4, 10) },
    { id: 'G1/2', parent: 'G1', size: int(rnd, 4, 10) },
    { id: 'G2', parent: 'F', size: int(rnd, 6, 16) },
    { id: 'G3', size: int(rnd, 6, 16) },
  ];
  const instance: Instance = { grid: DEFAULT_GRID, rooms, units, dates: [DATE] };
  const index = buildUnitIndex(units);
  const unitIds = ['F', 'G1', 'G1/1', 'G1/2', 'G2', 'G3'];
  const teachers = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'];
  const makeSpec = (id: string, maxStart = 4) => {
    const activity = pick(rnd, ['lab', 'seminar', 'seminar', 'lecture'] as const);
    const u = [pick(rnd, unitIds)];
    const students = sizeOf(index, u);
    const length = rnd() < 0.2 ? 2 : 1;
    const start = int(rnd, 1, maxStart - length + 1);
    return { id, teacher: pick(rnd, teachers), units: u, activity, needs: needs(activity, students), date: DATE, start, length, students };
  };
  const bookings: Booking[] = [];
  const target = int(rnd, 4, 8);
  for (let tries = 0; bookings.length < target && tries < 300; tries++) {
    const spec = makeSpec(`b${tries}`);
    const status: BookingStatus = rnd() < 0.8 ? 'movable' : 'frozen';
    const b: Booking = { ...spec, roomId: pick(rnd, rooms).id, status };
    if (checkState(instance, { bookings: [...bookings, b], closures: [] }).length === 0) bookings.push(b);
  }
  const spec = makeSpec('new', 3);
  spec.teacher = 'TR';
  const span = int(rnd, 1, 2); // 2 sau 3 începuturi posibile
  const latest = Math.min(4 + 1, spec.start + spec.length - 1 + span);
  const request: Request = {
    id: spec.id,
    teacher: spec.teacher,
    units: spec.units,
    activity: spec.activity,
    needs: spec.needs,
    date: spec.date,
    start: spec.start,
    length: spec.length,
    latest,
  };
  return { instance, state: { bookings, closures: [] }, request };
}
