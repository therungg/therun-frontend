export interface ReorderChange {
    categoryId: number;
    sortOrder: number;
}

export interface ReorderResult {
    /** Scope rows' ids in their new order. */
    orderedIds: number[];
    /** Only the rows whose sortOrder actually changes (1..N assignment diffed against current). */
    changes: ReorderChange[];
}

/**
 * Renumbers a Featured group scope after a move: the scope's rows (in
 * their current DISPLAY order) get `fromIndex`'s row moved to `toIndex`,
 * then every row is assigned 1..N — but only rows whose stored sortOrder
 * differs from their new number are emitted as changes, so an untouched
 * tail costs no PUTs.
 */
export function computeReorderChanges(
    scopeRows: { id: number; sortOrder: number }[],
    fromIndex: number,
    toIndex: number,
): ReorderResult {
    const valid =
        fromIndex >= 0 &&
        fromIndex < scopeRows.length &&
        toIndex >= 0 &&
        toIndex < scopeRows.length &&
        fromIndex !== toIndex;
    if (!valid) {
        return { orderedIds: scopeRows.map((r) => r.id), changes: [] };
    }
    const next = scopeRows.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const changes: ReorderChange[] = [];
    next.forEach((r, i) => {
        const target = i + 1;
        if (r.sortOrder !== target) {
            changes.push({ categoryId: r.id, sortOrder: target });
        }
    });
    return { orderedIds: next.map((r) => r.id), changes };
}
