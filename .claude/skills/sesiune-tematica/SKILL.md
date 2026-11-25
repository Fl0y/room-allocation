---
name: sesiune-tematica
description: Pornește o sesiune tematică RoomAllocation (o componentă sau o întrebare tratată în detaliu, după topic-discussions.md) — citește contextul minim, fixează tema, limitele și permisiunile. Folosește-l când autorul scrie /sesiune-tematica <tema>.
argument-hint: "<tema> [| limite] [| permisiuni]"
disable-model-invocation: true
---

# /sesiune-tematica — pornirea unei sesiuni tematice

Argumentele: $ARGUMENTS

1. Citește nivelul 1 (`docs-guide.md` §1): `handoff.md`, `decisions.md` (rezumatul deciziilor active, dacă există; restul doar la nevoie), primele 2–3 intrări din `journal.md`. Apoi doar documentele și secțiunile legate de temă (tabelul „nivelul 2” din `docs-guide.md`).
2. Fixează și scrie autorului, în 5–8 rânduri:
   - **tema** și **ce nu intră**;
   - **permisiunile**: implicit *doar întrebări și explicații, fără modificarea fișierelor*; comenzile de citire și testele se pot rula. Dacă autorul a dat altele în argumente, folosește-le;
   - ce e **confirmat** (ID-uri din `decisions.md`) și ce e doar **propus** în legătură cu tema;
   - întrebările deschise relevante.
3. Reguli pe toată sesiunea:
   - doar tema dată; o decizie din afara temei sau o contradicție cu `decisions.md` se semnalează, nu se schimbă;
   - fără implementare fără autorizarea explicită a autorului;
   - dacă sesiunea are voie să modifice fișiere: o ramură proprie (D47); `handoff.md` și `journal.md` doar dacă e ramura etapei principale.
4. La încheiere: un rezumat de 3–5 rânduri (ce s-a decis, ce s-a realizat, ce rămâne, impactul asupra planului) și deciziile propuse pentru `decisions.md`, pe care le trece doar autorul sau sesiunea autorizată.
