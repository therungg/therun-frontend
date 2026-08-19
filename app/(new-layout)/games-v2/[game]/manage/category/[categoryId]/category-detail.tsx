'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import { levelBoardLabel } from '~src/lib/levels/display';
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
    levelBoardCount?: number;
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
    levelBoardCount = 0,
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

            <LevelBanner
                game={game}
                category={category}
                levelTemplates={levelTemplates}
                levelBoardCount={levelBoardCount}
            />

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
 * What this category is, in the levels model — and nothing at all for the
 * categories that have no part in it.
 *
 * The two cases it does speak for are the two ways an edit here is not just
 * an edit here: a level category is copied onto every level's board, and a
 * level board is a copy that the backend detaches from its template the
 * moment a field on it is saved. Detach/Resync makes that deliberate rather
 * than a surprise.
 */
function LevelBanner({
    game,
    category,
    levelTemplates,
    levelBoardCount,
}: {
    game: ResolvedGame;
    category: ResolvedCategory;
    levelTemplates: LevelTemplate[];
    levelBoardCount: number;
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const isTemplate = levelTemplates.some((t) => t.id === category.id);
    const templateId = category.levelTemplateId ?? null;

    const run = (op: 'level-detach' | 'level-resync') => {
        setError(null);
        startTransition(async () => {
            const res = await levelOpAction({
                gameSlug: game.name,
                gameId: game.id,
                op: { op, categoryId: category.id },
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            router.refresh();
        });
    };

    if (isTemplate) {
        return (
            <div className={styles.levelBanner}>
                <p className={styles.levelBannerText}>
                    Level category — saved changes apply to {levelBoardCount}{' '}
                    level board{levelBoardCount === 1 ? '' : 's'}
                </p>
                <p className={styles.levelNote}>
                    Featured applies to every level board too — there is no
                    per-level Featured for a level category.
                </p>
            </div>
        );
    }

    if (templateId == null) return null;

    const detached = category.levelOverride ?? false;
    const templateName = levelBoardLabel(category, levelTemplates);

    return (
        <div className={styles.levelBanner}>
            <p className={styles.levelBannerText}>
                Level board of {templateName} —{' '}
                {detached ? 'detached' : 'synced'}
            </p>
            <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={isPending}
                onClick={() => run(detached ? 'level-resync' : 'level-detach')}
            >
                {detached ? 'Resync' : 'Detach'}
            </button>
            <p className={styles.levelNote}>
                {detached
                    ? 'This board keeps its own settings — a push to the level category skips it. Resync takes the level category’s settings back.'
                    : 'Editing any field here detaches this board from its template.'}
            </p>
            {error && <p className={styles.levelError}>{error}</p>}
        </div>
    );
}
