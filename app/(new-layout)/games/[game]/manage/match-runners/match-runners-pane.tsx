'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { CheckCircle } from 'react-bootstrap-icons';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import Link from '~src/components/link';
import { buildConsolePaneHref, buildModRunnerHref } from '~src/lib/board-url';
import { SRC_MATCH_BATCH } from '~src/lib/moderation/src-matches';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type {
    SrcMatchLink,
    SrcMatchLinkResult,
    SrcMatchPb,
    SrcMatchRow,
    SrcMatchSuggestion,
} from '../../../../../../types/src-matches.types';
import { RunnerAvatar } from '../../leaderboard/runner-avatar';
import {
    linkSrcMatchesAction,
    loadSrcMatchesAction,
} from './actions/src-matches.action';
import styles from './match-runners.module.scss';

interface RowState {
    row: SrcMatchRow;
    /** srcUserId of the chosen suggestion. */
    picked: string | null;
    /** A name typed by the moderator; overrides `picked` when it is not empty. */
    typed: string;
    ticked: boolean;
    error: string | null;
    /** Set when an admin can move the profile off its current holder. */
    overrideOffer: {
        linkedTo: { userId: number; username: string } | null;
    } | null;
    /** True while this row's own override link is in flight. */
    overriding: boolean;
}

type StateFilter = 'all' | SrcMatchRow['state'];

const FILTER_LABEL: Record<StateFilter, string> = {
    all: 'All',
    contested: 'Contested',
    none: 'No match',
    sure: 'Sure',
};

/** PB lines shown before the rest fold behind "+N more". */
const PB_PREVIEW = 2;

const plural = (n: number, one: string, many: string) =>
    `${n.toLocaleString()} ${n === 1 ? one : many}`;

// Linking starts a run import for the runner, which finishes on its own after
// the request. Runners who turned the import off are silently left out, so the
// count can be lower than the number linked.
const importingNote = (importing: number, linked: number) => {
    if (importing === 0) return '';
    if (importing === linked) return ' Their runs are being imported now.';
    return ` Runs are being imported for ${importing} of them.`;
};

// A pasted profile link becomes the name at the end of it.
const cleanName = (value: string) =>
    value
        .trim()
        .replace(/^https?:\/\/(www\.)?speedrun\.com\/(users\/)?/i, '')
        .replace(/[/?#].*$/, '');

const failMessage = (result: Extract<SrcMatchLinkResult, { ok: false }>) => {
    switch (result.code) {
        case 'already-linked':
            return result.canOverride
                ? `Already linked to ${result.linkedTo?.username ?? 'another runner'}.`
                : 'That profile is linked to another runner.';
        case 'src-not-found':
            return 'Not found on speedrun.com. Check the spelling.';
        case 'already-set':
            return 'Already has a profile.';
        default:
            return 'Could not link. Try again.';
    }
};

const overrideOfferFor = (
    result: Extract<SrcMatchLinkResult, { ok: false }>,
) =>
    result.code === 'already-linked' && result.canOverride
        ? { linkedTo: result.linkedTo }
        : null;

const pbValues = (subcategoryKey: string) =>
    subcategoryKey
        .split('|')
        .filter(Boolean)
        .map((pair) => pair.slice(pair.indexOf('=') + 1))
        .join(', ');

const suggestionLabel = (s: SrcMatchSuggestion) => {
    const reason =
        s.origin === 'times'
            ? `same time on ${plural(s.boards, 'board', 'boards')}`
            : `clears ${s.clears}`;
    const also =
        s.alsoMatches > 0
            ? `, also matches ${plural(s.alsoMatches, 'other runner', 'other runners')}`
            : '';
    return `${s.srcName} (${reason})${also}`;
};

const pickedSuggestion = (r: RowState) =>
    r.picked
        ? r.row.suggestions.find((s) => s.srcUserId === r.picked)
        : undefined;

// What will actually be linked, for the counts: a typed name overrides the
// suggestion, and we know nothing about how many queued runs it clears.
const effectiveSuggestion = (r: RowState) =>
    cleanName(r.typed) ? undefined : pickedSuggestion(r);

const toLink = (r: RowState): SrcMatchLink | null => {
    const srcName = cleanName(r.typed);
    if (srcName) return { userId: r.row.userId, srcName };
    return r.picked ? { userId: r.row.userId, srcUserId: r.picked } : null;
};

const initialRow = (row: SrcMatchRow, prev?: RowState): RowState => {
    const picked =
        prev?.picked && row.suggestions.some((s) => s.srcUserId === prev.picked)
            ? prev.picked
            : row.state === 'sure'
              ? (row.suggestions[0]?.srcUserId ?? null)
              : null;
    return {
        row,
        picked,
        typed: prev?.typed ?? '',
        ticked: prev ? prev.ticked : row.state === 'sure',
        error: prev?.error ?? null,
        overrideOffer: prev?.overrideOffer ?? null,
        overriding: false,
    };
};

/**
 * Keeps the server's state grouping and orders each group by queued runs, so
 * the runner whose link clears the most sits at the top of their group.
 */
const sortRows = (rows: RowState[]) => {
    const groupRank = new Map<SrcMatchRow['state'], number>();
    for (const r of rows) {
        if (!groupRank.has(r.row.state)) {
            groupRank.set(r.row.state, groupRank.size);
        }
    }
    return [...rows].sort(
        (a, b) =>
            (groupRank.get(a.row.state) ?? 0) -
                (groupRank.get(b.row.state) ?? 0) ||
            b.row.queued - a.row.queued,
    );
};

export function MatchRunnersPane({
    gameSlug,
    framed = false,
}: {
    gameSlug: string;
    /** In the console: the pane's own header and panel. The setup wizard
     *  frames it itself. */
    framed?: boolean;
}) {
    const router = useRouter();
    const [rows, setRows] = useState<RowState[] | null>(null);
    const [imported, setImported] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [isLoading, startLoad] = useTransition();
    const requestId = useRef(0);

    const [filter, setFilter] = useState<StateFilter>('all');
    const [reviewing, setReviewing] = useState(false);
    const [linking, setLinking] = useState(false);
    const [progress, setProgress] = useState<{
        done: number;
        total: number;
    } | null>(null);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [doneMessage, setDoneMessage] = useState<string | null>(null);

    // attempt re-runs the load on retry and after linking
    useEffect(() => {
        const ticket = ++requestId.current;
        startLoad(async () => {
            let res: Awaited<ReturnType<typeof loadSrcMatchesAction>>;
            try {
                res = await loadSrcMatchesAction(gameSlug);
            } catch {
                res = { error: 'Could not load runners.' };
            }
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setLoadError(res.error);
                return;
            }
            setLoadError(null);
            // A const, so the narrowed list reaches the updater below.
            const { list } = res;
            setImported(list.imported);
            setRows((current) => {
                // Rows already on screen keep what the moderator ticked,
                // picked and typed; only new rows take the defaults.
                const prev = new Map(
                    (current ?? []).map((r) => [r.row.userId, r]),
                );
                return list.rows.map((row) =>
                    initialRow(row, prev.get(row.userId)),
                );
            });
        });
    }, [gameSlug, attempt]);

    const update = (userId: number, patch: Partial<RowState>) =>
        setRows((rs) =>
            rs
                ? rs.map((r) =>
                      r.row.userId === userId ? { ...r, ...patch } : r,
                  )
                : rs,
        );

    const linkTicked = async () => {
        if (!rows || linking) return;
        const links = rows
            .filter((r) => r.ticked)
            .map(toLink)
            .filter((l): l is SrcMatchLink => l !== null);
        setReviewing(false);
        if (links.length === 0) return;

        setLinking(true);
        setLinkError(null);
        setDoneMessage(null);
        setProgress({ done: 0, total: links.length });

        let linked = 0;
        let merged = 0;
        let importing = 0;
        let stopped = false;

        try {
            for (let i = 0; i < links.length; i += SRC_MATCH_BATCH) {
                const chunk = links.slice(i, i + SRC_MATCH_BATCH);
                let res: Awaited<ReturnType<typeof linkSrcMatchesAction>>;
                try {
                    res = await linkSrcMatchesAction(gameSlug, chunk);
                } catch {
                    res = { error: 'Could not link runners.' };
                }
                if ('error' in res) {
                    setLinkError(res.error);
                    stopped = true;
                    break;
                }
                const byUser = new Map(res.results.map((r) => [r.userId, r]));
                for (const r of res.results) {
                    if (r.ok) {
                        linked += 1;
                        merged += r.mergedRuns;
                        if (r.syncQueued) importing += 1;
                    }
                }
                setRows((rs) =>
                    rs
                        ? rs.flatMap((r) => {
                              const result = byUser.get(r.row.userId);
                              if (!result) return [r];
                              if (result.ok || result.code === 'already-set') {
                                  return [];
                              }
                              return [
                                  {
                                      ...r,
                                      // 'error' may be a link the server ran out
                                      // of time for, so it stays ticked to retry.
                                      ticked:
                                          result.code === 'error' && r.ticked,
                                      error: failMessage(result),
                                      overrideOffer: overrideOfferFor(result),
                                  },
                              ];
                          })
                        : rs,
                );
                setProgress({
                    done: Math.min(i + chunk.length, links.length),
                    total: links.length,
                });
            }
        } finally {
            setLinking(false);
            setProgress(null);
        }
        if (linked > 0) {
            setDoneMessage(
                `Linked ${plural(linked, 'runner', 'runners')}, ${plural(merged, 'run', 'runs')} verified from speedrun.com.${importingNote(importing, linked)}`,
            );
        }
        if (!stopped || linked > 0) {
            setAttempt((n) => n + 1);
            router.refresh();
        }
    };

    const overrideRow = async (r: RowState) => {
        const link = toLink(r);
        if (!link || linking || r.overriding) return;
        const name = r.overrideOffer?.linkedTo?.username ?? 'that runner';
        if (
            !window.confirm(
                `Remove this speedrun.com profile from ${name} and link it to ${r.row.username}? Their runs stay with them.`,
            )
        ) {
            return;
        }

        update(r.row.userId, { overriding: true, error: null });
        try {
            let res: Awaited<ReturnType<typeof linkSrcMatchesAction>>;
            try {
                res = await linkSrcMatchesAction(gameSlug, [
                    { ...link, override: true },
                ]);
            } catch {
                res = { error: 'Could not link runners.' };
            }
            if ('error' in res) {
                update(r.row.userId, { overriding: false, error: res.error });
                return;
            }
            const result = res.results[0];
            if (!result) {
                update(r.row.userId, {
                    overriding: false,
                    error: 'Could not link. Try again.',
                });
                return;
            }
            if (result.ok) {
                setDoneMessage(
                    `Linked ${plural(1, 'runner', 'runners')}, ${plural(
                        result.mergedRuns,
                        'run',
                        'runs',
                    )} verified from speedrun.com.${importingNote(
                        result.syncQueued ? 1 : 0,
                        1,
                    )}`,
                );
                setRows((rs) =>
                    rs ? rs.filter((x) => x.row.userId !== r.row.userId) : rs,
                );
                setAttempt((n) => n + 1);
                router.refresh();
                return;
            }
            update(r.row.userId, {
                overriding: false,
                error: failMessage(result),
                overrideOffer: overrideOfferFor(result),
            });
        } catch {
            update(r.row.userId, {
                overriding: false,
                error: 'Could not link. Try again.',
            });
        }
    };

    const frame = (count: number | null, body: React.ReactNode) =>
        framed ? (
            <section className={consoleStyles.surface}>
                <header className={consoleStyles.paneHeader}>
                    <div>
                        <div className={consoleStyles.paneEyebrow}>
                            Speedrun.com
                        </div>
                        <h2 className={consoleStyles.paneTitle}>
                            Match runners
                        </h2>
                    </div>
                    {count !== null && count > 0 && (
                        <span className={consoleStyles.paneCount}>
                            {plural(count, 'runner', 'runners')} unmatched
                        </span>
                    )}
                </header>
                {body}
            </section>
        ) : (
            <div>{body}</div>
        );

    if (loadError && !rows) {
        return frame(
            null,
            <div className={styles.errorAlert} role="alert">
                {loadError}{' '}
                <button
                    type="button"
                    className={styles.quietButton}
                    onClick={() => setAttempt((n) => n + 1)}
                    disabled={isLoading}
                >
                    {isLoading ? 'Trying again…' : 'Try again'}
                </button>
            </div>,
        );
    }

    if (!rows) {
        return frame(
            null,
            <div className={styles.frame} aria-busy="true">
                <span className="visually-hidden">Loading runners</span>
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className={styles.skeletonRow} aria-hidden>
                        <span className={styles.skeletonAvatar} />
                        <span className={styles.skeletonName} />
                        <span className={styles.skeletonField} />
                    </div>
                ))}
            </div>,
        );
    }

    const counts = rows.reduce<Record<SrcMatchRow['state'], number>>(
        (acc, r) => {
            acc[r.row.state] += 1;
            return acc;
        },
        { sure: 0, contested: 0, none: 0 },
    );
    const filters = (['contested', 'none', 'sure'] as const).filter(
        (f) => counts[f] > 0,
    );
    const activeFilter =
        filter !== 'all' && counts[filter] > 0 ? filter : 'all';
    const visible = sortRows(rows).filter(
        (r) => activeFilter === 'all' || r.row.state === activeFilter,
    );
    const linkable = visible.filter((r) => toLink(r) !== null);
    const tickedShown = linkable.filter((r) => r.ticked).length;
    // Checked only when every row shown is ticked; a runner with nothing to
    // link yet keeps it at "some", so the box never claims more than it did.
    const headState =
        tickedShown === 0
            ? 'none'
            : tickedShown === visible.length
              ? 'all'
              : 'some';

    const ticked = rows.filter((r) => r.ticked && toLink(r));
    const clears = ticked.reduce(
        (sum, r) => sum + (effectiveSuggestion(r)?.clears ?? 0),
        0,
    );

    const tickVisible = (on: boolean) => {
        const ids = new Set(linkable.map((r) => r.row.userId));
        setRows((rs) =>
            rs
                ? rs.map((r) =>
                      ids.has(r.row.userId) ? { ...r, ticked: on } : r,
                  )
                : rs,
        );
    };

    return frame(
        rows.length,
        <>
            {!imported && (
                <p className={styles.note}>
                    No speedrun.com import yet.{' '}
                    <Link href={buildConsolePaneHref(gameSlug, 'import')}>
                        Import from speedrun.com
                    </Link>{' '}
                    to find matches.
                </p>
            )}
            {linkError && (
                <div className={styles.errorAlert} role="alert">
                    {linkError}
                </div>
            )}
            {loadError && (
                <div className={styles.errorAlert} role="alert">
                    {loadError}{' '}
                    <button
                        type="button"
                        className={styles.quietButton}
                        onClick={() => setAttempt((n) => n + 1)}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Trying again…' : 'Try again'}
                    </button>
                </div>
            )}
            {rows.length === 0 ? (
                <>
                    {doneMessage && (
                        <p className={styles.note} role="status">
                            {doneMessage}
                        </p>
                    )}
                    {imported && (
                        <div className={styles.empty}>
                            <CheckCircle
                                size={28}
                                className={styles.emptyIcon}
                                aria-hidden
                            />
                            <p className={styles.emptyTitle}>
                                Every runner is matched
                            </p>
                        </div>
                    )}
                </>
            ) : (
                <>
                    {filters.length > 1 && (
                        <div
                            className={styles.filters}
                            role="group"
                            aria-label="Show runners"
                        >
                            {(['all', ...filters] as StateFilter[]).map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    aria-pressed={activeFilter === f}
                                    className={
                                        activeFilter === f
                                            ? styles.chipActive
                                            : styles.chip
                                    }
                                    onClick={() => setFilter(f)}
                                >
                                    {FILTER_LABEL[f]}
                                    <span className={styles.chipCount}>
                                        {f === 'all' ? rows.length : counts[f]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className={styles.frame}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.checkCol}>
                                        <HeadCheck
                                            state={headState}
                                            disabled={
                                                linking || linkable.length === 0
                                            }
                                            onToggle={() =>
                                                tickVisible(
                                                    tickedShown <
                                                        linkable.length,
                                                )
                                            }
                                        />
                                    </th>
                                    <th>Runner</th>
                                    <th className={styles.right}>Queued</th>
                                    <th>speedrun.com</th>
                                    <th className={styles.right}>Clears</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((r) => (
                                    <MatchRow
                                        key={r.row.userId}
                                        state={r}
                                        gameSlug={gameSlug}
                                        disabled={linking}
                                        onChange={(patch) =>
                                            update(r.row.userId, patch)
                                        }
                                        onOverride={() => overrideRow(r)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ActionBar
                        ticked={ticked}
                        clears={clears}
                        reviewing={reviewing}
                        linking={linking}
                        progress={progress}
                        doneMessage={doneMessage}
                        onReview={() => setReviewing(true)}
                        onCancel={() => setReviewing(false)}
                        onConfirm={linkTicked}
                    />
                </>
            )}
        </>,
    );
}

/** Ticks every linkable runner shown, or clears them once all are ticked. */
function HeadCheck({
    state,
    disabled,
    onToggle,
}: {
    state: 'none' | 'some' | 'all';
    disabled: boolean;
    onToggle: () => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = state === 'some';
    }, [state]);
    return (
        <input
            ref={ref}
            type="checkbox"
            className={styles.check}
            checked={state === 'all'}
            disabled={disabled}
            onChange={onToggle}
            aria-label="Tick every runner that can be linked"
        />
    );
}

/**
 * Pinned to the bottom of the viewport while the list scrolls: what is ticked,
 * what it clears, and the one action. Linking is reviewed first, in place: it
 * clears queued runs and starts imports, and a typed name has not been checked
 * against speedrun.com yet.
 */
function ActionBar({
    ticked,
    clears,
    reviewing,
    linking,
    progress,
    doneMessage,
    onReview,
    onCancel,
    onConfirm,
}: {
    ticked: RowState[];
    clears: number;
    reviewing: boolean;
    linking: boolean;
    progress: { done: number; total: number } | null;
    doneMessage: string | null;
    onReview: () => void;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const n = ticked.length;
    const summary = progress
        ? `Linking ${progress.done} of ${progress.total}…`
        : n === 0
          ? (doneMessage ?? 'Tick runners to link them.')
          : `${plural(n, 'runner', 'runners')} ticked · clears ${plural(clears, 'queued run', 'queued runs')}`;

    return (
        <div className={styles.actionBar}>
            {reviewing && n > 0 && (
                <ul className={styles.review} aria-label="Runners to link">
                    {ticked.map((r) => {
                        const typed = cleanName(r.typed);
                        const suggestion = effectiveSuggestion(r);
                        return (
                            <li key={r.row.userId}>
                                <span className={styles.reviewName}>
                                    {r.row.username}
                                </span>
                                <span aria-hidden> → </span>
                                <span>{typed || suggestion?.srcName}</span>
                                {typed ? (
                                    <span className={styles.tag}>
                                        typed, checked on link
                                    </span>
                                ) : (
                                    suggestion &&
                                    suggestion.clears > 0 && (
                                        <span className={styles.reviewClears}>
                                            clears {suggestion.clears}
                                        </span>
                                    )
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className={styles.actionRow}>
                <span role="status" className={styles.actionSummary}>
                    {summary}
                </span>
                {reviewing && n > 0 ? (
                    <div className={styles.actionButtons}>
                        <button
                            type="button"
                            className={styles.quietButton}
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={onConfirm}
                        >
                            Link {plural(n, 'runner', 'runners')}
                        </button>
                    </div>
                ) : (
                    n > 0 && (
                        <button
                            type="button"
                            className={styles.primaryButton}
                            disabled={linking}
                            onClick={onReview}
                        >
                            Review and link
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

function PbLine({ pb }: { pb: SrcMatchPb }) {
    const values = pbValues(pb.subcategoryKey);
    return (
        <li>
            <span>
                {pb.category}
                {values ? ` (${values})` : ''}
            </span>{' '}
            <span className={styles.pbTime}>
                {formatTimeMs(pb.timeMs)}
                {pb.timing === 'gametime' ? ' IGT' : ''}
            </span>{' '}
            <span className={styles.pbRank}>#{pb.rank}</span>
        </li>
    );
}

function MatchRow({
    state,
    gameSlug,
    disabled,
    onChange,
    onOverride,
}: {
    state: RowState;
    gameSlug: string;
    disabled: boolean;
    onChange: (patch: Partial<RowState>) => void;
    onOverride: () => void;
}) {
    const { row } = state;
    const [allPbs, setAllPbs] = useState(false);
    const errorId = useId();
    const suggestion = pickedSuggestion(state);
    const canLink = toLink(state) !== null;
    const typedWins = cleanName(state.typed) !== '' && suggestion;
    const pbs = allPbs ? row.pbs : row.pbs.slice(0, PB_PREVIEW);
    const hidden = row.pbs.length - pbs.length;
    const describedBy = state.error ? errorId : undefined;
    const clears = effectiveSuggestion(state)?.clears;

    return (
        <tr className={state.error ? styles.rowFailed : undefined}>
            <td className={styles.checkCol}>
                <input
                    type="checkbox"
                    className={styles.check}
                    checked={state.ticked && canLink}
                    disabled={disabled || !canLink}
                    onChange={(e) => onChange({ ticked: e.target.checked })}
                    aria-label={`Link ${row.username}`}
                />
            </td>
            <td className={styles.runnerCol}>
                <div className={styles.runnerCell}>
                    <RunnerAvatar name={row.username} picture={row.picture} />
                    <div>
                        <Link
                            className={styles.runner}
                            href={buildModRunnerHref(gameSlug, row.userId)}
                        >
                            {row.username}
                        </Link>
                        {pbs.length > 0 && (
                            <ul className={styles.pbs}>
                                {pbs.map((pb, i) => (
                                    <PbLine
                                        key={`${pb.categoryId}:${pb.subcategoryKey}:${i}`}
                                        pb={pb}
                                    />
                                ))}
                            </ul>
                        )}
                        {(hidden > 0 || allPbs) &&
                            row.pbs.length > PB_PREVIEW && (
                                <button
                                    type="button"
                                    className={styles.morePbs}
                                    onClick={() => setAllPbs((v) => !v)}
                                >
                                    {allPbs ? 'Show fewer' : `+${hidden} more`}
                                </button>
                            )}
                    </div>
                </div>
            </td>
            <td className={`${styles.num} ${styles.queuedCol}`}>
                {row.queued.toLocaleString()}
            </td>
            <td className={styles.srcCol}>
                <div className={styles.srcCell}>
                    {row.state === 'sure' && suggestion && (
                        <span className={styles.sureName}>
                            {suggestion.srcName}
                        </span>
                    )}
                    {row.state === 'contested' && (
                        <select
                            className="form-select form-select-sm"
                            value={state.picked ?? ''}
                            disabled={disabled}
                            aria-label={`speedrun.com profile for ${row.username}`}
                            aria-describedby={describedBy}
                            onChange={(e) => {
                                const picked = e.target.value || null;
                                onChange({
                                    picked,
                                    ticked: picked !== null,
                                    error: null,
                                });
                            }}
                        >
                            <option value="">
                                Pick from {row.suggestions.length}
                            </option>
                            {row.suggestions.map((s) => (
                                <option key={s.srcUserId} value={s.srcUserId}>
                                    {suggestionLabel(s)}
                                </option>
                            ))}
                        </select>
                    )}
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={state.typed}
                        disabled={disabled}
                        placeholder={
                            row.state === 'none'
                                ? 'speedrun.com name'
                                : 'or type another name'
                        }
                        aria-label={`speedrun.com name for ${row.username}`}
                        aria-describedby={describedBy}
                        onChange={(e) => {
                            const typed = e.target.value;
                            onChange({
                                typed,
                                // Clearing the field leaves a picked suggestion
                                // ticked; typing one arms the row on its own.
                                // The review step before linking catches a typo.
                                ticked:
                                    cleanName(typed) !== '' ||
                                    state.picked !== null,
                                error: null,
                            });
                        }}
                    />
                    {typedWins && (
                        <span className={styles.hint}>
                            The typed name is linked, not the pick.
                        </span>
                    )}
                    {state.error && (
                        <div id={errorId} className={styles.rowError}>
                            {state.error}
                            {state.overrideOffer && (
                                <button
                                    type="button"
                                    className={styles.quietButton}
                                    disabled={disabled || state.overriding}
                                    onClick={onOverride}
                                >
                                    {state.overriding
                                        ? 'Moving…'
                                        : 'Move it here'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </td>
            <td className={`${styles.num} ${styles.clearsCol}`}>
                {clears !== undefined ? (
                    clears.toLocaleString()
                ) : (
                    <span
                        className={styles.noClears}
                        title={
                            cleanName(state.typed)
                                ? 'Known once linked'
                                : 'Pick a profile to see'
                        }
                    >
                        –
                    </span>
                )}
            </td>
        </tr>
    );
}
