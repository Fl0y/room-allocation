// Generatorul de date sintetice cu seed (D24, plan.md Lotul 2a).
// Produce o facultate fictivă (săli, fluxuri, grupe, subgrupe) și un șir de cereri pentru o săptămână,
// până la o încărcare țintă. Încărcarea = perechi-sală cerute / perechi-sală disponibile.
//
// Alegeri deliberate, ca refuzurile să măsoare doar lipsa sălilor:
// - în șirul generat, profesorii și grupele nu au suprapuneri între ele;
// - fiecare cerere are cel puțin o sală compatibilă în facultate (altfel nu se generează).

import { roomMismatch } from '../engine/compat.ts';
import { DEFAULT_GRID, overlaps } from '../engine/grid.ts';
import type { ActivityType, Instance, Needs, Request, Room, State, Unit } from '../engine/types.ts';
import { atomsOf, buildUnitIndex, intersects, sizeOf } from '../engine/units.ts';
import { mulberry32, pick, randInt, weighted } from './rng.ts';

export interface FacultyProfile {
  /** Datele simulate (o săptămână de lucru). */
  days: string[];
  rooms: {
    auditorium: { count: number; capacity: [number, number] };
    seminar: { count: number; capacity: [number, number] };
    lab: { count: number; computers: [number, number] };
  };
  fluxes: number;
  groupsPerFlux: [number, number];
  groupSize: [number, number];
  /** Probabilitatea ca o grupă să fie împărțită în două subgrupe (pentru laboratoare). */
  subgroupShare: number;
  teachers: number;
  /** Ponderile tipurilor de activitate. */
  mix: readonly (readonly [ActivityType, number])[];
  /** Ponderile lungimii blocului (în perechi). */
  lengths: readonly (readonly [number, number])[];
}

export const DEFAULT_PROFILE: FacultyProfile = {
  days: ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'],
  rooms: {
    auditorium: { count: 4, capacity: [80, 150] },
    seminar: { count: 10, capacity: [20, 35] },
    lab: { count: 8, computers: [14, 30] },
  },
  fluxes: 10,
  groupsPerFlux: [2, 4],
  groupSize: [18, 30],
  subgroupShare: 0.6,
  teachers: 60,
  // Ponderi alese astfel încât cererea de perechi pe tip să fie aproximativ proporțională cu oferta
  // (auditorii 4/22, seminare 10/22, laboratoare 8/22). Seminarele pot folosi și alte tipuri de sală.
  mix: [
    ['lecture', 0.27],
    ['seminar', 0.45],
    ['lab', 0.28],
  ],
  lengths: [
    [1, 0.6],
    [2, 0.35],
    [3, 0.05],
  ],
};

export interface Workload {
  seed: number;
  targetLoad: number;
  instance: Instance;
  /** Cererile, în ordinea sosirii. */
  requests: Request[];
  /** Rezervările existente la început (de exemplu orarul săptămânii, Lotul 3a.3); implicit nicio rezervare. */
  initialState?: State;
  capacityPeriods: number;
  requestedPeriods: number;
  achievedLoad: number;
}

function buildRooms(rnd: () => number, p: FacultyProfile): Room[] {
  const rooms: Room[] = [];
  // Primul auditoriu are capacitatea maximă, ca orice flux să aibă cel puțin o sală compatibilă.
  for (let i = 0; i < p.rooms.auditorium.count; i++) {
    const [lo, hi] = p.rooms.auditorium.capacity;
    rooms.push({ id: `A-${i + 1}`, type: 'auditorium', capacity: i === 0 ? hi : randInt(rnd, lo, hi), computers: 0, projector: true, board: true });
  }
  for (let i = 0; i < p.rooms.seminar.count; i++) {
    const [lo, hi] = p.rooms.seminar.capacity;
    rooms.push({ id: `S-${String(i + 1).padStart(2, '0')}`, type: 'seminar', capacity: randInt(rnd, lo, hi), computers: 0, projector: rnd() < 0.8, board: true });
  }
  for (let i = 0; i < p.rooms.lab.count; i++) {
    const [lo, hi] = p.rooms.lab.computers;
    const c = i === 0 ? hi : randInt(rnd, lo, hi);
    rooms.push({ id: `L-${String(i + 1).padStart(2, '0')}`, type: 'lab', capacity: c, computers: c, projector: true, board: false });
  }
  return rooms;
}

function buildUnits(rnd: () => number, p: FacultyProfile): { units: Unit[]; fluxes: string[]; groups: string[]; labUnits: string[] } {
  const units: Unit[] = [];
  const fluxes: string[] = [];
  const groups: string[] = [];
  const labUnits: string[] = [];
  for (let f = 0; f < p.fluxes; f++) {
    const fid = `F${String(f + 1).padStart(2, '0')}`;
    units.push({ id: fid });
    fluxes.push(fid);
    const n = randInt(rnd, p.groupsPerFlux[0], p.groupsPerFlux[1]);
    for (let g = 1; g <= n; g++) {
      const gid = `${fid}-${g}`;
      const size = randInt(rnd, p.groupSize[0], p.groupSize[1]);
      groups.push(gid);
      if (rnd() < p.subgroupShare) {
        const a = Math.ceil(size / 2);
        units.push({ id: gid, parent: fid });
        units.push({ id: `${gid}/1`, parent: gid, size: a });
        units.push({ id: `${gid}/2`, parent: gid, size: size - a });
        labUnits.push(`${gid}/1`, `${gid}/2`);
      } else {
        units.push({ id: gid, parent: fid, size });
        labUnits.push(gid);
      }
    }
  }
  return { units, fluxes, groups, labUnits };
}

function needsFor(activity: ActivityType, students: number): Needs {
  if (activity === 'lab') return { roomTypes: ['lab'], minComputers: students };
  if (activity === 'lecture') return { roomTypes: ['auditorium'], projector: true };
  return { roomTypes: ['seminar', 'auditorium', 'lab'] };
}

export function generateWorkload(seed: number, targetLoad: number, profile: FacultyProfile = DEFAULT_PROFILE): Workload {
  const rnd = mulberry32(seed);
  const rooms = buildRooms(rnd, profile);
  const { units, fluxes, groups, labUnits } = buildUnits(rnd, profile);
  const instance: Instance = { grid: DEFAULT_GRID, rooms, units, dates: [...profile.days] };
  const index = buildUnitIndex(units);
  const P = DEFAULT_GRID.periods.length;
  const capacityPeriods = rooms.length * profile.days.length * P;
  const teachers = Array.from({ length: profile.teachers }, (_, i) => `T${String(i + 1).padStart(2, '0')}`);

  const requests: Request[] = [];
  const taken: { teacher: string; atoms: Set<string>; date: string; start: number; length: number }[] = [];
  let requestedPeriods = 0;
  let attempts = 0;
  const maxAttempts = 50_000;

  while (requestedPeriods < targetLoad * capacityPeriods && attempts < maxAttempts) {
    attempts++;
    const activity = weighted(rnd, profile.mix);
    const participants = activity === 'lecture' ? pick(rnd, fluxes) : activity === 'seminar' ? pick(rnd, groups) : pick(rnd, labUnits);
    const students = sizeOf(index, [participants]);
    const needs = needsFor(activity, students);
    if (!rooms.some((r) => roomMismatch(r, needs, students) === null)) continue;
    const length = weighted(rnd, profile.lengths);
    // nu depășim ținta cu mai mult decât e nevoie
    if (requestedPeriods + length > targetLoad * capacityPeriods + 1) continue;
    const date = pick(rnd, profile.days);
    const start = randInt(rnd, 1, P - length + 1);
    const atoms = atomsOf(index, [participants]);
    const span = { date, start, length };
    const busy = taken.filter((t) => overlaps(t, span));
    if (busy.some((t) => intersects(t.atoms, atoms))) continue;
    const freeTeachers = teachers.filter((t) => !busy.some((b) => b.teacher === t));
    if (!freeTeachers.length) continue;
    const teacher = pick(rnd, freeTeachers);
    const id = `q${String(requests.length + 1).padStart(4, '0')}`;
    requests.push({ id, teacher, units: [participants], activity, needs, date, start, length });
    taken.push({ teacher, atoms, date, start, length });
    requestedPeriods += length;
  }

  return {
    seed,
    targetLoad,
    instance,
    requests,
    capacityPeriods,
    requestedPeriods,
    achievedLoad: requestedPeriods / capacityPeriods,
  };
}
