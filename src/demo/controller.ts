// Logica demo-ului (plan.md Lotul 2c), separată de DOM ca să poată fi testată.
// Starea e păstrată în memorie; fiecare acțiune întoarce o stare nouă (istoric pentru „Înapoi”).

import { allocate, type AllocateOptions, type Alternative, type Decision } from '../engine/allocate.ts';
import { repairClosure, type RepairReport } from '../engine/repair.ts';
import type { Strategy } from '../engine/score.ts';
import type { Booking, Closure, Request, State } from '../engine/types.ts';
import type { Scenario } from '../scenarios/run.ts';
import { DEFAULT_PROFILE, generateWorkload } from '../sim/generator.ts';

export type LogEntry =
  | { kind: 'decision'; title: string; request: Request; decision: Decision; before: State; after: State; applied?: string }
  | { kind: 'repair'; title: string; report: RepairReport; before: State; after: State }
  | { kind: 'info'; title: string; text: string; before: State; after: State };

export interface DemoState {
  scenario: Scenario;
  state: State;
  /** Următorul pas al scenariului care nu a fost încă aplicat. */
  stepIndex: number;
  log: LogEntry[];
  options: { strategy: Strategy; maxMoves: number };
  /** Stările anterioare, pentru „Înapoi”. */
  history: { state: State; stepIndex: number; log: LogEntry[] }[];
}

export function load(scenario: Scenario, options: Partial<DemoState['options']> = {}): DemoState {
  return {
    scenario,
    state: scenario.initial,
    stepIndex: 0,
    log: [],
    options: { strategy: 'score', maxMoves: 2, ...options },
    history: [],
  };
}

function allocOptions(d: DemoState): AllocateOptions {
  return { strategy: d.options.strategy, maxMoves: d.options.maxMoves, alternatives: 5, split: true };
}

function push(d: DemoState, entry: LogEntry, state: State, stepIndex = d.stepIndex): DemoState {
  return {
    ...d,
    state,
    stepIndex,
    log: [...d.log, entry],
    history: [...d.history, { state: d.state, stepIndex: d.stepIndex, log: d.log }],
  };
}

export function setOptions(d: DemoState, options: Partial<DemoState['options']>): DemoState {
  return { ...d, options: { ...d.options, ...options } };
}

export function hasNextStep(d: DemoState): boolean {
  return d.stepIndex < d.scenario.steps.length;
}

/** Aplică următorul pas al scenariului (cerere sau închidere de sală). */
export function nextStep(d: DemoState): DemoState {
  const step = d.scenario.steps[d.stepIndex];
  if (!step) return d;
  if (step.kind === 'request') {
    return submitInternal(d, step.request, `Pasul ${d.stepIndex + 1}: cererea ${step.request.id}`, d.stepIndex + 1);
  }
  return closeRoomInternal(d, step.closure, `Pasul ${d.stepIndex + 1}: închiderea sălii ${step.closure.roomId}`, d.stepIndex + 1);
}

function submitInternal(d: DemoState, request: Request, title: string, stepIndex: number): DemoState {
  const decision = allocate(d.scenario.instance, d.state, request, allocOptions(d));
  const after = decision.kind === 'accepted' ? decision.state : d.state;
  return push(d, { kind: 'decision', title, request, decision, before: d.state, after }, after, stepIndex);
}

/** O cerere nouă, introdusă de utilizator. */
export function submit(d: DemoState, request: Request): DemoState {
  return submitInternal(d, request, `Cerere nouă: ${request.id}`, d.stepIndex);
}

function closeRoomInternal(d: DemoState, closure: Closure, title: string, stepIndex: number): DemoState {
  const report = repairClosure(d.scenario.instance, d.state, closure, allocOptions(d));
  return push(d, { kind: 'repair', title, report, before: d.state, after: report.state }, report.state, stepIndex);
}

export function closeRoom(d: DemoState, closure: Closure): DemoState {
  return closeRoomInternal(d, closure, `Închiderea sălii ${closure.roomId} (${closure.from} – ${closure.to})`, d.stepIndex);
}

/**
 * Aplică o alternativă propusă (confirmarea profesorului). Ruperea blocului (D20) se aplică
 * ca două rezervări cu același `blockId` și `splitApproved`.
 */
export function applyAlternative(d: DemoState, request: Request, alt: Alternative): DemoState {
  if (alt.kind === 'slot') {
    const moved: Request = { ...request, date: alt.date, start: alt.start };
    return submitInternal(d, moved, `Alternativă confirmată pentru ${request.id}: ${alt.date}, perechea ${alt.start}`, d.stepIndex);
  }
  const [p1, p2] = alt.parts;
  if (!p1 || !p2) return d;
  const opts = allocOptions(d);
  const first = allocate(d.scenario.instance, d.state, { ...request, id: `${request.id}#1`, start: p1.start, length: p1.length }, opts);
  if (first.kind !== 'accepted') {
    return push(d, { kind: 'decision', title: `Ruperea blocului ${request.id} nu mai este posibilă`, request, decision: first, before: d.state, after: d.state }, d.state);
  }
  const second = allocate(d.scenario.instance, first.state, { ...request, id: `${request.id}#2`, start: p2.start, length: p2.length }, opts);
  if (second.kind !== 'accepted') {
    return push(d, { kind: 'decision', title: `Ruperea blocului ${request.id} nu mai este posibilă`, request, decision: second, before: d.state, after: d.state }, d.state);
  }
  const ids = new Set([`${request.id}#1`, `${request.id}#2`]);
  const state: State = {
    ...second.state,
    bookings: second.state.bookings.map((b) => (ids.has(b.id) ? { ...b, blockId: request.id, splitApproved: true } : b)),
  };
  const decision: Decision = {
    ...second,
    explanation: [
      `Blocul ${request.id} a fost rupt cu acordul profesorului (D20): ${p1.roomId} pentru ${p1.length} perechi, ${p2.roomId} pentru ${p2.length}.`,
      ...first.explanation,
      ...second.explanation,
    ],
    state,
  };
  return push(d, { kind: 'decision', title: `Ruperea blocului ${request.id} (cu acordul profesorului)`, request, decision, before: d.state, after: state, applied: 'split' }, state);
}

export function undo(d: DemoState): DemoState {
  const prev = d.history[d.history.length - 1];
  if (!prev) return d;
  return { ...d, state: prev.state, stepIndex: prev.stepIndex, log: prev.log, history: d.history.slice(0, -1) };
}

export function reset(d: DemoState): DemoState {
  return load(d.scenario, d.options);
}

export const COMPARED: { id: string; label: string; strategy: Strategy; maxMoves: number }[] = [
  { id: 'A', label: 'A · prima sală liberă', strategy: 'first-fit', maxMoves: 0 },
  { id: 'B', label: 'B · best-fit', strategy: 'best-fit', maxMoves: 0 },
  { id: 'C', label: 'C · scor V0', strategy: 'score', maxMoves: 0 },
  { id: 'C+M2', label: 'C + mutări (M = 2)', strategy: 'score', maxMoves: 2 },
];

/** Ce ar decide fiecare strategie pentru aceeași cerere, pe starea curentă (fără a o modifica). */
export function compareStrategies(d: DemoState, request: Request): { id: string; label: string; decision: Decision }[] {
  return COMPARED.map((c) => ({
    id: c.id,
    label: c.label,
    decision: allocate(d.scenario.instance, d.state, request, { strategy: c.strategy, maxMoves: c.maxMoves, alternatives: 0, split: false }),
  }));
}

/** Un scenariu generat (o zi), pentru a vedea algoritmul pe mai multe cereri succesive. */
export function generatedScenario(seed: number, loadLevel: number): Scenario {
  const day = DEFAULT_PROFILE.days[0]!;
  const w = generateWorkload(seed, loadLevel, { ...DEFAULT_PROFILE, days: [day] });
  return {
    id: `gen-${seed}-${loadLevel}`,
    title: `Generat — seed ${seed}, încărcare ${loadLevel}`,
    summary: `O zi, ${w.instance.rooms.length} săli, ${w.requests.length} cereri sosite pe rând (date sintetice).`,
    expected: 'Nu există un rezultat scris de mână; se observă deciziile pas cu pas.',
    instance: w.instance,
    initial: { bookings: [], closures: [] },
    steps: w.requests.map((request) => ({ kind: 'request' as const, request })),
  };
}

/** Cererea echivalentă unei rezervări (pentru alternativele rezervărilor nerezolvate la reparare). */
export function requestFromBooking(b: Booking): Request {
  return {
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
  };
}
