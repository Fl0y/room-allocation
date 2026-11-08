import { allocate, type AllocateOptions, type Decision } from '../engine/allocate.ts';
import { repairClosure, type RepairReport } from '../engine/repair.ts';
import type { Closure, Instance, Request, State } from '../engine/types.ts';

export type Step =
  | { kind: 'request'; request: Request; note?: string }
  | { kind: 'closure'; closure: Closure; note?: string };

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  /** Rezultatul așteptat, formulat de mână în concept (§6); se compară cu rezultatul motorului. */
  expected: string;
  instance: Instance;
  initial: State;
  steps: Step[];
  options?: AllocateOptions;
}

export interface StepResult {
  step: Step;
  before: State;
  after: State;
  decision?: Decision;
  repair?: RepairReport;
}

/** Rulează pașii unui scenariu, în ordinea sosirii; fiecare pas pornește din starea lăsată de cel anterior. */
export function runScenario(scenario: Scenario, override: AllocateOptions = {}): StepResult[] {
  const options = { ...scenario.options, ...override };
  const results: StepResult[] = [];
  let state = scenario.initial;
  for (const step of scenario.steps) {
    if (step.kind === 'request') {
      const decision = allocate(scenario.instance, state, step.request, options);
      const after = decision.kind === 'accepted' ? decision.state : state;
      results.push({ step, before: state, after, decision });
      state = after;
    } else {
      const repair = repairClosure(scenario.instance, state, step.closure, options);
      results.push({ step, before: state, after: repair.state, repair });
      state = repair.state;
    }
  }
  return results;
}
