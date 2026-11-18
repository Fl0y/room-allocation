// Generează out/cases.html: grila săli × perechi înainte și după fiecare decizie, pentru cazurile 1–5
// și exemplul pentru coordonator. Pagina e statică (fără JavaScript) și se deschide direct în browser.
// Rulare: npm run report

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Decision } from '../src/engine/allocate.ts';
import { periodLabel } from '../src/engine/grid.ts';
import type { RepairReport } from '../src/engine/repair.ts';
import type { Booking, Instance, State } from '../src/engine/types.ts';
import { allCases, coordinatorExample } from '../src/scenarios/cases.ts';
import { runScenario, type Scenario, type StepResult } from '../src/scenarios/run.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const TYPE: Record<string, string> = { lab: 'laborator', seminar: 'seminar', auditorium: 'auditoriu' };
const ACT: Record<string, string> = { lecture: 'curs', seminar: 'seminar', lab: 'laborator', exam: 'examen', event: 'eveniment', other: 'altă activitate' };
const WEEKDAY = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
const dayName = (d: string) => `${WEEKDAY[new Date(`${d}T12:00:00Z`).getUTCDay()]}, ${d}`;

interface Marks {
  added: Set<string>;
  moved: Map<string, string>; // id → sala de unde a venit
}

function grid(instance: Instance, state: State, date: string, marks?: Marks): string {
  const P = instance.grid.periods.length;
  const rooms = [...instance.rooms].sort((a, b) => (a.id < b.id ? -1 : 1));
  const head = instance.grid.periods
    .map((p) => `<th>${p.index}<br><small>${p.start}–${p.end}</small></th>`)
    .join('');
  const rows = rooms.map((room) => {
    const closed = state.closures.some((c) => c.roomId === room.id && c.from <= date && date <= c.to);
    const label = `<th class="room">${room.id}<br><small>${TYPE[room.type]}, ${room.capacity} locuri${room.computers ? `, ${room.computers} calc.` : ''}</small></th>`;
    if (closed) return `<tr>${label}<td class="closed" colspan="${P}">închisă (reparații)</td></tr>`;
    const day = state.bookings.filter((b) => b.roomId === room.id && b.date === date).sort((a, b) => a.start - b.start);
    let cells = '';
    let p = 1;
    for (const b of day) {
      for (; p < b.start; p++) cells += '<td class="free"></td>';
      cells += cell(b, room.capacity, marks);
      p = b.start + b.length;
    }
    for (; p <= P; p++) cells += '<td class="free"></td>';
    return `<tr>${label}${cells}</tr>`;
  });
  return `<table class="grid"><thead><tr><th>${esc(dayName(date))}</th>${head}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function cell(b: Booking, capacity: number, marks?: Marks): string {
  const cls = ['busy'];
  let tag = '';
  if (marks?.added.has(b.id)) {
    cls.push('added');
    tag = '<span class="tag">nou</span>';
  } else if (marks?.moved.has(b.id)) {
    cls.push('moved');
    tag = `<span class="tag">mutat din ${esc(marks.moved.get(b.id)!)}</span>`;
  }
  if (b.status === 'fixed') cls.push('fixed');
  if (b.status === 'frozen') cls.push('frozen');
  const status = b.status === 'fixed' ? ' · fixat' : b.status === 'frozen' ? ' · înghețat' : '';
  return `<td class="${cls.join(' ')}" colspan="${b.length}"><b>${esc(b.id)}</b>${tag}<br><small>${esc(ACT[b.activity] ?? b.activity)} · ${esc(b.units.join('+') || '—')} · ${b.students}/${capacity}${status} · ${esc(b.teacher)}</small></td>`;
}

function marksFor(before: State, after: State): Marks {
  const old = new Map(before.bookings.map((b) => [b.id, b] as const));
  const added = new Set<string>();
  const moved = new Map<string, string>();
  for (const b of after.bookings) {
    const o = old.get(b.id);
    if (!o) added.add(b.id);
    else if (o.roomId !== b.roomId) moved.set(b.id, o.roomId);
  }
  return { added, moved };
}

function decisionBlock(d: Decision, withoutMoves?: Decision): string {
  const cls = d.kind === 'accepted' ? 'ok' : 'no';
  const head = d.kind === 'accepted' ? `Acceptată: ${d.booking.roomId}` : 'Refuzată';
  const m0 =
    withoutMoves && d.kind === 'accepted' && d.moves.length > 0
      ? `<p class="note">Fără mutări (M = 0), aceeași cerere ar fi fost <b>${withoutMoves.kind === 'accepted' ? `acceptată în ${withoutMoves.booking.roomId}` : 'refuzată'}</b>.</p>`
      : '';
  return `<div class="decision ${cls}"><h4>${esc(head)}</h4><ul>${d.explanation.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>${m0}</div>`;
}

function repairBlock(r: RepairReport): string {
  const rows = [
    ...r.sameTimeDirect.map((x) => `<tr><td>${esc(x.bookingId)}</td><td>aceeași oră, fără alte mutări</td><td>${esc(x.to)}</td><td>—</td></tr>`),
    ...r.sameTimeWithMoves.map(
      (x) =>
        `<tr><td>${esc(x.bookingId)}</td><td>aceeași oră, cu mutări</td><td>${esc(x.to)}</td><td>${esc(x.moves.map((m) => `${m.bookingId}: ${m.from} → ${m.to}`).join('; '))}</td></tr>`,
    ),
    ...r.unresolved.map(
      (u) =>
        `<tr class="unres"><td>${esc(u.booking.id)}</td><td>necesită decizie umană</td><td>—</td><td>${esc(u.reasons.map((x) => x.message).join('; '))}<br><b>Alternative propuse:</b> ${esc(
          u.alternatives
            .map((a) => (a.kind === 'slot' ? `${a.date} ${periodLabel(a.start, a.length)} în ${a.roomId}` : `rupere: ${a.parts.map((p) => `${periodLabel(p.start, p.length)} în ${p.roomId}`).join(' + ')}`))
            .join('; ') || 'niciuna',
        )}</td></tr>`,
    ),
  ];
  return `<div class="decision"><ul>${r.explanation.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
  <table class="report"><thead><tr><th>Rezervare</th><th>Rezultat</th><th>Sala nouă</th><th>Detalii</th></tr></thead><tbody>${rows.join('')}</tbody></table>
  <p class="note">Verificator: ${r.violations.length === 0 ? 'nicio încălcare H1–H8 în starea finală' : esc(r.violations.map((v) => v.message).join('; '))}.</p></div>`;
}

function stepDates(res: StepResult): string[] {
  if (res.step.kind === 'request') return [res.step.request.date];
  const ids = new Set(res.repair!.affected);
  return [...new Set(res.before.bookings.filter((b) => ids.has(b.id)).map((b) => b.date))].sort();
}

function scenarioSection(sc: Scenario): string {
  const results = runScenario(sc);
  const zero = runScenario(sc, { maxMoves: 0 });
  const steps = results.map((res, i) => {
    const title =
      res.step.kind === 'request'
        ? `Pasul ${i + 1}: cererea ${esc(res.step.request.id)} (${esc(res.step.request.teacher)}, ${esc(ACT[res.step.request.activity] ?? '')}, ${esc(res.step.request.units.join('+'))}, ${res.step.request.latest !== undefined ? `oricând între perechile ${res.step.request.start}–${res.step.request.latest}` : periodLabel(res.step.request.start, res.step.request.length)})`
        : `Pasul ${i + 1}: închiderea sălii ${esc(res.step.closure.roomId)} (${res.step.closure.from} – ${res.step.closure.to})`;
    const dates = stepDates(res);
    const marks = marksFor(res.before, res.after);
    const grids = dates
      .map(
        (d) => `<div class="pair"><div><h5>Înainte</h5>${grid(sc.instance, res.before, d)}</div><div><h5>După</h5>${grid(sc.instance, res.after, d, marks)}</div></div>`,
      )
      .join('');
    const body = res.decision ? decisionBlock(res.decision, zero[i]?.decision) : repairBlock(res.repair!);
    return `<div class="step"><h3>${title}</h3>${grids}${body}</div>`;
  });
  return `<section id="${sc.id}"><h2>${esc(sc.title)}</h2><p>${esc(sc.summary)}</p>
  <p class="expected"><b>Rezultat așteptat (scris de mână, înaintea testelor):</b> ${esc(sc.expected)}</p>${steps.join('')}</section>`;
}

function coordinatorSection(): string {
  const sc = coordinatorExample;
  const configs = [
    { label: 'Prima sală liberă', opts: { strategy: 'first-fit' as const, maxMoves: 0 } },
    { label: 'Best-fit', opts: { strategy: 'best-fit' as const, maxMoves: 0 } },
    { label: 'Scor cu raritate (V0)', opts: { strategy: 'score' as const, maxMoves: 0 } },
    { label: 'Best-fit + reparare (M = 1)', opts: { strategy: 'best-fit' as const, maxMoves: 1 } },
  ];
  const reqIds = sc.steps.map((s) => (s.kind === 'request' ? s.request.id : ''));
  const rows = configs.map(({ label, opts }) => {
    const res = runScenario(sc, opts);
    const cells = res.map((r) => {
      const d = r.decision!;
      if (d.kind === 'rejected') return '<td class="no">refuz</td>';
      const mv = d.moves.length ? `<br><small>${esc(d.moves.map((m) => `${m.bookingId} → ${m.to}`).join(', '))}</small>` : '';
      return `<td>${esc(d.booking.roomId)}${mv}</td>`;
    });
    const ok = res.filter((r) => r.decision!.kind === 'accepted').length;
    return `<tr><th>${esc(label)}</th>${cells.join('')}<td><b>${ok}/${res.length}</b></td></tr>`;
  });
  const final = runScenario(sc, { strategy: 'score', maxMoves: 0 }).at(-1)!.after;
  return `<section id="${sc.id}"><h2>${esc(sc.title)}</h2><p>${esc(sc.summary)}</p>
  <p class="expected"><b>Calcul de mână:</b> ${esc(sc.expected)}</p>
  <table class="report"><thead><tr><th>Strategie</th>${reqIds.map((id) => `<th>${esc(id)}</th>`).join('')}<th>Acceptate</th></tr></thead><tbody>${rows.join('')}</tbody></table>
  <h5>Grila finală cu scorul V0</h5>${grid(sc.instance, final, '2026-11-17')}
  <p class="note">Exemplu construit pentru a ilustra mecanismul, nu rezultat experimental. Frecvența acestor situații se măsoară în Lotul 2 (simulare).</p></section>`;
}

const css = `
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;color:#1f2328;background:#f6f7f9}
header{background:#1f3a5f;color:#fff;padding:20px 32px}header h1{margin:0 0 4px;font-size:22px}header p{margin:0;opacity:.85}
nav{padding:10px 32px;background:#fff;border-bottom:1px solid #d8dee4;position:sticky;top:0}nav a{margin-right:14px;color:#1f3a5f;text-decoration:none;font-size:14px}
main{padding:8px 32px 48px;max-width:1500px}section{background:#fff;border:1px solid #d8dee4;border-radius:8px;padding:16px 20px;margin:20px 0}
h2{font-size:19px;margin:0 0 6px}h3{font-size:15px;margin:18px 0 6px}h4{margin:0 0 4px;font-size:14px}h5{margin:8px 0 4px;font-size:12px;color:#57606a;text-transform:uppercase;letter-spacing:.04em}
.expected{background:#f6f8fa;border-left:3px solid #8c959f;padding:6px 10px;font-size:14px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}
table.grid{border-collapse:collapse;width:100%;font-size:12px;table-layout:fixed}
table.grid th,table.grid td{border:1px solid #d0d7de;padding:4px;text-align:center;vertical-align:middle}
table.grid thead th{background:#f6f8fa;font-weight:600}table.grid th.room{text-align:left;background:#f6f8fa;width:120px}
td.free{background:#fff}td.busy{background:#ddf4ff}td.added{background:#c9f2d0;outline:2px solid #1a7f37;outline-offset:-2px}
td.moved{background:#fff1c2;outline:2px solid #bf8700;outline-offset:-2px}td.fixed{box-shadow:inset 0 0 0 2px #8250df}td.frozen{background-image:repeating-linear-gradient(45deg,transparent 0 6px,rgba(9,105,218,.08) 6px 12px)}
td.closed{background:repeating-linear-gradient(45deg,#eaeef2 0 8px,#d0d7de 8px 16px);color:#57606a;font-weight:600}
.tag{display:inline-block;margin-left:4px;font-size:10px;padding:0 4px;border-radius:3px;background:rgba(0,0,0,.08)}
.decision{margin:10px 0;padding:8px 12px;border-radius:6px;background:#f6f8fa;font-size:13px}.decision.ok{border-left:4px solid #1a7f37}.decision.no{border-left:4px solid #cf222e}
.decision ul{margin:4px 0;padding-left:18px}.note{font-size:12px;color:#57606a}
table.report{border-collapse:collapse;font-size:13px;margin:8px 0}table.report th,table.report td{border:1px solid #d0d7de;padding:5px 8px;text-align:left;vertical-align:top}
table.report thead th{background:#f6f8fa}td.no{color:#cf222e;font-weight:600}tr.unres td{background:#fff5f5}
.legend span{display:inline-block;margin-right:12px;font-size:12px}.legend i{display:inline-block;width:14px;height:12px;vertical-align:middle;margin-right:4px;border:1px solid #d0d7de}
`;

const sections = [...allCases.map(scenarioSection), coordinatorSection()];
const nav = [...allCases, coordinatorExample].map((s) => `<a href="#${s.id}">${esc(s.title.split(' — ')[0]!)}</a>`).join('');
const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RoomAllocation — cazurile 1–5 (V0, Lotul 1)</title><style>${css}</style></head><body>
<header><h1>RoomAllocation — motorul de alocare pe cazurile conflictuale</h1>
<p>V0, Lotul 1 · strategie implicită: scor lexicografic (raritate → excedent → fragmentare), cel mult 2 mutări · date sintetice · generat ${new Date().toISOString().slice(0, 10)}</p></header>
<nav>${nav}</nav><main>
<p class="legend"><span><i style="background:#c9f2d0"></i>rezervare nouă</span><span><i style="background:#fff1c2"></i>rezervare mutată (aceeași oră)</span><span><i style="box-shadow:inset 0 0 0 2px #8250df"></i>fixată (examen/eveniment)</span><span><i style="background-image:repeating-linear-gradient(45deg,transparent 0 3px,rgba(9,105,218,.25) 3px 6px)"></i>în orizontul înghețat</span><span><i style="background:#d0d7de"></i>sală închisă</span></p>
${sections.join('\n')}</main></body></html>`;

const outDir = fileURLToPath(new URL('../out/', import.meta.url));
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}cases.html`, html);
console.log(`Raport scris: ${outDir}cases.html`);
