import { SETUP_STEP_ORDER, type SetupStepId } from './completeness';

export interface SetupStepMeta {
    id: SetupStepId;
    /** 1-5, matches the ghost numeral in the wizard's step header. */
    num: number;
    label: string;
    skippable: boolean;
}

/**
 * Canonical step presentation. `completeness.ts` owns step *status*; this owns
 * how a step is named and numbered, so the wizard rail, the console checklist
 * card and the finish-step review list can't drift apart again.
 *
 * Order must match SETUP_STEP_ORDER — asserted in steps.test.ts.
 */
export const SETUP_STEPS: SetupStepMeta[] = [
    { id: 'details', num: 1, label: 'Game details', skippable: true },
    { id: 'categories', num: 2, label: 'Categories', skippable: true },
    { id: 'defaults', num: 3, label: 'Defaults', skippable: true },
    { id: 'exceptions', num: 4, label: 'Exceptions', skippable: true },
    { id: 'finish', num: 5, label: 'Go live', skippable: false },
];

export const SETUP_STEP_LABELS: Record<SetupStepId, string> =
    Object.fromEntries(SETUP_STEPS.map((s) => [s.id, s.label])) as Record<
        SetupStepId,
        string
    >;

export function setupStepMeta(id: SetupStepId): SetupStepMeta {
    const meta = SETUP_STEPS.find((s) => s.id === id);
    // SetupStepId is exhaustively covered by SETUP_STEPS (see steps.test.ts).
    if (!meta) throw new Error(`Unknown setup step: ${id}`);
    return meta;
}

export function setupStepIndex(id: SetupStepId): number {
    return SETUP_STEPS.findIndex((s) => s.id === id);
}

export { SETUP_STEP_ORDER };
