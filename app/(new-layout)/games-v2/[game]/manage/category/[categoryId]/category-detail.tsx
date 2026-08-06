'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../../types/leaderboards.types';
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
