'use client';

import { useRouter } from 'next/navigation';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { LevelSubcategoriesTable } from './level-subcategories-table';
import { LevelSubcategoryMatrix } from './level-subcategory-matrix';
import styles from './levels.module.scss';
import { useLevelOverview } from './use-level-overview';

/**
 * The level template tables, as the levels Subcategories screen, until levels
 * move onto the variables editor with the backend's template removal.
 */
export function LegacyLevelSubcategories({
    game,
}: {
    game: Pick<ResolvedGame, 'id' | 'name'>;
}) {
    const router = useRouter();
    const { overview, loading, error, reload } = useLevelOverview(
        game.name,
        game.id,
    );
    const onSaved = async () => {
        await reload();
        router.refresh();
    };

    if (error) {
        return (
            <div className={styles.error} role="alert">
                {error}
            </div>
        );
    }
    if (loading && !overview) {
        return (
            <div className={styles.section}>
                <div className={styles.loading} aria-busy="true" />
            </div>
        );
    }
    if (!overview) return null;
    return (
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
    );
}
