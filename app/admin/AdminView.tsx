'use client';
// Pagina administratorului (Lotul 6b, D38, D42): grila săli × perechi pe zi, în care se văd deciziile algoritmului;
// închiderea unei săli cu repararea automată și raportul ei; alternativele pentru rezervările nerezolvate,
// aplicabile în numele profesorului.

import { useEffect, useState } from 'react';
import s from '../ui.module.css';
import { DecisionView } from '../components/DecisionView.tsx';
import {
  ACTIVITY,
  ROOM_TYPE,
  STATUS,
  api,
  dayLabel,
  periodLabel,
  requestFromBooking,
  type ClosureReport,
  type ClosureRow,
  type ListedBooking,
  type Meta,
} from '../lib/client.ts';

export function AdminView() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [day, setDay] = useState('');
  const [bookings, setBookings] = useState<ListedBooking[]>([]);
  const [closures, setClosures] = useState<ClosureRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ roomId: '', from: '', to: '', reason: 'repair' as 'repair' | 'other' });
  const [report, setReport] = useState<ClosureReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.meta().then(
      (m) => {
        setMeta(m);
        setDay(m.days[0] ?? '');
        setForm((f) => ({ ...f, roomId: m.rooms[0]?.id ?? '', from: m.days[0] ?? '', to: m.days[0] ?? '' }));
      },
      (e: Error) => setError(e.message),
    );
  }, []);

  const refresh = () => {
    if (day) api.bookings({ day }).then((r) => setBookings(r.bookings), (e: Error) => setError(e.message));
    api.closures().then((r) => setClosures(r.closures), (e: Error) => setError(e.message));
  };
  useEffect(refresh, [day]);

  async function close() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.close(form);
      setReport(r.report);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!meta) return <p>{error ? <span className="bad">{error}</span> : 'Se încarcă…'}</p>;
  const closedOn = (roomId: string) => closures.some((c) => c.roomId === roomId && c.from <= day && day <= c.to);
  const occupied = bookings.reduce((n, b) => n + b.length, 0);

  return (
    <>
      <h1>Administrator</h1>
      <div className={s.row}>
        <label className={s.field}>
          <span>Ziua</span>
          <select value={day} onChange={(e) => setDay(e.target.value)} aria-label="Ziua">
            {meta.days.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d)}
              </option>
            ))}
          </select>
        </label>
        <span className="muted">
          {bookings.length} rezervări; ocupare {Math.round((100 * occupied) / Math.max(1, meta.rooms.length * meta.grid.periods.length))}%
        </span>
      </div>

      <h2>Sălile în ziua aleasă</h2>
      <div className={s.scroll}>
        <table className={s.grid} data-testid="room-grid">
          <thead>
            <tr>
              <th className={s.rowHead}>Sala</th>
              {meta.grid.periods.map((p) => (
                <th key={p.index}>
                  {p.index}
                  <br />
                  <span className="muted">{p.start}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meta.rooms.map((r) => (
              <tr key={r.id}>
                <th className={s.rowHead}>
                  {r.id}
                  <br />
                  <span className="muted">
                    {ROOM_TYPE[r.type]}, {r.capacity} locuri{r.computers ? `, ${r.computers} calc.` : ''}
                  </span>
                  {closedOn(r.id) && <span className={`${s.badge} bad`}>închisă</span>}
                </th>
                {meta.grid.periods.map((p) => {
                  const b = bookings.find((x) => x.roomId === r.id && x.start === p.index);
                  const covered = bookings.some((x) => x.roomId === r.id && x.start < p.index && p.index < x.start + x.length);
                  if (covered) return null;
                  return (
                    <td key={p.index} colSpan={b?.length ?? 1}>
                      {b && (
                        <div className={`${s.chip} ${s[b.activity]}`} title={`${b.id}: ${periodLabel(b.start, b.length)}, ${b.students} studenți`}>
                          <strong>{ACTIVITY[b.activity]}</strong> · {b.units.join(', ')}
                          <small>
                            {b.students}/{r.capacity} · {b.teacher}
                            {b.status !== 'movable' ? ` · ${STATUS[b.status]}` : ''}
                            {b.history.length ? ' · mutată' : ''}
                          </small>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Închiderea unei săli</h2>
      <p className="muted">Rezervările afectate se realocă automat, întâi la aceeași oră (D19); cele care nu se pot realoca ies din orar și apar mai jos, cu alternative.</p>
      <div className={s.row}>
        <label className={s.field}>
          <span>Sala</span>
          <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} aria-label="Sala de închis">
            {meta.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>De la</span>
          <select value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: e.target.value > form.to ? e.target.value : form.to })} aria-label="De la">
            {meta.days.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d)}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>Până la</span>
          <select value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} aria-label="Până la">
            {meta.days
              .filter((d) => d >= form.from)
              .map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
          </select>
        </label>
        <label className={s.field}>
          <span>Motivul</span>
          <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as 'repair' | 'other' })} aria-label="Motivul">
            <option value="repair">reparații</option>
            <option value="other">alt motiv</option>
          </select>
        </label>
        <button className="primary" onClick={close} disabled={busy}>
          Închide sala și repară orarul
        </button>
      </div>
      {error && <p className={s.error}>{error}</p>}
      {report && <ReportView report={report} onApplied={refresh} />}

      <h2>Închiderile înregistrate</h2>
      {!closures.length ? (
        <p className="muted">Nicio închidere.</p>
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Sala</th>
              <th>Perioada</th>
              <th>Motivul</th>
              <th>Rezultatul</th>
            </tr>
          </thead>
          <tbody>
            {closures.map((c) => (
              <tr key={c.id}>
                <td>{c.roomId}</td>
                <td>
                  {dayLabel(c.from)} – {dayLabel(c.to)}
                </td>
                <td>{c.reason === 'repair' ? 'reparații' : 'alt motiv'}</td>
                <td>{c.report?.explanation[1] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function ReportView({ report, onApplied }: { report: ClosureReport; onApplied: () => void }) {
  return (
    <section className={`${s.decision} ${report.unresolved.length ? s.rejected : s.accepted}`} data-testid="closure-report">
      <ul className={s.explanation}>
        {report.explanation.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {[...report.sameTimeDirect, ...report.sameTimeWithMoves].length > 0 && (
        <>
          <h3>Realocate la aceeași oră</h3>
          <ul>
            {report.sameTimeDirect.map((m) => (
              <li key={m.bookingId}>
                {m.bookingId}: {m.from} → {m.to}
              </li>
            ))}
            {report.sameTimeWithMoves.map((m) => (
              <li key={m.bookingId}>
                {m.bookingId}: {m.from} → {m.to}, cu mutările {m.moves.map((x) => `${x.bookingId} ${x.from} → ${x.to}`).join('; ')}
              </li>
            ))}
          </ul>
        </>
      )}
      {report.unresolved.map((u) => (
        <div key={u.booking.id}>
          <h3>
            Nerezolvată: {u.booking.id} ({ACTIVITY[u.booking.activity]}, {u.booking.units.join(', ')}, {dayLabel(u.booking.date)}, {periodLabel(u.booking.start, u.booking.length)}, profesor {u.booking.teacher})
          </h3>
          <DecisionView
            decision={{ kind: 'rejected', requestId: u.booking.id, moves: [], reasons: u.reasons, alternatives: u.alternatives, explanation: u.reasons.map((r) => r.message) }}
            request={requestFromBooking(u.booking)}
            applyLabel="Aplică în numele profesorului"
            onApplied={onApplied}
          />
        </div>
      ))}
    </section>
  );
}
