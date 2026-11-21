import { close, listClosures } from '../../../src/api/handlers.ts';
import { jsonBody, pool, respond } from '../../../src/api/server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return respond(await listClosures(pool()));
}

/** Închiderea unei săli cu repararea automată (D19, D38); corpul: { "roomId", "from", "to", "reason" }. */
export async function POST(req: Request) {
  return respond(await close(pool(), await jsonBody(req)));
}
