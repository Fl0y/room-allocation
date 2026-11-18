// Citirea și scrierea datelor pe disc (D33). Folderul datelor stă în afara repository-ului:
// implicit `../room-allocation-data` (lângă repository), sau calea din `RA_DATA_DIR`
// (variabilă de mediu sau fișierul `.env` din rădăcina repository-ului, ignorat de Git).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILES, MANIFEST_FILE, parseDataset, serializeDataset, type Dataset, type Issue, type TableName } from './format.ts';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export type Section = 'synthetic' | 'real';

/** Rădăcina folderului de date. */
export function dataRoot(env: NodeJS.ProcessEnv = process.env): string {
  if (!env.RA_DATA_DIR) {
    const envFile = join(REPO_ROOT, '.env');
    if (existsSync(envFile)) {
      for (const raw of readFileSync(envFile, 'utf8').split('\n')) {
        const m = /^\s*RA_DATA_DIR\s*=\s*(.*?)\s*$/.exec(raw);
        if (m) return resolve(REPO_ROOT, m[1]!.replace(/^["']|["']$/g, ''));
      }
    }
    return resolve(REPO_ROOT, '../room-allocation-data');
  }
  return resolve(REPO_ROOT, env.RA_DATA_DIR);
}

/** Folderul cu formatul intern al unei secțiuni (`<rădăcină>/<secțiune>/canonical`). */
export const canonicalDir = (section: Section, root = dataRoot()) => join(root, section, 'canonical');
/** Folderul rapoartelor unei secțiuni; rapoartele pe date reale nu intră în repository. */
export const reportsDir = (section: Section, root = dataRoot()) => join(root, section, 'reports');

export function readDataset(dir: string): { dataset: Dataset; issues: Issue[] } {
  if (!existsSync(dir)) throw new Error(`Folderul de date nu există: ${dir}`);
  const files: Partial<Record<TableName | 'manifest', string>> = {};
  const read = (name: string) => {
    const p = join(dir, name);
    return existsSync(p) ? readFileSync(p, 'utf8') : undefined;
  };
  files.manifest = read(MANIFEST_FILE);
  for (const [k, f] of Object.entries(FILES) as [TableName, string][]) files[k] = read(f);
  return parseDataset(files);
}

export function writeDataset(dir: string, d: Dataset): string[] {
  mkdirSync(dir, { recursive: true });
  const text = serializeDataset(d);
  const written: string[] = [];
  const put = (name: string, content: string) => {
    writeFileSync(join(dir, name), content);
    written.push(name);
  };
  put(MANIFEST_FILE, text.manifest);
  for (const [k, f] of Object.entries(FILES) as [TableName, string][]) put(f, text[k]);
  return written;
}

export function parseSection(arg: string | undefined): Section {
  if (arg === 'synthetic' || arg === 'real') return arg;
  throw new Error(`Secțiunea trebuie să fie „synthetic” sau „real”, nu „${arg ?? ''}”`);
}
