import { describe, expect, it } from 'vitest';
import { DEFAULT_GRID } from '../../src/engine/grid.ts';
import type { Booking, Instance } from '../../src/engine/types.ts';
import { measureWeek, studentWindows, windowsOf } from '../../src/sim/metrics.ts';

describe('ferestrele studenților (D29)', () => {
  it('perechile libere dintre prima și ultima activitate, fără excepția pauzei de masă', () => {
    expect(windowsOf(new Set())).toBe(0);
    expect(windowsOf(new Set([3]))).toBe(0);
    expect(windowsOf(new Set([1, 2]))).toBe(0);
    expect(windowsOf(new Set([1, 3]))).toBe(1);
    expect(windowsOf(new Set([1, 4, 7]))).toBe(4);
  });

  const instance: Instance = {
    grid: DEFAULT_GRID,
    rooms: [
      { id: 'S1', type: 'seminar', capacity: 30, computers: 0, projector: false, board: true },
      { id: 'L1', type: 'lab', capacity: 20, computers: 20, projector: true, board: true },
    ],
    units: [{ id: 'F' }, { id: 'G', parent: 'F' }, { id: 'G/1', parent: 'G', size: 10 }, { id: 'G/2', parent: 'G', size: 10 }],
    dates: ['2026-11-16'],
  };
  const b = (id: string, units: string[], start: number, roomId: string, lab = false): Booking => ({
    id,
    teacher: id,
    units,
    activity: lab ? 'lab' : 'seminar',
    needs: lab ? { roomTypes: ['lab'], minComputers: 10 } : { roomTypes: ['seminar', 'lab'] },
    date: '2026-11-16',
    start,
    length: 1,
    students: 20,
    roomId,
    status: 'movable',
  });

  it('se socotesc pe subgrupe: activitatea grupei contează pentru ambele subgrupe', () => {
    // grupa la perechea 1; G/1 laborator la 3 (fereastră 1); G/2 laborator la 2 (fără fereastră)
    const s = studentWindows(instance, [b('a', ['G'], 1, 'S1'), b('c', ['G/1'], 3, 'L1', true), b('d', ['G/2'], 2, 'L1', true)]);
    expect(s.total).toBe(1);
    expect(s.activeDays).toBe(2);
    expect(s.daysWithWindows).toBe(1);
  });

  it('ocuparea și sălile rare folosite inutil', () => {
    const m = measureWeek(instance, [b('a', ['G'], 1, 'L1'), b('c', ['G/1'], 3, 'L1', true)]);
    expect(m.roomPeriods).toBe(2 * 7);
    expect(m.occupiedPeriods).toBe(2);
    expect(m.byType.lab.occupied).toBe(2);
    expect(m.byPeriod).toEqual([1, 0, 1, 0, 0, 0, 0]);
    // seminarul în laborator, deși exista o sală de seminar: raritate > 0
    expect(m.rareMisusePeriods).toBe(1);
  });
});
