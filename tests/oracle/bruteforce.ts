// Oracolul exhaustiv: independent de căutarea din allocate.ts.
// Încearcă TOATE stările finale în care cel mult M rezervări mutabile își schimbă sala (la aceeași oră)
// și cererea primește orice sală, apoi le verifică doar cu checkState. Potrivit doar pentru instanțe mici.

import { checkState } from '../../src/engine/checker.ts';
import type { Booking, Instance, Request, State } from '../../src/engine/types.ts';
import { buildUnitIndex, sizeOf } from '../../src/engine/units.ts';

function* subsets<T>(items: T[], k: number, from = 0): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = from; i <= items.length - k; i++) {
    for (const rest of subsets(items, k - 1, i + 1)) yield [items[i]!, ...rest];
  }
}

function* assignments(bookings: Booking[], roomIds: string[], i = 0): Generator<string[]> {
  if (i === bookings.length) {
    yield [];
    return;
  }
  for (const r of roomIds) {
    if (r === bookings[i]!.roomId) continue;
    for (const rest of assignments(bookings, roomIds, i + 1)) yield [r, ...rest];
  }
}

/** Numărul minim de mutări cu care cererea poate fi plasată exact cum a fost cerută, sau null. */
export function oracleMinMoves(instance: Instance, state: State, request: Request, maxMoves: number): number | null {
  const index = buildUnitIndex(instance.units);
  const students = request.declaredStudents ?? sizeOf(index, request.units);
  const roomIds = instance.rooms.map((r) => r.id);
  const movable = state.bookings.filter((b) => b.status === 'movable');
  for (let k = 0; k <= maxMoves; k++) {
    for (const subset of subsets(movable, k)) {
      for (const targets of assignments(subset, roomIds)) {
        const target = new Map(subset.map((b, i) => [b.id, targets[i]!] as const));
        const moved = state.bookings.map((b) => (target.has(b.id) ? { ...b, roomId: target.get(b.id)! } : b));
        for (const roomId of roomIds) {
          const candidate: State = {
            closures: state.closures,
            bookings: [
              ...moved,
              {
                id: request.id,
                teacher: request.teacher,
                units: request.units,
                activity: request.activity,
                needs: request.needs,
                date: request.date,
                start: request.start,
                length: request.length,
                students,
                roomId,
                status: request.status ?? 'movable',
              },
            ],
          };
          if (checkState(instance, candidate).length === 0) return k;
        }
      }
    }
  }
  return null;
}
