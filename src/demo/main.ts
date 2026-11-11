// Interfața demo-ului V0 (D26): DOM simplu, fără framework, fără rețea, fără stocare persistentă.
// Toată logica e în controller.ts; aici doar afișare și evenimente.

import type { Alternative, Decision } from '../engine/allocate.ts';
import { periodLabel } from '../engine/grid.ts';
import type { ActivityType, Booking, Request, RoomType, State } from '../engine/types.ts';
import { buildUnitIndex, sizeOf } from '../engine/units.ts';
import { allCases, coordinatorExample } from '../scenarios/cases.ts';
import type { Scenario } from '../scenarios/run.ts';
import {
  applyAlternative,
  closeRoom,
  compareStrategies,
  generatedScenario,
  hasNextStep,
  load,
  nextStep,
  requestFromBooking,
  reset,
  setOptions,
  submit,
  undo,
  type DemoState,
  type LogEntry,
} from './controller.ts';

const PRESETS: Scenario[] = [...allCases, coordinatorExample];
const TYPE: Record<RoomType, string> = { lab: 'laborator', seminar: 'seminar', auditorium: 'auditoriu' };
const ACT: Record<ActivityType, string> = { lecture: 'curs', seminar: 'seminar', lab: 'laborator', exam: 'examen', event: 'eveniment', other: 'altă activitate' };
const STRATEGY: Record<string, string> = { 'first-fit': 'prima sală liberă', 'best-fit': 'best-fit', score: 'scor V0' };
const WEEKDAY = ['dum.', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmb.'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dayLabel = (d: string) => `${WEEKDAY[new Date(`${d}T12:00:00Z`).getUTCDay()]} ${d.slice(8, 10)}.${d.slice(5, 7)}`;
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

let d: DemoState = load(PRESETS[0]!);
let date = d.scenario.instance.dates[0]!;
let comparison: { request: Request; rows: ReturnType<typeof compareStrategies> } | null = null;
let counter = 1;

const form = {
  teacher: 'Prof. Demo',
  units: [] as string[],
  activity: 'seminar' as ActivityType,
  date: '',
  start: 1,
  length: 1,
  roomTypes: ['seminar', 'auditorium', 'lab'] as RoomType[],
  minComputers: 0,
  projector: false,
  fixed: false,
};

function defaultRoomTypes(a: ActivityType): RoomType[] {
  if (a === 'lab' || a === 'exam') return ['lab'];
  if (a === 'lecture') return ['auditorium'];
  return ['seminar', 'auditorium', 'lab'];
}

function students(): number {
  return form.units.length ? sizeOf(buildUnitIndex(d.scenario.instance.units), form.units) : 0;
}

function formRequest(): Request {
  const n = students();
  const r: Request = {
    id: `cerere-${counter}`,
    teacher: form.teacher.trim() || 'Prof. Demo',
    units: [...form.units],
    activity: form.activity,
    needs: {
      roomTypes: form.roomTypes.length ? [...form.roomTypes] : defaultRoomTypes(form.activity),
      ...(form.minComputers > 0 ? { minComputers: form.minComputers } : {}),
      ...(form.projector ? { projector: true } : {}),
    },
    date: form.date,
    start: form.start,
    length: form.length,
  };
  if (!n) r.declaredStudents = 1;
  if (form.fixed && (form.activity === 'exam' || form.activity === 'event')) r.status = 'fixed';
  return r;
}

function syncNeedsToActivity() {
  form.roomTypes = defaultRoomTypes(form.activity);
  form.minComputers = form.activity === 'lab' || form.activity === 'exam' ? students() : 0;
  form.projector = form.activity === 'lecture';
  if (form.activity !== 'exam' && form.activity !== 'event') form.fixed = false;
}

// ── Încărcarea unui scenariu ─────────────────────────────────────────────

function loadScenario(sc: Scenario) {
  d = load(sc, d.options);
  date = sc.instance.dates[0]!;
  comparison = null;
  form.date = date;
  form.units = [];
  form.start = 1;
  form.length = 1;
  syncNeedsToActivity();
  renderForms();
  renderView();
}

// ── Afișare ─────────────────────────────────────────────────────────────

function lastMarks(): { added: Set<string>; moved: Map<string, string> } {
  const last = d.log.at(-1);
  const added = new Set<string>();
  const moved = new Map<string, string>();
  if (!last) return { added, moved };
  const before = new Map(last.before.bookings.map((b) => [b.id, b] as const));
  for (const b of last.after.bookings) {
    const o = before.get(b.id);
    if (!o) added.add(b.id);
    else if (o.roomId !== b.roomId) moved.set(b.id, o.roomId);
  }
  return { added, moved };
}

function gridHtml(state: State): string {
  const inst = d.scenario.instance;
  const P = inst.grid.periods.length;
  const marks = lastMarks();
  const rooms = [...inst.rooms].sort((a, b) => (a.id < b.id ? -1 : 1));
  const head = inst.grid.periods.map((p) => `<th>${p.index}<small>${p.start}–${p.end}</small></th>`).join('');
  const rows = rooms.map((room) => {
    const closed = state.closures.some((c) => c.roomId === room.id && c.from <= date && date <= c.to);
    const label = `<th class="room">${esc(room.id)}<small>${TYPE[room.type]} · ${room.capacity} loc.${room.computers ? ` · ${room.computers} calc.` : ''}</small></th>`;
    if (closed) return `<tr>${label}<td class="closed" colspan="${P}">închisă</td></tr>`;
    const day = state.bookings.filter((b) => b.roomId === room.id && b.date === date).sort((a, b) => a.start - b.start);
    let cells = '';
    let p = 1;
    for (const b of day) {
      for (; p < b.start; p++) cells += `<td class="free" data-start="${p}" title="Liber — click pentru a completa formularul cu această pereche"></td>`;
      cells += bookingCell(b, room.capacity, marks);
      p = b.start + b.length;
    }
    for (; p <= P; p++) cells += `<td class="free" data-start="${p}" title="Liber — click pentru a completa formularul cu această pereche"></td>`;
    return `<tr>${label}${cells}</tr>`;
  });
  return `<table class="grid"><thead><tr><th></th>${head}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function bookingCell(b: Booking, capacity: number, marks: ReturnType<typeof lastMarks>): string {
  const cls = ['busy'];
  let tag = '';
  if (marks.added.has(b.id)) {
    cls.push('added');
    tag = '<span class="tag">nou</span>';
  } else if (marks.moved.has(b.id)) {
    cls.push('moved');
    tag = `<span class="tag">din ${esc(marks.moved.get(b.id)!)}</span>`;
  }
  if (b.status === 'fixed') cls.push('fixed');
  if (b.status === 'frozen') cls.push('frozen');
  if (b.blockId) cls.push('split');
  const status = b.status === 'fixed' ? ' · fixat' : b.status === 'frozen' ? ' · înghețat' : '';
  const title = `${b.id}: ${ACT[b.activity]}, ${b.units.join('+') || '—'}, ${b.students} studenți, ${b.teacher}${status}`;
  return `<td class="${cls.join(' ')}" colspan="${b.length}" title="${esc(title)}"><b>${esc(b.id)}</b>${tag}<small>${esc(b.units.join('+') || '—')} · ${b.students}/${capacity}${status}</small></td>`;
}

function altLabel(a: Alternative): string {
  return a.kind === 'slot'
    ? `${dayLabel(a.date)}, ${periodLabel(a.start, a.length)}, sala ${a.roomId}${a.moves ? ` (${a.moves} mutări)` : ''}`
    : `Rupe blocul (cu acordul profesorului): ${a.parts.map((p) => `${periodLabel(p.start, p.length)} în ${p.roomId}`).join(' + ')}`;
}

function decisionHtml(dec: Decision, entryIndex: number, interactive: boolean): string {
  const lines = dec.explanation.map((l) => `<li>${esc(l)}</li>`).join('');
  let alts = '';
  if (dec.kind === 'rejected' && dec.alternatives.length && interactive) {
    alts = `<div class="alts">${dec.alternatives
      .map((a, i) => `<button class="alt${a.kind === 'split' ? ' split' : ''}" data-entry="${entryIndex}" data-alt="${i}">Aplică: ${esc(altLabel(a))}</button>`)
      .join('')}</div>`;
  }
  return `<ul>${lines}</ul>${alts}`;
}

function logEntryHtml(e: LogEntry, i: number): string {
  const isLast = i === d.log.length - 1;
  if (e.kind === 'decision') {
    const ok = e.decision.kind === 'accepted';
    return `<article class="entry ${ok ? 'ok' : 'no'}"><h4>${esc(e.title)} — ${ok ? `acceptată în ${esc(e.decision.kind === 'accepted' ? e.decision.booking.roomId : '')}` : 'refuzată'}</h4>${decisionHtml(e.decision, i, isLast)}</article>`;
  }
  if (e.kind === 'repair') {
    const r = e.report;
    const unresolved = r.unresolved
      .map(
        (u, k) =>
          `<div class="unres"><b>${esc(u.booking.id)}</b>: ${esc(u.reasons.map((x) => x.message).join('; '))}${
            isLast && u.alternatives.length
              ? `<div class="alts">${u.alternatives.map((a, j) => `<button class="alt${a.kind === 'split' ? ' split' : ''}" data-entry="${i}" data-unres="${k}" data-alt="${j}">Aplică: ${esc(altLabel(a))}</button>`).join('')}</div>`
              : ''
          }</div>`,
      )
      .join('');
    return `<article class="entry repair"><h4>${esc(e.title)}</h4><ul>${r.explanation.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>${unresolved}</article>`;
  }
  return `<article class="entry"><h4>${esc(e.title)}</h4><p>${esc(e.text)}</p></article>`;
}

function comparisonHtml(): string {
  if (!comparison) return '';
  const rows = comparison.rows
    .map((r) => {
      const dec = r.decision;
      const result =
        dec.kind === 'accepted'
          ? `<b>${esc(dec.booking.roomId)}</b>${dec.moves.length ? ` · ${dec.moves.length} mutări: ${esc(dec.moves.map((m) => `${m.bookingId} → ${m.to}`).join(', '))}` : ''} <small>(locuri neocupate ${dec.evaluation.excess}${dec.evaluation.rarity ? `, ${esc(dec.evaluation.notes.join('; '))}` : ''})</small>`
          : `<span class="no">refuz</span> <small>${esc(dec.reasons[0]?.code ?? '')}</small>`;
      return `<tr><th>${esc(r.label)}</th><td>${result}</td></tr>`;
    })
    .join('');
  return `<section class="card"><h3>Comparația strategiilor pentru ${esc(comparison.request.teacher)}, ${periodLabel(comparison.request.start, comparison.request.length)}, ${dayLabel(comparison.request.date)}</h3>
  <p class="muted">Ce ar decide fiecare strategie pe starea curentă. Starea nu se modifică.</p><table class="cmp">${rows}</table></section>`;
}

function renderView() {
  const sc = d.scenario;
  $('#scenario-info').innerHTML = `<h2>${esc(sc.title)}</h2><p>${esc(sc.summary)}</p><p class="expected"><b>Rezultat așteptat (scris de mână):</b> ${esc(sc.expected)}</p>`;
  const total = sc.steps.length;
  $('#step-status').textContent = `Pasul ${d.stepIndex} din ${total}`;
  ($('#btn-next') as HTMLButtonElement).disabled = !hasNextStep(d);
  ($('#btn-all') as HTMLButtonElement).disabled = !hasNextStep(d);
  ($('#btn-undo') as HTMLButtonElement).disabled = d.history.length === 0;
  $('#dates').innerHTML = sc.instance.dates
    .map((x) => {
      const n = d.state.bookings.filter((b) => b.date === x).length;
      return `<button class="date${x === date ? ' on' : ''}" data-date="${x}">${esc(dayLabel(x))} <small>${n}</small></button>`;
    })
    .join('');
  $('#grid').innerHTML = gridHtml(d.state);
  $('#comparison').innerHTML = comparisonHtml();
  $('#log').innerHTML = d.log.length
    ? [...d.log].map((e, i) => logEntryHtml(e, i)).reverse().join('')
    : '<p class="muted">Niciun pas încă. Apasă „Pasul următor” sau trimite o cerere.</p>';
  const accepted = d.state.bookings.length;
  $('#stats').textContent = `${accepted} rezervări · strategie: ${STRATEGY[d.options.strategy]} · M = ${d.options.maxMoves}`;
}

function renderForms() {
  const inst = d.scenario.instance;
  const idx = buildUnitIndex(inst.units);
  const depth = (id: string): number => {
    let k = 0;
    let u = idx.byId.get(id);
    while (u?.parent !== undefined && k < 5) {
      u = idx.byId.get(u.parent);
      k++;
    }
    return k;
  };
  // ordinea arborelui: fiecare unitate urmată de copiii ei
  const ordered: string[] = [];
  const visit = (id: string) => {
    ordered.push(id);
    for (const c of [...(idx.children.get(id) ?? [])].sort()) visit(c);
  };
  for (const u of [...inst.units].filter((x) => x.parent === undefined).sort((a, b) => (a.id < b.id ? -1 : 1))) visit(u.id);
  $('#f-units').innerHTML = ordered
    .map((id) => `<option value="${esc(id)}"${form.units.includes(id) ? ' selected' : ''}>${'  '.repeat(depth(id))}${esc(id)} (${sizeOf(idx, [id])})</option>`)
    .join('');
  const dateOpts = inst.dates.map((x) => `<option value="${x}">${esc(dayLabel(x))}</option>`).join('');
  $('#f-date').innerHTML = dateOpts;
  $('#c-from').innerHTML = dateOpts;
  $('#c-to').innerHTML = dateOpts;
  $('#c-room').innerHTML = [...inst.rooms]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((r) => `<option value="${esc(r.id)}">${esc(r.id)} (${TYPE[r.type]})</option>`)
    .join('');
  ($('#c-to') as HTMLSelectElement).value = inst.dates[inst.dates.length - 1]!;
  writeForm();
}

function writeForm() {
  ($('#f-teacher') as HTMLInputElement).value = form.teacher;
  ($('#f-activity') as HTMLSelectElement).value = form.activity;
  ($('#f-date') as HTMLSelectElement).value = form.date;
  ($('#f-start') as HTMLSelectElement).value = String(form.start);
  ($('#f-length') as HTMLSelectElement).value = String(form.length);
  for (const t of ['auditorium', 'seminar', 'lab'] as RoomType[]) ($(`#f-type-${t}`) as HTMLInputElement).checked = form.roomTypes.includes(t);
  ($('#f-computers') as HTMLInputElement).value = String(form.minComputers);
  ($('#f-projector') as HTMLInputElement).checked = form.projector;
  ($('#f-fixed') as HTMLInputElement).checked = form.fixed;
  ($('#f-fixed') as HTMLInputElement).disabled = !(form.activity === 'exam' || form.activity === 'event');
  $('#f-students').textContent = form.units.length ? `${students()} studenți (din unitățile alese)` : 'alege cel puțin o unitate';
}

// ── Evenimente ──────────────────────────────────────────────────────────

function act(next: DemoState) {
  d = next;
  comparison = null;
  const last = d.log.at(-1);
  // după o decizie, afișează ziua cererii
  if (last?.kind === 'decision') date = last.request.date;
  renderView();
}

function bind() {
  $('#sc-select').innerHTML =
    PRESETS.map((s, i) => `<option value="p${i}">${esc(s.title.split(' — ')[0]!)} — ${esc(s.title.split(' — ')[1] ?? '')}</option>`).join('') +
    '<option value="gen">Generat (o zi, date sintetice)</option>';
  $('#sc-select').addEventListener('change', () => {
    const v = ($('#sc-select') as HTMLSelectElement).value;
    $('#gen-opts').hidden = v !== 'gen';
    if (v === 'gen') loadGenerated();
    else loadScenario(PRESETS[Number(v.slice(1))]!);
  });
  $('#gen-load').addEventListener('click', loadGenerated);
  $('#btn-next').addEventListener('click', () => act(nextStep(d)));
  $('#btn-all').addEventListener('click', () => {
    let x = d;
    while (hasNextStep(x)) x = nextStep(x);
    act(x);
  });
  $('#btn-undo').addEventListener('click', () => act(undo(d)));
  $('#btn-reset').addEventListener('click', () => act(reset(d)));
  $('#opt-strategy').addEventListener('change', (e) => {
    d = setOptions(d, { strategy: (e.target as HTMLSelectElement).value as DemoState['options']['strategy'] });
    renderView();
  });
  $('#opt-m').addEventListener('change', (e) => {
    d = setOptions(d, { maxMoves: Number((e.target as HTMLSelectElement).value) });
    renderView();
  });
  $('#dates').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[data-date]') as HTMLElement | null;
    if (!b) return;
    date = b.dataset.date!;
    renderView();
  });
  $('#grid').addEventListener('click', (e) => {
    const td = (e.target as HTMLElement).closest('td.free') as HTMLElement | null;
    if (!td) return;
    form.date = date;
    form.start = Number(td.dataset.start);
    writeForm();
    $('#f-units').focus();
  });
  // formular
  $('#f-teacher').addEventListener('input', (e) => (form.teacher = (e.target as HTMLInputElement).value));
  $('#f-units').addEventListener('change', (e) => {
    form.units = [...(e.target as HTMLSelectElement).selectedOptions].map((o) => o.value);
    if (form.activity === 'lab' || form.activity === 'exam') form.minComputers = students();
    writeForm();
  });
  $('#f-activity').addEventListener('change', (e) => {
    form.activity = (e.target as HTMLSelectElement).value as ActivityType;
    syncNeedsToActivity();
    writeForm();
  });
  $('#f-date').addEventListener('change', (e) => (form.date = (e.target as HTMLSelectElement).value));
  $('#f-start').addEventListener('change', (e) => (form.start = Number((e.target as HTMLSelectElement).value)));
  $('#f-length').addEventListener('change', (e) => (form.length = Number((e.target as HTMLSelectElement).value)));
  for (const t of ['auditorium', 'seminar', 'lab'] as RoomType[]) {
    $(`#f-type-${t}`).addEventListener('change', (e) => {
      const on = (e.target as HTMLInputElement).checked;
      form.roomTypes = on ? [...new Set([...form.roomTypes, t])] : form.roomTypes.filter((x) => x !== t);
    });
  }
  $('#f-computers').addEventListener('input', (e) => (form.minComputers = Math.max(0, Number((e.target as HTMLInputElement).value) || 0)));
  $('#f-projector').addEventListener('change', (e) => (form.projector = (e.target as HTMLInputElement).checked));
  $('#f-fixed').addEventListener('change', (e) => (form.fixed = (e.target as HTMLInputElement).checked));
  $('#f-submit').addEventListener('click', () => {
    if (!form.units.length) {
      $('#f-students').textContent = 'alege cel puțin o unitate (flux, grupă sau subgrupă)';
      return;
    }
    const r = formRequest();
    counter++;
    act(submit(d, r));
  });
  $('#f-compare').addEventListener('click', () => {
    if (!form.units.length) {
      $('#f-students').textContent = 'alege cel puțin o unitate (flux, grupă sau subgrupă)';
      return;
    }
    const r = formRequest();
    comparison = { request: r, rows: compareStrategies(d, r) };
    $('#comparison').innerHTML = comparisonHtml();
    $('#comparison').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $('#c-close').addEventListener('click', () => {
    const roomId = ($('#c-room') as HTMLSelectElement).value;
    let from = ($('#c-from') as HTMLSelectElement).value;
    let to = ($('#c-to') as HTMLSelectElement).value;
    if (from > to) [from, to] = [to, from];
    act(closeRoom(d, { roomId, from, to, reason: 'repair' }));
  });
  $('#log').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button.alt') as HTMLElement | null;
    if (!b) return;
    const entry = d.log[Number(b.dataset.entry)];
    if (!entry) return;
    const altIndex = Number(b.dataset.alt);
    if (entry.kind === 'decision' && entry.decision.kind === 'rejected') {
      const alt = entry.decision.alternatives[altIndex];
      if (alt) {
        if (alt.kind === 'split' && !confirm('Ruperea blocului în săli diferite cere acordul profesorului (D20). Confirmi?')) return;
        act(applyAlternative(d, entry.request, alt));
      }
    } else if (entry.kind === 'repair') {
      const u = entry.report.unresolved[Number(b.dataset.unres)];
      const alt = u?.alternatives[altIndex];
      if (u && alt) act(applyAlternative(d, requestFromBooking(u.booking), alt));
    }
  });
}

function loadGenerated() {
  const seed = Math.max(1, Math.floor(Number(($('#gen-seed') as HTMLInputElement).value) || 1));
  const level = Number(($('#gen-level') as HTMLSelectElement).value);
  loadScenario(generatedScenario(seed, level));
}

bind();
loadScenario(PRESETS[0]!);
