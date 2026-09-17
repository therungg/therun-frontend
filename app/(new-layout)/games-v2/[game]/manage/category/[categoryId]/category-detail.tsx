'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import {
    WORKSPACE_KIND_LABEL,
    type WorkspaceKind,
} from '~src/lib/setup/workspace';
import { formatCount, formatHours } from '~src/utils/format-stats';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../../types/leaderboards.types';
import { CategoryEditor, type CopySources } from '../category-editor';
import styles from './category-detail.module.scss';

interface Props {
    game: ResolvedGame;
    category: ResolvedCategory;
    kind: WorkspaceKind;
    canConfigure: boolean;
    canModerate: boolean;
    canEditStandards: boolean;
    copySources?: CopySources;
    prev: ResolvedCategory | null;
    next: ResolvedCategory | null;
}

export function CategoryDetail({
    game,
    category,
    kind,
    canConfigure,
    canModerate,
    canEditStandards,
    copySources,
    prev,
    next,
}: Props) {
    const base = `/games-v2/${encodeURIComponent(game.name)}/manage`;

    return (
        <div className={styles.wrap}>
            <header className={styles.header}>
                <Link
                    href={`${base}?pane=${kind}/settings`}
                    className={styles.back}
                >
                    <ChevronLeft size={12} aria-hidden="true" />{' '}
                    {WORKSPACE_KIND_LABEL[kind]}
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

            <CategoryEditor
                game={game}
                category={category}
                canConfigure={canConfigure}
                canModerate={canModerate}
                canEditStandards={canEditStandards}
                copySources={copySources}
                context="console"
                kind={kind}
            />
        </div>
    );
}

/**
 * Runners/runs/playtime — dropped from the console table (it's eight rows of
 * board configuration, not a leaderboard), surfaced here instead.
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
