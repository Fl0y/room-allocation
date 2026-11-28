# Ghidul documentației — RoomAllocation

Pentru agenții AI și pentru autor: în ce ordine se citesc documentele ca să intri în context, unde se scrie fiecare tip de informație și cine modifică fiecare fișier. Este **singura** sursă pentru ordinea de citire; `CLAUDE.md` doar trimite aici.

## 1. Ordinea de citire

### Nivelul 1 — obligatoriu, la începutul oricărei sesiuni (≈ 25 KB)

| # | Fișier | De ce |
|---|---|---|
| 1 | `CLAUDE.md` (rădăcină) | Regulile permanente de lucru. Se încarcă automat în Claude Code. |
| 2 | `info_pack/docs/docs-guide.md` | Acest ghid: ce urmează să citești și ce ai voie să modifici. |
| 3 | `info_pack/docs/handoff.md` | Starea curentă: ce există, ce e verificat, pasul următor, puncte deschise. |
| 4 | `info_pack/docs/decisions.md` | Ce e confirmat (D), propus (P), deschis (O). Prevalează asupra oricărui alt document. |
| 5 | `info_pack/docs/journal.md` — **doar primele 2–3 intrări** | Ce s-a întâmplat recent. Restul jurnalului se citește doar dacă e nevoie de istoric. |

### Nivelul 2 — după sarcină

| Când | Citește |
|---|---|
| Planifici, implementezi sau bifezi o sarcină | `plan.md` (etapa curentă și criteriile ei de acceptare) |
| Delegi la sub-agenți sau alegi modelul | `agent-rules.md` |
| Interpretezi, prezinți sau compari rezultate | `results.md` |
| Formulezi contribuția, compari cu alte lucrări, alegi metode | `literature.md` |
| Lucrezi pe algoritm, constrângeri sau cazuri | `concept.md` — **doar secțiunile relevante** (§3 model și constrângeri, §5 algoritm, §6 cazuri, §7 cercetare) |
| Pregătești materiale pentru coordonator | `coordinator-feedback.md` |
| Configurezi mediul, Docker, PostgreSQL | `CLAUDE.md` (secțiunea „Mediul”), `README.md` (comenzile), `docker-compose.yml` |
| Pornești o sesiune tematică | `topic-discussions.md` |
| Rulezi comenzi sau cauți în cod | `README.md` (rădăcină): comenzile; `project-map.md`: rolul fiecărui fișier și ordinea de citire a codului |
| Întâlnești un termen neclar sau introduci unul nou | `glossary.md` |
| Lucrezi cu datele (formatul intern, setul sintetic, importul datelor reale) | `data-format.md` |

### Cum se citește

- `concept.md` este o bază de discuție, nu un set de decizii. Când contrazice `decisions.md`, **`decisions.md` prevalează**; contradicția se semnalează autorului.
- Nu se recitește tot jurnalul la fiecare sesiune; `handoff.md` rezumă starea.
- Dacă două documente se contrazic (altfel decât concept vs. decizii), se semnalează autorului și nu se alege singur.

## 2. Unde se scrie fiecare tip de informație

Fiecare informație are **un singur loc**. În celelalte documente se pune o trimitere, nu o copie.

| Informație | Locul |
|---|---|
| O decizie confirmată, o propunere, o întrebare deschisă | `decisions.md` |
| Ce s-a făcut, verificat, decis, în ordine cronologică | `journal.md` |
| Starea curentă și pasul următor | `handoff.md` |
| Etapele, sarcinile, criteriile de acceptare, bifele | `plan.md` |
| Cifre, tabele, observații din teste și simulări | `results.md` |
| Regulile permanente de lucru | `CLAUDE.md` |
| Regulile pentru agenți, sub-agenți și modele | `agent-rules.md` |
| Ordinea de citire și regulile de modificare a documentelor | `docs-guide.md` |
| Definițiile termenilor | `glossary.md` |
| Rolul fiecărui fișier de cod, test, script | `project-map.md` |
| Comenzile și structura codului | `README.md` (rădăcină) |

## 3. Cine modifică fiecare fișier și cum

Tipuri: **viu** — se actualizează odată cu proiectul; **regulă** — se schimbă doar la cererea autorului; **referință** — se citește, se modifică rar; **arhivă** — doar citire.

| Fișier | Tip | Când se modifică | Cum |
|---|---|---|---|
| `CLAUDE.md` | regulă | Doar la cererea autorului | Editare punctuală; rămâne scurt |
| `docs-guide.md` | regulă | La cererea autorului sau când se adaugă/elimină un document | Editare punctuală |
| `agent-rules.md` | regulă | La cererea autorului; tabelul modelelor când apar modele noi | Editare punctuală |
| `handoff.md` | viu | La încheierea fiecărei etape | **Se rescrie**; maximum o pagină |
| `journal.md` | viu | La încheierea fiecărei etape sau a unui grup de decizii | **Se adaugă sus**; intrările vechi nu se rescriu |
| `decisions.md` | viu | Când autorul confirmă, schimbă sau respinge ceva | Editare punctuală; ID-urile nu se refolosesc și nu se șterg (ce e înlocuit se marchează) |
| `plan.md` | viu | Bifă: după ce sarcina e **verificată** (inclusiv pe Mac, când e cazul). Structura: doar cu acordul autorului | Editare punctuală; o singură copie activă |
| `results.md` | viu | După rulări de teste/simulări/experimente care produc cifre noi | Se înlocuiește secțiunea respectivă, cu sursa (comandă, seed-uri, commit) |
| `concept.md` | referință | Doar pentru alinierea cu deciziile, cu versiunea notată în antet | Editare punctuală; nu e jurnal |
| `coordinator-feedback.md` | referință | La fiecare feedback nou al coordonatorului | Secțiune nouă datată |
| `topic-discussions.md` | referință | Când se schimbă regulile sesiunilor | Editare punctuală |
| `glossary.md` | viu | Când se introduce un termen nou sau se schimbă sensul unuia | Editare punctuală; definiții scurte, cu trimitere la decizii, fără copierea regulilor |
| `project-map.md` | viu | Când apar, se mută sau dispar fișiere | Editare punctuală; rolul fișierelor, fără numere de linie |
| `literature.md` | viu | La fiecare aprofundare a literaturii (P14) | Pe teme; bibliografia numerotată la final; lucrările necitite integral marcate ◐ |
| `data-format.md` | viu | Când se schimbă formatul intern, locul datelor sau alegerile generatorului | Editare punctuală; versiunea formatului notată în antet |
| `README.md` (rădăcină) | viu | Când apar comenzi, foldere sau dependențe noi | Editare punctuală |

Reguli comune:
- Sesiunile care doar pun întrebări nu modifică fișiere.
- La un moment dat, o singură sesiune sau un singur agent modifică același fișier.
- O sesiune tematică modifică doar fișierele din tema ei; o decizie din afara temei se semnalează.
- Folderul `Claude outputs` (rădăcină) se păstrează: copii ale rapoartelor HTML livrate; subfolderul `Claude outputs/personal/` conține documentele de uz personal ale autorului (`descriere-tema.md`, materialele pentru decanat și coordonator) și **nu intră în Git**. Nu fac parte din documentația activă și nu se actualizează automat.

## 4. Lista de verificare la încheierea unei etape

1. `journal.md`: intrare nouă, sus, după șablonul din antetul fișierului (inclusiv commit-ul, dacă există).
2. `handoff.md`: rescris cu starea nouă și pasul următor.
3. `decisions.md`: deciziile noi sau schimbate (doar dacă există).
4. `plan.md`: bife doar pentru sarcinile verificate; criteriile etapei următoare, dacă s-au stabilit.
5. `results.md`: cifrele noi, cu sursa (doar dacă există).
6. `README.md`: comenzi sau foldere noi (doar dacă există).
7. `project-map.md`: fișiere noi, mutate sau eliminate (doar dacă există); `glossary.md`: termeni noi (doar dacă există).
8. Raport către autor: ce s-a implementat, ce s-a verificat (cu ce comenzi), ce limite rămân. Testele și verificarea vizuală de rutină le face agentul (Claude Code, pe Mac); autorul confirmă schimbările importante de interfață (D49).
9. Commit pe ramura sarcinii, push și PR cu raportul de la punctul 8 (D47); merge-ul îl face autorul.

Lista se parcurge cu skill-ul `/inchide-etapa`; verificarea completă cu `/verifica` (`npm run verify`).
