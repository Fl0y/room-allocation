// Elemente comune pentru rapoartele HTML ale datelor (data-check, week): fișiere statice, fără rețea,
// lizibile în tema deschisă și întunecată.

export function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function fmt(x: number, digits = 1): string {
  return Number.isFinite(x) ? x.toFixed(digits) : '—';
}

export function pct(x: number, digits = 0): string {
  return Number.isFinite(x) ? `${(100 * x).toFixed(digits)}%` : '—';
}

export function table(head: string[], rows: (string | number)[][], numeric: boolean[] = []): string {
  const th = head.map((h, i) => `<th${numeric[i] ? ' class="n"' : ''}>${esc(h)}</th>`).join('');
  const tr = rows.map((r) => `<tr>${r.map((c, i) => `<td${numeric[i] ? ' class="n"' : ''}>${typeof c === 'number' ? esc(c) : c}</td>`).join('')}</tr>`).join('\n');
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

/** Bară orizontală simplă pentru o valoare între 0 și 1. */
export function bar(x: number): string {
  const w = Math.max(0, Math.min(1, x)) * 100;
  return `<span class="bar"><span style="width:${w.toFixed(1)}%"></span></span> ${pct(x)}`;
}

export function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
body{--fg:#1d1d1f;--muted:#6b6b70;--bg:#fff;--line:#e3e3e6;--accent:#2f6fd6;--bad:#c0392b;--warn:#b7791f;
 font:15px/1.5 system-ui,-apple-system,sans-serif;color:var(--fg);background:var(--bg);max-width:1100px;margin:2rem auto;padding:0 1rem}
@media (prefers-color-scheme:dark){body{--fg:#ececf0;--muted:#a0a0a8;--bg:#17171a;--line:#34343a;--accent:#6ea1ff;--bad:#ff7b6b;--warn:#e9b44c}}
h1{font-size:1.5rem;margin-bottom:.2rem}h2{font-size:1.15rem;margin-top:2rem;border-bottom:1px solid var(--line);padding-bottom:.3rem}
.muted{color:var(--muted)}table{border-collapse:collapse;width:100%;margin:.6rem 0;font-size:14px}
th,td{border-bottom:1px solid var(--line);padding:.35rem .5rem;text-align:left;vertical-align:top}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.error{color:var(--bad);font-weight:600}.warning{color:var(--warn);font-weight:600}
.bar{display:inline-block;width:120px;height:.7rem;background:var(--line);border-radius:3px;vertical-align:middle}
.bar>span{display:block;height:100%;background:var(--accent);border-radius:3px}
code{font-size:.9em}
</style></head><body>
${body}
</body></html>
`;
}
