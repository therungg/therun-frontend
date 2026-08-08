import type {
    ResolvedCategory,
    VariableRow,
} from '../../../types/leaderboards.types';

export type SetupStepId =
    | 'details'
    | 'categories'
    | 'groups'
    | 'category-setup'
    | 'variables'
    | 'boards';

export type SetupStepStatus = 'done' | 'todo' | 'warning' | 'blocker';

export interface SetupStepState {
    step: SetupStepId;
    status: SetupStepStatus;
    summary: string;
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
    /**
     * Distinct subcategory / filter variable names on the board, for the
     * variables step's summary. Optional — an empty board has none, and the
     * step never blocks on them.
     */
    subcategoryVariableCount?: number;
    filterVariableCount?: number;
}

export interface BoardCompleteness {
    steps: SetupStepState[];
    firstIncomplete: SetupStepId | null;
    doneCount: number;
    totalCount: number;
    blockers: string[];
    warnings: string[];
}

export const SETUP_STEP_ORDER: SetupStepId[] = [
    'details',
    'categories',
    'groups',
    'category-setup',
    'variables',
    'boards',
];

/**
 * Distinct subcategory/filter variable names from the per-category variable
 * rows, for the variables step summary. Rows repeat a logical variable once per
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

    if (emptyBoard) {
        // Ingestion-empty board: categories appear when runs arrive; the
        // wizard is completable without them (spec: empty-board exception).
        steps.push({
            step: 'categories',
            status: 'done',
            summary: 'No ingested categories yet — they appear as runs arrive',
        });
    } else if (mains.length === 0) {
        steps.push({
            step: 'categories',
            status: 'blocker',
            summary: 'No categories are marked featured (shown on the board)',
        });
    } else {
        steps.push({
            step: 'categories',
            status: 'done',
            summary: `${mains.length} shown / ${
                input.categories.length - mains.length
            } hidden`,
        });
    }

    // Grouping is optional, so "no groups" is a finished state, not a todo.
    // The one unfinished shape is several groups with categories loose
    // between them — the band can't render that (labeled sections plus an
    // unlabeled orphan row), so it blocks.
    if (emptyBoard || mains.length === 0) {
        steps.push({
            step: 'groups',
            status: 'done',
            summary: 'Optional — nothing to group yet',
        });
    } else if (input.groupCount === 0) {
        steps.push({
            step: 'groups',
            status: 'done',
            summary: 'One flat list',
        });
    } else if (input.groupCount > 1 && input.ungroupedMainCount > 0) {
        steps.push({
            step: 'groups',
            status: 'blocker',
            summary: `${input.ungroupedMainCount} featured ${
                input.ungroupedMainCount === 1
                    ? 'category is'
                    : 'categories are'
            } not in a group`,
        });
    } else {
        steps.push({
            step: 'groups',
            status: 'done',
            summary: `${input.groupCount} ${
                input.groupCount === 1 ? 'group' : 'groups'
            }`,
        });
    }

    // Category settings are the per-category scalars on one screen — rules,
    // timing, minimum time, ranking direction. Rules are the one part that can
    // be genuinely missing, so they drive the status and the summary; the rest
    // ride along inside the step, not on this line. (Subcategories and filters
    // are now their own step, below.)
    if (emptyBoard || mains.length === 0) {
        steps.push({
            step: 'category-setup',
            status: 'todo',
            summary: 'Set up each category after choosing featured ones',
        });
    } else {
        const mainsWithoutRules = mains.filter((c) => !c.hasRules);
        if (mainsWithoutRules.length === 0) {
            steps.push({
                step: 'category-setup',
                status: 'done',
                summary: `All ${mains.length} featured categories have rules`,
            });
        } else {
            steps.push({
                step: 'category-setup',
                status: 'warning',
                summary: `${mainsWithoutRules.length} of ${mains.length} featured categories missing rules`,
            });
        }
    }

    // Subcategories and filters are optional — a single-board game needs none —
    // so this step never blocks; it reports what board structure exists.
    if (emptyBoard || mains.length === 0) {
        steps.push({
            step: 'variables',
            status: 'done',
            summary: 'Optional — appears once categories are featured',
        });
    } else {
        const subs = input.subcategoryVariableCount ?? 0;
        const filters = input.filterVariableCount ?? 0;
        steps.push({
            step: 'variables',
            status: 'done',
            summary:
                subs + filters === 0
                    ? 'Optional — single board, no splits or filters'
                    : `${subs} ${subs === 1 ? 'subcategory' : 'subcategories'} · ${filters} ${filters === 1 ? 'filter' : 'filters'}`,
        });
    }

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
    return {
        steps,
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
