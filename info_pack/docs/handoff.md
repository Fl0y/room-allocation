# Starea curentă — RoomAllocation

Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată (maximum o pagină). Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

## Ce există și ce e verificat

- **V0 și V1 încheiate**, cu excepția părții 3B (datele reale), care așteaptă datele de la decanat. Componentele: motorul (`src/engine/`), formatul intern și setul sintetic, cererea cu interval, PostgreSQL 18.7 în Docker cu serviciul tranzacțional, aplicația Next.js (paginile profesorului, studenților, administratorului), exportul .ics. Detaliile: `README.md`, `project-map.md`; rezultatele: `results.md`.
- **Verificat pe Mac (25.11.2026, `npm run verify`):** `npm test` 144 · `typecheck` fără erori · `test:db` 49 · `test:e2e` 5.
- **Mediul de lucru cu AI (D47–D49), pasul 1 făcut** pe ramura `docs/mediu-ai-1`: fluxul Git cu ramuri și PR-uri, hook-ul de protecție, permisiunile, testul de coerență a documentației, CI-ul, skill-urile `/verifica`, `/inchide-etapa`, `/sesiune-tematica`, `/rezultate`.

## Pasul următor

1. Autorul face merge PR-ului `docs/mediu-ai-1` („Rebase and merge”), după ce CI-ul trece.
2. Agentul configurează protecția lui `main` (PR + CI-ul `teste` și `bd-interfata`, fără aprobare cerută) și ștergerea automată a ramurilor (D47).
3. Restul D48, fiecare prin PR: `CLAUDE.md` scurt + `CLAUDE.md` în `src/engine/`, `src/db/`, `app/`; rezumatul deciziilor active în `decisions.md` (verificat de test) și corectarea estimării de ≈ 25 KB din `docs-guide.md`; sub-agentul `recenzent-motor`; specificațiile (`info_pack/specs/`) și ADR-urile; prioritatea 3 (jurnalul arhivat pe luni, planul comprimat, fără date „Actualizat” manuale, rezultatele ca JSON).
4. Apoi: 3B, când vin datele reale (prima specificație), sau etapele de după V1 din `plan.md`, fiecare autorizată separat.

## De știut înainte de lucru

- Commit-urile, push-ul și PR-urile le face agentul, pe ramuri; merge-ul doar autorul (D47). Hook-ul `.claude/hooks/guard.ts` blochează încălcările.
- `npm run dev` și containerul `web` folosesc același port 3000 (`README.md`).
- `test:e2e` cere Chromium 1243 (versiunea lui `@playwright/test` 1.63.0); dacă lipsește: `npx playwright install chromium`.

## Puncte deschise (neblocante)

- H4–H7 (capacitate, tip, echipamente, săli închise, blocuri) sunt verificate de motor și de verificatorul independent, nu de baza de date.
- PostgreSQL 19 a apărut la 19.11.2026; proiectul rămâne pe 18 (P07, D27).
- Concept §4.2 (H7 face problema dificilă) trebuie reformulat prudent (`literature.md` §2).
