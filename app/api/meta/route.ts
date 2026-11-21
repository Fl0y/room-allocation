import { getMeta } from '../../../src/api/handlers.ts';
import { pool, respond } from '../../../src/api/server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sălile, unitățile (cu numărul de studenți), profesorii (pseudonime), zilele și grila perechilor. */
export async function GET() {
  return respond(await getMeta(pool()));
}
