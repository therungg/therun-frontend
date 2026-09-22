// One label per concept, shared by the wizard rail, the wizard step headers,
// the console nav and the detail section headings. `steps.ts` plays this role
// for step labels; this extends it across the wizard/console seam so the two
// can't drift apart again (they had: "Game details" vs "Details & metadata",
// "Categories" vs "Categories & visibility").
import type { SetupStepId } from '../setup/completeness';
import {
    WORKSPACE_KIND_LABEL,
    type WorkspacePaneId,
    type WorkspaceSubId,
    workspaceScreen,
} from '../setup/workspace';

export type ConceptId =
    | 'overview'
    | 'attention'
    | 'mod-queue'
    | 'all-runs'
    | 'auto-verify'
    | 'roster'
    | 'reports'
    | 'bans'
    | 'history'
    | 'setup'
    | 'game-details'
    | 'theme'
    | 'moderators'
    | 'reassign'
    | 'import'
    | 'match-runners'
    | 'variables'
    | 'combinations'
    | 'timing'
    | 'standards'
    | 'rules'
    | 'category-settings'
    | 'boards'
    | WorkspacePaneId;

export const CONCEPT_LABEL: Record<ConceptId, string> = {
    overview: 'Overview',
    attention: 'Needs attention',
    'mod-queue': 'Mod queue',
    'all-runs': 'All runs',
    'auto-verify': 'Verification',
    roster: 'Browse runs',
    reports: 'Reports',
    bans: 'Bans',
    history: 'History',
    setup: 'Setup wizard',
    'game-details': 'Game details',
    theme: 'Theme',
    moderators: 'Moderators',
    reassign: 'Merge games & categories',
    import: 'Import from speedrun.com',
    'match-runners': 'Match runners',
    variables: 'Subcategories & filters',
    combinations: 'Sub-boards',
    timing: 'Timing',
    standards: 'Minimum time',
    rules: 'Rules',
    'category-settings': 'Settings',
    boards: 'Boards',
    'categories/list': 'Categories',
    'categories/groups': 'Category groups',
    'categories/settings': 'Category settings',
    'categories/subcategories': 'Subcategories & filters',
    'levels/list': 'Levels',
    'levels/settings': 'Level settings',
    'levels/subcategories': 'Level subcategories & filters',
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
    'mod-queue',
    'all-runs',
    'attention',
    'roster',
    'bans',
    'history',
    'setup',
    'game-details',
    'theme',
    'categories/list',
    'categories/groups',
    'categories/settings',
    'categories/subcategories',
    'levels/list',
    'levels/settings',
    'levels/subcategories',
    'boards',
    'moderators',
    'reassign',
    'import',
    'match-runners',
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
    'mod-queue': {
        action: 'Decide what needs you',
        blurb: 'Reports and appeals first, then runs where a wrong call would show on the board, then routine runs in batches you can approve at once.',
    },
    'all-runs': {
        action: 'Find any run',
        blurb: 'Every run on or eligible for the board, pending ones too.',
    },
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
        blurb: 'Every moderation action on this board: who did it, when, and undo.',
    },
    setup: {
        action: 'Set the board up step by step',
        blurb: 'The guided walkthrough for configuring this board from scratch.',
    },
    'game-details': {
        action: 'Edit the game’s details',
        blurb: 'Cover art, release info, the board’s URL, and how it’s matched to IGDB.',
    },
    theme: {
        action: 'Customize the board’s look',
        blurb: 'Pick a color and an optional background image for this board.',
    },
    'categories/list': {
        action: 'Choose what is on the board',
        blurb: 'Add the categories runners submit to, make new ones, and set their order.',
    },
    'categories/groups': {
        action: 'Sort categories into groups',
        blurb: 'Bundle related categories so the leaderboard reads in a sensible order.',
    },
    'categories/settings': {
        action: 'Configure categories',
        blurb: 'Timing, minimum time, rules and milliseconds for every category.',
    },
    'categories/subcategories': {
        action: 'Split and narrow the boards',
        blurb: 'Subcategories turn a category into several leaderboards; filters narrow one down.',
    },
    'levels/list': {
        action: 'Set up individual levels',
        blurb: 'List the levels; each one is its own board on the Levels dropdown.',
    },
    'levels/settings': {
        action: 'Configure levels',
        blurb: 'Timing, minimum time, rules and milliseconds for every level.',
    },
    'levels/subcategories': {
        action: 'Split and narrow the level boards',
        blurb: 'Subcategories and filters for levels, set per level.',
    },
    boards: {
        action: 'Curate the boards',
        blurb: 'See each leaderboard as runners do, and fix what’s wrong: remove, correct or add runs.',
    },
    moderators: {
        action: 'Manage who moderates',
        blurb: 'Add or remove moderators, and review applications from people who want to help.',
    },
    reassign: {
        action: 'Merge duplicates',
        blurb: 'Fold a duplicate game or category into the right one and move its runs across.',
    },
    import: {
        action: 'Bring the board over from speedrun.com',
        blurb: 'Fetch categories, filters, runs and players from speedrun.com and review them before anything is written.',
    },
    'match-runners': {
        action: 'Match runners to speedrun.com',
        blurb: 'Link runners to their speedrun.com profiles so their verified runs leave the queue.',
    },
};

/**
 * Which console concepts a wizard step covers. Game details is multi-concept:
 * it carries the board-wide timing and rules-template defaults alongside the
 * game's own details. Categories and Levels cover their screens (list, groups,
 * settings, subcategories & filters) through their own panes.
 */
export const STEP_CONCEPTS: Record<SetupStepId, ConceptId[]> = {
    import: ['import'],
    // The URL slug lives inside the Game details pane, not beside it.
    details: ['game-details', 'timing', 'rules'],
    theme: ['theme'],
    categories: ['categories/list'],
    levels: ['levels/list'],
    verification: ['auto-verify'],
    'match-runners': ['match-runners'],
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
    'theme',
    'categories/list',
    'categories/groups',
    'categories/settings',
    'categories/subcategories',
    'levels/list',
    'levels/settings',
    'levels/subcategories',
    'boards',
    'auto-verify',
    'moderators',
    'reassign',
    'import',
    'match-runners',
]);

/**
 * Where a wizard step's work lives once setup is done. Categories and Levels
 * point at the page for the screen; other board-level steps point at their
 * own pane; per-category concepts point at the settings page rather than at
 * one arbitrary category.
 */
export function consoleLocationForStep(
    step: SetupStepId,
    sub: WorkspaceSubId | null = null,
): ConsoleLocation | null {
    if (step === 'categories' || step === 'levels') {
        const screen = workspaceScreen(step, sub ?? 'list');
        if (!screen) return null;
        return {
            crumb: `${WORKSPACE_KIND_LABEL[step]} ▸ ${screen.label}`,
            pane: `${step}/${screen.id}`,
        };
    }
    const concepts = STEP_CONCEPTS[step];
    if (concepts.length === 0) return null;
    const first = concepts[0];
    if (BOARD_PANES.has(first)) {
        return { crumb: CONCEPT_LABEL[first], pane: first };
    }
    return {
        crumb: `${CONCEPT_LABEL['categories/settings']} ▸ ${CONCEPT_LABEL[first]}`,
        pane: 'categories/settings',
    };
}
