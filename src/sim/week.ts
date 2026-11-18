// „Săptămâna” în simulator (plan.md Lotul 3a.3 și 3b.2): orarul din formatul intern ca rezervări existente,
// plus cereri suplimentare generate cu seed după repartizări (recuperări, consultații, evenimente).
// Aceeași funcție servește datele sintetice (3A) și cele reale (3B).
//
// Alegeri (propuneri, de revăzut cu datele reale):
// - cererile suplimentare nu au conflicte de persoane cu orarul și între ele, ca refuzurile să măsoare
//   doar lipsa sălilor (ca în V0);
// - ziua și perechea cererilor suplimentare se aleg uniform;
// - rezervările din orar sunt mutabile (status din timetable.csv, implicit `movable`); evenimentele sunt fixe (D19).

import { overlaps } from '../engine/grid.ts';
import type { ActivityType, Booking, Needs, Request, State } from '../engine/types.ts';
import { atomsOf, buildUnitIndex, intersects, sizeOf } from '../engine/units.ts';
import { needsOf, type Dataset, type Week } from '../data/format.ts';
import type { Workload } from './generator.ts';
import { mulberry32, pick, randInt, weighted } from './rng.ts';

export type ExtraKind = 'makeup' | 'consultation' | 'event';

export interface ExtraShape {
  mix: readonly (readonly [ExtraKind, number])[];
  eventLength: readonly (readonly [number, number])[];
}

export const DEFAULT_EXTRAS: ExtraShape = {
  mix: [
    ['makeup', 0.6],
    ['consultation', 0.25],
    ['event', 0.15],
  ],
  eventLength: [
    [1, 0.6],
    [2, 0.4],
  ],
};

export interface ExtraRequest extends Request {
  kind: ExtraKind;
}

/**
 * Generează cereri suplimentare până când perechile cerute ating `extraLoad` × perechile-sală libere după orar.
 */
export function generateExtras(dataset: Dataset, week: Week, seed: number, extraLoad: number, shape: ExtraShape = DEFAULT_EXTRAS): { requests: ExtraRequest[]; freePeriods: number; requestedPeriods: number } {
  const rnd = mulberry32(seed);
  const { instance, state } = week;
  const index = buildUnitIndex(instance.units);
  const P = instance.grid.periods.length;
  const occupied = state.bookings.reduce((s, b) => s + b.length, 0);
  const freePeriods = instance.rooms.length * instance.dates.length * P - occupied;
  const target = extraLoad * freePeriods;

  const taken: { teacher: string; atoms: Set<string>; date: string; start: number; length: number }[] = state.bookings.map((b: Booking) => ({
    teacher: b.teacher,
    atoms: atomsOf(index, b.units),
    date: b.date,
    start: b.start,
    length: b.length,
  }));
  const fluxes = dataset.units.filter((u) => u.kind === 'flux').map((u) => u.id);
  const teachers = dataset.teachers.map((t) => t.id);
  const assignments = dataset.assignments.filter((a) => a.perWeek > 0);
  if (!assignments.length) return { requests: [], freePeriods, requestedPeriods: 0 };

  const requests: ExtraRequest[] = [];
  let requested = 0;
  let attempts = 0;
  while (requested < target && attempts < 50_000) {
    attempts++;
    const kind = weighted(rnd, shape.mix);
    let teacher: string;
    let units: string[];
    let activity: ActivityType;
    let needs: Needs;
    let length: number;
    let status: Request['status'];
    if (kind === 'makeup') {
      const a = pick(rnd, assignments);
      teacher = a.teacher;
      units = [...a.units];
      activity = a.activity;
      needs = needsOf(a, sizeOf(index, a.units));
      length = a.length;
    } else if (kind === 'consultation') {
      const a = pick(rnd, assignments);
      teacher = a.teacher;
      units = [...a.units];
      activity = 'other';
      needs = { roomTypes: ['seminar', 'auditorium'] };
      length = 1;
    } else {
      if (!fluxes.length) continue;
      teacher = pick(rnd, teachers);
      units = [pick(rnd, fluxes)];
      activity = 'event';
      needs = { roomTypes: ['auditorium'], projector: true };
      length = weighted(rnd, shape.eventLength);
      status = 'fixed';
    }
    if (requested + length > target + 1) continue;
    const date = pick(rnd, instance.dates);
    const start = randInt(rnd, 1, P - length + 1);
    const span = { date, start, length };
    const atoms = atomsOf(index, units);
    const busy = taken.filter((t) => overlaps(t, span));
    if (busy.some((t) => t.teacher === teacher || intersects(t.atoms, atoms))) continue;
    const id = `x${String(requests.length + 1).padStart(4, '0')}`;
    const req: ExtraRequest = { id, kind, teacher, units, activity, needs, date, start, length };
    if (status) req.status = status;
    requests.push(req);
    taken.push({ teacher, atoms, date, start, length });
    requested += length;
  }
  return { requests, freePeriods, requestedPeriods: requested };
}

/** Pachetul pentru simulator: aceleași cereri, aceeași stare inițială, pentru fiecare strategie. */
export function weekWorkload(dataset: Dataset, week: Week, seed: number, extraLoad: number): Workload {
  const { requests, freePeriods, requestedPeriods } = generateExtras(dataset, week, seed, extraLoad);
  const initialState: State = { bookings: week.state.bookings.map((b) => ({ ...b, units: [...b.units], needs: { ...b.needs, roomTypes: [...b.needs.roomTypes] } })), closures: [] };
  return {
    seed,
    targetLoad: extraLoad,
    instance: week.instance,
    requests,
    initialState,
    capacityPeriods: freePeriods,
    requestedPeriods,
    achievedLoad: freePeriods ? requestedPeriods / freePeriods : 0,
  };
}
