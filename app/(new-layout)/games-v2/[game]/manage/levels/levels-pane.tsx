'use client';

import { useRouter } from 'next/navigation';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
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
import { LevelSubcategoriesTable } from './level-subcategories-table';
import { LevelSubcategoryMatrix } from './level-subcategory-matrix';
import styles from './levels.module.scss';
import { useLevelOverview } from './use-level-overview';

interface Props {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    policies: BoardPolicyRow[];
    variables: VariableRow[];
    metadata: GameMetadata | null;
}

/** Interim: List, Settings and the template tables on one pane until the
 *  console gets a page per screen and levels use the variables editor. */
export function LevelsPane({
    game,
    categories,
    groups,
    policies,
    variables,
    metadata,
}: Props) {
    const router = useRouter();
    const { overview, error, reload } = useLevelOverview(game.name, game.id);
    const onSaved = async () => {
        await reload();
        router.refresh();
    };

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
            <BoardList
                kind="levels"
                game={game}
                categories={categories}
                groups={groups}
                metadata={metadata}
            />
            <CategoryMatrix
                kind="levels"
                game={game}
                categories={categories}
                groups={groups}
                policies={policies}
                variables={variables}
            />
            {overview && (
                <>
                    <LevelSubcategoriesTable
                        gameSlug={game.name}
                        gameId={game.id}
                        overview={overview}
                        onSaved={onSaved}
                    />
                    <LevelSubcategoryMatrix
                        gameSlug={game.name}
                        gameId={game.id}
                        overview={overview}
                        onSaved={onSaved}
                    />
                </>
            )}
        </div>
    );
}
