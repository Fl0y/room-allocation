// Măsurătorile de bază ale unei săptămâni (plan.md Lotul 3a.3): utilizarea sălilor, sălile rare folosite
// inutil, ferestrele studenților (D29) și golurile izolate din programul sălilor.
// Doar măsurare: motorul nu folosește încă ferestrele (asta vine în Lotul 4).

import { buildOccupancy, isolatedGaps } from '../engine/occupancy.ts';
import { buildAtomDays, windowsOf, type AtomDays } from '../engine/windows.ts';
import { rarityOf } from '../engine/score.ts';
import type { Booking, Instance, RoomType } from '../engine/types.ts';
import { buildUnitIndex } from '../engine/units.ts';

export { windowsOf } from '../engine/windows.ts';

/** Perechile ocupate pe (unitate atomică, dată). Cheia: `unitate|dată`. */
export function atomBusy(instance: Instance, bookings: readonly Booking[]): AtomDays {
  return buildAtomDays(buildUnitIndex(instance.units), bookings);
}

export interface WindowStats {
  /** Totalul ferestrelor (perechi), pe toate unitățile atomice și zilele. */
  total: number;
  /** Zile-unitate cu cel puțin o activitate. */
  activeDays: number;
  /** Zile-unitate cu cel puțin o fereastră. */
  daysWithWindows: number;
  /** Ferestre pe unitate atomică, pe săptămână. */
  perAtom: number[];
}

export function studentWindows(instance: Instance, bookings: readonly Booking[]): WindowStats {
  const index = buildUnitIndex(instance.units);
  const atoms = instance.units.map((u) => u.id).filter((id) => !index.children.has(id));
  const busy = atomBusy(instance, bookings);
  const perAtomMap = new Map<string, number>(atoms.map((a) => [a, 0]));
  let total = 0;
  let activeDays = 0;
  let daysWithWindows = 0;
  for (const [k, s] of busy) {
    const w = windowsOf(s);
    const atom = k.slice(0, k.lastIndexOf('|'));
    activeDays++;
    if (w > 0) daysWithWindows++;
    total += w;
    perAtomMap.set(atom, (perAtomMap.get(atom) ?? 0) + w);
  }
  return { total, activeDays, daysWithWindows, perAtom: [...perAtomMap.values()] };
}

export interface WeekMeasures {
  rooms: number;
  roomPeriods: number;
  occupiedPeriods: number;
  /** Ocuparea (perechi ocupate / disponibile), pe tip de sală. */
  byType: Record<RoomType, { rooms: number; available: number; occupied: number }>;
  /** Ocuparea pe perechi (1..P), în toate sălile și zilele. */
  byPeriod: number[];
  /** Ocuparea pe zile. */
  byDay: number[];
  /** Ocuparea fiecărei săli (perechi ocupate pe săptămână). */
  perRoom: { id: string; type: RoomType; occupied: number }[];
  /** Locuri ocupate / locuri disponibile în perechile ocupate. */
  seatFill: number;
  rareMisusePeriods: number;
  roomIsolatedGaps: number;
  windows: WindowStats;
}

export function measureWeek(instance: Instance, bookings: readonly Booking[]): WeekMeasures {
  const P = instance.grid.periods.length;
  const D = instance.dates.length;
  const rooms = new Map(instance.rooms.map((r) => [r.id, r] as const));
  const byType = {
    auditorium: { rooms: 0, available: 0, occupied: 0 },
    seminar: { rooms: 0, available: 0, occupied: 0 },
    lab: { rooms: 0, available: 0, occupied: 0 },
  } satisfies WeekMeasures['byType'];
  for (const r of instance.rooms) {
    byType[r.type].rooms++;
    byType[r.type].available += P * D;
  }
  const byPeriod = new Array<number>(P).fill(0);
  const byDay = new Array<number>(D).fill(0);
  const perRoomMap = new Map<string, number>(instance.rooms.map((r) => [r.id, 0]));
  let occupied = 0;
  let seats = 0;
  let seatsUsed = 0;
  let rare = 0;
  for (const b of bookings) {
    const room = rooms.get(b.roomId);
    if (!room) continue;
    occupied += b.length;
    byType[room.type].occupied += b.length;
    perRoomMap.set(room.id, (perRoomMap.get(room.id) ?? 0) + b.length);
    const di = instance.dates.indexOf(b.date);
    if (di >= 0) byDay[di]! += b.length;
    for (let p = b.start; p < b.start + b.length; p++) byPeriod[p - 1]! += 1;
    seats += room.capacity * b.length;
    seatsUsed += Math.min(b.students, room.capacity) * b.length;
    if (rarityOf(room, b.needs).value > 0) rare += b.length;
  }
  const occ = buildOccupancy(bookings, P);
  let gaps = 0;
  for (const r of instance.rooms) for (const d of instance.dates) gaps += isolatedGaps(occ, r.id, d, P);
  return {
    rooms: instance.rooms.length,
    roomPeriods: instance.rooms.length * P * D,
    occupiedPeriods: occupied,
    byType,
    byPeriod,
    byDay,
    perRoom: instance.rooms.map((r) => ({ id: r.id, type: r.type, occupied: perRoomMap.get(r.id) ?? 0 })),
    seatFill: seats ? seatsUsed / seats : 0,
    rareMisusePeriods: rare,
    roomIsolatedGaps: gaps,
    windows: studentWindows(instance, bookings),
  };
}
