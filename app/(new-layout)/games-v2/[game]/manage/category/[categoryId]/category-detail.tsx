'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import { formatCount, formatHours } from '~src/utils/format-stats';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../../types/leaderboards.types';
import type { LevelTemplate } from '../../../../../../../types/levels.types';
import type { GameTimingDefaults } from '../../timing/timing-settings-section';
import { CategoryEditor, type CopySources } from '../category-editor';
import styles from './category-detail.module.scss';

interface Props {
    game: ResolvedGame;
    category: ResolvedCategory;
    canConfigure: boolean;
    canModerate: boolean;
    canEditStandards: boolean;
    copySources?: CopySources;
    gameTimingDefaults?: GameTimingDefaults;
    /** The game's level categories — this category is one of them, or an
     *  instance of one, or neither. */
    levelTemplates?: LevelTemplate[];
    /** How many level boards this category templates. Only meaningful when
     *  this category IS a level category. */
    prev: ResolvedCategory | null;
    next: ResolvedCategory | null;
}

export function CategoryDetail({
    game,
    category,
    canConfigure,
    canModerate,
    canEditStandards,
    copySources,
    gameTimingDefaults,
    levelTemplates = [],
    prev,
    next,
}: Props) {
    const base = `/games-v2/${encodeURIComponent(game.name)}/manage`;

    return (
        <div className={styles.wrap}>
            <header className={styles.header}>
                <Link href={`${base}?pane=categories`} className={styles.back}>
                    <ChevronLeft size={12} aria-hidden="true" />{' '}
                    {CONCEPT_LABEL.categories}
                </Link>
                <h1 className={styles.title}>{category.display}</h1>
                <CategoryStats category={category} />
                <nav className={styles.step} aria-label="Adjacent categories">
                    {prev && (
                        <Link href={`${base}/category/${prev.id}`}>
                            <ChevronLeft size={12} aria-hidden="true" />
                            {prev.display}
                        </Link>
                    )}
                    {next && (
                        <Link href={`${base}/category/${next.id}`}>
                            {next.display}
                            <ChevronRight size={12} aria-hidden="true" />
                        </Link>
                    )}
                </nav>
            </header>

            <LevelBanner category={category} levelTemplates={levelTemplates} />

            <CategoryEditor
                game={game}
                category={category}
                canConfigure={canConfigure}
                canModerate={canModerate}
                canEditStandards={canEditStandards}
                copySources={copySources}
                gameTimingDefaults={gameTimingDefaults}
                context="console"
            />
        </div>
    );
}

/**
 * Runners/runs/playtime — dropped from the console table (it's eight rows of
 * board configuration, not a leaderboard), surfaced here instead. Level
 * templates carry no stats of their own, so they render nothing.
 */
function CategoryStats({ category }: { category: ResolvedCategory }) {
    if (category.uniqueRunners == null) return null;
    return (
        <p className={styles.stats}>
            {formatCount(category.uniqueRunners)} runner
            {category.uniqueRunners === 1 ? '' : 's'} ·{' '}
            {formatCount(category.totalFinishedAttemptCount ?? 0)} runs ·{' '}
            {formatHours(category.totalRunTime ?? 0)}h playtime
        </p>
    );
}

/**
 * What this category is, in the levels model — and nothing at all for the
 * categories that have no part in it.
 *
 * The two cases it does speak for are the two ways an edit here is not just
 * an edit here: a level category is copied onto every level's board, and a
 * level category is not a board: it is the definition of a subcategory every
 * level carries, so saving it rewrites that value on each level rather than
 * pushing settings to boards of its own.
 */
function LevelBanner({
    category,
    levelTemplates,
}: {
    category: ResolvedCategory;
    levelTemplates: LevelTemplate[];
}) {
    const isTemplate = levelTemplates.some((t) => t.id === category.id);

    // A level category is the definition of a subcategory every level has —
    // it is not a board, and saving it rewrites that value on each level.
    if (isTemplate) {
        return (
            <div className={styles.levelBanner}>
                <p className={styles.levelBannerText}>
                    Level subcategory — saved changes apply to every level that
                    carries it
                </p>
            </div>
        );
    }

    return null;
}
