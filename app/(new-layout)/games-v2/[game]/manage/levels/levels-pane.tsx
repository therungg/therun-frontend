'use client';

import { useState } from 'react';
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
            <div className={consoleStyles.paneHeader}>
                <h2 className={consoleStyles.paneTitle}>Levels</h2>
                <span className={consoleStyles.paneCount}>{levels.length}</span>
                {missingBoards && (
                    <button
                        type="button"
                        className={kit.saveBtn}
                        disabled={isPending}
                        onClick={materialise}
                    >
                        Materialise missing boards
                    </button>
                )}
            </div>

            <InlineError>{error}</InlineError>

            {loading && <p className="text-muted">Loading levels…</p>}

            {!loading && !error && levels.length === 0 && (
                <div className={styles.empty}>
                    No levels yet.{' '}
                    {templates.length === 0
                        ? 'Add a level, then define the level categories every level gets.'
                        : 'Add a level — every level category gets a board on it.'}
                </div>
            )}

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

            <form
                className={styles.createRow}
                onSubmit={(e) => {
                    e.preventDefault();
                    addLevel();
                }}
            >
                <input
                    className="form-control form-control-sm w-auto"
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
