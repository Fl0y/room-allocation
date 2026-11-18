// Rezumatul datelor pentru raportul de validare (plan.md Lotul 3a.2 / 3b.2): săli, unități, profesori, orar.

import type { RoomType } from '../engine/types.ts';
import { buildUnitIndex, sizeOf } from '../engine/units.ts';
import type { Dataset, Issue, UnitKind } from './format.ts';

export interface Range {
  n: number;
  min: number;
  median: number;
  max: number;
}

export function range(xs: number[]): Range {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return { n: 0, min: NaN, median: NaN, max: NaN };
  const mid = s.length >> 1;
  return { n: s.length, min: s[0]!, median: s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2, max: s[s.length - 1]! };
}

export interface DataSummary {
  rooms: Record<RoomType, { capacity: Range; computers: Range; projectors: number }>;
  units: Record<UnitKind, Range>;
  atoms: Range;
  students: number;
  teachers: { count: number; load: Range };
  courses: number;
  assignments: Record<string, number>;
  sessions: number;
  periodsPerWeek: number;
  issues: { errors: number; warnings: number; byCode: Record<string, number> };
}

export function summarizeData(d: Dataset, issues: Issue[]): DataSummary {
  const index = buildUnitIndex(d.units.map((u) => ({ id: u.id, parent: u.parent, size: u.size })));
  const rooms = {} as DataSummary['rooms'];
  for (const t of ['auditorium', 'seminar', 'lab'] as RoomType[]) {
    const rs = d.rooms.filter((r) => r.type === t);
    rooms[t] = { capacity: range(rs.map((r) => r.capacity)), computers: range(rs.map((r) => r.computers)), projectors: rs.filter((r) => r.projector).length };
  }
  const units = {} as DataSummary['units'];
  for (const k of ['flux', 'group', 'subgroup'] as UnitKind[]) units[k] = range(d.units.filter((u) => u.kind === k).map((u) => sizeOf(index, [u.id])));
  const atomIds = d.units.filter((u) => !index.children.has(u.id)).map((u) => u.id);
  const assignmentById = new Map(d.assignments.map((a) => [a.id, a] as const));
  const load = new Map<string, number>(d.teachers.map((t) => [t.id, 0]));
  for (const s of d.timetable) {
    const a = assignmentById.get(s.assignment);
    if (a) load.set(a.teacher, (load.get(a.teacher) ?? 0) + s.length);
  }
  const byActivity: Record<string, number> = {};
  for (const a of d.assignments) byActivity[a.activity] = (byActivity[a.activity] ?? 0) + 1;
  const byCode: Record<string, number> = {};
  for (const i of issues) byCode[i.code] = (byCode[i.code] ?? 0) + 1;
  return {
    rooms,
    units,
    atoms: range(atomIds.map((id) => sizeOf(index, [id]))),
    students: sizeOf(index, atomIds),
    teachers: { count: d.teachers.length, load: range([...load.values()]) },
    courses: d.courses.length,
    assignments: byActivity,
    sessions: d.timetable.length,
    periodsPerWeek: d.timetable.reduce((s, x) => s + x.length, 0),
    issues: { errors: issues.filter((i) => i.severity === 'error').length, warnings: issues.filter((i) => i.severity === 'warning').length, byCode },
  };
}
