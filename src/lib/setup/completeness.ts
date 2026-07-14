import type { ResolvedCategory } from '../../../types/leaderboards.types';

export type SetupStepId =
    | 'welcome'
    | 'details'
    | 'categories'
    | 'timing'
    | 'variables'
    | 'rules'
    | 'standards'
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
    'timing',
    'variables',
    'rules',
    'standards',
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
    const active = input.categories.filter((c) => c.active);
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

    if (input.categories.length === 0) {
        // Ingestion-empty board: categories appear when runs arrive; the
        // wizard is completable without them (spec: empty-board exception).
        steps.push({
            step: 'categories',
            status: 'done',
            summary: 'No ingested categories yet — they appear as runs arrive',
        });
    } else if (active.length === 0) {
        steps.push({
            step: 'categories',
            status: 'blocker',
            summary: 'No categories are shown on the board',
        });
    } else if (!active.some((c) => c.isMain)) {
        steps.push({
            step: 'categories',
            status: 'blocker',
            summary: 'No main category selected',
        });
    } else {
        steps.push({
            step: 'categories',
            status: 'done',
            summary: `${active.length} shown / ${
                input.categories.length - active.length
            } hidden`,
        });
    }

    steps.push({
        step: 'timing',
        status: 'done',
        summary: 'Timing follows ingested defaults unless changed',
    });

    steps.push({
        step: 'variables',
        status: 'done',
        summary:
            input.variableCount > 0
                ? `${input.variableCount} variable${
                      input.variableCount === 1 ? '' : 's'
                  }`
                : 'None configured (optional)',
    });

    const activeWithoutRules = active.filter((c) => !c.hasRules);
    if (input.categories.length === 0 || activeWithoutRules.length === 0) {
        steps.push({ step: 'rules', status: 'done', summary: 'Rules set' });
    } else {
        steps.push({
            step: 'rules',
            status: 'warning',
            summary: `${activeWithoutRules.length} categor${
                activeWithoutRules.length === 1 ? 'y has' : 'ies have'
            } no rules`,
        });
    }

    steps.push(
        input.policyCount > 0 || input.requireVideoAnywhere
            ? {
                  step: 'standards',
                  status: 'done',
                  summary: 'Verification standards set',
              }
            : {
                  step: 'standards',
                  status: 'warning',
                  summary: 'No video requirement or minimum time',
              },
    );

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
