'use client';

import { useMemo, useState, useTransition } from 'react';
import { Collection, Plus } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { createLevelAction } from '~src/actions/levels/create-level.action';
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
import { CategoryMatrix } from '../../setup/steps/matrix/category-matrix';
import { PromptDialog } from '../../shared/prompt-dialog';
import { LevelSubcategoriesTable } from './level-subcategories-table';
import { LevelSubcategoryMatrix } from './level-subcategory-matrix';
import styles from './levels.module.scss';
import { useLevelOverview } from './use-level-overview';

interface Props {
    gameId: number;
    gameSlug: string;
    /** The console's own game/category state, so the levels table can be the
     *  same matrix the Categories tab draws — a level IS a category, and the
     *  two tables differ only in which slice they show and that a level's
     *  group is never in question. Absent for a viewer whose console has not
     *  loaded them, in which case only the overview-driven sections render. */
    game?: ResolvedGame;
    rows?: ManageCategoryRow[];
    groups?: ManageGroup[];
    boardCategories?: ResolvedCategory[];
    policies?: BoardPolicyRow[];
    variables?: VariableRow[];
    onEditCategory?: (categoryId: number) => void;
}

/**
 * The Levels tab, top to bottom: the levels, the subcategories, and which of
 * the second each of the first carries.
 *
 * A level is a category, so the first table is the Categories tab's grid over
 * the level group — same settings, same Subcategories link to the
 * per-subcategory dialog — with "Add level" under it. The second is the list
 * of subcategory definitions with "Add subcategory" under it. The third is
 * the grid that joins them.
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
    const [addLevelOpen, setAddLevelOpen] = useState(false);
    const [promptError, setPromptError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

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

    const levelCount = overview?.levels.length ?? levelCategories?.length ?? 0;
    const hasLevelsTable =
        game != null && levelCategories != null && levelCategories.length > 0;

    const submitLevel = (value: string) => {
        setPromptError(null);
        startTransition(async () => {
            const res = await createLevelAction({
                gameSlug,
                gameId,
                display: value,
            });
            if ('error' in res && res.error) {
                setPromptError(res.error);
                return;
            }
            setAddLevelOpen(false);
            toast.success(`${value} added`);
            await reload();
        });
    };

    const openAddLevel = () => {
        setPromptError(null);
        setAddLevelOpen(true);
    };

    const addLevelButton = (
        <button
            type="button"
            className={styles.addAction}
            onClick={openAddLevel}
        >
            <Plus size={16} aria-hidden="true" />
            Add level
        </button>
    );

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Structure</div>
                    <h2 className={consoleStyles.paneTitle}>Levels</h2>
                </div>
            </div>

            {error && (
                <div className={styles.error} role="alert">
                    {error}
                </div>
            )}

            {/* 1. The levels: the Categories grid over the level slice, with
                its one action under it. No group column — a level's group
                is what makes it a level, so it is never a choice. */}
            {hasLevelsTable ? (
                <div className={styles.levelsTable}>
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
                    <div className={styles.sectionFoot}>
                        {addLevelButton}
                        <p className={styles.footNote}>
                            A level is its own board, with every subcategory
                            below from the moment it exists.
                        </p>
                    </div>
                </div>
            ) : loading && !overview ? (
                <div className={styles.section}>
                    <div className={styles.loading} aria-busy="true" />
                </div>
            ) : (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionTitle}>Levels</span>
                        <span className={styles.sectionCount}>
                            {levelCount === 0
                                ? 'none yet'
                                : `${levelCount} on the board`}
                        </span>
                    </div>
                    <div className={styles.empty}>
                        <Collection
                            size={28}
                            className={styles.emptyIcon}
                            aria-hidden="true"
                        />
                        <p className={styles.emptyTitle}>No levels yet</p>
                        <p className={styles.emptyText}>
                            The first level opens a Levels section on the board,
                            shown as a dropdown.
                        </p>
                        {addLevelButton}
                    </div>
                </section>
            )}

            {/* 2. The subcategories every level can split into. */}
            {overview && (
                <LevelSubcategoriesTable
                    gameSlug={gameSlug}
                    gameId={gameId}
                    overview={overview}
                    onSaved={reload}
                />
            )}

            {/* 3. Which level carries which — only once both exist. */}
            {overview && (
                <LevelSubcategoryMatrix
                    gameSlug={gameSlug}
                    gameId={gameId}
                    overview={overview}
                    onSaved={reload}
                />
            )}

            <PromptDialog
                open={addLevelOpen}
                onClose={() => setAddLevelOpen(false)}
                onSubmit={submitLevel}
                labelledBy="add-level-title"
                title="Add level"
                blurb="A level is a category: it gets its own board, and every subcategory this game has."
                fieldLabel="Level name"
                placeholder="e.g. Gusty Garden Galaxy"
                minLength={1}
                submitLabel="Add level"
                pending={pending}
                error={promptError}
            />
        </div>
    );
}
