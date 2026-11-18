// Formatul intern al datelor (D33, plan.md Lotul 3a.1). Specificația pentru oameni: info_pack/docs/data-format.md.
// Același format pentru datele sintetice și pentru cele reale (după convertorul din 3b.1).
// Modulul este pur: primește textul fișierelor și întoarce datele, problemele găsite și instanța motorului.
// Citirea și scrierea fișierelor sunt în io.ts.

import { checkState } from '../engine/checker.ts';
import { roomMismatch } from '../engine/compat.ts';
import { DEFAULT_GRID } from '../engine/grid.ts';
import type { ActivityType, Booking, BookingStatus, Instance, Needs, RoomType, State, Unit } from '../engine/types.ts';
import { buildUnitIndex, sizeOf, validateUnits } from '../engine/units.ts';
import { parseCsv, toCsv, type CsvRow } from './csv.ts';

export const FORMAT_ID = 'room-allocation/canonical';
export const FORMAT_VERSION = 1;

export const MANIFEST_FILE = 'dataset.json';
export const FILES = {
  rooms: 'rooms.csv',
  units: 'units.csv',
  teachers: 'teachers.csv',
  courses: 'courses.csv',
  assignments: 'assignments.csv',
  timetable: 'timetable.csv',
} as const;
export type TableName = keyof typeof FILES;

export const COLUMNS: Record<TableName, readonly string[]> = {
  rooms: ['id', 'name', 'type', 'capacity', 'computers', 'projector', 'board'],
  units: ['id', 'kind', 'parent', 'size', 'name'],
  teachers: ['id', 'name'],
  courses: ['id', 'name'],
  assignments: ['id', 'course', 'teacher', 'activity', 'units', 'room_types', 'min_computers', 'projector', 'length', 'per_week'],
  timetable: ['id', 'assignment', 'day', 'start', 'length', 'room', 'status'],
};

export interface Manifest {
  format: typeof FORMAT_ID;
  version: number;
  source: 'synthetic' | 'real';
  name: string;
  /** Datele săptămânii-tip, de luni până vineri (ISO). Ziua 1 din orar = primul element. */
  week: string[];
  /** Pentru datele sintetice: seed-ul generatorului. */
  seed?: number;
  notes?: string;
}

export type UnitKind = 'flux' | 'group' | 'subgroup';

export interface CanonRoom {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  computers: number;
  projector: boolean;
  board: boolean;
}

export interface CanonUnit {
  id: string;
  kind: UnitKind;
  parent?: string;
  size?: number;
  name: string;
}

export interface CanonTeacher {
  id: string;
  /** Pseudonimul (D28); numele reale nu apar niciodată în formatul intern. */
  name: string;
}

export interface CanonCourse {
  id: string;
  name: string;
}

export interface CanonAssignment {
  id: string;
  course: string;
  teacher: string;
  activity: ActivityType;
  units: string[];
  roomTypes: RoomType[];
  /** `'students'` = câte un calculator pentru fiecare student participant. */
  minComputers: number | 'students' | null;
  projector: boolean;
  /** Lungimea obișnuită a unei ședințe, în perechi. */
  length: number;
  /** Câte ședințe pe săptămână. */
  perWeek: number;
  /** Linia din fișier, completată la citire (pentru raport). */
  line?: number;
}

export interface CanonSession {
  id: string;
  assignment: string;
  /** 1 = luni … 5 = vineri (indexul în `manifest.week`). */
  day: number;
  start: number;
  length: number;
  room: string;
  status: BookingStatus;
  /** Linia din fișier, completată la citire (pentru raport). */
  line?: number;
}

export interface Dataset {
  manifest: Manifest;
  rooms: CanonRoom[];
  units: CanonUnit[];
  teachers: CanonTeacher[];
  courses: CanonCourse[];
  assignments: CanonAssignment[];
  timetable: CanonSession[];
}

export interface Issue {
  severity: 'error' | 'warning';
  /** Fișierul (de exemplu `timetable.csv`) și linia, dacă problema ține de un rând. */
  file: string;
  line?: number;
  code: string;
  message: string;
}

const ROOM_TYPES: readonly RoomType[] = ['auditorium', 'seminar', 'lab'];
const ACTIVITIES: readonly ActivityType[] = ['lecture', 'seminar', 'lab', 'event', 'exam', 'other'];
const KINDS: readonly UnitKind[] = ['flux', 'group', 'subgroup'];
const STATUSES: readonly BookingStatus[] = ['movable', 'frozen', 'fixed'];

// ── Citirea ──────────────────────────────────────────────────────────────

class Reader {
  issues: Issue[] = [];
  file: string;
  constructor(file: string) {
    this.file = file;
  }

  err(line: number | undefined, code: string, message: string) {
    this.issues.push({ severity: 'error', file: this.file, line, code, message });
  }

  str(r: CsvRow, col: string, required = true): string {
    const v = r.values[col] ?? '';
    if (required && v === '') this.err(r.line, 'MISSING', `coloana „${col}” este goală`);
    return v;
  }

  int(r: CsvRow, col: string, min: number, optional = false): number | undefined {
    const v = r.values[col] ?? '';
    if (v === '' && optional) return undefined;
    const n = Number(v);
    if (v === '' || !Number.isInteger(n) || n < min) {
      this.err(r.line, 'NUMBER', `coloana „${col}”: se aștepta un număr întreg ≥ ${min}, s-a găsit „${v}”`);
      return undefined;
    }
    return n;
  }

  bool(r: CsvRow, col: string): boolean {
    const v = (r.values[col] ?? '').toLowerCase();
    if (v === '1' || v === 'true' || v === 'da') return true;
    if (v === '0' || v === 'false' || v === 'nu' || v === '') return false;
    this.err(r.line, 'BOOLEAN', `coloana „${col}”: se aștepta 0 sau 1, s-a găsit „${v}”`);
    return false;
  }

  oneOf<T extends string>(r: CsvRow, col: string, allowed: readonly T[], fallback?: T): T | undefined {
    const v = r.values[col] ?? '';
    if (v === '' && fallback !== undefined) return fallback;
    if ((allowed as readonly string[]).includes(v)) return v as T;
    this.err(r.line, 'ENUM', `coloana „${col}”: „${v}” nu este una dintre ${allowed.join(', ')}`);
    return undefined;
  }

  list(r: CsvRow, col: string): string[] {
    return (r.values[col] ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function table(name: TableName, text: string | undefined, issues: Issue[]): CsvRow[] {
  const file = FILES[name];
  if (text === undefined) {
    issues.push({ severity: 'error', file, code: 'FILE_MISSING', message: 'fișierul lipsește' });
    return [];
  }
  const t = parseCsv(text);
  const missing = COLUMNS[name].filter((c) => !t.header.includes(c) && !(name === 'timetable' && c === 'status'));
  if (missing.length) issues.push({ severity: 'error', file, line: 1, code: 'COLUMNS', message: `lipsesc coloanele: ${missing.join(', ')}` });
  const seen = new Map<string, number>();
  for (const r of t.rows) {
    const id = r.values.id ?? '';
    const first = seen.get(id);
    if (id && first !== undefined) issues.push({ severity: 'error', file, line: r.line, code: 'DUPLICATE', message: `identificatorul „${id}” apare deja la linia ${first}` });
    else if (id) seen.set(id, r.line);
  }
  return t.rows;
}

/**
 * Citește datele din textul fișierelor. Nu aruncă excepții pentru date greșite: fiecare problemă
 * apare în `issues`, cu fișierul și linia. Rândurile cu erori de format sunt omise din rezultat.
 */
export function parseDataset(files: Partial<Record<TableName | 'manifest', string>>): { dataset: Dataset; issues: Issue[] } {
  const issues: Issue[] = [];
  let manifest: Manifest = { format: FORMAT_ID, version: FORMAT_VERSION, source: 'synthetic', name: '?', week: [] };
  if (files.manifest === undefined) issues.push({ severity: 'error', file: MANIFEST_FILE, code: 'FILE_MISSING', message: 'fișierul lipsește' });
  else {
    try {
      const m = JSON.parse(files.manifest) as Partial<Manifest>;
      if (m.format !== FORMAT_ID) issues.push({ severity: 'error', file: MANIFEST_FILE, code: 'FORMAT', message: `format necunoscut „${String(m.format)}”` });
      if (m.version !== FORMAT_VERSION) issues.push({ severity: 'error', file: MANIFEST_FILE, code: 'VERSION', message: `versiunea ${String(m.version)} nu este suportată (se așteaptă ${FORMAT_VERSION})` });
      if (!Array.isArray(m.week) || m.week.length !== 5 || !m.week.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))))
        issues.push({ severity: 'error', file: MANIFEST_FILE, code: 'WEEK', message: '„week” trebuie să conțină 5 date ISO (luni–vineri)' });
      if (m.source !== 'synthetic' && m.source !== 'real') issues.push({ severity: 'error', file: MANIFEST_FILE, code: 'SOURCE', message: '„source” trebuie să fie synthetic sau real' });
      manifest = { ...manifest, ...m } as Manifest;
    } catch (e) {
      issues.push({ severity: 'error', file: MANIFEST_FILE, code: 'JSON', message: `JSON invalid: ${(e as Error).message}` });
    }
  }

  const rooms: CanonRoom[] = [];
  {
    const rd = new Reader(FILES.rooms);
    for (const r of table('rooms', files.rooms, issues)) {
      const before = rd.issues.length;
      const room: CanonRoom = {
        id: rd.str(r, 'id'),
        name: rd.str(r, 'name', false),
        type: rd.oneOf(r, 'type', ROOM_TYPES)!,
        capacity: rd.int(r, 'capacity', 1)!,
        computers: rd.int(r, 'computers', 0, true) ?? 0,
        projector: rd.bool(r, 'projector'),
        board: rd.bool(r, 'board'),
      };
      if (rd.issues.length === before) rooms.push(room);
    }
    issues.push(...rd.issues);
  }

  const units: CanonUnit[] = [];
  {
    const rd = new Reader(FILES.units);
    for (const r of table('units', files.units, issues)) {
      const before = rd.issues.length;
      const parent = rd.str(r, 'parent', false);
      const size = rd.int(r, 'size', 1, true);
      const u: CanonUnit = { id: rd.str(r, 'id'), kind: rd.oneOf(r, 'kind', KINDS)!, name: rd.str(r, 'name', false) };
      if (parent) u.parent = parent;
      if (size !== undefined) u.size = size;
      if (rd.issues.length === before) units.push(u);
    }
    issues.push(...rd.issues);
  }

  const simple = (name: 'teachers' | 'courses') => {
    const rd = new Reader(FILES[name]);
    const out: { id: string; name: string }[] = [];
    for (const r of table(name, files[name], issues)) {
      const before = rd.issues.length;
      const item = { id: rd.str(r, 'id'), name: rd.str(r, 'name', false) };
      if (rd.issues.length === before) out.push(item);
    }
    issues.push(...rd.issues);
    return out;
  };
  const teachers = simple('teachers');
  const courses = simple('courses');

  const assignments: CanonAssignment[] = [];
  {
    const rd = new Reader(FILES.assignments);
    for (const r of table('assignments', files.assignments, issues)) {
      const before = rd.issues.length;
      const roomTypes = rd.list(r, 'room_types');
      for (const t of roomTypes) if (!(ROOM_TYPES as readonly string[]).includes(t)) rd.err(r.line, 'ENUM', `tip de sală necunoscut „${t}”`);
      if (!roomTypes.length) rd.err(r.line, 'MISSING', 'coloana „room_types” este goală');
      const mc = r.values.min_computers ?? '';
      let minComputers: CanonAssignment['minComputers'] = null;
      if (mc === 'students') minComputers = 'students';
      else if (mc !== '') minComputers = rd.int(r, 'min_computers', 0) ?? null;
      const unitsList = rd.list(r, 'units');
      if (!unitsList.length) rd.err(r.line, 'MISSING', 'coloana „units” este goală');
      const a: CanonAssignment = {
        id: rd.str(r, 'id'),
        course: rd.str(r, 'course'),
        teacher: rd.str(r, 'teacher'),
        activity: rd.oneOf(r, 'activity', ACTIVITIES)!,
        units: unitsList,
        roomTypes: roomTypes as RoomType[],
        minComputers,
        projector: rd.bool(r, 'projector'),
        length: rd.int(r, 'length', 1)!,
        perWeek: rd.int(r, 'per_week', 0)!,
        line: r.line,
      };
      if (rd.issues.length === before) assignments.push(a);
    }
    issues.push(...rd.issues);
  }

  const timetable: CanonSession[] = [];
  {
    const rd = new Reader(FILES.timetable);
    for (const r of table('timetable', files.timetable, issues)) {
      const before = rd.issues.length;
      const s: CanonSession = {
        id: rd.str(r, 'id'),
        assignment: rd.str(r, 'assignment'),
        day: rd.int(r, 'day', 1)!,
        start: rd.int(r, 'start', 1)!,
        length: rd.int(r, 'length', 1)!,
        room: rd.str(r, 'room'),
        status: rd.oneOf(r, 'status', STATUSES, 'movable')!,
        line: r.line,
      };
      if (s.day !== undefined && s.day > 5) rd.err(r.line, 'DAY', `ziua ${s.day} nu este între 1 (luni) și 5 (vineri)`);
      if (rd.issues.length === before) timetable.push(s);
    }
    issues.push(...rd.issues);
  }

  return { dataset: { manifest, rooms, units, teachers, courses, assignments, timetable }, issues };
}

// ── Scrierea ─────────────────────────────────────────────────────────────

export function serializeDataset(d: Dataset): Record<TableName | 'manifest', string> {
  return {
    manifest: JSON.stringify(d.manifest, null, 2) + '\n',
    rooms: toCsv(COLUMNS.rooms, d.rooms.map((r) => [r.id, r.name, r.type, r.capacity, r.computers, r.projector, r.board])),
    units: toCsv(COLUMNS.units, d.units.map((u) => [u.id, u.kind, u.parent, u.size, u.name])),
    teachers: toCsv(COLUMNS.teachers, d.teachers.map((t) => [t.id, t.name])),
    courses: toCsv(COLUMNS.courses, d.courses.map((c) => [c.id, c.name])),
    assignments: toCsv(
      COLUMNS.assignments,
      d.assignments.map((a) => [a.id, a.course, a.teacher, a.activity, a.units.join(';'), a.roomTypes.join(';'), a.minComputers ?? undefined, a.projector, a.length, a.perWeek]),
    ),
    timetable: toCsv(COLUMNS.timetable, d.timetable.map((s) => [s.id, s.assignment, s.day, s.start, s.length, s.room, s.status])),
  };
}

// ── Construirea săptămânii pentru motor ──────────────────────────────────

export function needsOf(a: CanonAssignment, students: number): Needs {
  const needs: Needs = { roomTypes: [...a.roomTypes] };
  if (a.minComputers === 'students') needs.minComputers = students;
  else if (a.minComputers !== null && a.minComputers > 0) needs.minComputers = a.minComputers;
  if (a.projector) needs.projector = true;
  return needs;
}

export interface Week {
  instance: Instance;
  /** Orarul ca rezervări existente. Rândurile cu referințe greșite nu intră. */
  state: State;
  /** Pentru fiecare rezervare: rândul din timetable.csv de unde provine. */
  lineOf: Map<string, number>;
  issues: Issue[];
}

const KIND_RANK: Record<UnitKind, number> = { flux: 0, group: 1, subgroup: 2 };

/**
 * Verifică referințele și coerența datelor, apoi construiește instanța motorului și starea inițială
 * (orarul ca rezervări existente). Conflictele din orar (H1–H7) se raportează cu linia din `timetable.csv`;
 * rezervările în conflict rămân în stare, ca raportul să arate orarul așa cum este.
 */
export function buildWeek(d: Dataset, parseIssues: Issue[] = []): Week {
  const issues: Issue[] = [...parseIssues];
  const add = (severity: Issue['severity'], file: string, code: string, message: string, line?: number) => issues.push({ severity, file, line, code, message });

  const units: Unit[] = d.units.map((u) => ({ id: u.id, parent: u.parent, size: u.size }));
  for (const m of validateUnits(units)) add('error', FILES.units, 'UNITS', m);
  const unitById = new Map(d.units.map((u) => [u.id, u] as const));
  for (const u of d.units) {
    const p = u.parent ? unitById.get(u.parent) : undefined;
    if (u.kind === 'flux' && u.parent) add('warning', FILES.units, 'KIND', `${u.id}: fluxul are părinte (${u.parent})`);
    if (p && KIND_RANK[p.kind] >= KIND_RANK[u.kind]) add('warning', FILES.units, 'KIND', `${u.id} (${u.kind}) are ca părinte ${p.id} (${p.kind})`);
  }
  const index = buildUnitIndex(units);

  for (const r of d.rooms) {
    if (r.type === 'lab' && r.computers === 0) add('warning', FILES.rooms, 'LAB', `${r.id}: laborator fără calculatoare`);
    if (r.computers > r.capacity) add('warning', FILES.rooms, 'COMPUTERS', `${r.id}: mai multe calculatoare (${r.computers}) decât locuri (${r.capacity})`);
  }

  const teacherIds = new Set(d.teachers.map((t) => t.id));
  const courseIds = new Set(d.courses.map((c) => c.id));
  const roomIds = new Set(d.rooms.map((r) => r.id));
  const assignmentById = new Map<string, CanonAssignment>();
  for (const a of d.assignments) {
    let ok = true;
    const ref = (m: string) => {
      add('error', FILES.assignments, 'REF', `${a.id}: ${m}`, a.line);
      ok = false;
    };
    if (!courseIds.has(a.course)) ref(`disciplina „${a.course}” nu există în ${FILES.courses}`);
    if (!teacherIds.has(a.teacher)) ref(`profesorul „${a.teacher}” nu există în ${FILES.teachers}`);
    for (const u of a.units) if (!unitById.has(u)) ref(`unitatea „${u}” nu există în ${FILES.units}`);
    if (ok) assignmentById.set(a.id, a);
  }

  const week = d.manifest.week;
  const bookings: Booking[] = [];
  const lineOf = new Map<string, number>();
  const perAssignment = new Map<string, number>();
  d.timetable.forEach((s, k) => {
    const line = s.line ?? k + 2;
    const a = assignmentById.get(s.assignment);
    if (!a) return add('error', FILES.timetable, 'REF', `${s.id}: repartizarea „${s.assignment}” nu există sau are erori`, line);
    if (!roomIds.has(s.room)) return add('error', FILES.timetable, 'REF', `${s.id}: sala „${s.room}” nu există în ${FILES.rooms}`, line);
    const date = week[s.day - 1];
    if (!date) return add('error', FILES.timetable, 'DAY', `${s.id}: ziua ${s.day} nu are dată în ${MANIFEST_FILE}`, line);
    if (s.length !== a.length) add('warning', FILES.timetable, 'LENGTH', `${s.id}: durata ${s.length} diferă de cea din repartizare (${a.length})`, line);
    perAssignment.set(a.id, (perAssignment.get(a.id) ?? 0) + 1);
    const students = sizeOf(index, a.units);
    bookings.push({
      id: s.id,
      teacher: a.teacher,
      units: [...a.units],
      activity: a.activity,
      needs: needsOf(a, students),
      date,
      start: s.start,
      length: s.length,
      students,
      roomId: s.room,
      status: s.status,
    });
    lineOf.set(s.id, line);
  });
  const engineRooms = d.rooms.map((r) => ({ id: r.id, type: r.type, capacity: r.capacity, computers: r.computers, projector: r.projector, board: r.board }));
  for (const a of assignmentById.values()) {
    const students = sizeOf(index, a.units);
    if (!engineRooms.some((r) => roomMismatch(r, needsOf(a, students), students) === null))
      add('warning', FILES.assignments, 'NO_ROOM', `${a.id}: nicio sală nu satisface cerințele (${a.roomTypes.join('/')}, ${students} studenți)`, a.line);
    const n = perAssignment.get(a.id) ?? 0;
    if (n !== a.perWeek) add('warning', FILES.assignments, 'PER_WEEK', `${a.id}: ${n} ședințe în orar, repartizarea cere ${a.perWeek}`, a.line);
  }

  const instance: Instance = {
    grid: DEFAULT_GRID,
    rooms: engineRooms,
    units,
    dates: [...week],
  };
  const state: State = { bookings, closures: [] };
  // Verificatorul independent (H1–H7). Erorile de unități sunt deja raportate mai sus.
  if (!issues.some((i) => i.severity === 'error' && i.code === 'UNITS')) {
    for (const v of checkState(instance, state)) {
      const lines = v.bookings.map((b) => lineOf.get(b)).filter((x): x is number => x !== undefined);
      add('error', FILES.timetable, `CONFLICT_${v.code}`, v.message + (lines.length > 1 ? ` (liniile ${lines.join(', ')})` : ''), lines[0]);
    }
  }
  return { instance, state, lineOf, issues };
}
