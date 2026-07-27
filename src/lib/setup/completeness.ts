import type { ResolvedCategory } from '../../../types/leaderboards.types';

export type SetupStepId =
    | 'details'
    | 'categories'
    | 'groups'
    | 'variables'
    | 'defaults'
    | 'exceptions'
    | 'finish';

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
    variableCount: number;
    policyCount: number;
    requireVideoAnywhere: boolean;
    slug: string | null;
    moderatorCount: number;
    configured: boolean;
    groupCount: number;
    /** Featured categories sitting outside every group. */
    ungroupedMainCount: number;
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
    'variables',
    'defaults',
    'exceptions',
    'finish',
];

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

    steps.push(
        input.slug
            ? {
                  step: 'details',
                  status: 'done',
                  summary: `Slug ${input.slug}`,
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

    // Variables are optional too — plenty of games have one board per
    // category and nothing to split. Having none is a finished state.
    steps.push({
        step: 'variables',
        status: 'done',
        summary:
            input.variableCount > 0
                ? `${input.variableCount} ${
                      input.variableCount === 1 ? 'variable' : 'variables'
                  }`
                : 'Optional — no splits or filters',
    });

    const hasDefaultsContent =
        input.policyCount > 0 || input.requireVideoAnywhere;
    steps.push({
        step: 'defaults',
        status: 'done',
        summary: hasDefaultsContent
            ? 'Standards set'
            : 'Optional — game-wide defaults',
    });

    if (emptyBoard || mains.length === 0) {
        steps.push({
            step: 'exceptions',
            status: 'todo',
            summary: 'Review exceptions after choosing featured categories',
        });
    } else {
        const mainsWithoutRules = mains.filter((c) => !c.hasRules);
        if (mainsWithoutRules.length === 0) {
            steps.push({
                step: 'exceptions',
                status: 'done',
                summary: `All ${mains.length} featured categories have rules`,
            });
        } else {
            steps.push({
                step: 'exceptions',
                status: 'warning',
                summary: `${mainsWithoutRules.length} of ${mains.length} featured categories missing rules`,
            });
        }
    }

    steps.push(
        input.configured
            ? { step: 'finish', status: 'done', summary: 'Setup complete' }
            : {
                  step: 'finish',
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
