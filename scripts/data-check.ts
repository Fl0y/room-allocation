// Validează o secțiune de date în formatul intern și scrie raportul în afara repository-ului (D33):
//   <folderul datelor>/<secțiune>/reports/validation.html și validation.json
// Rulare: npm run data:check -- synthetic      (sau: real)
// Codul de ieșire este 1 dacă există erori.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildWeek, type Issue } from '../src/data/format.ts';
import { canonicalDir, dataRoot, parseSection, readDataset, reportsDir } from '../src/data/io.ts';
import { summarizeData, type Range } from '../src/data/summary.ts';
import { esc, page, table } from './report-html.ts';

const section = parseSection(process.argv[2]);
const dir = canonicalDir(section);
const { dataset, issues: parseIssues } = readDataset(dir);
const week = buildWeek(dataset, parseIssues);
const summary = summarizeData(dataset, week.issues);

const r = (x: Range) => (x.n ? `${x.min} / ${x.median} / ${x.max}` : '—');
const TYPE = { auditorium: 'auditorii', seminar: 'săli de seminar', lab: 'laboratoare' } as const;
const KIND = { flux: 'fluxuri', group: 'grupe', subgroup: 'subgrupe' } as const;

const issueRows = week.issues
  .slice()
  .sort((a, b) => (a.severity === b.severity ? a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0) : a.severity === 'error' ? -1 : 1))
  .map((i: Issue) => [`<span class="${i.severity}">${i.severity === 'error' ? 'eroare' : 'avertisment'}</span>`, esc(i.file), i.line ?? '', esc(i.code), esc(i.message)]);

const body = `
<h1>Validarea datelor — ${esc(section === 'real' ? 'date reale' : 'date sintetice')}</h1>
<p class="muted">${esc(dataset.manifest.name)} · săptămâna ${esc(dataset.manifest.week.join(', '))}${dataset.manifest.seed !== undefined ? ` · seed ${dataset.manifest.seed}` : ''} · generat ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))}</p>
<p><strong>${summary.issues.errors} erori</strong>, ${summary.issues.warnings} avertismente. ${summary.issues.errors ? 'Datele nu sunt gata pentru simulare.' : 'Datele pot fi folosite în simulator.'}</p>

<h2>Săli</h2>
${table(['Tip', 'Număr', 'Locuri (min / mediană / max)', 'Calculatoare (min / mediană / max)', 'Cu proiector'], (['auditorium', 'seminar', 'lab'] as const).map((t) => [TYPE[t], summary.rooms[t].capacity.n, r(summary.rooms[t].capacity), r(summary.rooms[t].computers), summary.rooms[t].projectors]), [false, true, true, true, true])}

<h2>Studenți</h2>
${table(['Unitate', 'Număr', 'Studenți (min / mediană / max)'], [...(['flux', 'group', 'subgroup'] as const).map((k) => [KIND[k], summary.units[k].n, r(summary.units[k])]), ['unități atomice', summary.atoms.n, r(summary.atoms)]], [false, true, true])}
<p>Total studenți: <strong>${summary.students}</strong>.</p>

<h2>Profesori, discipline, orar</h2>
${table(['Element', 'Valoare'], [
  ['profesori (pseudonime)', summary.teachers.count],
  ['perechi pe săptămână per profesor (min / mediană / max)', r(summary.teachers.load)],
  ['discipline', summary.courses],
  ['repartizări', Object.entries(summary.assignments).map(([k, v]) => `${esc(k)}: ${v}`).join(', ')],
  ['ședințe în orar', summary.sessions],
  ['perechi-sală ocupate pe săptămână', summary.periodsPerWeek],
])}

<h2>Probleme găsite</h2>
${issueRows.length ? table(['Gravitate', 'Fișier', 'Linia', 'Cod', 'Descriere'], issueRows) : '<p>Nicio problemă: referințele sunt corecte, iar orarul trece verificatorul H1–H7 (fără suprapuneri de sală, profesor sau grupă; capacitate, tip și echipamente potrivite).</p>'}
`;

const out = reportsDir(section);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'validation.html'), page(`Validare — ${section}`, body));
writeFileSync(join(out, 'validation.json'), JSON.stringify({ section, manifest: dataset.manifest, summary, issues: week.issues }, null, 2));
console.log(`Date: ${dir}`);
console.log(`Erori: ${summary.issues.errors}, avertismente: ${summary.issues.warnings}`);
for (const i of week.issues.slice(0, 10)) console.log(`  [${i.severity}] ${i.file}${i.line ? `:${i.line}` : ''} ${i.code} — ${i.message}`);
if (week.issues.length > 10) console.log(`  … încă ${week.issues.length - 10}`);
console.log(`Raport: ${join(out, 'validation.html')}`);
console.log(`(rădăcina datelor: ${dataRoot()})`);
if (summary.issues.errors) process.exitCode = 1;
