'use client';
// Panoul studenților (Lotul 6b, D09, D38, D42): orarul săptămânii pentru un flux, o grupă sau o subgrupă —
// grupa, sala, ziua, perechea, ora, profesorul. Pe ecrane mici, orarul se afișează ca listă pe zile.

import { useEffect, useMemo, useState } from 'react';
import s from '../ui.module.css';
import { ACTIVITY, api, dayLabel, unitTree, weekOf, type ListedBooking, type Meta } from '../lib/client.ts';

export function StudentView() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [unit, setUnit] = useState('');
  const [week, setWeek] = useState('');
  const [bookings, setBookings] = useState<ListedBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.meta().then(
      (m) => {
        setMeta(m);
        setUnit(unitTree(m.units)[0]?.unit.id ?? '');
        setWeek(m.days[0] ? weekOf(m.days[0]) : '');
      },
      (e: Error) => setError(e.message),
    );
  }, []);

  const weeks = useMemo(() => (meta ? [...new Set(meta.days.map(weekOf))] : []), [meta]);
  const days = useMemo(() => (meta ? meta.days.filter((d) => weekOf(d) === week) : []), [meta, week]);

  useEffect(() => {
    if (!unit || !days.length) return;
    api.bookings({ unit, from: days[0]!, to: days[days.length - 1]! }).then((r) => setBookings(r.bookings), (e: Error) => setError(e.message));
  }, [unit, days]);

  if (!meta) return <p>{error ? <span className="bad">{error}</span> : 'Se încarcă…'}</p>;
  const wi = weeks.indexOf(week);
  const at = (day: string, p: number) => bookings.filter((b) => b.date === day && b.start <= p && p < b.start + b.length);
  const cell = (b: ListedBooking) => (
    <div key={b.id} className={`${s.chip} ${s[b.activity]}`}>
      <strong>{ACTIVITY[b.activity]}</strong> · {b.units.join(', ')}
      <small>
        sala {b.roomId}
        {b.roomName ? ` (${b.roomName})` : ''} · {b.teacher}
      </small>
    </div>
  );

  return (
    <>
      <h1>Orarul studenților</h1>
      <div className={s.row}>
        <label className={s.field}>
          <span>Fluxul, grupa sau subgrupa</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unitatea">
            {unitTree(meta.units).map(({ unit: u, depth }) => (
              <option key={u.id} value={u.id}>
                {'  '.repeat(depth)}
                {u.id} ({u.kind === 'flux' ? 'flux' : u.kind === 'group' ? 'grupă' : 'subgrupă'})
              </option>
            ))}
          </select>
        </label>
        <div className={s.row}>
          <button onClick={() => setWeek(weeks[wi - 1]!)} disabled={wi <= 0} aria-label="Săptămâna anterioară">
            ←
          </button>
          <span>Săptămâna din {week ? dayLabel(week) : '—'}</span>
          <button onClick={() => setWeek(weeks[wi + 1]!)} disabled={wi >= weeks.length - 1} aria-label="Săptămâna următoare">
            →
          </button>
        </div>
      </div>
      <p className="muted">Orarul unei unități include activitățile fluxului și ale grupei din care face parte, precum și ale subgrupelor ei.</p>
      {error && <p className={s.error}>{error}</p>}

      <div className={`${s.scroll} ${s.desktopOnly}`}>
        <table className={s.grid} data-testid="timetable">
          <thead>
            <tr>
              <th className={s.rowHead}>Perechea</th>
              {days.map((d) => (
                <th key={d}>{dayLabel(d)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meta.grid.periods.map((p) => (
              <tr key={p.index}>
                <th className={s.rowHead}>
                  {p.index}
                  <br />
                  <span className="muted">
                    {p.start}–{p.end}
                  </span>
                </th>
                {days.map((d) => (
                  <td key={d}>{at(d, p.index).map(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={s.mobileOnly}>
        {days.map((d) => {
          const list = bookings.filter((b) => b.date === d).sort((a, b) => a.start - b.start);
          return (
            <section key={d}>
              <h3>{dayLabel(d)}</h3>
              {!list.length && <p className="muted">Nicio activitate.</p>}
              {list.map((b) => (
                <div key={b.id} className={`${s.chip} ${s[b.activity]}`}>
                  <strong>{b.time}</strong> · {ACTIVITY[b.activity]} · {b.units.join(', ')}
                  <small>
                    sala {b.roomId} · {b.teacher}
                  </small>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
