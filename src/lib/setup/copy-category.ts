import type { UpsertVariableInput } from '~src/lib/leaderboard-variables';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../types/moderation.types';

export interface CopyChoices {
    rules: boolean;
    timing: boolean;
    proof: boolean;
    minimum: boolean;
    variables: boolean;
}

export type CopyStep =
    | { kind: 'rules'; rules: string }
    | {
          kind: 'timing';
          primaryTiming: 'realtime' | 'gametime';
          hideRealTime: boolean;
          hideGameTime: boolean;
      }
    | {
          kind: 'proof';
          requireVideo: boolean;
          requireVideoTopN: number | null;
          showMilliseconds: boolean;
      }
    | {
          kind: 'minimum';
          value: { minTimeMs?: number; minGameTimeMs?: number };
          targetPolicyId: number | null;
      }
    | { kind: 'variable'; body: UpsertVariableInput }
    | { kind: 'combinations'; sourceCategoryId: number };

export interface CopyPlan {
    steps: CopyStep[];
    /** Human labels for anything the target already has a value for, so the
     *  UI can warn what's about to be replaced. */
    overwrites: string[];
}

function mapTiming(t: 'rt' | 'gt'): 'realtime' | 'gametime' {
    return t === 'gt' ? 'gametime' : 'realtime';
}

// Category-scoped (not subcategory-scoped) min_time policy for one category
// — the same shape the Standards surface manages one of per category.
function findCategoryMinPolicy(
    policies: BoardPolicyRow[],
    categoryId: number,
): BoardPolicyRow | undefined {
    return policies.find(
        (p) =>
            p.policyType === 'min_time' &&
            p.categoryId === categoryId &&
            p.subcategoryKey == null,
    );
}

/**
 * Pure planner: turns "copy category A into category B" plus the caller's
 * per-section choices into an ordered list of write steps and a list of
 * human-readable overwrite warnings. Does no I/O — the editor UI executes
 * the plan sequentially against the real actions.
 */
export function planCategoryCopy(input: {
    source: ResolvedCategory;
    target: ResolvedCategory;
    choices: CopyChoices;
    variables: VariableRow[];
    policies: BoardPolicyRow[];
}): CopyPlan {
    const { source, target, choices, variables, policies } = input;
    const steps: CopyStep[] = [];
    const overwrites: string[] = [];

    if (choices.rules) {
        const sourceRules = (source.rules ?? '').trim();
        if (sourceRules.length > 0) {
            steps.push({ kind: 'rules', rules: source.rules as string });
            const targetRules = (target.rules ?? '').trim();
            if (targetRules.length > 0) overwrites.push('Rules');
        }
    }

    if (choices.timing) {
        steps.push({
            kind: 'timing',
            primaryTiming: mapTiming(source.primaryTiming),
            hideRealTime: source.hideRealTime ?? false,
            hideGameTime: source.hideGameTime ?? false,
        });
        // Every existing category already has a resolved timing config
        // (primaryTiming is required), so applying this step always
        // replaces something real.
        overwrites.push('Timing');
    }

    if (choices.proof) {
        steps.push({
            kind: 'proof',
            requireVideo: source.requireVideo ?? false,
            requireVideoTopN: source.requireVideoTopN ?? null,
            showMilliseconds: source.showMilliseconds ?? false,
        });
        const targetHasProof =
            (target.requireVideo ?? false) ||
            target.requireVideoTopN != null ||
            (target.showMilliseconds ?? false);
        if (targetHasProof) overwrites.push('Proof');
    }

    if (choices.minimum) {
        const sourcePolicy = findCategoryMinPolicy(policies, source.id);
        if (sourcePolicy) {
            const targetPolicy = findCategoryMinPolicy(policies, target.id);
            steps.push({
                kind: 'minimum',
                value: sourcePolicy.value as {
                    minTimeMs?: number;
                    minGameTimeMs?: number;
                },
                targetPolicyId: targetPolicy?.id ?? null,
            });
            if (targetPolicy) overwrites.push('Minimum time');
        }
    }

    if (choices.variables) {
        const sourceVars = variables.filter((v) => v.categoryId === source.id);
        if (sourceVars.length > 0) {
            for (const v of sourceVars) {
                steps.push({
                    kind: 'variable',
                    body: {
                        categoryId: target.id,
                        name: v.name,
                        role: v.role,
                        values: v.values,
                        defaultValueIndex: v.defaultValueIndex,
                        sortOrder: v.sortOrder,
                    },
                });
            }
            steps.push({ kind: 'combinations', sourceCategoryId: source.id });

            const targetVarCount = variables.filter(
                (v) => v.categoryId === target.id,
            ).length;
            if (targetVarCount > 0) {
                overwrites.push(`Variables (${targetVarCount})`);
            }
        }
    }

    return { steps, overwrites };
}
