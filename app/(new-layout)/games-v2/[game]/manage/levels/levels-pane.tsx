'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { createLevelAction } from '~src/actions/levels/create-level.action';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import { levelOverviewAction } from '~src/actions/levels/level-overview.action';
import Link from '~src/components/link';
import type {
    LevelOverview,
    LevelTemplate,
} from '../../../../../../types/levels.types';
import consoleStyles from '../console/console.module.scss';
import { InlineError } from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import { LevelRow } from './level-row';
import styles from './levels.module.scss';

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
    const [overview, setOverview] = useState<LevelOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [isPending, startPending] = useTransition();

    const load = useCallback(async () => {
        const res = await levelOverviewAction({ gameSlug, gameId });
        if ('error' in res) {
            setError(res.error);
            setLoading(false);
            return;
        }
        setError(null);
        setOverview(res.result);
        setLoading(false);
    }, [gameId, gameSlug]);

    useEffect(() => {
        void load();
    }, [load]);

    const addLevel = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        startPending(async () => {
            const res = await createLevelAction({
                gameSlug,
                gameId,
                name: trimmed,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setName('');
            await load();
        });
    };

    const materialise = () => {
        startPending(async () => {
            const res = await levelOpAction({
                gameSlug,
                gameId,
                op: { op: 'level-materialise' },
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await load();
        });
    };

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

            {!loading && levels.length === 0 && (
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
                    onChanged={load}
                />
            ))}

            <div className={styles.createRow}>
                <input
                    className="form-control form-control-sm w-auto"
                    aria-label="New level name"
                    placeholder="Level name"
                    value={name}
                    disabled={isPending}
                    onChange={(e) => setName(e.target.value)}
                />
                <button
                    type="button"
                    className={kit.saveBtn}
                    disabled={isPending || !name.trim()}
                    onClick={addLevel}
                >
                    Add level
                </button>
            </div>

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
