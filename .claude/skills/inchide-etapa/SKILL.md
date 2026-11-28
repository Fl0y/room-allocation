---
name: inchide-etapa
description: Încheierea unei etape sau sarcini în RoomAllocation după docs-guide.md §4 — verificarea, documentele (journal, handoff, decisions, plan, results, project-map, README), commit-ul, push-ul pe ramură și PR-ul. Folosește-l când o sarcină autorizată e gata sau când autorul cere „închide etapa / fă PR”.
argument-hint: "[numele etapei]"
---

# /inchide-etapa — lista de încheiere (docs-guide.md §4, D47)

Etapa: $ARGUMENTS (dacă lipsește, deduce-o din ramură și din specificația din `info_pack/specs/`, dacă există).

## 1. Precondiții
- Ramura curentă nu e `main` (`git branch --show-current`). Dacă e `main`, oprește-te și creează ramura (`etapa/…`, `docs/…`, `fix/…`) înainte de orice commit.
- Rulează `/verifica` (sau `npm run verify`). Fără verificare completă trecută nu se deschide PR; dacă ceva nu a putut rula (de exemplu Docker oprit), PR-ul spune explicit asta.

## 2. Documentele (doar ce s-a schimbat efectiv)
1. `journal.md`: intrare nouă **sus**, după șablonul din antet (context/autorizare, decizii cu ID, implementat, verificat cu comenzi și cifre, limite, commit, pasul următor). Intrările vechi nu se rescriu.
2. `handoff.md`: **rescris**, maximum o pagină: ce e verificat acum (o linie cu cifrele), pasul următor, ce blochează, punctele deschise. Fără istoric pe loturi. Pe o ramură paralelă care nu e etapa principală, nu modifica `handoff.md` și `journal.md` (D47); pune concluziile în descrierea PR-ului.
3. `decisions.md`: doar deciziile confirmate de autor în această etapă; ID nou, nerefolosit; ce e înlocuit se marchează `*(înlocuit de Dnn)*`.
4. `plan.md`: bife doar pentru sarcinile verificate.
5. `results.md`: cifrele noi, cu sursa (comanda, seed-urile, commit-ul).
6. `project-map.md`, `README.md`, `glossary.md`: fișiere, comenzi, termeni noi.
7. Rulează din nou `npm test` (testele documentației prind ID-urile greșite și harta incompletă).

## 3. Git și PR
1. Arată autorului lista fișierelor modificate (`git status --short`), apoi fă commit-uri pe pași logici. Mesajul: tip scurt (`feat`, `fix`, `docs`, `test`, `chore`) + ce s-a schimbat, în română; **fără** semnături ale lui Claude (hook-ul le blochează).
2. `git push -u origin <ramura>`.
3. Scrie descrierea PR-ului într-un fișier temporar din scratchpad și deschide PR-ul cu `gh pr create --base main --title "…" --body-file <fișier>`. Descrierea:
   - **Ce s-a implementat** (fișiere, decizii);
   - **Ce s-a verificat** (tabelul din `/verifica`, cu comenzile);
   - **Limite și ce rămâne**;
   - **Ce trebuie să verifice autorul** (de exemplu o schimbare importantă de interfață, D49).
4. Verifică CI-ul (`gh pr checks`). Nu face merge: îl face autorul, cu „Rebase and merge” (D47).
5. Raportul final către autor: linkul PR-ului și rezumatul de mai sus.
