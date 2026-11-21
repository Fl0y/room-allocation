// Exportul .ics (Lotul 6c, D39): formatul RFC 5545 — rânduri CRLF de cel mult 75 de octeți, textul protejat,
// fusul orar Europe/Chisinau, orele din grila perechilor.

import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, fold, icsFilename } from '../../src/api/ics.ts';
import { DEFAULT_GRID } from '../../src/engine/grid.ts';
import type { Booking } from '../../src/engine/types.ts';

const b = (over: Partial<Booking> = {}): Booking => ({
  id: 'O-0001',
  teacher: 'P-001',
  units: ['A1-1/1'],
  activity: 'lab',
  needs: { roomTypes: ['lab'], minComputers: 14 },
  date: '2026-11-17',
  start: 2,
  length: 2,
  students: 14,
  roomId: 'LAB-01',
  status: 'movable',
  ...over,
});
const NOW = new Date('2026-11-21T14:00:00Z');

describe('exportul .ics', () => {
  const text = buildIcs([b(), b({ id: 'O-0002', activity: 'exam', status: 'fixed', start: 7, length: 1, date: '2026-11-16' })], {
    name: 'Orar — A1-1/1',
    grid: DEFAULT_GRID,
    now: NOW,
    rooms: new Map([['LAB-01', 'Laborator 301']]),
  });
  const lines = text.split('\r\n');

  it('structura: VCALENDAR, fusul orar, câte un VEVENT pe rezervare, ordonate după dată', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(text.endsWith('\r\n')).toBe(true);
    expect(text).not.toMatch(/[^\r]\n/);
    expect(text).toContain('BEGIN:VTIMEZONE\r\nTZID:Europe/Chisinau');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(text.indexOf('UID:O-0002@room-allocation')).toBeLessThan(text.indexOf('UID:O-0001@room-allocation'));
  });

  it('orele din grilă, în ora locală a Chișinăului', () => {
    expect(text).toContain('DTSTART;TZID=Europe/Chisinau:20261117T094000');
    expect(text).toContain('DTEND;TZID=Europe/Chisinau:20261117T125000');
    expect(text).toContain('DTSTART;TZID=Europe/Chisinau:20261116T180000');
    expect(text).toContain('DTEND;TZID=Europe/Chisinau:20261116T193000');
    expect(text).toContain('DTSTAMP:20261121T140000Z');
  });

  it('textul: titlul, sala, descrierea, protejarea caracterelor speciale', () => {
    expect(text).toContain('SUMMARY:Laborator · A1-1/1');
    expect(text).toContain('LOCATION:LAB-01 (Laborator 301)');
    expect(text.replace(/\r\n /g, '')).toContain('Statut: fixă');
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne');
  });

  it('rândurile au cel mult 75 de octeți și nu rup caracterele UTF-8', () => {
    const enc = new TextEncoder();
    for (const l of lines) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    const long = 'DESCRIPTION:' + 'ăîșțâ'.repeat(40);
    const folded = fold(long);
    for (const l of folded.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(long);
  });

  it('numele fișierului fără caractere nesigure', () => {
    expect(icsFilename('A1-1/1')).toBe('orar-A1-1_1.ics');
    expect(icsFilename('Grupa ăîș')).toBe('orar-Grupa_ais.ics');
  });
});
