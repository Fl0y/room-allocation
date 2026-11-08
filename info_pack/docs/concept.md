# RoomAllocation — alocarea sălilor universitare: fundamentarea ideii de proiect

**Statut:** conceptul de pornire al proiectului RoomAllocation, derivat din TableFlow. Document de lucru: afirmațiile din el sunt **propuneri**, cu excepția celor marcate ca decizii în `decisions.md`.
**Data:** 8 noiembrie 2026 (versiunea 1.3: nume RoomAllocation; deplasarea și preferințele profesorilor excluse — D10–D12; grila și recurența — D15, D16; „cea mai bună variantă”, fixarea și blocurile — D18–D20; fluxuri, grupe, subgrupe — D21)

---

## 1. Ideea, pe scurt

Algoritmul de alocare din TableFlow se mută într-un mediu mai ușor de explicat: **rezervarea sălilor într-o universitate**.

- **Studenții** consultă un panou sau orar **generat din rezervări**: ce grupă, în ce sală, la ce oră și pereche, cu ce profesor.
- **Profesorii** au un dashboard din care rezervă o sală după criterii: data, perechea (90 de minute, cu pauze de 10 minute), numărul de studenți, tipul sălii (laborator, auditoriu, sală de seminar etc.).
- **Algoritmul** alege sala potrivită și:
  - păstrează în **aceeași sală** perechile consecutive ale aceluiași profesor (un „bloc”);
  - rezolvă **conflictele** dintre cereri, iar când nu există o soluție fără conflicte, găsește **cea mai bună variantă posibilă**;
  - poate **reorganiza** rezervările existente prin mutări sau interschimbări, dacă asta permite satisfacerea mai multor cereri.

### Evaluarea inițială a ideii

Schimbarea de mediu față de TableFlow este bine motivată:

- **Se explică ușor.** Oricine din universitate înțelege imediat problema: săli, perechi, grupe, laboratoare. Exemplele de conflict se pot desena pe un orar.
- **Timpul este discret.** Perechile formează o grilă fixă de sloturi, nu ore arbitrare. Exemplele devin clare, iar modelul matematic, mai curat.
- **Există mai multe tipuri de resurse.** Pe lângă sală, profesorul și grupa sunt și ele resurse care nu pot fi în două locuri deodată. Problema devine mai bogată și mai interesantă științific decât cea a meselor.
- **Literatura e bogată.** *University course timetabling* este una dintre cele mai studiate probleme din cercetarea operațională [1, 2, 3]. Asta e un avantaj (repere solide de comparație), dar și o obligație: contribuția trebuie delimitată precis.
- **Mult se poate refolosi din TableFlow:** motorul pur, constrângerile din baza de date împotriva suprapunerilor, tranzacțiile concurente, simulatorul determinist, testele și mediul Docker.

**Riscul principal este volumul.** „Orarul complet al universității” este o problemă foarte mare. Proiectul se concentrează pe **algoritmul de alocare** și pe **rezervările profesorilor**; orarul afișat rezultă din rezervări, nu se construiește automat de la zero (secțiunea 2).

---

## 2. Delimitarea problemei

**Decizii ale autorului (06.11.2026):** proiectul **nu** pornește de la un orar real, cu date, ore, grupe și profesori fixe; datele sunt sintetice. Componentele sunt:

- **algoritmul de alocare** (motorul), testat independent;
- **dashboard-ul de rezervare** pentru profesori;
- **panoul/orarul** care afișează situația rezervărilor: grupa, sala, data, perechea, ora, profesorul.

Ordinea de dezvoltare **nu este impusă**. Se alege una eficientă, care permite **vizualizarea timpurie** a deciziilor algoritmului și acoperă și back-end-ul (integritate, constrângeri, concurență). O propunere este în secțiunea 9.

Sub numele de „orar” se ascund trei probleme diferite; proiectul le tratează astfel:

| Nivel | Ce se decide | Dificultate | În proiect |
|---|---|---|---|
| **A. Orarul complet** (*timetabling*) | Ziua, perechea **și** sala pentru toate cursurile tuturor grupelor, automat | Foarte mare, NP-dificilă [4] | **Nu.** Cel mult, ca extensie: sugerarea altei perechi când nu există sală liberă |
| **B. Alocarea sălilor pentru un lot de cereri cu ore stabilite** (*classroom assignment*) | Doar sala, pentru mai multe cereri cunoscute simultan (de exemplu, cererile recurente de la începutul semestrului) | Mijlocie; ușoară în unele cazuri, dificilă în altele [5] | **Propus**, ca mod „lot”, după modul online |
| **C. Rezervări individuale** (cereri care sosesc pe rând din dashboard) | Sala și, eventual, perechea, pentru fiecare cerere nouă, peste rezervările existente | Problemă *online*, ca în TableFlow | **Nucleul proiectului** |

Modul de **reparare** (secțiunea 5.4) se aplică peste B și C. „Orarul” pentru studenți este o **vizualizare** a rezervărilor: rezervările recurente (de exemplu, un laborator în fiecare marți) pot reprezenta activitățile regulate.

---

## 3. Modelul

### 3.1 Grila de timp

Perechea durează 90 de minute, iar pauza 10 minute. Grila confirmată (D15), fără pauză lungă de masă, ca în orarul real:

| Pereche | Interval |
|---|---|
| 1 | 08:00–09:30 |
| 2 | 09:40–11:10 |
| 3 | 11:20–12:50 |
| 4 | 13:00–14:30 |
| 5 | 14:40–16:10 |
| 6 | 16:20–17:50 |
| 7 | 18:00–19:30 |

Grila se configurează, nu se calculează din „90 + 10”, pentru că unele universități au o pauză de prânz mai lungă. O rezervare ocupă unul sau mai multe sloturi **consecutive** dintr-o zi. Fiecare slot are și o dimensiune săptămânală: săptămâni pare/impare, semestru, excepții (sărbători, sesiune). Recurența este o opțiune implementată ulterior (D16); primele versiuni lucrează cu rezervări pe o singură dată.

### 3.2 Entități

| Entitate | Atribute esențiale |
|---|---|
| Sală | Clădire, etaj, capacitate, tip (auditoriu, seminar, laborator), echipamente (număr de calculatoare, proiector, tablă interactivă), accesibilitate, disponibilitate |
| Profesor | Activități predate, eventual restricții (preferințele personale nu influențează alocarea, D12) |
| Flux / grupă / subgrupă (D21) | Ierarhie pe trei niveluri: **flux** (mai multe grupe ale aceluiași an și aceleiași specialități; curs, auditoriu; 50–150 de studenți) → **grupă** academică (unitatea stabilă; seminar; 15–30) → **subgrupă** (parte a grupei, de obicei jumătate; laborator, limbi; 8–15). O singură împărțire pe grupă; grupele fără subgrupe sunt permise. Numărul de studenți se declară doar pe unitatea cea mai mică; grupa și fluxul au suma părților. **Unitate atomică** = subgrupa sau grupa fără subgrupe |
| Activitate | Disciplină, tip (curs, seminar, laborator); legată de una sau mai multe rezervări (o rezervare recurentă poate reprezenta o activitate regulată) |
| Cerere de rezervare | Profesor, unitățile participante (flux, grupe sau subgrupe), număr de studenți (dedus din unități; declarat doar pentru excepții — recuperare parțială, activitate fără grupă — și ≤ mărimea unităților, D21), tip de sală și echipamente necesare, dată sau recurență, perechi (1..k consecutive), flexibilitate (alte perechi sau zile acceptate), prioritate |
| Rezervare | Cererea + sala atribuită + starea (fixată — doar evenimente și examene / mutabilă), D19 |

### 3.3 Constrângeri

**Obligatorii** (o soluție care le încalcă nu este acceptată):

| Cod | Constrângere |
|---|---|
| H1 | O sală nu poate avea două activități în același slot (în aceeași săptămână) |
| H2 | Un profesor nu poate fi în două locuri în același slot |
| H3 | O grupă nu poate avea două activități în același slot. Se verifică prin unitățile atomice (D21): două activități din același slot sunt în conflict dacă au cel puțin o unitate atomică comună. Rezultă: subgrupele disjuncte pot fi în paralel; o subgrupă nu poate fi în paralel cu grupa ei; un curs pe flux blochează toate unitățile fluxului. Regula se impune în motor și în baza de date |
| H4 | Capacitatea sălii ≥ numărul de studenți |
| H5 | Tipul sălii și echipamentele corespund cerinței (de exemplu, laborator cu ≥ N calculatoare) |
| H6 | Sala este disponibilă: nu e închisă pentru reparații și nu e rezervată pentru un eveniment sau un examen |
| H7 | **Coeziunea blocului:** perechile consecutive ale aceleiași cereri sunt în aceeași sală. Algoritmul caută întâi o soluție prin mutări; ruperea blocului este doar o opțiune propusă, aplicată numai cu acordul profesorului (D20) |
| H8 | Rezervările fixate nu se mută. Se pot fixa **doar** rezervările pentru evenimente sau examene. Excepție: dacă sala se închide pentru reparații, fixarea se anulează și algoritmul realocă rezervarea într-o sală corespunzătoare (D19) |

**Preferințe** (se optimizează, nu se impun):

| Cod | Preferință |
|---|---|
| S1 | Puține locuri neocupate (*best-fit*): grupa de 20 nu ocupă auditoriul de 150 |
| S2 | Sălile rare nu se consumă inutil: un seminar fără calculatoare nu ocupă laboratorul |
| S3 | Puține goluri inutilizabile în programul sălilor (fragmentare; vezi 5.2) |
| ~~S4~~ | *Exclus (D11):* deplasarea între clădiri nu se modelează |
| ~~S5~~ | *Exclus (D12):* preferințele personale ale profesorului nu se iau în considerare; sala se alege după necesitățile grupei și ale disciplinei |
| S6 | Cât mai puține modificări ale rezervărilor existente (stabilitate) |
| S7 | Echitate: aceleași reguli pentru toți; nicio catedră nu e dezavantajată sistematic |

---

## 4. Partea teoretică: cât de grea este problema?

### 4.1 P, NP și ce înseamnă „nu are soluție”

Ideea inițială a autorului a fost formulată ca „o problemă cu P sau NP care nu are soluție”. Ideea e aproape corectă, dar formularea trebuie ajustată:

- **P** e clasa problemelor pentru care se cunoaște un algoritm care găsește *garantat* soluția optimă într-un timp care crește polinomial cu dimensiunea datelor (practic, „rapid și la scară mare”).
- **NP-dificile** sunt problemele pentru care **nu se cunoaște** un astfel de algoritm. Dacă ar exista unul, ar exista pentru toate problemele NP (întrebarea deschisă „P = NP?”).
- Asta **nu** înseamnă că problema „nu are soluție”. Înseamnă că **soluția optimă garantată** poate cere un timp care crește exploziv pe instanțe mari. În practică, problemele NP-dificile se rezolvă foarte bine prin:
  - **metode exacte** (programare liniară în numere întregi, programare cu constrângeri) pe instanțe mici și medii;
  - **euristici și căutare locală** pe instanțe mari, cu soluții foarte bune, fără garanția de optim.
- Separat, o instanță concretă poate fi **infezabilă**: nu există nicio aranjare fără conflicte, de exemplu 6 laboratoare cerute simultan și doar 5 existente. Atunci se caută cea mai bună soluție **parțială**: cât mai multe cereri satisfăcute, după reguli de prioritate explicite. E exact ce ai descris.

### 4.2 Unde e ușor și unde e greu

| Caz | Dificultate | De ce |
|---|---|---|
| Fiecare activitate ocupă **un singur slot**, iar orele sunt fixe | **Ușor** (P) | Pentru fiecare slot, problema devine o **cuplare bipartită** activități ↔ săli compatibile, rezolvabilă exact și rapid |
| Săli identice, activități pe intervale de ore fixe | **Ușor** | Colorarea unui graf de intervale: algoritmul greedy după ora de început este optim [6] |
| Activități pe **mai multe sloturi consecutive** (blocuri), cu săli diferite ca mărime și tip | **Poate fi NP-dificil** | Blocurile leagă sloturile între ele. Carter și Tovey au delimitat cazurile ușoare de cele dificile ale alocării sălilor și au arătat că variante practice sunt NP-complete [5] |
| Se aleg și ziua/perechea (orarul complet) | **NP-dificil** | Rezultat clasic pentru problemele de orar [4] |
| Cererile sosesc una câte una (online), fără cunoașterea viitorului | Fără garanții generale | Niciun algoritm online nu poate garanta în general o apropiere constantă de optim [7]; se evaluează empiric |

**Concluzie pentru proiect.** Cerința de a păstra blocurile în aceeași sală (H7) este exact elementul care face problema interesantă: transformă o problemă ușoară (cuplări pe sloturi) într-una dificilă. Asta justifică euristica proprie, comparația cu soluția exactă și studiul mutărilor.

---

## 5. Cum funcționează algoritmul

Algoritmul are **trei moduri**, care folosesc aceeași verificare a constrângerilor și aceeași funcție de scor.

### 5.1 Modul online: rezervarea din dashboard

Când un profesor trimite o cerere, sistemul răspunde imediat.

```text
INTRARE: cererea r (profesor, grupe, nr. studenți, tip/echipamente, dată sau recurență,
         perechile s..s+k-1, flexibilitate)

1. Validare: date corecte, în orizontul permis, drepturile profesorului.
2. Persoane: profesorul și grupele trebuie să fie libere în TOATE sloturile (H2, H3).
   Altfel → refuz cu motiv (TEACHER_BUSY / GROUP_BUSY) + perechile alternative libere.
3. Candidați: sălile compatibile (H4–H6), libere în TOATE cele k sloturi (H7),
   în TOATE săptămânile recurenței (H1).
4. Dacă există candidați → sala cu scorul minim (5.2); la egalitate, regula stabilă.
5. Dacă nu → REPARARE LOCALĂ (5.3): se caută cel mult M mutări ale unor rezervări
   mutabile care eliberează o sală candidată.
6. Dacă nici așa → refuz explicat + alternative ordonate
   (aceeași sală la altă pereche, altă sală echivalentă în altă zi, alt tip acceptabil).
IEȘIRE: sala aleasă + explicația scorului, sau motivul refuzului + alternativele.
Toate scrierile (rezervarea nouă + eventualele mutări) se fac într-o singură tranzacție.
```

### 5.2 Funcția de scor (strategia C adaptată)

Pentru fiecare sală candidată *c*:

```text
scor(c) = λ1·excedent(c) + λ2·raritate(c) + λ3·fragmentare(c)
```

| Componentă | Ce măsoară | Exemplu |
|---|---|---|
| Excedent | Locuri goale: (capacitate − studenți) / capacitate maximă | 25 de studenți în sala de 30 e mai bine decât în cea de 120 |
| **Raritate** (nou față de TableFlow) | Costul de oportunitate al sălii: cât de cerută este, ca tip și echipamente, de alte activități care chiar au nevoie de ea | Un seminar fără calculatoare nu ocupă laboratorul dacă există o sală de seminar liberă |
| **Fragmentare** | Câte „ferestre” inutilizabile lasă rezervarea în programul zilnic al sălii | Rezervarea perechii 3 într-un laborator liber 2–5 lasă o fereastră izolată de o pereche (2), inutilă pentru laboratoarele de 2 perechi |

Componentele „deplasare” și „preferințe” din versiunea 1.1 au fost eliminate (D11, D12).

**Fragmentarea pe grila de perechi** se poate rafina față de TableFlow: o fereastră liberă de lungime *L* (în perechi) e penalizată în funcție de **cât de probabil va fi cerută** acea lungime pentru tipul respectiv de sală. Pentru laboratoare cerute de obicei în blocuri de 2, o fereastră de 1 pereche e aproape pierdută. Pentru sălile de seminar, aproape orice fereastră rămâne utilă. Această **fragmentare ponderată de profilul cererii** e o direcție de cercetare proprie, care trebuie comparată cu reperele.

Ponderile se calibrează pe date separate și se fixează înaintea evaluării, ca în TableFlow. O alternativă mai ușor de explicat este **ordinea lexicografică**: întâi coeziunea și satisfacerea cererii, apoi numărul de mutări, apoi raritatea, apoi excedentul și fragmentarea.

### 5.3 Mutări și interschimbări: când sunt utile

Utilitatea reorganizărilor era o întrebare deschisă a autorului. Analiza inițială identifică patru situații (de validat):

| Situație | De ce ajută o mutare |
|---|---|
| **Cerere fără sală liberă**, deși ar exista una dacă o rezervare existentă ar trece într-o sală echivalentă | Se acceptă o cerere în plus cu o singură mutare (caz 1, 2, 3) |
| **Blocul nu încape** pentru că o pereche izolată „rupe” o sală liberă în rest | Mutarea perechii izolate reface un bloc continuu (caz 2) |
| **O sală devine indisponibilă** (reparații, examen, eveniment) | Rezervările afectate trebuie realocate cu minimum de schimbări (caz 5) |
| **Consolidare înaintea publicării** orarului săptămânal | Se reduc excedentul și fragmentarea acumulate de deciziile online |

**Reguli de siguranță pentru mutări** (altfel profesorii pierd încrederea în sistem):

- se mută doar rezervările **mutabile**: nu cele fixate (evenimente, examene; D19), nu cele din orizontul „înghețat” (de exemplu, următoarele 48 de ore sau săptămâna publicată);
- doar în săli **cel puțin la fel de potrivite** pentru activitatea mutată, la **aceeași oră**;
- un număr **limitat** de mutări per cerere (de exemplu, M = 2) și o adâncime limitată (A → B → C, nu lanțuri lungi);
- fiecare mutare are o **explicație** și o **notificare**; numărul de mutări e un indicator măsurat.

Problema este cunoscută în literatură ca **problema perturbării minime** (*minimal perturbation problem*): găsirea unei soluții noi cât mai apropiate de cea existentă, după ce datele s-au schimbat. A fost aplicată la orarul real al Universității Purdue [8].

### 5.4 Modul de lot și modul de reparare

- **Lot (planificarea de semestru):** un set de cereri cunoscute simultan (de exemplu, cererile recurente depuse la începutul semestrului) primesc săli împreună. Se poate rezolva:
  - **exact**: un model cu variabile binare *x(activitate, sală)*, constrângeri H1–H8 și obiectiv lexicografic, rezolvat cu un solver CP-SAT sau ILP (de exemplu Google OR-Tools [9]) pe instanțe mici și medii;
  - **euristic**: ordonarea activităților de la cea mai constrânsă la cea mai puțin constrânsă (blocuri lungi, săli rare, grupe mari), alocarea prin scorul din 5.2, apoi căutare locală prin interschimbări.

  Dacă nu există o soluție fără conflicte, rezultatul e **cea mai bună soluție parțială** plus lista activităților nealocate, fiecare cu motivul („nu există laborator ≥ 25 de calculatoare liber marți, perechile 3–4”) și cu alternativele.
- **Reparare:** când apare o perturbare (sală închisă, grupă mărită), se rezolvă doar partea afectată, minimizând mutările.

---

## 6. Cinci cazuri conflictuale

Notație: L = laborator, S = sală de seminar, A = auditoriu; cifra după cratimă e numărul sălii, iar paranteza arată capacitatea sau numărul de calculatoare.

### Cazul 1 — Ultimul laborator, ocupat de o activitate care nu are nevoie de el

**Situație.** Marți, perechea 3. Laboratoare: L-201 (24 de calculatoare, liber) și L-105 (16 calculatoare), ocupat de un **seminar** al prof. C (15 studenți, fără nevoie de calculatoare). Sala de seminar S-12 (30 de locuri) e liberă.
Sosesc pe rând: prof. B cere un laborator pentru 14 studenți, apoi prof. A pentru 22 de studenți.

**Conflict.** B primește singurul laborator liber, L-201. A nu mai are niciun laborator cu ≥ 22 de calculatoare.

**Ce face algoritmul.**
- *Preventiv:* componenta de raritate ar fi împiedicat alocarea seminarului lui C în L-105, dacă S-12 era liberă atunci.
- *La sosirea lui A:* reparare locală:
  1. seminarul lui C trece în S-12 (sală potrivită, aceeași oră);
  2. B trece în L-105 (16 ≥ 14);
  3. A primește L-201.

  Dacă rezervarea lui B nu e mutabilă (de exemplu, e în orizontul înghețat), mutarea lui C nu ajută (L-105 are doar 16 < 22 calculatoare), deci A e refuzat, cu alternative (alt laborator la perechea 4, altă zi).

**Rezultat așteptat.** Toate cele trei activități au loc, cu 2 mutări explicate; fără reparare, una din trei ar fi refuzată.

### Cazul 2 — Blocul de 3 perechi „rupt” de o pereche izolată

**Situație.** Joi, prof. D cere un laborator pentru 3 perechi consecutive (2–4), 18 studenți. L-201 e liber la perechile 2 și 3, dar perechea 4 e ocupată de prof. E (o singură pereche, 10 studenți). L-105 (16 calculatoare) e liber la perechea 4.

**Conflict.** Niciun laborator nu e liber la toate cele 3 perechi. Fără regula H7, D ar fi împărțit între două săli, cu mutarea studenților în mijlocul activității.

**Ce face algoritmul.** Mută rezervarea lui E în L-105 (16 ≥ 10, aceeași oră), apoi alocă blocul 2–4 lui D în L-201. Dacă rezervarea lui E nu e mutabilă, oferă lui D: același bloc în altă zi; sau, ca ultimă opțiune, 2 + 1 perechi în săli diferite, **doar cu acordul explicit al lui D** (D20).

**Rezultat așteptat.** Blocul rămâne întreg, cu o mutare.

### Cazul 3 — Auditoriul mare ocupat de o grupă mică

**Situație.** Luni, perechea 2. Singurul auditoriu cu ≥ 110 locuri este A-1 (120), rezervat cu o săptămână înainte pentru un seminar de 25 de studenți (atunci nu exista altă sală liberă). Între timp s-a eliberat S-12 (30 de locuri). Acum se cere o prelegere pe flux cu 110 studenți.

**Conflict.** Fluxul nu încape nicăieri altundeva, iar grupa mică ocupă resursa cea mai rară.

**Ce face algoritmul.** Compară **flexibilitatea**: grupa de 25 are alternative, fluxul nu. Mută seminarul în S-12 (excedent 5 în loc de 95) și alocă A-1 fluxului. Regula „se mută activitatea cu mai multe alternative” este explicită și aceeași pentru toți.

**Rezultat așteptat.** Ambele activități au loc; excedentul total scade de la 95 la 15 locuri.

### Cazul 4 — Conflict de persoane, nu de săli

**Situație.** Miercuri, perechea 2. Prof. F cere o sală pentru recuperarea unui seminar cu grupa TI-231. Există săli libere, dar TI-231 are deja laborator la perechea 2 (subgrupa 1 în L-201, subgrupa 2 în L-105).

**Conflict.** Sala nu e problema: grupa este ocupată (H3), conform rezervărilor existente.

**Ce face algoritmul.** Refuză cu motivul `GROUP_BUSY` și precizează cu ce activitate se suprapune. Caută perechile la care **atât** profesorul, **cât și** grupa sunt liberi, și le propune ordonate după apropierea de perechea cerută (aceeași zi întâi). Verifică și ierarhia grupelor: două subgrupe disjuncte în paralel sunt permise, dar grupa întreagă nu poate fi în paralel cu propriile subgrupe.

**Rezultat așteptat.** Nicio rezervare imposibilă de respectat, cu alternative utile în loc de un simplu „indisponibil”.

### Cazul 5 — Sală indisponibilă în timpul semestrului (reparare)

**Situație.** L-201 se închide 2 săptămâni pentru reparații. Sunt afectate 9 rezervări, dintre care 2 blocuri de câte 2 perechi și 1 rezervare recurentă săptămânală. Laboratoarele rămase sunt parțial ocupate.

**Conflict.** Nu toate activitățile încap în laboratoarele rămase, la aceleași ore.

**Ce face algoritmul (perturbare minimă).**
1. Închiderea pentru reparații anulează fixarea rezervărilor afectate (D19); toate se realocă. Pentru fiecare activitate afectată, încearcă întâi **aceeași oră, altă sală echivalentă**, începând cu blocurile (cele mai constrânse).
2. Folosește mutări ale rezervărilor neafectate, dar mutabile, dacă eliberează săli (cu limitele din 5.3).
3. Ce rămâne nerezolvat primește variante de altă pereche sau altă zi, ce trebuie confirmate de profesor.
4. Generează un raport: câte activități au rămas la aceeași oră, câte s-au mutat, câte necesită decizie umană și de ce.

**Rezultat așteptat.** Majoritatea activităților rămân la aceeași oră; schimbările sunt minime, explicate și notificate. Numărul de mutări și numărul de activități nerezolvate sunt indicatori de evaluare.

**Caz suplimentar de luat în considerare:** săptămânile pare și impare. Două activități bisăptămânale pot împărți aceeași sală în săptămâni alternante. Un algoritm care le „împerechează” reduce fragmentarea în dimensiunea săptămânii, analog cu golurile din zi.

---

## 7. Ce se poate studia (componenta de cercetare)

| Întrebare de cercetare | Comparație |
|---|---|
| Î1. Cât contează scorul cu raritate și fragmentare față de best-fit simplu, în modul online? | A (first-fit) vs B (best-fit) vs C (scor complet), pe aceleași fluxuri de cereri |
| Î2. Care este valoarea mutărilor? Câte cereri în plus se acceptă per mutare? | C fără reparare vs C cu M = 1, 2, 3 mutări |
| Î3. Cât pierde decizia online față de planificarea globală? | Online vs soluția exactă (CP-SAT/ILP) cu toate cererile cunoscute dinainte, pe instanțe mici |
| Î4. Cât costă în timp de calcul? | Mediană și p95 per cerere; timpul solverului exact în funcție de dimensiune |

**Indicatori:**
- cereri satisfăcute (total și pe tip de sală);
- blocuri păstrate întregi;
- locuri neutilizate;
- ore de săli rare consumate de activități care nu au nevoie de ele;
- fragmentarea programului sălilor;
- numărul de mutări;
- numărul de conflicte rămase (trebuie să fie zero pentru constrângerile obligatorii);
- timpul de calcul.

**Date:** generator sintetic cu seed, calibrat pe structura reală a unei facultăți (număr de săli pe tipuri, grupe, încărcare pe zile), dar fără date personale. Protocolul statistic rămâne cel din TableFlow: comparații pereche pe aceleași seed-uri, intervale de încredere și seed-uri separate pentru calibrare.

---

## 8. Remarci și recomandări

1. **Nu construi automat orarul complet.** Orarul afișat rezultă din rezervări; alegerea automată a orelor pentru toate cursurile rămâne în afara scopului (secțiunea 2). E diferența dintre un proiect fezabil și unul fără sfârșit.
2. **Coeziunea blocului e „ideea-semnătură”.** E ușor de explicat, utilă practic și exact elementul care face problema teoretic dificilă (secțiunea 4.2). Merită pusă în centrul prezentării.
3. **Mutările au nevoie de reguli sociale, nu doar matematice.** Cine are dreptul să fie mutat, cu cât timp înainte, cine aprobă? Merită discutate, la un moment dat, cu cei care fac astăzi aceste alocări manual (de exemplu, secretariatul sau decanatul).
4. **Prioritățile trebuie să fie explicite și egale pentru toți.** Exemplu: „activitatea cu mai puține alternative are prioritate”, nu „profesorul cu funcție mai mare”. Altfel algoritmul pare arbitrar.
5. **Rezervări neutilizate.** Sălile rezervate și nefolosite sunt echivalentul neprezentărilor din restaurante. O confirmare simplă (de exemplu, anularea automată dacă rezervarea ad-hoc nu e confirmată cu 24 de ore înainte) poate fi o extensie.
6. **Calendarul academic** (sărbători, sesiune, săptămâni pare/impare, recuperări) trebuie modelat de la început. E o sursă frecventă de conflicte.
7. **Date personale:** orarul cu nume de profesori și grupe e informație internă. În demo și în experimente se folosesc date fictive sau anonimizate.
8. **Refolosește din TableFlow:**
   - mediul Docker și PostgreSQL;
   - constrângerile de excludere pe intervale (rezervarea unei săli pe sloturi e exact același tip de constrângere);
   - tranzacțiile cu lacăt, idempotența;
   - motorul pur, testat separat;
   - simulatorul cu seed;
   - organizarea documentelor (`CLAUDE.md`, `decisions.md`, `handoff.md`).

   Proiectul nou poate porni dintr-o copie a structurii, nu de la zero.
9. **Validare cu utilizatori reali.** Câteva sesiuni de testare cu 2–3 profesori și cu secretariatul pot transforma lucrarea dintr-un exercițiu tehnic într-un rezultat aplicabil.
10. **Analiza literaturii trebuie făcută înainte de a afirma noutatea.** Alocarea sălilor e foarte studiată [1, 2, 5, 8]. Contribuția plauzibilă stă în **combinația** dintre decizia online, coeziunea blocurilor, raritatea sălilor, fragmentarea ponderată de cerere și reparația cu mutări limitate, evaluată reproductibil.

---

## 9. Pașii următori propuși

1. Confirmarea scopului (secțiunea 2) și a constrângerilor H1–H8 pe exemple concrete.
2. Stabilirea grilei de perechi, a tipurilor de săli și a regulilor de prioritate.
3. Dezvoltare în „felii verticale”, ca rezultatul să fie vizibil de la început (propunere, de stabilit în planificare):
   1. **motorul + o vizualizare simplă**: grila săli × perechi pe o zi, unde se văd rezervările, decizia algoritmului și explicația ei; cazurile 1–5 devin teste automate și scenarii demonstrative;
   2. **back-end**: baza de date cu constrângerile împotriva suprapunerilor (sală, profesor, grupă), API-ul de rezervare, tranzacții și concurență;
   3. **dashboard-ul de rezervare** legat de API, care refolosește grila din pasul 1;
   4. **panoul/orarul** pentru studenți;
   5. **simulatorul și experimentele** (comparații între strategii, valoarea mutărilor).
4. Grila vizuală din pasul 3.1 servește și ca material pentru coordonator: aceleași 5 cazuri, „înainte” și „după” decizia algoritmului.

---

## Bibliografie

1. Schaerf, A. (1999). A survey of automated timetabling. *Artificial Intelligence Review*, 13(2), 87–127.
2. Kolen, A. W. J., Lenstra, J. K., Papadimitriou, C. H., Spieksma, F. C. R. (2007). Interval scheduling: A survey. *Naval Research Logistics*, 54(5), 530–543. https://doi.org/10.1002/nav.20231
3. Kovalyov, M. Y., Ng, C. T., Cheng, T. C. E. (2007). Fixed interval scheduling: Models, applications, computational complexity and algorithms. *European Journal of Operational Research*.
4. Even, S., Itai, A., Shamir, A. (1976). On the complexity of timetable and multicommodity flow problems. *SIAM Journal on Computing*, 5(4), 691–703. https://doi.org/10.1137/0205048 (versiune preliminară: FOCS 1975, 184–193)
5. Carter, M. W., Tovey, C. A. (1992). When is the classroom assignment problem hard? *Operations Research*, 40(1-supplement-1), S28–S39. https://doi.org/10.1287/opre.40.1.S28
6. Rezultat clasic de teoria grafurilor: grafurile de intervale sunt perfecte, iar colorarea greedy după capătul stâng este optimă; vezi, de exemplu, secțiunile introductive din [2].
7. Lipton, R. J., Tomkins, A. (1994). Online interval scheduling. *Proceedings of the ACM-SIAM Symposium on Discrete Algorithms (SODA)*.
8. Müller, T., Rudová, H., Barták, R. (2005). Minimal Perturbation Problem in Course Timetabling. *Practice and Theory of Automated Timetabling V (PATAT 2004)*, LNCS 3616, Springer. https://doi.org/10.1007/11593577_8
9. Google OR-Tools — CP-SAT Solver. https://developers.google.com/optimization/cp/cp_solver
