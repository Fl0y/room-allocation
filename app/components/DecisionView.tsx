'use client';
// Decizia motorului: rezultatul, explicația, alternativele propuse cu butonul de aplicare (D18, D20).

import { useState } from 'react';
import s from '../ui.module.css';
import { api, dayLabel, periodLabel, type Alternative, type Request, type ServiceDecision } from '../lib/client.ts';

export function DecisionView(props: {
  decision: ServiceDecision;
  request: Request;
  replayed?: boolean;
  /** Eticheta butonului de aplicare (de exemplu „Aplică în numele profesorului”). */
  applyLabel?: string;
  onApplied?: (d: ServiceDecision) => void;
}) {
  const { decision, request } = props;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitOk, setSplitOk] = useState(false);
  const [applied, setApplied] = useState<ServiceDecision | null>(null);

  async function apply(alt: Alternative) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.applyAlternative(request, alt);
      setApplied(r.decision);
      props.onApplied?.(r.decision);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const accepted = decision.kind === 'accepted';
  return (
    <section className={`${s.decision} ${accepted ? s.accepted : s.rejected}`} aria-live="polite" data-testid="decision">
      <strong className={accepted ? 'ok' : 'bad'}>
        {accepted
          ? `Acceptată: sala ${decision.booking!.roomId}, ${dayLabel(decision.booking!.date)}, ${periodLabel(decision.booking!.start, decision.booking!.length)}`
          : 'Refuzată'}
      </strong>
      {props.replayed && <span className={s.badge}>cerere deja trimisă — aceeași decizie</span>}
      <ul className={s.explanation}>
        {/* alternativele apar mai jos, cu butoane; nu le repetăm în explicație */}
        {decision.explanation.filter((line) => !(decision.alternatives.length && (line.startsWith('• ') || line.startsWith('Alternative propuse')))).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      {!accepted && decision.alternatives.length > 0 && !applied && (
        <div>
          <h3>Alternative propuse</h3>
          {decision.alternatives.map((a, i) => (
            <div key={i} className={s.alt}>
              {a.kind === 'slot' ? (
                <span>
                  {dayLabel(a.date)}, {periodLabel(a.start, a.length)}, sala {a.roomId}
                  {a.moves ? ` (${a.moves === 1 ? 'o mutare' : `${a.moves} mutări`})` : ''}
                </span>
              ) : (
                <span>
                  Ruperea blocului (ultima opțiune, D20): {a.parts.map((p) => `${periodLabel(p.start, p.length)} în ${p.roomId}`).join(' + ')}{' '}
                  <label>
                    <input type="checkbox" checked={splitOk} onChange={(e) => setSplitOk(e.target.checked)} /> profesorul este de acord
                  </label>
                </span>
              )}
              <button className="primary" disabled={busy || (a.kind === 'split' && !splitOk)} onClick={() => apply(a)}>
                {props.applyLabel ?? 'Aplică'}
              </button>
            </div>
          ))}
        </div>
      )}
      {applied && (
        <p className={applied.kind === 'accepted' ? 'ok' : 'bad'} data-testid="applied">
          {applied.kind === 'accepted'
            ? `Alternativa a fost aplicată: sala ${applied.booking!.roomId}, ${dayLabel(applied.booking!.date)}, ${periodLabel(applied.booking!.start, applied.booking!.length)}.`
            : `Alternativa nu mai este posibilă: ${applied.explanation[0] ?? ''}`}
        </p>
      )}
      {error && <p className={s.error}>{error}</p>}
    </section>
  );
}
