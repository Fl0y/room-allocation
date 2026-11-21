// Aplică migrațiile SQL pe baza de date (Lotul 5a). Rulare: npm run db:migrate
// Baza de date: RA_DATABASE_URL (variabilă sau .env), implicit containerul din docker-compose.yml.

import { createPool, databaseUrl, redact } from '../src/db/pool.ts';
import { migrate } from '../src/db/migrate.ts';

const pool = createPool();
try {
  const applied = await migrate(pool);
  console.log(`Baza de date: ${redact(databaseUrl())}`);
  console.log(applied.length ? `Migrații aplicate: ${applied.join(', ')}` : 'Schema este la zi.');
} finally {
  await pool.end();
}
