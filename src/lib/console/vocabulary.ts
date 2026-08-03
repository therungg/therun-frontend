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
    | 'moderators'
    | 'reassign'
    | 'variables'
    | 'combinations'
    | 'timing'
    | 'standards'
    | 'rules'
    | 'category-settings'
    | 'boards';

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
    moderators: 'Moderators',
    reassign: 'Merge games & categories',
    variables: 'Subcategories & filters',
    combinations: 'Sub-boards',
    timing: 'Timing',
    standards: 'Minimum time',
    rules: 'Rules',
    'category-settings': 'Settings',
    boards: 'Boards',
};

export function conceptLabel(id: ConceptId): string {
    return CONCEPT_LABEL[id];
}

/**
 * The console sections that get a tile on the `/manage` front door.
 *
 * `reports` is deliberately absent: it is the attention pane pre-filtered by
 * `?kind=report`, so a tile for it would be a second door to the same room.
 * The attention tile's blurb covers reports instead.
 *
 * Spelled out rather than derived from `NavItemId` because nav-model.ts
 * imports from this file — the reverse import would be circular. The
 * vocabulary test pins the two lists together.
 */
export const TILE_CONCEPT_IDS = [
    'attention',
    'roster',
    'bans',
    'history',
    'setup',
    'game-details',
    'categories',
    'groups',
    'boards',
    'moderators',
    'reassign',
] as const;

export type TileConceptId = (typeof TILE_CONCEPT_IDS)[number];

export interface ConceptTile {
    /** Verb-led title — what you came to do, not what the section is called. */
    action: string;
    /** One sentence naming the concrete things behind the tile. */
    blurb: string;
}

/**
 * Tile copy for the console front door. The sidebar keeps the terse nouns in
 * CONCEPT_LABEL; these are the same sections described as jobs, for a
 * moderator who has not learned the console yet.
 */
export const CONCEPT_TILE: Record<TileConceptId, ConceptTile> = {
    attention: {
        action: 'Review what’s waiting',
        blurb: 'Runs flagged for review, reports from runners, and people asking to moderate this board.',
    },
    roster: {
        action: 'Look up a run or runner',
        blurb: 'Search every submitted run, check a runner’s history, and act on anything you find.',
    },
    bans: {
        action: 'Manage banned runners',
        blurb: 'See who’s banned from this board and why, and lift a ban.',
    },
    history: {
        action: 'See what mods have done',
        blurb: 'Every moderation action on this board — who did it, when, and undo.',
    },
    setup: {
        action: 'Set the board up step by step',
        blurb: 'The guided walkthrough for configuring this board from scratch.',
    },
    'game-details': {
        action: 'Edit the game’s details',
        blurb: 'Cover art, release info, the board’s URL, and how it’s matched to IGDB.',
    },
    categories: {
        action: 'Configure categories',
        blurb: 'Browse the categories on this board and open any one to configure it.',
    },
    groups: {
        action: 'Sort categories into groups',
        blurb: 'Bundle related categories so the leaderboard reads in a sensible order.',
    },
    boards: {
        action: 'Curate the boards',
        blurb: 'See each leaderboard as runners do, and fix what’s wrong — remove, correct, or add runs.',
    },
    moderators: {
        action: 'Manage who moderates',
        blurb: 'Add or remove moderators, and review applications from people who want to help.',
    },
    reassign: {
        action: 'Merge duplicates',
        blurb: 'Fold a duplicate game or category into the right one and move its runs across.',
    },
};

/**
 * Which console concepts a wizard step covers. Two steps are multi-concept:
 * step 1 carries the board-wide timing and rules-template defaults alongside
 * the game's own details, and step 4 is every per-category setting on one
 * screen. The console reaches the per-category ones from the category index.
 */
export const STEP_CONCEPTS: Record<SetupStepId, ConceptId[]> = {
    // The URL slug lives inside the Game details pane, not beside it.
    details: ['game-details', 'timing', 'rules'],
    categories: ['categories'],
    groups: ['groups'],
    'category-setup': ['categories'],
    boards: ['boards'],
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
    'boards',
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
