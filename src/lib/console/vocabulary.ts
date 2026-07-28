// One label per concept, shared by the wizard rail, the wizard step headers,
// the console nav and the detail section headings. `steps.ts` plays this role
// for step labels; this extends it across the wizard/console seam so the two
// can't drift apart again (they had: "Game details" vs "Details & metadata",
// "Categories" vs "Categories & visibility").
import type { SetupStepId } from '../setup/completeness';

export type ConceptId =
    | 'attention'
    | 'roster'
    | 'reports'
    | 'bans'
    | 'history'
    | 'setup'
    | 'game-details'
    | 'categories'
    | 'groups'
    | 'identifiers'
    | 'moderators'
    | 'reassign'
    | 'variables'
    | 'combinations'
    | 'timing'
    | 'proof'
    | 'standards'
    | 'rules'
    | 'category-settings';

export const CONCEPT_LABEL: Record<ConceptId, string> = {
    attention: 'Needs attention',
    roster: 'Browse runs',
    reports: 'Reports',
    bans: 'Bans',
    history: 'History',
    setup: 'Setup wizard',
    'game-details': 'Game details',
    categories: 'Categories',
    groups: 'Groups',
    identifiers: 'URL slug',
    moderators: 'Moderators',
    reassign: 'Merge games & categories',
    variables: 'Variables',
    combinations: 'Sub-boards',
    timing: 'Timing',
    proof: 'Proof & review',
    standards: 'Minimum time',
    rules: 'Rules',
    'category-settings': 'Settings',
};

export function conceptLabel(id: ConceptId): string {
    return CONCEPT_LABEL[id];
}

/**
 * Which console concepts a wizard step covers. Step 5 ("Defaults") is one
 * screen with four headings (step-defaults.tsx:261,335,395,463) and therefore
 * maps to four concepts; the console reaches all four from the category index.
 */
export const STEP_CONCEPTS: Record<SetupStepId, ConceptId[]> = {
    details: ['game-details', 'identifiers'],
    categories: ['categories'],
    groups: ['groups'],
    variables: ['variables', 'combinations'],
    defaults: ['timing', 'proof', 'standards', 'rules'],
    exceptions: ['categories'],
    finish: [],
};

export interface ConsoleLocation {
    /** Human breadcrumb for the wizard's wayfinding footer. */
    crumb: string;
    /** `?pane=` value to link to. */
    pane: string;
}

const BOARD_PANES: ReadonlySet<ConceptId> = new Set<ConceptId>([
    'game-details',
    'categories',
    'groups',
    'identifiers',
    'moderators',
    'reassign',
]);

/**
 * Where a wizard step's work lives once setup is done. Board-level steps point
 * at their own pane; per-category steps point at the index rather than at one
 * arbitrary category — which is what health.ts's STEP_PANE used to get wrong.
 */
export function consoleLocationForStep(
    step: SetupStepId,
): ConsoleLocation | null {
    const concepts = STEP_CONCEPTS[step];
    if (concepts.length === 0) return null;
    const first = concepts[0];
    if (BOARD_PANES.has(first)) {
        return { crumb: CONCEPT_LABEL[first], pane: first };
    }
    return {
        crumb: `${CONCEPT_LABEL.categories} ▸ ${CONCEPT_LABEL[first]}`,
        pane: 'categories',
    };
}
