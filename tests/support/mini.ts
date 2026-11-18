// Exemplul mic din Git (tests/fixtures/mini/), citit ca text: datele pe care rulează testele fără folderul extern (D33).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILES, MANIFEST_FILE, type TableName } from '../../src/data/format.ts';

export const MINI_DIR = fileURLToPath(new URL('../fixtures/mini/', import.meta.url));

export function miniFiles(): Record<TableName | 'manifest', string> {
  const out = { manifest: readFileSync(join(MINI_DIR, MANIFEST_FILE), 'utf8') } as Record<TableName | 'manifest', string>;
  for (const [k, f] of Object.entries(FILES) as [TableName, string][]) out[k] = readFileSync(join(MINI_DIR, f), 'utf8');
  return out;
}
