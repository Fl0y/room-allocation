import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '../../src/data/csv.ts';

describe('CSV', () => {
  it('citește ghilimele, virgule și rânduri noi în câmpuri, cu numerele liniilor', () => {
    const t = parseCsv('﻿id,name\r\n1,"Sala 202, etajul 2"\r\n\r\n2,"spune ""da"""\n3,"pe\ndouă linii"\n4,ultim');
    expect(t.header).toEqual(['id', 'name']);
    expect(t.rows.map((r) => r.values.name)).toEqual(['Sala 202, etajul 2', 'spune "da"', 'pe\ndouă linii', 'ultim']);
    expect(t.rows.map((r) => r.line)).toEqual([2, 4, 5, 7]);
  });

  it('scrierea și citirea dau aceleași valori', () => {
    const rows = [
      ['a', 'b, c', 1, true],
      ['"x"', '', 0, false],
    ] as const;
    const t = parseCsv(toCsv(['p', 'q', 'r', 's'], rows));
    expect(t.rows.map((r) => [r.values.p, r.values.q, r.values.r, r.values.s])).toEqual([
      ['a', 'b, c', '1', '1'],
      ['"x"', '', '0', '0'],
    ]);
  });
});
