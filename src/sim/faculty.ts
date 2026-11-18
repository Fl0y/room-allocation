// Facultatea sintetică în formatul intern (plan.md Lotul 3a.2, D33): săli, fluxuri/grupe/subgrupe,
// profesori pseudonimizați, discipline, repartizări și un orar săptămânal fără conflicte.
// Structura este APROXIMATIVĂ și inventată; se recalibrează după datele reale (3b.2). Toate alegerile sunt
// parametri în FacultyShape, ca să poată fi ajustate fără a schimba codul.
//
// Orarul imită un orar făcut de om, nu de motorul nostru:
// - perechea și ziua se aleg compact pentru grupe (puține ferestre), cu preferință pentru dimineață și zgomot;
// - sala se alege la întâmplare dintre sălile libere compatibile de tipul principal al activității
//   (alt tip doar dacă tipul principal nu are loc). Nu se folosește scorul motorului, ca măsurătorile de bază
//   să nu fie favorabile artificial algoritmului.

import { roomMismatch } from '../engine/compat.ts';
import { DEFAULT_GRID } from '../engine/grid.ts';
import type { Room, RoomType } from '../engine/types.ts';
import { buildUnitIndex, sizeOf } from '../engine/units.ts';
import { FORMAT_ID, FORMAT_VERSION, needsOf, type CanonAssignment, type CanonCourse, type CanonRoom, type CanonSession, type CanonTeacher, type CanonUnit, type Dataset } from '../data/format.ts';
import { mulberry32, randInt, weighted, type Rng } from './rng.ts';
import { windowsOf } from './metrics.ts';

export interface FacultyShape {
  name: string;
  /** Săptămâna-tip, luni–vineri. */
  week: string[];
  /** Programe de studii × ani = fluxuri. */
  programs: number;
  years: number;
  groupsPerFlux: [number, number];
  groupSize: [number, number];
  /** Grupele cu cel puțin atâția studenți se împart în două subgrupe pentru laborator. */
  splitFrom: number;
  coursesPerFlux: [number, number];
  /** Partea disciplinelor cu laborator (restul au seminar). */
  practicalShare: number;
  lectureLength: readonly (readonly [number, number])[];
  /** Câte seminare/laboratoare pe săptămână are o grupă/subgrupă la o disciplină. */
  practicalPerWeek: readonly (readonly [number, number])[];
  rooms: {
    auditorium: { count: number; capacity: [number, number] };
    seminar: { count: number; capacity: [number, number]; projectorShare: number };
    lab: { count: number; computers: [number, number] };
  };
  /** Sarcina maximă a unui profesor (perechi pe săptămână). */
  teacherLoad: [number, number];
  /** Probabilitatea de a angaja un profesor nou chiar dacă unul existent mai are timp. */
  newTeacherShare: number;
  /** Preferința pentru fiecare pereche (1..7) la alcătuirea orarului. */
  periodPreference: number[];
  /** Perechi pe zi, cel mult, pentru o unitate atomică. */
  maxPerDay: number;
  /** Cât de mult contează zgomotul față de compactitate (0 = orar perfect compact). */
  noise: number;
}

export const DEFAULT_SHAPE: FacultyShape = {
  name: 'Facultate sintetică (structură aproximativă)',
  week: ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'],
  programs: 4,
  years: 3,
  groupsPerFlux: [1, 3],
  groupSize: [16, 30],
  splitFrom: 20,
  coursesPerFlux: [5, 6],
  practicalShare: 0.5,
  lectureLength: [
    [1, 0.85],
    [2, 0.15],
  ],
  practicalPerWeek: [
    [1, 0.75],
    [2, 0.25],
  ],
  rooms: {
    auditorium: { count: 4, capacity: [60, 140] },
    seminar: { count: 7, capacity: [24, 36], projectorShare: 0.7 },
    lab: { count: 8, computers: [14, 26] },
  },
  teacherLoad: [6, 12],
  newTeacherShare: 0.2,
  periodPreference: [6, 6, 5, 4, 3, 1.5, 0.5],
  maxPerDay: 4,
  noise: 3,
};

export interface FacultyResult {
  dataset: Dataset;
  /** Ședințele pe care generatorul nu le-a putut plasa (ar trebui să fie 0). */
  unscheduled: { assignment: string; session: number }[];
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const pad = (n: number, w = 3) => String(n).padStart(w, '0');

function shuffle<T>(rnd: Rng, xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}

function buildRooms(rnd: Rng, s: FacultyShape): CanonRoom[] {
  const rooms: CanonRoom[] = [];
  const a = s.rooms.auditorium;
  for (let i = 0; i < a.count; i++)
    rooms.push({ id: `AUD-${i + 1}`, name: `Aula ${i + 1}`, type: 'auditorium', capacity: i === 0 ? a.capacity[1] : randInt(rnd, a.capacity[0], a.capacity[1]), computers: 0, projector: true, board: true });
  const sm = s.rooms.seminar;
  for (let i = 0; i < sm.count; i++)
    rooms.push({ id: `SEM-${pad(i + 1, 2)}`, name: `Sala ${200 + i + 1}`, type: 'seminar', capacity: randInt(rnd, sm.capacity[0], sm.capacity[1]), computers: 0, projector: rnd() < sm.projectorShare, board: true });
  const l = s.rooms.lab;
  for (let i = 0; i < l.count; i++) {
    const c = i === 0 ? l.computers[1] : randInt(rnd, l.computers[0], l.computers[1]);
    rooms.push({ id: `LAB-${pad(i + 1, 2)}`, name: `Laborator ${300 + i + 1}`, type: 'lab', capacity: c, computers: c, projector: true, board: true });
  }
  return rooms;
}

export function generateFaculty(seed: number, shape: FacultyShape = DEFAULT_SHAPE): FacultyResult {
  const rnd = mulberry32(seed);
  const rooms = buildRooms(rnd, shape);

  // ── Unitățile: flux = program × an; grupe; subgrupe pentru laborator ──
  const units: CanonUnit[] = [];
  const fluxes: { id: string; groups: { id: string; labUnits: string[] }[] }[] = [];
  for (let p = 0; p < shape.programs; p++) {
    for (let y = 1; y <= shape.years; y++) {
      const fid = `${LETTERS[p]}${y}`;
      units.push({ id: fid, kind: 'flux', name: `Programul ${LETTERS[p]}, anul ${y}` });
      const flux = { id: fid, groups: [] as { id: string; labUnits: string[] }[] };
      const n = randInt(rnd, shape.groupsPerFlux[0], shape.groupsPerFlux[1]);
      for (let g = 1; g <= n; g++) {
        const gid = `${fid}-${g}`;
        const size = randInt(rnd, shape.groupSize[0], shape.groupSize[1]);
        if (size >= shape.splitFrom) {
          const half = Math.ceil(size / 2);
          units.push({ id: gid, kind: 'group', parent: fid, name: `Grupa ${gid}` });
          units.push({ id: `${gid}/1`, kind: 'subgroup', parent: gid, size: half, name: `Subgrupa ${gid}/1` });
          units.push({ id: `${gid}/2`, kind: 'subgroup', parent: gid, size: size - half, name: `Subgrupa ${gid}/2` });
          flux.groups.push({ id: gid, labUnits: [`${gid}/1`, `${gid}/2`] });
        } else {
          units.push({ id: gid, kind: 'group', parent: fid, size, name: `Grupa ${gid}` });
          flux.groups.push({ id: gid, labUnits: [gid] });
        }
      }
      fluxes.push(flux);
    }
  }
  const index = buildUnitIndex(units.map((u) => ({ id: u.id, parent: u.parent, size: u.size })));

  // ── Profesorii, disciplinele, repartizările ──
  const teachers: (CanonTeacher & { max: number; load: number })[] = [];
  const newTeacher = () => {
    const id = `P-${pad(teachers.length + 1)}`;
    const t = { id, name: `Profesor ${id}`, max: randInt(rnd, shape.teacherLoad[0], shape.teacherLoad[1]), load: 0 };
    teachers.push(t);
    return t;
  };
  const teacherFor = (periods: number) => {
    const free = teachers.filter((t) => t.load + periods <= t.max);
    const t = !free.length || rnd() < shape.newTeacherShare ? newTeacher() : free[Math.floor(rnd() * free.length)]!;
    t.load += periods;
    return t.id;
  };

  const courses: CanonCourse[] = [];
  const assignments: CanonAssignment[] = [];
  const addAssignment = (a: Omit<CanonAssignment, 'id'>) => assignments.push({ id: `R-${pad(assignments.length + 1, 4)}`, ...a });
  for (const flux of fluxes) {
    const n = randInt(rnd, shape.coursesPerFlux[0], shape.coursesPerFlux[1]);
    for (let c = 0; c < n; c++) {
      const course = { id: `D-${pad(courses.length + 1)}`, name: `Disciplina ${pad(courses.length + 1)} (${flux.id})` };
      courses.push(course);
      const len = weighted(rnd, shape.lectureLength);
      addAssignment({ course: course.id, teacher: teacherFor(len), activity: 'lecture', units: [flux.id], roomTypes: ['auditorium'], minComputers: null, projector: true, length: len, perWeek: 1 });
      const practical = rnd() < shape.practicalShare;
      const perWeek = weighted(rnd, shape.practicalPerWeek);
      const parts = practical ? flux.groups.flatMap((g) => g.labUnits) : flux.groups.map((g) => g.id);
      // un asistent pentru toate grupele disciplinei, cât îi permite sarcina; apoi altul
      let assistant: string | null = null;
      let assistantLeft = 0;
      for (const u of parts) {
        if (!assistant || assistantLeft < perWeek) {
          assistant = teacherFor(0);
          const t = teachers.find((x) => x.id === assistant)!;
          assistantLeft = t.max - t.load;
          if (assistantLeft < perWeek) {
            const nt = newTeacher();
            assistant = nt.id;
            assistantLeft = nt.max;
          }
        }
        teachers.find((x) => x.id === assistant)!.load += perWeek;
        assistantLeft -= perWeek;
        addAssignment(
          practical
            ? { course: course.id, teacher: assistant, activity: 'lab', units: [u], roomTypes: ['lab'], minComputers: 'students', projector: false, length: 1, perWeek }
            : { course: course.id, teacher: assistant, activity: 'seminar', units: [u], roomTypes: ['seminar', 'auditorium', 'lab'], minComputers: null, projector: false, length: 1, perWeek },
        );
      }
    }
  }

  // ── Orarul ──
  const P = DEFAULT_GRID.periods.length;
  const D = shape.week.length;
  const roomBusy = new Set<string>(); // sală|zi|pereche
  const teacherBusy = new Set<string>(); // profesor|zi|pereche
  const atomDay = new Map<string, Set<number>>(); // atom|zi → perechi
  const assignmentDays = new Map<string, Set<number>>();
  const engineRooms: Room[] = rooms.map((r) => ({ id: r.id, type: r.type, capacity: r.capacity, computers: r.computers, projector: r.projector, board: r.board }));
  const order = (a: CanonAssignment) => (a.activity === 'lecture' ? 0 : a.activity === 'lab' ? 1 : 2);
  const sessions: { a: CanonAssignment; k: number }[] = [];
  for (const a of assignments) for (let k = 0; k < a.perWeek; k++) sessions.push({ a, k });
  shuffle(rnd, sessions);
  sessions.sort((x, y) => order(x.a) - order(y.a) || sizeOf(index, y.a.units) - sizeOf(index, x.a.units));

  const timetable: CanonSession[] = [];
  const unscheduled: FacultyResult['unscheduled'] = [];
  for (const { a, k } of sessions) {
    const students = sizeOf(index, a.units);
    const needs = needsOf(a, students);
    const atoms = [...new Set(a.units.flatMap((u) => index.atoms.get(u) ?? []))];
    const compatible = engineRooms.filter((r) => roomMismatch(r, needs, students) === null);
    let best: { day: number; start: number; rooms: Room[]; cost: number } | null = null;
    // a doua încercare relaxează limita zilnică (rar; se raportează doar ce nu încape nici așa)
    for (const dayLimit of [shape.maxPerDay, P]) {
    if (best) break;
    for (let day = 1; day <= D; day++) {
      if (assignmentDays.get(a.id)?.has(day)) continue;
      for (let start = 1; start + a.length - 1 <= P; start++) {
        const ps = Array.from({ length: a.length }, (_, i) => start + i);
        if (ps.some((p) => teacherBusy.has(`${a.teacher}|${day}|${p}`))) continue;
        let ok = true;
        let windowsDelta = 0;
        let dayLoad = 0;
        for (const atom of atoms) {
          const busy = atomDay.get(`${atom}|${day}`) ?? new Set<number>();
          if (ps.some((p) => busy.has(p)) || busy.size + a.length > dayLimit) {
            ok = false;
            break;
          }
          const after = new Set([...busy, ...ps]);
          windowsDelta += windowsOf(after) - windowsOf(busy);
          dayLoad += busy.size;
        }
        if (!ok) continue;
        const free = compatible.filter((r) => ps.every((p) => !roomBusy.has(`${r.id}|${day}|${p}`)));
        if (!free.length) continue;
        const pref = ps.reduce((s, p) => s + Math.log(shape.periodPreference[p - 1] ?? 0.1), 0) / ps.length;
        const cost = 3 * windowsDelta / atoms.length + 0.3 * dayLoad / atoms.length - pref + shape.noise * rnd();
        if (!best || cost < best.cost) best = { day, start, rooms: free, cost };
      }
    }
    }
    if (!best) {
      unscheduled.push({ assignment: a.id, session: k + 1 });
      continue;
    }
    const primary: RoomType = a.roomTypes[0]!;
    const preferred = best.rooms.filter((r) => r.type === primary);
    const pool = preferred.length ? preferred : best.rooms;
    const room = pool[Math.floor(rnd() * pool.length)]!;
    for (let p = best.start; p < best.start + a.length; p++) {
      roomBusy.add(`${room.id}|${best.day}|${p}`);
      teacherBusy.add(`${a.teacher}|${best.day}|${p}`);
      for (const atom of atoms) {
        const key = `${atom}|${best.day}`;
        let s = atomDay.get(key);
        if (!s) atomDay.set(key, (s = new Set()));
        s.add(p);
      }
    }
    let days = assignmentDays.get(a.id);
    if (!days) assignmentDays.set(a.id, (days = new Set()));
    days.add(best.day);
    timetable.push({ id: '', assignment: a.id, day: best.day, start: best.start, length: a.length, room: room.id, status: 'movable' });
  }
  timetable.sort((x, y) => x.day - y.day || x.start - y.start || x.room.localeCompare(y.room));
  timetable.forEach((s, i) => (s.id = `O-${pad(i + 1, 4)}`));

  return {
    dataset: {
      manifest: {
        format: FORMAT_ID,
        version: FORMAT_VERSION,
        source: 'synthetic',
        name: shape.name,
        week: [...shape.week],
        seed,
        notes: 'Date inventate (D33). Structura aproximează o facultate; nu provine din date reale.',
      },
      rooms,
      units,
      teachers: teachers.map(({ id, name }) => ({ id, name })),
      courses,
      assignments,
      timetable,
    },
    unscheduled,
  };
}
