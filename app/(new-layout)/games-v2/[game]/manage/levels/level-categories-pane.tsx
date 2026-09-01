'use client';

import { useState } from 'react';
import { Check2, ChevronRight, Dash, Diagram3 } from 'react-bootstrap-icons';
import { createLevelTemplateAction } from '~src/actions/levels/create-level-template.action';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import Link from '~src/components/link';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { InlineError } from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';
import styles from './levels.module.scss';
import { useActionRunner, useLevelOverview } from './use-level-overview';

interface Props {
    gameId: number;
    gameSlug: string;
}

const DEFAULT_TIMING: PrimaryTiming = 'realtime';

/**
 * The level categories (templates): the categories every level gets. Edited
 * once here, applied to every level board — which is why the counts, not the
 * settings, are what this table shows. `synced/total` is the honest answer to
 * "did my last edit land everywhere", and Push now is the repair.
 */
export function LevelCategoriesPane({ gameId, gameSlug }: Props) {
    const { overview, loading, error, reload, setError } = useLevelOverview(
        gameSlug,
        gameId,
    );
    const { isPending, run } = useActionRunner(setError, reload);
    const [display, setDisplay] = useState('');
    const [timing, setTiming] = useState<PrimaryTiming>(DEFAULT_TIMING);

    const push = (templateId: number) =>
        run(() =>
            levelOpAction({
                gameSlug,
                gameId,
                op: { op: 'level-push', templateId },
            }),
        );

    const archive = (templateId: number) =>
        run(() =>
            updateVisibilityAction({
                gameSlug,
                gameId,
                categoryId: templateId,
                active: false,
            }),
        );

    const addTemplate = () => {
        const trimmed = display.trim();
        if (!trimmed) return;
        run(
            () =>
                createLevelTemplateAction({
                    gameSlug,
                    gameId,
                    display: trimmed,
                    primaryTiming: timing,
                    // A new level category is featured by default: an
                    // unfeatured one materialises boards nobody can see.
                    isMain: true,
                }),
            () => {
                setDisplay('');
                setTiming(DEFAULT_TIMING);
            },
        );
    };

    const templates = overview?.templates ?? [];

    return (
        <section className={consoleStyles.surface}>
            <header className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Structure</div>
                    <div className={styles.titleRow}>
                        <h2 className={consoleStyles.paneTitle}>
                            Level categories
                        </h2>
                        <span className={consoleStyles.paneCount}>
                            {templates.length}
                        </span>
                    </div>
                </div>
            </header>
            <p className={consoleStyles.paneLede}>
                The categories every level gets. Edit one here and the change
                applies to each level&rsquo;s board.
            </p>

            <InlineError>{error}</InlineError>

            {loading && (
                <div
                    className={styles.loading}
                    role="status"
                    aria-label="Loading level categories"
                />
            )}

            {!loading && !error && templates.length === 0 && (
                <div className={styles.empty}>
                    <Diagram3
                        size={26}
                        className={styles.emptyIcon}
                        aria-hidden="true"
                    />
                    <p className={styles.emptyTitle}>No level categories yet</p>
                    <p className={styles.emptyBlurb}>
                        Add one and every level gets a board for it.
                    </p>
                </div>
            )}

            {templates.length > 0 && (
                <div className={styles.panel}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th className="text-center">Featured</th>
                                <th>On levels</th>
                                <th aria-label="Actions" />
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map((t) => (
                                <tr key={t.id}>
                                    <td className={styles.name}>{t.display}</td>
                                    <td className="text-center">
                                        {t.isMain ? (
                                            <Check2
                                                size={14}
                                                className={styles.check}
                                                aria-label="featured"
                                            />
                                        ) : (
                                            <Dash
                                                size={14}
                                                className={styles.dash}
                                                aria-label="not featured"
                                            />
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className={`${styles.count} ${
                                                t.synced < t.total
                                                    ? styles.countBehind
                                                    : ''
                                            }`}
                                        >
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
                                        <div className={styles.rowActions}>
                                            <button
                                                type="button"
                                                className={styles.quietAction}
                                                aria-label={`Push ${t.display} now`}
                                                disabled={isPending}
                                                onClick={() => push(t.id)}
                                            >
                                                Push now
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.quietAction} ${styles.archiveAction}`}
                                                aria-label={`Archive ${t.display}`}
                                                disabled={isPending}
                                                onClick={() => archive(t.id)}
                                            >
                                                Archive
                                            </button>
                                            <Link
                                                className={styles.pillAction}
                                                href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/category/${t.id}`}
                                            >
                                                Edit
                                                <ChevronRight
                                                    size={11}
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <form
                className={styles.createRow}
                onSubmit={(e) => {
                    e.preventDefault();
                    addTemplate();
                }}
            >
                <input
                    className={`form-control form-control-sm ${styles.createControl}`}
                    aria-label="New level category"
                    placeholder="Category name"
                    value={display}
                    disabled={isPending}
                    onChange={(e) => setDisplay(e.target.value)}
                />
                <select
                    className={`form-select form-select-sm ${styles.createControl}`}
                    aria-label="Primary timing"
                    value={timing}
                    disabled={isPending}
                    onChange={(e) => setTiming(e.target.value as PrimaryTiming)}
                >
                    <option value="realtime">Real time</option>
                    <option value="gametime">Game time</option>
                </select>
                <button
                    type="submit"
                    className={kit.saveBtn}
                    disabled={isPending || !display.trim()}
                >
                    Add level category
                </button>
            </form>
        </section>
    );
}
