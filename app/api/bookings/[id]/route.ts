import { cancel } from '../../../../src/api/handlers.ts';
import { jsonBody, pool, respond } from '../../../../src/api/server.ts';

export const runtime = 'nodejs';

/** Anularea unei rezervări; corpul: { "teacher": "P-001" } sau { "admin": true } (D37). */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return respond(await cancel(pool(), id, await jsonBody(req)));
}
