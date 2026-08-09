import type { ResolvedCategory } from '../../../types/leaderboards.types';
import type { ManageCategoryRow } from '../category-mgmt';

/**
 * The Featured categories as the public band would list them right now,
 * including edits the console pane has made but not yet reloaded.
 *
 * The panes hold two views of the same categories: `ManageCategoryRow[]`,
 * which carries the live-edited flags, and `ResolvedCategory[]`, which is the
 * server snapshot the public renderer understands. Neither is enough on its
 * own — the rows have no slug, and the snapshot has stale flags — so the
 * preview reads the snapshot and lets the rows overwrite exactly the four
 * fields a pane can change.
 *
 * Featured-only, because that is the band's contract (see
 * computeCategoryVisibility): non-Featured categories are not publicly
 * viewable, so a preview that showed them would be showing a page nobody
 * gets.
 */
export function previewCategories(
    snapshot: ResolvedCategory[],
    rows: ManageCategoryRow[],
): ResolvedCategory[] {
    const byId = new Map(rows.map((r) => [r.id, r]));
    return (
        snapshot
            .map((c) => {
                const row = byId.get(c.id);
                if (!row) return c;
                return {
                    ...c,
                    isMain: row.isMain,
                    archived: !row.active,
                    groupId: row.groupId,
                    sortOrder: row.sortOrder,
                };
            })
            // A row the snapshot doesn't know about yet (created since the last
            // load) simply isn't previewable — it has no slug to render.
            .filter((c) => c.isMain && !c.archived)
    );
}
