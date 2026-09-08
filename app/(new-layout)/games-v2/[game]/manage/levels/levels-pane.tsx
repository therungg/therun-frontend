'use client';

import { useMemo } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { previewCategories } from '~src/lib/console/preview-categories';
import { splitLevelBoards } from '~src/lib/levels/display';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { LevelsEditor } from '../../setup/steps/levels-editor';
import { CategoryMatrix } from '../../setup/steps/matrix/category-matrix';
import { useLevelOverview } from './use-level-overview';

interface Props {
    gameId: number;
    gameSlug: string;
    /** The console's own game/category state, so the levels table can be the
     *  same matrix the Categories tab draws — a level IS a category, and the
     *  two tables differ only in which slice they show and that a level's
     *  group is never in question. Absent for a viewer whose console has not
     *  loaded them, in which case only the structural editor renders. */
    game?: ResolvedGame;
    rows?: ManageCategoryRow[];
    groups?: ManageGroup[];
    boardCategories?: ResolvedCategory[];
    policies?: BoardPolicyRow[];
    variables?: VariableRow[];
    onEditCategory?: (categoryId: number) => void;
}

/**
 * The Levels tab: the Categories tab over the level group.
 *
 * A level is a category, so this is the same grid, the same settings and the
 * same Subcategories link to the per-subcategory dialog — one row per level,
 * never one per variant. What a level splits into lives behind that link,
 * because a variant is a value of the level's subcategory variable and not a
 * board of its own.
 */
export function LevelsPane({
    gameId,
    gameSlug,
    game,
    rows,
    groups,
    boardCategories,
    policies,
    variables,
    onEditCategory,
}: Props) {
    const { overview, loading, error, reload } = useLevelOverview(
        gameSlug,
        gameId,
    );
    // A level's structure is decided by which group it is in: it cannot be
    // regrouped (its group is what makes it a level), removed, or reordered
    // here. The matrix still wants the handlers, so they are explicit no-ops.
    const notHere = () => {
        // Intentionally nothing — see above.
    };

    // The other half of the split the Categories tab takes: everything in a
    // level group. Same matrix, opposite slice.
    const levelCategories = useMemo(() => {
        if (!rows || !groups || !boardCategories) return null;
        const { levelBoards } = splitLevelBoards(rows, groups);
        const levelIds = new Set(levelBoards.map((r) => r.id));
        return previewCategories(boardCategories, rows).filter((c) =>
            levelIds.has(c.id),
        );
    }, [rows, groups, boardCategories]);

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Structure</div>
                    <h2 className={consoleStyles.paneTitle}>Levels</h2>
                </div>
            </div>

            {/* The levels table: the same grid the Categories tab draws, over
                the level slice. No group column — a level's group is what
                makes it a level, so it is never a choice. */}
            {game && levelCategories && levelCategories.length > 0 && (
                <CategoryMatrix
                    game={game}
                    categories={levelCategories}
                    groups={[] as ResolvedGroup[]}
                    policies={policies ?? []}
                    variables={variables}
                    subject="levels"
                    structure={
                        onEditCategory
                            ? {
                                  groupOptions: [],
                                  onGroupChange: notHere,
                                  onRemove: notHere,
                                  onMove: notHere,
                                  onDropRow: notHere,
                                  onEdit: onEditCategory,
                                  busyIds: new Set<number>(),
                                  reorderPending: false,
                              }
                            : undefined
                    }
                />
            )}

            {error && <div className="alert alert-danger">{error}</div>}
            {loading && !overview && (
                <p className="text-muted small">Loading levels…</p>
            )}

            {overview && (
                <LevelsEditor
                    mode="manage"
                    gameSlug={gameSlug}
                    gameId={gameId}
                    overview={overview}
                    onSaved={reload}
                />
            )}
        </div>
    );
}
