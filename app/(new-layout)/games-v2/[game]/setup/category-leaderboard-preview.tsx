'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import lb from '../leaderboard/leaderboard.module.scss';
import {
    loadLeaderboardPreviewAction,
    type PreviewEntry,
} from './actions/load-leaderboard-preview.action';
import styles from './setup.module.scss';

export interface PreviewDraft {
    primaryTiming: 'realtime' | 'gametime';
    hideRealTime: boolean;
    hideGameTime: boolean;
    showMilliseconds: boolean;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
    requireVideo: boolean;
}

interface Props {
    gameSlug: string;
    categorySlug: string;
    draft: PreviewDraft;
}

type Timing = 'rt' | 'gt';

const SKELETON_ROWS = [
    'skel-1',
    'skel-2',
    'skel-3',
    'skel-4',
    'skel-5',
    'skel-6',
    'skel-7',
    'skel-8',
];

function toTiming(primaryTiming: PreviewDraft['primaryTiming']): Timing {
    return primaryTiming === 'gametime' ? 'gt' : 'rt';
}

/** h:mm:ss(.mmm) — hides the ms segment when `showMs` is false. */
function formatEntryTime(ms: number | null, showMs: boolean): string {
    if (ms == null) return '—';
    const totalMs = Math.max(0, Math.round(ms));
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    const base =
        hours > 0
            ? `${hours}:${pad(minutes)}:${pad(seconds)}`
            : `${minutes}:${pad(seconds)}`;
    return showMs ? `${base}.${pad(millis, 3)}` : base;
}

export function CategoryLeaderboardPreview({
    gameSlug,
    categorySlug,
    draft,
}: Props) {
    const [entries, setEntries] = useState<PreviewEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const cacheRef = useRef<Partial<Record<Timing, PreviewEntry[]>>>({});

    const timing = toTiming(draft.primaryTiming);

    const load = useCallback(
        (t: Timing, opts?: { skipCache?: boolean }) => {
            const cached = !opts?.skipCache ? cacheRef.current[t] : undefined;
            if (cached) {
                setEntries(cached);
                setError(null);
                setLoading(false);
                return;
            }
            let cancelled = false;
            setLoading(true);
            setError(null);
            loadLeaderboardPreviewAction({
                gameSlug,
                categorySlug,
                timing: t,
            }).then((res) => {
                if (cancelled) return;
                if ('error' in res) {
                    setError(res.error);
                    setEntries(null);
                } else {
                    cacheRef.current[t] = res.entries;
                    setEntries(res.entries);
                    setError(null);
                }
                setLoading(false);
            });
            return () => {
                cancelled = true;
            };
        },
        [gameSlug, categorySlug],
    );

    useEffect(() => {
        return load(timing);
    }, [timing, load]);

    const retry = () => {
        delete cacheRef.current[timing];
        load(timing, { skipCache: true });
    };

    const showRt = !draft.hideRealTime;
    const showIgt = !draft.hideGameTime;

    const wouldBeHeld = (entry: PreviewEntry): boolean => {
        const rtHeld =
            draft.minTimeMs != null &&
            entry.realTime != null &&
            entry.realTime <= draft.minTimeMs;
        const igtHeld =
            draft.minGameTimeMs != null &&
            entry.gameTime != null &&
            entry.gameTime <= draft.minGameTimeMs;
        return rtHeld || igtHeld;
    };

    return (
        <div className={styles.section} style={{ marginBottom: 0 }}>
            <h3 className="h6 mb-1">Live preview — top 20</h3>
            <p className="text-muted small mb-3">reflects your unsaved edits</p>

            {loading && (
                <div className="placeholder-glow" aria-busy="true">
                    {SKELETON_ROWS.map((rowKey) => (
                        <div key={rowKey} className="mb-2">
                            <span className="placeholder col-12" />
                        </div>
                    ))}
                </div>
            )}

            {!loading && error && (
                <div
                    className={`${styles.warnNote} d-flex align-items-center justify-content-between gap-2 mb-0`}
                >
                    <span className="small">{error}</span>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={retry}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && entries && entries.length === 0 && (
                <p className="text-muted small mb-0">
                    No runs on this board yet.
                </p>
            )}

            {!loading && !error && entries && entries.length > 0 && (
                <div className="table-responsive">
                    <table className={lb.table}>
                        <thead>
                            <tr>
                                <th scope="col" className={lb.rank}>
                                    #
                                </th>
                                <th scope="col">Runner</th>
                                {showRt && <th scope="col">RT</th>}
                                {showIgt && <th scope="col">IGT</th>}
                                <th scope="col">Video</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => {
                                const held = wouldBeHeld(entry);
                                const pending =
                                    entry.verificationStatus !== 'verified';
                                const noVideo =
                                    draft.requireVideo && !entry.vodUrl;
                                return (
                                    <tr
                                        key={`${entry.rank}-${entry.runnerName}`}
                                        className={
                                            held ? styles.heldRow : undefined
                                        }
                                    >
                                        <td
                                            className={`${lb.rank} ${
                                                entry.rank === 1
                                                    ? lb.rank1
                                                    : entry.rank === 2
                                                      ? lb.rank2
                                                      : entry.rank === 3
                                                        ? lb.rank3
                                                        : ''
                                            }`}
                                        >
                                            {entry.rank}
                                        </td>
                                        <td className={lb.runner}>
                                            {entry.runnerName}{' '}
                                            {held && (
                                                <span
                                                    className={styles.heldPill}
                                                >
                                                    would be held
                                                </span>
                                            )}{' '}
                                            {pending && (
                                                <span
                                                    className={
                                                        styles.pendingPill
                                                    }
                                                >
                                                    {entry.verificationStatus}
                                                </span>
                                            )}
                                        </td>
                                        {showRt && (
                                            <td className={lb.time}>
                                                {formatEntryTime(
                                                    entry.realTime,
                                                    draft.showMilliseconds,
                                                )}
                                            </td>
                                        )}
                                        {showIgt && (
                                            <td className={lb.time}>
                                                {formatEntryTime(
                                                    entry.gameTime,
                                                    draft.showMilliseconds,
                                                )}
                                            </td>
                                        )}
                                        <td>
                                            {entry.vodUrl ? (
                                                <span className={lb.meta}>
                                                    VOD
                                                </span>
                                            ) : noVideo ? (
                                                <span
                                                    className={`${lb.meta} fst-italic`}
                                                >
                                                    no video
                                                </span>
                                            ) : null}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
