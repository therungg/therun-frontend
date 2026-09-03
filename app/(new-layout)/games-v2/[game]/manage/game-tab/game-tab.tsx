'use client';

import styles from '~src/components/console-chrome/console.module.scss';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { previewCategories } from '~src/lib/console/preview-categories';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { InvalidateCacheButton } from '../../header/invalidate-cache-button';
import { CategoryBandPreview } from '../../setup/steps/category-band-preview';
import { GroupsSection } from './groups-section';
import groupStyles from './groups-section.module.scss';

// Cache has no sidebar item of its own — it rides along under Groups, so it
// still needs a stable, direct-linkable anchor.
const CACHE_ANCHOR = 'game-tab-cache';

interface Props {
    game: ResolvedGame;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    /** Server snapshot for the band preview; `rows` carries the live flags. */
    boardCategories: ResolvedCategory[];
    boardGroups: ResolvedGroup[];
    onGroupsChange: (groups: ManageGroup[]) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
}

export function GameTab({
    game,
    rows,
    groups,
    boardCategories,
    boardGroups,
    onGroupsChange,
    onRowGroupChange,
}: Props) {
    // Levels are managed in the Levels menu, so keep level groups out of
    // this pane. `groups` itself stays unfiltered — other consumers (e.g.
    // CategoriesPane/splitLevelBoards) still need the level groups.
    const normalGroups = groups.filter((group) => group.kind !== 'level');

    return (
        <section className={styles.surface}>
            <header className={styles.paneHeader}>
                <div>
                    <div className={styles.paneEyebrow}>Structure</div>
                    <h2 className={styles.paneTitle}>{CONCEPT_LABEL.groups}</h2>
                </div>
            </header>
            <p className={styles.paneLede}>
                Organize categories on the public game page. With more than one
                group, the category rail splits into labeled sections in this
                order.
            </p>
            {/* Grouping is the one edit whose whole point is what the band
                looks like afterwards — the wizard's step 3 shows it, so this
                does too. */}
            <CategoryBandPreview
                categories={previewCategories(boardCategories, rows)}
                groups={boardGroups}
            />
            <GroupsSection
                game={game}
                groups={normalGroups}
                rows={rows}
                snapshotGroups={boardGroups}
                onGroupsChange={onGroupsChange}
                onRowGroupChange={onRowGroupChange}
            />

            <section id={CACHE_ANCHOR} className={groupStyles.subSection}>
                <div className={groupStyles.subHead}>
                    <h3 className={groupStyles.subTitle}>Cache</h3>
                </div>
                <p className={groupStyles.lede}>
                    Clear the cached leaderboards for this game. The next read
                    of each board re-warms from Postgres.
                </p>
                <InvalidateCacheButton gameSlug={game.name} gameId={game.id} />
            </section>
        </section>
    );
}
