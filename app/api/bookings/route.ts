import { listBookings } from '../../../src/api/handlers.ts';
import { pool, respond } from '../../../src/api/server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Rezervările, filtrate după ?day= &from= &to= &room= &unit= &teacher= */
export async function GET(req: Request) {
  return respond(await listBookings(pool(), Object.fromEntries(new URL(req.url).searchParams)));
}
