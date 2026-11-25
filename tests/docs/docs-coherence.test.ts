// Coerența documentației (D48): prinde automat abaterile care altfel se observă doar la recitire.
// - fiecare decizie sau propunere citată (Dnn, Pnn) există în `decisions.md`;
// - o decizie înlocuită nu e citată ca valabilă: în afara documentelor istorice, rândul care o citează
//   trebuie să citeze și decizia care o înlocuiește;
// - regulile care numesc „cazurile 1–N” au N egal cu numărul cazurilor din `src/scenarios/`.
// Ce NU verifică: conținutul afirmațiilor; acela se verifică la încheierea etapei (docs-guide.md §4).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DOCS = 'info_pack/docs';
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** Documentele active: regulile, README și tot ce e în info_pack/docs/ (plus specificațiile, dacă există). */
function activeFiles(): string[] {
  const docs = readdirSync(join(ROOT, DOCS)).filter((f) => f.endsWith('.md')).map((f) => `${DOCS}/${f}`);
  return ['CLAUDE.md', 'README.md', ...docs];
}

/** Documentele în care citarea unei decizii vechi e istorie, nu regulă. */
const HISTORICAL = new Set([`${DOCS}/decisions.md`, `${DOCS}/journal.md`, `${DOCS}/results.md`]);

/** ID-urile definite (prima coloană a tabelelor din decisions.md) și cele înlocuite, cu înlocuitorul. */
export function parseDecisions(text: string): { defined: Set<string>; replaced: Map<string, string> } {
  const defined = new Set<string>();
  const replaced = new Map<string, string>();
  for (const line of text.split('\n')) {
    const m = /^\|\s*([DPO]\d{2})\s*\|(.*)$/.exec(line);
    if (!m) continue;
    defined.add(m[1]!);
    const r = /^\s*\*\(înlocuit de ([DP]\d{2})\)\*/.exec(m[2]!);
    if (r) replaced.set(m[1]!, r[1]!);
  }
  return { defined, replaced };
}

/** Citările Dnn / Pnn dintr-un text, cu numărul rândului. */
export function citations(text: string): { id: string; line: number; text: string }[] {
  const out: { id: string; line: number; text: string }[] = [];
  text.split('\n').forEach((t, i) => {
    for (const m of t.matchAll(/\b([DP]\d{2})\b/g)) out.push({ id: m[1]!, line: i + 1, text: t });
  });
  return out;
}

function caseCount(): number {
  const ids = new Set<string>();
  for (const f of readdirSync(join(ROOT, 'src/scenarios')).filter((f) => f.endsWith('.ts')))
    for (const m of read(`src/scenarios/${f}`).matchAll(/\bid:\s*'case(\d+)'/g)) ids.add(m[1]!);
  return ids.size;
}

describe('coerența documentației', () => {
  const { defined, replaced } = parseDecisions(read(`${DOCS}/decisions.md`));

  it('fiecare Dnn / Pnn citat există în decisions.md', () => {
    const missing = activeFiles().flatMap((f) =>
      citations(read(f))
        .filter((c) => !defined.has(c.id))
        .map((c) => `${f}:${c.line} ${c.id}`),
    );
    expect(missing, `ID-uri inexistente în decisions.md: ${missing.join('; ')}`).toEqual([]);
  });

  it('o decizie înlocuită e citată doar împreună cu înlocuitorul (în afara documentelor istorice)', () => {
    const stale = activeFiles()
      .filter((f) => !HISTORICAL.has(f))
      .flatMap((f) =>
        citations(read(f))
          .filter((c) => replaced.has(c.id) && !new RegExp(`\\b${replaced.get(c.id)}\\b`).test(c.text))
          .map((c) => `${f}:${c.line} ${c.id} (înlocuit de ${replaced.get(c.id)})`),
      );
    expect(stale, `decizii înlocuite citate ca valabile: ${stale.join('; ')}`).toEqual([]);
  });

  it('„cazurile 1–N” din reguli corespunde numărului de cazuri din src/scenarios/', () => {
    const n = caseCount();
    expect(n).toBeGreaterThan(0);
    const wrong = activeFiles().flatMap((f) =>
      [...read(f).matchAll(/cazurile 1[–-](\d+), oracolul/g)].filter((m) => Number(m[1]) !== n).map((m) => `${f}: 1–${m[1]}`),
    );
    expect(wrong, `numărul cazurilor (${n}) diferă în: ${wrong.join('; ')}`).toEqual([]);
  });

  it('cititorul registrului recunoaște deciziile și înlocuirile (verificare a testului)', () => {
    const sample = ['| D01 | text |', '| D02 | *(înlocuit de D03)* text |', '| D03 | text |', '| P01 | text |'].join('\n');
    const { defined: d, replaced: r } = parseDecisions(sample);
    expect([...d]).toEqual(['D01', 'D02', 'D03', 'P01']);
    expect([...r]).toEqual([['D02', 'D03']]);
    expect(citations('vezi D02 și P01').map((c) => c.id)).toEqual(['D02', 'P01']);
  });
});
