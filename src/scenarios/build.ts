// Ajutoare pentru construirea datelor sintetice ale scenariilor (D08, D24).

import type { ActivityType, Booking, BookingStatus, Needs, Request, Room, RoomType } from '../engine/types.ts';

export function room(id: string, type: RoomType, capacity: number, computers = 0): Room {
  return { id, type, capacity, computers, projector: true, board: type !== 'lab' };
}

export const lab = (id: string, computers: number) => room(id, 'lab', computers, computers);
export const seminarRoom = (id: string, capacity: number) => room(id, 'seminar', capacity);
export const auditorium = (id: string, capacity: number) => room(id, 'auditorium', capacity);

/** Cerințele implicite pe tip de activitate (o tendință, nu o regulă; D21). */
export function needsFor(activity: ActivityType, students: number): Needs {
  switch (activity) {
    case 'lab':
      return { roomTypes: ['lab'], minComputers: students };
    case 'lecture':
      return { roomTypes: ['auditorium'], projector: true };
    case 'exam':
      return { roomTypes: ['lab'], minComputers: students };
    default:
      return { roomTypes: ['seminar', 'auditorium', 'lab'] };
  }
}

export interface BookingSpec {
  id: string;
  teacher: string;
  units: string[];
  activity: ActivityType;
  date: string;
  start: number;
  length?: number;
  students: number;
  roomId: string;
  status?: BookingStatus;
  needs?: Needs;
}

export function booking(s: BookingSpec): Booking {
  return {
    id: s.id,
    teacher: s.teacher,
    units: s.units,
    activity: s.activity,
    needs: s.needs ?? needsFor(s.activity, s.students),
    date: s.date,
    start: s.start,
    length: s.length ?? 1,
    students: s.students,
    roomId: s.roomId,
    status: s.status ?? 'movable',
  };
}

export interface RequestSpec {
  id: string;
  teacher: string;
  units: string[];
  activity: ActivityType;
  date: string;
  start: number;
  length?: number;
  students: number;
  needs?: Needs;
  declaredStudents?: number;
  status?: BookingStatus;
  /** Cererea cu interval (Lotul 4): ultima pereche acceptabilă. */
  latest?: number;
}

export function request(s: RequestSpec): Request {
  const r: Request = {
    id: s.id,
    teacher: s.teacher,
    units: s.units,
    activity: s.activity,
    needs: s.needs ?? needsFor(s.activity, s.students),
    date: s.date,
    start: s.start,
    length: s.length ?? 1,
  };
  if (s.declaredStudents !== undefined) r.declaredStudents = s.declaredStudents;
  if (s.status !== undefined) r.status = s.status;
  if (s.latest !== undefined) r.latest = s.latest;
  return r;
}
