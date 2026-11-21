import s from './ui.module.css';

// Alegerea rolului, fără autentificare (D37).
export default function Home() {
  return (
    <>
      <h1>Alocarea sălilor universitare</h1>
      <p className="muted">Alege rolul. Nu există autentificare: rolul și profesorul se aleg pe pagină (D37). Profesorii apar doar cu pseudonime (D28).</p>
      <div className={s.cards}>
        <div className={s.card}>
          <h2>Profesor</h2>
          <p>Cere o sală pentru o pereche sau un interval; vezi decizia algoritmului, explicația și alternativele; gestionează rezervările proprii.</p>
          <a href="/profesor">Deschide →</a>
        </div>
        <div className={s.card}>
          <h2>Studenți</h2>
          <p>Orarul săptămânii pentru un flux, o grupă sau o subgrupă: sala, ziua, perechea, ora, profesorul.</p>
          <a href="/studenti">Deschide →</a>
        </div>
        <div className={s.card}>
          <h2>Administrator</h2>
          <p>Ocuparea sălilor pe zi, închiderea unei săli și repararea automată a orarului.</p>
          <a href="/admin">Deschide →</a>
        </div>
      </div>
    </>
  );
}
