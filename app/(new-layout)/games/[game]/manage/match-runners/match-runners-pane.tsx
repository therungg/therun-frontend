'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from '~src/components/link';
import { buildModRunnerHref } from '~src/lib/board-url';
import { SRC_MATCH_BATCH } from '~src/lib/moderation/src-matches';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type {
    SrcMatchLink,
    SrcMatchLinkResult,
    SrcMatchPb,
    SrcMatchRow,
    SrcMatchSuggestion,
} from '../../../../../../types/src-matches.types';
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

const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;

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
            return 'Not found on speedrun.com.';
        case 'already-set':
            return 'Already has a profile.';
        default:
            return 'Could not link.';
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

const pbLine = (pb: SrcMatchPb) => {
    const values = pbValues(pb.subcategoryKey);
    const time = formatTimeMs(pb.timeMs);
    return `${pb.category}${values ? ` (${values})` : ''} ${time}${
        pb.timing === 'gametime' ? ' IGT' : ''
    } #${pb.rank}`;
};

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

// A typed name beats a suggestion: a moderator who knows the profile should
// not have to accept one of ours, and clearing the field falls back to the
// suggestion they picked.
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

export function MatchRunnersPane({ gameSlug }: { gameSlug: string }) {
    const router = useRouter();
    const [rows, setRows] = useState<RowState[] | null>(null);
    const [imported, setImported] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [isLoading, startLoad] = useTransition();
    const requestId = useRef(0);

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
                    error: 'Could not link.',
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
                error: 'Could not link.',
            });
        }
    };

    if (loadError && !rows) {
        return (
            <div>
                <p role="alert">{loadError}</p>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setAttempt((n) => n + 1)}
                    disabled={isLoading}
                >
                    {isLoading ? 'Trying again…' : 'Try again'}
                </button>
            </div>
        );
    }

    if (!rows) return <p className={styles.note}>Loading…</p>;

    const ticked = rows.filter((r) => r.ticked && toLink(r));
    const clears = ticked.reduce(
        (sum, r) => sum + (effectiveSuggestion(r)?.clears ?? 0),
        0,
    );

    return (
        <div>
            {!imported && (
                <p className={styles.note}>Import from speedrun.com first.</p>
            )}
            {doneMessage && (
                <p className={styles.note} role="status">
                    {doneMessage}
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
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setAttempt((n) => n + 1)}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Trying again…' : 'Try again'}
                    </button>
                </div>
            )}
            {rows.length === 0 ? (
                imported && (
                    <p className={styles.note}>No unmatched runners left.</p>
                )
            ) : (
                <>
                    <div className={styles.bar}>
                        <span>
                            {progress
                                ? `Linked ${progress.done} of ${progress.total}`
                                : `${plural(ticked.length, 'runner', 'runners')} ticked, ${plural(clears, 'queued run', 'queued runs')} cleared`}
                        </span>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={linking || ticked.length === 0}
                            onClick={linkTicked}
                        >
                            Link ticked runners
                        </button>
                    </div>
                    <div className="table-responsive">
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '1%' }}>
                                        <span className="visually-hidden">
                                            Link
                                        </span>
                                    </th>
                                    <th>Runner</th>
                                    <th className={styles.right}>Queued</th>
                                    <th>speedrun.com</th>
                                    <th className={styles.right}>Clears</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
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
                </>
            )}
        </div>
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
    const suggestion = pickedSuggestion(state);
    const canLink = toLink(state) !== null;

    return (
        <tr>
            <td>
                <input
                    type="checkbox"
                    className="form-check-input"
                    checked={state.ticked && canLink}
                    disabled={disabled || !canLink}
                    onChange={(e) => onChange({ ticked: e.target.checked })}
                    aria-label={`Link ${row.username}`}
                />
            </td>
            <td>
                <Link
                    className={styles.runner}
                    href={buildModRunnerHref(gameSlug, row.userId)}
                >
                    {row.username}
                </Link>
                {row.pbs.length > 0 && (
                    <ul className={styles.pbs}>
                        {row.pbs.map((pb, i) => (
                            <li
                                key={`${pb.categoryId}:${pb.subcategoryKey}:${i}`}
                            >
                                {pbLine(pb)}
                            </li>
                        ))}
                    </ul>
                )}
            </td>
            <td className={styles.num}>{row.queued}</td>
            <td>
                {row.state === 'sure' && suggestion?.srcName}
                {row.state === 'contested' && (
                    <select
                        className="form-select form-select-sm"
                        value={state.picked ?? ''}
                        disabled={disabled}
                        aria-label={`speedrun.com profile for ${row.username}`}
                        onChange={(e) => {
                            const picked = e.target.value || null;
                            onChange({
                                picked,
                                ticked: picked !== null,
                                error: null,
                            });
                        }}
                    >
                        <option value="" />
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
                            : 'or another name'
                    }
                    aria-label={`speedrun.com name for ${row.username}`}
                    onChange={(e) => {
                        const typed = e.target.value;
                        onChange({
                            typed,
                            // Clearing the field leaves a picked suggestion
                            // ticked; typing one arms the row on its own.
                            ticked:
                                cleanName(typed) !== '' ||
                                state.picked !== null,
                            error: null,
                        });
                    }}
                />
                {state.error && (
                    <div className={styles.rowError}>
                        {state.error}
                        {state.overrideOffer && (
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary ms-2"
                                disabled={disabled || state.overriding}
                                onClick={onOverride}
                            >
                                {state.overriding ? 'Moving…' : 'Move it here'}
                            </button>
                        )}
                    </div>
                )}
            </td>
            <td className={styles.num}>
                {effectiveSuggestion(state)?.clears ?? '–'}
            </td>
        </tr>
    );
}
