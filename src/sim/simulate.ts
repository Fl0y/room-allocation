// Simulatorul (plan.md Lotul 2b): aplică același șir de cereri cu fiecare strategie (comparație pereche)
// și măsoară indicatorii din plan.md §5. Rezultatele V0 sunt preliminare, pe date sintetice.

import { allocate } from '../engine/allocate.ts';
import { checkState, checkTransition } from '../engine/checker.ts';
import { buildOccupancy, isolatedWindows } from '../engine/occupancy.ts';
import { rarityOf, type Strategy } from '../engine/score.ts';
import type { ActivityType, State } from '../engine/types.ts';
import { generateWorkload, type FacultyProfile, DEFAULT_PROFILE, type Workload } from './generator.ts';

export interface StrategyConfig {
  id: string;
  label: string;
  strategy: Strategy;
  maxMoves: number;
}

export const CONFIGS: StrategyConfig[] = [
  { id: 'A', label: 'A · prima sală liberă', strategy: 'first-fit', maxMoves: 0 },
  { id: 'B', label: 'B · best-fit', strategy: 'best-fit', maxMoves: 0 },
  { id: 'C', label: 'C · scor V0 (raritate)', strategy: 'score', maxMoves: 0 },
  { id: 'B+M2', label: 'B + mutări (M = 2)', strategy: 'best-fit', maxMoves: 2 },
  { id: 'C+M1', label: 'C + mutări (M = 1)', strategy: 'score', maxMoves: 1 },
  { id: 'C+M2', label: 'C + mutări (M = 2)', strategy: 'score', maxMoves: 2 },
];

export interface RunMetrics {
  config: string;
  seed: number;
  targetLoad: number;
  achievedLoad: number;
  requests: number;
  accepted: number;
  periodsRequested: number;
  periodsAccepted: number;
  byType: Partial<Record<ActivityType, { requests: number; accepted: number }>>;
  rejectedNoRoomType: number;
  rejectedUnavailable: number;
  rejectedOther: number;
  /** Total mutări efectuate pe parcursul rulării. */
  moves: number;
  /** Rezervări distincte mutate cel puțin o dată. */
  movedBookings: number;
  /** Locuri neocupate × perechi, în starea finală. */
  emptySeatPeriods: number;
  /** Perechi de săli rare consumate de activități care nu au nevoie de ele (starea finală). */
  rareMisusePeriods: number;
  /** Ferestre izolate de o pereche, în toate sălile și zilele (starea finală). */
  isolatedWindows: number;
  timeMedianMs: number;
  timeP95Ms: number;
  /** Încălcări găsite de verificator în starea finală (trebuie să fie 0). */
  violations: number;
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i]!;
}

export interface RunOptions {
  /** Verifică fiecare tranziție (H8) — mai lent; folosit în teste. */
  checkTransitions?: boolean;
}

export function runOnce(workload: Workload, config: StrategyConfig, options: RunOptions = {}): RunMetrics {
  const { instance, requests } = workload;
  let state: State = { bookings: [], closures: [] };
  const times: number[] = [];
  const moved = new Set<string>();
  const m: RunMetrics = {
    config: config.id,
    seed: workload.seed,
    targetLoad: workload.targetLoad,
    achievedLoad: workload.achievedLoad,
    requests: requests.length,
    accepted: 0,
    periodsRequested: 0,
    periodsAccepted: 0,
    byType: {},
    rejectedNoRoomType: 0,
    rejectedUnavailable: 0,
    rejectedOther: 0,
    moves: 0,
    movedBookings: 0,
    emptySeatPeriods: 0,
    rareMisusePeriods: 0,
    isolatedWindows: 0,
    timeMedianMs: 0,
    timeP95Ms: 0,
    violations: 0,
  };
  for (const req of requests) {
    const t0 = performance.now();
    const d = allocate(instance, state, req, {
      strategy: config.strategy,
      maxMoves: config.maxMoves,
      alternatives: 0,
      split: false,
      verify: false,
    });
    times.push(performance.now() - t0);
    m.periodsRequested += req.length;
    const bt = (m.byType[req.activity] ??= { requests: 0, accepted: 0 });
    bt.requests++;
    if (d.kind === 'accepted') {
      if (options.checkTransitions) {
        const v = checkTransition(state, d.state).violations;
        if (v.length) throw new Error(`${config.id}/${req.id}: ${v.map((x) => x.message).join('; ')}`);
      }
      state = d.state;
      m.accepted++;
      m.periodsAccepted += req.length;
      bt.accepted++;
      m.moves += d.moves.length;
      for (const mv of d.moves) moved.add(mv.bookingId);
    } else {
      const code = d.reasons[0]?.code;
      if (code === 'NO_ROOM_OF_TYPE') m.rejectedNoRoomType++;
      else if (code === 'ROOM_UNAVAILABLE') m.rejectedUnavailable++;
      else m.rejectedOther++;
    }
  }
  m.movedBookings = moved.size;
  const rooms = new Map(instance.rooms.map((r) => [r.id, r] as const));
  for (const b of state.bookings) {
    const room = rooms.get(b.roomId)!;
    m.emptySeatPeriods += (room.capacity - b.students) * b.length;
    if (rarityOf(room, b.needs).value > 0) m.rareMisusePeriods += b.length;
  }
  const P = instance.grid.periods.length;
  const occ = buildOccupancy(state.bookings, P);
  for (const r of instance.rooms) for (const d of instance.dates) m.isolatedWindows += isolatedWindows(occ, r.id, d, P);
  times.sort((a, b) => a - b);
  m.timeMedianMs = quantile(times, 0.5);
  m.timeP95Ms = quantile(times, 0.95);
  m.violations = checkState(instance, state).length;
  return m;
}

export interface SimulationSpec {
  seeds: number[];
  loads: number[];
  configs?: StrategyConfig[];
  profile?: FacultyProfile;
  onProgress?: (done: number, total: number) => void;
}

export function simulate(spec: SimulationSpec): RunMetrics[] {
  const configs = spec.configs ?? CONFIGS;
  const out: RunMetrics[] = [];
  const total = spec.seeds.length * spec.loads.length;
  let done = 0;
  for (const load of spec.loads) {
    for (const seed of spec.seeds) {
      const w = generateWorkload(seed, load, spec.profile ?? DEFAULT_PROFILE);
      for (const c of configs) out.push(runOnce(w, c));
      spec.onProgress?.(++done, total);
    }
  }
  return out;
}

// ── Agregare ─────────────────────────────────────────────────────────────

/** Indicatorii derivați, pe o rulare. */
export const INDICATORS = {
  acceptedPct: { label: 'Cereri acceptate (%)', higherIsBetter: true, f: (m: RunMetrics) => (100 * m.accepted) / m.requests },
  periodsPct: { label: 'Perechi acceptate (%)', higherIsBetter: true, f: (m: RunMetrics) => (100 * m.periodsAccepted) / m.periodsRequested },
  labPct: {
    label: 'Laboratoare acceptate (%)',
    higherIsBetter: true,
    f: (m: RunMetrics) => (m.byType.lab?.requests ? (100 * m.byType.lab.accepted) / m.byType.lab.requests : NaN),
  },
  lecturePct: {
    label: 'Cursuri pe flux acceptate (%)',
    higherIsBetter: true,
    f: (m: RunMetrics) => (m.byType.lecture?.requests ? (100 * m.byType.lecture.accepted) / m.byType.lecture.requests : NaN),
  },
  movesPerAccepted: { label: 'Mutări / cerere acceptată', higherIsBetter: false, f: (m: RunMetrics) => (m.accepted ? m.moves / m.accepted : 0) },
  movedPct: { label: 'Rezervări mutate cel puțin o dată (%)', higherIsBetter: false, f: (m: RunMetrics) => (m.accepted ? (100 * m.movedBookings) / m.accepted : 0) },
  emptySeats: { label: 'Locuri neocupate / pereche acceptată', higherIsBetter: false, f: (m: RunMetrics) => (m.periodsAccepted ? m.emptySeatPeriods / m.periodsAccepted : 0) },
  rareMisuse: { label: 'Perechi de săli rare folosite inutil', higherIsBetter: false, f: (m: RunMetrics) => m.rareMisusePeriods },
  isolated: { label: 'Ferestre izolate (final)', higherIsBetter: false, f: (m: RunMetrics) => m.isolatedWindows },
  timeMedian: { label: 'Timp / cerere, mediană (ms)', higherIsBetter: false, f: (m: RunMetrics) => m.timeMedianMs },
  timeP95: { label: 'Timp / cerere, p95 (ms)', higherIsBetter: false, f: (m: RunMetrics) => m.timeP95Ms },
} as const;

export type IndicatorId = keyof typeof INDICATORS;

/** Valoarea critică t (bilateral, 95%) pentru df grade de libertate. */
export function tCritical95(df: number): number {
  const table = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
  if (df < 1) return NaN;
  return df <= table.length ? table[df - 1]! : df <= 60 ? 2.0 : 1.96;
}

export interface Stat {
  mean: number;
  lo: number;
  hi: number;
  n: number;
}

export function meanCI(xs: number[]): Stat {
  const v = xs.filter((x) => Number.isFinite(x));
  const n = v.length;
  if (!n) return { mean: NaN, lo: NaN, hi: NaN, n: 0 };
  const mean = v.reduce((s, x) => s + x, 0) / n;
  if (n < 2) return { mean, lo: NaN, hi: NaN, n };
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
  const h = (tCritical95(n - 1) * sd) / Math.sqrt(n);
  return { mean, lo: mean - h, hi: mean + h, n };
}

export interface SummaryCell {
  load: number;
  config: string;
  value: Stat;
  /** Diferența pereche față de configurația de referință (aceleași seed-uri). */
  diff: Stat | null;
}

export function summarize(results: RunMetrics[], indicator: IndicatorId, baseline = 'A'): SummaryCell[] {
  const f = INDICATORS[indicator].f;
  const loads = [...new Set(results.map((r) => r.targetLoad))].sort((a, b) => a - b);
  const configs = [...new Set(results.map((r) => r.config))];
  const cells: SummaryCell[] = [];
  for (const load of loads) {
    const atLoad = results.filter((r) => r.targetLoad === load);
    const base = new Map(atLoad.filter((r) => r.config === baseline).map((r) => [r.seed, f(r)] as const));
    for (const config of configs) {
      const rs = atLoad.filter((r) => r.config === config);
      const values = rs.map(f);
      const diffs = config === baseline ? null : rs.filter((r) => base.has(r.seed)).map((r) => f(r) - base.get(r.seed)!);
      cells.push({ load, config, value: meanCI(values), diff: diffs ? meanCI(diffs) : null });
    }
  }
  return cells;
}
