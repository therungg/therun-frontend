'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { createLevelTemplateAction } from '~src/actions/levels/create-level-template.action';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import { levelOverviewAction } from '~src/actions/levels/level-overview.action';
import Link from '~src/components/link';
import type { LevelOverview } from '../../../../../../types/levels.types';
import consoleStyles from '../console/console.module.scss';
import { InlineError } from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';
import styles from './levels.module.scss';

interface Props {
    gameId: number;
    gameSlug: string;
}

type Timing = 'rt' | 'gametime';

/**
 * The level categories (templates): the categories every level gets. Edited
 * once here, applied to every level board — which is why the counts, not the
 * settings, are what this table shows. `synced/total` is the honest answer to
 * "did my last edit land everywhere", and Push now is the repair.
 */
export function LevelCategoriesPane({ gameId, gameSlug }: Props) {
    const [overview, setOverview] = useState<LevelOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [display, setDisplay] = useState('');
    const [timing, setTiming] = useState<Timing>('rt');
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

    const push = (templateId: number) => {
        startPending(async () => {
            const res = await levelOpAction({
                gameSlug,
                gameId,
                op: { op: 'level-push', templateId },
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await load();
        });
    };

    const archive = (templateId: number) => {
        startPending(async () => {
            const res = await updateVisibilityAction({
                gameSlug,
                gameId,
                categoryId: templateId,
                active: false,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await load();
        });
    };

    const addTemplate = () => {
        const trimmed = display.trim();
        if (!trimmed) return;
        startPending(async () => {
            const res = await createLevelTemplateAction({
                gameSlug,
                gameId,
                display: trimmed,
                primaryTiming: timing,
                // A new level category is featured by default: an unfeatured
                // one materialises boards nobody can see.
                isMain: true,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setDisplay('');
            await load();
        });
    };

    const templates = overview?.templates ?? [];

    return (
        <section className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <h2 className={consoleStyles.paneTitle}>Level categories</h2>
                <span className={consoleStyles.paneCount}>
                    {templates.length}
                </span>
            </div>
            <p className={consoleStyles.paneLede}>
                The categories every level gets. Edit one here and the change
                applies to each level&rsquo;s board.
            </p>

            <InlineError>{error}</InlineError>

            {loading && <p className="text-muted">Loading level categories…</p>}

            {!loading && templates.length === 0 && (
                <div className={styles.empty}>
                    No level categories yet. Add one and every level gets a
                    board for it.
                </div>
            )}

            {templates.length > 0 && (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Featured</th>
                            <th>On levels</th>
                            <th aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody>
                        {templates.map((t) => (
                            <tr key={t.id}>
                                <td>{t.display}</td>
                                <td>{t.isMain ? 'Featured' : '—'}</td>
                                <td>
                                    <span className={styles.count}>
                                        {t.synced}/{t.total}
                                    </span>
                                    {t.excluded > 0 && (
                                        <span
                                            className={`${styles.pill} ${styles.pillExcluded} ms-2`}
                                        >
                                            {t.excluded} excluded
                                        </span>
                                    )}
                                    {t.overridden > 0 && (
                                        <span
                                            className={`${styles.pill} ${styles.pillOverridden} ms-2`}
                                        >
                                            {t.overridden} edited on a level
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <div className="d-flex gap-2">
                                        <Link
                                            href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/category/${t.id}`}
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary"
                                            aria-label={`Push ${t.display} now`}
                                            disabled={isPending}
                                            onClick={() => push(t.id)}
                                        >
                                            Push now
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            aria-label={`Archive ${t.display}`}
                                            disabled={isPending}
                                            onClick={() => archive(t.id)}
                                        >
                                            Archive
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div className={styles.createRow}>
                <input
                    className="form-control form-control-sm w-auto"
                    aria-label="New level category"
                    placeholder="Category name"
                    value={display}
                    disabled={isPending}
                    onChange={(e) => setDisplay(e.target.value)}
                />
                <select
                    className="form-select form-select-sm w-auto"
                    aria-label="Primary timing"
                    value={timing}
                    disabled={isPending}
                    onChange={(e) => setTiming(e.target.value as Timing)}
                >
                    <option value="rt">Real time</option>
                    <option value="gametime">Game time</option>
                </select>
                <button
                    type="button"
                    className={kit.saveBtn}
                    disabled={isPending || !display.trim()}
                    onClick={addTemplate}
                >
                    Add level category
                </button>
            </div>
        </section>
    );
}
