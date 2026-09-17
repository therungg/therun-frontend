'use client';

import styles from '~src/components/console-chrome/console.module.scss';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { GameMetadata } from '~src/lib/game-mgmt';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { CategoryMatrix } from '../../setup/steps/matrix/category-matrix';
import { BoardList } from '../../setup/workspace/board-list';

interface Props {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    policies: BoardPolicyRow[];
    variables: VariableRow[];
    metadata: GameMetadata | null;
}

/** Interim: the List and Settings screens on one pane until the console gets
 *  a page per screen. */
export function CategoriesPane({
    game,
    categories,
    groups,
    policies,
    variables,
    metadata,
}: Props) {
    return (
        <section className={styles.surface}>
            <header className={styles.paneHeader}>
                <div>
                    <div className={styles.paneEyebrow}>Structure</div>
                    <h2 className={styles.paneTitle}>
                        {CONCEPT_LABEL.categories}
                    </h2>
                </div>
            </header>
            <BoardList
                kind="categories"
                game={game}
                categories={categories}
                groups={groups}
                metadata={metadata}
            />
            <CategoryMatrix
                kind="categories"
                game={game}
                categories={categories}
                groups={groups}
                policies={policies}
                variables={variables}
            />
        </section>
    );
}
