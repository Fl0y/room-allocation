import type { Closure, Needs, Room } from './types.ts';

/** H4 (capacitate) și H5 (tip, echipamente). Întoarce `null` dacă sala corespunde, altfel motivul. */
export function roomMismatch(room: Room, needs: Needs, students: number): { code: 'H4' | 'H5'; message: string } | null {
  if (!needs.roomTypes.includes(room.type)) {
    return { code: 'H5', message: `${room.id}: tipul ${room.type} nu este acceptat (${needs.roomTypes.join(', ')})` };
  }
  if (room.capacity < students) {
    return { code: 'H4', message: `${room.id}: ${room.capacity} locuri < ${students} studenți` };
  }
  if ((needs.minComputers ?? 0) > room.computers) {
    return { code: 'H5', message: `${room.id}: ${room.computers} calculatoare < ${needs.minComputers} necesare` };
  }
  if (needs.projector && !room.projector) return { code: 'H5', message: `${room.id}: fără proiector/ecran` };
  if (needs.board && !room.board) return { code: 'H5', message: `${room.id}: fără tablă` };
  return null;
}

export function closureOf(closures: readonly Closure[], roomId: string, date: string): Closure | undefined {
  return closures.find((c) => c.roomId === roomId && c.from <= date && date <= c.to);
}
