---
name: verifica
description: Verificarea completă a proiectului RoomAllocation (teste unitare, tipuri, teste pe PostgreSQL, teste Playwright) cu un tabel de rezultate comparat cu cifrele din handoff.md. Folosește-l înainte de orice PR, la încheierea unei etape sau când autorul cere „rulează testele / verifică”.
argument-hint: "[--no-db] [--no-e2e]"
---

# /verifica — verificarea completă (D48)

1. Rulează `npm run verify -- $ARGUMENTS` (scriptul `scripts/verify.ts`). Scriptul pornește baza de date dacă nu rulează și o oprește doar dacă a pornit-o el; nu porni sau opri tu Docker separat.
2. Dacă Docker nu rulează, scriptul marchează `test:db` și `test:e2e` ca „nerulat”. Spune-i autorului să pornească Docker Desktop; nu raporta verificarea ca fiind completă.
3. Compară numerele cu ultima stare din `info_pack/docs/handoff.md` (linia cu cifrele testelor). Un număr mai mic de teste fără o explicație (teste șterse intenționat) e o problemă de raportat.
4. La un eșec: citește finalul ieșirii afișat de script, identifică testul și cauza probabilă. Nu corecta nimic fără să spui ce corectezi; după 2 încercări nereușite, oprește-te și raportează (agent-rules.md, escaladarea).
5. Raportează tabelul scriptului așa cum e, plus: ce diferă față de handoff și ce nu s-a putut rula.

Probleme cunoscute:
- `test:e2e` cere Chromium în versiunea fixată de `@playwright/test` din `package.json`; dacă lipsește: `npx playwright install chromium` (din folderul proiectului).
- Portul 3200 trebuie să fie liber pentru `test:e2e`, iar portul 54320 e al bazei de date.
