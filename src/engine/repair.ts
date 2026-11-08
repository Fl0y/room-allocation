// Modul de reparare (concept §5.4, cazul 5): o sală se închide pentru reparații.
// D19: fixarea rezervărilor afectate se anulează; toate se realocă, întâi la aceeași oră.

import { allocate, type AllocateOptions, type Alternative, type Move, type Reason } from './allocate.ts';
import { checkState, checkTransition } from './checker.ts';
import type { Violation } from './checker.ts';
import type { Booking, Closure, Instance, Request, State } from './types.ts';

export interface RepairReport {
  closure: Closure;
  affected: string[];
  /** Realocate la aceeași oră, fără a muta alte rezervări. */
  sameTimeDirect: { bookingId: string; from: string; to: string }[];
  /** Realocate la aceeași oră, cu mutări ale altor rezervări. */
  sameTimeWithMoves: { bookingId: string; from: string; to: string; moves: Move[] }[];
  /** Nerealocate: necesită decizie umană; alternativele sunt doar propuse. */
  unresolved: { booking: Booking; reasons: Reason[]; alternatives: Alternative[] }[];
  /** Fixări anulate de închidere (D19). */
  unfixed: string[];
  /** Rezervări din orizontul înghețat, realocate pentru că sala lor s-a închis. */
  frozenRelocated: string[];
  state: State;
  violations: Violation[];
  explanation: string[];
}

export function repairClosure(instance: Instance, state: State, closure: Closure, options: AllocateOptions = {}): RepairReport {
  const affected = state.bookings
    .filter((b) => b.roomId === closure.roomId && closure.from <= b.date && b.date <= closure.to)
    .sort(
      (a, b) =>
        b.length - a.length ||
        b.students - a.students ||
        (b.needs.minComputers ?? 0) - (a.needs.minComputers ?? 0) ||
        (a.id < b.id ? -1 : 1),
    );
  const affectedIds = new Set(affected.map((b) => b.id));
  let current: State = {
    bookings: state.bookings.filter((b) => !affectedIds.has(b.id)),
    closures: [...state.closures, closure],
  };

  const report: RepairReport = {
    closure,
    affected: affected.map((b) => b.id),
    sameTimeDirect: [],
    sameTimeWithMoves: [],
    unresolved: [],
    unfixed: affected.filter((b) => b.status === 'fixed').map((b) => b.id),
    frozenRelocated: affected.filter((b) => b.status === 'frozen').map((b) => b.id),
    state: current,
    violations: [],
    explanation: [],
  };

  const asRequest = (b: Booking): Request => ({
    id: b.id,
    teacher: b.teacher,
    units: b.units,
    activity: b.activity,
    needs: b.needs,
    date: b.date,
    start: b.start,
    length: b.length,
    declaredStudents: b.students,
    status: b.status,
  });
  const pending: Booking[] = [];
  for (const b of affected) {
    // Alternativele se calculează după ce toate rezervările afectate au fost tratate (mai jos).
    const decision = allocate(instance, current, asRequest(b), { ...options, alternatives: 0, split: false });
    if (decision.kind === 'accepted') {
      current = decision.state;
      if (decision.moves.length === 0) report.sameTimeDirect.push({ bookingId: b.id, from: b.roomId, to: decision.booking.roomId });
      else report.sameTimeWithMoves.push({ bookingId: b.id, from: b.roomId, to: decision.booking.roomId, moves: decision.moves });
    } else {
      pending.push(b);
    }
  }
  // Alternativele pentru nerezolvate, pe starea finală. Sunt propuneri independente: acceptarea uneia
  // poate schimba disponibilitatea celorlalte.
  for (const b of pending) {
    const decision = allocate(instance, current, asRequest(b), options);
    if (decision.kind === 'rejected') {
      report.unresolved.push({ booking: b, reasons: decision.reasons, alternatives: decision.alternatives });
    } else {
      // O rezervare tratată mai târziu a eliberat loc; se aplică direct.
      current = decision.state;
      report.sameTimeWithMoves.push({ bookingId: b.id, from: b.roomId, to: decision.booking.roomId, moves: decision.moves });
    }
  }

  report.state = current;
  report.violations = [
    ...checkState(instance, current),
    ...checkTransition(state, current, report.unresolved.map((u) => u.booking.id)).violations,
  ];
  const n = affected.length;
  report.explanation = [
    `Sala ${closure.roomId} se închide (${closure.reason === 'repair' ? 'reparații' : 'alt motiv'}) între ${closure.from} și ${closure.to}: ${n} rezervări afectate.`,
    `La aceeași oră, fără alte mutări: ${report.sameTimeDirect.length}; la aceeași oră, cu mutări: ${report.sameTimeWithMoves.length}; necesită decizie umană: ${report.unresolved.length}.`,
  ];
  if (report.unfixed.length) {
    report.explanation.push(`Fixare anulată de închidere (D19): ${report.unfixed.join(', ')}.`);
  }
  if (report.frozenRelocated.length) {
    report.explanation.push(`Rezervări din orizontul înghețat, realocate din cauza închiderii: ${report.frozenRelocated.join(', ')}.`);
  }
  for (const u of report.unresolved) {
    report.explanation.push(`${u.booking.id}: ${u.reasons.map((r) => r.message).join('; ')}`);
  }
  return report;
}
