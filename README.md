# RoomAllocation

Algoritmul de alocare a sălilor universitare (proiect academic). Documentația și deciziile sunt în `info_pack/docs/`; planul activ este `info_pack/docs/plan.md`. Ordinea de citire și regulile de modificare a documentelor: `info_pack/docs/docs-guide.md`; rolul fiecărui fișier: `project-map.md`; termenii: `glossary.md`; starea curentă: `handoff.md`; istoricul: `journal.md`; rezultatele: `results.md`.

## Stadiul

V0 încheiat (Loturile 1–2: motorul, simularea, demo-ul). V1: partea 3A (formatul intern al datelor, setul sintetic al facultății, săptămâna în simulator) — `info_pack/docs/data-format.md`; Lotul 4 (cererea cu interval: motorul alege și perechea, ținând cont de ferestrele studenților, D29, D31); Lotul 5 (PostgreSQL în Docker, serviciul tranzacțional, testele de concurență, D35); Lotul 6a (aplicația Next.js și API-ul HTTP, D36–D38); Lotul 6b (paginile profesorului, studenților și administratorului, testele Playwright, D42); Lotul 6c (exportul .ics, D39). **V1 este încheiat**, cu excepția părții 3B (datele reale), care așteaptă datele de la decanat.

## V0 — motorul de alocare, simularea și demo-ul

Motorul este pur (fără interfață, HTTP sau bază de date):

- constrângerile H1–H7 și verificarea tranzițiilor (H8, D19) — `src/engine/checker.ts`;
- ierarhia flux → grupă → subgrupă, cu unități atomice (D21) — `src/engine/units.ts`;
- alocarea online cu scor lexicografic (raritate → excedent → fragmentare, D25), cel mult M mutări de sală la aceeași oră, refuz motivat cu alternative propuse (D18, D20) — `src/engine/allocate.ts`;
- repararea după închiderea unei săli (cazul 5, D19) — `src/engine/repair.ts`;
- cazurile 1–5 din concept și exemplul pentru coordonator — `src/scenarios/cases.ts`;
- generatorul de date sintetice cu seed și simulatorul care compară strategiile — `src/sim/`;
- demo-ul interactiv (pagină statică, fără bază de date) — `src/demo/`.

## Comenzi

Necesită Node 24 (vezi `.node-version`).

```bash
npm ci              # instalează versiunile fixate în package-lock.json
npm test            # toate testele (unitare, cazuri, oracol exhaustiv, determinism)
npm run typecheck   # verificarea tipurilor TypeScript
npm run report      # generează out/cases.html (cazurile 1–5, înainte/după)
npm run simulate    # simularea (≈1 min): out/simulation.html + out/simulation.json
npm run demo        # construiește out/demo.html (deschide-l direct în browser)

# datele (în afara repository-ului, implicit ../room-allocation-data; vezi info_pack/docs/data-format.md)
npm run data:synthetic          # generează setul sintetic (seed 1) în synthetic/canonical/
npm run data:check -- synthetic # raportul de validare (sau: real)
npm run week -- synthetic       # orarul + cereri suplimentare, comparația strategiilor (sau: real)
npm run interval -- synthetic   # Lotul 4: ora fixă vs. interval fără / cu criteriul ferestrelor (sau: real)

# baza de date (Lotul 5; necesită Docker)
npm run db:up                   # pornește PostgreSQL 18.7 în Docker (127.0.0.1:54320)
npm run db:migrate              # aplică schema (db/migrations/)
npm run db:load -- synthetic    # încarcă setul sintetic în baza de date
npm run test:db                 # testele pe baza de date reală (constrângeri, concurență, tranzacții)
npm run db:down                 # oprește containerele (datele rămân în volum; `docker compose down -v` le șterge)

# aplicația web (Lotul 6; Next.js)
npm run dev                     # serverul de dezvoltare, http://localhost:3000 (baza de date pornită cu db:up)
npm run app:up                  # tot sistemul în Docker: baza de date + aplicația, http://localhost:3000
npm run test:e2e                # testele de interfață (Playwright, Chromium; baza de date pornită)
```

Paginile: `/profesor` (cereri, decizii, alternative, rezervările proprii, exportul .ics), `/studenti` (orarul unui flux / grupe / subgrupe, exportul .ics), `/admin` (ocuparea sălilor pe zi, închiderile cu repararea). Rolul și profesorul se aleg pe pagină, fără autentificare (D37).

Portul 3000 e folosit atât de `npm run dev`, cât și de containerul `web`: rulează doar unul odată. Serverul de dezvoltare se oprește cu Ctrl+C (Ctrl+Z doar îl suspendă și ține portul ocupat; atunci `http://localhost:3000` nu mai răspunde).

## API (Lotul 6a, D38)

Fără autentificare (D37); răspunsuri JSON; erorile au forma `{ "error": { "code", "message", "issues"? } }`. Strategia: scorul (D25, D31), cel mult 2 mutări.

| Metodă și rută | Ce face |
|---|---|
| `GET /api/health` | Starea serverului și a bazei de date |
| `GET /api/meta` | Sălile, unitățile (cu numărul de studenți), profesorii (pseudonime), zilele, grila perechilor |
| `GET /api/bookings?day=&from=&to=&room=&unit=&teacher=` | Rezervările; filtrul `unit` include activitățile părinților și ale subgrupelor |
| `POST /api/requests` | O cerere nouă, cu sau fără interval: `{ "request": {…}, "key"?: "…" }` → decizia motorului (201; 200 la repetare; 409 dacă aceeași cheie are alt conținut) |
| `POST /api/alternatives` | Aplicarea unei alternative propuse (altă pereche/zi sau ruperea blocului, D20): `{ "request", "alternative" }` |
| `DELETE /api/bookings/{id}` | Anularea: `{ "teacher": "P-001" }` (doar rezervările proprii) sau `{ "admin": true }` |
| `GET /api/calendar?unit=…` sau `?teacher=…` | Exportul iCalendar (.ics, D39) al unei unități (cu activitățile părinților și ale subgrupelor) sau al unui profesor; opțional `&from=&to=` |
| `GET /api/closures`, `POST /api/closures` | Închiderile de săli; închiderea nouă `{ "roomId", "from", "to", "reason" }` repară automat orarul (D19) și întoarce raportul |

## Structura

```
src/engine/      motorul de alocare (independent de interfață și BD)
src/scenarios/   scenariile demonstrative (date sintetice) și rularea lor
src/data/        formatul intern al datelor: citire, validare, construirea săptămânii (Lotul 3)
src/db/          baza de date: conexiunea, migrațiile, citirea/scrierea, serviciul și operațiile tranzacționale (Loturile 5–6)
src/api/         API-ul: validarea și logica rutelor, independentă de Next.js (Lotul 6a)
app/             aplicația Next.js: paginile (profesor, studenți, administrator) și rutele API (Lotul 6)
tests/e2e/       testele de interfață (Playwright)
db/migrations/   schema SQL (constrângerile de excludere, triggerele)
src/sim/         generatoarele de date sintetice, simulatorul, săptămâna și măsurătorile ei
src/demo/        demo-ul: logica (controller.ts) și interfața (main.ts)
tests/engine/    testele motorului
tests/oracle/    oracolul exhaustiv (independent de căutarea motorului)
tests/support/   generatorul de instanțe mici aleatoare, cu seed
tests/sim/       generatoarele, simulatorul, săptămâna
tests/data/      formatul intern
tests/fixtures/  exemplul mic fictiv în formatul intern (testele nu depind de folderul extern)
tests/db/        testele pe baza de date reală (npm run test:db)
tests/demo/      logica demo-ului
scripts/         raportul cazurilor, simularea, demo-ul, datele (generare, validare, săptămâna)
```
