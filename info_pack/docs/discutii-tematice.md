# Discuții tematice

Discuția generală coordonează planul, etapele și deciziile. Discuțiile tematice tratează în detaliu o componentă sau o etapă. Discuțiile nu își văd reciproc istoria; legătura dintre ele sunt documentele din `info_pack/docs/` (vezi secțiunea „Discuții tematice” din `CLAUDE.md`).

## Șablon de pornire

Copiază textul de mai jos ca prim mesaj al discuției noi și completează câmpurile dintre `< >`. Denumirea recomandată: `RA · <temă>` (RoomAllocation).

```text
Discuție tematică (RoomAllocation): <tema>. Răspunde în română.

Citește CLAUDE.md și info_pack/docs/docs-guide.md, apoi nivelul 1 de citire (handoff.md, decisions.md, primele intrări din journal.md). Pentru detalii, consultă: <documente / secțiuni, de ex. concept.md §5>.

Tema și limitele: <ce intră în discuție; ce nu intră>.
Permisiuni: <doar întrebări și explicații, fără modificarea fișierelor | poate modifica: <fișiere/foldere>>.

Reguli:
- Lucrează doar în tema dată. O decizie din afara temei sau o contradicție cu decisions.md se semnalează; nu o schimba.
- Deciziile noi se trec în decisions.md, iar progresul în journal.md și handoff.md, înainte de încheierea discuției (dacă discuția are permisiunea de a modifica fișiere).
- La încheiere, oferă un rezumat de 3–5 rânduri: ce s-a decis, ce s-a realizat, ce rămâne, impactul asupra planului.

Primul pas: <întrebarea sau sarcina inițială>.
```

## Exemplu: mutări și interschimbări

```text
Discuție tematică (RoomAllocation): mutări și interschimbări de rezervări. Răspunde în română.

Citește CLAUDE.md și info_pack/docs/docs-guide.md, apoi nivelul 1 de citire. Pentru detalii, consultă concept.md §5.3 și cazurile 1, 2, 3 și 5 din §6, plus results.md §3.

Tema și limitele: când sunt utile mutările, ce rezervări pot fi mutate, limitele (număr, adâncime, orizont înghețat), cine aprobă, cum se notifică, cum se măsoară valoarea lor. Nu intră: interfața, baza de date, stackul.
Permisiuni: doar întrebări și explicații, fără modificarea fișierelor.

Reguli:
- Lucrează doar în tema dată. O decizie din afara temei sau o contradicție cu decisions.md se semnalează; nu o schimba.
- Deciziile noi se trec în decisions.md, iar progresul în journal.md și handoff.md, înainte de încheierea discuției (dacă discuția are permisiunea de a modifica fișiere).
- La încheiere, oferă un rezumat de 3–5 rânduri: ce s-a decis, ce s-a realizat, ce rămâne, impactul asupra planului.

Primul pas: analizează propunerea P04 și dă-mi 3 contraexemple în care o mutare ar face mai mult rău decât bine.
```
