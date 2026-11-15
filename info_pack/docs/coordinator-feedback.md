# Feedback-ul coordonatorului de practică și analiza lui

**Data:** 8 noiembrie 2026. **Sursa:** observațiile coordonatorului la `descriere-tema.md` (copie în `Claude outputs/`), transmise de autor.
Statutul se ține în `decisions.md`: D23 (V0 întâi), P11–P15 (confirmate la 08.11.2026), D24 (date sintetice în V0, ITC 2019 ca validare ulterioară). Acest document păstrează contextul și răspunsurile.

## 1. Observațiile coordonatorului (rezumat fidel)

1. Cum ar fi implementat algoritmul? Au fost încercate ipoteze în cod? Dorește ceva mai palpabil: simulări pe un eșantion mai mic, „dar ceva real”.
2. Cum s-ar putea integra sistemul în ASEM? Actorii, interfețele etc.
3. Idei:
   - profesorii își înregistrează intervale de timp liber pentru algoritm;
   - integrarea cu Google Calendar, ca să fie ușor pentru studenți și profesori;
   - pentru profesori nu e atât de importantă locația sălii, cât să fie destul loc, timpul potrivit și ecran/proiector sau tablă;
   - algoritmii de planificare sunt costisitori computațional; realist este să se preia algoritmi asemănători și să se adapteze; e nevoie de o cercetare mai detaliată.

Propunerea autorului (08.11.2026): întâi o **versiune simplă a produsului, cu algoritmul funcțional** (cel puțin partea principală), ca funcționarea și rezultatele să fie vizibile devreme; apoi se decide cum se dezvoltă versiunea matură (D23).

## 2. Răspunsuri

### 2.1 Implementarea algoritmului și simulările

**Starea reală:** încă nu există cod. Proiectul a început cu delimitarea problemei și a regulilor (06–08.11.2026), ca simulările să compare ceva bine definit. Primul pas de dezvoltare (V0, D23) produce exact ce cere coordonatorul: motorul funcțional și simulări pe instanțe mici.

**Cum funcționează (modul online, pentru fiecare cerere):**

1. verifică dacă profesorul și grupa (unitățile atomice, D21) sunt libere în toate perechile cerute;
2. filtrează sălile compatibile: capacitate, tip, echipamente, libere în toate perechile blocului;
3. dacă există candidați, alege sala cu cel mai bun scor: locuri goale puține (excedent), fără consumul inutil al sălilor rare (raritate), fără goluri inutilizabile (fragmentare);
4. dacă nu există, încearcă cel mult M mutări ale rezervărilor mutabile (doar altă sală, la aceeași oră) care eliberează o sală;
5. altfel, refuză cererea, cu motivul și alternativele (altă pereche, altă zi); alternativele nu se aplică automat (D18).

**Exemplu calculat de mână** (ilustrare a mecanismului, nu rezultat experimental). Marți, perechea 3, cinci săli: A-1 (auditoriu, 120), S-12 (seminar, 30), S-14 (seminar, 25), L-201 (laborator, 24 de calculatoare), L-105 (laborator, 16 calculatoare). Un seminar se poate ține în orice sală cu locuri suficiente; un laborator, doar într-un laborator cu destule calculatoare; un curs pe flux, doar în auditoriu. Cererile sosesc în ordine:

| Cerere | Tip | Studenți |
|---|---|---|
| r1 | seminar | 20 |
| r2 | laborator | 22 |
| r3 | seminar | 28 |
| r4 | curs pe flux | 100 |
| r5 | laborator | 14 |

| Strategie | r1 | r2 | r3 | r4 | r5 | Acceptate |
|---|---|---|---|---|---|---|
| Prima sală liberă (ordinea listei) | A-1 | L-201 | S-12 | **refuz** (A-1 ocupat) | L-105 | 4/5 |
| Best-fit (cele mai puține locuri goale) | L-201 (excedent 4) | **refuz** (L-105 are doar 16 calculatoare) | S-12 | A-1 | L-105 | 4/5 |
| Scor cu raritate | S-14 (laboratorul e păstrat) | L-201 | S-12 | A-1 | L-105 | 5/5 |
| Best-fit + reparare (M = 1) | L-201 | r1 mutat în S-14, r2 în L-201 | S-12 | A-1 | L-105 | 5/5, cu 1 mutare |

Exemplul arată de ce proiectul compară strategii: alegerea „evidentă” greșește în moduri diferite, iar prevenirea (raritatea) și repararea (mutarea) ajung la același rezultat pe căi diferite. Cât de des se întâmplă asta pe date mai mari se află doar prin simulare (Î1, Î2), nu se presupune.

**„Ceva real”:** proiectul folosește date sintetice (D08), dar există o sursă publică de date reale anonimizate: instanțele competiției ITC 2019, colectate din sistemul UniTime de la 11 instituții. Ele descriu orarul complet (oră + sală), deci ar trebui adaptate: orele se fixează și se păstrează doar problema alocării sălilor. Decizia: D24 — sintetice în V0, ITC 2019 ca validare ulterioară.

### 2.2 Integrarea în ASEM (scenariu descriptiv)

Prioritatea proiectului este algoritmul (D14), deci integrarea se descrie ca arhitectură și scenariu; se implementează doar punctele ieftine (P15).

| Actor | Ce face |
|---|---|
| Profesor | Trimite cereri (activitate, grupe, perechi, cerințe), primește decizia cu explicație, confirmă sau respinge alternativele și eventualele ruperi de bloc |
| Student | Consultă orarul grupei / subgrupei (panou, calendar) |
| Administrator (serviciul care gestionează sălile) | Întreține sălile, echipamentele, grila, calendarul academic; închide săli (reparații); fixează evenimentele și examenele (D19) |
| Algoritmul | Alocă, repară, explică; nu decide singur schimbări de oră |

| Interfață | Rol |
|---|---|
| Dashboard web de rezervare | Profesorii |
| Panou/orar web | Studenții |
| Import CSV (săli, grupe, orarul existent) | Preluarea datelor din evidențele existente ale universității |
| Export iCalendar (.ics) per grupă / profesor | Abonare din Google Calendar, Outlook, telefon (P12) |
| Autentificare instituțională (SSO) | Punct de integrare descris, neimplementat în prima versiune |

**Scenariu realist de pilot:** orarul oficial existent se importă ca rezervări existente; sistemul gestionează **rezervările suplimentare** (recuperări, consultații, ședințe, evenimente) și **reparațiile** (o sală închisă). Așa sistemul aduce valoare fără să înlocuiască procesul actual de întocmire a orarului.

### 2.3 Ideile coordonatorului

| Idee | Analiză | Statut |
|---|---|---|
| Intervale libere ale profesorilor | Transformă cererea din „perechea X” în „oricare dintre perechile acceptabile”: algoritmul alege și ora, nu doar sala. Asta apropie problema de orarul complet (mai dificil). Compatibil cu modul lot și cu alternativele, ca extensie după V0 | P11 (confirmat) |
| Google Calendar | Varianta ieftină și sigură: export iCalendar (.ics), la care se abonează Google Calendar. Sincronizarea în ambele sensuri (citirea calendarelor personale) ridică probleme de acces și confidențialitate; exclusă inițial | P12 (confirmat) |
| Locul contează mai puțin decât spațiul, ora și echipamentul | Confirmă D11 și D12. Precizează lista minimă de echipamente: calculatoare (număr), proiector/ecran, tablă | P13 (confirmat) |
| Algoritmi costisitori; adaptare; research | De acord, cu o nuanță: orarul complet este NP-dificil, dar subproblema proiectului (sala pentru o oră fixată, la scara unei facultăți, cu zeci de săli) este mică per cerere. Costul real apare la modul lot și la reparațiile mari. Literatura conține deja aproape toate componentele: UniTime folosește perturbarea minimă și caută schimbări care nu afectează mai mult de două alte activități. Contribuția trebuie deci formulată ca **adaptare și evaluare**, nu ca algoritm nou, până la analiza literaturii | P14 (confirmat) |

## 3. Repere pentru analiza literaturii (P14)

- UniTime: sistem open source de orar universitar (Purdue), cu solver de perturbare minimă și căutare interactivă de alternative.
- ITC 2019: competiție internațională cu instanțe reale de orar universitar, colectate din UniTime (Müller, Rudová, Müllerová).
- Phillips et al. (2017), *Integer programming for minimal perturbation problems in university course timetabling*, Annals of Operations Research 252, 283–304; lucrări înrudite ale aceluiași grup despre alocarea sălilor prin programare în numere întregi.
- Carter & Tovey (1992), complexitatea alocării sălilor; Müller, Rudová, Barták (2005), problema perturbării minime.
- Bernstein, Holm, Rotenberg (2019): potrivire bipartită online cu înlocuiri (fundament teoretic pentru mutări).

---

## 4. A doua discuție cu coordonatorul (raportată de autor la 14.11.2026)

**Context:** autorul a prezentat coordonatorului demo-ul V0 și materialele; **proiectul a fost acceptat**. Din discuție au rezultat două idei pentru versiunea următoare. Decizia despre forma V1 se ia mai târziu, după clarificarea obiectivelor (autor, 14.11.2026). Statutul: P16 și P17 confirmate, cu precizările din **D28** (date reale) și **D29** (ferestre) în `decisions.md`; analiza de mai jos a precedat deciziile.

### 4.1 Date reale despre structura universității (P16)

**Ideea:** versiunea următoare să folosească structura reală: numărul, denumirea și configurația sălilor (cabinetelor), profesorii.

**Analiză:**
- Schimbă D08 („nu se pornește de la un orar real”), D24 (sintetice în V0) și regula din `CLAUDE.md` („Folosește date fictive”). Nu se aplică până nu decide autorul.
- **Sălile, grupele și mărimile lor nu sunt date personale**; numele profesorilor sunt (Legea nr. 133/2011, `literature.md` §8). Propunere: structura reală se folosește, profesorii se **pseudonimizează** în repository (de ex. `P-017`), iar corespondența, dacă e necesară, rămâne în afara Git.
- Datele reale nu înlocuiesc complet datele sintetice: experimentele au nevoie de multe instanțe reproductibile (seed-uri) și de niveluri de încărcare controlate. Propunere: **structura reală** (săli, grupe) + **orarul real ca rezervări existente** (scenariul de pilot P15) + **cereri suplimentare** sintetice pentru experimente; ITC 2019 rămâne validarea externă (D24).
- Necesită: sursa datelor, permisiunea, formatul (de exemplu un export CSV/Excel), o etapă de import și de validare (capacități, tipuri, echipamente — P13).

### 4.2 Reducerea „ferestrelor” din orarul studenților (P17)

**Ideea:** dacă profesorul indică un interval de timp (P11) — la o cerere sau pentru planificarea semestrului — algoritmul să aleagă perechea astfel încât grupa să nu aibă ore libere între perechi (de exemplu, să nu aștepte între perechea 1 și perechea 4), sau cel puțin să aibă cât mai puține. Criteriul este în favoarea studenților și se evaluează pe ordinea perechilor fiecărei grupe.

**Analiză:**
1. **Ferestrele se decid la alegerea orei, nu a sălii.** Motorul V0 primește perechea fixată și alege doar sala, deci nu poate reduce ferestrele. Ideea cere ca cererea să aibă mai multe perechi acceptabile (intervalul profesorului, P11) și ca motorul să aleagă și perechea. Aceasta este o temă cunoscută a orarului complet (*curriculum compactness*, *Limit Idle Times*, `MaxBreaks`; `literature.md` §6).
2. **Definiția măsurii (de stabilit, O17).** Propunere: pentru fiecare **unitate atomică** (subgrupa sau grupa fără subgrupe, D21) și fiecare zi, fereastra = perechile libere dintre prima și ultima activitate a zilei; activitățile fluxului și ale grupei contează pentru toate subgrupele lor. Indicatorul total = suma ferestrelor, eventual ponderată cu numărul de studenți. Subtilitate: dacă subgrupele au laborator la perechi diferite (subgrupa 1 la perechea 2, subgrupa 2 la perechea 3) și grupa are seminar la 1 și 4, fiecare subgrupă are o fereastră, deși grupa „în ansamblu” nu pare să aibă.
3. **Două variante, cu scop foarte diferit (O19):**
   - **(a) Online, per cerere** — extensie naturală a motorului: cererea vine cu un interval (de exemplu, perechile 2–5 marți); pentru fiecare start posibil se verifică persoanele, se calculează variația ferestrelor pentru unitățile afectate, apoi se caută sala (cu ≤ M mutări, ca acum). Exemplu: grupa are deja perechile 1 și 2, profesorul acceptă 3–5 → perechea 3 (nicio fereastră nouă) e preferată perechii 5 (două ferestre). Costul de calcul crește doar cu numărul de starturi posibile (cel mult 7).
   - **(b) Planificarea semestrului din intervalele profesorilor** — înseamnă construirea orarului complet (problemă NP-dificilă, literatura CB-CTT / ITC); este în afara scopului actual (P01) și ar necesita și recurența (D16) și un solver (P08). Poate fi tratată ca **comparație**: decizia online (a) față de soluția offline exactă pe instanțe mici (Î3).
4. **Locul criteriului în „cea mai bună variantă” (O18).** Propunere de discutat: valid → ferestrele studenților → mutări → scorul sălii (raritate, excedent, fragmentare). Alternativ: mutări înaintea ferestrelor. Ambele se pot compara în simulator.
5. **Ce rămâne neschimbat:** orele rezervărilor existente nu se mută niciodată automat (mutările schimbă doar sala, D18); ferestrele profesorilor sunt cel mult un criteriu secundar (O20), conform ideii coordonatorului (în favoarea studenților).
6. **Primul pas, înaintea oricărei schimbări de algoritm:** adăugarea indicatorului „ferestre pe unitate atomică” în simulator și în raport, ca situația de bază să fie măsurată.
