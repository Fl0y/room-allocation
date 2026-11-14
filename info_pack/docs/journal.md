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
