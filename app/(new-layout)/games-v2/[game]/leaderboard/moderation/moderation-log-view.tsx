'use client';

import moment from 'moment';
import { useMemo, useState, useTransition } from 'react';
import Link from '~src/components/link';
import {
    describeLogAction,
    describeLogSubject,
} from '~src/lib/moderation/describe-log-action';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type {
    PublicModLogEntry,
    PublicModLogPage,
} from '../../../../../../types/moderation.types';
import { fetchModLogPage } from '../../actions/fetch-mod-log-page.action';
import {
    ACTION_GROUPS,
    type ActionGroup,
    actionGroupOf,
} from './action-groups';
import styles from './moderation-log-view.module.scss';

interface Props {
    gameId: number;
    gameSlug: string;
    categories: ResolvedCategory[];
    initial: PublicModLogPage;
}

/**
 * Public "Moderation" view — a read-only feed of the unified mod-log,
 * fed by GET /mod/v1/leaderboards/games/{gameId}/mod-log (no auth). See
 * docs/plans/2026-08-05-board-moderation-design.md §F and mocks fig. 4.
 *
 * The "Moderator view" redaction toggle from the mock is deliberately not
 * built here — anonymize/redaction is workstream C, and today's feed
 * contains real names either way (nothing to toggle yet).
 */
export function ModerationLogView({
    gameId,
    gameSlug,
    categories,
    initial,
}: Props) {
    const [pages, setPages] = useState<PublicModLogEntry[][]>([initial.items]);
    const [offset, setOffset] = useState(initial.offset + initial.items.length);
    const [total, setTotal] = useState(initial.total);
    const [hasMore, setHasMore] = useState(initial.hasMore);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [group, setGroup] = useState<ActionGroup>('all');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState(false);

    const items = useMemo(() => pages.flat(), [pages]);
    const visible = useMemo(
        () =>
            group === 'all'
                ? items
                : items.filter((e) => actionGroupOf(e.action) === group),
        [items, group],
    );

    const reload = (nextCategoryId: number | null) => {
        setCategoryId(nextCategoryId);
        startTransition(async () => {
            const res = await fetchModLogPage({
                gameId,
                offset: 0,
                categoryId: nextCategoryId ?? undefined,
            });
            if (!res) {
                setError(true);
                return;
            }
            setError(false);
            setPages([res.items]);
            setOffset(res.offset + res.items.length);
            setTotal(res.total);
            setHasMore(res.hasMore);
        });
    };

    const loadMore = () => {
        startTransition(async () => {
            const res = await fetchModLogPage({
                gameId,
                offset,
                categoryId: categoryId ?? undefined,
            });
            if (!res) {
                setError(true);
                return;
            }
            setError(false);
            setPages((prev) => [...prev, res.items]);
            setOffset(res.offset + res.items.length);
            setTotal(res.total);
            setHasMore(res.hasMore);
        });
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.filters}>
                <div className={styles.groupPills}>
                    {ACTION_GROUPS.map((g) => (
                        <button
                            key={g.key}
                            type="button"
                            className={`${styles.pillBtn} ${group === g.key ? styles.pillBtnOn : ''}`}
                            onClick={() => setGroup(g.key)}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>
                {categories.length > 1 && (
                    <select
                        className={styles.select}
                        aria-label="Filter by board"
                        value={categoryId ?? ''}
                        onChange={(e) =>
                            reload(
                                e.target.value === ''
                                    ? null
                                    : Number(e.target.value),
                            )
                        }
                        disabled={isPending}
                    >
                        <option value="">All boards</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.display}
                            </option>
                        ))}
                    </select>
                )}
                <span className={styles.total}>
                    {total.toLocaleString()} event{total === 1 ? '' : 's'}
                </span>
            </div>

            {visible.length === 0 ? (
                <div className={styles.empty}>
                    {items.length === 0
                        ? 'No moderation activity on this game yet.'
                        : 'No events match this filter in the loaded window.'}
                </div>
            ) : (
                <ul className={styles.log}>
                    {visible.map((entry) => (
                        <LogRow
                            key={entry.id}
                            entry={entry}
                            gameSlug={gameSlug}
                            categories={categories}
                        />
                    ))}
                </ul>
            )}

            {error && (
                <div className={styles.errorNote}>
                    Couldn't load more events.{' '}
                    <button
                        type="button"
                        className={styles.retry}
                        onClick={loadMore}
                    >
                        Retry
                    </button>
                </div>
            )}

            {hasMore && group === 'all' && (
                <div className={styles.showMoreBar}>
                    <button
                        type="button"
                        className={styles.showMoreBtn}
                        disabled={isPending}
                        onClick={loadMore}
                    >
                        {isPending ? 'Loading…' : 'Load more'}
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * One row of the unified public mod-log. Exported so other surfaces that
 * show a slice of the same feed (the runner dossier's "this runner in the
 * log" panel — workstream E) render it identically instead of re-deriving
 * the verb-pill/subject/reason markup.
 */
export function LogRow({
    entry,
    gameSlug,
    categories,
}: {
    entry: PublicModLogEntry;
    gameSlug: string;
    categories: ResolvedCategory[];
}) {
    const { label, severity } = describeLogAction(entry.action);
    const subject = describeLogSubject(entry);
    const category = categories.find((c) => c.id === entry.categoryId);
    const when = moment(entry.at);

    return (
        <li className={styles.row}>
            <div className={styles.when}>
                <b>{when.format('D MMM, HH:mm')}</b>
                <span>{when.fromNow()}</span>
            </div>
            <div className={styles.main}>
                <div className={styles.head}>
                    <span
                        className={`${styles.pill} ${styles[`pill-${severity}`]}`}
                    >
                        {label}
                    </span>
                    <span className={styles.what}>
                        {entry.runId != null ? (
                            <Link
                                href={`/games-v2/${gameSlug}/run/${entry.runId}`}
                            >
                                {subject}
                            </Link>
                        ) : (
                            subject
                        )}
                        {category && (
                            <span className={styles.onBoard}>
                                {' '}
                                on {category.display}
                            </span>
                        )}
                    </span>
                </div>
                {entry.reason && (
                    <div className={styles.reason}>“{entry.reason}”</div>
                )}
                <div className={styles.by}>by {entry.actor.username}</div>
            </div>
        </li>
    );
}
