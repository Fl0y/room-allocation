// Generează setul sintetic al facultății în formatul intern (plan.md Lotul 3a.2, D33) și îl scrie în
//   <folderul datelor>/synthetic/canonical/
// Același seed dă exact aceleași fișiere. Rulare: npm run data:synthetic   (sau: -- --seed=7)
// Apoi: npm run data:check -- synthetic

import { canonicalDir } from '../src/data/io.ts';
import { writeDataset } from '../src/data/io.ts';
import { generateFaculty } from '../src/sim/faculty.ts';

const arg = process.argv.slice(2).find((a) => a.startsWith('--seed='));
const seed = arg ? Number(arg.slice('--seed='.length)) : 1;
if (!Number.isInteger(seed)) throw new Error('--seed trebuie să fie un număr întreg');

const { dataset, unscheduled } = generateFaculty(seed);
const dir = canonicalDir('synthetic');
const files = writeDataset(dir, dataset);
console.log(`Set sintetic (seed ${seed}) scris în ${dir}:`);
console.log(`  ${files.join(', ')}`);
console.log(`  ${dataset.rooms.length} săli, ${dataset.units.length} unități, ${dataset.teachers.length} profesori, ${dataset.assignments.length} repartizări, ${dataset.timetable.length} ședințe în orar`);
if (unscheduled.length) console.log(`  ATENȚIE: ${unscheduled.length} ședințe nu au încăput în orar (vezi raportul de validare)`);
