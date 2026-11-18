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

// ── Cererile cu interval (Lotul 4) ───────────────────────────────────────

/** Ferestrele unei zile, calculate direct (independent de src/engine/windows.ts). */
function dayWindows(periods: number[]): number {
  if (periods.length < 2) return 0;
  const s = [...new Set(periods)].sort((a, b) => a - b);
  let w = 0;
  for (let i = 1; i < s.length; i++) w += s[i]! - s[i - 1]! - 1;
  return w;
}

/** Totalul ferestrelor studenților într-o stare, pe unități atomice și zile. */
export function totalWindows(instance: Instance, bookings: readonly Booking[]): number {
  const index = buildUnitIndex(instance.units);
  const days = new Map<string, number[]>();
  for (const b of bookings) {
    for (const a of new Set(b.units.flatMap((u) => index.atoms.get(u) ?? []))) {
      const k = `${a}|${b.date}`;
      const list = days.get(k) ?? [];
      for (let p = b.start; p < b.start + b.length; p++) list.push(p);
      days.set(k, list);
    }
  }
  let total = 0;
  for (const ps of days.values()) total += dayWindows(ps);
  return total;
}

/** Golurile izolate de o pereche din programul unei săli într-o zi (calcul direct). */
function roomGaps(bookings: readonly Booking[], roomId: string, date: string, periods: number): number {
  const busy = new Set<number>();
  for (const b of bookings) if (b.roomId === roomId && b.date === date) for (let p = b.start; p < b.start + b.length; p++) busy.add(p);
  let count = 0;
  let run = 0;
  for (let p = 1; p <= periods + 1; p++) {
    if (p <= periods && !busy.has(p)) run++;
    else {
      if (run === 1) count++;
      run = 0;
    }
  }
  return count;
}

function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! < b[i]!;
  return false;
}

export interface OracleBest {
  moves: number;
  /**
   * [raritate, ferestre (sau 0 fără criteriu), excedent, fragmentare, perechea], minimul lexicografic la numărul
   * minim de mutări. Perechea (departajarea: mai devreme) se compară doar fără mutări; cu mutări, motorul
   * departajează întâi după sălile noi ale rezervărilor mutate.
   */
  key: number[];
}

/**
 * Pentru o cerere cu interval: cel mai mic număr de mutări cu care cererea încape la ORICE început din interval,
 * apoi, între toate stările finale valide cu acel număr de mutări, minimul cheii D31
 * (raritate → ferestrele studenților → excedent → fragmentare). Strategia `score`.
 */
export function oracleBestInterval(instance: Instance, state: State, request: Request, maxMoves: number, useWindows = true): OracleBest | null {
  const index = buildUnitIndex(instance.units);
  const students = request.declaredStudents ?? sizeOf(index, request.units);
  const P = instance.grid.periods.length;
  const roomIds = instance.rooms.map((r) => r.id);
  const rooms = new Map(instance.rooms.map((r) => [r.id, r] as const));
  const movable = state.bookings.filter((b) => b.status === 'movable');
  const latest = request.latest ?? request.start + request.length - 1;
  const baseWindows = totalWindows(instance, state.bookings);
  for (let k = 0; k <= maxMoves; k++) {
    let best: number[] | null = null;
    for (const subset of subsets(movable, k)) {
      for (const targets of assignments(subset, roomIds)) {
        const target = new Map(subset.map((b, i) => [b.id, targets[i]!] as const));
        const moved = state.bookings.map((b) => (target.has(b.id) ? { ...b, roomId: target.get(b.id)! } : b));
        for (let start = request.start; start + request.length - 1 <= latest; start++) {
          for (const roomId of roomIds) {
            const booking: Booking = {
              id: request.id,
              teacher: request.teacher,
              units: request.units,
              activity: request.activity,
              needs: request.needs,
              date: request.date,
              start,
              length: request.length,
              students,
              roomId,
              status: request.status ?? 'movable',
            };
            const final = [...moved, booking];
            if (checkState(instance, { closures: state.closures, bookings: final }).length) continue;
            const room = rooms.get(roomId)!;
            // raritatea, definită direct (concept §5.2, D25)
            let rarity = 0;
            if (room.type === 'lab' && !((request.needs.minComputers ?? 0) > 0)) rarity++;
            if (room.type === 'auditorium' && request.needs.roomTypes.some((t) => t !== 'auditorium')) rarity++;
            const windows = useWindows ? totalWindows(instance, final) - baseWindows : 0;
            const frag = roomGaps(final, roomId, request.date, P) - roomGaps(moved, roomId, request.date, P);
            const key = [rarity, windows, room.capacity - students, frag, start];
            if (!best || lexLess(key, best)) best = key;
          }
        }
      }
    }
    if (best) return { moves: k, key: best };
  }
  return null;
}
