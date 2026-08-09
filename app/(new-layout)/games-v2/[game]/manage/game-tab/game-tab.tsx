'use client';

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
import styles from '../console/console.module.scss';
import { GroupsSection } from './groups-section';

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
    return (
        <section className={styles.surface}>
            <div className={styles.paneHeader}>
                <h2 className={styles.paneTitle}>{CONCEPT_LABEL.groups}</h2>
            </div>
            {/* Grouping is the one edit whose whole point is what the band
                looks like afterwards — the wizard's step 3 shows it, so this
                does too. */}
            <CategoryBandPreview
                categories={previewCategories(boardCategories, rows)}
                groups={boardGroups}
            />
            <GroupsSection
                game={game}
                groups={groups}
                rows={rows}
                snapshotGroups={boardGroups}
                onGroupsChange={onGroupsChange}
                onRowGroupChange={onRowGroupChange}
            />

            <section id={CACHE_ANCHOR} className="mb-4">
                <h2 className="h5 mb-2">Cache</h2>
                <p className="text-muted small mb-2">
                    Clear the cached leaderboards for this game. Next read of
                    each board will re-warm from Postgres.
                </p>
                <InvalidateCacheButton gameSlug={game.name} gameId={game.id} />
            </section>
        </section>
    );
}
