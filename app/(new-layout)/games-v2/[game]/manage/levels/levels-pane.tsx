'use client';

import { useEffect, useMemo, useState } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { previewCategories } from '~src/lib/console/preview-categories';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { splitLevelBoards } from '~src/lib/levels/display';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import type { ExistingLevels } from '../../setup/steps/level-plan';
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
    metadata?: GameMetadata | null;
    onEditCategory?: (categoryId: number) => void;
}

/**
 * The wizard's Levels step without the wizard: the same editor, fed by the
 * level overview (the server's reading of which boards exist and how they
 * drifted) and reloaded after every save.
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
    metadata,
    onEditCategory,
}: Props) {
    const { overview, loading, error, reload } = useLevelOverview(
        gameSlug,
        gameId,
    );
    // The editor seeds its drafts from `existing` once; a reload remounts it.
    const [version, setVersion] = useState(0);

    // A level's structure is decided by its template, not by this table:
    // it cannot be regrouped (its group is what makes it a level), removed,
    // or reordered here. The matrix still wants the handlers, so they are
    // explicit no-ops rather than absent.
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

    const existing: ExistingLevels | null = useMemo(() => {
        if (!overview) return null;
        return {
            levelGroups: overview.levels.map((l) => ({
                id: l.id,
                name: l.name,
                rules: l.rules,
                hasLevelOnlyBoard: l.instances.some(
                    (i) => i.state === 'level-only',
                ),
            })),
            templates: overview.templates.map((t) => ({
                id: t.id,
                display: t.display,
            })),
            // No full-game category adoption here; that is a first-setup
            // convenience the wizard offers.
            categories: [],
            exclusions: overview.levels.flatMap((l) =>
                l.instances
                    .filter(
                        (i) => i.state === 'excluded' && i.templateId != null,
                    )
                    .map((i) => ({
                        groupId: l.id,
                        templateId: i.templateId as number,
                    })),
            ),
            overriddenCategoryIds: overview.levels.flatMap((l) =>
                l.instances
                    .filter((i) => i.state === 'overridden')
                    .map((i) => i.categoryId),
            ),
            needsMaterialise: overview.levels.some((l) =>
                overview.templates.some(
                    (t) => !l.instances.some((i) => i.templateId === t.id),
                ),
            ),
        };
    }, [overview]);

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
            {loading && !existing && (
                <p className="text-muted small">Loading levels…</p>
            )}
            {existing && (
                <LevelsEditor
                    key={version}
                    mode="manage"
                    gameSlug={gameSlug}
                    gameId={gameId}
                    existing={existing}
                    onSaved={async () => {
                        await reload();
                        setVersion((v) => v + 1);
                    }}
                />
            )}
        </div>
    );
}
