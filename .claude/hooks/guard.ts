// Hook PreToolUse pentru Claude Code (D47, D48): garanții care nu depind de ce „ține minte” agentul.
// Blochează: merge-ul PR-urilor, commit-ul și push-ul pe `main`, push-ul forțat, semnăturile lui Claude
// în mesajele de commit, accesul la datele reale originale și scrierea în `room-allocation-data/real/`.
// Rulat de `.claude/settings.json` cu datele acțiunii în JSON pe stdin; codul 2 blochează acțiunea,
// iar mesajul din stderr ajunge la agent. Testat în `tests/tools/guard.test.ts`.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface HookInput {
  tool_name?: string;
  tool_input?: { command?: string; file_path?: string; notebook_path?: string };
  cwd?: string;
}

const SIGNATURE = /co-authored-by|generated with|noreply@anthropic|🤖/i;
const RAW_DATA = /\breal\/(raw|pseudonyms)/;
const MAIN = /(^|[\s:])main(\s|$)/;

/** Împarte o comandă shell în comenzi simple (după `&&`, `||`, `;`, `|`, linie nouă). */
function segments(command: string): string[] {
  return command.split(/&&|\|\||;|\||\n/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Subcomanda Git a unei comenzi simple care *începe* cu `git` (după eventuale variabile de mediu și opțiuni
 * globale ca `-C dir`, `-c k=v`), de exemplu `push` sau `commit`; `null` pentru orice altă comandă.
 * Textul care doar menționează Git (un heredoc, un `echo`) nu e o comandă Git.
 */
export function gitSubcommand(seg: string): string | null {
  const m = /^(?:\w+=\S*\s+)*git((?:\s+-[cC]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*)\s+([a-z][\w-]*)/.exec(seg);
  return m ? m[2]! : null;
}

/** Motivul blocării sau `null` dacă acțiunea e permisă. `branch` = ramura curentă a repository-ului. */
export function check(input: HookInput, branch: string): string | null {
  const tool = input.tool_name ?? '';
  const ti = input.tool_input ?? {};

  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit' || tool === 'MultiEdit') {
    const path = ti.file_path ?? ti.notebook_path ?? '';
    if (/room-allocation-data\/real\//.test(path))
      return 'Scrierea în room-allocation-data/real/ este interzisă: datele reale se produc doar de convertor (D33).';
    return null;
  }
  if (tool !== 'Bash') return null;

  const command = ti.command ?? '';
  if (RAW_DATA.test(command))
    return 'Fișierele originale (real/raw/) și corespondența pseudonimelor nu se citesc (CLAUDE.md, D33).';

  for (const seg of segments(command)) {
    if (/^(?:\w+=\S*\s+)*gh\s+pr\s+merge\b/.test(seg)) return 'Merge-ul PR-urilor îl face doar autorul (D47).';
    const sub = gitSubcommand(seg);
    if (!sub) continue;

    if (sub === 'push') {
      if (/\s(--force|--force-with-lease|--force-if-includes|-f)(\s|=|$)|\s\+\S/.test(seg))
        return 'Push-ul forțat este interzis: istoricul publicat nu se rescrie (D47).';
      if (/\s(--all|--mirror)(\s|$)/.test(seg)) return 'Push-ul tuturor ramurilor este interzis; se face push doar pe ramura sarcinii (D47).';
      if (MAIN.test(seg.replace(/^.*?\bpush\b/, ' '))) return 'Push-ul pe main este interzis; schimbările ajung în main doar prin PR (D47).';
      if (branch === 'main') return 'Ramura curentă este main: creează o ramură pentru sarcină înainte de push (D47).';
    }
    if (sub === 'commit') {
      if (branch === 'main') return 'Commit-ul pe main este interzis: creează o ramură pentru sarcină (`git switch -c etapa/…`, D47).';
      // mesajul poate continua pe rândurile următoare (ghilimele sau heredoc): se verifică tot ce urmează
      if (SIGNATURE.test(command.slice(command.indexOf(seg)))) return 'Mesajul de commit nu conține semnături ale lui Claude (Co-Authored-By, „Generated with”, D44, D47).';
    }
  }
  return null;
}

function currentBranch(cwd: string | undefined): string {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const input = JSON.parse(readFileSync(0, 'utf8')) as HookInput;
  const reason = check(input, currentBranch(input.cwd));
  if (reason) {
    process.stderr.write(`Blocat de .claude/hooks/guard.ts: ${reason}\n`);
    process.exit(2);
  }
}
