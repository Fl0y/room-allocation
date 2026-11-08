# RoomAllocation — V0

Algoritmul de alocare a sălilor universitare (proiect academic). Documentația și deciziile sunt în `info_pack/docs/`
(`CLAUDE.md` arată ordinea de citire); planul activ este `info_pack/docs/plan.md`.

## Stadiul: V0, Lotul 1 — motorul de alocare

Motorul este pur (fără interfață, HTTP sau bază de date):

- constrângerile H1–H7 și verificarea tranzițiilor (H8, D19) — `src/engine/checker.ts`;
- ierarhia flux → grupă → subgrupă, cu unități atomice (D21) — `src/engine/units.ts`;
- alocarea online cu scor lexicografic (raritate → excedent → fragmentare, D25), cel mult M mutări de sală la aceeași oră, refuz motivat cu alternative propuse (D18, D20) — `src/engine/allocate.ts`;
- repararea după închiderea unei săli (cazul 5, D19) — `src/engine/repair.ts`;
- cazurile 1–5 din concept și exemplul pentru coordonator — `src/scenarios/cases.ts`.

## Comenzi

Necesită Node 24 (vezi `.node-version`).

```bash
npm ci              # instalează versiunile fixate în package-lock.json
npm test            # toate testele (unitare, cazuri, oracol exhaustiv, determinism)
npm run typecheck   # verificarea tipurilor TypeScript
npm run report      # generează out/cases.html (deschide-l în browser)
```

## Structura

```
src/engine/      motorul de alocare (independent de interfață și BD)
src/scenarios/   scenariile demonstrative (date sintetice) și rularea lor
tests/engine/    testele motorului
tests/oracle/    oracolul exhaustiv (independent de căutarea motorului)
tests/support/   generatorul de instanțe mici aleatoare, cu seed
scripts/         raportul vizual static
```
