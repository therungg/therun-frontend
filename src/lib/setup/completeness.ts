import type { ResolvedCategory } from '../../../types/leaderboards.types';

export type SetupStepId =
    | 'welcome'
    | 'details'
    | 'categories'
    | 'category-config'
    | 'defaults'
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
}

export interface CompletenessInput {
    categories: CategoryFacts[];
    variableCount: number;
    policyCount: number;
    requireVideoAnywhere: boolean;
    slug: string | null;
    abbreviation: string | null;
    moderatorCount: number;
    configured: boolean;
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
    'welcome',
    'details',
    'categories',
    'category-config',
    'defaults',
    'finish',
];

export function categoryFactsFromResolved(
    categories: ResolvedCategory[],
): CategoryFacts[] {
    return categories.map((c) => ({
        id: c.id,
        display: c.display,
        active: c.active ?? true,
        isMain: c.isMain ?? false,
        hasRules: (c.rules ?? '').trim().length > 0,
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

    steps.push({ step: 'welcome', status: 'done', summary: 'Board snapshot' });

    steps.push(
        input.slug && input.abbreviation
            ? {
                  step: 'details',
                  status: 'done',
                  summary: `Slug ${input.slug} · abbreviation ${input.abbreviation}`,
              }
            : {
                  step: 'details',
                  status: 'todo',
                  summary: 'Slug or abbreviation missing',
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
            summary: 'No categories are marked main (shown on the board)',
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

    if (emptyBoard || mains.length === 0) {
        steps.push({
            step: 'category-config',
            status: 'todo',
            summary: 'Configure categories after choosing mains',
        });
    } else {
        const mainsWithoutRules = mains.filter((c) => !c.hasRules);
        if (mainsWithoutRules.length === 0) {
            steps.push({
                step: 'category-config',
                status: 'done',
                summary: `All ${mains.length} main categories configured`,
            });
        } else {
            steps.push({
                step: 'category-config',
                status: 'warning',
                summary: `${mainsWithoutRules.length} of ${mains.length} main categories not configured`,
            });
        }
    }

    const hasDefaultsContent =
        input.variableCount > 0 ||
        input.policyCount > 0 ||
        input.requireVideoAnywhere;
    steps.push({
        step: 'defaults',
        status: 'done',
        summary: hasDefaultsContent
            ? `${input.variableCount} variable${
                  input.variableCount === 1 ? '' : 's'
              } · standards set`
            : 'Optional bulk settings',
    });

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
