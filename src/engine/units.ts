import type { Unit } from './types.ts';

/**
 * Ierarhia flux → grupă → subgrupă (D21). O unitate atomică este o unitate fără copii.
 * Conflictul de grupă (H3) = intersecția mulțimilor de unități atomice.
 */
export interface UnitIndex {
  byId: Map<string, Unit>;
  children: Map<string, string[]>;
  atoms: Map<string, string[]>;
}

export function validateUnits(units: Unit[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, Unit>();
  for (const u of units) {
    if (byId.has(u.id)) errors.push(`unitate duplicată: ${u.id}`);
    byId.set(u.id, u);
  }
  const hasChildren = new Set<string>();
  for (const u of units) {
    if (u.parent !== undefined) {
      if (!byId.has(u.parent)) errors.push(`${u.id}: părinte necunoscut ${u.parent}`);
      else hasChildren.add(u.parent);
    }
  }
  for (const u of units) {
    // ciclu: urcăm cel mult |units| pași
    let cur: Unit | undefined = u;
    let steps = 0;
    while (cur?.parent !== undefined && steps <= units.length) {
      cur = byId.get(cur.parent);
      steps++;
    }
    if (steps > units.length) errors.push(`${u.id}: ciclu în ierarhie`);
    if (hasChildren.has(u.id)) {
      if (u.size !== undefined) errors.push(`${u.id}: mărimea se declară doar pe unitatea cea mai mică`);
    } else if (u.size === undefined || !Number.isInteger(u.size) || u.size <= 0) {
      errors.push(`${u.id}: unitatea atomică trebuie să aibă o mărime întreagă pozitivă`);
    }
  }
  return errors;
}

export function buildUnitIndex(units: Unit[]): UnitIndex {
  const byId = new Map(units.map((u) => [u.id, u] as const));
  const children = new Map<string, string[]>();
  for (const u of units) {
    if (u.parent !== undefined) {
      const list = children.get(u.parent) ?? [];
      list.push(u.id);
      children.set(u.parent, list);
    }
  }
  const atoms = new Map<string, string[]>();
  const visit = (id: string, depth: number): string[] => {
    const memo = atoms.get(id);
    if (memo) return memo;
    const kids = children.get(id);
    const result =
      !kids || depth > units.length
        ? [id]
        : [...new Set(kids.flatMap((k) => visit(k, depth + 1)))].sort();
    atoms.set(id, result);
    return result;
  };
  for (const u of units) visit(u.id, 0);
  return { byId, children, atoms };
}

export function unknownUnits(index: UnitIndex, ids: readonly string[]): string[] {
  return ids.filter((id) => !index.byId.has(id));
}

export function atomsOf(index: UnitIndex, ids: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const id of ids) for (const a of index.atoms.get(id) ?? []) out.add(a);
  return out;
}

/** Numărul de studenți = suma mărimilor unităților atomice (fără dubluri). */
export function sizeOf(index: UnitIndex, ids: readonly string[]): number {
  let total = 0;
  for (const a of atomsOf(index, ids)) total += index.byId.get(a)?.size ?? 0;
  return total;
}

export function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (b.has(x)) return true;
  return false;
}
