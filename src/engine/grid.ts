import type { Grid } from './types.ts';

/** Grila confirmată (D15): 7 perechi de 90 de minute, pauze de 10 minute, fără pauză lungă. */
export const DEFAULT_GRID: Grid = {
  periods: [
    { index: 1, start: '08:00', end: '09:30' },
    { index: 2, start: '09:40', end: '11:10' },
    { index: 3, start: '11:20', end: '12:50' },
    { index: 4, start: '13:00', end: '14:30' },
    { index: 5, start: '14:40', end: '16:10' },
    { index: 6, start: '16:20', end: '17:50' },
    { index: 7, start: '18:00', end: '19:30' },
  ],
};

export interface TimeSpan {
  date: string;
  start: number;
  length: number;
}

export function inGrid(grid: Grid, start: number, length: number): boolean {
  return (
    Number.isInteger(start) &&
    Number.isInteger(length) &&
    length >= 1 &&
    start >= 1 &&
    start + length - 1 <= grid.periods.length
  );
}

export function overlaps(a: TimeSpan, b: TimeSpan): boolean {
  return a.date === b.date && a.start < b.start + b.length && b.start < a.start + a.length;
}

export function periodLabel(start: number, length: number): string {
  return length === 1 ? `perechea ${start}` : `perechile ${start}–${start + length - 1}`;
}

export function timeLabel(grid: Grid, start: number, length: number): string {
  const first = grid.periods[start - 1];
  const last = grid.periods[start + length - 2];
  return first && last ? `${first.start}–${last.end}` : '?';
}
