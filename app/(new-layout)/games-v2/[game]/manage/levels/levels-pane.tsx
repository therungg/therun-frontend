'use client';

import { useState } from 'react';
import { ListNested } from 'react-bootstrap-icons';
import { createLevelAction } from '~src/actions/levels/create-level.action';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import Link from '~src/components/link';
import type { LevelTemplate } from '../../../../../../types/levels.types';
import { InlineError } from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import { LevelRow } from './level-row';
import styles from './levels.module.scss';
import { useActionRunner, useLevelOverview } from './use-level-overview';

interface Props {
    gameId: number;
    gameSlug: string;
    /** Server-loaded templates, used only for the empty-state copy — the
     * authoritative per-level picture comes from the overview below. */
    templates: LevelTemplate[];
}

/**
 * A board's individual levels. Every level category is materialised as one
 * board per level, so this pane is about the levels themselves: what they are
 * called, what rules they add, and which level categories they opt out of.
 * Ordering is not duplicated here — levels are category groups, so the Groups
 * pane already orders them alongside the normal groups.
 */
export function LevelsPane({ gameId, gameSlug, templates }: Props) {
    const { overview, loading, error, reload, setError } = useLevelOverview(
        gameSlug,
        gameId,
    );
    const { isPending, run } = useActionRunner(setError, reload);
    const [name, setName] = useState('');

    const addLevel = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        run(
            () => createLevelAction({ gameSlug, gameId, name: trimmed }),
            () => setName(''),
        );
    };

    const materialise = () =>
        run(() =>
            levelOpAction({
                gameSlug,
                gameId,
                op: { op: 'level-materialise' },
            }),
        );

    const levels = overview?.levels ?? [];
    const summaries = overview?.templates ?? [];
    // A template short of one instance per level means boards are missing —
    // either a level was added after the template, or a materialise failed.
    // Exclusions still count towards `total`, so this does not fire for a
    // deliberately opted-out level.
    const missingBoards =
        levels.length > 0 &&
        summaries.length > 0 &&
        summaries.some((t) => t.total < levels.length);

    return (
        <section className={consoleStyles.surface}>
            <header className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Structure</div>
                    <div className={styles.titleRow}>
                        <h2 className={consoleStyles.paneTitle}>Levels</h2>
                        <span className={consoleStyles.paneCount}>
                            {levels.length}
                        </span>
                    </div>
                </div>
                {missingBoards && (
                    <div className={consoleStyles.paneActions}>
                        <button
                            type="button"
                            className={styles.repairAction}
                            disabled={isPending}
                            onClick={materialise}
                        >
                            Materialise missing boards
                        </button>
                    </div>
                )}
            </header>
            <p className={consoleStyles.paneLede}>
                Each row is a level. A level&apos;s boards come from the shared
                level categories — toggle which boards each level carries, and
                restore any that were customized.
            </p>

            {levels.length > 0 && (
                <div className={styles.legend}>
                    <span className={styles.legendItem}>
                        <span
                            className={`${styles.legendDot} ${styles.legendDotDefault}`}
                        />
                        On · matches the shared template
                    </span>
                    <span className={styles.legendItem}>
                        <span
                            className={`${styles.legendDot} ${styles.legendDotCustom}`}
                        />
                        Customized · edited on this level only
                    </span>
                    <span className={styles.legendItem}>
                        <span
                            className={`${styles.legendDot} ${styles.legendDotOnly}`}
                        />
                        Only on this level · no template
                    </span>
                    <span className={styles.legendItem}>
                        <span
                            className={`${styles.legendDot} ${styles.legendDotOff}`}
                        />
                        Off · not carried by this level
                    </span>
                </div>
            )}

            <InlineError>{error}</InlineError>

            {loading && (
                <div
                    className={styles.loading}
                    role="status"
                    aria-label="Loading levels"
                />
            )}

            {!loading && !error && levels.length === 0 && (
                <div className={styles.empty}>
                    <ListNested
                        size={26}
                        className={styles.emptyIcon}
                        aria-hidden="true"
                    />
                    <p className={styles.emptyTitle}>No levels yet</p>
                    <p className={styles.emptyBlurb}>
                        {templates.length === 0
                            ? 'Add a level, then define the level categories every level gets.'
                            : 'Add a level: every level category gets a board on it.'}
                    </p>
                </div>
            )}

            {levels.length > 0 && (
                <div className={styles.panel}>
                    {levels.map((level) => (
                        <LevelRow
                            key={level.id}
                            gameId={gameId}
                            gameSlug={gameSlug}
                            level={level}
                            templates={summaries}
                            onChanged={reload}
                        />
                    ))}
                </div>
            )}

            <form
                className={styles.createRow}
                onSubmit={(e) => {
                    e.preventDefault();
                    addLevel();
                }}
            >
                <input
                    className={`form-control form-control-sm ${styles.createControl}`}
                    aria-label="New level name"
                    placeholder="Level name"
                    value={name}
                    disabled={isPending}
                    onChange={(e) => setName(e.target.value)}
                />
                <button
                    type="submit"
                    className={kit.saveBtn}
                    disabled={isPending || !name.trim()}
                >
                    Add level
                </button>
            </form>

            <p className={styles.hint}>
                Levels are ordered with the rest of the groups —{' '}
                <Link
                    href={`/games-v2/${encodeURIComponent(gameSlug)}/manage?pane=groups`}
                >
                    reorder them in Groups
                </Link>
                .
            </p>
        </section>
    );
}
