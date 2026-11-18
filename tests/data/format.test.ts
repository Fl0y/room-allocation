// Formatul intern (Lotul 3a.1): exemplul mic din Git se citește fără probleme, iar fiecare tip de
// greșeală este raportat cu fișierul și linia.

import { describe, expect, it } from 'vitest';
import { buildWeek, parseDataset, serializeDataset, type TableName } from '../../src/data/format.ts';
import { miniFiles } from '../support/mini.ts';

function check(files: Partial<Record<TableName | 'manifest', string>>) {
  const p = parseDataset(files);
  return buildWeek(p.dataset, p.issues);
}

describe('formatul intern — exemplul mic', () => {
  it('se citește fără erori și fără avertismente', () => {
    const w = check(miniFiles());
    expect(w.issues).toEqual([]);
    expect(w.instance.rooms.map((r) => r.id)).toEqual(['AUD-1', 'SEM-01', 'SEM-02', 'LAB-01']);
    expect(w.state.bookings).toHaveLength(6);
  });

  it('construiește rezervările din orar: dată, studenți, cerințe, status', () => {
    const w = check(miniFiles());
    const by = new Map(w.state.bookings.map((b) => [b.id, b] as const));
    expect(by.get('O-0001')).toMatchObject({ date: '2026-11-16', start: 1, length: 2, students: 41, roomId: 'AUD-1', status: 'movable', needs: { roomTypes: ['auditorium'], projector: true } });
    // laborator: câte un calculator pentru fiecare student
    expect(by.get('O-0002')).toMatchObject({ students: 12, needs: { roomTypes: ['lab'], minComputers: 12 } });
    expect(by.get('O-0005')!.status).toBe('frozen');
    expect(by.get('O-0004')!.status).toBe('movable'); // coloana goală → implicit
    expect(by.get('O-0006')).toMatchObject({ units: ['A1-1', 'A1-2'], students: 41, date: '2026-11-18' });
    expect(w.lineOf.get('O-0004')).toBe(5);
  });

  it('scrierea și recitirea dau aceleași date', () => {
    const a = parseDataset(miniFiles()).dataset;
    const b = parseDataset(serializeDataset(a)).dataset;
    const strip = (d: typeof a) => JSON.parse(JSON.stringify({ ...d, assignments: d.assignments.map(({ line: _l, ...x }) => x), timetable: d.timetable.map(({ line: _l, ...x }) => x) }));
    expect(strip(b)).toEqual(strip(a));
  });
});

describe('formatul intern — greșeli raportate cu sursa', () => {
  const codes = (files: Partial<Record<TableName | 'manifest', string>>) => check(files).issues.map((i) => `${i.severity}:${i.file}:${i.line ?? ''}:${i.code}`);

  it('fișier lipsă și coloană lipsă', () => {
    const f = miniFiles();
    expect(codes({ ...f, teachers: undefined })).toContain('error:teachers.csv::FILE_MISSING');
    expect(codes({ ...f, rooms: f.rooms.replace(',board', '') })).toContain('error:rooms.csv:1:COLUMNS');
  });

  it('valori invalide: tip de sală, număr, zi, identificator duplicat', () => {
    const f = miniFiles();
    expect(codes({ ...f, rooms: f.rooms.replace('LAB-01,Laborator 301,lab', 'LAB-01,Laborator 301,laborator') })).toContain('error:rooms.csv:5:ENUM');
    expect(codes({ ...f, rooms: f.rooms.replace('SEM-01,Sala 201,seminar,30', 'SEM-01,Sala 201,seminar,treizeci') })).toContain('error:rooms.csv:3:NUMBER');
    expect(codes({ ...f, timetable: f.timetable.replace('O-0006,R-0006,3', 'O-0006,R-0006,6') })).toContain('error:timetable.csv:7:DAY');
    expect(codes({ ...f, teachers: f.teachers + 'P-001,Alt nume\n' })).toContain('error:teachers.csv:5:DUPLICATE');
  });

  it('referințe greșite: profesor, unitate, sală, repartizare', () => {
    const f = miniFiles();
    expect(codes({ ...f, assignments: f.assignments.replace('R-0005,D-002,P-003', 'R-0005,D-002,P-999') })).toContain('error:assignments.csv:6:REF');
    expect(codes({ ...f, assignments: f.assignments.replace('lab,A1-2,lab', 'lab,A1-9,lab') })).toContain('error:assignments.csv:5:REF');
    expect(codes({ ...f, timetable: f.timetable.replace('O-0002,R-0002,1,3,1,LAB-01', 'O-0002,R-0002,1,3,1,LAB-99') })).toContain('error:timetable.csv:3:REF');
    expect(codes({ ...f, timetable: f.timetable.replace('O-0003,R-0003', 'O-0003,R-0099') })).toContain('error:timetable.csv:4:REF');
  });

  it('conflicte în orar: sală, profesor, grupă, capacitate', () => {
    const f = miniFiles();
    // a doua ședință de laborator în aceeași sală și pereche cu prima (sală + profesor)
    const same = codes({ ...f, timetable: f.timetable.replace('O-0003,R-0003,1,4,1,LAB-01', 'O-0003,R-0003,1,3,1,LAB-01') });
    expect(same).toContain('error:timetable.csv:3:CONFLICT_H1');
    expect(same).toContain('error:timetable.csv:3:CONFLICT_H2');
    // seminarul fluxului peste curs: aceleași grupe la aceeași oră
    expect(codes({ ...f, timetable: f.timetable.replace('O-0006,R-0006,3,2,1,AUD-1', 'O-0006,R-0006,1,2,1,SEM-01') })).toContain('error:timetable.csv:2:CONFLICT_H3');
    // grupa crește la 22 de studenți; laboratorul are 20 de calculatoare
    const small = codes({ ...f, units: f.units.replace('A1-2,group,A1,18', 'A1-2,group,A1,22') });
    expect(small.some((c) => c.startsWith('error:timetable.csv:5:CONFLICT_H4') || c.startsWith('error:timetable.csv:5:CONFLICT_H5'))).toBe(true);
  });

  it('avertismente: număr de ședințe, durată, repartizare fără sală potrivită', () => {
    const f = miniFiles();
    expect(codes({ ...f, timetable: f.timetable.replace(/O-0004.*\n/, '') })).toContain('warning:assignments.csv:5:PER_WEEK');
    expect(codes({ ...f, timetable: f.timetable.replace('O-0002,R-0002,1,3,1', 'O-0002,R-0002,1,3,2') })).toContain('warning:timetable.csv:3:LENGTH');
    expect(codes({ ...f, assignments: f.assignments.replace('R-0004,D-001,P-002,lab,A1-2,lab,students', 'R-0004,D-001,P-002,lab,A1-2,lab,40') })).toContain('warning:assignments.csv:5:NO_ROOM');
  });

  it('fixarea doar pentru evenimente și examene (D19)', () => {
    const f = miniFiles();
    expect(codes({ ...f, timetable: f.timetable.replace('O-0005,R-0005,2,2,1,AUD-1,frozen', 'O-0005,R-0005,2,2,1,AUD-1,fixed') })).toContain('error:timetable.csv:6:CONFLICT_INVALID');
  });

  it('manifestul: format, versiune, săptămână', () => {
    const f = miniFiles();
    expect(codes({ ...f, manifest: f.manifest.replace('"version": 1', '"version": 2') })).toContain('error:dataset.json::VERSION');
    expect(codes({ ...f, manifest: '{' })).toContain('error:dataset.json::JSON');
    expect(codes({ ...f, manifest: f.manifest.replace('"2026-11-20"', '"vineri"') })).toContain('error:dataset.json::WEEK');
  });
});
