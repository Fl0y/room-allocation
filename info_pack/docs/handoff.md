# Starea curentă — RoomAllocation

**Actualizat:** 21 noiembrie 2026 (Lotul 6a). Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată. Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

## Ce există

- **V0 încheiat**; **Lotul 3A** (formatul intern, setul sintetic) și **Lotul 4** (cererea cu interval, ferestrele studenților) încheiate și verificate pe Mac (commit-uri `a813fcb`, `dfaafe4`).
- **Lotul 5 încheiat (21.11.2026; commit `7297086`), verificat pe Mac de autor (PostgreSQL 18.7 în Docker):**
  - 5a: `docker-compose.yml` (PostgreSQL 18.7, doar pe 127.0.0.1:54320), `db/migrations/001_schema.sql` (tabelele; constrângerile de excludere pentru sală, profesor și unitate atomică; trigger-ul H8), `src/db/migrate.ts`, `src/db/store.ts`, `npm run db:load -- synthetic`.
  - 5b: `src/db/service.ts` — blocarea zilei → idempotența → starea din baza de date → motorul (neschimbat) → mutările și rezervarea într-o singură tranzacție.
  - 5c: `tests/db/` (34 de teste, `npm run test:db`), inclusiv concurența, atomicitatea și testele de mutație. Rezultatele: `results.md` §6.
- **Verificat în mediul lui Claude și pe Mac:** `npm test` 103 teste; `npm run test:db` 34 de teste (PostgreSQL 16 local, respectiv 18.7 în Docker); `tsc` fără erori; setul sintetic se încarcă în baza de date fără încălcări.
- **Dependențe noi:** `pg` 8.23.1, `@types/pg` 8.23.1 (versiuni fixate).
- **Nu există:** API HTTP, interfețe reale (Lotul 6), date reale.

## Comenzile bazei de date (pe Mac)

`npm run db:up` → `npm run db:migrate` → `npm run db:load -- synthetic` → `npm run test:db`; oprire: `npm run db:down`.

## Lotul 6a — încheiat (21.11.2026)

- Aplicația Next.js 16.4.6 (React 19.3.1, Zod 4.6.7) în `app/`; API-ul (`app/api/`, logica în `src/api/handlers.ts`; lista în `README.md`); operațiile tranzacționale `src/db/operations.ts`; migrația `002_operations.sql`; `Dockerfile` și serviciul `web` (`npm run app:up`, http://localhost:3000).
- Verificat în mediul lui Claude (`npm test` 103, `npm run test:db` 45, `next build`, HTTP) și pe Mac de autor (inclusiv tot sistemul în Docker). Rezultatele: `results.md` §7.
- Atenție: `npm run dev` și containerul `web` folosesc același port 3000 (`README.md`).

## Pasul următor

- **6b** (paginile: profesor, studenți, administrator; Playwright) — necesită autorizare.

## Puncte deschise (neblocante)

- Propuneri neconfirmate ale Lotului 6a: rezervările pe care repararea nu le poate realoca ies din orar și rămân în raportul închiderii, cu alternativele propuse (ca în motor); aplicarea unei alternative realocă sălile la momentul aplicării (sala propusă poate diferi dacă starea s-a schimbat); mesajele de validare Zod sunt în engleză.

- Propuneri neconfirmate ale Lotului 5: blocarea pe zi (nu pe sală); cheia de idempotență implicită = identificatorul cererii; și refuzurile sunt păstrate (retrimiterea aceleiași chei întoarce același refuz; o încercare nouă cere o cheie nouă); starea se citește integral la fiecare cerere (suficient pentru o facultate; de revăzut la scară mai mare).
- H4–H7 (capacitate, tip, echipamente, săli închise, blocuri) sunt verificate de motor și de verificatorul independent, nu de baza de date.
- PostgreSQL 19 a apărut la 19.11.2026; proiectul rămâne pe 18 (P07, D27), versiunea curentă 18.7.
- Propuneri ale Lotului 4 și ale setului sintetic: vezi `data-format.md` §4–5 și `journal.md`.
- Concept §4.2 (H7 face problema dificilă) trebuie reformulat prudent (`literature.md` §2).
