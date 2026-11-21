# Starea curentă — RoomAllocation

**Actualizat:** 21 noiembrie 2026 (Lotul 6c). Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată. Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

## Ce există

- **V0 încheiat**; **Lotul 3A** (formatul intern, setul sintetic) și **Lotul 4** (cererea cu interval, ferestrele studenților) încheiate și verificate pe Mac (commit-uri `a813fcb`, `dfaafe4`).
- **Lotul 5 încheiat (21.11.2026; commit `7297086`), verificat pe Mac de autor (PostgreSQL 18.7 în Docker):**
  - 5a: `docker-compose.yml` (PostgreSQL 18.7, doar pe 127.0.0.1:54320), `db/migrations/001_schema.sql` (tabelele; constrângerile de excludere pentru sală, profesor și unitate atomică; trigger-ul H8), `src/db/migrate.ts`, `src/db/store.ts`, `npm run db:load -- synthetic`.
  - 5b: `src/db/service.ts` — blocarea zilei → idempotența → starea din baza de date → motorul (neschimbat) → mutările și rezervarea într-o singură tranzacție.
  - 5c: `tests/db/` (34 de teste, `npm run test:db`), inclusiv concurența, atomicitatea și testele de mutație. Rezultatele: `results.md` §6.
- **Verificat în mediul lui Claude și pe Mac:** `npm test` 103 teste; `npm run test:db` 34 de teste (PostgreSQL 16 local, respectiv 18.7 în Docker); `tsc` fără erori; setul sintetic se încarcă în baza de date fără încălcări.
- **Dependențe noi:** `pg` 8.23.1, `@types/pg` 8.23.1 (versiuni fixate).
- **Nu există:** date reale.

## Comenzile bazei de date (pe Mac)

`npm run db:up` → `npm run db:migrate` → `npm run db:load -- synthetic` → `npm run test:db`; oprire: `npm run db:down`.

## Lotul 6a — încheiat (21.11.2026)

- Aplicația Next.js 16.4.6 (React 19.3.1, Zod 4.6.7) în `app/`; API-ul (`app/api/`, logica în `src/api/handlers.ts`; lista în `README.md`); operațiile tranzacționale `src/db/operations.ts`; migrația `002_operations.sql`; `Dockerfile` și serviciul `web` (`npm run app:up`, http://localhost:3000).
- Verificat în mediul lui Claude (`npm test` 103, `npm run test:db` 45, `next build`, HTTP) și pe Mac de autor (inclusiv tot sistemul în Docker). Rezultatele: `results.md` §7.
- Atenție: `npm run dev` și containerul `web` folosesc același port 3000 (`README.md`).

## Lotul 6b — încheiat (21.11.2026)

- Paginile `/`, `/profesor`, `/studenti`, `/admin` (`app/`, `project-map.md` §2bis); istoricul mutărilor în API; mesajele de validare în română; testele Playwright (`npm run test:e2e`, doar în mediul lui Claude, D43).
- Verificat în mediul lui Claude (`npm test` 103, `npm run test:db` 48, `npm run test:e2e` 4) și pe Mac de autor (paginile în browser). Rezultatele: `results.md` §8.

## Lotul 6c — încheiat (21.11.2026)

- Exportul .ics (`src/api/ics.ts`, `GET /api/calendar?unit=…|teacher=…`), cu linkuri în paginile studenților și profesorului. Verificat în mediul lui Claude (`npm test` 108, `npm run test:db` 49, `npm run test:e2e` 5), pe Mac și prin importul în Google Calendar (autorul). Rezultatele: `results.md` §9.

**V1 este încheiat**, cu excepția părții 3B (datele reale), care așteaptă datele de la decanat.

## Pasul următor

- 3B, când vin datele reale (convertorul după formatul primit, pseudonimizarea, comparația cu setul sintetic, săptămâna reală în simulator și în 4c).
- Sau etapele de după V1 (`plan.md`): recurența, planificarea semestrului cu un solver (varianta b, Î3), reoptimizarea periodică, validarea pe ITC 2019, experimentele finale, aprofundarea literaturii; plus reformularea concept §4.2. Fiecare se discută și se autorizează separat.

## Puncte deschise (neblocante)

- H4–H7 (capacitate, tip, echipamente, săli închise, blocuri) sunt verificate de motor și de verificatorul independent, nu de baza de date.
- PostgreSQL 19 a apărut la 19.11.2026; proiectul rămâne pe 18 (P07, D27), versiunea curentă 18.7.
- Concept §4.2 (H7 face problema dificilă) trebuie reformulat prudent (`literature.md` §2).
