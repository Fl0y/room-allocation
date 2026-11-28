// Verificarea completă (D48, skill-ul `/verifica`): rulează pe rând testele, tipurile, testele pe baza de date
// și testele de interfață, apoi afișează un tabel compact. Pornește baza de date dacă nu rulează și o oprește
// la final doar dacă a pornit-o el. La un eșec, afișează finalul ieșirii comenzii respective.
// Rulare: npm run verify   [-- --no-db] [-- --no-e2e]
// Codul de ieșire: 0 dacă tot ce s-a rulat a trecut, 1 altfel.

import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const withDb = !args.has('--no-db');
const withE2e = withDb && !args.has('--no-e2e');
const CONTAINER = 'room-allocation-db';

interface Step {
  name: string;
  status: 'trece' | 'PICĂ' | 'nerulat';
  detail: string;
  seconds: number;
  tail?: string;
}

function run(cmd: string, argv: string[]): { ok: boolean; out: string; seconds: number } {
  const t = Date.now();
  const r = spawnSync(cmd, argv, { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
  // fără codurile de culoare ANSI, ca tabelul să rămână lizibil
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '');
  return { ok: r.status === 0, out, seconds: (Date.now() - t) / 1000 };
}

/** Rezumatul numărului de teste din ieșirea Vitest sau Playwright. */
function summarize(out: string): string {
  const vitest = /Tests\s+(.+?)\s*\(\d+\)/.exec(out) ?? /Tests\s+(.+)/.exec(out);
  if (vitest) return vitest[1]!.trim();
  const passed = /(\d+) passed/.exec(out);
  const failed = /(\d+) failed/.exec(out);
  const parts = [passed && `${passed[1]} passed`, failed && `${failed[1]} failed`].filter(Boolean);
  return parts.join(', ');
}

const tail = (out: string, n = 40) => out.trimEnd().split('\n').slice(-n).join('\n');
const steps: Step[] = [];

function step(name: string, cmd: string, argv: string[], detail?: (out: string) => string): boolean {
  const r = run(cmd, argv);
  steps.push({
    name,
    status: r.ok ? 'trece' : 'PICĂ',
    detail: detail ? detail(r.out) : r.ok ? 'fără erori' : 'erori',
    seconds: r.seconds,
    tail: r.ok ? undefined : tail(r.out),
  });
  return r.ok;
}
const skip = (name: string, why: string) => steps.push({ name, status: 'nerulat', detail: why, seconds: 0 });

step('npm test', 'npm', ['test'], summarize);
step('npm run typecheck', 'npm', ['run', 'typecheck']);

let started = false;
if (!withDb) {
  skip('npm run test:db', '--no-db');
  skip('npm run test:e2e', '--no-db');
} else if (!run('docker', ['info', '--format', '{{.ServerVersion}}']).ok) {
  skip('npm run test:db', 'Docker nu rulează (pornește Docker Desktop)');
  skip('npm run test:e2e', 'Docker nu rulează');
} else {
  const running = run('docker', ['ps', '--filter', `name=^${CONTAINER}$`, '--format', '{{.Names}}']).out.trim() === CONTAINER;
  const up = running || step('npm run db:up', 'npm', ['run', 'db:up'], () => 'PostgreSQL pornit');
  started = !running && up;
  if (up) {
    step('npm run test:db', 'npm', ['run', 'test:db'], summarize);
    if (withE2e) step('npm run test:e2e', 'npm', ['run', 'test:e2e'], summarize);
    else skip('npm run test:e2e', '--no-e2e');
  } else {
    skip('npm run test:db', 'baza de date nu a pornit');
    skip('npm run test:e2e', 'baza de date nu a pornit');
  }
  if (started) step('npm run db:down', 'npm', ['run', 'db:down'], () => 'baza de date oprită');
}

const commit = run('git', ['rev-parse', '--short', 'HEAD']).out.trim();
const branch = run('git', ['branch', '--show-current']).out.trim();
const now = new Date().toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' });
console.log(`\nVerificarea completă — ${now}, ramura ${branch || '(detașat)'}, commit ${commit}\n`);
console.log('| Comandă | Rezultat | Detalii | Durată |');
console.log('|---|---|---|---|');
for (const s of steps) console.log(`| \`${s.name}\` | ${s.status} | ${s.detail} | ${s.seconds ? `${s.seconds.toFixed(1)} s` : '—'} |`);
for (const s of steps.filter((s) => s.tail)) console.log(`\n--- ${s.name}: finalul ieșirii ---\n${s.tail}`);

process.exit(steps.some((s) => s.status === 'PICĂ') ? 1 : 0);
