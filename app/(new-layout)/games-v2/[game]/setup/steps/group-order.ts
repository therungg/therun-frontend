/**
 * Draft ordering for the groups step. Unlike the hub's nudges (which write
 * through reorderCategoriesAction immediately), step 3 is a batch surface —
 * assignments live locally until "Save & continue" — so order moves are
 * local too, and the save pass writes groupId and sortOrder together.
 */

export interface GroupSaveChange {
    id: number;
    groupId?: number | null;
    sortOrder?: number;
}

/**
 * One global ordering of all featured ids; each column displays its members
 * in this order. Moving a category one step within its column swaps it with
 * its column-neighbor's global position, which leaves every other column's
 * relative order untouched.
 */
export function moveWithinScope(
    orderedIds: number[],
    scopeIds: ReadonlySet<number>,
    id: number,
    dir: -1 | 1,
): number[] {
    const scopePositions: { v: number; i: number }[] = [];
    orderedIds.forEach((v, i) => {
        if (scopeIds.has(v)) scopePositions.push({ v, i });
    });
    const k = scopePositions.findIndex((x) => x.v === id);
    const j = k + dir;
    if (k < 0 || j < 0 || j >= scopePositions.length) return orderedIds;
    const next = orderedIds.slice();
    next[scopePositions[k].i] = scopePositions[j].v;
    next[scopePositions[j].i] = id;
    return next;
}

/**
 * The writes the save pass owes: a groupId for every category whose column
 * changed, and — only when the moderator actually reordered something —
 * sortOrder 1..N per final column, diffed against stored values so an
 * untouched tail costs no writes. Without `writeOrder`, a save never touches
 * sortOrder at all: a moderator who only files categories must not have
 * explicit orders stamped onto a board that was happily living on the
 * playtime tiebreak.
 */
export function computeGroupSaveChanges(input: {
    /** Stored values, from the server read. */
    mains: { id: number; groupId: number | null; sortOrder: number }[];
    /** Final columns, each holding its member ids in display order. */
    columns: { groupId: number | null; ids: number[] }[];
    writeOrder: boolean;
}): GroupSaveChange[] {
    const storedById = new Map(input.mains.map((c) => [c.id, c]));
    const changes: GroupSaveChange[] = [];
    for (const col of input.columns) {
        col.ids.forEach((id, idx) => {
            const stored = storedById.get(id);
            if (!stored) return;
            const change: GroupSaveChange = { id };
            if ((stored.groupId ?? null) !== col.groupId) {
                change.groupId = col.groupId;
            }
            const target = idx + 1;
            if (input.writeOrder && stored.sortOrder !== target) {
                change.sortOrder = target;
            }
            if (
                change.groupId !== undefined ||
                change.sortOrder !== undefined
            ) {
                changes.push(change);
            }
        });
    }
    return changes;
}
