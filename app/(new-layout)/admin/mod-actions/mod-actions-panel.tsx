'use client';

import Link from 'next/link';
import { Fragment, useRef, useState, useTransition } from 'react';
import { BoxArrowUpRight } from 'react-bootstrap-icons';
import { relativeDate } from '~app/(new-layout)/games/[game]/leaderboard/relative-date';
import type { AdminModActionsFilter } from '~src/lib/admin-mod-actions';
import {
    type AdminModAction,
    type AdminModActionsPage,
    MOD_ACTION_FAMILIES,
    type ModActionFamily,
} from '../../../../types/admin-mod-actions.types';
import adminStyles from '../admin.module.scss';
import { loadModActionsAction } from './actions/load-mod-actions.action';
import styles from './mod-actions.module.scss';

const FAMILY_LABELS: Record<ModActionFamily, string> = {
    verdicts: 'Verdicts',
    runs: 'Run edits & moves',
    exclusions: 'Exclusions',
    bans: 'Bans',
    manual_times: 'Manual times',
    board: 'Board',
    config: 'Categories & games',
    variables: 'Variables',
    roles: 'Roles',
    privacy: 'Privacy',
    other: 'Other',
};

const HOUR_MS = 3_600_000;

// relativeDate is calendar-day based; an audit log needs the same day split
// into minutes and hours.
function when(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms)) return '';
    if (ms < 60_000) return 'just now';
    if (ms < HOUR_MS) return `${Math.floor(ms / 60_000)} min ago`;
    if (ms < 24 * HOUR_MS) return `${Math.floor(ms / HOUR_MS)} h ago`;
    return relativeDate(iso);
}

function exactTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function rowKey(a: AdminModAction): string {
    return `${a.source}-${a.id}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

interface DiffLine {
    key: string;
    old: unknown;
    new: unknown;
}

function diffLines(detail: unknown): DiffLine[] | null {
    if (!isRecord(detail)) return null;

    const { before, after } = detail;
    if (isRecord(before) && isRecord(after)) {
        const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
        return [...keys]
            .filter(
                (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
            )
            .map((k) => ({ key: k, old: before[k], new: after[k] }));
    }

    const entries = Object.entries(detail);
    if (
        entries.length > 0 &&
        entries.every(([, v]) => isRecord(v) && ('old' in v || 'new' in v))
    ) {
        return entries.map(([k, v]) => {
            const d = v as { old?: unknown; new?: unknown };
            return { key: k, old: d.old, new: d.new };
        });
    }

    return null;
}

function formatValue(v: unknown): string {
    if (v === undefined || v === null) return '—';
    if (typeof v === 'string') return v;
    return JSON.stringify(v);
}

function Detail({ detail }: { detail: unknown }) {
    if (detail === null || detail === undefined) {
        return <span className={styles.muted}>No detail stored.</span>;
    }
    const lines = diffLines(detail);
    if (lines) {
        if (lines.length === 0) {
            return <span className={styles.muted}>No fields changed.</span>;
        }
        return (
            <div className={styles.diff}>
                <span className={styles.diffHead}>Field</span>
                <span className={styles.diffHead}>Old</span>
                <span className={styles.diffHead}>New</span>
                {lines.map((l) => (
                    <Fragment key={l.key}>
                        <span className={styles.diffKey}>{l.key}</span>
                        <span className={styles.diffOld}>
                            {formatValue(l.old)}
                        </span>
                        <span className={styles.diffNew}>
                            {formatValue(l.new)}
                        </span>
                    </Fragment>
                ))}
            </div>
        );
    }
    return <pre className={styles.raw}>{JSON.stringify(detail, null, 2)}</pre>;
}

function Target({ a }: { a: AdminModAction }) {
    if (a.entity === 'finished_run' && a.target && /^\d+$/.test(a.target)) {
        if (!a.game) return <>run {a.target}</>;
        return (
            <Link
                href={`/games/${encodeURIComponent(a.game.name)}/run/${a.target}`}
                onClick={(e) => e.stopPropagation()}
            >
                run {a.target}
            </Link>
        );
    }
    const person = a.subject?.username ?? a.subject?.guestName;
    if (person) return <>{person}</>;
    return <>{`${a.entity} ${a.target ?? ''}`.trim()}</>;
}

interface Labels {
    game: string | null;
    mod: string | null;
}

function labelsFrom(filter: AdminModActionsFilter, items: AdminModAction[]) {
    const game = filter.gameId
        ? (items.find((i) => i.game?.id === filter.gameId)?.game?.display ??
          `#${filter.gameId}`)
        : null;
    const mod = filter.actorId
        ? (items.find((i) => i.actor.id === filter.actorId)?.actor.username ??
          `#${filter.actorId}`)
        : null;
    return { game, mod };
}

function urlFor(filter: AdminModActionsFilter): string {
    const sp = new URLSearchParams();
    if (filter.types.length > 0) sp.set('types', filter.types.join(','));
    if (filter.gameId) sp.set('game', String(filter.gameId));
    if (filter.actorId) sp.set('mod', String(filter.actorId));
    const qs = sp.toString();
    return `${window.location.pathname}${qs ? `?${qs}` : ''}`;
}

export const ModActionsPanel = ({
    initial,
    initialError,
    filter: initialFilter,
}: {
    initial: AdminModActionsPage;
    initialError: string | null;
    filter: AdminModActionsFilter;
}) => {
    const [filter, setFilter] = useState(initialFilter);
    const [labels, setLabels] = useState<Labels>(() =>
        labelsFrom(initialFilter, initial.items),
    );
    const [items, setItems] = useState(initial.items);
    const [nextCursor, setNextCursor] = useState(initial.nextCursor);
    const [error, setError] = useState(initialError);
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
    const [isReloading, startReload] = useTransition();
    const [isLoadingMore, startLoadMore] = useTransition();
    // Only the newest filter reload may write the table; an older one that
    // resolves late is dropped.
    const requestSeq = useRef(0);

    const applyFilter = (next: AdminModActionsFilter, nextLabels: Labels) => {
        setFilter(next);
        setLabels(nextLabels);
        window.history.replaceState(null, '', urlFor(next));
        const seq = ++requestSeq.current;
        startReload(async () => {
            const res = await loadModActionsAction(next);
            if (seq !== requestSeq.current) return;
            if ('error' in res) {
                setError(res.error);
                setItems([]);
                setNextCursor(null);
                return;
            }
            setError(null);
            setItems(res.result.items);
            setNextCursor(res.result.nextCursor);
            setExpanded(new Set());
        });
    };

    const toggleType = (t: ModActionFamily) => {
        const types = filter.types.includes(t)
            ? filter.types.filter((x) => x !== t)
            : MOD_ACTION_FAMILIES.filter(
                  (x) => x === t || filter.types.includes(x),
              );
        applyFilter({ ...filter, types }, labels);
    };

    const setGame = (game: AdminModAction['game']) => {
        applyFilter(
            { ...filter, gameId: game?.id },
            { ...labels, game: game?.display ?? null },
        );
    };

    const setMod = (actor: AdminModAction['actor'] | null) => {
        applyFilter(
            { ...filter, actorId: actor?.id },
            {
                ...labels,
                mod: actor ? (actor.username ?? `#${actor.id}`) : null,
            },
        );
    };

    const loadMore = () => {
        if (!nextCursor) return;
        const seq = requestSeq.current;
        startLoadMore(async () => {
            const res = await loadModActionsAction({
                ...filter,
                before: nextCursor,
            });
            if (seq !== requestSeq.current) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setError(null);
            setItems((prev) => [...prev, ...res.result.items]);
            setNextCursor(res.result.nextCursor);
        });
    };

    const toggleRow = (key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className={adminStyles.pageWide}>
            <h1 className={adminStyles.pageTitle}>Mod actions</h1>

            <div className={styles.filters}>
                {MOD_ACTION_FAMILIES.map((t) => {
                    const on = filter.types.includes(t);
                    return (
                        <button
                            key={t}
                            type="button"
                            className={on ? styles.chipOn : styles.chip}
                            aria-pressed={on}
                            onClick={() => toggleType(t)}
                        >
                            {FAMILY_LABELS[t]}
                        </button>
                    );
                })}
                {filter.gameId && (
                    <button
                        type="button"
                        className={styles.chipOn}
                        onClick={() => setGame(null)}
                        aria-label={`Clear game filter ${labels.game ?? ''}`}
                    >
                        Game: {labels.game} ×
                    </button>
                )}
                {filter.actorId && (
                    <button
                        type="button"
                        className={styles.chipOn}
                        onClick={() => setMod(null)}
                        aria-label={`Clear moderator filter ${labels.mod ?? ''}`}
                    >
                        Mod: {labels.mod} ×
                    </button>
                )}
            </div>

            {error && <div className={adminStyles.alertDanger}>{error}</div>}

            <div
                className={styles.tableWrap}
                style={isReloading ? { opacity: 0.55 } : undefined}
                aria-busy={isReloading}
            >
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>When</th>
                            <th>Moderator</th>
                            <th>Game</th>
                            <th>Type</th>
                            <th>Target</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && !error && (
                            <tr>
                                <td colSpan={6} className={styles.empty}>
                                    No actions match these filters.
                                </td>
                            </tr>
                        )}
                        {items.map((a) => {
                            const key = rowKey(a);
                            const open = expanded.has(key);
                            return (
                                <Fragment key={key}>
                                    <tr
                                        className={styles.row}
                                        onClick={() => toggleRow(key)}
                                        onKeyDown={(e) => {
                                            if (
                                                e.target === e.currentTarget &&
                                                (e.key === 'Enter' ||
                                                    e.key === ' ')
                                            ) {
                                                e.preventDefault();
                                                toggleRow(key);
                                            }
                                        }}
                                        tabIndex={0}
                                        aria-expanded={open}
                                    >
                                        <td
                                            className={styles.time}
                                            title={exactTime(a.at)}
                                            suppressHydrationWarning
                                        >
                                            {when(a.at)}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={styles.linkish}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMod(a.actor);
                                                }}
                                            >
                                                {a.actor.username ??
                                                    `#${a.actor.id}`}
                                            </button>
                                        </td>
                                        <td>
                                            {a.game ? (
                                                <span className={styles.game}>
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.linkish
                                                        }
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setGame(a.game);
                                                        }}
                                                    >
                                                        {a.game.display}
                                                    </button>
                                                    <Link
                                                        href={`/games/${encodeURIComponent(a.game.name)}`}
                                                        className={
                                                            styles.gameLink
                                                        }
                                                        aria-label={`Open ${a.game.display}`}
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <BoxArrowUpRight
                                                            size={11}
                                                        />
                                                    </Link>
                                                </span>
                                            ) : (
                                                <span className={styles.muted}>
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div>{FAMILY_LABELS[a.family]}</div>
                                            <div className={styles.action}>
                                                {a.action}
                                            </div>
                                        </td>
                                        <td>
                                            <Target a={a} />
                                        </td>
                                        <td className={styles.reason}>
                                            {a.reason}
                                        </td>
                                    </tr>
                                    {open && (
                                        <tr className={styles.detailRow}>
                                            <td colSpan={6}>
                                                <Detail detail={a.detail} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {nextCursor && !isReloading && (
                <div className={styles.more}>
                    <button
                        type="button"
                        className={styles.chip}
                        onClick={loadMore}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? 'Loading…' : 'Load more'}
                    </button>
                </div>
            )}
        </div>
    );
};
