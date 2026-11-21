// Conexiunea la PostgreSQL (Lotul 5, D35). Adresa: variabila RA_DATABASE_URL, apoi `.env` din rădăcina
// repository-ului (ignorat de Git), apoi containerul local din docker-compose.yml.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { REPO_ROOT } from '../data/io.ts';

export const DEFAULT_DATABASE_URL = 'postgres://ra:ra_dev@127.0.0.1:54320/room_allocation';

function fromEnvFile(name: string): string | undefined {
  const file = join(REPO_ROOT, '.env');
  if (!existsSync(file)) return undefined;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const m = new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`).exec(raw);
    if (m) return m[1]!.replace(/^["']|["']$/g, '');
  }
  return undefined;
}

export function databaseUrl(env: Record<string, string | undefined> = process.env): string {
  return env.RA_DATABASE_URL ?? fromEnvFile('RA_DATABASE_URL') ?? DEFAULT_DATABASE_URL;
}

export function createPool(url = databaseUrl(), max = 10): pg.Pool {
  return new pg.Pool({ connectionString: url, max });
}

/** Adresa fără parolă, pentru mesaje. */
export function redact(url: string): string {
  return url.replace(/\/\/([^:/@]+):[^@]*@/, '//$1:***@');
}
