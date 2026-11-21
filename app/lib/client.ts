// Apelurile API din pagini (Lotul 6b) și etichetele în română. Doar în browser.

import type { Alternative } from '../../src/engine/allocate.ts';
import type { ActivityType, Booking, Needs, Request, RoomType } from '../../src/engine/types.ts';
import type { ServiceDecision } from '../../src/db/service.ts';
import type { ClosureReport } from '../../src/db/operations.ts';

export type { Alternative, Booking, Needs, Request, RoomType, ActivityType, ServiceDecision, ClosureReport };

export interface MetaRoom {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  computers: number;
  projector: boolean;
  board: boolean;
}
export interface MetaUnit {
  id: string;
  kind: 'flux' | 'group' | 'subgroup';
  parent: string | null;
  name: string;
  students: number;
}
export interface Meta {
  grid: { periods: { index: number; start: string; end: string }[] };
  rooms: MetaRoom[];
  units: MetaUnit[];
  teachers: { id: string; name: string }[];
  days: string[];
}
export interface MoveRecord {
  from: string;
  to: string;
  cause: 'cerere' | 'închidere';
  at: string;
}
export type ListedBooking = Booking & { roomName: string; teacherName: string; time: string; history: MoveRecord[] };
export interface ClosureRow {
  id: number;
  roomId: string;
  from: string;
  to: string;
  reason: 'repair' | 'other';
  report: ClosureReport | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json' }, cache: 'no-store' });
  const body = (await res.json().catch(() => ({}))) as { error?: { message: string; issues?: { path: string; message: string }[] } };
  if (!res.ok) {
    const e = body.error;
    const detail = e?.issues?.length ? ': ' + e.issues.map((i) => `${i.path || '—'} — ${i.message}`).join('; ') : '';
    throw new ApiError(res.status, (e?.message ?? `eroare ${res.status}`) + detail);
  }
  return body as T;
}

export const api = {
  meta: () => call<Meta>('/api/meta'),
  bookings: (q: Record<string, string>) => call<{ bookings: ListedBooking[] }>(`/api/bookings?${new URLSearchParams(q)}`),
  submit: (request: Request) => call<{ decision: ServiceDecision; replayed: boolean }>('/api/requests', { method: 'POST', body: JSON.stringify({ request }) }),
  applyAlternative: (request: Request, alternative: Alternative) =>
    call<{ decision: ServiceDecision; replayed: boolean }>('/api/alternatives', { method: 'POST', body: JSON.stringify({ request, alternative }) }),
  cancel: (id: string, by: { teacher?: string; admin?: boolean }) => call<{ cancelled: boolean }>(`/api/bookings/${encodeURIComponent(id)}`, { method: 'DELETE', body: JSON.stringify(by) }),
  closures: () => call<{ closures: ClosureRow[] }>('/api/closures'),
  close: (c: { roomId: string; from: string; to: string; reason: 'repair' | 'other' }) => call<{ report: ClosureReport; replayed: boolean }>('/api/closures', { method: 'POST', body: JSON.stringify(c) }),
};

export const ACTIVITY: Record<ActivityType, string> = {
  lecture: 'curs',
  seminar: 'seminar',
  lab: 'laborator',
  exam: 'examen',
  event: 'eveniment',
  other: 'altă activitate',
};
export const ROOM_TYPE: Record<RoomType, string> = { auditorium: 'auditoriu', seminar: 'sală de seminar', lab: 'laborator' };
export const STATUS: Record<Booking['status'], string> = { movable: 'mutabilă', frozen: 'înghețată', fixed: 'fixă' };

const WEEKDAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

/** Luni din săptămâna unei date (ISO). */
export function weekOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function periodLabel(start: number, length: number): string {
  return length === 1 ? `perechea ${start}` : `perechile ${start}–${start + length - 1}`;
}

/** Unitățile, ordonate pe flux: fluxul, apoi grupele lui, apoi subgrupele fiecărei grupe. */
export function unitTree(units: MetaUnit[]): { unit: MetaUnit; depth: number }[] {
  const children = new Map<string | null, MetaUnit[]>();
  for (const u of units) {
    const k = u.parent && units.some((x) => x.id === u.parent) ? u.parent : null;
    children.set(k, [...(children.get(k) ?? []), u]);
  }
  const out: { unit: MetaUnit; depth: number }[] = [];
  const walk = (p: string | null, depth: number) => {
    for (const u of (children.get(p) ?? []).sort((a, b) => a.id.localeCompare(b.id, 'ro', { numeric: true }))) {
      out.push({ unit: u, depth });
      walk(u.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Numărul de studenți al unităților alese, fără dubluri (o unitate al cărei părinte e ales nu se mai adună). */
export function studentsOf(units: MetaUnit[], selected: string[]): number {
  const byId = new Map(units.map((u) => [u.id, u] as const));
  const chosen = new Set(selected);
  let total = 0;
  for (const id of selected) {
    let p = byId.get(id)?.parent ?? null;
    let covered = false;
    while (p) {
      if (chosen.has(p)) covered = true;
      p = byId.get(p)?.parent ?? null;
    }
    if (!covered) total += byId.get(id)?.students ?? 0;
  }
  return total;
}

export function requestFromBooking(b: Booking): Request {
  return {
    id: b.id,
    teacher: b.teacher,
    units: b.units,
    activity: b.activity,
    needs: b.needs,
    date: b.date,
    start: b.start,
    length: b.length,
    declaredStudents: b.students,
    status: b.status,
  };
}
