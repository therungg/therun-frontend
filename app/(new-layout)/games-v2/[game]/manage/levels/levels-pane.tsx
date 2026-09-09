'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { createLevelAction } from '~src/actions/levels/create-level.action';
import { createLevelTemplateAction } from '~src/actions/levels/create-level-template.action';
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
import boardStyles from '../console/board-categories.module.scss';
import { LevelSubcategoryMatrix } from './level-subcategory-matrix';
import { useLevelOverview } from './use-level-overview';

interface Props {
    gameId: number;
    gameSlug: string;
    /** The console's own game/category state, so the levels table can be the
     *  same matrix the Categories tab draws — a level IS a category, and the
     *  two tables differ only in which slice they show and that a level's
     *  group is never in question. Absent for a viewer whose console has not
     *  loaded them, in which case only the assignment grid renders. */
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
 * never one per variant. The table is the tab; creating a level is a button
 * on it rather than a second editor underneath, and what the levels split
 * into is assigned in the grid below.
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
    const [addSubOpen, setAddSubOpen] = useState(false);
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

    const submit = (
        label: string,
        run: () => Promise<{ error?: string } | { result: unknown }>,
        close: () => void,
    ) => {
        setPromptError(null);
        startTransition(async () => {
            const res = await run();
            if ('error' in res && res.error) {
                setPromptError(res.error);
                return;
            }
            close();
            toast.success(label);
            await reload();
        });
    };

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Structure</div>
                    <h2 className={consoleStyles.paneTitle}>Levels</h2>
                </div>
                <div className={consoleStyles.paneActions}>
                    <button
                        type="button"
                        className={boardStyles.primaryAction}
                        onClick={() => {
                            setPromptError(null);
                            setAddLevelOpen(true);
                        }}
                    >
                        <Plus size={16} aria-hidden="true" />
                        Add level
                    </button>
                    <button
                        type="button"
                        className={boardStyles.primaryAction}
                        onClick={() => {
                            setPromptError(null);
                            setAddSubOpen(true);
                        }}
                    >
                        <Plus size={16} aria-hidden="true" />
                        Add subcategory
                    </button>
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
            {overview && overview.levels.length === 0 && (
                <p className="text-muted small">
                    No levels yet. Use “Add level” to make the first one.
                </p>
            )}

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
                onSubmit={(value) =>
                    submit(
                        'Level added',
                        () =>
                            createLevelAction({
                                gameSlug,
                                gameId,
                                display: value,
                            }),
                        () => setAddLevelOpen(false),
                    )
                }
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

            <PromptDialog
                open={addSubOpen}
                onClose={() => setAddSubOpen(false)}
                onSubmit={(value) =>
                    submit(
                        'Subcategory added',
                        () =>
                            createLevelTemplateAction({
                                gameSlug,
                                gameId,
                                display: value,
                            }),
                        () => setAddSubOpen(false),
                    )
                }
                labelledBy="add-level-subcategory-title"
                title="Add subcategory"
                blurb="Every level gets this subcategory. Untick it per level in the grid below."
                fieldLabel="Subcategory name"
                placeholder="e.g. Any%"
                minLength={1}
                submitLabel="Add subcategory"
                pending={pending}
                error={promptError}
            />
        </div>
    );
}
