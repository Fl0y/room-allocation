# Harta proiectului — RoomAllocation

Ce conține fiecare folder și fișier, pe scurt. Pentru documentele din `info_pack/docs/` (rol, ordine de citire, cine le modifică) vezi **`docs-guide.md`**; aici sunt doar enumerate. Termenii: `glossary.md`.

Reguli: harta descrie **rolul** fișierelor, nu detalii de implementare (fără numere de linie, fără liste de funcții), ca să nu se învechească. Când apar, se mută sau dispar fișiere, harta se actualizează în aceeași etapă (`docs-guide.md` §4). Testul `tests/docs/project-map.test.ts` (rulat cu `npm test`) pică dacă harta nu mai corespunde fișierelor; descrierile le verifică omul. Format cerut de test: fișierele din `src/`, `tests/` și `scripts/` apar în prima coloană a tabelelor, sub un titlu care conține folderul între backtick-uri; documentele, în rândul „Lista:” din §5.

Actualizat: 21.11.2026.

## 1. Rădăcina

| Fișier / folder | Rol |
|---|---|
| `CLAUDE.md` | Regulile permanente de lucru pentru agenții AI (citit automat) |
| `README.md` | Prezentarea scurtă și comenzile |
| `package.json`, `package-lock.json` | Dependențele (versiuni fixate) și comenzile `npm` |
| `tsconfig.json` | Configurația TypeScript (verificarea tipurilor) |
| `vitest.config.ts` | Configurația testelor (`npm test`, fără bază de date) |
| `vitest.db.config.ts` | Configurația testelor pe baza de date (`npm run test:db`, Lotul 5) |
| `docker-compose.yml` | Sistemul local (D35): baza de date PostgreSQL 18.7 (127.0.0.1:54320) și aplicația web (127.0.0.1:3000) |
| `Dockerfile`, `.dockerignore` | Imaginea aplicației web (Node 24.22.1, Next.js); migrațiile se aplică la pornire |
| `next.config.ts` | Configurația Next.js |
| `app/` | Aplicația Next.js (D36): paginile (Lotul 6b) și rutele API din `app/api/` (Lotul 6a), care doar apelează `src/api/handlers.ts`; `app/env.d.ts` aduce tipurile Next.js |
| `next-env.d.ts`, `.next/` | Generate de Next.js; nu intră în Git |
| `db/migrations/` | Schema bazei de date, ca migrații SQL numerotate; `001_schema.sql`: tabelele și constrângerile H1–H3, H8; `002_operations.sql`: anularea și închiderea, raportul reparării |
| `.node-version` | Versiunea Node pentru Mac (24.22.1) |
| `.gitignore` | Ce nu intră în Git (`node_modules/`, `out/`, `.env*`) |
| `.env` (opțional, local) | Calea folderului de date (`RA_DATA_DIR=…`), adresa bazei de date (`RA_DATABASE_URL=…`), parola containerului (`RA_DB_PASSWORD=…`); nu intră în Git |
| `info_pack/docs/` | Documentația proiectului (vezi §5) |
| `info_pack/references/` | Loc pentru materiale de referință (gol) |
| `out/` | Rezultatele generate de comenzi (rapoarte, demo); nu intră în Git |
| `Claude outputs/` | Copii ale rapoartelor HTML livrate; nu se actualizează automat |
| `Claude outputs/personal/` | Documente de uz personal (descrierea temei, materialele pentru decanat și coordonator); în `.gitignore`, nu intră în Git |

## 2. Codul aplicației — `src/`

### `src/engine/` — motorul de alocare (fără interfață, HTTP sau bază de date)

| Fișier | Rol |
|---|---|
| `types.ts` | Definițiile datelor: sală, unitate (flux/grupă/subgrupă), cerere, rezervare, închidere, stare |
| `grid.ts` | Grila celor 7 perechi; verificarea suprapunerii a două intervale |
| `units.ts` | Ierarhia flux → grupă → subgrupă: unitățile atomice, numărul de studenți, validarea |
| `compat.ts` | Dacă o sală corespunde unei cereri (tip, capacitate, echipamente) și dacă e închisă |
| `occupancy.ts` | Harta ocupării (sală, zi, pereche → cine o ocupă); numărarea golurilor izolate din programul sălii |
| `score.ts` | Strategiile (first-fit, best-fit, scor), raritatea, compararea lexicografică |
| `allocate.ts` | **Algoritmul principal**: validarea cererii, verificarea persoanelor, căutarea planurilor cu mutări, alegerea, refuzul cu alternative, explicațiile |
| `repair.ts` | Repararea după închiderea unei săli |
| `checker.ts` | Verificatorul independent al regulilor H1–H8 |
| `windows.ts` | Ferestrele din orarul studenților (D29): calculul pe subgrupă și zi și variația lor pentru o pereche propusă |
| `index.ts` | Exportul comun al modulelor motorului |

### `src/data/` — datele în formatul intern (Lotul 3, D33)

| Fișier | Rol |
|---|---|
| `csv.ts` | Citirea și scrierea fișierelor CSV, cu numărul liniei pentru raport |
| `format.ts` | **Formatul intern** (specificația: `info_pack/docs/data-format.md`): citirea și validarea fișierelor, construirea instanței motorului și a orarului ca rezervări existente, cu problemele raportate pe fișier și linie |
| `io.ts` | Folderul datelor din afara repository-ului (`RA_DATA_DIR`, implicit `../room-allocation-data`); citirea și scrierea unui set |
| `summary.ts` | Rezumatul unui set de date pentru raportul de validare |

### `src/db/` — baza de date și serviciul tranzacțional (Lotul 5)

| Fișier | Rol |
|---|---|
| `pool.ts` | Conexiunea la PostgreSQL (`RA_DATABASE_URL`, implicit containerul local) |
| `migrate.ts` | Aplicarea migrațiilor din `db/migrations/`, fiecare într-o tranzacție |
| `store.ts` | Conversia între rândurile din baza de date și modelul motorului; încărcarea unei instanțe cu starea ei |
| `service.ts` | **Serviciul tranzacțional**: blocarea zilei → idempotența → citirea stării → decizia motorului → scrierea mutărilor și a rezervării, totul într-o singură tranzacție |
| `operations.ts` | Celelalte operații tranzacționale (Lotul 6a): aplicarea unei alternative (inclusiv ruperea blocului), anularea, închiderea sălii cu repararea automată; scrierea diferenței dintre două stări |

### `src/api/` — API-ul HTTP (Lotul 6a, D38)

| Fișier | Rol |
|---|---|
| `schemas.ts` | Validarea datelor primite (Zod) |
| `handlers.ts` | Logica fiecărei rute, independentă de Next.js: primește conexiunea și datele, întoarce statutul HTTP și răspunsul |
| `server.ts` | Legătura cu Next.js: conexiunea unică pe proces, conversia în `Response` |

### `src/scenarios/` — scenariile demonstrative

| Fișier | Rol |
|---|---|
| `build.ts` | Funcții ajutătoare pentru construirea sălilor, cererilor și rezervărilor sintetice |
| `cases.ts` | Cazurile 1–5 din concept, cazurile 6–10 cu interval (Lotul 4) și exemplul pentru coordonator |
| `run.ts` | Rularea unui scenariu pas cu pas |

### `src/sim/` — simularea

| Fișier | Rol |
|---|---|
| `rng.ts` | Generatorul pseudo-aleator cu seed |
| `generator.ts` | Facultatea sintetică și șirul de cereri până la o încărcare țintă |
| `simulate.ts` | Rularea strategiilor, indicatorii, mediile și intervalele de încredere; poate porni de la rezervări existente |
| `faculty.ts` | Setul sintetic al facultății în formatul intern: săli, fluxuri/grupe/subgrupe, profesori pseudonimizați, repartizări și un orar fără conflicte, făcut „ca de om” |
| `metrics.ts` | Măsurătorile unei săptămâni: ocuparea sălilor, săli rare folosite inutil, ferestrele studenților, golurile din programul sălilor |
| `week.ts` | Săptămâna în simulator: orarul ca rezervări existente + cereri suplimentare (recuperări, consultații, evenimente) |

### `src/demo/` — demo-ul static

| Fișier | Rol |
|---|---|
| `controller.ts` | Logica demo-ului (pași, cereri, alternative, închideri, înapoi), testabilă fără browser |
| `main.ts` | Interfața din pagină (afișare și evenimente) |

## 3. Testele — `tests/`

| Fișier | Ce verifică |
|---|---|
| `engine/checker.test.ts` | Fiecare regulă H1–H8, cu exemple care o încalcă |
| `engine/units.test.ts` | Ierarhia grupelor și validarea ei |
| `engine/cases.test.ts` | Cazurile 1–10 și exemplul pentru coordonator |
| `engine/oracle.test.ts` | Motorul față de oracolul exhaustiv, pe 2000 de instanțe aleatoare |
| `engine/determinism.test.ts` | Același rezultat cu sălile și rezervările în altă ordine |
| `engine/interval.test.ts` | Cererile cu interval (Lotul 4): motorul față de oracol după ordinea D31, compatibilitatea cu ora fixă, validarea, determinismul |
| `sim/generator.test.ts` | Generatorul: reproductibil, fără suprapuneri de persoane, încărcarea corectă |
| `sim/simulate.test.ts` | Simulatorul: stări valide, comparație pe perechi, statistica |
| `sim/faculty.test.ts` | Setul sintetic: același seed dă aceleași fișiere, orarul trece validarea, doar pseudonime |
| `sim/metrics.test.ts` | Ferestrele studenților pe subgrupe și ocuparea sălilor |
| `sim/week.test.ts` | Cererile suplimentare (fără conflicte de persoane) și rularea săptămânii fără încălcări |
| `data/csv.test.ts` | Citirea CSV: ghilimele, virgule, rânduri noi, numerele liniilor |
| `data/format.test.ts` | Formatul intern pe exemplul mic; fiecare tip de greșeală raportat cu fișierul și linia |
| `data/io.test.ts` | Calea folderului de date, scrierea și recitirea unui set |
| `fixtures/mini/dataset.json`, `fixtures/mini/rooms.csv`, `fixtures/mini/units.csv`, `fixtures/mini/teachers.csv`, `fixtures/mini/courses.csv`, `fixtures/mini/assignments.csv`, `fixtures/mini/timetable.csv` | **Exemplul mic fictiv** în formatul intern: datele pe care rulează testele fără folderul extern; servește și ca model al formatului |
| `support/mini.ts` | Citirea exemplului mic pentru teste |
| `db/support.ts` | Baza de date de test (creată și ștearsă la fiecare test), o lume mică, inserări SQL directe |
| `db/constraints.dbtest.ts` | Baza de date refuză singură suprapunerile (SQL direct, fără motor) și testele de mutație ale constrângerilor (`npm run test:db`) |
| `db/api.dbtest.ts` | API-ul (Lotul 6a): citirea și filtrele, validarea, cererile, alternativele (inclusiv ruperea blocului), anularea, închiderea cu repararea (cazul 5) și blocarea zilelor închiderii (`npm run test:db`) |
| `db/service.dbtest.ts` | Serviciul: aceleași decizii ca motorul în memorie, cereri simultane pentru ultima sală, nicio stare intermediară vizibilă, atomicitatea, idempotența, blocarea pe zi (`npm run test:db`) |
| `demo/controller.test.ts` | Logica demo-ului |
| `docs/project-map.test.ts` | Că această hartă este la zi: fiecare fișier din `src/`, `tests/`, `scripts/` și din `info_pack/docs/` apare aici, iar fiecare fișier numit aici există |
| `oracle/bruteforce.ts` | Oracolul (căutarea exhaustivă), folosit de teste; și pentru cererile cu interval, cu ferestrele calculate independent |
| `support/random.ts` | Generatorul de instanțe mici aleatoare pentru oracol (cu oră fixă și cu interval) |

## 4. Scripturile — `scripts/`

| Fișier | Comandă | Rezultat |
|---|---|---|
| `render-cases.ts` | `npm run report` | `out/cases.html`: cazurile 1–5, înainte și după |
| `simulate.ts` | `npm run simulate` | `out/simulation.html` și `out/simulation.json` |
| `build-demo.ts` | `npm run demo` | `out/demo.html`: demo-ul într-o singură pagină |
| `data-synthetic.ts` | `npm run data:synthetic` | Setul sintetic în `room-allocation-data/synthetic/canonical/` (în afara repository-ului) |
| `data-check.ts` | `npm run data:check -- synthetic` (sau `real`) | Raportul de validare în `room-allocation-data/<secțiune>/reports/` |
| `week.ts` | `npm run week -- synthetic` (sau `real`) | Măsurătorile de bază și comparația strategiilor, în `room-allocation-data/<secțiune>/reports/` |
| `interval.ts` | `npm run interval -- synthetic` (sau `real`) | Lotul 4c: ora fixă vs. interval fără / cu criteriul ferestrelor, în `room-allocation-data/<secțiune>/reports/` |
| `db-migrate.ts` | `npm run db:migrate` | Aplică migrațiile pe baza de date |
| `db-load.ts` | `npm run db:load -- synthetic` (sau `real`) | Încarcă o secțiune de date în baza de date (șterge datele existente, nu și schema) |
| `report-html.ts` | — | Elemente comune pentru rapoartele de date |

## 5. Documentația — `info_pack/docs/`

Rolul fiecărui document și regulile de modificare: `docs-guide.md`.

Lista: `docs-guide.md`, `handoff.md`, `decisions.md`, `journal.md`, `plan.md`, `results.md`, `literature.md`, `glossary.md`, `project-map.md`, `agent-rules.md`, `concept.md`, `coordinator-feedback.md`, `topic-discussions.md`, `tableflow-legacy.md`, `data-format.md`.

## 6. Ordinea de citire a codului pentru code review

1. `src/engine/types.ts` — ce înseamnă fiecare câmp.
2. `src/engine/grid.ts`, `units.ts`, `compat.ts`, `occupancy.ts` — funcțiile mici folosite de algoritm.
3. `src/engine/allocate.ts`, funcția `tryPlace`: pașii marcați în comentarii (1. validare, 2. persoane, 3. săli candidate, 4. căutarea planurilor) și funcția internă `dfs` (mutările). Urmărește cazul 1 din `src/scenarios/cases.ts`.
4. `src/engine/score.ts` — cum se compară variantele.
5. `src/engine/repair.ts` — repararea, care refolosește `allocate`.
6. `src/engine/checker.ts` și `tests/engine/cases.test.ts` — ce se verifică și ce trebuie să iasă în fiecare caz.
