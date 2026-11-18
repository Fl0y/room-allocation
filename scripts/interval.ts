// Lotul 4c: ora fixă vs. interval fără criteriul ferestrelor vs. interval cu criteriul ferestrelor (D29, D31),
// pe săptămâna unei secțiuni de date. Aceleași cereri suplimentare în toate variantele (comparație pe perechi);
// în variantele cu interval, fiecare cerere acceptă și 1–3 perechi după prima.
// Raportul, în afara repository-ului (D33): <folderul datelor>/<secțiune>/reports/interval.html și .json
// Rulare: npm run interval -- synthetic            (implicit: 20 de seed-uri, încărcări 0.25, 0.5, 0.75; M = 2)
//         npm run interval -- synthetic --seeds=5 --loads=0.5 --moves=0

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildWeek } from '../src/data/format.ts';
import { canonicalDir, parseSection, readDataset, reportsDir } from '../src/data/io.ts';
import { measureWeek } from '../src/sim/metrics.ts';
import { INDICATORS, runOnce, summarize, type IndicatorId, type RunMetrics, type Stat, type StrategyConfig } from '../src/sim/simulate.ts';
import { weekWorkload } from '../src/sim/week.ts';
import { esc, fmt, page, table } from './report-html.ts';

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
const maxMoves = Number(args.get('moves') ?? 2);
const seeds = Array.from({ length: nSeeds }, (_, i) => firstSeed + i);

const VARIANTS: { config: StrategyConfig; mode: 'fixed' | 'interval' }[] = [
  { config: { id: 'fix', label: 'Ora fixă', strategy: 'score', maxMoves }, mode: 'fixed' },
  { config: { id: 'int', label: 'Interval, fără criteriul ferestrelor', strategy: 'score', maxMoves, windows: false }, mode: 'interval' },
  { config: { id: 'int+F', label: 'Interval, cu criteriul ferestrelor (D31)', strategy: 'score', maxMoves, windows: true }, mode: 'interval' },
];

const { dataset, issues: parseIssues } = readDataset(canonicalDir(section));
const week = buildWeek(dataset, parseIssues);
if (week.issues.some((i) => i.severity === 'error')) {
  console.error(`Datele au erori; rulați întâi: npm run data:check -- ${section}`);
  process.exit(1);
}
const baseWindows = measureWeek(week.instance, week.state.bookings).windows.total;

const results: RunMetrics[] = [];
let withInterval = 0;
let total = 0;
let done = 0;
for (const load of loads) {
  for (const seed of seeds) {
    for (const v of VARIANTS) {
      const w = weekWorkload(dataset, week, seed, load, v.mode);
      if (v.config.id === 'int') {
        total += w.requests.length;
        withInterval += w.requests.filter((r) => r.latest !== undefined).length;
      }
      results.push(runOnce(w, v.config));
    }
    process.stdout.write(`\r  ${++done}/${loads.length * seeds.length} instanțe`);
  }
}
process.stdout.write('\n');
const violations = results.reduce((s, r) => s + r.violations, 0);
if (violations) {
  console.error(`EROARE: ${violations} încălcări în stările finale.`);
  process.exitCode = 1;
}

const ci = (s: Stat, d: number) => (Number.isFinite(s.lo) ? `${fmt(s.mean, d)} <span class="muted">[${fmt(s.lo, d)}; ${fmt(s.hi, d)}]</span>` : fmt(s.mean, d));
const SHOW: { id: IndicatorId; digits: number }[] = [
  { id: 'acceptedPct', digits: 1 },
  { id: 'studentWindows', digits: 1 },
  { id: 'rareMisuse', digits: 1 },
  { id: 'emptySeats', digits: 1 },
  { id: 'movesPerAccepted', digits: 3 },
  { id: 'timeP95', digits: 2 },
];
const tables = SHOW.map(({ id, digits }) => {
  const cells = summarize(results, id, 'fix');
  const rows = VARIANTS.map((v) => [
    esc(v.config.label),
    ...loads.map((l) => {
      const c = cells.find((x) => x.load === l && x.config === v.config.id)!;
      return ci(c.value, digits) + (c.diff ? `<br><span class="muted">Δ față de ora fixă: ${ci(c.diff, digits)}</span>` : '');
    }),
  ]);
  return `<h3>${esc(INDICATORS[id].label)}</h3>${table(['Varianta', ...loads.map((l) => `încărcare ${l}`)], rows, [false, ...loads.map(() => true)])}`;
}).join('\n');

const body = `
<h1>Cererea cu interval și ferestrele studenților — ${esc(section === 'real' ? 'date reale' : 'date sintetice')}</h1>
<p class="muted">${esc(dataset.manifest.name)}${dataset.manifest.seed !== undefined ? ` · seed set ${dataset.manifest.seed}` : ''} · strategia scor, M = ${maxMoves} · ${seeds.length} seed-uri (${seeds[0]}–${seeds[seeds.length - 1]}) · generat ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))}</p>
<p>Aceleași cereri suplimentare peste orar în toate cele trei variante. Cu interval, ${fmt((100 * withInterval) / Math.max(1, total), 0)}% dintre cereri acceptă 1–3 perechi în plus după prima (celelalte sunt deja la sfârșitul zilei). Ferestrele studenților în orarul inițial: ${baseWindows}. Încălcări în stările finale: <strong>${violations}</strong>.</p>
${section === 'synthetic' ? '<p><strong>Date sintetice:</strong> rezultate preliminare, pe un set inventat.</p>' : ''}
${tables}
`;

const out = reportsDir(section);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'interval.html'), page(`Interval — ${section}`, body));
writeFileSync(join(out, 'interval.json'), JSON.stringify({ section, manifest: dataset.manifest, seeds, loads, maxMoves, baseWindows, results }, null, 2));
console.log(`Încălcări: ${violations}. Raport: ${join(out, 'interval.html')}`);
