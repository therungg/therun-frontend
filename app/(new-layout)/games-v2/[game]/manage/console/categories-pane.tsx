'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'react-bootstrap-icons';
import styles from '~src/components/console-chrome/console.module.scss';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { CategoryConfigRow } from '~src/lib/console/category-rows';
import { previewCategories } from '~src/lib/console/preview-categories';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { splitLevelBoards } from '~src/lib/levels/display';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { CategoryBandPreview } from '../../setup/steps/category-band-preview';
import { buildCategorySeed } from '../../setup/steps/category-seed';
import type { ReorderChange } from '../game-tab/reorder-changes';
import { AddCategoryDialog } from './add-category-dialog';
import boardStyles from './board-categories.module.scss';
import { BoardCategoriesTable } from './board-categories-table';

interface Props {
    game: ResolvedGame;
    rows: ManageCategoryRow[];
    config: CategoryConfigRow[];
    groups: ManageGroup[];
    /** The server snapshot the band preview renders from — `rows` supplies
     *  the live flags on top of it. */
    boardCategories: ResolvedCategory[];
    boardGroups: ResolvedGroup[];
    /** Game defaults seeded onto a category as it joins the board. Absent for
     *  viewers whose console didn't load game details. */
    metadata?: GameMetadata | null;
    onRowChange: (
        categoryId: number,
        patch: { isMain?: boolean; active?: boolean },
    ) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
    onRowsReorder: (changes: ReorderChange[]) => void;
    onGroupsChange: (groups: ManageGroup[]) => void;
    onEditCategory: (categoryId: number) => void;
}

/**
 * The board's category list — "what is on my board, and where does it
 * disagree with itself?"
 *
 * Featured-only by design: the table is the board, in board order, and the
 * ~860 other categories a big game accumulates live behind the add dialog
 * rather than in a filter tab. That shape is deliberately the setup wizard's
 * step 2 — band preview, ranked list, coverage meter — because the console and
 * the wizard are curating the same thing and should say so the same way.
 */
export function CategoriesPane({
    game,
    rows,
    config,
    groups,
    boardCategories,
    boardGroups,
    metadata,
    onRowChange,
    onRowGroupChange,
    onRowsReorder,
    onGroupsChange,
    onEditCategory,
}: Props) {
    const [addOpen, setAddOpen] = useState(false);

    // The same live preview the wizard's step 2 shows, off the same renderer
    // the public band uses. Featuring a category here is a bet about what the
    // board will look like; the wizard stopped making people place that bet
    // blind, and the console had no reason to keep asking for it.
    const previewed = previewCategories(boardCategories, rows);

    // Everything with runs that isn't on the board — the add dialog's pool.
    // Archived categories are excluded: they have their own restore path
    // under the table, and adding one would feature something the board
    // refuses to render. Everything in a level group is excluded too — level
    // boards are featured by their level category, and featuring one here
    // would drift it from the template the next push overwrites. Membership
    // of a level is the test, not `levelTemplateId`: a level-only row (in a
    // level group with no template) is just as much not-a-full-game-board.
    const pool = useMemo(
        () =>
            splitLevelBoards(rows, groups).fullGame.filter(
                (r) => !r.isMain && r.active,
            ),
        [rows, groups],
    );

    const seed = metadata ? buildCategorySeed(metadata) : null;

    return (
        <section className={styles.surface}>
            <header className={styles.paneHeader}>
                <div>
                    <div className={styles.paneEyebrow}>Structure</div>
                    <h2 className={styles.paneTitle}>
                        {CONCEPT_LABEL.categories}
                    </h2>
                </div>
                <div className={styles.paneActions}>
                    <button
                        type="button"
                        className={boardStyles.primaryAction}
                        onClick={() => setAddOpen(true)}
                    >
                        <Plus size={16} aria-hidden="true" />
                        Add category to board
                    </button>
                </div>
            </header>
            <p className={styles.paneLede}>
                The categories on your board right now, in the order the public
                page shows them.
            </p>
            <CategoryBandPreview categories={previewed} groups={boardGroups} />
            <BoardCategoriesTable
                game={game}
                rows={rows}
                config={config}
                groups={groups}
                onRowChange={onRowChange}
                onRowGroupChange={onRowGroupChange}
                onRowsReorder={onRowsReorder}
                onGroupCreated={(g) => onGroupsChange([...groups, g])}
                onEdit={onEditCategory}
            />
            <AddCategoryDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                game={game}
                pool={pool}
                seed={seed}
                onAdded={(ids) => {
                    for (const id of ids) onRowChange(id, { isMain: true });
                }}
            />
        </section>
    );
}
