import { calendar } from '../../../src/api/handlers.ts';
import { pool, respond } from '../../../src/api/server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Exportul .ics (D39): ?unit=… (flux, grupă, subgrupă) sau ?teacher=…; opțional &from= &to= */
export async function GET(req: Request) {
  const r = await calendar(pool(), Object.fromEntries(new URL(req.url).searchParams));
  if ('headers' in r) return new Response(r.body, { status: r.status, headers: r.headers });
  return respond(r);
}
