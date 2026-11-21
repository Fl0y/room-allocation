import { applyAlt } from '../../../src/api/handlers.ts';
import { jsonBody, pool, respond } from '../../../src/api/server.ts';

export const runtime = 'nodejs';

/** Aplicarea unei alternative propuse (altă pereche/zi sau ruperea blocului, D20); corpul: { "request", "alternative" }. */
export async function POST(req: Request) {
  return respond(await applyAlt(pool(), await jsonBody(req)));
}
