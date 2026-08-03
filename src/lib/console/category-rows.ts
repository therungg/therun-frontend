// The matrix's single source of truth. Everything the index asserts is derived
// here so it can be tested without rendering a table.
//
// This module owns BOTH enum normalisations:
//   ResolvedCategory.primaryTiming  'rt' | 'gt'             (read)
//   PrimaryTiming                   'realtime' | 'gametime' (write)
// Nothing downstream may touch 'rt' | 'gt' again.
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../types/moderation.types';
import type { PrimaryTiming } from '../category-mgmt';
import { differingIds } from './agreement';

export interface CategoryConfigRow {
    id: number;
    display: string;
    groupId: number | null;
    groupName: string | null;
    sortOrder: number;
    isMain: boolean;
    archived: boolean;
    timing: PrimaryTiming;
    hideRealTime: boolean;
    hideGameTime: boolean;
    showMilliseconds: boolean;
    minTimeMs: number | null;
    hasRules: boolean;
    subBoards: number;
}

export type ColumnId = 'timing' | 'minimum' | 'rules' | 'subBoards';

export const COLUMN_IDS: readonly ColumnId[] = [
    'timing',
    'minimum',
    'rules',
    'subBoards',
];

export function toPrimaryTiming(t: 'rt' | 'gt'): PrimaryTiming {
    return t === 'gt' ? 'gametime' : 'realtime';
}

/**
 * How many leaderboards this category splits into. Variables are
 * category-scoped only, so this is a product over the category's own
 * published subcategory-role rows; filter-role ones don't split.
 *
 * Caveat: this is the open-mode maximum. A managed valid-combination set can
 * prune it. The approved variables redesign adds real combination counts; this
 * column shows the upper bound until then.
 */
export function subBoardCount(
    variables: VariableRow[],
    categoryId: number,
): number {
    let count = 1;
    for (const v of variables) {
        if (v.categoryId !== categoryId) continue;
        if (v.role !== 'subcategory' || !v.published) continue;
        if (v.values.length > 0) count *= v.values.length;
    }
    return count;
}

function minTimeFor(
    policies: BoardPolicyRow[],
    categoryId: number,
): number | null {
    const row = policies.find(
        (p) => p.policyType === 'min_time' && p.categoryId === categoryId,
    );
    // Value keys are { minTimeMs, minGameTimeMs } — rtMs/gtMs is the shape the
    // backend rejects, and a row carrying it must read as "unset", not as 0.
    const raw = row?.value?.minTimeMs;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

export function buildCategoryRows(input: {
    categories: ResolvedCategory[];
    policies: BoardPolicyRow[];
    variables: VariableRow[];
}): CategoryConfigRow[] {
    return input.categories.map((c) => ({
        id: c.id,
        display: c.display,
        groupId: c.groupId ?? null,
        groupName: c.groupName ?? null,
        sortOrder: c.sortOrder,
        isMain: c.isMain ?? false,
        archived: c.archived,
        timing: toPrimaryTiming(c.primaryTiming),
        hideRealTime: c.hideRealTime ?? false,
        hideGameTime: c.hideGameTime ?? false,
        showMilliseconds: c.showMilliseconds ?? false,
        minTimeMs: minTimeFor(input.policies, c.id),
        hasRules: (c.rules ?? '').trim().length > 0,
        subBoards: subBoardCount(input.variables, c.id),
    }));
}

/** The comparable key for a column — what "same" means for the ▲ marker. */
export function columnValue(
    row: CategoryConfigRow,
    column: ColumnId,
): string | number | boolean | null {
    switch (column) {
        case 'timing':
            return row.timing;
        case 'minimum':
            return row.minTimeMs;
        case 'rules':
            return row.hasRules;
        case 'subBoards':
            return row.subBoards;
    }
}

/**
 * Which categories are the odd one out, per column. Only featured, unarchived
 * categories take part: an archived category isn't on the board, so it can't
 * disagree with it.
 */
export function disagreementsByColumn(
    rows: CategoryConfigRow[],
): Record<ColumnId, Set<number>> {
    const featured = rows.filter((r) => r.isMain && !r.archived);
    const out = {} as Record<ColumnId, Set<number>>;
    for (const column of COLUMN_IDS) {
        out[column] = differingIds(
            featured.map((r) => ({ id: r.id, value: columnValue(r, column) })),
        );
    }
    return out;
}
