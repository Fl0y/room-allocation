// Exportul iCalendar (Lotul 6c, D39, P12): rezervările unei grupe, subgrupe sau ale unui profesor, ca fișier .ics
// (RFC 5545) importabil în Google Calendar. Fus orar Europe/Chisinau; fără sincronizare bidirecțională.
// Funcție pură: primește rezervările și grila, întoarce textul fișierului.

import type { Booking, Grid } from '../engine/types.ts';

export const TZID = 'Europe/Chisinau';

/** Regulile fusului orar (EET/EEST: ultima duminică din martie 02:00 → 03:00, ultima din octombrie 03:00 → 02:00). */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0300',
  'TZNAME:EEST',
  'DTSTART:19970330T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0200',
  'TZNAME:EET',
  'DTSTART:19971026T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const ACTIVITY: Record<Booking['activity'], string> = {
  lecture: 'Curs',
  seminar: 'Seminar',
  lab: 'Laborator',
  exam: 'Examen',
  event: 'Eveniment',
  other: 'Activitate',
};

/** Textul unei proprietăți: backslash, punct și virgulă, virgulă și rândurile noi se protejează (RFC 5545 §3.3.11). */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Rândurile mai lungi de 75 de octeți se împart, fără a rupe un caracter UTF-8 (RFC 5545 §3.1). */
export function fold(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = parts.length ? 74 : 75; // rândurile de continuare încep cu un spațiu
    if (bytes + n > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const localTime = (date: string, hhmm: string) => `${date.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;

export interface IcsOptions {
  /** Numele calendarului (de exemplu „Orar — grupa A1-1”). */
  name: string;
  grid: Grid;
  /** Momentul generării (UTC); parametru pentru testele deterministe. */
  now?: Date;
  rooms?: Map<string, string>;
  teachers?: Map<string, string>;
}

export function buildIcs(bookings: readonly Booking[], o: IcsOptions): string {
  const stamp = (o.now ?? new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RoomAllocation//Orar//RO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escapeText(o.name)}`, `X-WR-TIMEZONE:${TZID}`, ...VTIMEZONE];
  const sorted = [...bookings].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start || a.id.localeCompare(b.id));
  for (const b of sorted) {
    const first = o.grid.periods[b.start - 1];
    const last = o.grid.periods[b.start + b.length - 2];
    if (!first || !last) continue;
    const roomName = o.rooms?.get(b.roomId);
    const teacherName = o.teachers?.get(b.teacher);
    const description = [
      `Profesor: ${b.teacher}${teacherName && teacherName !== b.teacher ? ` (${teacherName})` : ''}`,
      `Participanți: ${b.units.join(', ') || '—'} (${b.students} studenți)`,
      `Perechea: ${b.length === 1 ? b.start : `${b.start}–${b.start + b.length - 1}`}`,
      ...(b.status !== 'movable' ? [`Statut: ${b.status === 'fixed' ? 'fixă' : 'înghețată'}`] : []),
    ].join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(b.id)}@room-allocation`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${TZID}:${localTime(b.date, first.start)}`,
      `DTEND;TZID=${TZID}:${localTime(b.date, last.end)}`,
      `SUMMARY:${escapeText(`${ACTIVITY[b.activity]} · ${b.units.join(', ')}`)}`,
      `LOCATION:${escapeText(roomName ? `${b.roomId} (${roomName})` : b.roomId)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `CATEGORIES:${escapeText(ACTIVITY[b.activity])}`,
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Numele de fișier, doar cu caractere sigure. */
export function icsFilename(label: string): string {
  return `orar-${label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_')}.ics`;
}
