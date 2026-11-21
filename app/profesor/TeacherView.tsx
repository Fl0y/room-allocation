'use client';
// Dashboard-ul profesorului (Lotul 6b, D38, D42): cererea (pereche sau interval), decizia cu explicația și
// alternativele, rezervările proprii cu istoricul mutărilor și anularea.

import { useEffect, useMemo, useState } from 'react';
import s from '../ui.module.css';
import { DecisionView } from '../components/DecisionView.tsx';
import {
  ACTIVITY,
  ROOM_TYPE,
  STATUS,
  api,
  dayLabel,
  periodLabel,
  studentsOf,
  unitTree,
  type ActivityType,
  type ListedBooking,
  type Meta,
  type Request,
  type RoomType,
  type ServiceDecision,
} from '../lib/client.ts';

/** Cerințele implicite pe tip de activitate (D42); profesorul le poate schimba. */
const DEFAULTS: Record<ActivityType, { roomTypes: RoomType[]; computersPerStudent: boolean; projector: boolean }> = {
  lecture: { roomTypes: ['auditorium'], computersPerStudent: false, projector: true },
  seminar: { roomTypes: ['seminar', 'auditorium', 'lab'], computersPerStudent: false, projector: false },
  lab: { roomTypes: ['lab'], computersPerStudent: true, projector: false },
  exam: { roomTypes: ['lab'], computersPerStudent: true, projector: false },
  event: { roomTypes: ['auditorium'], computersPerStudent: false, projector: true },
  other: { roomTypes: ['seminar', 'auditorium'], computersPerStudent: false, projector: false },
};

const newId = (teacher: string) => `${teacher || 'cerere'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function TeacherView() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState(1);
  const [useInterval, setUseInterval] = useState(false);
  const [latest, setLatest] = useState(3);
  const [length, setLength] = useState(1);
  const [units, setUnits] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activity, setActivity] = useState<ActivityType>('seminar');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(DEFAULTS.seminar.roomTypes);
  const [computersPerStudent, setComputersPerStudent] = useState(false);
  const [projector, setProjector] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ decision: ServiceDecision; request: Request; replayed: boolean } | null>(null);
  const [bookings, setBookings] = useState<ListedBooking[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    api.meta().then(
      (m) => {
        setMeta(m);
        setTeacher(m.teachers[0]?.id ?? '');
        setDate(m.days[0] ?? '');
      },
      (e: Error) => setError(e.message),
    );
  }, []);

  // D42: un identificator nou la fiecare schimbare a formularului; aceeași cerere retrimisă păstrează cheia
  useEffect(() => {
    setRequestId(newId(teacher));
  }, [teacher, date, start, useInterval, latest, length, units, activity, roomTypes, computersPerStudent, projector, fixed]);

  const refresh = () => {
    if (teacher) api.bookings({ teacher }).then((r) => setBookings(r.bookings), (e: Error) => setError(e.message));
  };
  useEffect(refresh, [teacher]);

  const tree = useMemo(() => (meta ? unitTree(meta.units) : []), [meta]);
  const students = meta ? studentsOf(meta.units, units) : 0;

  function chooseActivity(a: ActivityType) {
    setActivity(a);
    setRoomTypes(DEFAULTS[a].roomTypes);
    setComputersPerStudent(DEFAULTS[a].computersPerStudent);
    setProjector(DEFAULTS[a].projector);
    if (a !== 'exam' && a !== 'event') setFixed(false);
  }

  const request: Request = {
    id: requestId,
    teacher,
    units,
    activity,
    needs: {
      roomTypes,
      ...(computersPerStudent ? { minComputers: students } : {}),
      ...(projector ? { projector: true } : {}),
    },
    date,
    start,
    length,
    ...(useInterval ? { latest } : {}),
    ...(fixed ? { status: 'fixed' as const } : {}),
  };

  async function send() {
    setSending(true);
    setError(null);
    try {
      const r = await api.submit(request);
      setResult({ decision: r.decision, request, replayed: r.replayed });
      if (r.decision.kind === 'accepted') refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function cancel(id: string) {
    setConfirming(null);
    try {
      await api.cancel(id, { teacher });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!meta) return <p>{error ? <span className="bad">{error}</span> : 'Se încarcă…'}</p>;
  const P = meta.grid.periods.length;
  const visibleUnits = tree.filter(({ unit }) => !search || `${unit.id} ${unit.name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <h1>Profesor</h1>
      <div className={s.row}>
        <label className={s.field}>
          <span>Profesorul (pseudonim)</span>
          <select value={teacher} onChange={(e) => setTeacher(e.target.value)} aria-label="Profesorul">
            {meta.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id}
                {t.name && t.name !== t.id ? ` — ${t.name}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={s.two}>
        <section>
          <h2>Cerere nouă</h2>
          <div className={s.row}>
            <label className={s.field}>
              <span>Ziua</span>
              <select value={date} onChange={(e) => setDate(e.target.value)} aria-label="Ziua">
                {meta.days.map((d) => (
                  <option key={d} value={d}>
                    {dayLabel(d)}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span>{useInterval ? 'De la perechea' : 'Perechea'}</span>
              <select value={start} onChange={(e) => setStart(Number(e.target.value))} aria-label="Perechea">
                {meta.grid.periods.map((p) => (
                  <option key={p.index} value={p.index}>
                    {p.index} ({p.start})
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span>Durata</span>
              <select value={length} onChange={(e) => setLength(Number(e.target.value))} aria-label="Durata">
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'pereche' : 'perechi'}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={s.row} style={{ marginTop: '0.5rem' }}>
            <label>
              <input type="checkbox" checked={useInterval} onChange={(e) => setUseInterval(e.target.checked)} /> accept și alte perechi (interval)
            </label>
            {useInterval && (
              <label className={s.field}>
                <span>Cel târziu până la perechea</span>
                <select value={latest} onChange={(e) => setLatest(Number(e.target.value))} aria-label="Ultima pereche">
                  {Array.from({ length: P }, (_, i) => i + 1)
                    .filter((p) => p >= start + length - 1)
                    .map((p) => (
                      <option key={p} value={p}>
                        {p} (se termină la {meta.grid.periods[p - 1]!.end})
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>

          <h3>Activitatea și participanții</h3>
          <div className={s.row}>
            <label className={s.field}>
              <span>Tipul</span>
              <select value={activity} onChange={(e) => chooseActivity(e.target.value as ActivityType)} aria-label="Tipul activității">
                {(Object.keys(ACTIVITY) as ActivityType[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTIVITY[a]}
                  </option>
                ))}
              </select>
            </label>
            {(activity === 'exam' || activity === 'event') && (
              <label>
                <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} /> fixă (nu se mută, D19)
              </label>
            )}
          </div>
          <label className={s.field} style={{ marginTop: '0.5rem' }}>
            <span>Grupele ({units.length ? `${units.join(', ')} — ${students} studenți` : 'nicio unitate aleasă'})</span>
            <input type="search" placeholder="Caută flux, grupă, subgrupă…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Caută unități" />
          </label>
          <div className={s.unitList} role="group" aria-label="Unități">
            {visibleUnits.map(({ unit, depth }) => (
              <label key={unit.id} style={{ paddingLeft: `${depth * 1.1}rem` }}>
                <input
                  type="checkbox"
                  checked={units.includes(unit.id)}
                  onChange={(e) => setUnits((u) => (e.target.checked ? [...u, unit.id] : u.filter((x) => x !== unit.id)))}
                />{' '}
                {unit.id} <span className="muted">({unit.kind === 'flux' ? 'flux' : unit.kind === 'group' ? 'grupă' : 'subgrupă'}, {unit.students})</span>
              </label>
            ))}
          </div>

          <h3>Sala</h3>
          <div className={s.checks} role="group" aria-label="Tipuri de sală acceptate">
            {(Object.keys(ROOM_TYPE) as RoomType[]).map((t) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={roomTypes.includes(t)}
                  onChange={(e) => setRoomTypes((r) => (e.target.checked ? [...r, t] : r.filter((x) => x !== t)))}
                />{' '}
                {ROOM_TYPE[t]}
              </label>
            ))}
          </div>
          <div className={s.checks} style={{ marginTop: '0.4rem' }}>
            <label>
              <input type="checkbox" checked={computersPerStudent} onChange={(e) => setComputersPerStudent(e.target.checked)} /> calculator pentru fiecare student
            </label>
            <label>
              <input type="checkbox" checked={projector} onChange={(e) => setProjector(e.target.checked)} /> proiector
            </label>
          </div>
          <div className={s.row} style={{ marginTop: '1rem' }}>
            <button className="primary" onClick={send} disabled={sending || !units.length || !roomTypes.length}>
              Trimite cererea
            </button>
            <span className="muted" title="Identificatorul cererii; o retrimitere identică nu creează a doua rezervare">
              {requestId}
            </span>
          </div>
          {error && <p className={s.error}>{error}</p>}
          {result && <DecisionView key={result.request.id} decision={result.decision} request={result.request} replayed={result.replayed} onApplied={refresh} />}
        </section>

        <section>
          <h2>Rezervările mele</h2>
          {!bookings.length ? (
            <p className="muted">Nicio rezervare.</p>
          ) : (
            <table className={s.table} data-testid="my-bookings">
              <thead>
                <tr>
                  <th>Ziua</th>
                  <th>Ora</th>
                  <th>Sala</th>
                  <th>Activitatea</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const last = b.history[b.history.length - 1];
                  return (
                    <tr key={b.id}>
                      <td>{dayLabel(b.date)}</td>
                      <td>
                        {b.time}
                        <br />
                        <span className="muted">{periodLabel(b.start, b.length)}</span>
                      </td>
                      <td>
                        {b.roomId}
                        {last && (
                          <span className={s.badge} title={b.history.map((h) => `${h.from} → ${h.to} (${h.cause})`).join('; ')}>
                            mutată de algoritm ({last.from} → {last.to})
                          </span>
                        )}
                      </td>
                      <td>
                        {ACTIVITY[b.activity]}, {b.units.join(', ')}
                        {b.status !== 'movable' && <span className={s.badge}>{STATUS[b.status]}</span>}
                        {b.blockId && <span className={s.badge}>bloc rupt</span>}
                      </td>
                      <td>
                        {confirming === b.id ? (
                          <>
                            <button className="danger" onClick={() => cancel(b.id)}>
                              Confirm anularea
                            </button>{' '}
                            <button onClick={() => setConfirming(null)}>Nu</button>
                          </>
                        ) : (
                          <button onClick={() => setConfirming(b.id)}>Anulează</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
