# Registrul deciziilor — RoomAllocation

Actualizat: 8 noiembrie 2026 (a doua actualizare). Registrul arată statutul afirmațiilor; nu conține rezultate de implementare (vezi `results.md`) și nici istoric (vezi `journal.md`).

## Confirmate de autor

| ID | Decizie | Context |
|---|---|---|
| D01 | Proiect nou, separat de TableFlow, cu aceeași abordare de lucru | Motiv: rezervarea meselor era greu de explicat și de prezentat astfel încât algoritmul să fie clar |
| D02 | Domeniul: rezervarea sălilor într-o universitate; **algoritmul de alocare este elementul central** | Se studiază proprietățile algoritmului și realizarea lui |
| D03 | Utilizatori: profesorii rezervă săli dintr-un dashboard; studenții consultă un orar/panou | — |
| D04 | O pereche durează 90 de minute; pauza dintre perechi este de 10 minute | Grila exactă: D15 |
| D05 | Criteriile de rezervare includ: data, ora/perechea, capacitatea, tipul de sală (laborator, auditoriu sau tipuri similare) | Lista minimă de echipamente: P13 |
| D06 | Perechile consecutive ale aceluiași profesor, cerute împreună, rămân în **aceeași sală** | Coeziunea blocului; vezi H7 în concept și D20 |
| D07 | La conflicte, algoritmul caută varianta fără conflicte; dacă nu există, **cea mai bună variantă posibilă** | Definiția: D18 |
| D08 | **Nu** se pornește de la un orar real cu date fixe (date, ore, grupe, profesori); se folosesc date sintetice | 06.11.2026 |
| D09 | Componentele: algoritmul (motorul), dashboard-ul de rezervare și panoul/orarul rezervărilor (grupă, sală, oră, pereche, profesor). **Ordinea de dezvoltare nu este impusă**: se alege una eficientă, care arată vizual devreme cum funcționează algoritmul și acoperă și back-end-ul | 06.11.2026 |
| D10 | Numele proiectului: **RoomAllocation**; folderul rădăcină: `room-allocation/` | 08.11.2026; închide O07 |
| D11 | **Deplasarea nu intră în scop:** schimbarea clădirii, posibilitatea și timpul de deplasare între clădiri nu se modelează și nu intră în scor | 08.11.2026; motiv: îngreunează soluționarea fără beneficiu proporțional. Elimină S4 și componenta „deplasare” din scor; închide O05 |
| D12 | **Preferințele personale ale profesorilor nu se iau în considerare** (sala sau clădirea preferată). Sala se alege doar după necesitățile grupei și ale disciplinei: capacitate, tip, echipamente | 08.11.2026. Elimină S5 și componenta „preferințe” din scor |
| D13 | RoomAllocation este **lucrarea principală** prezentată în cadrul universității; termenul rămâne cel stabilit anterior | 08.11.2026; închide O01 |
| D14 | Prioritatea: **valoarea științifică a algoritmului** (eficiență, contribuție), nu utilizarea comercială a produsului | 08.11.2026; închide O02 |
| D15 | Grila perechilor din concept §3.1 este confirmată: 7 perechi, 08:00–19:30, fără pauză lungă de masă | 08.11.2026; corespunde orarului real; închide O03 |
| D16 | Recurența (săptămânală, pe săptămâni pare/impare) este necesară ca **opțiune**, dar se implementează mai târziu, într-o versiune mai solidă. Primele versiuni lucrează cu rezervări pe o singură dată; modelul nu trebuie să împiedice adăugarea ei | 08.11.2026; închide O04 |
| D17 | Disponibilitatea săptămânală nu este stabilă; planul nu se dimensionează pe ore/săptămână, ci pe etape mici, încheiate | 08.11.2026; închide O08 |
| D18 | **Definiția „celei mai bune variante”** (ierarhie lexicografică): (0) constrângerile obligatorii H1–H8 nu se încalcă niciodată; (1) online: dintre planurile valide (alocarea cererii + cel mult M mutări ale rezervărilor mutabile, doar schimbare de sală, la aceeași oră, blocul mutat întreg) se alege cel cu cele mai puține mutări, apoi cel cu scorul cel mai bun (excedent, raritate, fragmentare); departajare deterministă; (2) dacă nu există plan valid: refuz motivat + alternative **propuse, neaplicate automat** (altă pereche, altă zi, alt tip acceptabil), ordonate după apropierea de cererea inițială; (3) lot: perechi satisfăcute, apoi cereri satisfăcute (D22), apoi blocuri rupte, apoi mutări față de starea existentă, apoi scorul | 08.11.2026; închide O09 |
| D19 | **Fixarea:** se pot fixa **doar** rezervările pentru evenimente sau examene; o rezervare fixată nu se mută. Dacă sala se închide pentru reparații, fixarea rezervărilor afectate se anulează, iar algoritmul le realocă într-o sală corespunzătoare. Orizontul înghețat (P04) rămâne un mecanism separat pentru rezervările obișnuite. Rezervarea fixată, realocată după închidere, **rămâne fixată în sala nouă** (confirmat 08.11.2026) | 08.11.2026; închide O11 |
| D20 | **Blocul:** H7 este obligatoriu implicit; scopul principal este ca algoritmul să găsească soluția prin mutări. Ruperea blocului în săli diferite este doar o opțiune propusă la final, aplicată numai cu acordul profesorului | 08.11.2026; închide O12 |
| D21 | **Fluxuri, grupe, subgrupe:** (1) ierarhie pe trei niveluri flux → grupă → subgrupă, cu o singură împărțire pe grupă; grupele fără subgrupe sunt permise; (2) numărul de studenți se declară doar pe unitatea cea mai mică, restul se calculează; (3) numărul de studenți al cererii se deduce din unitățile selectate; excepții declarate (recuperare parțială, activitate fără grupă), ≤ mărimea unităților; (4) H3 se verifică prin unități atomice (subgrupa sau grupa fără subgrupe), în motor și în baza de date; (5) împărțirile multiple ale unei grupe, cursurile opționale și grupele mixte rămân în afara primei versiuni | 08.11.2026; închide O06. Consecință: subgrupele în paralel sunt cereri separate (două săli, doi profesori) |
| D22 | **Criteriul modului lot:** se maximizează întâi numărul de **perechi** satisfăcute, iar la egalitate numărul de **cereri** satisfăcute; urmează ordinea din D18 (blocuri rupte, mutări, scor). Numărul de cereri și perechi × studenți se raportează ca indicatori în experimente | 08.11.2026; închide O10. Motiv: numărul de cereri dezavantajează blocurile, iar perechi × studenți dezavantajează grupele mici (S7) |
| D23 | **Întâi o versiune simplă (V0) cu algoritmul funcțional** (cel puțin partea principală), ca funcționarea și rezultatele să fie vizibile devreme; apoi se decide forma versiunii mature | 08.11.2026; după feedback-ul coordonatorului (`coordinator-feedback.md`). Conținutul exact al V0 se fixează în `plan.md` |
| D24 | **Datele:** V0 folosește date sintetice (generator cu seed, calibrat pe structura unei facultăți); instanțele reale anonimizate ITC 2019, adaptate la alocarea sălilor cu orele fixate, servesc ca validare ulterioară | 08.11.2026; închide O13; completează D08 |
| D25 | **Scorul în V0 este lexicografic:** raritate, apoi excedent, apoi fragmentare simplă (ferestre izolate de o pereche); fără ponderi de calibrat. Varianta ponderată și fragmentarea ponderată de cerere (P03) se compară în V1 | 08.11.2026 |
| D26 | **Demo-ul V0 este static, fără framework** (pagină HTML + motorul împachetat); Next.js intră abia în V1 (P07) | 08.11.2026 |
| D27 | Mediul pe Mac (verificat de autor, 08.11.2026): Node 24.22.1, Docker 29.9.2, Git 2.51.0. V0 rulează local cu Node, fără containere; Docker și PostgreSQL intră în V1 | 08.11.2026 |

## Propuneri confirmate (08.11.2026)

Propunerile din concept, confirmate de autor cu precizările de mai jos. Detaliile marcate în ultima coloană rămân de stabilit în planificare.

| ID | Propunere confirmată | Rămâne de precizat |
|---|---|---|
| P01 | Scop: rezervări individuale online (nucleu) + mod „lot” + mod de reparare; fără orar complet automat | Delimitarea „alternativelor” (altă pereche/zi) față de construirea orarului |
| P02 | Constrângerile obligatorii H1–H8 și preferințele S1–S7, **fără S4 și S5** (D11, D12) | Validare pe exemple concrete; H8 precizat de D19, H7 de D20 |
| P03 | Funcția de scor: excedent + raritatea sălii + fragmentare ponderată de cerere (fără deplasare și preferințe, D11, D12) | Formula, ponderile sau ordinea lexicografică; calibrare (concept §5.2) |
| P04 | Mutări/interschimbări limitate (de exemplu, max. 2 per cerere), doar pentru rezervări mutabile, cu orizont înghețat și notificare | Valoarea M, orizontul înghețat; utilitatea se măsoară (Î2), nu se presupune |
| P05 | Prioritate explicită și egală pentru toți: de exemplu, „se mută activitatea cu mai multe alternative” | Definiția „alternativelor”; criteriul lot: D22 |
| P06 | Componenta de cercetare: comparații first-fit / best-fit / scor complet, valoarea mutărilor, online vs. optim exact | Analiza literaturii înaintea afirmării noutății |
| P07 | Preluarea stackului și a practicilor din TableFlow (Next.js, TypeScript, PostgreSQL, Docker, teste pe BD reală) | Versiunile se aleg și se fixează în ziua instalării; mediul se verifică pe Mac |
| P08 | Solver exact (de exemplu OR-Tools CP-SAT) pentru modul lot și pentru comparația cu optimul pe instanțe mici | Momentul introducerii și integrarea cu stackul |
| P09 | Roluri: student (vizualizare), profesor (rezervare), administrator (săli, grilă, calendar, aprobări) | Dacă rezervările profesorilor necesită aprobare |
| P10 | Dezvoltare în „felii verticale”: (1) motor + vizualizare simplă a grilei săli × perechi, pe care se văd deciziile și cazurile 1–5; (2) bază de date, constrângeri și API; (3) dashboard-ul de rezervare legat de API; (4) panoul/orarul; (5) simulator și experimente | Direcția este confirmată; structura feliilor se poate ajusta pe parcurs |

## Propuneri din feedback-ul coordonatorului — confirmate de autor (08.11.2026)

| ID | Propunere confirmată | Rămâne de precizat |
|---|---|---|
| P11 | Profesorii declară intervalele libere; cererea poate avea mai multe perechi acceptabile, iar algoritmul alege și ora, nu doar sala | Extensie după V0 (modul lot, alternative); apropie problema de orarul complet |
| P12 | Export iCalendar (.ics) per grupă / subgrupă / profesor, compatibil cu Google Calendar; fără sincronizare bidirecțională | După panou; sincronizarea bidirecțională exclusă inițial |
| P13 | Lista minimă de echipamente: număr de calculatoare, proiector/ecran, tablă | Confirmarea listei (completează D05) |
| P14 | Analiza literaturii ca sarcină explicită, în paralel cu V0 și înaintea oricărei afirmații de contribuție: UniTime, ITC 2019, Phillips et al., Carter & Tovey, Müller et al., online matching cu înlocuiri | Profunzimea; contribuția se formulează ca adaptare + evaluare până la concluziile analizei |
| P15 | Integrarea în ASEM ca scenariu descris (actori, interfețe, pilot pentru rezervări suplimentare și reparații peste orarul existent); se implementează doar importul CSV și exportul iCalendar | Confirmarea scenariului |

## Deschise — de clarificat

| ID | Întrebare |
|---|---|
| — | Nicio întrebare deschisă la 08.11.2026 |

## Istoric

Istoricul deciziilor (când și în ce context au fost luate) este în `journal.md`.
