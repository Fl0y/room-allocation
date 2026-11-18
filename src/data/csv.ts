// CSV minimal (RFC 4180): virgulă ca separator, ghilimele duble pentru câmpurile cu virgule,
// ghilimele sau rânduri noi. Fără dependențe externe. Fiecare rând păstrează numărul liniei din fișier,
// ca raportul de validare să poată trimite la sursă.

export interface CsvRow {
  /** Numărul liniei din fișier (antetul este linia 1). */
  line: number;
  values: Record<string, string>;
}

export interface CsvTable {
  header: string[];
  rows: CsvRow[];
}

export function parseCsv(text: string): CsvTable {
  const records: { line: number; fields: string[] }[] = [];
  let field = '';
  let fields: string[] = [];
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const endRecord = () => {
    fields.push(field);
    // rândurile complet goale se ignoră
    if (!(fields.length === 1 && fields[0] === '')) records.push({ line: recordLine, fields });
    fields = [];
    field = '';
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else {
        if (c === '\n') line++;
        field += c;
      }
      continue;
    }
    if (c === '"' && field === '') inQuotes = true;
    else if (c === ',') {
      fields.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      endRecord();
      line++;
      recordLine = line;
    } else field += c;
  }
  if (field !== '' || fields.length) endRecord();
  const [head, ...body] = records;
  const header = (head?.fields ?? []).map((h) => h.trim());
  const rows = body.map((r) => {
    const values: Record<string, string> = {};
    header.forEach((h, k) => (values[h] = (r.fields[k] ?? '').trim()));
    return { line: r.line, values };
  });
  return { header, rows };
}

function quote(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | boolean | undefined)[])[]): string {
  const cell = (v: string | number | boolean | undefined) => (v === undefined ? '' : typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  return [header.join(','), ...rows.map((r) => r.map((v) => quote(cell(v))).join(','))].join('\n') + '\n';
}
