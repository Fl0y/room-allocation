import type { Needs, Room } from './types.ts';

/**
 * Strategiile comparate (P06):
 * - first-fit: prima sală compatibilă în ordinea listei de săli;
 * - best-fit: cele mai puține locuri neocupate;
 * - score: scorul lexicografic (D25, D31): raritate, apoi ferestrele studenților (doar pentru cererile cu
 *   interval; la ora fixă sunt aceleași pentru toate sălile), apoi excedent, apoi fragmentare.
 */
export type Strategy = 'first-fit' | 'best-fit' | 'score';

export interface RoomEvaluation {
  /** Câte resurse rare consumă inutil (0 = niciuna). */
  rarity: number;
  /** Locuri neocupate: capacitate − studenți. */
  excess: number;
  /** Variația numărului de goluri izolate de o pereche în programul sălii, în ziua respectivă. */
  fragmentation: number;
  /** Variația ferestrelor din orarul studenților (D29) la perechea aleasă; nu depinde de sală. */
  windows: number;
  notes: string[];
}

/**
 * Raritatea V0: o sală specială folosită de o activitate care nu are nevoie de ea.
 * - laborator pentru o activitate fără calculatoare;
 * - auditoriu pentru o activitate care acceptă și alte tipuri de sală.
 */
export function rarityOf(room: Room, needs: Needs): { value: number; notes: string[] } {
  const notes: string[] = [];
  let value = 0;
  if (room.type === 'lab' && !((needs.minComputers ?? 0) > 0)) {
    value++;
    notes.push('laborator ocupat de o activitate fără calculatoare');
  }
  if (room.type === 'auditorium' && needs.roomTypes.some((t) => t !== 'auditorium')) {
    value++;
    notes.push('auditoriu ocupat de o activitate care încape și în altă sală');
  }
  return { value, notes };
}

/**
 * Cheia cererii. `useWindows` = criteriul ferestrelor studenților (D31), folosit doar de strategia `score`;
 * first-fit și best-fit rămân strategii de referință, fără criteriul ferestrelor.
 */
export function requestKey(strategy: Strategy, roomOrder: number, e: RoomEvaluation, useWindows = true): number[] {
  switch (strategy) {
    case 'first-fit':
      return [roomOrder];
    case 'best-fit':
      return [e.excess];
    case 'score':
      return [e.rarity, useWindows ? e.windows : 0, e.excess, e.fragmentation];
  }
}

/** Cheia unei rezervări mutate (aplicată la sala ei nouă); se adună pentru toate mutările planului. */
export function movedKey(strategy: Strategy, roomOrder: number, e: RoomEvaluation): number[] {
  switch (strategy) {
    case 'first-fit':
      return [roomOrder];
    case 'best-fit':
      return [e.excess];
    case 'score':
      return [e.rarity, e.excess];
  }
}

export function compareKeys(a: readonly (number | string)[], b: readonly (number | string)[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    return String(x) < String(y) ? -1 : 1;
  }
  return 0;
}
