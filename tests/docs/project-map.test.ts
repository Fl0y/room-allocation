// Verifică faptul că `info_pack/docs/project-map.md` este la zi:
// - fiecare fișier din `src/`, `tests/` și `scripts/` apare în hartă;
// - fiecare fișier numit în hartă (în secțiunile acestor foldere) există;
// - lista documentelor din §5 corespunde fișierelor `.md` din `info_pack/docs/`.
// Testul NU verifică dacă descrierile sunt corecte; acelea se actualizează manual (docs-guide.md §4).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MAP = join(ROOT, 'info_pack/docs/project-map.md');
const CODE_FOLDERS = ['src/', 'tests/', 'scripts/'];

/**
 * Extrage căile complete ale fișierelor din hartă. Folderul curent este ultimul folder scris
 * între backtick-uri într-un titlu (de exemplu „### `src/engine/`”); fișierele sunt în prima
 * coloană a tabelelor, între backtick-uri, cu calea relativă la acel folder.
 */
export function filesInMap(text: string): { code: string[]; docs: string[] } {
  const code: string[] = [];
  const docs: string[] = [];
  let base: string | null = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) {
      const folders = [...line.matchAll(/`([^`]+\/)`/g)].map((m) => m[1]!);
      base = folders.length ? folders[folders.length - 1]! : null;
      continue;
    }
    if (line.startsWith('Lista:')) {
      for (const m of line.matchAll(/`([^`]+\.md)`/g)) docs.push(m[1]!);
      continue;
    }
    if (base && CODE_FOLDERS.some((f) => base!.startsWith(f)) && line.startsWith('| `')) {
      const firstCell = line.split('|')[1] ?? '';
      for (const m of firstCell.matchAll(/`([^`]+)`/g)) code.push(base + m[1]!);
    }
  }
  return { code: code.sort(), docs: docs.sort() };
}

function filesOnDisk(folder: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(ROOT, p).split('\\').join('/'));
    }
  };
  if (existsSync(join(ROOT, folder))) walk(join(ROOT, folder));
  return out;
}

describe('harta proiectului (project-map.md)', () => {
  const map = filesInMap(readFileSync(MAP, 'utf8'));

  it('fiecare fișier din src/, tests/ și scripts/ apare în hartă', () => {
    const onDisk = CODE_FOLDERS.flatMap(filesOnDisk);
    const missing = onDisk.filter((f) => !map.code.includes(f));
    expect(missing, `lipsesc din project-map.md: ${missing.join(', ')}`).toEqual([]);
  });

  it('fiecare fișier numit în hartă există', () => {
    const absent = map.code.filter((f) => !existsSync(join(ROOT, f)));
    expect(absent, `numite în project-map.md, dar inexistente: ${absent.join(', ')}`).toEqual([]);
  });

  it('lista documentelor din §5 corespunde fișierelor din info_pack/docs/', () => {
    const onDisk = readdirSync(join(ROOT, 'info_pack/docs'))
      .filter((f) => f.endsWith('.md'))
      .sort();
    expect(map.docs).toEqual(onDisk);
  });

  it('cititorul hărții recunoaște folderul din titluri și tabele (verificare a testului)', () => {
    const sample = [
      '### `src/engine/` — motorul',
      '| `allocate.ts` | rol |',
      '## 4. Scripturile — `scripts/`',
      '| `simulate.ts` | `npm run simulate` | rezultat |',
      '## 5. Documentația',
      'Lista: `a.md`, `b.md`.',
    ].join('\n');
    expect(filesInMap(sample)).toEqual({ code: ['scripts/simulate.ts', 'src/engine/allocate.ts'], docs: ['a.md', 'b.md'] });
  });
});
