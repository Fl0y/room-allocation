// Rulează simularea (plan.md Lotul 2b) și scrie out/simulation.json + out/simulation.html.
// Rulare: npm run simulate            (implicit: 30 de seed-uri, încărcări 0.5, 0.7, 0.85, 0.95)
//         npm run simulate -- --seeds=10 --loads=0.7,0.95 --first-seed=1001

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PROFILE, generateWorkload } from '../src/sim/generator.ts';
import { CONFIGS, INDICATORS, simulate, summarize, type IndicatorId, type RunMetrics, type Stat } from '../src/sim/simulate.ts';

const args = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=');
      return [k!, v ?? ''] as const;
    }),
);
const nSeeds = Number(args.get('seeds') ?? 30);
const firstSeed = Number(args.get('first-seed') ?? 1001);
const loads = (args.get('loads') ?? '0.5,0.7,0.85,0.95').split(',').map(Number);
const seeds = Array.from({ length: nSeeds }, (_, i) => firstSeed + i);

const t0 = performance.now();
const results = simulate({
  seeds,
  loads,
  onProgress: (d, t) => process.stdout.write(`\r  ${d}/${t} instanțe`),
});
process.stdout.write('\n');
const elapsed = (performance.now() - t0) / 1000;

const violations = results.reduce((s, r) => s + r.violations, 0);
if (violations > 0) {
  console.error(`EROARE: ${violations} încălcări în stările finale.`);
  process.exitCode = 1;
}

// Încărcarea pe tipuri de sală (media pe seed-uri), pentru context
const typeLoad = loads.map((load) => {
  const acc = { auditorium: 0, seminar: 0, lab: 0 };
  for (const seed of seeds) {
    const w = generateWorkload(seed, load);
    const supply = { auditorium: 0, seminar: 0, lab: 0 };
    for (const r of w.instance.rooms) supply[r.type] += w.instance.dates.length * w.instance.grid.periods.length;
    const demand = { auditorium: 0, seminar: 0, lab: 0 };
    for (const q of w.requests) demand[q.activity === 'lecture' ? 'auditorium' : q.activity === 'lab' ? 'lab' : 'seminar'] += q.length;
    for (const k of Object.keys(acc) as (keyof typeof acc)[]) acc[k] += demand[k] / supply[k] / seeds.length;
  }
  return { load, ...acc };
});

// ── HTML ────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(x: number, digits = 1): string {
  return Number.isFinite(x) ? x.toFixed(digits) : '—';
}

function statCell(s: Stat, digits = 1): string {
  if (!Number.isFinite(s.mean)) return '<td>—</td>';
  const ci = Number.isFinite(s.lo) ? `<small>[${fmt(s.lo, digits)}; ${fmt(s.hi, digits)}]</small>` : '';
  return `<td><span class="v">${fmt(s.mean, digits)}</span> ${ci}</td>`;
}

function diffCell(s: Stat | null, higherIsBetter: boolean, digits = 1): string {
  if (!s) return '<td class="ref">referință</td>';
  if (!Number.isFinite(s.mean)) return '<td>—</td>';
  const sign = s.mean > 0 ? '+' : '';
  const significant = Number.isFinite(s.lo) && (s.lo > 0 || s.hi < 0);
  const better = significant && (higherIsBetter ? s.lo > 0 : s.hi < 0);
  const worse = significant && !better;
  const cls = better ? 'better' : worse ? 'worse' : 'ns';
  const mark = better ? '▲' : worse ? '▼' : '';
  return `<td class="${cls}">${mark} ${sign}${fmt(s.mean, digits)} <small>[${fmt(s.lo, digits)}; ${fmt(s.hi, digits)}]</small></td>`;
}

const TABLE_INDICATORS: { id: IndicatorId; digits: number }[] = [
  { id: 'periodsPct', digits: 1 },
  { id: 'acceptedPct', digits: 1 },
  { id: 'labPct', digits: 1 },
  { id: 'lecturePct', digits: 1 },
  { id: 'movesPerAccepted', digits: 3 },
  { id: 'movedPct', digits: 2 },
  { id: 'emptySeats', digits: 1 },
  { id: 'rareMisuse', digits: 1 },
  { id: 'isolated', digits: 1 },
  { id: 'timeMedian', digits: 3 },
  { id: 'timeP95', digits: 3 },
];

function loadTable(load: number, all: RunMetrics[]): string {
  const summaries = new Map(TABLE_INDICATORS.map(({ id }) => [id, summarize(all, id)] as const));
  const head = `<tr><th>Indicator</th>${CONFIGS.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr>`;
  const rows: string[] = [];
  for (const { id, digits } of TABLE_INDICATORS) {
    const cells = summaries.get(id)!.filter((c) => c.load === load);
    const ind = INDICATORS[id];
    rows.push(
      `<tr><th>${esc(ind.label)}</th>${CONFIGS.map((c) => statCell(cells.find((x) => x.config === c.id)!.value, digits)).join('')}</tr>`,
    );
    rows.push(
      `<tr class="diff"><th><small>Δ față de A, pereche</small></th>${CONFIGS.map((c) => diffCell(cells.find((x) => x.config === c.id)!.diff, ind.higherIsBetter, digits)).join('')}</tr>`,
    );
  }
  const tl = typeLoad.find((t) => t.load === load)!;
  return `<section><h2>Încărcarea ${load}</h2>
  <p class="muted">Încărcarea pe tipuri (cerere / ofertă de perechi): auditorii ${fmt(tl.auditorium, 2)}, seminare ${fmt(tl.seminar, 2)}, laboratoare ${fmt(tl.lab, 2)}. Seminarele pot folosi și alte tipuri de sală.</p>
  <div class="scroll"><table class="data"><thead>${head}</thead><tbody>${rows.join('')}</tbody></table></div></section>`;
}

/** Graficul: perechi acceptate (%) în funcție de încărcare, pentru 4 strategii. */
function chart(all: RunMetrics[]): string {
  const series = ['A', 'B', 'C', 'C+M2'];
  const cells = summarize(all, 'periodsPct');
  const W = 800;
  const H = 360;
  const m = { l: 56, r: 230, t: 20, b: 48 };
  const xs = loads;
  const values = cells.filter((c) => series.includes(c.config)).flatMap((c) => [c.value.lo, c.value.hi, c.value.mean]).filter(Number.isFinite);
  const yMin = Math.floor(Math.min(...values) / 5) * 5;
  const yMax = Math.min(100, Math.ceil(Math.max(...values) / 5) * 5);
  const x = (v: number) => m.l + ((v - xs[0]!) / (xs[xs.length - 1]! - xs[0]! || 1)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - m.t - m.b);
  const grid: string[] = [];
  for (let v = yMin; v <= yMax; v += 5) {
    grid.push(`<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`);
  }
  const xt = xs.map((v) => `<text class="tick" x="${x(v)}" y="${H - m.b + 18}" text-anchor="middle">${v}</text>`).join('');
  const lines: string[] = [];
  const labels: { y: number; text: string; slot: number }[] = [];
  series.forEach((id, i) => {
    const pts = xs.map((l) => {
      const c = cells.find((cc) => cc.config === id && cc.load === l)!;
      return { l, v: c.value };
    });
    const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.l).toFixed(1)},${y(p.v.mean).toFixed(1)}`).join('');
    const band =
      pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.l).toFixed(1)},${y(p.v.hi).toFixed(1)}`).join('') +
      [...pts].reverse().map((p) => `L${x(p.l).toFixed(1)},${y(p.v.lo).toFixed(1)}`).join('') +
      'Z';
    lines.push(`<path class="band s${i + 1}" d="${band}"/><path class="line s${i + 1}" d="${d}"/>`);
    lines.push(pts.map((p) => `<circle class="dot s${i + 1}" cx="${x(p.l)}" cy="${y(p.v.mean)}" r="4"/>`).join(''));
    const last = pts[pts.length - 1]!;
    labels.push({ y: y(last.v.mean), text: `${CONFIGS.find((c) => c.id === id)!.label} · ${fmt(last.v.mean)}%`, slot: i + 1 });
  });
  // etichete directe la capătul liniilor, fără suprapuneri
  labels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) labels[i]!.y = Math.max(labels[i]!.y, labels[i - 1]!.y + 15);
  const direct = labels
    .map((l) => `<text class="dlabel" x="${W - m.r + 10}" y="${l.y + 4}"><tspan class="sw s${l.slot}">●</tspan> ${esc(l.text)}</text>`)
    .join('');
  // zone de hover per încărcare, cu valorile tuturor strategiilor
  const tipData = xs.map((l) => ({
    load: l,
    rows: series.map((id, i) => {
      const c = cells.find((cc) => cc.config === id && cc.load === l)!;
      return { slot: i + 1, label: CONFIGS.find((cc) => cc.id === id)!.label, v: fmt(c.value.mean), lo: fmt(c.value.lo), hi: fmt(c.value.hi) };
    }),
  }));
  const step = (W - m.l - m.r) / Math.max(1, xs.length - 1);
  const hits = xs
    .map((l, k) => `<rect class="hit" data-k="${k}" x="${x(l) - step / 2}" y="${m.t}" width="${step}" height="${H - m.t - m.b}"/>`)
    .join('');
  const legend = series
    .map((id, i) => `<span><i class="s${i + 1}"></i>${esc(CONFIGS.find((c) => c.id === id)!.label)}</span>`)
    .join('');
  return `<figure class="viz-root">
  <figcaption><b>Perechi acceptate (%) în funcție de încărcare</b><br><span class="muted">Media pe ${seeds.length} seed-uri; banda = interval de încredere 95%. Valorile exacte, pentru toate strategiile, în tabelele de mai jos.</span></figcaption>
  <div class="legend">${legend}</div>
  <div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Perechi acceptate în funcție de încărcare, pe strategii">
  ${grid.join('')}${xt}<text class="axis" x="${(m.l + W - m.r) / 2}" y="${H - 8}" text-anchor="middle">încărcarea (perechi-sală cerute / disponibile)</text>
  <line class="cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="display:none"/>
  ${lines.join('')}${direct}${hits}</svg><div class="tip" role="status"></div></div>
  <script>
  (() => {
    const data = ${JSON.stringify(tipData)};
    const xs = ${JSON.stringify(xs.map((l) => x(l)))};
    const root = document.currentScript.closest('figure');
    const svg = root.querySelector('svg'), tip = root.querySelector('.tip'), cross = root.querySelector('.cross');
    root.querySelectorAll('.hit').forEach((r) => {
      r.addEventListener('mouseenter', () => {
        const k = +r.dataset.k, d = data[k];
        cross.setAttribute('x1', xs[k]); cross.setAttribute('x2', xs[k]); cross.style.display = '';
        tip.innerHTML = '<b>Încărcarea ' + d.load + '</b>' + d.rows.map((row) =>
          '<div><i class="s' + row.slot + '"></i>' + row.label + ': <b>' + row.v + '%</b> <small>[' + row.lo + '; ' + row.hi + ']</small></div>').join('');
        const box = svg.getBoundingClientRect(), scale = box.width / ${W};
        tip.style.left = Math.min(xs[k] * scale + 12, box.width - 260) + 'px';
        tip.style.display = 'block';
      });
      r.addEventListener('mouseleave', () => { tip.style.display = 'none'; cross.style.display = 'none'; });
    });
  })();
  </script></figure>`;
}

function renderHtml(all: RunMetrics[]): string {
  const css = `
body{--surface-1:#fcfcfb;--surface-2:#f3f3f1;--text-primary:#0b0b0b;--text-secondary:#52514e;--grid:#e4e3df;--border:#d9d8d3;
--series-1:#2a78d6;--series-2:#eb6834;--series-3:#1baf7a;--series-4:#eda100;--good:#1a7f37;--bad:#cf222e}
@media (prefers-color-scheme: dark){body{--surface-1:#1a1a19;--surface-2:#242423;--text-primary:#f0efec;--text-secondary:#c3c2b7;--grid:#34342f;--border:#3d3d38;
--series-1:#3987e5;--series-2:#d95926;--series-3:#199e70;--series-4:#c98500;--good:#4ac26b;--bad:#ff7b72;color-scheme:dark}}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:var(--surface-1);color:var(--text-primary)}
header{padding:20px 32px;border-bottom:1px solid var(--border)}header h1{margin:0 0 6px;font-size:22px}
main{padding:8px 32px 48px;max-width:1400px}section,figure{margin:20px 0}h2{font-size:18px;margin:24px 0 6px}
.muted{color:var(--text-secondary);font-size:13px}.warn{border-left:4px solid var(--series-4);background:var(--surface-2);padding:8px 12px;font-size:14px}
.scroll{overflow-x:auto}table.data{border-collapse:collapse;font-size:12.5px;min-width:900px}
table.data th,table.data td{border-bottom:1px solid var(--grid);padding:5px 8px;text-align:right;white-space:nowrap}
table.data th:first-child{text-align:left}table.data thead th{border-bottom:2px solid var(--border);vertical-align:bottom;white-space:normal}
table.data small{color:var(--text-secondary)}tr.diff td,tr.diff th{border-bottom:1px solid var(--border);font-size:11.5px}
td.better{color:var(--good)}td.worse{color:var(--bad)}td.ns{color:var(--text-secondary)}td.ref{color:var(--text-secondary);font-style:italic}
.chart-wrap{position:relative;max-width:980px}svg{width:100%;height:auto;font-size:11px}
.grid{stroke:var(--grid);stroke-width:1}.tick,.axis{fill:var(--text-secondary)}.dlabel{fill:var(--text-primary);font-size:11px}
.line{fill:none;stroke-width:2}.band{stroke:none;opacity:.12}.dot{stroke:var(--surface-1);stroke-width:2}
.cross{stroke:var(--text-secondary);stroke-dasharray:3 3}.hit{fill:transparent;cursor:crosshair}
${[1, 2, 3, 4].map((i) => `.line.s${i}{stroke:var(--series-${i})}.band.s${i},.dot.s${i}{fill:var(--series-${i})}.sw.s${i}{fill:var(--series-${i})}i.s${i}{background:var(--series-${i})}`).join('')}
.legend{display:flex;gap:16px;font-size:12px;margin:6px 0;flex-wrap:wrap}.legend i,.tip i{display:inline-block;width:12px;height:3px;border-radius:2px;vertical-align:middle;margin-right:6px}
.tip{display:none;position:absolute;top:24px;background:var(--surface-1);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,.12);pointer-events:none;width:240px}
dl{font-size:13px}dt{font-weight:600;margin-top:6px}dd{margin:0 0 0 0;color:var(--text-secondary)}`;
  return `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RoomAllocation — simulare V0 (preliminar)</title><style>${css}</style></head><body>
<header><h1>RoomAllocation — simularea V0: comparația strategiilor</h1>
<p class="muted">Generat ${new Date().toISOString().slice(0, 10)} · ${seeds.length} seed-uri (${seeds[0]}–${seeds[seeds.length - 1]}) × ${loads.length} niveluri de încărcare × ${CONFIGS.length} strategii = ${all.length} rulări · facultate sintetică: ${DEFAULT_PROFILE.rooms.auditorium.count} auditorii, ${DEFAULT_PROFILE.rooms.seminar.count} săli de seminar, ${DEFAULT_PROFILE.rooms.lab.count} laboratoare, ${DEFAULT_PROFILE.fluxes} fluxuri, o săptămână × 7 perechi · încălcări în stările finale: ${violations}</p></header>
<main>
<p class="warn"><b>Rezultate preliminare, pe date sintetice (V0).</b> Arată cum se comportă strategiile pe acest generator; nu sunt concluzii generale. Protocolul complet (calibrare pe seed-uri separate, mai multe profiluri de facultate, validare pe ITC 2019) este în V1.</p>
${chart(all)}
<section><h2>Cum se citește</h2><dl>
<dt>Strategiile</dt><dd>A — prima sală compatibilă; B — sala cu cele mai puține locuri goale; C — scorul V0 (întâi nu consumă săli rare inutil, apoi locuri goale, apoi goluri izolate). „+ mutări” — dacă nu e sală liberă, mută cel mult M rezervări existente în altă sală, la aceeași oră.</dd>
<dt>Comparația pereche</dt><dd>Toate strategiile primesc același șir de cereri pentru fiecare seed. Rândul „Δ față de A” arată diferența medie pe seed-uri și intervalul de încredere 95% (t-Student). ▲/▼ marchează diferențele al căror interval nu conține zero, în direcția favorabilă / nefavorabilă.</dd>
<dt>Refuzurile</dt><dd>Generatorul nu produce conflicte de profesori sau grupe și dă fiecărei cereri cel puțin o sală compatibilă, deci toate refuzurile provin din ocuparea sălilor.</dd>
<dt>Limite</dt><dd>Un singur profil de facultate; cereri pe o singură dată (fără recurență); ordinea de sosire aleatoare; toate rezervările sunt mutabile (fără orizont înghețat); timpii depind de calculator. Strategia A depinde, prin definiție, de ordinea listei de săli: generatorul listează întâi auditoriile, apoi seminarele și laboratoarele, ceea ce o dezavantajează la cursurile pe flux; altă ordine ar da alte cifre pentru A. Componenta de fragmentare a scorului V0 este a treia în ordinea lexicografică și influențează rar decizia.</dd></dl></section>
${loads.map((l) => loadTable(l, all)).join('\n')}
</main></body></html>`;
}

// ── Scrierea rezultatelor (după declararea funcțiilor de mai sus) ─────────
const outDir = fileURLToPath(new URL('../out/', import.meta.url));
mkdirSync(outDir, { recursive: true });
writeFileSync(
  `${outDir}simulation.json`,
  JSON.stringify({ generated: new Date().toISOString(), seeds, loads, configs: CONFIGS, profile: DEFAULT_PROFILE, results }, null, 1),
);
writeFileSync(`${outDir}simulation.html`, renderHtml(results));
console.log(`${results.length} rulări în ${elapsed.toFixed(1)} s; încălcări: ${violations}.`);
console.log(`Raport: ${outDir}simulation.html`);
