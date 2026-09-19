import type {
    ResolvedCategory,
    VariableRow,
} from '../../../types/leaderboards.types';
import type { WorkspaceSubId } from './workspace';

export type SetupStepId =
    | 'import'
    | 'details'
    | 'theme'
    | 'categories'
    | 'levels'
    | 'verification'
    | 'match-runners'
    | 'boards';

export type SetupStepStatus = 'done' | 'todo' | 'warning' | 'blocker';

export interface SetupStepState {
    step: SetupStepId;
    status: SetupStepStatus;
    summary: string;
    /** For a Categories or Levels status that is not done: the screen that
     *  owns it, so a link lands on the fix. */
    sub?: WorkspaceSubId;
}

export interface CategoryFacts {
    id: number;
    display: string;
    active: boolean;
    isMain: boolean;
    hasRules: boolean;
    groupId: number | null;
}

export interface CompletenessInput {
    categories: CategoryFacts[];
    policyCount: number;
    requireVideoAnywhere: boolean;
    slug: string | null;
    moderatorCount: number;
    configured: boolean;
    groupCount: number;
    /** Featured categories sitting outside every group. */
    ungroupedMainCount: number;
    /** Whether the game has any saved verification settings row (game or
     *  category), for the verification step. */
    verificationConfigured: boolean;
    /** Whether the board has a custom theme, for the theme step's summary. */
    hasTheme?: boolean;
    /**
     * Distinct subcategory / filter variable names on the board, for the
     * Categories step's summary. Optional — an empty board has none, and the
     * step never blocks on them.
     */
    subcategoryVariableCount?: number;
    filterVariableCount?: number;
    /** Active level boards (categories in the game's `kind:'level'` group),
     *  for the levels step's summary. */
    levelCount?: number;
    /**
     * The board's link to its source, for the import step. `configAppliedAt`
     * is the moment a settings import actually wrote the board — a linked
     * board whose import never finished has not been set up from the source.
     */
    srcImport?: {
        linked: boolean;
        configAppliedAt: string | null;
        srcGameName: string | null;
    };
}

export interface BoardCompleteness {
    steps: SetupStepState[];
    /**
     * Nothing has been decided on this board yet: no settings import, no
     * theme, no standards, no groups, no verification settings and setup was
     * never marked complete. A board in this state is best served by one run
     * through the wizard rather than a half-finished progress meter.
     */
    untouched: boolean;
    firstIncomplete: SetupStepId | null;
    doneCount: number;
    totalCount: number;
    blockers: string[];
    warnings: string[];
}

export const SETUP_STEP_ORDER: SetupStepId[] = [
    'import',
    'details',
    'theme',
    'categories',
    'levels',
    'verification',
    'match-runners',
    'boards',
];

/**
 * Distinct subcategory/filter variable names from the per-category variable
 * rows, for the Categories step summary. Rows repeat a logical variable once per
 * category, so dedupe by nameNormalized within each role.
 */
export function variableFactsFromRows(variables: VariableRow[]): {
    subcategoryVariableCount: number;
    filterVariableCount: number;
} {
    const subs = new Set<string>();
    const filters = new Set<string>();
    for (const v of variables) {
        if (v.role === 'subcategory') subs.add(v.nameNormalized);
        else if (v.role === 'filter') filters.add(v.nameNormalized);
    }
    return {
        subcategoryVariableCount: subs.size,
        filterVariableCount: filters.size,
    };
}

export function categoryFactsFromResolved(
    categories: ResolvedCategory[],
): CategoryFacts[] {
    return categories.map((c) => ({
        id: c.id,
        display: c.display,
        active: !c.archived,
        isMain: c.isMain ?? false,
        hasRules: (c.rules ?? '').trim().length > 0,
        groupId: c.groupId ?? null,
    }));
}

export function computeCompleteness(
    input: CompletenessInput,
): BoardCompleteness {
    // "main" everywhere = active && isMain — not-main is not shown on the
    // leaderboard, so mains are the categories that actually appear.
    const mains = input.categories.filter((c) => c.active && c.isMain);
    const emptyBoard = input.categories.length === 0;
    const steps: SetupStepState[] = [];

    // The board's settings come from its source before anything is edited by
    // hand, so this is step 1 and stays open until one settings import has
    // actually written the board. A board that is never going to be linked
    // skips it like any other step.
    const src = input.srcImport;
    if (src?.configAppliedAt) {
        steps.push({
            step: 'import',
            status: 'done',
            summary: src.srcGameName
                ? `Imported from ${src.srcGameName}`
                : 'Settings imported',
        });
    } else {
        steps.push({
            step: 'import',
            status: 'todo',
            summary: src?.linked
                ? 'Linked — settings not imported yet'
                : 'Not linked to speedrun.com',
        });
    }

    // Board-wide defaults (timing, proof, minimum time, rules template) share
    // step 1 with the game's details, so their state rides on this summary
    // rather than carrying a step — and a missing slug still owns the line,
    // because that is the only thing here that is actually unfinished.
    const hasDefaultsContent =
        input.policyCount > 0 || input.requireVideoAnywhere;
    steps.push(
        input.slug
            ? {
                  step: 'details',
                  status: 'done',
                  summary: hasDefaultsContent
                      ? `Slug ${input.slug} · standards set`
                      : `Slug ${input.slug}`,
              }
            : {
                  step: 'details',
                  status: 'todo',
                  summary: 'Slug missing',
              },
    );

    // The default look is a finished board, so this never holds setup open.
    steps.push({
        step: 'theme',
        status: 'done',
        summary: input.hasTheme ? 'Custom theme' : 'Optional — default look',
    });

    // Categories is one step over four screens: List, Groups, Settings and
    // Subcategories & filters. It carries the first unfinished thing in that
    // order, tagged with the screen that fixes it. Subcategories and filters
    // are optional, so they only ever add to the summary.
    if (emptyBoard) {
        // Ingestion-empty board: categories appear when runs arrive; the
        // wizard is completable without them (spec: empty-board exception).
        steps.push({
            step: 'categories',
            sub: 'list',
            status: 'done',
            summary: 'No ingested categories yet — they appear as runs arrive',
        });
    } else if (mains.length === 0) {
        steps.push({
            step: 'categories',
            sub: 'list',
            status: 'blocker',
            summary: 'No categories are marked featured (shown on the board)',
        });
    } else if (input.groupCount > 1 && input.ungroupedMainCount > 0) {
        // Several groups with categories loose between them: the band can't
        // render that (labelled sections plus an unlabelled orphan row).
        steps.push({
            step: 'categories',
            sub: 'groups',
            status: 'blocker',
            summary: `${input.ungroupedMainCount} featured ${
                input.ungroupedMainCount === 1
                    ? 'category is'
                    : 'categories are'
            } not in a group`,
        });
    } else {
        const missingRules = mains.filter((c) => !c.hasRules).length;
        if (missingRules > 0) {
            steps.push({
                step: 'categories',
                sub: 'settings',
                status: 'warning',
                summary: `${missingRules} of ${mains.length} featured categories missing rules`,
            });
        } else {
            const subs = input.subcategoryVariableCount ?? 0;
            const filters = input.filterVariableCount ?? 0;
            const parts = [`${mains.length} on the board`];
            if (input.groupCount > 0) {
                parts.push(
                    `${input.groupCount} ${input.groupCount === 1 ? 'group' : 'groups'}`,
                );
            }
            if (subs > 0) {
                parts.push(
                    `${subs} ${subs === 1 ? 'subcategory' : 'subcategories'}`,
                );
            }
            if (filters > 0) {
                parts.push(
                    `${filters} ${filters === 1 ? 'filter' : 'filters'}`,
                );
            }
            steps.push({
                step: 'categories',
                status: 'done',
                summary: parts.join(' · '),
            });
        }
    }

    // Levels are optional and there is no signal for whether a game "should"
    // have levels, so this step is always done — only the summary reflects
    // the count.
    const levelCount = input.levelCount ?? 0;
    steps.push({
        step: 'levels',
        status: 'done',
        summary: levelCount > 0 ? `${levelCount} levels` : 'No levels yet',
    });

    // Whether a run needs a video before it counts, decided once here rather
    // than left to whatever the built-in defaults happen to be.
    steps.push(
        input.verificationConfigured
            ? {
                  step: 'verification',
                  status: 'done',
                  summary: 'Settings saved',
              }
            : { step: 'verification', status: 'todo', summary: 'Not set yet' },
    );

    steps.push({
        step: 'match-runners',
        status: 'done',
        summary: 'Optional',
    });

    steps.push(
        input.configured
            ? { step: 'boards', status: 'done', summary: 'Setup complete' }
            : {
                  step: 'boards',
                  status: 'todo',
                  summary: 'Setup not marked complete',
              },
    );

    const firstIncomplete =
        steps.find((s) => s.status !== 'done')?.step ?? null;
    const untouched =
        !input.configured &&
        !input.verificationConfigured &&
        !input.hasTheme &&
        !src?.configAppliedAt &&
        input.policyCount === 0 &&
        input.groupCount === 0;
    return {
        steps,
        untouched,
        firstIncomplete,
        doneCount: steps.filter((s) => s.status === 'done').length,
        totalCount: steps.length,
        blockers: steps
            .filter((s) => s.status === 'blocker')
            .map((s) => s.summary),
        warnings: steps
            .filter((s) => s.status === 'warning')
            .map((s) => s.summary),
    };
}
