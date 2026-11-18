import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildWeek } from '../../src/data/format.ts';
import { REPO_ROOT, canonicalDir, dataRoot, parseSection, readDataset, reportsDir, writeDataset } from '../../src/data/io.ts';

import { MINI_DIR as MINI } from '../support/mini.ts';

describe('folderul datelor (D33)', () => {
  it('implicit: room-allocation-data lângă repository; RA_DATA_DIR are prioritate', () => {
    expect(dataRoot({})).toBe(existsEnv() ?? resolve(REPO_ROOT, '../room-allocation-data'));
    expect(dataRoot({ RA_DATA_DIR: '/tmp/x' })).toBe('/tmp/x');
    expect(canonicalDir('synthetic', '/d')).toBe('/d/synthetic/canonical');
    expect(reportsDir('real', '/d')).toBe('/d/real/reports');
  });

  it('secțiunea este doar synthetic sau real', () => {
    expect(parseSection('real')).toBe('real');
    expect(() => parseSection('reale')).toThrow();
  });

  it('scrie și recitește un set de date', () => {
    const { dataset } = readDataset(MINI);
    const dir = mkdtempSync(join(tmpdir(), 'ra-data-'));
    writeDataset(dir, dataset);
    const again = readDataset(dir);
    expect(again.issues).toEqual([]);
    expect(buildWeek(again.dataset).issues).toEqual([]);
    expect(readFileSync(join(dir, 'units.csv'), 'utf8')).toContain('"Programul A, anul 1"');
  });

  it('un fișier lipsă este raportat, nu aruncă excepție', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ra-data-'));
    writeFileSync(join(dir, 'dataset.json'), readFileSync(join(MINI, 'dataset.json')));
    const r = readDataset(dir);
    expect(r.issues.filter((i) => i.code === 'FILE_MISSING')).toHaveLength(6);
  });
});

/** Dacă autorul are un `.env` cu RA_DATA_DIR, valoarea implicită vine de acolo. */
function existsEnv(): string | undefined {
  try {
    const m = /^\s*RA_DATA_DIR\s*=\s*(.*?)\s*$/m.exec(readFileSync(join(REPO_ROOT, '.env'), 'utf8'));
    return m ? resolve(REPO_ROOT, m[1]!.replace(/^["']|["']$/g, '')) : undefined;
  } catch {
    return undefined;
  }
}
