// Hook-ul de protecție al Claude Code (`.claude/hooks/guard.ts`, D47, D48): ce blochează și ce lasă să treacă.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { check, type HookInput } from '../../.claude/hooks/guard.ts';

const bash = (command: string): HookInput => ({ tool_name: 'Bash', tool_input: { command } });
const BRANCH = 'etapa/test';

describe('hook-ul de protecție — blocări', () => {
  it.each([
    ['gh pr merge 12 --rebase', BRANCH],
    ['git push --force', BRANCH],
    ['git push -f origin etapa/test', BRANCH],
    ['git push origin +etapa/test', BRANCH],
    ['git push --force-with-lease origin etapa/test', BRANCH],
    ['git push origin main', BRANCH],
    ['git push origin HEAD:main', BRANCH],
    ['git -C /x/room-allocation push origin main', BRANCH],
    ['cd /x && git push --force', BRANCH],
    ['git commit -F - <<EOF\nfeat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nEOF', BRANCH],
    ['git push --all', BRANCH],
    ['git push', 'main'],
    ['git commit -m "x"', 'main'],
    ['git add . && git commit -m "x\n\nCo-Authored-By: Claude <noreply@anthropic.com>"', BRANCH],
    ['git commit -m "🤖 Generated with Claude Code"', BRANCH],
    ['cat ../room-allocation-data/real/raw/orar.xlsx', BRANCH],
    ['ls ~/Desktop/academic_project/room-allocation-data/real/pseudonyms.csv', BRANCH],
  ])('%s (ramura %s)', (command, branch) => {
    expect(check(bash(command), branch)).not.toBeNull();
  });

  it('scrierea în room-allocation-data/real/', () => {
    const input: HookInput = { tool_name: 'Write', tool_input: { file_path: '/x/room-allocation-data/real/canonical/rooms.csv' } };
    expect(check(input, BRANCH)).not.toBeNull();
  });
});

describe('hook-ul de protecție — permise', () => {
  it.each([
    'git push -u origin etapa/test',
    'git push',
    'git commit -m "docs: actualizează CLAUDE.md și regulile Git"',
    'git switch -c docs/main-page',
    'git log --oneline main..HEAD',
    'gh pr create --base main --title "x" --body-file /tmp/body.md',
    'npm test',
    'echo "git push --force origin main"',
    "cat > skill.md <<'EOF'\n1. Fă commit cu git, fără `Co-Authored-By`.\n- git commit pe main e interzis\nEOF",
    'git add a.md && git commit -m "docs: regulile pentru git push pe main"',
    'ls ../room-allocation-data/synthetic/canonical',
  ])('%s', (command) => {
    expect(check(bash(command), BRANCH)).toBeNull();
  });

  it('scrierea în cod și în setul sintetic', () => {
    expect(check({ tool_name: 'Edit', tool_input: { file_path: '/x/room-allocation/src/engine/score.ts' } }, BRANCH)).toBeNull();
    expect(check({ tool_name: 'Write', tool_input: { file_path: '/x/room-allocation-data/synthetic/canonical/a.csv' } }, BRANCH)).toBeNull();
  });
});

describe('hook-ul de protecție — rulat ca proces (ca în Claude Code)', () => {
  const script = fileURLToPath(new URL('../../.claude/hooks/guard.ts', import.meta.url));
  const run = (input: HookInput) => spawnSync('node', [script], { input: JSON.stringify(input), encoding: 'utf8' });

  it('codul 2 și motivul în stderr la blocare', () => {
    const r = run(bash('gh pr merge 3'));
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('D47');
  });

  it('codul 0 când acțiunea e permisă', () => {
    expect(run(bash('npm test')).status).toBe(0);
  });
});
