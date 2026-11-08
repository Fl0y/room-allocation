// Verificatorul independent: nu folosește căutarea din allocate.ts. Verifică o stare (H1–H7)
// și o tranziție între două stări (H8, mutări doar de sală, la aceeași oră).

import { closureOf, roomMismatch } from './compat.ts';
import { inGrid, overlaps } from './grid.ts';
import type { Booking, Instance, State } from './types.ts';
import { atomsOf, buildUnitIndex, intersects, sizeOf, unknownUnits } from './units.ts';

export type ViolationCode = 'INVALID' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'H7' | 'H8';

export interface Violation {
  code: ViolationCode;
  message: string;
  bookings: string[];
}

export function checkState(instance: Instance, state: State): Violation[] {
  const v: Violation[] = [];
  const rooms = new Map(instance.rooms.map((r) => [r.id, r] as const));
  const index = buildUnitIndex(instance.units);
  const seen = new Set<string>();
  const valid: Booking[] = [];

  for (const b of state.bookings) {
    if (seen.has(b.id)) {
      v.push({ code: 'INVALID', message: `identificator duplicat ${b.id}`, bookings: [b.id] });
      continue;
    }
    seen.add(b.id);
    const room = rooms.get(b.roomId);
    if (!room) {
      v.push({ code: 'INVALID', message: `${b.id}: sală necunoscută ${b.roomId}`, bookings: [b.id] });
      continue;
    }
    if (!inGrid(instance.grid, b.start, b.length)) {
      v.push({ code: 'INVALID', message: `${b.id}: perechi în afara grilei`, bookings: [b.id] });
      continue;
    }
    const unknown = unknownUnits(index, b.units);
    if (unknown.length) {
      v.push({ code: 'INVALID', message: `${b.id}: unități necunoscute ${unknown.join(', ')}`, bookings: [b.id] });
      continue;
    }
    if (!(b.students > 0) || (b.units.length > 0 && b.students > sizeOf(index, b.units))) {
      v.push({ code: 'INVALID', message: `${b.id}: număr de studenți invalid (${b.students})`, bookings: [b.id] });
      continue;
    }
    if (b.status === 'fixed' && b.activity !== 'event' && b.activity !== 'exam') {
      v.push({ code: 'INVALID', message: `${b.id}: doar evenimentele și examenele se pot fixa (D19)`, bookings: [b.id] });
    }
    const mismatch = roomMismatch(room, b.needs, b.students);
    if (mismatch) v.push({ code: mismatch.code, message: `${b.id}: ${mismatch.message}`, bookings: [b.id] });
    const closed = closureOf(state.closures, b.roomId, b.date);
    if (closed) v.push({ code: 'H6', message: `${b.id}: sala ${b.roomId} este închisă la ${b.date}`, bookings: [b.id] });
    valid.push(b);
  }

  const atoms = new Map(valid.map((b) => [b.id, atomsOf(index, b.units)] as const));
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i]!;
      const b = valid[j]!;
      if (!overlaps(a, b)) continue;
      const pair = [a.id, b.id].sort();
      if (a.roomId === b.roomId) v.push({ code: 'H1', message: `sala ${a.roomId} dublu ocupată`, bookings: pair });
      if (a.teacher && a.teacher === b.teacher) v.push({ code: 'H2', message: `${a.teacher} în două locuri`, bookings: pair });
      if (intersects(atoms.get(a.id)!, atoms.get(b.id)!)) {
        v.push({ code: 'H3', message: `aceeași grupă/subgrupă în două activități`, bookings: pair });
      }
    }
  }

  // H7: părțile aceluiași bloc rămân în aceeași sală, cu excepția ruperii aprobate (D20)
  const blocks = new Map<string, Booking[]>();
  for (const b of valid) {
    if (b.blockId === undefined) continue;
    const list = blocks.get(b.blockId) ?? [];
    list.push(b);
    blocks.set(b.blockId, list);
  }
  for (const [blockId, parts] of blocks) {
    const roomsUsed = new Set(parts.map((p) => p.roomId));
    if (roomsUsed.size > 1 && !parts.every((p) => p.splitApproved)) {
      v.push({ code: 'H7', message: `blocul ${blockId} este rupt fără acordul profesorului`, bookings: parts.map((p) => p.id).sort() });
    }
  }
  return v;
}

export interface TransitionResult {
  violations: Violation[];
  moved: string[];
}

/**
 * Compară două stări: rezervările existente rămân la aceeași dată și oră, cu aceiași participanți;
 * se poate schimba doar sala. O rezervare care nu e `movable` se poate muta doar dacă sala ei
 * inițială e închisă în starea nouă (D19). `removed` = rezervări scoase explicit (nerezolvate).
 */
export function checkTransition(before: State, after: State, removed: readonly string[] = []): TransitionResult {
  const violations: Violation[] = [];
  const moved: string[] = [];
  const afterById = new Map(after.bookings.map((b) => [b.id, b] as const));
  for (const b of before.bookings) {
    const a = afterById.get(b.id);
    if (!a) {
      if (!removed.includes(b.id)) violations.push({ code: 'INVALID', message: `${b.id} a dispărut`, bookings: [b.id] });
      continue;
    }
    if (
      a.date !== b.date ||
      a.start !== b.start ||
      a.length !== b.length ||
      a.teacher !== b.teacher ||
      a.units.join('|') !== b.units.join('|')
    ) {
      violations.push({ code: 'INVALID', message: `${b.id}: ora sau participanții s-au schimbat`, bookings: [b.id] });
    }
    if (a.roomId !== b.roomId) {
      moved.push(b.id);
      const closedNow = closureOf(after.closures, b.roomId, b.date);
      if (b.status !== 'movable' && !closedNow) {
        violations.push({ code: 'H8', message: `${b.id} (${b.status}) a fost mutată`, bookings: [b.id] });
      }
    }
  }
  return { violations, moved: moved.sort() };
}
