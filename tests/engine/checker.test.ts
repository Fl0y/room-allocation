import { describe, expect, it } from 'vitest';
import { checkState, checkTransition } from '../../src/engine/checker.ts';
import { DEFAULT_GRID } from '../../src/engine/grid.ts';
import type { Booking, Instance, State } from '../../src/engine/types.ts';
import { auditorium, booking, lab, seminarRoom } from '../../src/scenarios/build.ts';

const D = '2026-11-18';
const instance: Instance = {
  grid: DEFAULT_GRID,
  rooms: [lab('L-201', 24), lab('L-105', 16), seminarRoom('S-12', 30), { ...auditorium('A-1', 120), projector: false }],
  units: [
    { id: 'TI-23' },
    { id: 'TI-231', parent: 'TI-23' },
    { id: 'TI-231/1', parent: 'TI-231', size: 13 },
    { id: 'TI-231/2', parent: 'TI-231', size: 13 },
    { id: 'TI-232', parent: 'TI-23', size: 24 },
    { id: 'MK-231', size: 20 },
  ],
  dates: [D],
};

const lab1 = booking({ id: 'lab1', teacher: 'P', units: ['TI-231/1'], activity: 'lab', date: D, start: 2, students: 13, roomId: 'L-201' });
const lab2 = booking({ id: 'lab2', teacher: 'Q', units: ['TI-231/2'], activity: 'lab', date: D, start: 2, students: 13, roomId: 'L-105' });
const s = (...bookings: Booking[]): State => ({ bookings, closures: [] });
const codes = (st: State) => checkState(instance, st).map((v) => v.code);

describe('verificatorul H1–H7', () => {
  it('o stare validă nu are încălcări; subgrupele disjuncte pot fi în paralel (H3)', () => {
    expect(codes(s(lab1, lab2))).toEqual([]);
  });

  it('H1: aceeași sală, perechi suprapuse', () => {
    const other = booking({ id: 'x', teacher: 'R', units: ['MK-231'], activity: 'seminar', date: D, start: 2, length: 2, students: 20, roomId: 'L-201' });
    expect(codes(s(lab1, other))).toContain('H1');
  });

  it('nu raportează H1 pentru perechi consecutive sau zile diferite', () => {
    const next = booking({ id: 'x', teacher: 'R', units: ['MK-231'], activity: 'seminar', date: D, start: 3, students: 20, roomId: 'L-201' });
    const otherDay = { ...next, id: 'y', date: '2026-11-19', start: 2 };
    expect(codes(s(lab1, next, otherDay))).toEqual([]);
  });

  it('H2: același profesor în două săli', () => {
    const other = booking({ id: 'x', teacher: 'P', units: ['MK-231'], activity: 'seminar', date: D, start: 2, students: 20, roomId: 'S-12' });
    expect(codes(s(lab1, other))).toContain('H2');
  });

  it('H3: grupa întreagă în paralel cu propria subgrupă', () => {
    const whole = booking({ id: 'x', teacher: 'R', units: ['TI-231'], activity: 'seminar', date: D, start: 2, students: 26, roomId: 'S-12' });
    expect(codes(s(lab1, whole))).toContain('H3');
  });

  it('H3: un curs pe flux blochează toate unitățile fluxului', () => {
    const flux = booking({ id: 'x', teacher: 'R', units: ['TI-23'], activity: 'lecture', date: D, start: 2, students: 50, roomId: 'A-1', needs: { roomTypes: ['auditorium'] } });
    expect(codes(s(lab2, flux))).toContain('H3');
  });

  it('H4: capacitate insuficientă', () => {
    const big = booking({ id: 'x', teacher: 'R', units: ['TI-232'], activity: 'seminar', date: D, start: 4, students: 24, roomId: 'L-105' });
    expect(codes(s(big))).toContain('H4');
  });

  it('H5: tip de sală neacceptat, calculatoare insuficiente, echipament lipsă', () => {
    const wrongType = booking({ id: 'a', teacher: 'R', units: ['MK-231'], activity: 'lab', date: D, start: 1, students: 20, roomId: 'S-12' });
    const fewComputers = booking({
      id: 'b', teacher: 'S', units: ['MK-231'], activity: 'seminar', date: D, start: 3, students: 14, roomId: 'L-105',
      needs: { roomTypes: ['lab'], minComputers: 20 },
    });
    const noProjector = booking({
      id: 'c', teacher: 'T', units: ['MK-231'], activity: 'seminar', date: D, start: 5, students: 20, roomId: 'A-1',
      needs: { roomTypes: ['auditorium'], projector: true },
    });
    const v = checkState(instance, s(wrongType, fewComputers, noProjector));
    expect(v.filter((x) => x.code === 'H5').map((x) => x.bookings[0]).sort()).toEqual(['a', 'b', 'c']);
  });

  it('H6: rezervare într-o sală închisă', () => {
    const st: State = { bookings: [lab1], closures: [{ roomId: 'L-201', from: '2026-11-16', to: '2026-11-20', reason: 'repair' }] };
    expect(codes(st)).toContain('H6');
  });

  it('H7: blocul rupt fără acord; permis cu acordul profesorului (D20)', () => {
    const part1: Booking = { ...booking({ id: 'p1', teacher: 'R', units: ['MK-231'], activity: 'seminar', date: D, start: 4, students: 20, roomId: 'S-12' }), blockId: 'blk' };
    const part2: Booking = { ...part1, id: 'p2', start: 5, roomId: 'A-1' };
    expect(codes(s(part1, part2))).toContain('H7');
    expect(codes(s({ ...part1, splitApproved: true }, { ...part2, splitApproved: true }))).not.toContain('H7');
  });

  it('INVALID: studenți declarați peste mărimea unităților; fixare pentru o activitate obișnuită (D19)', () => {
    expect(codes(s({ ...lab1, students: 30 }))).toContain('INVALID');
    expect(codes(s({ ...lab1, status: 'fixed' }))).toContain('INVALID');
  });
});

describe('verificarea tranzițiilor (H8)', () => {
  it('mutarea unei rezervări mutabile este permisă și numărată', () => {
    const before = s(lab2);
    const after = s({ ...lab2, roomId: 'L-201' });
    expect(checkTransition(before, after)).toEqual({ violations: [], moved: ['lab2'] });
  });

  it('H8: o rezervare fixată sau înghețată nu se mută', () => {
    const frozen = { ...lab2, status: 'frozen' as const };
    expect(checkTransition(s(frozen), s({ ...frozen, roomId: 'L-201' })).violations.map((v) => v.code)).toEqual(['H8']);
  });

  it('D19: fixarea se anulează dacă sala inițială se închide', () => {
    const exam = booking({ id: 'e', teacher: 'R', units: ['MK-231'], activity: 'exam', date: D, start: 4, students: 14, roomId: 'L-105', status: 'fixed' });
    const after: State = {
      bookings: [{ ...exam, roomId: 'L-201' }],
      closures: [{ roomId: 'L-105', from: D, to: D, reason: 'repair' }],
    };
    expect(checkTransition(s(exam), after).violations).toEqual([]);
  });

  it('schimbarea orei sau dispariția unei rezervări este semnalată', () => {
    expect(checkTransition(s(lab2), s({ ...lab2, start: 3 })).violations.map((v) => v.code)).toEqual(['INVALID']);
    expect(checkTransition(s(lab2), s()).violations.map((v) => v.code)).toEqual(['INVALID']);
    expect(checkTransition(s(lab2), s(), ['lab2']).violations).toEqual([]);
  });
});
