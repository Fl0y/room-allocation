// Construiește out/demo.html: o singură pagină, cu motorul și interfața incluse (D26).
// Se deschide direct din fișier, fără server și fără rețea. Rulare: npm run demo

import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  entryPoints: [`${root}src/demo/main.ts`],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  write: false,
  legalComments: 'none',
});
const js = result.outputFiles[0]!.text.replace(/<\/script/gi, '<\\/script');

const css = `
:root{--bg:#f6f7f9;--card:#fff;--ink:#1f2328;--muted:#57606a;--line:#d0d7de;--soft:#f6f8fa;--accent:#1f3a5f;--ok:#1a7f37;--no:#cf222e;
--free:#fff;--busy:#ddf4ff;--added:#c9f2d0;--moved:#fff1c2;--fixed:#8250df}
@media (prefers-color-scheme: dark){:root{--bg:#161616;--card:#1f1f1f;--ink:#ecebe8;--muted:#a8a7a0;--line:#3a3a36;--soft:#262625;--accent:#9cc3f0;--ok:#4ac26b;--no:#ff7b72;
--free:#1f1f1f;--busy:#17324d;--added:#1b4d2a;--moved:#4d3c0d;--fixed:#a78bfa;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--ink);font-size:14px}
header{background:#1f3a5f;color:#fff;padding:14px 24px;display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}
header h1{margin:0;font-size:19px}header .tagline{opacity:.85;font-size:13px}
.bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 24px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
.bar label{font-size:12px;color:var(--muted);display:flex;gap:6px;align-items:center}
select,input,button{font:inherit;color:inherit}select,input{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:4px 6px}
button{background:var(--soft);border:1px solid var(--line);border-radius:6px;padding:5px 10px;cursor:pointer}button:hover:not(:disabled){border-color:var(--accent)}
button:disabled{opacity:.45;cursor:default}button.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
@media (prefers-color-scheme: dark){button.primary{color:#111}}
#step-status{font-weight:600;min-width:110px}#stats{margin-left:auto;font-size:12px;color:var(--muted)}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;padding:16px 24px;align-items:start}
@media (max-width:1100px){.layout{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-bottom:14px}
.card h3{margin:0 0 8px;font-size:14px}#scenario-info h2{margin:0 0 4px;font-size:16px}#scenario-info p{margin:4px 0}
.expected{background:var(--soft);border-left:3px solid var(--muted);padding:5px 9px;font-size:13px}
.muted{color:var(--muted);font-size:12px}
#dates{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}button.date.on{background:var(--accent);color:#fff;border-color:var(--accent)}
button.date small{opacity:.7}
table.grid{border-collapse:collapse;width:100%;table-layout:fixed;font-size:12px}
table.grid th,table.grid td{border:1px solid var(--line);padding:4px;text-align:center;vertical-align:middle;height:44px}
table.grid thead th{background:var(--soft);height:auto}table.grid th small,table.grid td small{display:block;font-weight:400;color:var(--muted);font-size:10.5px}
table.grid th.room{text-align:left;background:var(--soft);width:128px}
td.free{background:var(--free);cursor:pointer}td.free:hover{outline:2px dashed var(--accent);outline-offset:-3px}
td.busy{background:var(--busy)}td.added{background:var(--added);outline:2px solid var(--ok);outline-offset:-2px}
td.moved{background:var(--moved);outline:2px solid #bf8700;outline-offset:-2px}td.fixed{box-shadow:inset 0 0 0 2px var(--fixed)}
td.frozen{background-image:repeating-linear-gradient(45deg,transparent 0 6px,rgba(9,105,218,.12) 6px 12px)}td.split{border-style:dashed}
td.closed{background:repeating-linear-gradient(45deg,var(--soft) 0 8px,var(--line) 8px 16px);color:var(--muted);font-weight:600}
.tag{display:inline-block;margin-left:4px;font-size:10px;padding:0 4px;border-radius:3px;background:rgba(127,127,127,.2)}
.legend{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--muted);margin-top:8px}.legend i{display:inline-block;width:14px;height:11px;vertical-align:middle;margin-right:4px;border:1px solid var(--line)}
.form label{display:block;font-size:12px;color:var(--muted);margin:6px 0 2px}.form select,.form input[type=text],.form input[type=number]{width:100%}
.form .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.form .checks{display:flex;gap:10px;flex-wrap:wrap;font-size:13px}
.form .checks label{display:inline-flex;gap:4px;color:var(--ink);margin:0}.form .actions{display:flex;gap:8px;margin-top:10px}
#f-units{height:150px}#f-students{font-size:12px;color:var(--muted);margin-top:4px}
.entry{border-left:4px solid var(--line);background:var(--soft);border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:13px}
.entry.ok{border-left-color:var(--ok)}.entry.no{border-left-color:var(--no)}.entry.repair{border-left-color:#bf8700}
.entry h4{margin:0 0 4px;font-size:13px}.entry ul{margin:2px 0;padding-left:18px}
.alts{display:flex;flex-direction:column;gap:4px;margin-top:6px}.alts button{text-align:left;font-size:12px}.alts button.split{border-style:dashed}
.unres{margin-top:6px;font-size:12.5px}
table.cmp{border-collapse:collapse;width:100%;font-size:13px}table.cmp th,table.cmp td{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top}
table.cmp th{width:190px;font-weight:600}.no{color:var(--no);font-weight:600}
#gen-opts{display:flex;gap:6px;align-items:center}#gen-opts[hidden]{display:none}
footer{padding:4px 24px 24px;font-size:12px;color:var(--muted)}`;

const body = `
<header><h1>RoomAllocation — demo V0</h1><span class="tagline">Motorul de alocare pe date sintetice · demonstrație, nu produs (fără bază de date, fără salvare)</span></header>
<div class="bar">
  <label>Scenariu <select id="sc-select"></select></label>
  <span id="gen-opts" hidden><label>seed <input id="gen-seed" type="number" value="1" min="1" style="width:70px"></label>
    <label>încărcare <select id="gen-level"><option>0.6</option><option selected>0.8</option><option>0.95</option></select></label><button id="gen-load">Generează</button></span>
  <span id="step-status"></span>
  <button id="btn-next" class="primary">Pasul următor ▸</button><button id="btn-all">Rulează tot ▸▸</button>
  <button id="btn-undo">◂ Înapoi</button><button id="btn-reset">Resetează</button>
  <label>Strategie <select id="opt-strategy"><option value="score">C · scor V0</option><option value="best-fit">B · best-fit</option><option value="first-fit">A · prima sală liberă</option></select></label>
  <label>Mutări M <select id="opt-m"><option>0</option><option>1</option><option selected>2</option></select></label>
  <span id="stats"></span>
</div>
<div class="layout">
  <main>
    <section class="card" id="scenario-info"></section>
    <section class="card"><div id="dates"></div><div id="grid"></div>
      <div class="legend"><span><i style="background:var(--added)"></i>nou la ultimul pas</span><span><i style="background:var(--moved)"></i>mutat (aceeași oră)</span><span><i style="box-shadow:inset 0 0 0 2px var(--fixed)"></i>fixat (examen/eveniment)</span><span><i style="background-image:repeating-linear-gradient(45deg,transparent 0 3px,rgba(9,105,218,.3) 3px 6px)"></i>orizont înghețat</span><span><i style="background:var(--line)"></i>sală închisă</span><span>Click pe o celulă liberă completează data și perechea în formular.</span></div>
    </section>
    <div id="comparison"></div>
    <section class="card"><h3>Jurnalul deciziilor (cel mai recent sus)</h3><div id="log"></div></section>
  </main>
  <aside>
    <section class="card form"><h3>Cerere nouă</h3>
      <label for="f-teacher">Profesor</label><input id="f-teacher" type="text">
      <label for="f-units">Participanți (flux, grupă sau subgrupă; Ctrl/⌘ pentru mai multe)</label><select id="f-units" multiple></select>
      <div id="f-students"></div>
      <label for="f-activity">Activitate</label>
      <select id="f-activity"><option value="seminar">seminar</option><option value="lab">laborator</option><option value="lecture">curs (flux)</option><option value="exam">examen</option><option value="event">eveniment</option></select>
      <div class="row"><div><label for="f-date">Data</label><select id="f-date"></select></div>
        <div><label for="f-start">Perechea</label><select id="f-start">${[1, 2, 3, 4, 5, 6, 7].map((i) => `<option>${i}</option>`).join('')}</select></div>
        <div><label for="f-length">Perechi</label><select id="f-length"><option>1</option><option>2</option><option>3</option></select></div></div>
      <label>Tipuri de sală acceptate</label>
      <div class="checks"><label><input type="checkbox" id="f-type-seminar">seminar</label><label><input type="checkbox" id="f-type-auditorium">auditoriu</label><label><input type="checkbox" id="f-type-lab">laborator</label></div>
      <div class="row"><div><label for="f-computers">Calculatoare (min.)</label><input id="f-computers" type="number" min="0"></div>
        <div><label>&nbsp;</label><div class="checks"><label><input type="checkbox" id="f-projector">proiector</label></div></div>
        <div><label>&nbsp;</label><div class="checks"><label title="Doar examenele și evenimentele se pot fixa (D19)"><input type="checkbox" id="f-fixed">fixat</label></div></div></div>
      <div class="actions"><button id="f-submit" class="primary">Trimite cererea</button><button id="f-compare">Compară strategiile</button></div>
    </section>
    <section class="card form"><h3>Închide o sală (reparații)</h3>
      <label for="c-room">Sala</label><select id="c-room"></select>
      <div class="row"><div><label for="c-from">De la</label><select id="c-from"></select></div><div><label for="c-to">Până la</label><select id="c-to"></select></div><div></div></div>
      <div class="actions"><button id="c-close">Închide și repară</button></div>
      <p class="muted">Rezervările afectate se realocă întâi la aceeași oră; fixările se anulează (D19) și rămân fixate în sala nouă.</p>
    </section>
  </aside>
</div>
<footer>Date fictive. Starea există doar în această pagină și se pierde la reîncărcare.</footer>`;

const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RoomAllocation — demo V0</title><style>${css}</style></head><body>${body}<script>${js}</script></body></html>`;

mkdirSync(`${root}out`, { recursive: true });
writeFileSync(`${root}out/demo.html`, html);
console.log(`Demo scris: ${root}out/demo.html (${(html.length / 1024).toFixed(0)} KB)`);
