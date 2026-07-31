'use client';

import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { CategoryConfigRow } from '~src/lib/console/category-rows';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { CategoriesTable } from '../game-tab/categories-table';
import type { ReorderChange } from '../game-tab/reorder-changes';
import styles from './console.module.scss';

interface Props {
    game: ResolvedGame;
    rows: ManageCategoryRow[];
    config: CategoryConfigRow[];
    groups: ManageGroup[];
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
 * The category index — the console's answer to "how is this board configured,
 * and where does it disagree with itself?"
 *
 * This is the destination that replaced six category-scoped panes and the
 * sidebar's category <select>. The table carries both halves: the board
 * columns it always had (featured, archived, group, stats) and the
 * configuration columns from `config`, where a `▲` marks the odd one out.
 * Clicking a category opens its detail screen.
 */
export function CategoriesPane({
    game,
    rows,
    config,
    groups,
    onRowChange,
    onRowGroupChange,
    onRowsReorder,
    onGroupsChange,
    onEditCategory,
}: Props) {
    return (
        <section className={styles.surface}>
            <div className={styles.paneHeader}>
                <h2 className={styles.paneTitle}>{CONCEPT_LABEL.categories}</h2>
            </div>
            <p className={styles.paneLede}>
                Bulk-manage which categories are visible and which are featured.
                Use "Edit" to open a category for detailed settings.
            </p>
            <CategoriesTable
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
        </section>
    );
}
