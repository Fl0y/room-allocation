// Legătura cu Next.js: o singură conexiune (pool) pe proces și conversia ApiResult → Response.

import type pg from 'pg';
import { createPool } from '../db/pool.ts';
import type { ApiResult } from './handlers.ts';

const g = globalThis as unknown as { __raPool?: pg.Pool };

export function pool(): pg.Pool {
  // păstrat pe globalThis, ca reîncărcarea modulelor în `next dev` să nu deschidă conexiuni noi
  return (g.__raPool ??= createPool());
}

export function respond(r: ApiResult): Response {
  return Response.json(r.body, { status: r.status });
}

export async function jsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
