// Modul online (concept §5.1) cu ierarhia „celei mai bune variante” (D18):
// planuri valide → cele mai puține mutări (≤ M) → cheia strategiei → departajare deterministă.
// Dacă nu există plan valid: refuz motivat + alternative propuse, neaplicate automat.

import { checkState } from './checker.ts';
import { closureOf, roomMismatch } from './compat.ts';
import { inGrid, overlaps, periodLabel, timeLabel } from './grid.ts';
import { buildOccupancy, isolatedGaps, occupantsAt, setCells } from './occupancy.ts';
import { compareKeys, movedKey, rarityOf, requestKey } from './score.ts';
import type { RoomEvaluation, Strategy } from './score.ts';
import type { Booking, Instance, Request, Room, State } from './types.ts';
import { atomsOf, buildUnitIndex, intersects, sizeOf, unknownUnits } from './units.ts';
import { buildAtomDays, windowsDelta } from './windows.ts';

export interface AllocateOptions {
  strategy?: Strategy;
  /** Numărul maxim de rezervări existente mutate pentru o cerere (P04). */
  maxMoves?: number;
  /** Câte alternative de pereche/zi se propun la refuz. */
  alternatives?: number;
  /** Propune ruperea blocului ca ultimă opțiune (D20). */
  split?: boolean;
  /**
   * Verifică starea rezultată cu verificatorul independent după fiecare decizie (implicit da).
   * Simulatorul o dezactivează și verifică starea finală o singură dată.
   */
  verify?: boolean;
  /** Criteriul ferestrelor studenților pentru cererile cu interval (D31); implicit da. Doar strategia `score`. */
  windows?: boolean;
}

export type RejectCode = 'INVALID_REQUEST' | 'TEACHER_BUSY' | 'GROUP_BUSY' | 'NO_ROOM_OF_TYPE' | 'ROOM_UNAVAILABLE';

export interface Reason {
  code: RejectCode;
  message: string;
  bookings: string[];
}

export interface Move {
  bookingId: string;
  from: string;
  to: string;
}

export type Alternative =
  | { kind: 'slot'; date: string; start: number; length: number; roomId: string; moves: number }
  | { kind: 'split'; date: string; parts: { start: number; length: number; roomId: string }[]; moves: number };

export interface Accepted {
  kind: 'accepted';
  requestId: string;
  booking: Booking;
  moves: Move[];
  evaluation: RoomEvaluation;
  /** Câte planuri valide au fost comparate. */
  plansCompared: number;
  explanation: string[];
  state: State;
}

export interface Rejected {
  kind: 'rejected';
  requestId: string;
  reasons: Reason[];
  alternatives: Alternative[];
  explanation: string[];
}

export type Decision = Accepted | Rejected;

interface Plan {
  room: Room;
  /** Prima pereche aleasă (egală cu cea cerută, dacă cererea nu are interval). */
  start: number;
  moves: Move[];
  key: (number | string)[];
  evaluation: RoomEvaluation;
}

type PlaceResult =
  | { ok: true; booking: Booking; plan: Plan; plansCompared: number; state: State }
  | { ok: false; reasons: Reason[] };

const REQ = '\u0000request';

const DEFAULTS: Required<AllocateOptions> = { strategy: 'score', maxMoves: 2, alternatives: 5, split: true, verify: true, windows: true };

export function allocate(instance: Instance, state: State, request: Request, options: AllocateOptions = {}): Decision {
  const opts = { ...DEFAULTS, ...options };
  const placed = tryPlace(instance, state, request, opts.strategy, opts.maxMoves, opts.verify, opts.windows);
  if (placed.ok) {
    return {
      kind: 'accepted',
      requestId: request.id,
      booking: placed.booking,
      moves: placed.plan.moves,
      evaluation: placed.plan.evaluation,
      plansCompared: placed.plansCompared,
      explanation: explainAccepted(instance, request, placed, opts),
      state: placed.state,
    };
  }
  const alternatives = placed.reasons.some((r) => r.code === 'INVALID_REQUEST' || r.code === 'NO_ROOM_OF_TYPE')
    ? []
    : findAlternatives(instance, state, request, placed.reasons, opts);
  return {
    kind: 'rejected',
    requestId: request.id,
    reasons: placed.reasons,
    alternatives,
    explanation: explainRejected(instance, request, placed.reasons, alternatives),
  };
}

/**
 * Încearcă plasarea cererii la data cerută: la perechea cerută sau, pentru o cerere cu interval (`latest`),
 * la oricare început din interval. Nu generează alternative.
 */
export function tryPlace(
  instance: Instance,
  state: State,
  request: Request,
  strategy: Strategy,
  maxMoves: number,
  verify = true,
  useWindows = true,
): PlaceResult {
  const P = instance.grid.periods.length;
  const index = buildUnitIndex(instance.units);

  // 1. Validare
  const invalid = (message: string): PlaceResult => ({
    ok: false,
    reasons: [{ code: 'INVALID_REQUEST', message, bookings: [] }],
  });
  if (!inGrid(instance.grid, request.start, request.length)) return invalid('perechile cerute sunt în afara grilei');
  const latest = request.latest ?? request.start + request.length - 1;
  if (request.latest !== undefined && (!Number.isInteger(latest) || latest < request.start + request.length - 1 || latest > P)) {
    return invalid(`intervalul cerut (perechile ${request.start}–${request.latest}) nu cuprinde blocul de ${request.length} perechi sau iese din grilă`);
  }
  if (state.bookings.some((b) => b.id === request.id)) return invalid(`identificatorul ${request.id} există deja`);
  const unknown = unknownUnits(index, request.units);
  if (unknown.length) return invalid(`unități necunoscute: ${unknown.join(', ')}`);
  if (request.units.length === 0 && request.declaredStudents === undefined) {
    return invalid('cererea nu are nici unități participante, nici număr declarat de studenți');
  }
  const derived = sizeOf(index, request.units);
  const students = request.declaredStudents ?? derived;
  if (!(students > 0)) return invalid('numărul de studenți trebuie să fie pozitiv');
  if (request.units.length > 0 && students > derived) {
    return invalid(`numărul declarat (${students}) depășește mărimea unităților (${derived}), D21`);
  }
  const status = request.status ?? 'movable';
  if (status === 'fixed' && request.activity !== 'event' && request.activity !== 'exam') {
    return invalid('doar evenimentele și examenele se pot fixa (D19)');
  }

  // Sălile compatibile (H4, H5) și deschise (H6) nu depind de pereche
  const roomsSorted = [...instance.rooms].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const roomOrder = new Map(instance.rooms.map((r, i) => [r.id, i] as const));
  const compatible = roomsSorted.filter((r) => roomMismatch(r, request.needs, students) === null);
  const atoms = atomsOf(index, request.units);
  const occ = buildOccupancy(state.bookings, P);
  const byId = new Map(state.bookings.map((b) => [b.id, b] as const));
  const atomDays = buildAtomDays(index, state.bookings);
  const plans: Plan[] = [];
  const moved = new Set<string>();
  const interval = request.latest !== undefined;

  const clear = (b: Booking) => setCells(occ, b.roomId, b.date, b.start, b.length, null, P);
  const restore = (b: Booking) => setCells(occ, b.roomId, b.date, b.start, b.length, b.id, P);

  const evaluate = (room: Room, needs: Request['needs'], n: number, date: string, start: number, length: number, windows: number): RoomEvaluation => {
    const r = rarityOf(room, needs);
    const after = isolatedGaps(occ, room.id, date, P);
    const before = isolatedGaps(occ, room.id, date, P, { start, length });
    return { rarity: r.value, excess: room.capacity - n, fragmentation: after - before, windows, notes: r.notes };
  };

  /** Pașii 2–4 pentru un început dat; planurile găsite se adaugă în `plans`. */
  const searchAt = (start: number): Reason[] => {
    const at: Request = { ...request, start };
    // 2. Persoanele: profesorul și unitățile atomice libere în toate perechile (H2, H3)
    const sameTime = state.bookings.filter((b) => overlaps(b, at)).sort((a, b) => (a.id < b.id ? -1 : 1));
    const teacherBusy = request.teacher ? sameTime.filter((b) => b.teacher === request.teacher) : [];
    const groupBusy = sameTime.filter((b) => intersects(atomsOf(index, b.units), atoms));
    const peopleReasons: Reason[] = [];
    const where = interval ? `${periodLabel(start, request.length)}: ` : '';
    if (teacherBusy.length) {
      peopleReasons.push({
        code: 'TEACHER_BUSY',
        message: `${where}${request.teacher} are deja: ${teacherBusy.map((b) => describe(b)).join('; ')}`,
        bookings: teacherBusy.map((b) => b.id).sort(),
      });
    }
    if (groupBusy.length) {
      peopleReasons.push({
        code: 'GROUP_BUSY',
        message: `${where}participanții (${request.units.join(', ')}) au deja: ${groupBusy.map((b) => describe(b)).join('; ')}`,
        bookings: groupBusy.map((b) => b.id).sort(),
      });
    }
    if (peopleReasons.length) return peopleReasons;

    // 3. Săli compatibile și deschise
    if (!compatible.length) {
      return [{ code: 'NO_ROOM_OF_TYPE', message: `nicio sală nu corespunde cerințelor (${needsLabel(request, students)})`, bookings: [] }];
    }
    const open = compatible.filter((r) => !closureOf(state.closures, r.id, request.date));
    if (!open.length) {
      return [{ code: 'ROOM_UNAVAILABLE', message: 'toate sălile compatibile sunt închise la această dată', bookings: [] }];
    }

    // 4. Căutarea planurilor: sala cererii + cel mult M mutări de sală, la aceeași oră
    const windows = windowsDelta(atomDays, atoms, request.date, start, request.length);
    const record = (room: Room, moves: Move[]) => {
      const evaluation = evaluate(room, request.needs, students, request.date, start, request.length, windows);
      const sum: number[] = [];
      for (const m of moves) {
        const b = byId.get(m.bookingId)!;
        const to = roomsSorted.find((r) => r.id === m.to)!;
        const k = movedKey(strategy, roomOrder.get(to.id)!, evaluate(to, b.needs, b.students, b.date, b.start, b.length, 0));
        k.forEach((x, i) => (sum[i] = (sum[i] ?? 0) + x));
      }
      const signature = moves
        .map((m) => `${m.bookingId}>${m.to}`)
        .sort()
        .join(',');
      plans.push({
        room,
        start,
        moves: [...moves],
        evaluation,
        // D31: mutări → (cheia strategiei: raritate → ferestre → excedent → fragmentare) → mutările → perechea → departajare
        key: [moves.length, ...requestKey(strategy, roomOrder.get(room.id)!, evaluation, useWindows), ...sum, start, signature, room.id],
      });
    };

    const dfs = (queue: string[], moves: Move[], room: Room): void => {
      if (moves.length + queue.length > maxMoves) return;
      if (queue.length === 0) {
        record(room, moves);
        return;
      }
      const [bid, ...rest] = queue as [string, ...string[]];
      const b = byId.get(bid)!;
      for (const target of roomsSorted) {
        if (target.id === b.roomId) continue;
        if (roomMismatch(target, b.needs, b.students) !== null) continue;
        if (closureOf(state.closures, target.id, b.date)) continue;
        const occupants = occupantsAt(occ, target.id, b.date, b.start, b.length);
        if (occupants.some((o) => o === REQ || moved.has(o) || byId.get(o)!.status !== 'movable')) continue;
        const evicted = occupants.map((o) => byId.get(o)!);
        evicted.forEach(clear);
        setCells(occ, target.id, b.date, b.start, b.length, b.id, P);
        moved.add(b.id);
        dfs([...new Set([...rest, ...occupants])].sort(), [...moves, { bookingId: b.id, from: b.roomId, to: target.id }], room);
        moved.delete(b.id);
        setCells(occ, target.id, b.date, b.start, b.length, null, P);
        evicted.forEach(restore);
      }
    };

    const before = plans.length;
    for (const room of open) {
      const blockers = occupantsAt(occ, room.id, request.date, start, request.length);
      if (blockers.some((o) => byId.get(o)!.status !== 'movable')) continue;
      if (blockers.length > maxMoves) continue;
      const displaced = blockers.map((o) => byId.get(o)!);
      displaced.forEach(clear);
      setCells(occ, room.id, request.date, start, request.length, REQ, P);
      dfs(blockers, [], room);
      setCells(occ, room.id, request.date, start, request.length, null, P);
      displaced.forEach(restore);
    }
    if (plans.length > before) return [];

    const blocking = new Set<string>();
    for (const room of open) {
      for (const o of occupantsAt(occ, room.id, request.date, start, request.length)) blocking.add(o);
    }
    const fixedOnes = [...blocking].filter((id) => byId.get(id)!.status !== 'movable');
    const detail = fixedOnes.length ? `; nemutabile: ${fixedOnes.sort().join(', ')}` : '';
    return [
      {
        code: 'ROOM_UNAVAILABLE',
        message: `${where}${open.length === 1 ? 'singura sală compatibilă' : `toate cele ${open.length} săli compatibile`} (${open.map((r) => r.id).join(', ')}) ${open.length === 1 ? 'este ocupată și nu se eliberează' : 'sunt ocupate și nu se eliberează'} cu cel mult ${maxMoves} mutări${detail}`,
        bookings: [...blocking].sort(),
      },
    ];
  };

  const failures: Reason[][] = [];
  for (let start = request.start; start + request.length - 1 <= latest; start++) {
    const reasons = searchAt(start);
    if (reasons.length) failures.push(reasons);
  }

  if (!plans.length) {
    // Fără interval: motivele perechii cerute (ca în V0). Cu interval: întâi motivele legate de săli
    // (la acele perechi persoanele erau libere), apoi cele de persoane; câte un motiv pe pereche.
    const all = failures.flat();
    const rank = (r: Reason) => (r.code === 'NO_ROOM_OF_TYPE' ? 0 : r.code === 'ROOM_UNAVAILABLE' ? 1 : 2);
    const reasons = interval ? [...all].sort((x, y) => rank(x) - rank(y)) : all;
    if (reasons[0]?.code === 'NO_ROOM_OF_TYPE') return { ok: false, reasons: [reasons[0]] };
    return { ok: false, reasons };
  }

  plans.sort((a, b) => compareKeys(a.key, b.key));
  const best = plans[0]!;
  const booking: Booking = {
    id: request.id,
    teacher: request.teacher,
    units: [...request.units],
    activity: request.activity,
    needs: request.needs,
    date: request.date,
    start: best.start,
    length: request.length,
    students,
    roomId: best.room.id,
    status,
  };
  const movedTo = new Map(best.moves.map((m) => [m.bookingId, m.to] as const));
  const newState: State = {
    bookings: [...state.bookings.map((b) => (movedTo.has(b.id) ? { ...b, roomId: movedTo.get(b.id)! } : b)), booking],
    closures: state.closures,
  };
  // Verificare defensivă cu verificatorul independent (H1–H7).
  const violations = verify ? checkState(instance, newState).filter((v) => !preexisting(instance, state, v)) : [];
  if (violations.length) {
    throw new Error(`eroare internă: planul ales încalcă ${violations.map((v) => `${v.code} ${v.message}`).join('; ')}`);
  }
  return { ok: true, booking, plan: best, plansCompared: plans.length, state: newState };
}

/** Încălcările existente deja în starea inițială nu sunt cauzate de plan. */
function preexisting(instance: Instance, state: State, v: { code: string; bookings: string[] }): boolean {
  return checkState(instance, state).some((w) => w.code === v.code && w.bookings.join() === v.bookings.join());
}

function findAlternatives(
  instance: Instance,
  state: State,
  request: Request,
  reasons: Reason[],
  opts: Required<AllocateOptions>,
): Alternative[] {
  const out: Alternative[] = [];
  const dates = [...new Set([...instance.dates, request.date])].sort();
  const dayIndex = new Map(dates.map((d, i) => [d, i] as const));
  const P = instance.grid.periods.length;
  // începuturile deja încercate (perechea cerută sau tot intervalul) nu se mai propun în ziua cererii
  const lastStart = (request.latest ?? request.start + request.length - 1) - request.length + 1;
  const fixed: Request = { ...request, latest: undefined };
  const candidates: { date: string; start: number; key: number[] }[] = [];
  for (const date of dates) {
    for (let start = 1; start + request.length - 1 <= P; start++) {
      if (date === request.date && start >= request.start && start <= lastStart) continue;
      const dd = Math.abs(dayIndex.get(date)! - dayIndex.get(request.date)!);
      const dist = Math.max(0, request.start - start, start - lastStart);
      candidates.push({ date, start, key: [date === request.date ? 0 : 1, dd, dist, dayIndex.get(date)!, start] });
    }
  }
  candidates.sort((a, b) => compareKeys(a.key, b.key));
  for (const c of candidates) {
    if (out.length >= opts.alternatives) break;
    const r = tryPlace(instance, state, { ...fixed, date: c.date, start: c.start }, opts.strategy, opts.maxMoves, opts.verify, opts.windows);
    if (r.ok) out.push({ kind: 'slot', date: c.date, start: c.start, length: request.length, roomId: r.booking.roomId, moves: r.plan.moves.length });
  }
  // D20: ruperea blocului, doar ca ultimă opțiune și doar dacă problema e sala
  if (opts.split && request.length > 1 && reasons.every((r) => r.code === 'ROOM_UNAVAILABLE')) {
    for (let cut = 1; cut < request.length; cut++) {
      const first = tryPlace(instance, state, { ...fixed, id: `${request.id}#1`, length: cut }, opts.strategy, opts.maxMoves, opts.verify, opts.windows);
      if (!first.ok) continue;
      const second = tryPlace(
        instance,
        first.state,
        { ...fixed, id: `${request.id}#2`, start: request.start + cut, length: request.length - cut },
        opts.strategy,
        Math.max(0, opts.maxMoves - first.plan.moves.length),
        opts.verify,
        opts.windows,
      );
      if (!second.ok || second.booking.roomId === first.booking.roomId) continue;
      out.push({
        kind: 'split',
        date: request.date,
        parts: [
          { start: request.start, length: cut, roomId: first.booking.roomId },
          { start: request.start + cut, length: request.length - cut, roomId: second.booking.roomId },
        ],
        moves: first.plan.moves.length + second.plan.moves.length,
      });
      break;
    }
  }
  return out;
}

function describe(b: Booking): string {
  return `${b.id} (${b.activity}, ${b.units.join('+') || '—'}, sala ${b.roomId}, ${periodLabel(b.start, b.length)})`;
}

function needsLabel(r: Request, students: number): string {
  const parts = [`${students} studenți`, `tip: ${r.needs.roomTypes.join('/')}`];
  if (r.needs.minComputers) parts.push(`≥ ${r.needs.minComputers} calculatoare`);
  if (r.needs.projector) parts.push('proiector');
  if (r.needs.board) parts.push('tablă');
  return parts.join(', ');
}

const STRATEGY_LABEL: Record<Strategy, string> = {
  'first-fit': 'prima sală compatibilă',
  'best-fit': 'cele mai puține locuri neocupate',
  score: 'scor lexicografic (raritate → ferestrele studenților, la interval → excedent → fragmentare)',
};

function explainAccepted(
  instance: Instance,
  request: Request,
  placed: Extract<PlaceResult, { ok: true }>,
  opts: Required<AllocateOptions>,
): string[] {
  const { booking, plan } = placed;
  const lines = [
    `Cererea ${request.id} este acceptată: sala ${booking.roomId}, ${booking.date}, ${periodLabel(booking.start, booking.length)} (${timeLabel(instance.grid, booking.start, booking.length)}), ${booking.students} studenți.`,
  ];
  if (request.latest !== undefined) {
    lines.push(
      `Intervalul cerut: perechile ${request.start}–${request.latest}; perechea aleasă după ordinea D31 (mutări → săli rare → ferestrele studenților${opts.windows && opts.strategy === 'score' ? '' : ' [criteriu dezactivat]'} → locuri neocupate → goluri în programul sălii).`,
    );
  }
  if (plan.moves.length === 0) {
    lines.push('Nicio rezervare existentă nu a fost mutată.');
  } else {
    lines.push(`${plan.moves.length === 1 ? 'A fost necesară o mutare' : `Au fost necesare ${plan.moves.length} mutări`} (doar sala, la aceeași oră):`);
    for (const m of plan.moves) lines.push(`• ${m.bookingId}: ${m.from} → ${m.to}`);
  }
  const e = plan.evaluation;
  lines.push(
    `Criteriul (${STRATEGY_LABEL[opts.strategy]}): raritate ${e.rarity}${e.notes.length ? ` (${e.notes.join('; ')})` : ''}, ` +
      `${request.latest !== undefined ? `ferestrele studenților ${e.windows >= 0 ? '+' : ''}${e.windows}, ` : ''}` +
      `locuri neocupate ${e.excess}, goluri izolate în programul sălii ${e.fragmentation >= 0 ? '+' : ''}${e.fragmentation}; ` +
      `${placed.plansCompared === 1 ? 'un singur plan valid' : `${placed.plansCompared} planuri valide comparate`}.`,
  );
  return lines;
}

function explainRejected(instance: Instance, request: Request, reasons: Reason[], alternatives: Alternative[]): string[] {
  const when = request.latest !== undefined ? `oricând între perechile ${request.start}–${request.latest}` : periodLabel(request.start, request.length);
  const lines = [`Cererea ${request.id} este refuzată (${request.date}, ${when}).`];
  for (const r of reasons) lines.push(`${r.code}: ${r.message}`);
  if (!alternatives.length) {
    lines.push('Nu s-au găsit alternative în orizontul dat.');
  } else {
    lines.push('Alternative propuse (necesită confirmarea profesorului):');
    for (const a of alternatives) {
      if (a.kind === 'slot') {
        lines.push(`• ${a.date}, ${periodLabel(a.start, a.length)} (${timeLabel(instance.grid, a.start, a.length)}), sala ${a.roomId}${a.moves ? `, cu ${a.moves === 1 ? 'o mutare' : `${a.moves} mutări`}` : ''}`);
      } else {
        lines.push(
          `• ultima opțiune, ruperea blocului (D20): ${a.parts.map((p) => `${periodLabel(p.start, p.length)} în ${p.roomId}`).join(' + ')}`,
        );
      }
    }
  }
  return lines;
}
