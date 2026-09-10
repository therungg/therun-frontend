'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
    SrcPurgeJob,
    SrcPurgePreview,
} from '../../../../../../types/src-import.types';
import styles from './src-import.module.scss';
import {
    getPurgeJobAction,
    getPurgePreviewAction,
    startPurgeAction,
} from './src-import-actions';

const POLL_MS = 5000;

function isSettled(job: SrcPurgeJob): boolean {
    return job.status === 'done' || job.status === 'failed';
}

/** Polls the game's purge job while one is queued/running; stops when it settles or unmounts. */
function usePurgeJob(gameId: number) {
    const [job, setJob] = useState<SrcPurgeJob | null>(null);
    const [loading, setLoading] = useState(true);
    const activeRef = useRef(true);

    const read = useCallback(async () => {
        const res = await getPurgeJobAction({ gameId });
        if (!activeRef.current) return;
        if (!('error' in res)) setJob(res.result);
        setLoading(false);
    }, [gameId]);

    useEffect(() => {
        activeRef.current = true;
        void read();
        return () => {
            activeRef.current = false;
        };
    }, [read]);

    const pollKey =
        job === null || isSettled(job) ? null : `${job.id}:${job.status}`;

    useEffect(() => {
        if (pollKey === null) return;
        const interval = setInterval(() => void read(), POLL_MS);
        return () => clearInterval(interval);
    }, [pollKey, read]);

    return { job, loading, refresh: read };
}

function phaseText(phase: SrcPurgeJob['phase']): string {
    switch (phase) {
        case 'export':
            return 'Writing the recovery export';
        case 'reconcile-undo':
            return 'Reversing the speedrun.com-only leaderboard';
        case 'runs':
            return 'Removing imported runs';
        case 'config':
            return 'Removing imported categories, levels & subcategories';
        case 'settings':
            return 'Reverting board settings';
        case 'records':
            return 'Removing board records & minimums';
        case 'rebuild':
            return 'Rebuilding the leaderboard';
        default:
            return 'Finishing';
    }
}

function countLine(n: number, word: string): string | null {
    if (n <= 0) return null;
    return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
}

function Report({ job }: { job: SrcPurgeJob }) {
    const c = job.counts;
    if (!c) return <p className={styles.empty}>Finished.</p>;
    const removed = [
        countLine(c.importedRuns, 'imported run'),
        countLine(c.nativeRunsUnlinked, 'native run unlinked'),
        countLine(c.runFlags, 'run flag'),
        countLine(c.categoriesDeleted, 'category deleted'),
        countLine(c.levelsDeleted, 'level deleted'),
        countLine(c.variablesDeleted, 'subcategory/filter deleted'),
        countLine(c.boardRecords, 'board record'),
        countLine(c.minTimeFloors, 'minimum time'),
        countLine(c.runLinks, 'provenance link'),
        countLine(c.jobs, 'import job'),
    ].filter((x): x is string => x !== null);

    const kept = [
        c.categoriesArchived > 0
            ? `${c.categoriesArchived} categor${c.categoriesArchived === 1 ? 'y' : 'ies'} archived — native data is still on ${c.categoriesArchived === 1 ? 'it' : 'them'}`
            : null,
        c.themeKept ? 'Theme kept — it was customised since the import' : null,
        c.themeCleared ? 'Theme cleared' : null,
        c.gameFieldsKept.length > 0
            ? `Left as-is: ${c.gameFieldsKept.join(', ')}`
            : null,
        c.gameFieldsReverted.length > 0
            ? `Reverted: ${c.gameFieldsReverted.join(', ')}`
            : null,
        c.mappingsUnprovable > 0
            ? `${c.mappingsUnprovable} older mapping${c.mappingsUnprovable === 1 ? '' : 's'} left in place — can't prove the import created ${c.mappingsUnprovable === 1 ? 'it' : 'them'}`
            : null,
    ].filter((x): x is string => x !== null);

    return (
        <div>
            <p className={styles.reportTitle}>Removed</p>
            <p className={styles.desc}>
                {removed.length > 0
                    ? removed.join(' · ')
                    : 'Nothing to remove.'}
            </p>
            {kept.length > 0 && (
                <>
                    <p className={styles.reportTitle}>Left alone</p>
                    <ul className={styles.desc}>
                        {kept.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                </>
            )}
            {job.exportKey && (
                <p className={styles.hint}>Export saved: {job.exportKey}</p>
            )}
        </div>
    );
}

interface Props {
    gameId: number;
    gameDisplay: string;
    /** An import or resync is already running — the backend refuses a purge while one is unsettled. */
    disabled: boolean;
}

/**
 * Admin-only teardown of everything speedrun.com wrote to this board. Same
 * `styles.section` shell as the other import sections — danger is color and
 * copy here, not a new pattern.
 */
export function PurgeSection({ gameId, gameDisplay, disabled }: Props) {
    const inputId = useId();
    const [preview, setPreview] = useState<SrcPurgePreview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [confirmValue, setConfirmValue] = useState('');
    const [startError, setStartError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    const {
        job,
        loading: jobLoading,
        refresh: refreshJob,
    } = usePurgeJob(gameId);

    const loadPreview = useCallback(async () => {
        setPreviewLoading(true);
        setPreviewError(null);
        const res = await getPurgePreviewAction({ gameId });
        if ('error' in res) {
            setPreviewError(res.error);
        } else {
            setPreview(res.result);
        }
        setPreviewLoading(false);
    }, [gameId]);

    const start = async () => {
        setStartError(null);
        setStarting(true);
        const res = await startPurgeAction({
            gameId,
            confirmName: confirmValue,
        });
        setStarting(false);
        if ('error' in res) {
            setStartError(res.error);
            return;
        }
        setConfirmValue('');
        await refreshJob();
    };

    const running = job !== null && !isSettled(job);
    const failed = job !== null && job.status === 'failed';
    const confirmMatches = confirmValue.trim() === gameDisplay;

    // Once a job exists, its state drives the section — no need for a
    // separately-fetched preview any more.
    if (!jobLoading && job !== null) {
        return (
            <section
                className={`${styles.section} ${styles.dangerSection}`}
                aria-labelledby="import-purge"
            >
                <div>
                    <h3 id="import-purge" className={styles.dangerTitle}>
                        Remove speedrun.com data
                    </h3>
                </div>
                {running && (
                    <p className={styles.desc}>{phaseText(job.phase)}…</p>
                )}
                {failed && (
                    <p className={styles.error}>
                        Purge failed: {job.error ?? 'unknown error'}
                    </p>
                )}
                {!running && <Report job={job} />}
            </section>
        );
    }

    return (
        <section
            className={`${styles.section} ${styles.dangerSection}`}
            aria-labelledby="import-purge"
        >
            <div>
                <h3 id="import-purge" className={styles.dangerTitle}>
                    Remove speedrun.com data
                </h3>
                <p className={styles.desc}>
                    Deletes every run, category, level, subcategory, board
                    record and minimum this board imported from speedrun.com.
                    Admin only.
                </p>
            </div>

            {preview === null ? (
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={loadPreview}
                        disabled={previewLoading || disabled}
                    >
                        {previewLoading ? 'Loading…' : 'Preview'}
                    </button>
                    {disabled && (
                        <p className={styles.hint}>
                            Wait for the running import to finish
                        </p>
                    )}
                </div>
            ) : (
                <>
                    <dl className={styles.report}>
                        {countLine(preview.importedRuns, 'imported run') && (
                            <div className={styles.reportRow}>
                                <dt className={styles.reportLabel}>
                                    Imported runs
                                </dt>
                                <dd className={styles.reportValue}>
                                    {preview.importedRuns.toLocaleString()}
                                </dd>
                            </div>
                        )}
                        <div className={styles.reportRow}>
                            <dt className={styles.reportLabel}>
                                Native runs linked
                            </dt>
                            <dd className={styles.reportValue}>
                                {preview.nativeRunsLinked.toLocaleString()}
                            </dd>
                        </div>
                        <div className={styles.reportRow}>
                            <dt className={styles.reportLabel}>
                                Categories / levels / subcategories
                            </dt>
                            <dd className={styles.reportValue}>
                                {preview.createdCategories.toLocaleString()} /{' '}
                                {preview.createdLevels.toLocaleString()} /{' '}
                                {preview.createdVariables.toLocaleString()}
                            </dd>
                        </div>
                        <div className={styles.reportRow}>
                            <dt className={styles.reportLabel}>
                                Board records
                            </dt>
                            <dd className={styles.reportValue}>
                                {preview.boardRecords.toLocaleString()}
                            </dd>
                        </div>
                        <div className={styles.reportRow}>
                            <dt className={styles.reportLabel}>
                                Minimum times
                            </dt>
                            <dd className={styles.reportValue}>
                                {preview.minTimeFloors.toLocaleString()}
                            </dd>
                        </div>
                    </dl>

                    <p className={styles.desc}>
                        This removes every run, category, level, subcategory,
                        board record and minimum imported from speedrun.com. It
                        cannot be undone from here — a JSON export is written to
                        S3 first, and that is the only way back.
                    </p>
                    <p className={styles.desc}>
                        Two things it cannot restore: settings the import
                        overwrote on categories that already existed, and the
                        board&rsquo;s own settings from before the first import.
                        Those stay as they are.
                    </p>
                    {preview.unprovableMappings > 0 && (
                        <p className={styles.hint}>
                            {preview.unprovableMappings} older mapping
                            {preview.unprovableMappings === 1 ? '' : 's'}{' '}
                            can&rsquo;t be proven to have come from the import
                            and will be left in place.
                        </p>
                    )}

                    <div className={styles.confirmRow}>
                        <label htmlFor={inputId}>
                            Type the game&rsquo;s name to confirm
                        </label>
                        <input
                            id={inputId}
                            type="text"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={gameDisplay}
                            value={confirmValue}
                            onChange={(e) => setConfirmValue(e.target.value)}
                            disabled={starting}
                        />
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={start}
                            disabled={starting || !confirmMatches || disabled}
                        >
                            {starting
                                ? 'Starting…'
                                : 'Remove speedrun.com data'}
                        </button>
                    </div>
                </>
            )}

            {previewError && <p className={styles.error}>{previewError}</p>}
            {startError && <p className={styles.error}>{startError}</p>}
        </section>
    );
}
