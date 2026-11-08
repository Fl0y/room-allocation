# Ce se preia din TableFlow

TableFlow (rezervarea meselor în restaurante) a încheiat la 27.10.2026 primul lot tehnic, verificat pe Mac în containere. Acest document rezumă ce este refolosibil. Totul de mai jos este **propunere de preluare** (P07 în `decisions.md`), nu decizie pentru proiectul nou. Codul TableFlow se află în repository-ul său privat; nu se copiază automat.

## 1. Mediul de lucru (verificat în TableFlow, octombrie 2026)

| Element | Stare |
|---|---|
| Calculator | MacBook Air, Apple Silicon (arm64), 16 GB RAM, macOS |
| Containere | Docker Desktop (Docker 29.9.2, Compose v5.6.1), imagini `linux/arm64`, VM cu 6 GB RAM, VirtioFS |
| Imagini fixate | `node:24.22.1-bookworm-slim` și `postgres:18.6-trixie`, cu digest; fără etichete mobile |
| Node pe Mac | 24.22.1 prin `fnm` + `.node-version`, doar pentru editor (VS Code) |
| Git | Git local + repository privat pe GitHub, creat cu `gh repo create … --private` |
| Rulare | Exclusiv locală pe laptop, fără hosting |

**Atenție:** shell-ul lui Claude rulează într-o mașină virtuală Linux, nu direct pe Mac. Comenzile `docker`, `git` și `npm` de pe Mac le rulează utilizatorul și trimite rezultatul. Claude poate citi și scrie fișiere în folderul conectat și poate rula verificări pe o copie separată.

## 2. Stack și structură (propuse pentru preluare)

| Strat | TableFlow | Observație pentru proiectul nou |
|---|---|---|
| Limbaj | TypeScript (Node 24, `type: module`) | Același limbaj pentru motor, server, interfață și simulator |
| Web | Next.js 16 (App Router), React 19 | Dashboard-ul de rezervare și panoul/orarul |
| Bază de date | PostgreSQL 18, `pg`, SQL parametrizat, migrații SQL versionate | Potrivit pentru constrângeri pe intervale |
| Validare | Zod 4 | — |
| Teste | Vitest 5: proiecte `unit` (fără BD) și `integration` (PostgreSQL real, bază de test în `tmpfs`) | — |
| Containere | `Dockerfile` multi-stage (`dev` / `build` / `prod`), `compose.yaml` + `compose.dev.yaml` + `compose.prod.yaml`, `db` + `db-test` | Se poate refolosi aproape identic |
| Structură | `src/modules/<domeniu>/` (motor pur, servicii), `src/db/` (repo-uri SQL), `migrations/`, `tests/`, `scripts/` | — |

## 3. Soluții tehnice direct transferabile

| Soluție din TableFlow | Corespondentul în proiectul nou |
|---|---|
| Constrângere de excludere `EXCLUDE USING gist (table_id WITH =, period WITH &&) WHERE (is_active)` pe `tstzrange` | Aceeași protecție pentru **sală**; în plus, constrângeri similare pentru **profesor** și **grupă** (H1–H3). Alternativ, sloturile discrete (zi, pereche) permit și chei unice pe (sală, dată, pereche) |
| Motor de alocare pur (intrări normalizate → decizie + explicație), cu teste unitare | Motorul de alocare a sălilor; cazurile 1–5 din concept devin teste |
| Serviciu tranzacțional: lacăt per resursă (`pg_advisory_xact_lock`), reîncercare la conflict `23P01` | Rezervări concurente pentru ultima sală liberă; mutările se scriu în aceeași tranzacție |
| Constrângere amânată la COMMIT pentru consistența rezervare–alocare | Ex.: nicio rezervare confirmată fără sală; blocul complet în aceeași sală |
| Idempotența creării (`Idempotency-Key`, amprentă a cererii) | La fel pentru cererile din dashboard |
| Coduri de refuz stabile + explicații | `ROOM_UNAVAILABLE`, `TEACHER_BUSY`, `GROUP_BUSY`, `NO_ROOM_OF_TYPE` etc., cu alternative |
| Teste de mutație (scoaterea protecțiilor demonstrează că testele detectează dubla rezervare) | Aceeași metodă pentru a dovedi valoarea constrângerilor |
| Simulator determinist cu seed (planificat în TableFlow) și protocol de comparație pereche | Evaluarea strategiilor și a mutărilor |

## 4. Practici de lucru care au funcționat

- **Registrul deciziilor** cu statut explicit: confirmat / propunere / deschis. A evitat tratarea planului drept aprobat în întregime.
- **`handoff.md`** cu jurnal datat: ce s-a implementat, ce s-a verificat, ce limite rămân.
- **Prima sesiune doar de analiză**, apoi autorizare explicită pentru implementare.
- **Discuții tematice** separate (de exemplu, Docker), cu documentele ca sursă unică de adevăr.
- **Etape mici, verificabile**, cu verificarea finală făcută de utilizator pe Mac și commit la fiecare etapă încheiată.
- **Fără rezultate inventate:** eficiența se afirmă doar după măsurători.
- Commit-uri fără referințe la Claude; repository privat.

## 5. Lecții

- Valoarea algoritmului trebuie arătată pe **exemple vizuale mici**, înainte de statistici. Acesta a fost motivul mutării în domeniul sălilor.
- În TableFlow, serializarea deciziilor per restaurant (lacăt) a evitat pierderi la cereri simultane: fără ea, integritatea se păstra, dar se pierdeau rezervări din cauza reîncercărilor (9 din 10 într-un test). Același risc apare la sălile cerute simultan.
- Versiunile se aleg în ziua instalării și se fixează exact; nu se presupune nimic despre instrumentele de pe Mac fără verificare.
