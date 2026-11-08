# Feedback-ul coordonatorului de practică și analiza lui

**Data:** 8 noiembrie 2026. **Sursa:** observațiile coordonatorului la `descriere-tema.md`, transmise de autor.
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
