# Harta proiectului — RoomAllocation

Ce conține fiecare folder și fișier, pe scurt. Pentru documentele din `info_pack/docs/` (rol, ordine de citire, cine le modifică) vezi **`docs-guide.md`**; aici sunt doar enumerate. Termenii: `glossary.md`.

Reguli: harta descrie **rolul** fișierelor, nu detalii de implementare (fără numere de linie, fără liste de funcții), ca să nu se învechească. Când apar, se mută sau dispar fișiere, harta se actualizează în aceeași etapă (`docs-guide.md` §4). Testul `tests/docs/project-map.test.ts` (rulat cu `npm test`) pică dacă harta nu mai corespunde fișierelor; descrierile le verifică omul. Format cerut de test: fișierele din `src/`, `tests/` și `scripts/` apar în prima coloană a tabelelor, sub un titlu care conține folderul între backtick-uri; documentele, în rândul „Lista:” din §5.

Actualizat: 15.11.2026.

## 1. Rădăcina

| Fișier / folder | Rol |
|---|---|
| `CLAUDE.md` | Regulile permanente de lucru pentru agenții AI (citit automat) |
| `README.md` | Prezentarea scurtă și comenzile |
| `package.json`, `package-lock.json` | Dependențele (versiuni fixate) și comenzile `npm` |
| `tsconfig.json` | Configurația TypeScript (verificarea tipurilor) |
| `vitest.config.ts` | Configurația testelor |
| `.node-version` | Versiunea Node pentru Mac (24.22.1) |
| `.gitignore` | Ce nu intră în Git (`node_modules/`, `out/`, `.env*`) |
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
| `occupancy.ts` | Harta ocupării (sală, zi, pereche → cine o ocupă); numărarea golurilor izolate |
| `score.ts` | Strategiile (first-fit, best-fit, scor), raritatea, compararea lexicografică |
| `allocate.ts` | **Algoritmul principal**: validarea cererii, verificarea persoanelor, căutarea planurilor cu mutări, alegerea, refuzul cu alternative, explicațiile |
| `repair.ts` | Repararea după închiderea unei săli |
| `checker.ts` | Verificatorul independent al regulilor H1–H8 |
| `index.ts` | Exportul comun al modulelor motorului |

### `src/scenarios/` — scenariile demonstrative

| Fișier | Rol |
|---|---|
| `build.ts` | Funcții ajutătoare pentru construirea sălilor, cererilor și rezervărilor sintetice |
| `cases.ts` | Cazurile 1–5 din concept și exemplul pentru coordonator |
| `run.ts` | Rularea unui scenariu pas cu pas |

### `src/sim/` — simularea

| Fișier | Rol |
|---|---|
| `rng.ts` | Generatorul pseudo-aleator cu seed |
| `generator.ts` | Facultatea sintetică și șirul de cereri până la o încărcare țintă |
| `simulate.ts` | Rularea strategiilor, indicatorii, mediile și intervalele de încredere |

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
| `engine/cases.test.ts` | Cazurile 1–5 și exemplul pentru coordonator |
| `engine/oracle.test.ts` | Motorul față de oracolul exhaustiv, pe 2000 de instanțe aleatoare |
| `engine/determinism.test.ts` | Același rezultat cu sălile și rezervările în altă ordine |
| `sim/generator.test.ts` | Generatorul: reproductibil, fără suprapuneri de persoane, încărcarea corectă |
| `sim/simulate.test.ts` | Simulatorul: stări valide, comparație pe perechi, statistica |
| `demo/controller.test.ts` | Logica demo-ului |
| `docs/project-map.test.ts` | Că această hartă este la zi: fiecare fișier din `src/`, `tests/`, `scripts/` și din `info_pack/docs/` apare aici, iar fiecare fișier numit aici există |
| `oracle/bruteforce.ts` | Oracolul (căutarea exhaustivă), folosit de teste |
| `support/random.ts` | Generatorul de instanțe mici aleatoare pentru oracol |

## 4. Scripturile — `scripts/`

| Fișier | Comandă | Rezultat |
|---|---|---|
| `render-cases.ts` | `npm run report` | `out/cases.html`: cazurile 1–5, înainte și după |
| `simulate.ts` | `npm run simulate` | `out/simulation.html` și `out/simulation.json` |
| `build-demo.ts` | `npm run demo` | `out/demo.html`: demo-ul într-o singură pagină |

## 5. Documentația — `info_pack/docs/`

Rolul fiecărui document și regulile de modificare: `docs-guide.md`.

Lista: `docs-guide.md`, `handoff.md`, `decisions.md`, `journal.md`, `plan.md`, `results.md`, `literature.md`, `glossary.md`, `project-map.md`, `agent-rules.md`, `concept.md`, `coordinator-feedback.md`, `topic-discussions.md`, `tableflow-legacy.md`.

## 6. Ordinea de citire a codului pentru code review

1. `src/engine/types.ts` — ce înseamnă fiecare câmp.
2. `src/engine/grid.ts`, `units.ts`, `compat.ts`, `occupancy.ts` — funcțiile mici folosite de algoritm.
3. `src/engine/allocate.ts`, funcția `tryPlace`: pașii marcați în comentarii (1. validare, 2. persoane, 3. săli candidate, 4. căutarea planurilor) și funcția internă `dfs` (mutările). Urmărește cazul 1 din `src/scenarios/cases.ts`.
4. `src/engine/score.ts` — cum se compară variantele.
5. `src/engine/repair.ts` — repararea, care refolosește `allocate`.
6. `src/engine/checker.ts` și `tests/engine/cases.test.ts` — ce se verifică și ce trebuie să iasă în fiecare caz.
