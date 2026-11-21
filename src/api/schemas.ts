// Validarea datelor primite de API (Lotul 6a, D36): Zod, la granița HTTP. Motorul își face în continuare propria
// validare (INVALID_REQUEST); aici se refuză doar ce nu are forma corectă.

import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dată ISO (AAAA-LL-ZZ)');
const id = z.string().min(1).max(80).regex(/^[\p{L}\p{N} ._:#/@+-]+$/u, 'identificator cu caractere nepermise');
const period = z.int().min(1).max(7);
const roomType = z.enum(['auditorium', 'seminar', 'lab']);

export const needsSchema = z.object({
  roomTypes: z.array(roomType).min(1),
  minComputers: z.int().min(0).optional(),
  projector: z.boolean().optional(),
  board: z.boolean().optional(),
});

export const requestSchema = z.object({
  id,
  teacher: z.string().max(80),
  units: z.array(id).max(20),
  activity: z.enum(['lecture', 'seminar', 'lab', 'event', 'exam', 'other']),
  needs: needsSchema,
  date: isoDate,
  start: period,
  length: period,
  latest: period.optional(),
  declaredStudents: z.int().min(1).optional(),
  status: z.enum(['movable', 'frozen', 'fixed']).optional(),
});

export const submitSchema = z.object({ request: requestSchema, key: id.optional() });

const slot = z.object({ kind: z.literal('slot'), date: isoDate, start: period, length: period, roomId: id, moves: z.int().min(0) });
const split = z.object({
  kind: z.literal('split'),
  date: isoDate,
  parts: z.array(z.object({ start: period, length: period, roomId: id })).length(2),
  moves: z.int().min(0),
});
export const alternativeSchema = z.object({ request: requestSchema, alternative: z.discriminatedUnion('kind', [slot, split]) });

export const cancelSchema = z.object({ teacher: z.string().max(80).optional(), admin: z.boolean().optional() });

export const closureSchema = z
  .object({ roomId: id, from: isoDate, to: isoDate, reason: z.enum(['repair', 'other']).default('repair') })
  .refine((c) => c.from <= c.to, { message: '„from” trebuie să fie înainte de „to”' });

export const bookingsQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  day: isoDate.optional(),
  room: id.optional(),
  unit: id.optional(),
  teacher: z.string().max(80).optional(),
});
