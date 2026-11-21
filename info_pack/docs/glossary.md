# Dicționar de termeni — RoomAllocation

Semnificația termenilor folosiți în documentație și în cod. Un termen are **un singur sens** în proiect. Definițiile explică termenul; regulile complete rămân în documentele indicate (de exemplu `decisions.md`), nu se copiază aici.

Format: **termen** (echivalentul din literatură, în engleză) — definiție. *Unde:* fișierul sau decizia. *Nu confunda cu:* …

Reguli: cine introduce un termen nou îl adaugă aici în aceeași etapă (`docs-guide.md` §4). Codurile constrângerilor H1–H8 și ale preferințelor S1–S7 sunt definite în `concept.md` §3.3.

---

## 1. Domeniul (universitatea)

- **Pereche** (*period, timeslot*) — un interval de 90 de minute din grila zilei; sunt 7 perechi, de la 08:00 la 19:30, cu pauze de 10 minute. *Unde:* D04, D15, `src/engine/grid.ts`. *Nu confunda cu:* o pereche de elemente în statistică (comparație pe perechi, §4).
- **Bloc** (*block, consecutive periods*) — mai multe perechi consecutive cerute împreună de același profesor; rămân în aceeași sală. *Unde:* D06, H7, D20. Se rupe doar cu acordul profesorului.
- **Flux** (*stream, cohort*) — mai multe grupe care ascultă împreună un curs (de regulă în auditoriu). *Unde:* D21.
- **Grupă** (*group, class*) — unitatea academică stabilă de studenți, cu orar comun. *Unde:* D21.
- **Subgrupă** (*subgroup, section*) — o parte a grupei, de obicei jumătate, pentru laboratoare. *Unde:* D21.
- **Unitate atomică** (*atomic unit*) — cea mai mică unitate din ierarhie: subgrupa sau grupa fără subgrupe. Două activități sunt în conflict de grupă dacă au o unitate atomică comună. *Unde:* D21, `src/engine/units.ts`.
- **Cerere** (*request*) — ce trimite profesorul: participanții, activitatea, cerințele de sală, data, perechile; după D29 poate avea și un interval de perechi acceptabile. *Unde:* `src/engine/types.ts`. *Nu confunda cu:* rezervare.
- **Rezervare** (*booking, assignment*) — o cerere acceptată, cu sala atribuită. *Unde:* `src/engine/types.ts`.
- **Rezervare mutabilă** (*movable*) — își poate schimba sala (la aceeași oră) ca să facă loc altei cereri. *Unde:* P04, D18.
- **Rezervare înghețată** (*frozen*) — în orizontul înghețat; nu se mută. *Unde:* P04. *Nu confunda cu:* fixată.
- **Orizont înghețat** (*frozen horizon*) — intervalul apropiat de dată (de exemplu 48 de ore) în care rezervările obișnuite nu mai pot fi mutate. *Unde:* P04.
- **Rezervare fixată** (*pinned, fixed*) — doar examenele și evenimentele; nu se mută, cu excepția închiderii sălii pentru reparații, după care rămâne fixată în sala nouă. *Unde:* D19.
- **Sală rară** (*scarce room*) — o sală cu resurse puține la număr (laborator cu calculatoare, auditoriu mare), care trebuie păstrată pentru activitățile care chiar au nevoie de ea. *Unde:* P03, D25.
- **Închiderea sălii** (*room closure*) — sala nu poate fi folosită o perioadă (de exemplu reparații); declanșează repararea. *Unde:* H6, D19, cazul 5.
- **Alternativă** (*alternative, suggestion*) — o variantă propusă la refuz (altă pereche, altă zi, ruperea blocului); nu se aplică automat, ci doar cu confirmarea profesorului. *Unde:* D18, D20.
- **Fereastră** (*idle period, gap*) — o pereche liberă între prima și ultima activitate a unei **subgrupe** într-o zi. *Unde:* D29. *Nu confunda cu:* fragmentare (golurile din programul unei săli).
- **Încărcare** (*load*) — perechi-sală cerute / perechi-sală disponibile într-o simulare. *Unde:* `src/sim/generator.ts`.

## 2. Algoritmul

- **Motor de alocare** (*allocation engine*) — codul care ia decizia, independent de interfață și de baza de date. *Unde:* `src/engine/`.
- **Online / offline** — online: cererile sosesc pe rând și fiecare se decide imediat, fără să știm ce urmează; offline: toate cererile sunt cunoscute dinainte și se decid împreună. *Unde:* concept §2, §4.2.
- **Mod lot** (*batch mode*) — alocarea sălilor pentru un set de cereri cunoscute simultan (offline). *Unde:* P01, D22.
- **Algoritm greedy** (*greedy algorithm*) — ia la fiecare pas cea mai bună decizie de moment, fără să revină asupra ei. Modul online este greedy în privința orelor. *Unde:* `src/engine/allocate.ts`.
- **Euristică** (*heuristic*) — o regulă practică ce dă de obicei soluții bune, fără garanția că sunt optime (de exemplu best-fit, raritatea, „cele mai constrânse întâi”).
- **First-fit / best-fit** — euristici greedy: prima sală compatibilă din listă / sala cu cele mai puține locuri goale. Strategiile A și B din simulare. *Unde:* `src/engine/score.ts`.
- **Scor lexicografic** (*lexicographic objective*) — variantele se compară criteriu cu criteriu, în ordine; al doilea criteriu contează doar la egalitate pe primul. *Unde:* D18, D25, `compareKeys` în `score.ts`.
- **Raritate** (*scarcity cost*) — criteriul care penalizează folosirea unei săli rare de către o activitate care nu are nevoie de ea. *Unde:* `rarityOf` în `score.ts`.
- **Excedent** (*excess capacity*) — locurile goale: capacitatea sălii minus numărul de studenți.
- **Cerere cu interval** — cerere care acceptă mai multe perechi de început (de la `start` până la `latest`); motorul alege și perechea, după ordinea D31. *Unde:* P11, D29, `src/engine/types.ts` (`latest`), Lotul 4.
- **Fragmentare** (*room fragmentation*) — golurile izolate de o pereche lăsate în programul unei **săli**. *Nu confunda cu:* fereastră (golurile din orarul unei subgrupe).
- **Plan** — o variantă completă de acceptare a cererii: sala aleasă plus mutările necesare. *Unde:* `allocate.ts`.
- **Mutare** (*move, reassignment*) — schimbarea **sălii** unei rezervări existente, la **aceeași oră**; ora nu se schimbă niciodată automat. *Unde:* P04, D18. M = numărul maxim de mutări pentru o cerere.
- **Blocant** (*blocker*) — o rezervare care ocupă sala dorită la perechile cerute și trebuie mutată ca cererea să încapă.
- **Cale de augmentare** (*augmenting path*) — un lanț de mutări A → B → C care eliberează un loc; noțiune din teoria potrivirilor în grafuri bipartite. *Unde:* `dfs` în `allocate.ts`, `literature.md` §2.
- **Backtracking** — căutare care încearcă o alegere, continuă și, dacă nu reușește, o anulează și încearcă alta. *Unde:* `dfs` în `allocate.ts`.
- **Potrivire bipartită** (*bipartite matching*) — asocierea elementelor din două mulțimi (activități ↔ săli) fără ca două activități să primească aceeași sală. *Unde:* `literature.md` §2.
- **Reparare** (*repair*) — realocarea rezervărilor afectate de o schimbare (de exemplu închiderea unei săli), cu cât mai puține modificări. *Unde:* `src/engine/repair.ts`.
- **Perturbare minimă** (*minimal perturbation problem*) — găsirea unei soluții noi cât mai apropiate de cea existentă după o schimbare. *Unde:* `literature.md` §4.
- **Cele mai constrânse întâi** (*most constrained first, fail-first*) — se tratează întâi elementele cu cele mai puține variante (blocurile lungi, sălile rare). *Unde:* `repair.ts`.
- **NP-dificilă** (*NP-hard*) — problemă pentru care nu se cunoaște un algoritm care să găsească garantat optimul rapid pe instanțe mari; nu înseamnă „fără soluție”. *Unde:* concept §4.1.
- **Solver exact** (*exact solver*, ILP, CP-SAT) — program care găsește optimul garantat, practic doar pe instanțe mici sau medii. *Unde:* P08.

## 3. Testarea și verificarea

- **Verificator** (*checker, validator*) — cod independent care verifică dacă o stare respectă regulile H1–H8, fără să folosească logica motorului. *Unde:* `src/engine/checker.ts`.
- **Oracol** (*test oracle*) — o metodă independentă care știe răspunsul corect; aici, căutarea exhaustivă care încearcă toate variantele pe instanțe mici, ca să verifice motorul. *Unde:* `tests/oracle/bruteforce.ts`. *Nu confunda cu:* baza de date Oracle.
- **Căutare exhaustivă / forța brută** (*brute force*) — încercarea tuturor variantelor posibile; sigură, dar posibilă doar pe instanțe mici.
- **Test de mutație** (*mutation testing*) — introducerea intenționată a unei erori în cod, ca să verificăm că testele o detectează.
- **Mutant echivalent** (*equivalent mutant*) — o modificare a codului care nu schimbă rezultatul, deci nu poate fi detectată de teste.
- **Determinism** — aceeași intrare dă mereu același rezultat, indiferent de ordinea în care sunt date sălile sau rezervările.
- **Seed** — numărul de pornire al generatorului pseudo-aleator; același seed produce aceleași date, deci rezultatele se pot reproduce.
- **Scenariu / caz** — o secvență de evenimente (cereri, închideri) cu rezultatul așteptat; cazurile 1–5 din concept §6. *Unde:* `src/scenarios/cases.ts`.

## 4. Simularea și statistica

- **Simulare** — rularea strategiilor pe multe șiruri de cereri generate, pentru a compara indicatorii. *Unde:* `src/sim/simulate.ts`, `results.md` §3.
- **Strategie** — o combinație de criteriu de alegere și număr de mutări: A, B, C, B+M2, C+M1, C+M2.
- **Comparație pe perechi** (*paired comparison*) — strategiile primesc exact aceleași cereri (același seed), iar diferența se calculează seed cu seed.
- **Interval de încredere 95%** (*95% confidence interval*) — intervalul în care se află, cu încredere de 95%, media reală; dacă intervalul unei diferențe nu conține zero, diferența este considerată semnificativă.
- **p95** — valoarea sub care se află 95% dintre măsurători (de exemplu timpul per cerere).
- **Format intern** (*canonical format*) — forma comună a datelor (sintetice și reale) pe care o citește codul: 7 fișiere (săli, unități, profesori, discipline, repartizări, orar, descrierea setului). *Unde:* `data-format.md`, D33.
- **Set sintetic** — date inventate în formatul intern, produse de un script cu seed, care imită aproximativ o facultate. *Unde:* `src/sim/faculty.ts`, `data-format.md` §4.
- **Repartizare** — cine predă ce disciplină, la ce unități, cu ce cerințe de sală și de câte ori pe săptămână. *Unde:* `assignments.csv`.
- **Săptămâna-tip** — o săptămână concretă (luni–vineri) în care se pune orarul; recurența nu este încă modelată. *Unde:* `dataset.json`.
- **Cerere suplimentară** — o cerere generată peste orar în simulare: recuperare, consultație sau eveniment. *Unde:* `src/sim/week.ts`.
- **Pseudonim** — identificatorul fictiv al unui profesor (`P-001`); numele reale nu intră în formatul intern (D28). Corespondența stă doar în `room-allocation-data/real/`.
- **Rezultat preliminar / verificat / final** — statutul unui rezultat în `results.md`: preliminar = simulare pe date sintetice; verificat = test automat; final = protocolul complet din V1.

## 4bis. Baza de date și concurența (Lotul 5)

- **Tranzacție** — un grup de operații care se aplică toate sau niciuna; până la `COMMIT`, celelalte conexiuni nu văd nimic din ele. *Unde:* `src/db/service.ts`.
- **Constrângere de excludere** (*exclusion constraint*) — regulă PostgreSQL care refuză două rânduri ce se suprapun (de exemplu aceeași sală, aceeași zi, perechi care se intersectează). Este a doua linie de apărare, după motor. *Unde:* `db/migrations/001_schema.sql`.
- **Constrângere amânată** (*deferred constraint*) — verificată abia la `COMMIT`, ca un lanț de mutări să fie judecat doar la final.
- **Blocarea zilei** (*advisory lock*) — cererile pentru aceeași zi se tratează una după alta, cele pentru zile diferite în paralel.
- **Idempotență** — aceeași cerere (aceeași cheie) trimisă de mai multe ori produce o singură rezervare și aceeași decizie.
- **Migrație** — un fișier SQL numerotat care schimbă schema; o migrație aplicată nu se mai modifică. *Unde:* `db/migrations/`.
- **Test de integrare** — test pe baza de date reală, nu pe o simulare a ei. *Unde:* `tests/db/`, `npm run test:db`.

## 5. Procesul de lucru

- **D / P / O** — decizie confirmată / propunere / întrebare deschisă, cu ID-uri în `decisions.md`.
- **V0 / V1** — versiunea simplă (algoritmul funcțional, vizibil) / versiunea matură (bază de date, interfețe, date reale). *Unde:* D23, `plan.md`.
- **Lot** — un pachet mic de lucru, cu criterii de acceptare, încheiat cu verificare. *Unde:* `plan.md`.
- **Felie verticală** (*vertical slice*) — o etapă care livrează ceva funcțional de la un capăt la altul, în loc de un strat tehnic izolat. *Unde:* P10.
- **Agent / sub-agent** — modelul AI care lucrează în discuție / un model lansat de el pentru o sarcină delimitată. *Unde:* `agent-rules.md`.
