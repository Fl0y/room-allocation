# Jurnalul proiectului — RoomAllocation

Singura evidență cronologică a proiectului: ce s-a decis, ce s-a implementat, ce s-a verificat. **Cele mai noi intrări sunt sus.** Pentru intrarea în context ajung primele 2–3 intrări; starea curentă rezumată este în `handoff.md`.

Reguli (detalii în `docs-guide.md`):
- O intrare nouă la fiecare etapă încheiată sau grup de decizii; se adaugă **deasupra** celor existente.
- Intrările vechi nu se rescriu. O corectură este o intrare nouă care o menționează pe cea veche.
- Rezultatele științifice (cifre, tabele) se trec în `results.md`; jurnalul doar trimite la ele.
- Deciziile se trec cu ID-ul lor; textul complet al deciziei rămâne în `decisions.md`.

Șablon:

```
## AAAA-LL-ZZ — <etapa sau subiectul>
- Context / autorizare: …
- Decizii: D.. / P.. / O.. (doar ID-uri și o frază)
- Implementat: … (fișiere)
- Verificat: … (ce, unde: mediul lui Claude / Mac, de cine)
- Limite: …
- Commit: <hash> (dacă există)
- Pasul următor: …
```

---

## 2026-11-21 — Lotul 6a încheiat

- Verificat (autorul, Mac): comenzile din `handoff.md`, inclusiv `npm run app:up` (containerele `db` și `web` sănătoase). O problemă întâlnită: `npm run dev` suspendat cu Ctrl+Z ținea portul 3000, iar `localhost` nu mai răspundea; rezolvată prin oprirea procesului; nota e în `README.md`.
- Bifa 6a în `plan.md`. Commit: de făcut de autor.
- Pasul următor: autorizarea 6b.

---

## 2026-11-21 — Lotul 6a: aplicația Next.js și API-ul

- Context / autorizare: autorul a autorizat 6a (D36–D40).
- Implementat: Next.js 16.4.6, React 19.3.1, Zod 4.6.7 (versiuni fixate); `app/` (pagina de start provizorie, rutele `app/api/*`), `src/api/` (`schemas.ts`, `handlers.ts`, `server.ts`), `src/db/operations.ts` (alternative, ruperea blocului, anularea, închiderea cu repararea, scrierea diferenței), `db/migrations/002_operations.sql`, `Dockerfile`, `.dockerignore`, serviciul `web` în `docker-compose.yml`, comenzile `dev`, `build`, `start`, `app:up`; `tsconfig.json` completat de Next.js; `.gitignore` (`.next/`, `next-env.d.ts`). Motorul nu s-a schimbat. Documentele: `README.md` (comenzile, tabelul API), `project-map.md`, `glossary.md`, `results.md` §7, `plan.md`, `handoff.md`.
- Verificat (mediul lui Claude): `npm test` 103; `npm run test:db` 45 (11 noi); `next build`; verificare HTTP cu `next start` pe setul sintetic.
- Limite: neverificat pe Mac și în containerul `web` (Docker nu rulează în mediul lui Claude); fără pagini (6b).
- Pasul următor: verificarea pe Mac, apoi autorizarea 6b.

---

## 2026-11-21 — Deciziile pentru Lotul 6

- Context: Lotul 5 comis de autor (`7297086`). Înaintea Lotului 6, autorul a confirmat cele 12 puncte propuse, cu recomandările lui Claude.
- Decizii: D36 (Next.js, React, Zod, CSS Modules, același repository, `npm run dev` + serviciul `web` în Docker), D37 (roluri fără autentificare, fără aprobarea rezervărilor; închide întrebarea din P09), D38 (funcțiile: anularea, închiderea cu repararea tranzacțională, cele trei pagini), D39 (.ics pe grupă / subgrupă / profesor; importul rămâne comandă), D40 (teste API pe baza de date, Playwright pentru fluxurile principale).
- Implementat: `decisions.md`, `plan.md` (sub-pașii 6a–6c precizați), `handoff.md`.
- Pasul următor: autorizarea pentru 6a.

---

## 2026-11-21 — Lotul 5 încheiat

- Verificat (autorul, Mac): `npm ci`, `npm test` (103), `db:up` (PostgreSQL 18.7 în Docker), `db:migrate`, `db:load -- synthetic`, `test:db` (34) — toate au trecut. Bifele 5a–5c în `plan.md`.
- Commit: de făcut de autor.
- Pasul următor: discuția despre continuare (Lotul 6 sau 3B).

---

## 2026-11-21 — Lotul 5: baza de date, serviciul tranzacțional, concurența

- Context / autorizare: autorul a autorizat Lotul 5 și a fost de acord ca API-ul HTTP să intre în Lotul 6, ca testele pe baza de date să ruleze pe Mac dacă mediul lui Claude nu are Docker, și ca versiunile să se fixeze la instalare.
- Implementat: `docker-compose.yml` (postgres:18.7), `db/migrations/001_schema.sql`, `src/db/` (`pool.ts`, `migrate.ts`, `store.ts`, `service.ts`), `scripts/db-migrate.ts`, `scripts/db-load.ts`, `vitest.db.config.ts`, `tests/db/` (`support.ts`, `constraints.dbtest.ts`, `service.dbtest.ts`); comenzile `db:up`, `db:down`, `db:migrate`, `db:load`, `test:db`; dependența `pg` 8.23.1. Motorul nu s-a schimbat. Documentele: `results.md` §6, `glossary.md` §4bis, `project-map.md`, `README.md`, `plan.md` (statut), `handoff.md`.
- Verificat (mediul lui Claude; Docker nu rulează aici, deci PostgreSQL 16.15 instalat local): `npm run test:db` 34 de teste; `npm test` 103; setul sintetic încărcat fără încălcări; mutanții serviciului (fără blocare, blocare comună tuturor zilelor) sunt detectați.
- Limite: neverificat pe Mac și pe PostgreSQL 18.7; H4–H7 nu sunt în baza de date; fără API.
- Note: PostgreSQL 19 a apărut la 19.11.2026; rămânem pe 18 (P07). Containerul Node 24 din planul inițial al lui 5a se mută în Lotul 6, odată cu serverul.
- Pasul următor: verificarea pe Mac (`handoff.md`), apoi Lotul 6 sau 3B.

---

## 2026-11-18 — Lotul 4 încheiat

- Verificat (autorul, Mac): `npm test` — 103 teste trec, inclusiv cazurile 6–10. Bifa 4b în `plan.md`; Lotul 4 încheiat.
- Pasul următor: autorizarea Lotului 5 (back-end) sau 3B, dacă vin datele reale.

---

## 2026-11-18 — Lotul 4: cazurile 6–10 aprobate, verificarea pe Mac

- Context: autorul a aprobat cazurile 6–10 (intrarea de mai jos) și a verificat pe Mac: `npm test` (97 de teste) și raportul `npm run interval -- synthetic`.
- Implementat: cazurile 6–10 ca scenarii (`src/scenarios/cases.ts`, `request` acceptă `latest` în `build.ts`) și teste (`tests/engine/cases.test.ts`); raportul cazurilor afișează intervalul. Bifele 4a, 4c în `plan.md`; `results.md` §2 completat.
- Verificat (mediul lui Claude): 103 teste trec; rezultatele motorului pe cazurile 6–10 sunt exact cele aprobate; raportul cazurilor și demo-ul se construiesc.
- Pasul următor: `npm test` pe Mac, bifa 4b, commit-ul.

---

## 2026-11-18 — Lotul 4: cererea cu interval și ferestrele studenților

- Context / autorizare: autorul a autorizat Lotul 4; datele reale încă lipsesc, deci totul pe setul sintetic.
- Implementat: `src/engine/types.ts` (`latest`), `src/engine/windows.ts` (nou), `src/engine/score.ts` (ferestrele în cheia scorului, D31), `src/engine/allocate.ts` (căutarea pe toate începuturile intervalului, motivele de refuz pe pereche, alternativele în afara intervalului, explicația), `src/engine/occupancy.ts` (`isolatedGaps`), `src/demo/controller.ts` (alternativele aplicate fără interval), `src/sim/simulate.ts` (opțiunea ferestrelor, `roomGaps`), `src/sim/week.ts` (intervalele cererilor suplimentare, generator separat), `scripts/interval.ts` (nou), `tests/engine/interval.test.ts` (nou), oracolul și generatorul de instanțe extinse. Documentele: `results.md` §5, `glossary.md`, `project-map.md`, `README.md`, `data-format.md`, `plan.md` (statut), `handoff.md`.
- Verificat (mediul lui Claude): 97 de teste trec; motorul ⇔ oracolul pe 600 de instanțe cu interval × 4 configurații; fără interval, decizii identice (300 de instanțe direct; simularea V0 și săptămâna 3A cu aceleași valori înainte și după); mutanții „fără criteriul ferestrelor” și „departajare inversă după pereche” sunt detectați.
- Cazuri noi propuse (4b), **în așteptarea aprobării autorului**. Toate: 17.11.2026, grila obișnuită, cereri de seminar de o pereche, profesor nou T9 (liber), cu excepția cazului 10.
  - **Caz 6 — interval după activitățile grupei.** Grupa G (25) are seminare la perechile 1 și 2 în S-1. Săli: S-1 (30), S-2 (40). Cerere pentru G, interval 3–5. Așteptat: **perechea 3, S-1** (fără fereastră; S-1 are mai puține locuri goale).
  - **Caz 7 — fereastra contează mai mult decât locurile goale.** G are o activitate la perechea 1 în S-1. Săli: S-1 (40), S-2 (26), S-2 ocupată la perechile 2 și 3 de grupa H (înghețat). Cerere pentru G, interval 2–4. Așteptat: **perechea 2, S-1** (0 ferestre, 15 locuri goale). Fără criteriul ferestrelor: perechea 4, S-2 (1 loc gol, dar 2 ferestre).
  - **Caz 8 — sala rară contează mai mult decât fereastra.** G are o activitate la perechea 1 în S-1; S-1 (30) e ocupată la perechea 2 de H (înghețat); laboratorul L-1 (30 de calculatoare) e liber. Cerere de seminar pentru G, interval 2–3. Așteptat: **perechea 3, S-1, cu o fereastră** (la perechea 2 ar fi fost liber doar laboratorul).
  - **Caz 9 — subgrupe cu laboratoare la ore diferite.** Grupa K are subgrupele K/1 (12) și K/2 (12); K/1 are laborator la perechea 1, K/2 la perechea 2. Cerere de seminar pentru toată grupa K, interval 1–3. Așteptat: perechile 1 și 2 sunt excluse (grupă ocupată); **perechea 3, S-1, cu o fereastră** (pentru K/1, la perechea 2).
  - **Caz 10 — refuz pe tot intervalul.** Profesorul T9 are seminare la perechile 3 și 4. Cerere a lui T9 pentru G, interval 3–4. Așteptat: **refuz**, cu motivul `TEACHER_BUSY` pentru fiecare pereche; alternative în aceeași zi, cele mai apropiate de interval: perechile 2, 5, 1, 6, 7.
  - Notă: rezultatele au fost scrise înaintea testelor, dar după implementarea motorului; o rulare de control dă exact rezultatele de mai sus.
- Limite: neverificat pe Mac; rezultatele 4c sunt preliminare, pe un set inventat; săptămâna reală după 3B.
- Pasul următor: aprobarea cazurilor 6–10 și verificarea pe Mac.

---

## 2026-11-18 — Lotul 3A verificat pe Mac

- Verificat (autorul, Mac): `npm test`, `data:synthetic`, `data:check -- synthetic`, `week -- synthetic` — toate au funcționat. Bifele 3a.1–3a.3 în `plan.md`.
- Commit: `a813fcb`.
- Decizii: datele reale încă lipsesc; lucrul continuă pe setul sintetic.
- Pasul următor: autorizarea Lotului 4.

---

## 2026-11-18 — Lotul 3A: formatul intern, setul sintetic, săptămâna în simulator

- Context / autorizare: autorul a autorizat partea 3A și a creat `room-allocation-data/`.
- Decizii: D35 (demo-ul static pe GitHub Pages; sistemul V1 local, prin Docker; găzduirea online abia pentru produsul final).
- Implementat: `src/data/` (CSV, formatul intern cu validare pe fișier și linie, folderul datelor `RA_DATA_DIR`, rezumatul); `src/sim/faculty.ts` (setul sintetic), `src/sim/week.ts` (cereri suplimentare peste orar), `src/sim/metrics.ts` (ocupare, săli rare, ferestrele studenților); `simulate.ts` poate porni de la rezervări existente și măsoară ferestrele; indicatorul „locuri neocupate” se raportează la perechile ocupate final (identic cu V0 când nu există rezervări inițiale). Scripturile `data:synthetic`, `data:check`, `week`. Exemplul mic `tests/fixtures/mini/`. Documentele: `data-format.md` (nou), `results.md` §4, `project-map.md`, `glossary.md`, `docs-guide.md`, `README.md`, `plan.md` (statut), `handoff.md`.
- Verificat (mediul lui Claude, Node 22): 90 de teste trec; `tsc` fără erori; simularea V0 rulată înainte și după modificări dă aceleași valori; setul sintetic (seed 1–10) fără erori de validare; săptămâna: 0 încălcări în 360 de rulări.
- Limite: setul și cererile suplimentare sunt inventate (propuneri de parametri); un singur set în `results.md` §4; neverificat încă pe Mac.
- Commit: — (de făcut de autor după verificarea pe Mac).
- Pasul următor: verificarea pe Mac; apoi datele reale (3B) sau, cu autorizare, Lotul 4 pe setul sintetic.

---

## 2026-11-18 — Locul datelor și vizibilitatea repository-ului

- Context / autorizare: discuție cu autorul; documentele actualizate la cererea lui.
- Decizii: D33 (datele în `room-allocation-data/`, secțiunile `real/` și `synthetic/` cu același format intern; în Git doar codul, exemplul mic și scriptul cu seed; închide O21, O22); D34 (repository-ul e public; înlocuiește regula „repository privat”).
- Implementat: `decisions.md`, `CLAUDE.md`, `plan.md` (versiunea 2.1: Lotul 3 împărțit în 3A sintetic și 3B real), `handoff.md`.
- Verificat: istoricul Git (ambele branch-uri) nu conține documentele personale sau fișiere `.env`.
- Pasul următor: autorizarea părții 3A; obținerea datelor reale.

---

## 2026-11-15 — Folderul pentru documente personale

- Context / autorizare: cerut de autor.
- Implementat: `Claude outputs/personal/`, cu `descriere-tema.md`, `coordinator-next-steps.md`, `dean-office-data-request.md` mutate acolo; folderul adăugat în `.gitignore` (verificat cu `git check-ignore`). Trimiterile actualizate în `coordinator-feedback.md`, `docs-guide.md`, `project-map.md`. Textul pentru coordonator oferit și ca email.

---

## 2026-11-15 — Materiale pentru decanat și coordonator

- Context / autorizare: cerute de autor, pentru uz personal în discuțiile reale; nu se actualizează ulterior.
- Implementat: `Claude outputs/dean-office-data-request.md` (descrierea proiectului pentru decanat, inclusiv variantele a și b; lista datelor necesare; întrebări despre nevoile decanatului) și `Claude outputs/coordinator-next-steps.md` (ce s-a făcut după V0, pașii V1, întrebări pentru coordonator).
- Pasul următor: autorul obține datele și revine cu răspunsurile decanatului și ale coordonatorului; răspunsurile utile se trec în `coordinator-feedback.md` și `decisions.md`.

---

## 2026-11-15 — Planul V1 aprobat ca ordine (versiunea 2 a planului)

- Context: autorul a cerut documentarea celor stabilite, fără începerea implementării.
- Decizii: D30 (ordinea loturilor 3 → 4 → 5 → 6, fără autorizarea implementării), D31 (ordinea de alegere cu interval), D32 (o singură facultate întâi; permisiunea confirmată; datele în curs de solicitare). Deschise: O21 (structura pseudonimizată în repository?), O22 (locul datelor originale).
- Implementat (documentație): `plan.md` versiunea 2.0 — loturile V1 cu sub-pași și modelul recomandat, criterii de acceptare propuse (§4ter); `decisions.md`; `handoff.md`. Termeni aliniați cu `glossary.md` în documentele active: „goluri izolate” pentru programul sălilor (fragmentare), „ferestre” doar pentru orarul studenților; codul folosește încă „ferestre izolate” pentru fragmentare — de aliniat în Lotul 4.
- Pasul următor: autorul obține datele reale și revine cu întrebări despre locul lor și despre O21; implementarea începe doar după autorizare.

---

## 2026-11-15 — Testul hărții verificat pe Mac

- Verificat: autorul a rulat `npm test` pe Mac: 63 de teste trec; commit și push.
- Pasul următor: descrierea detaliată a V1, pentru aprobare.

---

## 2026-11-15 — Testul automat pentru harta proiectului

- Context / autorizare: autorizat de autor.
- Implementat: `tests/docs/project-map.test.ts` — citește `project-map.md` pe secțiuni și compară căile complete cu fișierele din `src/`, `tests/`, `scripts/`, iar lista din §5 cu documentele din `info_pack/docs/`; conține și o verificare a propriului cititor de hartă. `project-map.md`: rândul pentru noul test și formatul cerut de test.
- Verificat (copie a folderului, mediul lui Claude, Node 22): `tsc` fără erori; 63 de teste trec (59 anterioare + 4 noi). Verificări negative: un fișier nou nedeclarat, un rând șters din hartă și un document nou nelistat fac testul să pice, cu mesaj care numește fișierul. Prima rulare a găsit o problemă reală de format în hartă (lista documentelor nu era pe un rând propriu), corectată.
- Limite: testul verifică doar prezența fișierelor, nu corectitudinea descrierilor. Nerulat încă pe Mac.
- Pasul următor: autorul rulează `npm test` pe Mac și face commit; apoi discuția despre ordinea V1.

---

## 2026-11-15 — Dicționarul, harta proiectului, experimentul cu M = 0–4

- Context / autorizare: cerute de autor.
- Implementat: `glossary.md` (termenii proiectului, pe cinci grupe: domeniu, algoritm, testare, simulare, proces); `project-map.md` (rolul fiecărui fișier de cod, test și script; ordinea de citire a codului pentru code review); `results.md` §3.5 (câte mutări merită: M = 0–4). `docs-guide.md`: cele două documente noi la nivelul 2 de citire, în tabelele de responsabilități și în lista de verificare de la încheierea etapelor. `README.md`: trimiteri.
- Rezultat (preliminar, `results.md` §3.5): peste M = 2 câștigul este neglijabil (+0,07 p.p. pentru M = 3–4 la încărcarea 0,95), iar timpul crește de ~7 ori pe fiecare mutare în plus.
- Discutat, nedecis: un test automat care compară harta cu fișierele existente (explicat autorului, neimplementat).
- Pasul următor: discuția despre ordinea V1.

---

## 2026-11-14 — Răspunsurile la O14–O20: D28 (date reale), D29 (ferestre)

- Context: răspunsurile autorului la întrebările deschise.
- Decizii: **D28** — structura reală (săli, echipamente, grupe și mărimi, profesori și repartizarea lor, orarul real ca rezervări existente), profesori cu nume fictive, cereri suplimentare sintetice, ITC 2019 ca validare; modifică D08 și regula „date fictive” din `CLAUDE.md`. **D29** — fereastra pe subgrupă și zi (perechile libere dintre prima și ultima activitate), fără excepție pentru masă; ferestrele profesorilor ignorate; ferestrele contează mai puțin decât mutările și protejarea sălilor rare; varianta online (a) principală, planificarea semestrului (b) într-o versiune ulterioară. P16 și P17 confirmate; O14–O20 închise; nicio întrebare deschisă.
- Implementat: `decisions.md`, `CLAUDE.md` (regula datelor), `coordinator-feedback.md` (statut), `handoff.md`, `plan.md` (notă V1).
- Pasul următor: propunerea planului V1 (`plan.md` versiunea 2), pentru aprobarea autorului.

---

## 2026-11-14 — V0 prezentat; analiza literaturii (P14); ideile noi ale coordonatorului

- Context / autorizare: autorul a făcut commit-ul restructurării; a autorizat analiza literaturii. Autorul a prezentat coordonatorului demo-ul V0 și materialele; **proiectul a fost acceptat**. Din discuție: date reale despre structura universității și reducerea ferestrelor din orarul studenților. Decizia despre V1: mai târziu, după clarificarea obiectivelor.
- Implementat: `literature.md` (versiunea 1: clasificarea problemei, complexitate, UniTime și ITC 2019, perturbarea minimă, analogii, compactarea orarului, utilizarea spațiului, date reale și protecția datelor, poziționare, 26 de surse); `coordinator-feedback.md` §4 (analiza celor două idei); `decisions.md`: propuneri P16, P17 și întrebări O14–O20.
- Constatări principale din literatură: alocarea sălilor pe o perioadă este polinomială (potrivire bipartită), legăturile între perioade (stabilitatea sălii) o îngreunează, dar stabilitatea pe perioade contigue poate rămâne tratabilă — afirmația din concept §4.2 despre H7 trebuie formulată prudent; perturbarea minimă și compactarea sunt teme cunoscute; analogul cel mai apropiat al mutărilor este *room committing* din hoteluri (RoomTetris); contribuția plauzibilă rămâne combinația online + explicații + bloc + raritate + mutări limitate, evaluată reproductibil.
- Verificat: fiecare sursă din `literature.md` provine din rezultatele căutării (lucrările necitite integral sunt marcate ◐); detaliile bibliografice neconfirmate au fost eliminate.
- Limite: prima trecere, pe rezumate și fragmente; lista de citit integral în `literature.md` §9.
- Pasul următor: răspunsurile autorului la O14–O20; apoi decizia despre V1.

---

## 2026-11-14 — Denumiri în engleză pentru documentele rămase

- Context / autorizare: cerută de autor.
- Implementat: redenumiri în `info_pack/docs/`: `mostenire-tableflow.md` → `tableflow-legacy.md`, `feedback-coordonator.md` → `coordinator-feedback.md`, `discutii-tematice.md` → `topic-discussions.md`. Trimiterile actualizate în toate documentele active și în două comentarii din cod (`src/scenarios/cases.ts`, `tests/engine/cases.test.ts`). Conținutul fișierelor nu s-a schimbat.
- Notă: intrările mai vechi ale jurnalului folosesc numele vechi; corespondența este cea de mai sus.
- Pasul următor: analiza literaturii (P14, `literature.md`).

## 2026-11-14 — Restructurarea documentației

- Context / autorizare: cerută de autor.
- Implementat: `journal.md` (acest fișier; jurnalul mutat din `handoff.md`, împreună cu „Istoric” din `decisions.md` și „Evidență” din `plan.md` §9), `docs-guide.md` (ordinea de citire și regulile de modificare), `agent-rules.md` (reguli pentru agenți, sub-agenți și alegerea modelului), `results.md` (rezultatele științifice, mutate din jurnal). `handoff.md` rescris ca stare curentă de o pagină. `CLAUDE.md` și `discutii-tematice.md` aliniate. În `plan.md`: Lotul 2 bifat; fișierul analizei literaturii redenumit `literature.md` (denumiri noi în engleză).
- Decizii: denumirile fișierelor noi sunt în engleză; folderul `Claude outputs` se păstrează.
- Verificat: nicio informație eliminată la mutare (conținutul jurnalului vechi este integral mai jos).
- Pasul următor: analiza literaturii (P14, `literature.md`), apoi prezentarea V0 pentru coordonator.

## 2026-11-14 — Lotul 2 confirmat pe Mac

- Context: autorul a confirmat că Lotul 2 a fost rulat pe Mac și funcționează (commit `0ce3c53` din 2026-11-11; ulterior `d6dbd24` README, `506cd94` demo și analiza simulării).
- Verificat: pe Mac, de autor.
- Pasul următor: analiza literaturii (P14).

## 2026-11-08 — Lotul 2 (simulare și demo)

- Context / autorizare: autorizat de autor. D19 precizat: rezervarea fixată, realocată după închiderea sălii, rămâne fixată în sala nouă.
- Implementat:
  - generatorul de date sintetice cu seed (`src/sim/generator.ts`): facultate fictivă cu 4 auditorii, 10 săli de seminar, 8 laboratoare, 10 fluxuri; o săptămână; cereri până la o încărcare țintă;
  - simulatorul cu 6 strategii (A prima sală liberă, B best-fit, C scor V0, B+M2, C+M1, C+M2), indicatorii din `plan.md` §5 și diferențe pereche cu IC 95% (`src/sim/simulate.ts`); `npm run simulate` → `out/simulation.html` + `.json`;
  - demo-ul static `npm run demo` → `out/demo.html` (pas cu pas, cerere nouă, alternative aplicabile, ruperea blocului cu acord, închiderea unei săli, compararea strategiilor, scenariu generat); logica separată în `src/demo/controller.ts`;
  - opțiunea `verify` în `allocate` (implicit activă; simulatorul verifică doar starea finală).
- Alegeri ale generatorului (propuse, neconfirmate explicit): șirul de cereri nu are suprapuneri de profesori/grupe și fiecare cerere are cel puțin o sală compatibilă, ca refuzurile să măsoare doar ocuparea sălilor; ponderile tipurilor de activitate (curs 0,27, seminar 0,45, laborator 0,28) fac cererea pe tip aproximativ proporțională cu oferta; toate rezervările sunt mutabile; ordinea de sosire aleatoare.
- Verificat (mediul lui Claude și o copie a folderului): `tsc` fără erori; 59 de teste trec (cele 42 anterioare + generator, simulator, logica demo-ului); simularea completă (30 de seed-uri × 4 încărcări × 6 strategii = 720 de rulări) fără încălcări în stările finale; demo-ul testat în browser (Chromium) fără erori în consolă.
- Rezultate: preliminare, în `results.md` §3.
- Limite: rezultatele depind de profilul generatorului; A depinde de ordinea sălilor (auditoriile listate primele o dezavantajează la cursuri); fragmentarea V0 influențează rar decizia; fără orizont înghețat și fără recurență în simulare; nu s-au calibrat ponderi (scor lexicografic); demo-ul nu are bază de date și nu păstrează starea.
- Pasul următor (atunci): verificarea pe Mac; apoi analiza literaturii (P14) și prezentarea V0 pentru coordonator.

## 2026-11-08 — Lotul 1 verificat pe Mac; repository creat

- Verificat: autorul a rulat pe Mac `npm ci`, `npm test`, `npm run typecheck`, `npm run report`; toate trec; raportul `out/cases.html` coincide cu cel generat de Claude.
- Implementat: repository Git privat, primul commit și push.
- Commit: `340e49f`.
- Rămas atunci de confirmat: examenul realocat rămâne fixat în sala nouă (interpretare D19) — confirmat ulterior.

## 2026-11-08 — Lotul 1 (motorul de alocare)

- Context / autorizare: autorizat de autor. Decizii: D25 (scor lexicografic în V0), D26 (demo static), D27 (mediul pe Mac: Node 24.22.1, Docker 29.9.2, Git 2.51.0; V0 fără containere).
- Implementat: modelul (`src/engine/types.ts`), unitățile atomice (D21), verificatorul independent H1–H7 și verificarea tranzițiilor H8/D19 (`checker.ts`), alocarea online cu scor lexicografic, repararea prin căutarea exhaustivă a planurilor cu ≤ M mutări (doar sala, la aceeași oră, blocul întreg), refuzul cu motive și alternative propuse, inclusiv ruperea blocului ca ultimă opțiune (`allocate.ts`), repararea după închiderea unei săli (`repair.ts`), strategiile first-fit / best-fit / score; scenariile: cazurile 1–5 și exemplul pentru coordonator (`src/scenarios/`); raportul vizual static `npm run report` → `out/cases.html`. Versiuni fixate: TypeScript 7.0.2, Vitest 5.1.0, @types/node 24.19.2.
- Verificat (mediul lui Claude, Linux, Node 22.23; și pe o copie a fișierelor din folder): `tsc` fără erori; 42 de teste trec — verificatorul (câte un test negativ pentru H1–H7, plus H8), cazurile 1–5 conform conceptului, exemplul pentru coordonator identic cu calculul de mână, oracolul exhaustiv pe 2000 de instanțe aleatoare × M = 0, 1, 2 (motor ⇔ oracol, număr minim de mutări), determinismul la amestecarea sălilor, rezervărilor și datelor. Teste de mutație manuale: mutarea rezervărilor înghețate și alegerea celui mai prost plan sunt detectate; o a treia mutație (pruning slăbit) e echivalentă semantic. Rezultatele pe cazuri: `results.md` §2.
- Limite: raritatea V0 e binară (laborator/auditoriu folosit inutil), fragmentarea numără doar ferestrele izolate; repararea tratează rezervările afectate secvențial (cele mai constrânse întâi), nu caută optimul global; alternativele nerezolvatelor sunt independente între ele; recurența nu e modelată (cazul 5 folosește două rezervări separate); oracolul acoperă instanțe mici (o zi, 2 perechi, 3–5 săli).

## 2026-11-08 — `plan.md` creat (versiunea 1)

- Implementat: `plan.md`. V0: Etapa 0 (documente, verificarea mediului, repository), Lotul 1 (motor, verificator, oracol, cazurile 1–5, raport vizual static), Lotul 2 (generator, simulator A/B/C/C+M, demo fără BD), analiza literaturii în paralel. V1: back-end, dashboard, panou + .ics + CSV, extensii, experimente, validare ITC 2019.
- Propus atunci, confirmat ulterior (D25, D26): scorul lexicografic în V0; demo static (esbuild + HTML).

## 2026-11-08 — Feedback-ul coordonatorului; P11–P15; O13 închisă

- Context: întrebările coordonatorului (implementarea și simulări „palpabile”, integrarea în ASEM) și ideile lui (intervale libere ale profesorilor, Google Calendar, echipamente, research). Analiză și răspunsuri în `feedback-coordonator.md` (inclusiv un exemplu calculat de mână, nu rezultat experimental).
- Decizii: D23 (V0 întâi); P11–P15 propuse, apoi confirmate; O13 deschisă, apoi închisă prin D24 (sintetice în V0, ITC 2019 ca validare ulterioară).
- Constatare din literatură: UniTime are deja perturbare minimă cu limită de două activități afectate; contribuția se formulează ca adaptare și evaluare.

## 2026-11-08 — O06 și O10 închise

- Decizii: D21 (flux → grupă → subgrupă, o singură împărțire pe grupă, studenți declarați doar pe unitatea cea mai mică, numărul cererii dedus din unități, H3 prin unități atomice în motor și în BD; împărțiri multiple, opționale și grupe mixte în afara primei versiuni); D22 (modul lot: întâi perechile satisfăcute, apoi cererile).
- Implementat: actualizări în `decisions.md`, `concept.md` (§3.2, H3). Nu au mai rămas întrebări deschise.

## 2026-11-08 — „Cea mai bună variantă”, fixarea, blocurile

- Decizii: D18 (ierarhia lexicografică a „celei mai bune variante”, închide O09); D19 (fixarea doar pentru evenimente/examene, anulată la închiderea sălii pentru reparații, închide O11); D20 (blocul se rupe doar ca opțiune cu acordul profesorului, prioritară fiind soluția prin mutări, închide O12).
- Implementat: `decisions.md`, `concept.md` v1.3 (H7, H8, cazurile 1, 2, 5). Analiza O06 prezentată în discuția generală.

## 2026-11-08 — Primele decizii ale autorului

- Decizii: nume RoomAllocation, folder `room-allocation/` (D10); excluse deplasarea între clădiri (D11, S4) și preferințele personale ale profesorilor (D12, S5), scorul rămâne excedent + raritate + fragmentare; lucrarea principală (D13); prioritatea științifică (D14); grila din concept §3.1 (D15); recurența ca opțiune ulterioară (D16); disponibilitate instabilă, plan pe etape mici (D17). Confirmate P01–P10 (P02 fără S4, S5). Închise O01–O05, O07, O08. Adăugate O09–O12 din analiza sesiunii din 06.11.
- Implementat: `CLAUDE.md`, `decisions.md`, `concept.md` (v1.2), `discutii-tematice.md` (prefix `RA ·`).

## 2026-11-06 — Prima sesiune de preluare

- Prezentate în discuția generală: înțelegerea proiectului, statutul D/P/O, analiza critică (definiția „celei mai bune variante”, utilitatea mutărilor, contradicțiile H6/H8 și D06/H7), o ordine de dezvoltare și primul lot propus.
- Instrucțiunile primei sesiuni (arhivă): citirea documentelor; rezumatul ideii și al componentelor; separarea D01–D09 / P01–P10 / O01–O08; analiza critică (în special P04 și definiția „celei mai bune variante”); doar întrebările blocante; structura planului și primul lot; fără cod, pachete sau containere înaintea autorizării.
- Direcția tehnică propusă atunci (arhivă, ulterior P10 confirmat): o primă „felie verticală” cu motorul independent de interfață și BD, constrângerile obligatorii, best-fit și scorul, cazurile 1–5 ca teste și o vizualizare simplă a grilei săli × perechi; back-end-ul imediat după, refolosind motorul neschimbat.
- Implementat: nimic.

## 2026-11-06 — Pachetul de pornire

- Context: ideea a apărut în discuția generală TableFlow (5–6.11.2026), după pregătirea unui material despre algoritmul de alocare pentru coordonator; studiul algoritmului s-a mutat într-un mediu mai ușor de explicat, rezervarea sălilor universitare.
- Implementat: `CLAUDE.md`, `handoff.md`, `decisions.md`, `concept.md` (v1.1), `mostenire-tableflow.md`, `discutii-tematice.md`.
- Decizii: ordinea de dezvoltare nu este impusă; vizualizarea timpurie a algoritmului și acoperirea back-end-ului (D09, P10).
