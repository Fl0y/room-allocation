// Ferestrele din orarul studenților (D29): pentru fiecare unitate atomică (D21) și zi, perechile libere
// dintre prima și ultima activitate; fără excepție pentru pauza de masă; ferestrele profesorilor se ignoră.
// Folosite de motor la cererile cu interval (Lotul 4, D31) și de măsurătorile simulatorului.

import type { Booking } from './types.ts';
import type { UnitIndex } from './units.ts';

/** Ferestrele unei zile, dată fiind mulțimea perechilor ocupate. */
export function windowsOf(busy: ReadonlySet<number>): number {
  if (busy.size < 2) return 0;
  let first = Infinity;
  let last = -Infinity;
  for (const p of busy) {
    if (p < first) first = p;
    if (p > last) last = p;
  }
  return last - first + 1 - busy.size;
}

/** Perechile ocupate pe (unitate atomică, dată). Cheia: `unitate|dată`. */
export type AtomDays = Map<string, Set<number>>;

export function buildAtomDays(index: UnitIndex, bookings: readonly Booking[]): AtomDays {
  const out: AtomDays = new Map();
  for (const b of bookings) {
    const atoms = new Set(b.units.flatMap((u) => index.atoms.get(u) ?? []));
    for (const a of atoms) {
      const k = `${a}|${b.date}`;
      let s = out.get(k);
      if (!s) out.set(k, (s = new Set()));
      for (let p = b.start; p < b.start + b.length; p++) s.add(p);
    }
  }
  return out;
}

/** Cu câte ferestre se schimbă orarul unităților atomice date dacă primesc perechile [start, start+length). */
export function windowsDelta(days: AtomDays, atoms: Iterable<string>, date: string, start: number, length: number): number {
  let delta = 0;
  for (const a of atoms) {
    const busy = days.get(`${a}|${date}`);
    const before = busy ? windowsOf(busy) : 0;
    const after = new Set(busy ?? []);
    for (let p = start; p < start + length; p++) after.add(p);
    delta += windowsOf(after) - before;
  }
  return delta;
}
