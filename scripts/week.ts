// „Săptămâna” în simulator (plan.md Lotul 3a.3 / 3b.2): măsurătorile de bază ale orarului și comparația
// strategiilor pe cereri suplimentare. Raportul se scrie în afara repository-ului (D33):
//   <folderul datelor>/<secțiune>/reports/week.html și week.json
// Rulare: npm run week -- synthetic                (implicit: 20 de seed-uri, încărcări 0.25, 0.5, 0.75)
//         npm run week -- synthetic --seeds=5 --loads=0.5 --first-seed=1

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildWeek } from '../src/data/format.ts';
import { canonicalDir, parseSection, readDataset, reportsDir } from '../src/data/io.ts';
import { measureWeek } from '../src/sim/metrics.ts';
import { CONFIGS, INDICATORS, runOnce, summarize, type IndicatorId, type RunMetrics, type Stat } from '../src/sim/simulate.ts';
import { weekWorkload } from '../src/sim/week.ts';
import { bar, esc, fmt, page, pct, table } from './report-html.ts';

const section = parseSection(process.argv[2]);
const args = new Map(
  process.argv
    .slice(3)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=');
      return [k!, v ?? ''] as const;
    }),
);
const nSeeds = Number(args.get('seeds') ?? 20);
const firstSeed = Number(args.get('first-seed') ?? 1);
const loads = (args.get('loads') ?? '0.25,0.5,0.75').split(',').map(Number);
const seeds = Array.from({ length: nSeeds }, (_, i) => firstSeed + i);

const { dataset, issues: parseIssues } = readDataset(canonicalDir(section));
const week = buildWeek(dataset, parseIssues);
const errors = week.issues.filter((i) => i.severity === 'error');
if (errors.length) {
  console.error(`Datele au ${errors.length} erori; rulați întâi: npm run data:check -- ${section}`);
  process.exit(1);
}

// ── Măsurătorile de bază: orarul singur ──
const base = measureWeek(week.instance, week.state.bookings);

// ── Simularea: aceleași cereri suplimentare pentru fiecare strategie ──
const results: (RunMetrics & { requested: number })[] = [];
const extrasByKind: Record<string, number> = {};
let done = 0;
for (const load of loads) {
  for (const seed of seeds) {
    const w = weekWorkload(dataset, week, seed, load);
    for (const q of w.requests as { kind?: string }[]) extrasByKind[q.kind ?? '?'] = (extrasByKind[q.kind ?? '?'] ?? 0) + 1;
    for (const c of CONFIGS) results.push({ ...runOnce(w, c), requested: w.requests.length });
    process.stdout.write(`\r  ${++done}/${loads.length * seeds.length} instanțe`);
  }
}
process.stdout.write('\n');
const violations = results.reduce((s, r) => s + r.violations, 0);
if (violations) {
  console.error(`EROARE: ${violations} încălcări în stările finale.`);
  process.exitCode = 1;
}

// ── Raportul ──
const P = week.instance.grid.periods.length;
const D = week.instance.dates.length;
const TYPE = { auditorium: 'auditorii', seminar: 'săli de seminar', lab: 'laboratoare' } as const;
const DAY = ['luni', 'marți', 'miercuri', 'joi', 'vineri'];
const perRoom = base.perRoom.map((r) => r.occupied / (P * D));
const unused = base.perRoom.filter((r) => r.occupied === 0).length;
const w = base.windows;

const ci = (s: Stat, d: number) => (Number.isFinite(s.lo) ? `${fmt(s.mean, d)} <span class="muted">[${fmt(s.lo, d)}; ${fmt(s.hi, d)}]</span>` : fmt(s.mean, d));
const SHOW: { id: IndicatorId; digits: number }[] = [
  { id: 'acceptedPct', digits: 1 },
  { id: 'movesPerAccepted', digits: 3 },
  { id: 'rareMisuse', digits: 1 },
  { id: 'emptySeats', digits: 1 },
  { id: 'studentWindows', digits: 1 },
  { id: 'timeP95', digits: 2 },
];
const simTables = SHOW.map(({ id, digits }) => {
  const cells = summarize(results, id);
  const rows = CONFIGS.map((c) => [
    esc(c.label),
    ...loads.map((l) => {
      const cell = cells.find((x) => x.load === l && x.config === c.id)!;
      return ci(cell.value, digits) + (cell.diff ? `<br><span class="muted">Δ față de A: ${ci(cell.diff, digits)}</span>` : '');
    }),
  ]);
  return `<h3>${esc(INDICATORS[id].label)}</h3>${table(['Strategia', ...loads.map((l) => `încărcare ${l}`)], rows, [false, ...loads.map(() => true)])}`;
}).join('\n');

const body = `
<h1>Săptămâna în simulator — ${esc(section === 'real' ? 'date reale' : 'date sintetice')}</h1>
<p class="muted">${esc(dataset.manifest.name)}${dataset.manifest.seed !== undefined ? ` · seed set ${dataset.manifest.seed}` : ''} · ${seeds.length} seed-uri pentru cererile suplimentare (${seeds[0]}–${seeds[seeds.length - 1]}) · generat ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))}</p>
<p>${section === 'synthetic' ? '<strong>Date sintetice:</strong> cifrele descriu setul generat, nu facultatea reală; servesc la verificarea metodei și la comparația ulterioară cu datele reale.' : '<strong>Date reale (pseudonimizate):</strong> raportul rămâne în afara repository-ului.'}</p>

<h2>1. Orarul, fără cereri suplimentare</h2>
${table(['Măsură', 'Valoare'], [
  ['săli', base.rooms],
  ['ocuparea totală (perechi-sală ocupate / disponibile)', bar(base.occupiedPeriods / base.roomPeriods)],
  ...(['auditorium', 'seminar', 'lab'] as const).map((t) => [`ocuparea — ${TYPE[t]} (${base.byType[t].rooms})`, bar(base.byType[t].available ? base.byType[t].occupied / base.byType[t].available : NaN)]),
  ['săli nefolosite deloc în săptămână', unused],
  ['ocuparea pe sală (min / mediană / max)', `${pct(Math.min(...perRoom))} / ${pct([...perRoom].sort((a, b) => a - b)[perRoom.length >> 1]!)} / ${pct(Math.max(...perRoom))}`],
  ['locuri ocupate din locurile sălilor folosite', pct(base.seatFill)],
  ['perechi de săli rare folosite inutil', base.rareMisusePeriods],
  ['goluri izolate în programul sălilor', base.roomIsolatedGaps],
  ['ferestrele studenților (total, perechi)', w.total],
  ['zile-unitate cu activitate / cu ferestre', `${w.activeDays} / ${w.daysWithWindows} (${pct(w.activeDays ? w.daysWithWindows / w.activeDays : NaN)})`],
  ['ferestre pe unitate atomică pe săptămână (medie / max)', `${fmt(w.perAtom.reduce((s, x) => s + x, 0) / Math.max(1, w.perAtom.length), 2)} / ${Math.max(0, ...w.perAtom)}`],
])}
<h3>Ocuparea pe perechi și pe zile</h3>
${table(['Perechea', 'Ocupare'], base.byPeriod.map((n, i) => [`${i + 1} (${week.instance.grid.periods[i]!.start})`, bar(n / (base.rooms * D))]))}
${table(['Ziua', 'Ocupare'], base.byDay.map((n, i) => [`${DAY[i] ?? i + 1} (${week.instance.dates[i]})`, bar(n / (base.rooms * P))]))}

<h2>2. Cereri suplimentare: comparația strategiilor</h2>
<p>Cererile suplimentare (recuperări, consultații, evenimente) se adaugă peste orar până la o fracțiune din perechile-sală rămase libere (<em>încărcarea</em>). Aceleași cereri, în aceeași ordine, pentru fiecare strategie; media pe ${seeds.length} seed-uri, cu interval de încredere de 95% și diferența pereche față de A. Cereri generate, pe tipuri (total pe toate instanțele): ${Object.entries(extrasByKind).map(([k, v]) => `${esc(k)} ${v}`).join(', ')}. Încălcări în stările finale: <strong>${violations}</strong>.</p>
<p class="muted">Ferestrele studenților sunt doar măsurate: motorul V0 nu le ia în calcul la alegere (asta vine în Lotul 4).</p>
${simTables}
`;

const out = reportsDir(section);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'week.html'), page(`Săptămâna — ${section}`, body));
writeFileSync(join(out, 'week.json'), JSON.stringify({ section, manifest: dataset.manifest, seeds, loads, base, results }, null, 2));
console.log(`Ocupare: ${pct(base.occupiedPeriods / base.roomPeriods)}; ferestre: ${w.total}; săli rare folosite inutil: ${base.rareMisusePeriods}; încălcări: ${violations}`);
console.log(`Raport: ${join(out, 'week.html')}`);
