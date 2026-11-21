// Încarcă o secțiune de date (formatul intern, D33) în baza de date: săli, unități, profesori, săptămâna,
// orarul ca rezervări. Șterge datele existente (nu și schema). Rulare: npm run db:load -- synthetic   (sau: real)

import { buildWeek } from '../src/data/format.ts';
import { canonicalDir, parseSection, readDataset } from '../src/data/io.ts';
import { migrate } from '../src/db/migrate.ts';
import { createPool, databaseUrl, redact } from '../src/db/pool.ts';
import { loadWorld } from '../src/db/store.ts';

const section = parseSection(process.argv[2]);
const { dataset, issues } = readDataset(canonicalDir(section));
const week = buildWeek(dataset, issues);
const errors = week.issues.filter((i) => i.severity === 'error');
if (errors.length) {
  console.error(`Datele au ${errors.length} erori; rulați întâi: npm run data:check -- ${section}`);
  process.exit(1);
}
const pool = createPool();
try {
  await migrate(pool);
  await loadWorld(pool, {
    instance: week.instance,
    state: week.state,
    teachers: dataset.teachers,
    rooms: dataset.rooms,
    units: dataset.units,
  });
  const n = await pool.query<{ b: string; a: string }>('SELECT (SELECT count(*) FROM bookings) AS b, (SELECT count(*) FROM booking_atoms) AS a');
  console.log(`Baza de date: ${redact(databaseUrl())}`);
  console.log(`Încărcat (${section}): ${dataset.rooms.length} săli, ${dataset.units.length} unități, ${dataset.teachers.length} profesori, ${n.rows[0]!.b} rezervări (${n.rows[0]!.a} legături cu unități atomice).`);
} finally {
  await pool.end();
}
