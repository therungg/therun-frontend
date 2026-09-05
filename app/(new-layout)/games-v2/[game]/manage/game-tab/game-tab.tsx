'use client';

import styles from '~src/components/console-chrome/console.module.scss';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { GroupsSection } from './groups-section';

interface Props {
    game: ResolvedGame;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    /** Server snapshot the band preview reads; the preview is hidden for now,
     * so these are accepted but unused. */
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
    onGroupsChange,
    onRowGroupChange,
}: Props) {
    return (
        <section className={styles.surface}>
            <header className={styles.paneHeader}>
                <div>
                    <div className={styles.paneEyebrow}>Structure</div>
                    <h2 className={styles.paneTitle}>{CONCEPT_LABEL.groups}</h2>
                </div>
            </header>
            {/* Groups are the one concept on this console that does need
                saying: a moderator knows what a category is without being
                told, but "group" is our word for a section of the rail, and
                the examples are what make it land. */}
            <p className={styles.paneLede}>
                Category groups allow you to organize categories into their own
                sections. Examples usually include Main Categories,
                Miscellaneous, Category Extensions, etc.
            </p>
            <GroupsSection
                game={game}
                groups={groups}
                rows={rows}
                onGroupsChange={onGroupsChange}
                onRowGroupChange={onRowGroupChange}
            />
        </section>
    );
}
