import { THRESHOLDS } from '~src/components/fast50/deck/evaluators';
import type { PostRun } from './dossier.types';
import type { PrepGoal } from './prep.types';

export type VerdictKind =
    | 'demolished'
    | 'hit'
    | 'missed'
    | 'died'
    | 'no-target';

export interface Verdict {
    kind: VerdictKind;
    deltaMs: number | null; // final - target; negative = beat it
}

export const calledShotVerdict = (
    goal: PrepGoal,
    postRun: PostRun | null,
): Verdict => {
    if (!postRun || postRun.finalTimeMs <= 0) {
        return { kind: 'died', deltaMs: null };
    }
    if (!goal.targetTimeMs) return { kind: 'no-target', deltaMs: null };
    const deltaMs = postRun.finalTimeMs - goal.targetTimeMs;
    if (deltaMs <= -THRESHOLDS.verdictDemolishMarginMs) {
        return { kind: 'demolished', deltaMs };
    }
    if (deltaMs <= 0) return { kind: 'hit', deltaMs };
    return { kind: 'missed', deltaMs };
};
