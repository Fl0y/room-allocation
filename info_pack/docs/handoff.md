# Preluarea proiectului — RoomAllocation

**Actualizat:** 8 noiembrie 2026.

## Starea reală

Există documentația și, din 08.11.2026, **motorul de alocare V0 (Lotul 1)**: `src/`, `tests/`, `scripts/`, fără interfață și fără bază de date. Există repository Git privat (din 08.11.2026). Nu există configurație Docker, bază de date, teste sau rezultate experimentale pentru acest proiect.

Ideea a apărut în discuția generală TableFlow (5–6 noiembrie 2026), după pregătirea unui material despre algoritmul de alocare pentru coordonator. Autorul a decis să mute studiul algoritmului într-un mediu mai ușor de explicat: rezervarea sălilor universitare.

## Ordinea de citire

`CLAUDE.md` → acest fișier → `decisions.md` → `concept.md` → `mostenire-tableflow.md`.

## Prima sesiune: preluare și planificare, fără implementare (încheiată la 06.11.2026)

1. Citește documentele și inspectează read-only folderul, dacă este conectat.
2. Rezumă ideea, rolul algoritmului și componentele (motor, dashboard de rezervare, panou/orar); ordinea de dezvoltare nu este impusă (D09).
3. Separă ce este confirmat (D01–D09) de propuneri (P01–P10) și de întrebările deschise (O01–O08).
4. Analizează critic conceptul: contradicții, riscuri, ce lipsește; în special utilitatea mutărilor (P04) și definiția „celei mai bune variante” (D07, P05).
5. Pune doar întrebările care blochează planificarea; precizează ipotezele rezonabile pentru celelalte.
6. Propune structura planului proiectului și primul lot de lucru.
7. Așteaptă instrucțiunea utilizatorului înainte de a crea fișiere de cod, a instala pachete sau a porni containere.

## Prima direcție tehnică (P10 confirmat; structura feliilor se poate ajusta)

Principiul (D09): ordinea de dezvoltare se alege astfel încât algoritmul să poată fi **văzut** devreme, fără a neglija back-end-ul. Propunerea (P10) este o primă „felie verticală”:

- **motorul de alocare**, independent de interfață și de baza de date: săli, rezervări existente și cererea nouă pe grila de perechi → sala aleasă + explicație, sau refuz motivat + alternative;
- constrângerile obligatorii (sală, profesor, grupă, capacitate, tip, coeziunea blocului), best-fit, apoi scorul propus;
- cele 5 cazuri conflictuale din concept §6, ca teste automate;
- o **vizualizare simplă** a grilei săli × perechi, în care se văd rezervările, decizia și explicația pentru fiecare caz.

Back-end-ul (bază de date cu constrângeri, API, concurență) urmează imediat și refolosește motorul neschimbat. Ordinea exactă se decide în prima sesiune.

## Pasul următor (nu se începe implementarea fără autorizare explicită)

1. ~~Analiza grupelor, subgrupelor și fluxurilor (O06)~~ — încheiată, D21.
2. ~~Clarificarea O10~~ — încheiată, D22.
3. ~~Decizia asupra P11–P15 și O13~~ — încheiată: P11–P15 confirmate, D24.
4. ~~Crearea `plan.md`~~ — creat la 08.11.2026 (V0 = Etapa 0 + Lotul 1 + Lotul 2 + analiza literaturii; V1 după V0).
5. Autorizarea primului lot: motorul de alocare pur (TypeScript, fără BD și interfață), verificator independent, oracol exhaustiv pe instanțe mici, cazurile 1–5 ca teste și o vizualizare statică „înainte/după” a grilei săli × perechi.

## Evidență pentru sesiunile următoare

După fiecare etapă completează: data, ce s-a implementat, verificări executate și rezultate, limite, decizii noi, pasul următor.

### Jurnal

- **06.11.2026 — pachet de pornire.** Creat din discuția TableFlow: `CLAUDE.md`, `handoff.md`, `decisions.md`, `concept.md` (v1.1), `mostenire-tableflow.md`, `discutii-tematice.md`. Precizare a autorului: ordinea de dezvoltare nu este impusă; se urmărește vizualizarea timpurie a algoritmului și acoperirea back-end-ului (D09, P10). Implementat: nimic. Următorul pas: prima sesiune de preluare și planificare.
- **06.11.2026 — prima sesiune de preluare.** Prezentate în discuția generală: înțelegerea proiectului, statutul D/P/O, analiza critică (definiția „celei mai bune variante”, utilitatea mutărilor, contradicțiile H6/H8 și D06/H7), o ordine de dezvoltare și primul lot propus. Punctele nerezolvate au fost trecute ulterior ca O09–O12. Implementat: nimic.
- **08.11.2026 — decizii ale autorului.** Nume RoomAllocation, folder `room-allocation/` (D10). Excluse: deplasarea între clădiri (D11, S4) și preferințele personale ale profesorilor (D12, S5); scorul rămâne excedent + raritate + fragmentare. RoomAllocation este lucrarea principală (D13); prioritatea este valoarea științifică (D14); grila din concept §3.1 confirmată (D15); recurența ca opțiune ulterioară (D16); disponibilitate instabilă, plan pe etape mici (D17). Confirmate P01–P10 (P02 fără S4, S5). Actualizate: `CLAUDE.md`, `decisions.md`, `concept.md` (v1.2), `discutii-tematice.md` (prefix `RA ·`), acest fișier. Implementat: nimic. Următorul pas: O06, apoi O09–O12 și `plan.md`.
- **08.11.2026 (a doua actualizare).** Confirmate: ierarhia „celei mai bune variante” (D18); fixarea doar pentru evenimente/examene, anulată la închiderea sălii pentru reparații (D19); blocul se rupe doar ca opțiune cu acordul profesorului, prioritară fiind soluția prin mutări (D20). Actualizate `decisions.md`, `concept.md` (v1.3: H7, H8, cazurile 1, 2, 5). Analiza O06 prezentată în discuția generală. Implementat: nimic.
- **08.11.2026 — O06 închis (D21).** Ierarhie flux → grupă → subgrupă, o singură împărțire pe grupă; număr de studenți declarat doar pe unitatea cea mai mică; numărul cererii dedus din unități; H3 prin unități atomice, în motor și în BD; împărțiri multiple, opționale și grupe mixte în afara primei versiuni. Actualizate `decisions.md`, `concept.md` (§3.2, H3). Implementat: nimic. Următorul pas: O10, apoi `plan.md`.
- **08.11.2026 — O10 închis (D22).** Modul lot maximizează întâi perechile satisfăcute, apoi cererile; celelalte valori se raportează ca indicatori. Nu mai sunt întrebări deschise. Implementat: nimic. Următorul pas: `plan.md`, după instrucțiunea autorului.
- **08.11.2026 — feedback-ul coordonatorului.** Întrebări: implementarea și simulări „palpabile”, integrarea în ASEM; idei: intervale libere ale profesorilor, Google Calendar, echipamente, research. Analiză și răspunsuri în `feedback-coordonator.md` (inclusiv un exemplu calculat de mână, nu rezultat experimental). Decis: V0 întâi (D23). Propuse: P11–P15. Deschis: O13 (date reale). Constatare din literatură: UniTime are deja perturbare minimă cu limită de două activități afectate; contribuția se formulează ca adaptare și evaluare. Implementat: nimic.
- **08.11.2026 — P11–P15 confirmate; O13 închisă (D24).** Date sintetice în V0; instanțele ITC 2019 ca validare ulterioară. Nu mai sunt întrebări deschise. Implementat: nimic. Următorul pas: `plan.md` cu V0 ca prim obiectiv, după instrucțiunea autorului.
- **08.11.2026 — `plan.md` creat (versiunea 1).** V0: Etapa 0 (documente, verificarea mediului, repository), Lotul 1 (motor, verificator, oracol, cazurile 1–5, raport vizual static), Lotul 2 (generator, simulator A/B/C/C+M, demo fără BD), analiza literaturii în paralel. V1: back-end, dashboard, panou + .ics + CSV, extensii, experimente, validare ITC 2019. Propus în plan, de confirmat: scorul lexicografic în V0; demo static (esbuild + HTML). Implementat: nimic. Următorul pas: aprobarea planului, verificarea mediului pe Mac și autorizarea Lotului 1.
- **08.11.2026 — Lotul 1 (motorul de alocare).** Autorizat de autor; D25 (scor lexicografic), D26 (demo static), D27 (mediul).
  - *Implementat:* modelul (`src/engine/types.ts`), unitățile atomice (D21), verificatorul independent H1–H7 și verificarea tranzițiilor H8/D19 (`checker.ts`), alocarea online cu scor lexicografic, reparare prin căutare exhaustivă a planurilor cu ≤ M mutări (doar sala, la aceeași oră, blocul întreg), refuz cu motive și alternative propuse, inclusiv ruperea blocului ca ultimă opțiune (`allocate.ts`), repararea după închiderea unei săli (`repair.ts`), strategiile first-fit / best-fit / score; scenariile: cazurile 1–5 și exemplul pentru coordonator (`src/scenarios/`); raportul vizual static `npm run report` → `out/cases.html`.
  - *Verificat (în mediul lui Claude, Linux, Node 22.23; și pe o copie a fișierelor din folder):* `tsc` fără erori; 42 de teste trec: verificatorul (câte un test negativ pentru H1–H7, plus H8), cazurile 1–5 conform conceptului (cazul 1: 2 mutări; cazurile 2 și 3: o mutare; cazul 3: locuri neocupate 95 → 15; cazul 4: GROUP_BUSY cu alternative valide; cazul 5: 9 rezervări numărate, fără încălcări), exemplul pentru coordonator identic cu calculul de mână, oracolul exhaustiv pe 2000 de instanțe aleatoare × M = 0, 1, 2 (motor ⇔ oracol, număr minim de mutări), determinismul la amestecarea sălilor, rezervărilor și datelor. Teste de mutație manuale: mutarea rezervărilor înghețate și alegerea celui mai prost plan sunt detectate; o a treia mutație (pruning slăbit) e echivalentă semantic.
  - *Cazul 5 (date sintetice, rezultatul motorului):* 7 rezervări realocate la aceeași oră fără alte mutări, 1 (examenul) cu o mutare, 1 (blocul b4) nerezolvată, cu 5 alternative propuse.
  - *Limite:* testele nu au fost rulate încă pe Mac (Node 24); raritatea V0 e binară (laborator/auditoriu folosit inutil), fragmentarea numără doar ferestrele izolate; repararea tratează rezervările afectate secvențial (cele mai constrânse întâi), nu caută optimul global; alternativele nerezolvatelor sunt independente între ele; examenul realocat rămâne fixat în sala nouă (interpretare a D19, de confirmat); recurența nu e modelată (cazul 5 folosește două rezervări separate); oracolul acoperă instanțe mici (o zi, 2 perechi, 3–5 săli).
  - *Pasul următor:* autorul rulează pe Mac `npm ci`, `npm test`, `npm run typecheck`, `npm run report`; creează repository-ul Git privat și primul commit; apoi Lotul 2 (generator, simulator, demo).
- **08.11.2026 — Lotul 1 verificat pe Mac.** Autorul a rulat `npm ci`, `npm test`, `npm run typecheck`, `npm run report`: toate trec; raportul `out/cases.html` coincide cu cel generat de Claude. Repository Git privat creat, primul commit și push. Rămâne de confirmat: examenul realocat rămâne fixat în sala nouă (interpretare D19). Pasul următor: Lotul 2 (generator, simulator, demo), după autorizarea autorului.
- **08.11.2026 — Lotul 2 (simulare și demo).** Autorizat de autor; D19 precizat (rezervarea fixată, realocată, rămâne fixată).
  - *Implementat:* generatorul de date sintetice cu seed (`src/sim/generator.ts`: facultate fictivă cu 4 auditorii, 10 săli de seminar, 8 laboratoare, 10 fluxuri; o săptămână; cereri până la o încărcare țintă); simulatorul cu 6 strategii (A prima sală liberă, B best-fit, C scor V0, B+M2, C+M1, C+M2), indicatorii din plan §5 și diferențe pereche cu IC 95% (`src/sim/simulate.ts`); `npm run simulate` → `out/simulation.html` + `.json`; demo-ul static `npm run demo` → `out/demo.html` (pas cu pas, cerere nouă, alternative aplicabile, ruperea blocului cu acord, închiderea unei săli, compararea strategiilor, scenariu generat), logica separată în `src/demo/controller.ts`; opțiunea `verify` în `allocate` (implicit activă; simulatorul verifică doar starea finală).
  - *Alegeri ale generatorului (de confirmat):* șirul de cereri nu are suprapuneri de profesori/grupe, iar fiecare cerere are cel puțin o sală compatibilă, ca refuzurile să măsoare doar ocuparea sălilor; ponderile tipurilor de activitate (curs 0,27, seminar 0,45, laborator 0,28) fac cererea pe tip aproximativ proporțională cu oferta; toate rezervările sunt mutabile; ordinea de sosire aleatoare.
  - *Verificat (mediul lui Claude și o copie a folderului):* `tsc` fără erori; 59 de teste trec (cele 42 anterioare + generator, simulator, logica demo-ului); simularea completă (30 de seed-uri × 4 încărcări × 6 strategii = 720 de rulări) fără încălcări în stările finale; demo-ul testat în browser (Chromium) fără erori în consolă.
  - *Rezultate preliminare (date sintetice, un singur profil; perechi acceptate, Δ față de A, IC 95%):* C (raritate) +6,0…+7,5 puncte procentuale la toate încărcările; B (best-fit) +4,8 la 0,5, dar ≈0 la 0,85–0,95, pentru că pune seminare în laboratoare (laboratoare acceptate 60% la 0,95); mutările peste C adaugă +0,2…+1,4 p.p. (C+M2 − C, fără pierdere pe niciun seed), cu 0,1–2,6% rezervări mutate; B+M2 ajunge la nivelul C+M2, dar mută 2,7–10,7% din rezervări. Costuri ale lui C: mai multe ferestre izolate și ~2–3 locuri neocupate în plus pe pereche față de B. Timp p95 per cerere ≤ 1,4 ms.
  - *Limite:* rezultatele depind de profilul generatorului; A depinde de ordinea sălilor (auditoriile listate primele o dezavantajează la cursuri); fragmentarea V0 influențează rar decizia; fără orizont înghețat și fără recurență în simulare; nu s-au calibrat ponderi (scor lexicografic); demo-ul nu are bază de date și nu păstrează starea.
  - *Pasul următor:* autorul rulează pe Mac `npm ci`, `npm test`, `npm run simulate`, `npm run demo`; commit; apoi analiza literaturii (P14) și prezentarea V0 pentru coordonator.
