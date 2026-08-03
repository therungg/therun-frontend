// Pure per-category setup status for the setup hub screen: what a row shows
// and whether it needs attention. No fetching — callers assemble the
// category, its variables, and the board's min_time policies first.
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../types/moderation.types';
import { formatTimeInput } from '../time-input';
import {
    findCategoryMinPolicy,
    findGameMinPolicy,
    minMsFromPolicy,
} from './game-minimum';

/** Variables are category-scoped only: the count is the category's own rows. */
function categoryVariableCount(
    categoryId: number,
    variables: VariableRow[],
): number {
    return variables.filter((v) => v.categoryId === categoryId).length;
}

export interface CategorySetupStatus {
    categoryId: number;
    ok: boolean;
    /** Human parts for the hub row, e.g. ['RTA', 'min 10:00', '2 variables'] */
    parts: string[];
    /** What's missing, e.g. ['rules'] — nonempty => warning row */
    missing: string[];
}

export function categorySetupStatus(
    cat: ResolvedCategory,
    variables: VariableRow[],
    policies: BoardPolicyRow[],
): CategorySetupStatus {
    const parts: string[] = [cat.primaryTiming === 'gt' ? 'IGT' : 'RTA'];
    const missing: string[] = [];

    if (!(cat.rules ?? '').trim()) {
        missing.push('rules');
    }

    const categoryPolicy = findCategoryMinPolicy(policies, cat.id);
    const gamePolicy = findGameMinPolicy(policies);
    const minPolicy = categoryPolicy ?? gamePolicy;
    const minMs = minMsFromPolicy(minPolicy, cat.primaryTiming);
    if (minMs !== null) {
        const label = `min ${formatTimeInput(minMs)}`;
        parts.push(categoryPolicy ? label : `${label} (game-wide)`);
    }

    const variableCount = categoryVariableCount(cat.id, variables);
    if (variableCount > 0) {
        parts.push(
            `${variableCount} variable${variableCount === 1 ? '' : 's'}`,
        );
    }

    return {
        categoryId: cat.id,
        ok: missing.length === 0,
        parts,
        missing,
    };
}
