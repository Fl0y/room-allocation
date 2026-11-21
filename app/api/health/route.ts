import { health } from '../../../src/api/handlers.ts';
import { pool, respond } from '../../../src/api/server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return respond(await health(pool()));
}
