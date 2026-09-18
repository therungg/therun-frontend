'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
    BaselineRow,
    SrcBaselineData,
} from '../../../../../../types/src-import.types';
import styles from './src-import.module.scss';
import {
    applySrcBaselineAction,
    getSrcBaselineAction,
    undoSrcBaselineAction,
} from './src-import-actions';

function fmtWhen(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function who(name: string | null, id: number): string {
    return name ?? `user #${id}`;
}

function HistoryEntry({
    row,
    onUndo,
    undoing,
    undoError,
}: {
    row: BaselineRow;
    onUndo: (baselineId: number) => void;
    undoing: boolean;
    undoError: string | null;
}) {
    const undone = row.undoneAt !== null;
    return (
        <li className={styles.historyItem}>
            <div className={styles.historyRow}>
                <span className={styles.metaTime}>
                    {fmtWhen(row.appliedAt)}
                </span>
                <span className={styles.desc}>
                    {who(row.appliedByName, row.appliedBy)} took{' '}
                    {row.affectedRuns.toLocaleString()} runs off{' '}
                    {row.affectedRunners.toLocaleString()} runners
                    {row.jobId !== null && <> resting on import #{row.jobId}</>}
                </span>
            </div>
            {undone ? (
                <p className={styles.hint}>
                    Undone by {who(row.undoneByName, row.undoneBy as number)}{' '}
                    <span className={styles.metaTime}>
                        {fmtWhen(row.undoneAt as string)}
                    </span>
                </p>
            ) : (
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.btn}
                        onClick={() => onUndo(row.id)}
                        disabled={undoing}
                    >
                        {undoing ? 'Undoing…' : 'Undo'}
                    </button>
                </div>
            )}
            {undoError && <p className={styles.error}>{undoError}</p>}
        </li>
    );
}

interface Props {
    gameId: number;
    gameSlug: string;
    /** An import or resync is running — the backend refuses a baseline apply while one is unsettled. */
    disabled: boolean;
}

/**
 * Reseeds the board from the import: every run the import does not vouch for
 * comes off, reversibly. Same section shell as Settings/Runs; the confirm is
 * inline rather than a typed name, since there is nothing here to type.
 */
export function BaselineSection({ gameId, gameSlug, disabled }: Props) {
    const [data, setData] = useState<SrcBaselineData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [applying, setApplying] = useState(false);
    const [applyError, setApplyError] = useState<string | null>(null);
    const [appliedNote, setAppliedNote] = useState<string | null>(null);
    const [undoingId, setUndoingId] = useState<number | null>(null);
    const [undoError, setUndoError] = useState<{
        id: number;
        message: string;
    } | null>(null);

    const load = useCallback(async () => {
        const res = await getSrcBaselineAction({ gameId, gameSlug });
        if ('error' in res) {
            setLoadError(res.error);
        } else {
            setLoadError(null);
            setData(res.result);
        }
        setLoading(false);
    }, [gameId, gameSlug]);

    useEffect(() => {
        void load();
    }, [load]);

    const apply = async () => {
        setApplying(true);
        setApplyError(null);
        const res = await applySrcBaselineAction({ gameId, gameSlug });
        setApplying(false);
        if ('error' in res) {
            setApplyError(res.error);
            return;
        }
        setConfirming(false);
        setAppliedNote(
            res.result.baselineId === null
                ? 'Nothing to take off.'
                : `Took ${res.result.runs.toLocaleString()} runs off ${res.result.runners.toLocaleString()} runners.`,
        );
        await load();
    };

    const undo = async (baselineId: number) => {
        setUndoingId(baselineId);
        setUndoError(null);
        const res = await undoSrcBaselineAction({
            gameId,
            gameSlug,
            baselineId,
        });
        setUndoingId(null);
        if ('error' in res) {
            setUndoError({ id: baselineId, message: res.error });
            return;
        }
        await load();
    };

    if (loading) {
        return (
            <section
                className={styles.section}
                aria-labelledby="import-baseline"
            >
                <h3 id="import-baseline" className={styles.title}>
                    Board baseline
                </h3>
                <p className={styles.meta}>Loading…</p>
            </section>
        );
    }

    if (loadError && !data) {
        return (
            <section
                className={styles.section}
                aria-labelledby="import-baseline"
            >
                <h3 id="import-baseline" className={styles.title}>
                    Board baseline
                </h3>
                <p className={styles.error}>
                    Couldn’t load the baseline: {loadError}
                </p>
            </section>
        );
    }

    if (!data) return null;

    const { preview, history } = data;
    const noImport = preview.jobId === null;
    const nothingToTake = !noImport && preview.runs === 0;
    const canApply = !noImport && !nothingToTake && !disabled;

    return (
        <section className={styles.section} aria-labelledby="import-baseline">
            <div className={styles.head}>
                <div>
                    <h3 id="import-baseline" className={styles.title}>
                        Board baseline
                    </h3>
                    <p className={styles.desc}>
                        Takes every run the import does not vouch for off the
                        board. Reversible — each application can be undone
                        below.
                    </p>
                </div>
            </div>

            {noImport ? (
                <p className={styles.hint}>
                    No completed speedrun.com import yet — import the game
                    first.
                </p>
            ) : nothingToTake ? (
                <p className={styles.hint}>
                    Nothing to take off — every run on the board is backed by
                    speedrun.com.
                </p>
            ) : (
                <p className={styles.desc}>
                    {preview.runs.toLocaleString()} runs by{' '}
                    {preview.runners.toLocaleString()} runners would come off
                    the board.
                </p>
            )}

            {appliedNote && <p className={styles.hint}>{appliedNote}</p>}

            {confirming ? (
                <div className={styles.confirmPanel}>
                    <p className={styles.desc}>
                        This takes {preview.runs.toLocaleString()} runs off the
                        board — {preview.runners.toLocaleString()} runners lose
                        their placement. It can be undone from the history
                        below.
                    </p>
                    <div className={styles.confirmActions}>
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={apply}
                            disabled={applying}
                        >
                            {applying
                                ? 'Applying…'
                                : `Take off ${preview.runners.toLocaleString()} runners' runs`}
                        </button>
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={() => setConfirming(false)}
                            disabled={applying}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.btn}
                        onClick={() => setConfirming(true)}
                        disabled={!canApply}
                    >
                        Apply baseline
                    </button>
                </div>
            )}

            {applyError && <p className={styles.error}>{applyError}</p>}

            {history.length > 0 && (
                <div>
                    <p className={styles.reportTitle}>History</p>
                    <ul className={styles.historyList}>
                        {history.map((row) => (
                            <HistoryEntry
                                key={row.id}
                                row={row}
                                onUndo={undo}
                                undoing={undoingId === row.id}
                                undoError={
                                    undoError && undoError.id === row.id
                                        ? undoError.message
                                        : null
                                }
                            />
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
