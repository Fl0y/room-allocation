// Aplicarea migrațiilor SQL din db/migrations/ (Lotul 5a), în ordinea numelui, fiecare într-o tranzacție.
// O migrație aplicată nu se mai modifică; o schimbare de schemă înseamnă o migrație nouă.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';
import { REPO_ROOT } from '../data/io.ts';

export const MIGRATIONS_DIR = join(REPO_ROOT, 'db', 'migrations');

export function migrationFiles(dir = MIGRATIONS_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort();
}

/** Aplică migrațiile lipsă; întoarce numele celor aplicate acum. */
export async function migrate(pool: pg.Pool, dir = MIGRATIONS_DIR): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    // un singur proces aplică migrațiile la un moment dat
    await client.query('SELECT pg_advisory_lock(hashtext($1))', ['ra:migrate']);
    try {
      const done = new Set((await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
      for (const file of migrationFiles(dir)) {
        if (done.has(file)) continue;
        await client.query('BEGIN');
        try {
          await client.query(readFileSync(join(dir, file), 'utf8'));
          await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          applied.push(file);
        } catch (e) {
          await client.query('ROLLBACK');
          throw new Error(`migrația ${file} a eșuat: ${(e as Error).message}`);
        }
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', ['ra:migrate']);
    }
  } finally {
    client.release();
  }
  return applied;
}
