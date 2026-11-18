import type { Booking } from './types.ts';

/** Ocuparea pe celule (sală, dată, pereche). Cheia: `sala|data`; indexul 1..P (0 nefolosit). */
export type Occupancy = Map<string, (string | null)[]>;

const key = (roomId: string, date: string) => `${roomId}|${date}`;

export function buildOccupancy(bookings: readonly Booking[], periods: number): Occupancy {
  const occ: Occupancy = new Map();
  for (const b of bookings) setCells(occ, b.roomId, b.date, b.start, b.length, b.id, periods);
  return occ;
}

export function setCells(
  occ: Occupancy,
  roomId: string,
  date: string,
  start: number,
  length: number,
  value: string | null,
  periods: number,
): void {
  const k = key(roomId, date);
  let row = occ.get(k);
  if (!row) {
    row = new Array<string | null>(periods + 1).fill(null);
    occ.set(k, row);
  }
  for (let p = start; p < start + length; p++) row[p] = value;
}

export function occupantsAt(occ: Occupancy, roomId: string, date: string, start: number, length: number): string[] {
  const row = occ.get(key(roomId, date));
  if (!row) return [];
  const out = new Set<string>();
  for (let p = start; p < start + length; p++) {
    const v = row[p];
    if (v) out.add(v);
  }
  return [...out].sort();
}

/**
 * Numărul de goluri izolate în programul sălii (o singură pereche liberă între ocupări sau la marginea zilei).
 * Nu se confundă cu ferestrele studenților (windows.ts, D29).
 * Celulele din `asFree` sunt tratate ca libere (pentru starea „înainte”).
 */
export function isolatedGaps(
  occ: Occupancy,
  roomId: string,
  date: string,
  periods: number,
  asFree?: { start: number; length: number },
): number {
  const row = occ.get(key(roomId, date));
  const busy = (p: number): boolean => {
    if (asFree && p >= asFree.start && p < asFree.start + asFree.length) return false;
    return !!row?.[p];
  };
  let count = 0;
  let run = 0;
  for (let p = 1; p <= periods + 1; p++) {
    if (p <= periods && !busy(p)) {
      run++;
    } else {
      if (run === 1) count++;
      run = 0;
    }
  }
  return count;
}
