import { submit } from '../../../src/api/handlers.ts';
import { jsonBody, pool, respond } from '../../../src/api/server.ts';

export const runtime = 'nodejs';

/** O cerere nouă (cu sau fără interval); corpul: { "request": {…}, "key"?: "…" }. 201 = decizie nouă, 200 = repetare. */
export async function POST(req: Request) {
  return respond(await submit(pool(), await jsonBody(req)));
}
