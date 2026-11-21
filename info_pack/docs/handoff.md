# Starea curentă — RoomAllocation

**Actualizat:** 21 noiembrie 2026 (Lotul 6b). Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată. Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

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

## Lotul 6b — autorizat și implementat (21.11.2026), neverificat încă pe Mac

- Paginile: `/` (alegerea rolului), `/profesor`, `/studenti`, `/admin` (`app/`, detaliile în `project-map.md` §2bis), după D37, D38, D42. Istoricul mutărilor în API (`GET /api/bookings` → `history`); mesajele de validare în română.
- Testele de interfață: `tests/e2e/flows.e2e.ts` (Playwright 1.63.0, `npm run test:e2e`), rulate în mediul lui Claude (D43).
- Verificat în mediul lui Claude: `npm test` 103, `npm run test:db` 48, `npm run test:e2e` 4, `next build`, capturi de ecran. Rezultatele: `results.md` §8.

### De verificat pe Mac

```bash
npm ci                            # dependența nouă: @playwright/test (fără browsere)
npm test                          # 103
npm run db:up && npm run db:migrate && npm run db:load -- synthetic
npm run test:db                   # 48
npm run dev                       # apoi http://localhost:3000: Profesor, Studenți, Administrator (Ctrl+C la final)
npm run app:up                    # varianta în Docker (după ce serverul de dezvoltare e oprit)
```

În browser: o cerere ca profesor, orarul unei grupe ca student, închiderea unei săli ca administrator. După verificare: bifa 6b și commit-ul.

## Pasul următor

- **6c** (export .ics, D39) — necesită autorizare.

## Puncte deschise (neblocante)

- H4–H7 (capacitate, tip, echipamente, săli închise, blocuri) sunt verificate de motor și de verificatorul independent, nu de baza de date.
- PostgreSQL 19 a apărut la 19.11.2026; proiectul rămâne pe 18 (P07, D27), versiunea curentă 18.7.
- Concept §4.2 (H7 face problema dificilă) trebuie reformulat prudent (`literature.md` §2).
