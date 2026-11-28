# RoomAllocation — context și reguli de lucru

Răspunde în română. Acest repository conține un proiect academic: motorul de alocare a sălilor universitare și sistemul V1 construit în jurul lui (date în format intern, PostgreSQL în Docker, API și pagini Next.js, export .ics). Starea exactă: `info_pack/docs/handoff.md`.

## Citește înainte de lucru

Ordinea de citire, ce document se modifică și cum: **`info_pack/docs/docs-guide.md`** (singura sursă pentru aceste reguli). Minimul obligatoriu la începutul fiecărei sesiuni: `docs-guide.md` → `handoff.md` → `decisions.md` → primele 2–3 intrări din `journal.md`. Regulile pentru sub-agenți și alegerea modelului: `info_pack/docs/agent-rules.md`. Comenzile: `README.md`; rolul fiecărui fișier: `info_pack/docs/project-map.md`.

## Context esențial

Proiect academic centrat pe un **algoritm de alocare a sălilor universitare**. Profesorii cer săli (dată, pereche sau interval de perechi, grupe, tip de sală, echipamente); algoritmul alege sala (și, la interval, perechea), păstrează blocurile de perechi în aceeași sală, poate muta câteva rezervări existente și, când nu există o variantă fără conflicte, refuză motivat și propune alternative. Un panou afișează orarul (grupă, sală, dată, pereche, oră, profesor). Prioritatea este valoarea științifică a algoritmului (D14). Nu intră în scop deplasarea între clădiri și preferințele personale ale profesorilor (D11, D12).

Datele: setul sintetic se generează cu seed; datele reale ale facultății (partea 3B, D28, D32) vor sta doar în folderul extern `../room-allocation-data/` (D33), cu profesorii pseudonimizați.

## Mod de lucru

- Respectă instrucțiunile curente ale autorului. Distinge deciziile confirmate de propuneri; statutul fiecărei afirmații este în `decisions.md`, care prevalează asupra oricărui alt document. `concept.md` este o bază de discuție, nu un set de decizii.
- **Nu începe implementarea fără autorizarea explicită a autorului.** O etapă nouă începe cu: înțelegerea sarcinii, confirmat vs. propus, doar întrebările care blochează, planul pe scurt. După autorizare, lucrează în etape verificabile, fără confirmare pentru fiecare alegere minoră; cere clarificări când se schimbă scopul, regulile importante sau sunt necesare costuri/publicare.
- Păstrează motorul de alocare (`src/engine/`) independent de interfață, HTTP și baza de date; o schimbare a lui nu trebuie să modifice deciziile verificate (cazurile 1–10, oracolul, determinismul) decât dacă autorul o cere.
- Integritatea înaintea interfeței: nicio suprapunere de sală, profesor, unitate atomică; tranzacții și blocarea pe zi (D41).
- Nu declara o funcție funcțională doar pentru că există o pagină sau un endpoint. Raportează separat ce s-a implementat, ce s-a verificat (cu ce comenzi) și ce limite rămân.
- Nu inventa rezultate experimentale și nu promite îmbunătățiri fără măsurători; orice cifră nouă intră în `results.md` cu sursa. Nu afirma noutatea științifică înainte de analiza literaturii.
- Persoanele sunt fictive (pseudonime, D28). Datele reale, corespondența pseudonimelor și secretele nu intră în Git, în documente sau în mesaje de commit. Repository-ul GitHub `Fl0y/room-allocation` este **public** (D34).

## Mediul (Claude Code pe Mac-ul autorului, D44)

- Claude Code rulează direct în acest folder, pe Mac (macOS, Apple Silicon): poate rula singur `npm test`, `npm run typecheck`, `npm run test:db`, `npm run test:e2e` (Chromium pentru Playwright e instalat), `docker compose`. Verifică mediul înainte de a presupune (Node 24 din `.node-version`, Docker Desktop pornit pentru baza de date).
- Baza de date de dezvoltare: `npm run db:up` (PostgreSQL 18.7 în Docker, 127.0.0.1:54320). Portul 3000 e folosit fie de `npm run dev`, fie de containerul `web` — nu de amândouă (`README.md`). Procesele pornite de tine (de exemplu `npm run dev`) le oprești la final.
- **Git (D47):** fiecare sarcină pe o ramură proprie (`etapa/…`, `docs/…`, `fix/…`), creată din `main` actualizat; commit la fiecare pas verificat, push pe ramură, apoi PR după `/verifica` (ce s-a implementat, ce s-a verificat, ce limite rămân). Merge-ul îl face doar autorul; agentul nu face merge, commit sau push pe `main`, `push --force` și nu rescrie istoricul publicat. Mesajele de commit nu conțin `Co-Authored-By`, „Generated with” sau alte semnături ale lui Claude. Hook-ul `.claude/hooks/guard.ts` blochează încălcările.
- Folderul de date `../room-allocation-data/` se folosește doar pentru `synthetic/` și `real/canonical/`; fișierele originale (`real/raw/`) și corespondența pseudonimelor nu se citesc.

## Sesiuni

- O sesiune coordonează o etapă sau o temă. Sesiunile nu își văd reciproc istoria: sursa unică de adevăr sunt documentele din `info_pack/docs/`. Deciziile noi se trec în `decisions.md`, progresul în `journal.md` și `handoff.md`, înainte de încheierea sesiunii.
- O sesiune tematică lucrează doar în tema ei; o decizie din afara temei sau o contradicție cu `decisions.md` se semnalează, nu se schimbă. Șablonul: `info_pack/docs/topic-discussions.md`.
- La un moment dat, o singură sesiune (sau un singur agent) modifică aceleași fișiere. Sesiunile doar pentru întrebări nu modifică fișiere.

## Încheierea unei etape

Urmează lista din `docs-guide.md` §4: intrare nouă în `journal.md` (sus), `handoff.md` rescris, `decisions.md` pentru schimbări de direcție, bife în `plan.md` doar pentru sarcinile verificate, cifrele noi în `results.md`, `project-map.md` și `README.md` dacă s-au schimbat fișierele sau comenzile. O singură copie activă a planului.
