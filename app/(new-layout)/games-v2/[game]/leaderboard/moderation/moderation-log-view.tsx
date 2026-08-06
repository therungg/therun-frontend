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
import { fetchModFeedPage } from '../../actions/fetch-mod-feed-page.action';
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
    /** Viewer can moderate this game — gates the "Moderator view" toggle. */
    canManage?: boolean;
}

const MOD_FEED_LIMIT = 25;

/**
 * Public "Moderation" view — a read-only feed of the unified mod-log,
 * fed by GET /mod/v1/leaderboards/games/{gameId}/mod-log (no auth). See
 * docs/plans/2026-08-05-board-moderation-design.md §F and mocks fig. 4.
 *
 * Moderators additionally get the mock's **"Moderator view"** switch. Off is
 * the public feed, byte-for-byte what a visitor sees (anonymized runners read
 * as their placeholder). On swaps the data source to the *authenticated* feed,
 * which is never redacted — and badges the rows whose subject the public sees
 * masked, so a mod can tell at a glance which names are theirs alone to see.
 * The two feeds are different contracts; `src/lib/moderation/mod-feed.ts`
 * carries the adapter and the list of seams.
 */
export function ModerationLogView({
    gameId,
    gameSlug,
    categories,
    initial,
    canManage = false,
}: Props) {
    const [pages, setPages] = useState<PublicModLogEntry[][]>([initial.items]);
    const [offset, setOffset] = useState(initial.offset + initial.items.length);
    const [total, setTotal] = useState(initial.total);
    const [hasMore, setHasMore] = useState(initial.hasMore);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [group, setGroup] = useState<ActionGroup>('all');
    const [modView, setModView] = useState(false);
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

    // One fetch seam for both feeds so the filters, paging and error handling
    // are written once and behave identically in either mode.
    const fetchPage = (
        nextModView: boolean,
        nextCategoryId: number | null,
        nextOffset: number,
    ): Promise<PublicModLogPage | null> =>
        nextModView
            ? fetchModFeedPage({
                  gameSlug,
                  limit: MOD_FEED_LIMIT,
                  offset: nextOffset,
                  categoryId: nextCategoryId ?? undefined,
              })
            : fetchModLogPage({
                  gameId,
                  offset: nextOffset,
                  categoryId: nextCategoryId ?? undefined,
              });

    const reload = (nextModView: boolean, nextCategoryId: number | null) => {
        setModView(nextModView);
        setCategoryId(nextCategoryId);
        startTransition(async () => {
            const res = await fetchPage(nextModView, nextCategoryId, 0);
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
            const res = await fetchPage(modView, categoryId, offset);
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
                                modView,
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
                {canManage && (
                    <label className={styles.viewSwitch}>
                        <input
                            type="checkbox"
                            checked={modView}
                            disabled={isPending}
                            onChange={(e) =>
                                reload(e.target.checked, categoryId)
                            }
                        />
                        <span className={styles.switchTrack} aria-hidden="true">
                            <span className={styles.switchKnob} />
                        </span>
                        Moderator view
                    </label>
                )}
                <span className={styles.total}>
                    {/* The authenticated feed has no count endpoint, so its
                        "total" is a floor, not a fact — say so rather than
                        print a confidently wrong number. */}
                    {modView
                        ? `${items.length.toLocaleString()} loaded`
                        : `${total.toLocaleString()} event${total === 1 ? '' : 's'}`}
                </span>
            </div>

            {modView && (
                <p className={styles.modNote}>
                    Real identities, visible to moderators only. Rows tagged{' '}
                    <span className={styles.anonTag}>publicly anonymous</span>{' '}
                    read as a placeholder for everyone else. This feed reaches
                    back one year.
                </p>
            )}

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
                            moderatorView={modView}
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
    moderatorView = false,
}: {
    entry: PublicModLogEntry;
    gameSlug: string;
    categories: ResolvedCategory[];
    /**
     * Set on the moderator feed only. The subject name is then the REAL one,
     * and `subject.anonymized` means "the public sees a placeholder here" —
     * worth a tag. On the public feed the same flag is already reflected in
     * the name itself, so tagging it would be noise.
     */
    moderatorView?: boolean;
}) {
    const { label, severity } = describeLogAction(entry.action);
    const subject = describeLogSubject(entry);
    const category = categories.find((c) => c.id === entry.categoryId);
    const when = moment(entry.at);
    const anonTag =
        moderatorView && entry.subject?.anonymized
            ? entry.subject.anonId != null
                ? `publicly anonymous · #${entry.subject.anonId}`
                : 'publicly anonymous'
            : null;

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
                                href={`/games-v2/${encodeURIComponent(gameSlug)}/run/${entry.runId}`}
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
                    {anonTag && (
                        <span className={styles.anonTag}>{anonTag}</span>
                    )}
                </div>
                {entry.reason && (
                    <div className={styles.reason}>“{entry.reason}”</div>
                )}
                <div className={styles.by}>by {entry.actor.username}</div>
            </div>
        </li>
    );
}
