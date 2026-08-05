import { SETUP_STEP_ORDER, type SetupStepId } from './completeness';

export interface SetupStepMeta {
    id: SetupStepId;
    /** 1-5, matches the ghost numeral in the wizard's step header. */
    num: number;
    label: string;
    skippable: boolean;
    /**
     * Step works across a wide table rather than down a form, so the shell
     * gives it the full page width instead of the reading-width column the
     * form steps want.
     */
    wide?: boolean;
}

/**
 * Canonical step presentation. `completeness.ts` owns step *status*; this owns
 * how a step is named and numbered, so the wizard rail, the console checklist
 * card and the boards-step review list can't drift apart again.
 *
 * Order must match SETUP_STEP_ORDER — asserted in steps.test.ts.
 */
export const SETUP_STEPS: SetupStepMeta[] = [
    { id: 'details', num: 1, label: 'Game details', skippable: true },
    { id: 'categories', num: 2, label: 'Categories', skippable: true },
    { id: 'groups', num: 3, label: 'Groups', skippable: true },
    {
        id: 'category-setup',
        num: 4,
        label: 'Category setup',
        skippable: true,
        wide: true,
    },
    { id: 'boards', num: 5, label: 'Boards', skippable: false, wide: true },
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

/**
 * Retired `?step=` values from the seven-step wizard, mapped onto whichever
 * of the five steps now owns that work. Bookmarks, links in old Discord
 * messages and the console's own deep links all predate the change, so the
 * ids have to keep resolving rather than silently dumping the moderator on
 * whatever step happens to be incomplete.
 *
 * `exceptions` folded into the per-category editor; `defaults` became the
 * board-defaults half of step 1; `finish` is now the go-live footer under
 * board curation. `variables` was the shared-variables step — variables are
 * category-scoped now, so its work lives in the per-category editor.
 */
export const LEGACY_STEP_MAP: Record<string, SetupStepId> = {
    defaults: 'details',
    exceptions: 'category-setup',
    finish: 'boards',
    variables: 'category-setup',
};

/**
 * Resolves a raw `?step=` value to a step id, honouring the legacy map.
 * Returns null when the value names nothing — callers fall back to
 * `firstIncomplete`. Shared by the setup page (server) and the wizard shell
 * (client) so a cold deep link and a client-side one agree.
 */
export function resolveSetupStep(
    raw: string | null | undefined,
): SetupStepId | null {
    if (!raw) return null;
    if (SETUP_STEP_ORDER.includes(raw as SetupStepId)) {
        return raw as SetupStepId;
    }
    return LEGACY_STEP_MAP[raw] ?? null;
}

export { SETUP_STEP_ORDER };
