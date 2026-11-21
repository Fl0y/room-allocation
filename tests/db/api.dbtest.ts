// Lotul 6a (D38, D40): API-ul pe baza de date reală. Funcțiile din src/api/handlers.ts sunt cele apelate de rutele
// Next.js din app/api/; aici se apelează direct, cu o bază de date de test.

import { afterAll, describe, expect, it } from 'vitest';
import { applyAlt, cancel, close, getMeta, health, listBookings, listClosures, submit } from '../../src/api/handlers.ts';
import { readState } from '../../src/db/store.ts';
import { repairClosure } from '../../src/engine/repair.ts';
import type { Alternative } from '../../src/engine/allocate.ts';
import type { Request } from '../../src/engine/types.ts';
import { case5 } from '../../src/scenarios/cases.ts';
import { closeRoom } from '../../src/db/operations.ts';
import { submitRequest } from '../../src/db/service.ts';
import { DAY, rawInsert, smallWorld, withWorld, type TestDb } from './support.ts';

const opened: TestDb[] = [];
afterAll(async () => {
  for (const db of opened) await db.drop();
});
async function open(world = smallWorld(), extra: string[] = []) {
  const db = await withWorld(world, extra);
  opened.push(db);
  return db;
}

type Body = Record<string, any>;
const seminar = (id: string, extra: Partial<Request> = {}): Request => ({
  id,
  teacher: 'T1',
  units: ['H'],
  activity: 'seminar',
  needs: { roomTypes: ['seminar'] },
  date: DAY,
  start: 2,
  length: 1,
  ...extra,
});

describe('citirea', () => {
  it('health și meta: săli, unități cu numărul de studenți, profesori, zile, grila', async () => {
    const { pool } = await open();
    expect((await health(pool)).body).toEqual({ ok: true, migrations: 2 });
    const meta = (await getMeta(pool)).body as Body;
    expect(meta.rooms.map((r: Body) => r.id)).toEqual(['L1', 'S1', 'S2']);
    expect(meta.units.find((u: Body) => u.id === 'F')).toMatchObject({ kind: 'flux', students: 20 });
    expect(meta.units.find((u: Body) => u.id === 'G/1')).toMatchObject({ kind: 'subgroup', parent: 'G', students: 10 });
    expect(meta.teachers).toHaveLength(3);
    expect(meta.days).toEqual(['2026-11-17', '2026-11-18']);
    expect(meta.grid.periods).toHaveLength(7);
  });

  it('rezervările filtrate: o unitate vede și activitățile părinților și ale subgrupelor', async () => {
    const { pool } = await open();
    await rawInsert(pool, { id: 'flux', teacher: 'T1', units: ['F'], room: 'S1', start: 1 });
    await rawInsert(pool, { id: 'sub1', teacher: 'T2', units: ['G/1'], room: 'L1', start: 2 });
    await rawInsert(pool, { id: 'h', teacher: 'T3', units: ['H'], room: 'S2', start: 2 });
    const ids = async (q: Record<string, string>) => ((await listBookings(pool, q)).body as Body).bookings.map((b: Body) => b.id);
    expect(await ids({ unit: 'G/2' })).toEqual(['flux']);
    expect(await ids({ unit: 'G' })).toEqual(['flux', 'sub1']);
    expect(await ids({ unit: 'H' })).toEqual(['h']);
    expect(await ids({ room: 'S2' })).toEqual(['h']);
    expect(await ids({ teacher: 'T2' })).toEqual(['sub1']);
    expect(await ids({ day: '2026-11-18' })).toEqual([]);
    const first = ((await listBookings(pool, { unit: 'F' })).body as Body).bookings[0];
    expect(first).toMatchObject({ id: 'flux', time: '08:00–09:30', teacherName: 'Profesor T1', start: 1, length: 1 });
    expect((await listBookings(pool, { day: '17.11.2026' })).status).toBe(400);
  });
});

describe('cererile', () => {
  it('validarea la intrare: câmpuri lipsă, pereche în afara grilei', async () => {
    const { pool } = await open();
    const r = await submit(pool, { request: { id: 'x' } });
    expect(r.status).toBe(400);
    expect((r.body as Body).error.code).toBe('VALIDATION');
    expect((r.body as Body).error.issues.length).toBeGreaterThan(3);
    expect((await submit(pool, { request: seminar('y', { start: 8 }) })).status).toBe(400);
    expect((await submit(pool, undefined)).status).toBe(400);
  });

  it('cerere acceptată (201), repetată (200), aceeași cheie cu alt conținut (409)', async () => {
    const { pool } = await open();
    const a = await submit(pool, { request: seminar('r1') });
    expect(a.status).toBe(201);
    expect((a.body as Body).decision).toMatchObject({ kind: 'accepted', booking: { id: 'r1', roomId: 'S1' } });
    expect((await submit(pool, { request: seminar('r1') })).status).toBe(200);
    const c = await submit(pool, { request: seminar('r1', { start: 5 }) });
    expect(c.status).toBe(409);
    expect((c.body as Body).error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('cererea cu interval și refuzul motorului ajung prin API ca decizii', async () => {
    const { pool } = await open();
    const ok = await submit(pool, { request: seminar('i1', { start: 3, latest: 5 }) });
    expect((ok.body as Body).decision.booking.start).toBe(3);
    const bad = await submit(pool, { request: seminar('i2', { start: 3, latest: 2 }) });
    expect(bad.status).toBe(201);
    expect((bad.body as Body).decision.reasons[0].code).toBe('INVALID_REQUEST');
  });
});

describe('alternativele', () => {
  it('altă pereche: aplicată o dată, repetarea întoarce aceeași decizie', async () => {
    const { pool } = await open();
    await rawInsert(pool, { id: 'busy', teacher: 'T1', units: ['G/1'], room: 'L1', start: 2 });
    const rej = (await submit(pool, { request: seminar('r', { teacher: 'T1' }) })).body as Body;
    expect(rej.decision.kind).toBe('rejected');
    const alt = rej.decision.alternatives[0] as Alternative;
    expect(alt).toMatchObject({ kind: 'slot', date: DAY, start: 1 });
    const applied = await applyAlt(pool, { request: seminar('r', { teacher: 'T1' }), alternative: alt });
    expect(applied.status).toBe(201);
    expect((applied.body as Body).decision.booking).toMatchObject({ id: 'r', start: 1 });
    expect((await applyAlt(pool, { request: seminar('r', { teacher: 'T1' }), alternative: alt })).status).toBe(200);
    expect((await readState(pool)).bookings.map((b) => b.id).sort()).toEqual(['busy', 'r']);
  });

  it('ruperea blocului (D20): două rezervări cu același bloc, aplicate împreună', async () => {
    const { pool } = await open();
    // S1 liberă doar la perechea 2, S2 doar la perechea 3 (blocanți înghețați, deci fără mutări)
    await rawInsert(pool, { id: 'x1', teacher: 'T2', units: ['G/1'], room: 'S1', start: 3, status: 'frozen' });
    await rawInsert(pool, { id: 'x2', teacher: 'T3', units: ['G/2'], room: 'S2', start: 2, status: 'frozen' });
    const req = seminar('bloc', { teacher: 'T1', start: 2, length: 2 });
    const rej = (await submit(pool, { request: req })).body as Body;
    expect(rej.decision.kind).toBe('rejected');
    const split = (rej.decision.alternatives as Alternative[]).find((a) => a.kind === 'split');
    expect(split).toMatchObject({ kind: 'split', parts: [{ start: 2, length: 1, roomId: 'S1' }, { start: 3, length: 1, roomId: 'S2' }] });
    const r = await applyAlt(pool, { request: req, alternative: split });
    expect(r.status).toBe(201);
    const parts = (await readState(pool)).bookings.filter((b) => b.id.startsWith('bloc#')).map((b) => [b.id, b.start, b.roomId, b.blockId, b.splitApproved]);
    expect(parts).toEqual([
      ['bloc#1', 2, 'S1', 'bloc', true],
      ['bloc#2', 3, 'S2', 'bloc', true],
    ]);
  });

  it('ruperea care nu mai e posibilă (sălile s-au ocupat între timp, fără mutări posibile): refuz motivat, nimic scris', async () => {
    const { pool } = await open();
    const req = seminar('bloc', { teacher: 'T1', start: 2, length: 2 });
    await rawInsert(pool, { id: 'y1', teacher: 'T2', units: ['G/1'], room: 'S1', start: 2, status: 'frozen' });
    await rawInsert(pool, { id: 'y2', teacher: 'T3', units: ['G/2'], room: 'S2', start: 2, status: 'frozen' });
    await rawInsert(pool, { id: 'y3', teacher: 'T3', units: ['G/2'], room: 'S1', start: 3, status: 'frozen' });
    await rawInsert(pool, { id: 'y4', teacher: 'T2', units: ['G/1'], room: 'S2', start: 3, status: 'frozen' });
    const split: Alternative = { kind: 'split', date: DAY, parts: [{ start: 2, length: 1, roomId: 'S1' }, { start: 3, length: 1, roomId: 'S2' }], moves: 0 };
    const r = (await applyAlt(pool, { request: req, alternative: split })).body as Body;
    expect(r.decision.kind).toBe('rejected');
    expect((await readState(pool)).bookings).toHaveLength(4);
    expect((await applyAlt(pool, { request: req, alternative: { ...split, parts: [{ start: 2, length: 2, roomId: 'S1' }, { start: 4, length: 1, roomId: 'S2' }] } })).status).toBe(400);
  });
});

describe('anularea (D38)', () => {
  it('doar profesorul rezervării sau administratorul; repetarea nu mai șterge nimic', async () => {
    const { pool } = await open();
    await submit(pool, { request: seminar('c1') });
    await submit(pool, { request: seminar('c2', { start: 4 }) });
    expect((await cancel(pool, 'c1', { teacher: 'T2' })).status).toBe(403);
    expect((await cancel(pool, 'nu-exista', { admin: true })).status).toBe(404);
    const ok = await cancel(pool, 'c1', { teacher: 'T1' });
    expect(ok).toEqual({ status: 200, body: { bookingId: 'c1', cancelled: true, replayed: false } });
    expect(((await cancel(pool, 'c1', { teacher: 'T1' })).body as Body).replayed).toBe(true);
    expect((await cancel(pool, 'c2', { admin: true })).status).toBe(200);
    expect((await readState(pool)).bookings).toEqual([]);
    // după anulare, sala e din nou liberă
    expect(((await submit(pool, { request: seminar('c3', { teacher: 'T3', units: ['G/1'] }) })).body as Body).decision.booking.roomId).toBe('S1');
  });
});

describe('închiderea sălii cu repararea automată (D19, D38)', () => {
  const closure = case5.steps[0]!.kind === 'closure' ? case5.steps[0]!.closure : (undefined as never);

  it('cazul 5 prin API: același raport și aceeași stare ca motorul în memorie', async () => {
    const db = await open({ instance: case5.instance, state: case5.initial });
    const expected = repairClosure(case5.instance, case5.initial, closure, { strategy: 'score', maxMoves: 2, alternatives: 5, split: true });
    const r = await close(db.pool, closure);
    expect(r.status).toBe(201);
    const report = (r.body as Body).report;
    expect(report.affected).toEqual(expected.affected);
    expect(report.sameTimeDirect).toEqual(expected.sameTimeDirect);
    expect(report.sameTimeWithMoves).toEqual(expected.sameTimeWithMoves);
    expect(report.unresolved.map((u: Body) => u.booking.id)).toEqual(expected.unresolved.map((u) => u.booking.id));
    expect(report.unfixed).toEqual(['b3-examen']);
    const sort = <T extends { id: string }>(bs: T[]) => [...bs].sort((a, b) => a.id.localeCompare(b.id));
    const state = await readState(db.pool);
    expect(sort(state.bookings)).toEqual(sort(expected.state.bookings));
    // examenul fixat a fost mutat și și-a păstrat statutul
    expect(state.bookings.find((b) => b.id === 'b3-examen')).toMatchObject({ status: 'fixed' });
    expect(state.bookings.some((b) => b.roomId === 'L-201')).toBe(false);
    const list = (await listClosures(db.pool)).body as Body;
    expect(list.closures).toHaveLength(1);
    expect(list.closures[0]).toMatchObject({ roomId: 'L-201', from: '2026-11-16', to: '2026-11-27', reason: 'repair' });
    expect((await close(db.pool, closure)).status).toBe(200);
    expect((await close(db.pool, { ...closure, roomId: 'L-999' })).status).toBe(404);
    expect((await close(db.pool, { ...closure, from: '2026-11-28' })).status).toBe(400);
  });

  it('o cerere simultană pentru o zi din închidere așteaptă și nu primește sala închisă', async () => {
    const world = smallWorld();
    const db = await open(world);
    let release!: () => void;
    const hold = new Promise<void>((r) => (release = r));
    const closing = closeRoom(db.pool, { roomId: 'S1', from: DAY, to: DAY, reason: 'repair' }, { hooks: { afterLock: () => hold } });
    let done = false;
    const req = submitRequest(db.pool, seminar('during')).then((x) => ((done = true), x));
    await new Promise((r) => setTimeout(r, 300));
    expect(done).toBe(false);
    release();
    await closing;
    const r = await req;
    expect(r.decision.booking?.roomId).toBe('S2');
  });
});

describe('istoricul mutărilor (D42)', () => {
  it('rezervările mutate de o cerere și de o închidere își arată istoricul', async () => {
    const db = await open({ instance: case5.instance, state: case5.initial });
    const closure = case5.steps[0]!.kind === 'closure' ? case5.steps[0]!.closure : (undefined as never);
    const report = ((await close(db.pool, closure)).body as Body).report;
    const list = ((await listBookings(db.pool, {})).body as Body).bookings as Body[];
    const direct = report.sameTimeDirect[0];
    const moved = list.find((b) => b.id === direct.bookingId)!;
    expect(moved.history).toEqual([{ from: 'L-201', to: direct.to, cause: 'închidere', at: expect.any(String) }]);
    const untouched = list.find((b) => b.id === 'h4')!;
    expect(untouched.history).toEqual([]);
  });

  it('o mutare făcută pentru altă cerere apare la rezervarea mutată', async () => {
    const { case1 } = await import('../../src/scenarios/cases.ts');
    const db = await open({ instance: case1.instance, state: case1.initial }, ['Prof. A', 'Prof. B', 'Prof. C']);
    for (const s of case1.steps) if (s.kind === 'request') await submit(db.pool, { request: s.request });
    const list = ((await listBookings(db.pool, {})).body as Body).bookings as Body[];
    expect(list.find((b) => b.id === 'C-seminar')!.history).toEqual([{ from: 'L-105', to: 'S-12', cause: 'cerere', at: expect.any(String) }]);
    expect(list.find((b) => b.id === 'A-lab')!.history).toEqual([]);
  });

  it('mesajele de validare sunt în română', async () => {
    const { pool } = await open();
    const r = (await submit(pool, { request: { id: 'x' } })).body as Body;
    const text = r.error.issues.map((i: Body) => i.message).join(' ');
    expect(text).not.toMatch(/Invalid input|expected/);
  });
});
