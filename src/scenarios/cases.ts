// Cele cinci cazuri conflictuale din concept §6, ca secvențe de evenimente, plus exemplul
// din coordinator-feedback.md. Date sintetice (D08). Notație: L = laborator, S = seminar, A = auditoriu.

import { DEFAULT_GRID } from '../engine/grid.ts';
import type { Instance, Unit } from '../engine/types.ts';
import { auditorium, booking, lab, request, seminarRoom } from './build.ts';
import type { Scenario } from './run.ts';

const MON = '2026-11-16';
const TUE = '2026-11-17';
const WED = '2026-11-18';
const THU = '2026-11-19';
const FRI = '2026-11-20';
const MON2 = '2026-11-23';
const TUE2 = '2026-11-24';

const leaf = (id: string, size: number, parent?: string): Unit => (parent ? { id, size, parent } : { id, size });
const group = (id: string, parent?: string): Unit => (parent ? { id, parent } : { id });

function instance(rooms: Instance['rooms'], units: Unit[], dates: string[]): Instance {
  return { grid: DEFAULT_GRID, rooms, units, dates };
}

// ── Cazul 1 ────────────────────────────────────────────────────────────────
export const case1: Scenario = {
  id: 'case1',
  title: 'Cazul 1 — Ultimul laborator, ocupat de o activitate care nu are nevoie de el',
  summary:
    'Marți, perechea 3. Seminarul prof. C (15 studenți) ocupă deja L-105. Sosesc pe rând: prof. B (laborator, 14) și prof. A (laborator, 22).',
  expected: 'Toate trei activitățile au loc, cu 2 mutări: C → S-12, B → L-105, A primește L-201.',
  instance: instance(
    [lab('L-201', 24), lab('L-105', 16), seminarRoom('S-12', 30)],
    [leaf('MK-231', 15), group('TI-222'), leaf('TI-222/1', 14, 'TI-222'), leaf('TI-222/2', 14, 'TI-222'), leaf('IA-231', 22)],
    [TUE, WED],
  ),
  initial: {
    bookings: [booking({ id: 'C-seminar', teacher: 'Prof. C', units: ['MK-231'], activity: 'seminar', date: TUE, start: 3, students: 15, roomId: 'L-105' })],
    closures: [],
  },
  steps: [
    { kind: 'request', request: request({ id: 'B-lab', teacher: 'Prof. B', units: ['TI-222/1'], activity: 'lab', date: TUE, start: 3, students: 14 }) },
    { kind: 'request', request: request({ id: 'A-lab', teacher: 'Prof. A', units: ['IA-231'], activity: 'lab', date: TUE, start: 3, students: 22 }) },
  ],
};

// ── Cazul 2 ────────────────────────────────────────────────────────────────
export const case2: Scenario = {
  id: 'case2',
  title: 'Cazul 2 — Blocul de 3 perechi „rupt” de o pereche izolată',
  summary:
    'Joi, prof. D cere un laborator pentru perechile 2–4 (18 studenți). L-201 e liber la 2 și 3, dar la 4 are laboratorul prof. E (10 studenți). L-105 (16) e liber la 4.',
  expected: 'Blocul rămâne întreg, cu o mutare: E → L-105, D primește L-201 pentru 2–4.',
  instance: instance(
    [lab('L-201', 24), lab('L-105', 16)],
    [leaf('INF-221', 18), group('CIB-231'), leaf('CIB-231/1', 10, 'CIB-231'), leaf('CIB-231/2', 10, 'CIB-231')],
    [WED, THU, FRI],
  ),
  initial: {
    bookings: [booking({ id: 'E-lab', teacher: 'Prof. E', units: ['CIB-231/2'], activity: 'lab', date: THU, start: 4, students: 10, roomId: 'L-201' })],
    closures: [],
  },
  steps: [
    { kind: 'request', request: request({ id: 'D-bloc', teacher: 'Prof. D', units: ['INF-221'], activity: 'lab', date: THU, start: 2, length: 3, students: 18 }) },
  ],
};

// ── Cazul 3 ────────────────────────────────────────────────────────────────
export const case3: Scenario = {
  id: 'case3',
  title: 'Cazul 3 — Auditoriul mare ocupat de o grupă mică',
  summary:
    'Luni, perechea 2. A-1 (120) are un seminar de 25 de studenți, rezervat când nu era altă sală liberă. S-12 (30) s-a eliberat. Se cere o prelegere pe fluxul EI-23 (110 studenți).',
  expected: 'Ambele activități au loc; seminarul trece în S-12; locurile neocupate scad de la 95 la 15.',
  instance: instance(
    [auditorium('A-1', 120), seminarRoom('S-12', 30)],
    [
      group('EI-23'),
      leaf('EI-231', 28, 'EI-23'),
      leaf('EI-232', 28, 'EI-23'),
      leaf('EI-233', 27, 'EI-23'),
      leaf('EI-234', 27, 'EI-23'),
      leaf('CON-221', 25),
    ],
    [MON, TUE],
  ),
  initial: {
    bookings: [
      booking({
        id: 'G-seminar',
        teacher: 'Prof. G',
        units: ['CON-221'],
        activity: 'seminar',
        date: MON,
        start: 2,
        students: 25,
        roomId: 'A-1',
        needs: { roomTypes: ['seminar', 'auditorium'] },
      }),
    ],
    closures: [],
  },
  steps: [
    { kind: 'request', request: request({ id: 'H-curs-flux', teacher: 'Prof. H', units: ['EI-23'], activity: 'lecture', date: MON, start: 2, students: 110 }) },
  ],
};

// ── Cazul 4 ────────────────────────────────────────────────────────────────
export const case4: Scenario = {
  id: 'case4',
  title: 'Cazul 4 — Conflict de persoane, nu de săli',
  summary:
    'Miercuri, perechea 2. Prof. F cere o sală pentru recuperarea unui seminar cu grupa TI-231. Săli libere există, dar subgrupele TI-231/1 și TI-231/2 au laborator la perechea 2. Prof. F predă la perechea 3.',
  expected: 'Refuz GROUP_BUSY, cu activitățile suprapuse; alternative la care și profesorul, și grupa sunt liberi.',
  instance: instance(
    [lab('L-201', 24), lab('L-105', 16), seminarRoom('S-12', 30), seminarRoom('S-14', 25)],
    [group('TI-231'), leaf('TI-231/1', 13, 'TI-231'), leaf('TI-231/2', 13, 'TI-231'), leaf('TI-232', 24)],
    [WED, THU],
  ),
  initial: {
    bookings: [
      booking({ id: 'P-lab-sg1', teacher: 'Prof. P', units: ['TI-231/1'], activity: 'lab', date: WED, start: 2, students: 13, roomId: 'L-201' }),
      booking({ id: 'Q-lab-sg2', teacher: 'Prof. Q', units: ['TI-231/2'], activity: 'lab', date: WED, start: 2, students: 13, roomId: 'L-105' }),
      booking({ id: 'F-seminar-p3', teacher: 'Prof. F', units: ['TI-232'], activity: 'seminar', date: WED, start: 3, students: 24, roomId: 'S-12' }),
    ],
    closures: [],
  },
  steps: [
    { kind: 'request', request: request({ id: 'F-recuperare', teacher: 'Prof. F', units: ['TI-231'], activity: 'seminar', date: WED, start: 2, students: 26 }) },
  ],
};

// ── Cazul 5 ────────────────────────────────────────────────────────────────
// Concretizare sintetică a cazului din concept: 9 rezervări în L-201, dintre care 2 blocuri de 2 perechi,
// o activitate săptămânală (reprezentată prin două rezervări, recurența fiind amânată, D16)
// și un examen fixat (D19).
export const case5: Scenario = {
  id: 'case5',
  title: 'Cazul 5 — Sală indisponibilă în timpul semestrului (reparare)',
  summary:
    'L-201 se închide pentru reparații două săptămâni (16–27.11). Sunt afectate 9 rezervări: 2 blocuri de 2 perechi, o activitate săptămânală (două date), un examen fixat. Laboratoarele rămase sunt parțial ocupate.',
  expected:
    'Majoritatea activităților rămân la aceeași oră; schimbările sunt minime și explicate; nerezolvatele primesc alternative propuse.',
  instance: instance(
    [lab('L-201', 24), lab('L-105', 16), lab('L-310', 20), lab('L-312', 24), seminarRoom('S-12', 30)],
    [
      leaf('G1', 20),
      group('G2'),
      leaf('G2/1', 12, 'G2'),
      leaf('G2/2', 12, 'G2'),
      leaf('G3', 22),
      leaf('G4', 22),
      group('G5'),
      leaf('G5/1', 14, 'G5'),
      leaf('G5/2', 14, 'G5'),
      leaf('G6', 18),
      leaf('G7', 16),
      leaf('G8', 18),
      leaf('H1', 15),
      leaf('H2', 18),
      leaf('H3', 20),
      leaf('H4', 12),
      leaf('H5', 20),
    ],
    [MON, TUE, MON2, TUE2],
  ),
  initial: {
    bookings: [
      // Rezervările din L-201 (afectate)
      booking({ id: 'b1-bloc', teacher: 'T1', units: ['G1'], activity: 'lab', date: MON, start: 1, length: 2, students: 20, roomId: 'L-201' }),
      booking({ id: 'b2', teacher: 'T2', units: ['G2/1'], activity: 'lab', date: MON, start: 3, students: 12, roomId: 'L-201' }),
      booking({ id: 'b3-examen', teacher: 'T3', units: ['G3'], activity: 'exam', date: MON, start: 4, students: 22, roomId: 'L-201', status: 'fixed' }),
      booking({ id: 'b4-bloc', teacher: 'T4', units: ['G4'], activity: 'lab', date: TUE, start: 2, length: 2, students: 22, roomId: 'L-201' }),
      booking({ id: 'b5', teacher: 'T5', units: ['G5/1'], activity: 'lab', date: TUE, start: 5, students: 14, roomId: 'L-201', status: 'frozen' }),
      booking({ id: 'b6-sapt1', teacher: 'T6', units: ['G6'], activity: 'lab', date: MON2, start: 1, students: 18, roomId: 'L-201' }),
      booking({ id: 'b7-sapt2', teacher: 'T6', units: ['G6'], activity: 'lab', date: TUE2, start: 1, students: 18, roomId: 'L-201' }),
      booking({ id: 'b8', teacher: 'T7', units: ['G7'], activity: 'lab', date: MON2, start: 2, students: 16, roomId: 'L-201' }),
      booking({ id: 'b9-seminar', teacher: 'T8', units: ['G8'], activity: 'seminar', date: TUE2, start: 3, students: 18, roomId: 'L-201' }),
      // Alte rezervări (neafectate)
      booking({ id: 'h1', teacher: 'U1', units: ['H1'], activity: 'lab', date: MON, start: 4, students: 15, roomId: 'L-312' }),
      booking({ id: 'h2', teacher: 'U2', units: ['H2'], activity: 'lab', date: MON, start: 1, length: 2, students: 18, roomId: 'L-310', status: 'frozen' }),
      booking({ id: 'h3', teacher: 'U3', units: ['H3'], activity: 'lab', date: TUE, start: 2, students: 20, roomId: 'L-312', status: 'frozen' }),
      booking({ id: 'h4', teacher: 'U4', units: ['H4'], activity: 'lab', date: MON2, start: 1, students: 12, roomId: 'L-310' }),
      booking({ id: 'h5', teacher: 'U5', units: ['H5'], activity: 'lab', date: TUE2, start: 1, students: 20, roomId: 'L-312' }),
    ],
    closures: [],
  },
  steps: [
    {
      kind: 'closure',
      closure: { roomId: 'L-201', from: '2026-11-16', to: '2026-11-27', reason: 'repair' },
    },
  ],
};

// ── Exemplul pentru coordonator (coordinator-feedback.md §2.1) ─────────────
export const coordinatorExample: Scenario = {
  id: 'coordinator',
  title: 'Exemplul pentru coordonator — cinci cereri, patru strategii',
  summary:
    'Marți, perechea 3, cinci săli în ordinea A-1 (120), S-12 (30), S-14 (25), L-201 (24 calc.), L-105 (16 calc.). Sosesc: r1 seminar 20, r2 laborator 22, r3 seminar 28, r4 curs pe flux 100, r5 laborator 14.',
  expected:
    'Prima sală liberă 4/5 (r4 refuzat); best-fit 4/5 (r2 refuzat); scor cu raritate 5/5; best-fit + reparare (M = 1) 5/5 cu o mutare.',
  instance: instance(
    [auditorium('A-1', 120), seminarRoom('S-12', 30), seminarRoom('S-14', 25), lab('L-201', 24), lab('L-105', 16)],
    [
      leaf('SEM-1', 20),
      leaf('LAB-1', 22),
      leaf('SEM-2', 28),
      group('FLX'),
      leaf('FLX-1', 25, 'FLX'),
      leaf('FLX-2', 25, 'FLX'),
      leaf('FLX-3', 25, 'FLX'),
      leaf('FLX-4', 25, 'FLX'),
      leaf('LAB-2', 14),
    ],
    [TUE],
  ),
  initial: { bookings: [], closures: [] },
  steps: [
    { kind: 'request', request: request({ id: 'r1', teacher: 'Prof. 1', units: ['SEM-1'], activity: 'seminar', date: TUE, start: 3, students: 20 }) },
    { kind: 'request', request: request({ id: 'r2', teacher: 'Prof. 2', units: ['LAB-1'], activity: 'lab', date: TUE, start: 3, students: 22 }) },
    { kind: 'request', request: request({ id: 'r3', teacher: 'Prof. 3', units: ['SEM-2'], activity: 'seminar', date: TUE, start: 3, students: 28 }) },
    { kind: 'request', request: request({ id: 'r4', teacher: 'Prof. 4', units: ['FLX'], activity: 'lecture', date: TUE, start: 3, students: 100 }) },
    { kind: 'request', request: request({ id: 'r5', teacher: 'Prof. 5', units: ['LAB-2'], activity: 'lab', date: TUE, start: 3, students: 14 }) },
  ],
  options: { alternatives: 0 },
};

// ── Cazurile 6–10: cererea cu interval și ferestrele studenților (Lotul 4, D29, D31) ──
// Rezultatele așteptate au fost aprobate de autor la 18.11.2026 (journal.md, intrarea Lotului 4).

const G25 = leaf('G', 25);
const H20 = leaf('H', 20);

export const case6: Scenario = {
  id: 'case6',
  title: 'Cazul 6 — Intervalul după activitățile grupei',
  summary: 'Marți. Grupa G (25) are seminare la perechile 1 și 2 în S-1. Prof. T9 cere un seminar pentru G oricând între perechile 3 și 5. Săli: S-1 (30), S-2 (40).',
  expected: 'Perechea 3, S-1: fără fereastră pentru G; S-1 are mai puține locuri goale decât S-2.',
  instance: instance([seminarRoom('S-1', 30), seminarRoom('S-2', 40)], [G25], [TUE]),
  initial: {
    bookings: [
      booking({ id: 'G-1', teacher: 'Prof. T1', units: ['G'], activity: 'seminar', date: TUE, start: 1, students: 25, roomId: 'S-1' }),
      booking({ id: 'G-2', teacher: 'Prof. T2', units: ['G'], activity: 'seminar', date: TUE, start: 2, students: 25, roomId: 'S-1' }),
    ],
    closures: [],
  },
  steps: [{ kind: 'request', request: request({ id: 'r6', teacher: 'Prof. T9', units: ['G'], activity: 'seminar', date: TUE, start: 3, latest: 5, students: 25 }) }],
};

export const case7: Scenario = {
  id: 'case7',
  title: 'Cazul 7 — Fereastra contează mai mult decât locurile goale',
  summary:
    'Marți. G (25) are o activitate la perechea 1 în S-1. S-2 (26) este ocupată la perechile 2 și 3 de grupa H (înghețat). Prof. T9 cere un seminar pentru G oricând între perechile 2 și 4. Săli: S-1 (40), S-2 (26).',
  expected: 'Perechea 2, S-1 (0 ferestre, 15 locuri goale). Fără criteriul ferestrelor: perechea 4, S-2 (1 loc gol, dar 2 ferestre).',
  instance: instance([seminarRoom('S-1', 40), seminarRoom('S-2', 26)], [G25, H20], [TUE]),
  initial: {
    bookings: [
      booking({ id: 'G-1', teacher: 'Prof. T1', units: ['G'], activity: 'seminar', date: TUE, start: 1, students: 25, roomId: 'S-1' }),
      booking({ id: 'H-2', teacher: 'Prof. T2', units: ['H'], activity: 'seminar', date: TUE, start: 2, students: 20, roomId: 'S-2', status: 'frozen' }),
      booking({ id: 'H-3', teacher: 'Prof. T3', units: ['H'], activity: 'seminar', date: TUE, start: 3, students: 20, roomId: 'S-2', status: 'frozen' }),
    ],
    closures: [],
  },
  steps: [{ kind: 'request', request: request({ id: 'r7', teacher: 'Prof. T9', units: ['G'], activity: 'seminar', date: TUE, start: 2, latest: 4, students: 25 }) }],
};

export const case8: Scenario = {
  id: 'case8',
  title: 'Cazul 8 — Sala rară contează mai mult decât fereastra',
  summary:
    'Marți. G (25) are o activitate la perechea 1 în S-1. S-1 (30) este ocupată la perechea 2 de H (înghețat); laboratorul L-1 (30 de calculatoare) e liber. Prof. T9 cere un seminar pentru G oricând între perechile 2 și 3.',
  expected: 'Perechea 3, S-1, cu o fereastră: la perechea 2 ar fi fost liber doar laboratorul, iar sălile rare vin înaintea ferestrelor (D31).',
  instance: instance([seminarRoom('S-1', 30), lab('L-1', 30)], [G25, H20], [TUE]),
  initial: {
    bookings: [
      booking({ id: 'G-1', teacher: 'Prof. T1', units: ['G'], activity: 'seminar', date: TUE, start: 1, students: 25, roomId: 'S-1' }),
      booking({ id: 'H-2', teacher: 'Prof. T2', units: ['H'], activity: 'seminar', date: TUE, start: 2, students: 20, roomId: 'S-1', status: 'frozen' }),
    ],
    closures: [],
  },
  steps: [{ kind: 'request', request: request({ id: 'r8', teacher: 'Prof. T9', units: ['G'], activity: 'seminar', date: TUE, start: 2, latest: 3, students: 25 }) }],
};

export const case9: Scenario = {
  id: 'case9',
  title: 'Cazul 9 — Subgrupe cu laboratoare la ore diferite',
  summary:
    'Marți. Grupa K are subgrupele K/1 (12) și K/2 (12); K/1 are laborator la perechea 1 (L-1), K/2 la perechea 2 (L-2). Prof. T9 cere un seminar pentru toată grupa K oricând între perechile 1 și 3. Săli: S-1 (30), L-1 și L-2 (14 calculatoare).',
  expected: 'Perechile 1 și 2 sunt excluse (grupa e ocupată); perechea 3, S-1, cu o fereastră pentru K/1 (la perechea 2).',
  instance: instance([seminarRoom('S-1', 30), lab('L-1', 14), lab('L-2', 14)], [group('K'), leaf('K/1', 12, 'K'), leaf('K/2', 12, 'K')], [TUE]),
  initial: {
    bookings: [
      booking({ id: 'K1-lab', teacher: 'Prof. T1', units: ['K/1'], activity: 'lab', date: TUE, start: 1, students: 12, roomId: 'L-1' }),
      booking({ id: 'K2-lab', teacher: 'Prof. T2', units: ['K/2'], activity: 'lab', date: TUE, start: 2, students: 12, roomId: 'L-2' }),
    ],
    closures: [],
  },
  steps: [{ kind: 'request', request: request({ id: 'r9', teacher: 'Prof. T9', units: ['K'], activity: 'seminar', date: TUE, start: 1, latest: 3, students: 24 }) }],
};

export const case10: Scenario = {
  id: 'case10',
  title: 'Cazul 10 — Refuz pe tot intervalul',
  summary: 'Marți. Prof. T9 are seminare cu grupa H la perechile 3 și 4 în S-1. Tot el cere un seminar pentru G oricând între perechile 3 și 4. Sală: S-1 (30).',
  expected: 'Refuz, cu motivul TEACHER_BUSY pentru fiecare pereche; alternative în aceeași zi, cele mai apropiate de interval: perechile 2, 5, 1, 6, 7.',
  instance: instance([seminarRoom('S-1', 30)], [G25, H20], [TUE]),
  initial: {
    bookings: [
      booking({ id: 'H-3', teacher: 'Prof. T9', units: ['H'], activity: 'seminar', date: TUE, start: 3, students: 20, roomId: 'S-1' }),
      booking({ id: 'H-4', teacher: 'Prof. T9', units: ['H'], activity: 'seminar', date: TUE, start: 4, students: 20, roomId: 'S-1' }),
    ],
    closures: [],
  },
  steps: [{ kind: 'request', request: request({ id: 'r10', teacher: 'Prof. T9', units: ['G'], activity: 'seminar', date: TUE, start: 3, latest: 4, students: 25 }) }],
};

export const intervalCases: Scenario[] = [case6, case7, case8, case9, case10];

export const allCases: Scenario[] = [case1, case2, case3, case4, case5, ...intervalCases];
