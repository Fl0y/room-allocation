# Rezultate — RoomAllocation

Rezultatele științifice și de verificare ale proiectului, cu sursa fiecăruia. Jurnalul (`journal.md`) trimite aici; cifrele nu se copiază în alte documente.

Reguli:
- Fiecare rezultat indică: data, comanda și configurația (seed-uri, încărcări, strategii), commit-ul sau versiunea codului, mediul.
- Statutul este explicit: **verificat** (test automat, determinist), **preliminar** (simulare pe date sintetice, un singur profil) sau **final** (protocolul complet din V1).
- Nu se formulează concluzii generale din rezultatele preliminare și nu se afirmă noutatea înainte de analiza literaturii (P14).
- O rulare nouă care schimbă cifrele **înlocuiește** secțiunea respectivă și se notează în jurnal; versiunile vechi rămân în istoricul Git.

---

## 1. Rezumat (la 2026-11-14)

| Întrebare (concept §7) | Stare |
|---|---|
| Motorul respectă constrângerile H1–H8 și găsește numărul minim de mutări | **Verificat** (teste automate, oracol exhaustiv pe instanțe mici) — §2 |
| Î1. Cât contează scorul cu raritate față de first-fit / best-fit | **Preliminar** — §3 |
| Î2. Valoarea mutărilor | **Preliminar** — §3; câte mutări merită (M = 0–4): §3.5 |
| Î3. Decizia online față de optimul global | Nestudiat (V1, solver exact P08) |
| Î4. Costul în timp | **Preliminar** (timpi pe o singură mașină) — §3 |
| Săptămâna sintetică: orarul + cereri suplimentare (Lotul 3A) | **Preliminar**, set inventat — §4 |
| Cererea cu interval: motorul alege și perechea după D31 (Lotul 4) | **Verificat** (oracol exhaustiv, 600 de instanțe × 4 configurații) — §5.1 |
| Cererea cu interval: efectul asupra ferestrelor studenților (Lotul 4c) | **Preliminar**, set inventat — §5.2 |
| Validarea pe date reale (ITC 2019, D24; facultatea, 3B) | Nestudiat (V1) |

## 2. Verificarea motorului pe cazurile conflictuale (verificat)

Sursa: `npm test` (`tests/engine/cases.test.ts`) și `npm run report` (`out/cases.html`). Cod: commit `340e49f` (Lotul 1), neschimbat în comportament de Lotul 2. Mediu: mediul lui Claude (Node 22) și Mac-ul autorului (Node 24). Strategia implicită: scor V0, M = 2.

| Caz (concept §6) | Rezultatul motorului | Concordă cu rezultatul așteptat |
|---|---|---|
| 1. Ultimul laborator | Refuz cu M = 0 și M = 1; cu M = 2: C → S-12, B → L-105, A primește L-201 (2 mutări). Preventiv: un seminar sosit cu S-12 liberă nu ocupă laboratorul (best-fit l-ar pune în L-105) | Da |
| 2. Bloc rupt de o pereche izolată | Refuz cu M = 0; cu M = 2: E → L-105, blocul 2–4 întreg în L-201 (1 mutare) | Da |
| 3. Auditoriul ocupat de o grupă mică | Seminarul → S-12, fluxul (110) în A-1 (1 mutare); locuri neocupate 95 → 15 | Da |
| 4. Conflict de persoane | `GROUP_BUSY`, cu cele două laboratoare ale subgrupelor; 5 alternative valide în aceeași zi (perechile 1, 4–7) | Da |
| 5. Sală închisă (date sintetice construite pentru caz) | 9 rezervări afectate: 7 la aceeași oră fără alte mutări, 1 (examenul, fixare anulată D19) cu o mutare, 1 (blocul b4) nerezolvată cu 5 alternative propuse; 0 încălcări | Da (rezultatul așteptat era calitativ) |
| Exemplul pentru coordonator (`coordinator-feedback.md` §2.1) | A 4/5 (r4 refuzat), B 4/5 (r2 refuzat), C 5/5, B + M = 1 5/5 cu o mutare | Identic cu calculul de mână |

| 6–10. Cererea cu interval (Lotul 4; rezultatele aprobate de autor la 18.11.2026) | 6: perechea 3, S-1. 7: perechea 2, S-1 (fără criteriul ferestrelor: perechea 4, S-2, 2 ferestre). 8: perechea 3, S-1, o fereastră (laboratorul ocolit). 9: perechea 3, S-1, o fereastră pentru K/1. 10: refuz, `TEACHER_BUSY` la ambele perechi, alternative 2, 5, 1, 6, 7 | Da |

Proprietăți verificate: motorul ⇔ oracolul exhaustiv pe 2000 de instanțe aleatoare mici × M = 0, 1, 2 (existența planului și numărul minim de mutări); determinism la amestecarea sălilor, rezervărilor și datelor.

## 3. Simularea V0 (preliminar)

**Sursa:** `npm run simulate` (configurația implicită), `out/simulation.json` / `out/simulation.html`. Cod: commit `0ce3c53` (2026-11-11). Rulare: 2026-11-08, mediul lui Claude; rezultatele sunt deterministe pentru același seed, cu excepția timpilor.

**Configurația:** facultate sintetică (`src/sim/generator.ts`, profilul implicit): 4 auditorii, 10 săli de seminar, 8 laboratoare, 10 fluxuri (2–4 grupe de 18–30 de studenți, 60% împărțite în subgrupe), o săptămână × 7 perechi; seed-uri 1001–1030; încărcări 0,5 / 0,7 / 0,85 / 0,95 (perechi-sală cerute / disponibile, aproximativ echilibrate pe tipuri); 720 de rulări; 0 încălcări în stările finale. Comparație pereche: toate strategiile primesc același șir de cereri; IC 95% t-Student pe 30 de seed-uri.

**Strategiile:** A — prima sală compatibilă; B — best-fit (cele mai puține locuri goale); C — scorul V0 (raritate → excedent → fragmentare); B+M2, C+M1, C+M2 — cu cel mult 1 sau 2 mutări de sală la aceeași oră.

### 3.1 Perechi acceptate (%)

| Încărcare | A | B | C | B+M2 | C+M1 | C+M2 |
|---|---|---|---|---|---|---|
| 0,50 | 91,3 | 96,0 | 98,7 | 98,8 | 98,8 | 98,8 |
| 0,70 | 89,3 | 91,3 | 96,8 | 97,3 | 97,4 | 97,4 |
| 0,85 | 86,4 | 86,9 | 93,4 | 94,4 | 94,3 | 94,5 |
| 0,95 | 84,0 | 83,6 | 90,0 | 91,4 | 91,1 | 91,4 |

Diferențe pereche, în puncte procentuale (media [IC 95%]):

| Încărcare | B − A | C − A | C+M2 − A | C+M2 − C |
|---|---|---|---|---|
| 0,50 | +4,8 [4,0; 5,6] | +7,4 [6,7; 8,1] | +7,6 [6,9; 8,2] | +0,16 ± 0,12 |
| 0,70 | +2,0 [1,1; 3,0] | +7,5 [6,9; 8,2] | +8,2 [7,6; 8,7] | +0,62 ± 0,17 |
| 0,85 | +0,5 [−0,5; 1,5] | +7,0 [6,4; 7,6] | +8,1 [7,5; 8,7] | +1,12 ± 0,21 |
| 0,95 | −0,4 [−1,4; 0,6] | +6,0 [5,4; 6,7] | +7,4 [6,7; 8,1] | +1,38 ± 0,21 |

C+M2 − C: niciun seed (din 30, la fiecare încărcare) cu pierdere.

### 3.2 Alți indicatori (media pe 30 de seed-uri)

| Indicator | Încărcare | A | B | C | B+M2 | C+M2 |
|---|---|---|---|---|---|---|
| Laboratoare acceptate (%) | 0,50 / 0,95 | 94,2 / 81,2 | 91,1 / 60,2 | 98,3 / 80,2 | 98,6 / 83,2 | 98,6 / 83,2 |
| Cursuri pe flux acceptate (%) | 0,50 / 0,95 | 65,4 / 51,5 | 96,9 / 94,7 | 96,9 / 94,4 | 97,0 / 94,8 | 97,0 / 94,8 |
| Rezervări mutate cel puțin o dată (%) | 0,50 / 0,95 | 0 / 0 | 0 / 0 | 0 / 0 | 2,7 / 10,7 | 0,1 / 2,6 |
| Perechi de săli rare folosite inutil | 0,50 / 0,95 | 90,5 / 100,4 | 84,0 / 121,7 | 3,7 / 55,6 | 74,0 / 75,8 | 3,7 / 53,9 |
| Locuri neocupate / pereche acceptată | 0,50 / 0,95 | 37,8 / 24,9 | 10,9 / 12,1 | 11,4 / 14,9 | 11,0 / 15,4 | 11,5 / 15,6 |
| Goluri izolate în programul sălilor (final) | 0,50 / 0,95 | 53,5 / 57,4 | 80,7 / 64,1 | 81,7 / 66,9 | 83,2 / 59,1 | 81,6 / 63,2 |
| Timp / cerere, p95 (ms) | 0,50 / 0,95 | 0,08 / 0,12 | 0,09 / 0,13 | 0,08 / 0,13 | 0,77 / 1,33 | 0,70 / 1,40 |

Valorile pentru 0,7 și 0,85, C+M1 și intervalele de încredere: `out/simulation.html`.

### 3.3 Observații (preliminare, pe acest generator)

1. **Raritatea (C)** acceptă cu 6–7,5 p.p. mai multe perechi decât A la toate încărcările; avantajul provine în principal din păstrarea laboratoarelor și auditoriilor pentru activitățile care au nevoie de ele (perechi de săli rare folosite inutil: 3,7–55,6 față de 84–122 la B).
2. **Best-fit (B)** ajută la încărcare mică, dar avantajul dispare la 0,85–0,95: pune seminare în laboratoare (laboratoare acceptate 60% la 0,95).
3. **Mutările** adaugă peste C +0,2…+1,4 p.p., crescând cu încărcarea, fără pierderi pe seed-uri, cu cel mult 2,6% rezervări mutate. B+M2 atinge aproximativ același nivel de acceptare, dar mută de 4–20 de ori mai multe rezervări. Pe aceste date, prevenirea (raritatea) reduce nevoia de reparare (mutări) — relevant pentru Î2 și P04.
4. **Costurile lui C:** mai multe goluri izolate în programul sălilor (fragmentare) și 2–3 locuri neocupate în plus pe pereche față de B.
5. **Timpul** rămâne sub 1,5 ms per cerere (p95) chiar cu M = 2, la scara unei facultăți.

### 3.4 Limite

- Un singur profil de facultate; rezultatele depind de generator (ponderile tipurilor, mărimile sălilor și grupelor).
- Șirul de cereri nu are conflicte de persoane și fiecare cerere are o sală compatibilă (refuzurile măsoară doar ocuparea sălilor).
- A depinde de ordinea listei de săli; generatorul listează întâi auditoriile, ceea ce o dezavantajează la cursuri.
- Fragmentarea este al treilea criteriu lexicografic și influențează rar decizia.
- Fără orizont înghețat (toate rezervările mutabile) și fără recurență; ordinea de sosire aleatoare.
- Fără calibrare pe seed-uri separate (scorul V0 nu are ponderi) și fără comparație cu optimul exact.
- Timpii depind de mașină.

### 3.5 Explorare: câte mutări merită (M = 0–4) — preliminar

**Întrebarea:** merită permise mai mult de 2 mutări per cerere (căutare mai adâncă)? Legată de Î2.

**Sursa:** rulare exploratorie în mediul lui Claude, la 2026-11-14, cu codul din commit-ul `0ce3c53`, prin `runOnce` din `src/sim/simulate.ts`, strategia C (scor V0) cu M = 0…4; seed-uri 1001–1015 (15); încărcări 0,85 și 0,95; profilul implicit al generatorului. Scriptul nu este în repository; codul lui:

```ts
import { generateWorkload } from './src/sim/generator.ts';
import { runOnce } from './src/sim/simulate.ts';
for (const load of [0.85, 0.95])
  for (let seed = 1001; seed <= 1015; seed++) {
    const w = generateWorkload(seed, load);
    for (const M of [0, 1, 2, 3, 4])
      runOnce(w, { id: `C+M${M}`, label: `C+M${M}`, strategy: 'score', maxMoves: M }); // se fac mediile pe seed-uri
  }
```

**Rezultate** (medii pe 15 seed-uri; fără intervale de încredere):

| M | Perechi acceptate, încărcare 0,85 | Perechi acceptate, încărcare 0,95 | Rezervări mutate (0,95) | Timp / cerere, p95 (0,95) |
|---|---|---|---|---|
| 0 | 93,38% | 90,14% | 0% | 0,14 ms |
| 1 | 94,15% | 91,11% | 1,60% | 0,35 ms |
| 2 | 94,41% | 91,55% | 2,65% | 1,59 ms |
| 3 | 94,48% | 91,61% | 2,97% | 10,77 ms |
| 4 | 94,49% | 91,62% | 3,01% | 78,55 ms |

**Observații (preliminare):**
- Câștigul scade foarte repede: la 0,95, prima mutare aduce +0,97 p.p., a doua +0,44, a treia +0,06, a patra +0,01.
- Timpul crește de aproximativ 7 ori cu fiecare mutare permisă în plus (creștere exponențială a numărului de variante).
- Pe acest generator, M = 2 este un compromis bun; M ≥ 3 nu se justifică pentru modul online. Concordă cu limita de două activități afectate din UniTime (`literature.md` §3) și cu rezultatul teoretic despre numărul mic de înlocuiri necesare în medie (`literature.md` §2).
- Limita principală a modului online este necunoașterea cererilor viitoare, nu adâncimea căutării; câștiguri mai mari se așteaptă de la prevenire (scorul) și de la reoptimizarea periodică (de testat în V1).

## 4. Săptămâna sintetică (Lotul 3A, preliminar)

**Statut:** preliminar, pe un set **inventat** (`data-format.md` §4). Cifrele descriu setul generat, nu o facultate reală; servesc la verificarea metodei și, după 3B, la comparația cu datele reale. Ferestrele studenților sunt doar măsurate: motorul V0 nu le folosește la alegere.

**Sursa:** 18.11.2026, mediul lui Claude (Node 22), codul de după commit-ul `4348da1` (Lotul 3A, încă necomis la data rulării). Comenzi: `npm run data:synthetic` (seed 1), `npm run week -- synthetic` (seed-urile cererilor suplimentare 1–20; încărcări 0,25 / 0,5 / 0,75 din perechile-sală libere după orar; strategiile din `src/sim/simulate.ts`). Raportul complet, cu intervalele de încredere: `room-allocation-data/synthetic/reports/week.html` (în afara repository-ului; se regenerează identic).

### 4.1 Orarul, fără cereri suplimentare

Setul: 19 săli (4 auditorii, 7 seminar, 8 laboratoare), 12 fluxuri, 72 de unități, 56 de profesori, 246 de repartizări, 299 de ședințe (307 perechi-sală). Validarea: 0 erori, 0 avertismente.

| Măsură | Valoare |
|---|---|
| Ocuparea totală | 46% (307 / 665) |
| Pe tipuri: auditorii / seminar / laboratoare | 54% / 29% / 57% |
| Pe perechi 1…7 (toate sălile, toate zilele) | 64%, 85%, 78%, 62%, 28%, 5%, 0% |
| Locuri ocupate din locurile sălilor folosite | 58% |
| Perechi de săli rare folosite inutil | 1 |
| Ferestrele studenților | 9 perechi; 8 din 210 zile-unitate cu activitate (4%) |

### 4.2 Cereri suplimentare peste orar (medii pe 20 de seed-uri)

| Strategia | Acceptate, 0,25 | Acceptate, 0,5 | Acceptate, 0,75 | Săli rare folosite inutil (final), 0,5 | Ferestrele studenților (final), 0,5 |
|---|---|---|---|---|---|
| A · prima sală liberă | 86,5% | 80,3% | 76,8% | 39,0 | 244,8 |
| B · best-fit | 89,5% | 86,3% | 82,5% | 17,9 | 262,1 |
| C · scor V0 | 89,5% | 86,7% | 83,5% | 6,7 | 262,2 |
| C + M = 2 | 89,8% | 86,8% | 83,8% | 6,7 | 261,9 |

Diferențele față de A pentru B, C și C + M = 2 au intervalele de încredere de 95% (comparație pe perechi) peste zero la toate cele trei încărcări (de exemplu C la 0,75: +6,7 p.p. [6,0; 7,4]). Mutări: sub 0,02 pe cerere acceptată. Timp per cerere, p95: sub 1 ms. Încălcări în stările finale: 0.

**Observații (preliminare):**
- Refuzurile sunt concentrate pe auditorii: la 0,75, strategia A acceptă 43% din cursurile recuperate și 40% din evenimente, strategia C 69% și 71%; seminarele și consultațiile trec aproape toate. Auditoriul este resursa rară a acestui set.
- Scorul (C) face diferența mai ales prin protejarea sălilor rare (39 → 6,7 perechi folosite inutil la 0,5), în concordanță cu §3.
- Mutările aduc puțin aici (+0,1–0,3 p.p.), mai puțin decât în §3: orarul lasă destule săli libere, iar conflictele sunt mai ales pe auditorii, unde nu există săli de rezervă.
- Ferestrele studenților cresc de la 9 la ≈ 245–265 după cererile suplimentare, pentru că acestea se pun la ore alese uniform. Este punctul de plecare pentru Lotul 4 (cererea cu interval, D29, D31). Best-fit și scorul au ceva mai multe ferestre decât A doar pentru că acceptă mai multe cereri.
- Limite: un singur set (seed 1), structură inventată, cereri suplimentare fără conflicte de persoane și uniforme în timp; orarul generat este foarte compact (4% zile cu ferestre), probabil mai compact decât unul real.

## 5. Cererea cu interval și ferestrele studenților (Lotul 4)

### 5.1 Verificarea motorului (verificat)

Sursa: `npm test` (`tests/engine/interval.test.ts`), 18.11.2026, mediul lui Claude. Pe 600 de instanțe mici aleatoare cu interval (o zi, perechile 1–4, 3–4 săli, 4–8 rezervări, 2–3 începuturi posibile), pentru M = 0, 1, 2 cu criteriul ferestrelor și M = 1 fără el: motorul acceptă dacă și numai dacă oracolul exhaustiv găsește o variantă; numărul de mutări este minim; varianta aleasă este minimă după D31 (raritate → ferestre → excedent → fragmentare; fără mutări, și perechea: cea mai devreme la egalitate); ferestrele raportate în explicație sunt egale cu cele calculate independent. Fără interval, decizia este identică cu V0: 300 de instanțe comparate direct, iar simularea V0 și săptămâna 3A dau aceleași valori înainte și după Lotul 4. Testele de mutație: dezactivarea criteriului ferestrelor și inversarea departajării după pereche sunt detectate.

### 5.2 Simularea pe setul sintetic (preliminar)

Sursa: 18.11.2026, mediul lui Claude, `npm run interval -- synthetic` (setul seed 1, seed-urile cererilor 1–20, încărcări 0,25 / 0,5 / 0,75, strategia scor, M = 2). Aceleași cereri suplimentare în cele trei variante; cu interval, 73% dintre cereri acceptă 1–3 perechi în plus după prima. Raportul complet, cu intervalele de încredere: `room-allocation-data/synthetic/reports/interval.html`.

| Varianta | Acceptate 0,25 / 0,5 / 0,75 | Ferestrele studenților (final) 0,25 / 0,5 / 0,75 | Ferestre adăugate / cerere acceptată 0,25 / 0,5 / 0,75 |
|---|---|---|---|
| Ora fixă | 89,8% / 86,8% / 83,8% | 195,3 / 261,9 / 266,1 | 2,39 / 1,68 / 1,17 |
| Interval, fără criteriul ferestrelor | 90,0% / 85,8% / 81,6% | 225,0 / 294,4 / 298,7 | 2,77 / 1,91 / 1,35 |
| Interval, cu criteriul ferestrelor (D31) | 93,0% / 89,3% / 85,3% | 193,7 / 258,5 / 263,1 | 2,29 / 1,61 / 1,13 |

Ferestrele în orarul inițial: 9. Diferențe pe perechi față de ora fixă (interval de încredere 95%): cu criteriul, acceptate +3,1 [2,3; 4,0], +2,5 [2,0; 3,0], +1,5 [0,9; 2,1] p.p.; fără criteriu, ferestrele finale +29,7 / +32,4 / +32,5. Cu M = 3 rezultatele sunt identice, doar mai lente (p95 ≈ 2–4 ms față de ≈ 1 ms).

**Observații (preliminare):**
- Libertatea de a alege perechea, **fără** criteriul ferestrelor, strică orarul studenților: cu aproximativ 12–15% mai multe ferestre. Motorul alege atunci perechea doar după sală (raritate, locuri goale, goluri), deci adesea una depărtată de celelalte activități ale grupei.
- **Cu** criteriul ferestrelor, ferestrele sunt la nivelul orei fixe sau puțin sub el (−3,5 [−6,5; −0,4] la 0,5), deși se acceptă mai multe cereri; pe cerere acceptată, cu 3–4% mai puține decât la ora fixă. Câștigul este mic, pentru că ferestrele vin după mutări și sălile rare (D31) și pentru că cererile suplimentare au intervale scurte.
- Acceptările nu se compară curat între variante: generatorul garantează că persoanele sunt libere doar la prima pereche a fiecărei cereri. Când o cerere se mută mai târziu, poate ocupa grupa sau profesorul unei cereri care vine după (refuzuri de tip „persoane ocupate”, inexistente la ora fixă). Varianta fără criteriu mută mai des și pierde mai mult din acest motiv. Câștigul de acceptare al variantei cu criteriu e deci o observație despre acest generator, nu un rezultat general.
- Limite: un singur set inventat, cu un orar inițial foarte compact; distribuția intervalelor (1–3 perechi în plus) e o propunere.

