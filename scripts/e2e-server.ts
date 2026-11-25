// Serverul pentru testele Playwright (Lotul 6b, D40, D45): o bază de date nouă cu datele cazului 5 (laboratoare,
// grupe, rezervări, o sală de închis), apoi `next start`. La oprire, baza de date se șterge.
// Pornit de playwright.config.ts; necesită `next build` făcut înainte și PostgreSQL pornit.

import { spawn } from 'node:child_process';
import pg from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { createPool, databaseUrl } from '../src/db/pool.ts';
import { loadWorld } from '../src/db/store.ts';
import { case5 } from '../src/scenarios/cases.ts';

const PORT = process.env.E2E_PORT ?? '3200';
const admin = databaseUrl();
const name = `ra_e2e_${process.pid}`;
const a = new pg.Client({ connectionString: admin });
await a.connect();
// bazele rămase de la rulări întrerupte (Playwright poate opri serverul fără să-i lase timp de curățenie)
for (const r of (await a.query<{ datname: string }>("SELECT datname FROM pg_database WHERE datname LIKE 'ra\\_e2e\\_%'")).rows)
  await a.query(`DROP DATABASE IF EXISTS ${r.datname} WITH (FORCE)`);
await a.query(`CREATE DATABASE ${name}`);
await a.end();
const url = new URL(admin);
url.pathname = `/${name}`;
const pool = createPool(url.toString());
await migrate(pool);
await loadWorld(pool, { instance: case5.instance, state: case5.initial }, ['T9']);
await pool.end();

const server = spawn('npx', ['next', 'start', '-p', PORT], { stdio: 'inherit', env: { ...process.env, RA_DATABASE_URL: url.toString() } });
const stop = async () => {
  server.kill('SIGTERM');
  const c = new pg.Client({ connectionString: admin });
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await c.end();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
