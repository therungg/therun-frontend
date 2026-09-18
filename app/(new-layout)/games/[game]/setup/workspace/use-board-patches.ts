'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import { reorderCategoriesAction } from '../../manage/game-tab/actions/reorder-categories.action';
import { computeReorderChanges } from '../../manage/game-tab/reorder-changes';

export type BoardPatch = Partial<
    Pick<ResolvedCategory, 'isMain' | 'archived' | 'groupId' | 'sortOrder'>
>;

/**
 * Local edits laid over the server's categories, so a write shows on click
 * and a refresh that is still stale cannot take it back. Shared by the List
 * and Groups screens, which both reorder rows inside a scope.
 */
export function useBoardPatches(game: Pick<ResolvedGame, 'id' | 'name'>) {
    const [patches, setPatches] = useState<Map<number, BoardPatch>>(new Map());
    const [reorderPending, startReorder] = useTransition();

    const patch = (id: number, next: BoardPatch) =>
        setPatches((prev) => {
            const map = new Map(prev);
            map.set(id, { ...map.get(id), ...next });
            return map;
        });

    const apply = (categories: ResolvedCategory[]): ResolvedCategory[] =>
        categories.map((c) => {
            const p = patches.get(c.id);
            return p ? { ...c, ...p } : c;
        });

    /** Moves `id` to `toIndex` inside `scope` and renumbers the scope 1..N. */
    const reorder = (
        scope: ResolvedCategory[],
        id: number,
        toIndex: number,
    ) => {
        const fromIndex = scope.findIndex((c) => c.id === id);
        const { changes } = computeReorderChanges(
            scope.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
            fromIndex,
            toIndex,
        );
        if (changes.length === 0) return;
        const previous = new Map(scope.map((c) => [c.id, c.sortOrder]));
        for (const change of changes) {
            patch(change.categoryId, { sortOrder: change.sortOrder });
        }
        startReorder(async () => {
            const res = await reorderCategoriesAction({
                gameSlug: game.name,
                gameId: game.id,
                changes,
            });
            if ('error' in res) {
                toast.error(res.error);
                // Writes that landed before the failure are real.
                const applied = new Set(res.applied.map((a) => a.categoryId));
                for (const change of changes) {
                    if (applied.has(change.categoryId)) continue;
                    patch(change.categoryId, {
                        sortOrder: previous.get(change.categoryId) ?? 0,
                    });
                }
            }
        });
    };

    return { apply, patch, reorder, reorderPending };
}
