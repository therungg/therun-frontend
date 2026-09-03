'use client';

import {
    type FormEvent,
    useCallback,
    useId,
    useState,
    useTransition,
} from 'react';
import { BoxArrowUpRight } from 'react-bootstrap-icons';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import { InlineError } from '../shared/form-kit';
import { CommitPanel } from './commit-panel';
import { ReviewTabs } from './review-tabs';
import styles from './src-import.module.scss';
import {
    getSrcImportJobAction,
    startSrcImportAction,
} from './src-import-actions';
import { useSrcImportJob } from './use-src-import-job';

interface Props {
    gameId: number;
    gameSlug: string;
    gameDisplay: string;
}

const BADGE_CLASS: Record<SrcImportJob['status'], string> = {
    queued: styles.badgeQueued,
    running: styles.badgeRunning,
    done: styles.badgeDone,
    failed: styles.badgeFailed,
};

const PHASE_LABEL: Record<SrcImportJob['phase'], string> = {
    meta: 'reading categories & variables',
    players: 'reading players',
    matching: 'matching players',
    runs: 'fetching runs',
    done: 'finished',
};

/**
 * Import pane: paste a speedrun.com game URL, watch the background job, then
 * review what it staged before committing it. Fetching and browsing the
 * staged data is a dry run — nothing is written until the commit controls
 * below the review tabs are used.
 */
export function SrcImportPane({ gameId, gameSlug, gameDisplay }: Props) {
    const fetchJob = useCallback(
        () => getSrcImportJobAction({ gameId, gameSlug }),
        [gameId, gameSlug],
    );
    const {
        job,
        loading,
        error: loadError,
        refresh,
    } = useSrcImportJob(fetchJob);

    const inputId = useId();
    const [slug, setSlug] = useState('');
    const url = srcUrlFromInput(slug);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const inFlight =
        job !== null && (job.status === 'queued' || job.status === 'running');

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!url || pending || inFlight) return;
        setSubmitError(null);
        startTransition(async () => {
            const res = await startSrcImportAction({ gameId, gameSlug, url });
            if ('error' in res) {
                setSubmitError(res.error);
                return;
            }
            setSlug('');
            await refresh();
        });
    };

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Game</div>
                    <h2 className={consoleStyles.paneTitle}>
                        {CONCEPT_LABEL.import}
                    </h2>
                </div>
            </div>
            <p className={consoleStyles.paneLede}>
                Fetch the {gameDisplay} board from speedrun.com (categories,
                subcategories and filters, runs, players) and review it here
                before anything is written.
            </p>

            <div className={styles.stack}>
                <p className={styles.note}>
                    Fetching and reviewing the board below is a dry run: nothing
                    is written yet. Only the commit controls at the bottom write
                    to the live board.
                </p>

                <form className={styles.form} onSubmit={submit}>
                    <div className={styles.field}>
                        <label htmlFor={inputId} className={styles.label}>
                            speedrun.com game URL
                        </label>
                        <span className={styles.urlGroup}>
                            <span className={styles.urlPrefix} aria-hidden>
                                {SRC_PREFIX}
                            </span>
                            <input
                                id={inputId}
                                className={`${styles.input} ${styles.urlInput}`}
                                type="text"
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="sm64"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                disabled={pending || inFlight}
                                required
                            />
                            <button
                                type="submit"
                                className={styles.fetchBtn}
                                disabled={pending || inFlight || !url}
                            >
                                {pending ? 'Starting…' : 'Fetch board'}
                            </button>
                        </span>
                    </div>
                </form>
                {submitError && <InlineError>{submitError}</InlineError>}
                {inFlight && (
                    <p className={styles.muted}>
                        An import is already running for this game. Wait for it
                        to finish before starting another.
                    </p>
                )}

                {loading && (
                    <div className={styles.jobHead}>
                        <span className={styles.spinner} aria-hidden />
                        <span className={styles.muted}>Loading…</span>
                    </div>
                )}
                {!loading && loadError && !job && (
                    <div className={`${styles.callout} ${styles.calloutError}`}>
                        Couldn’t load the import status: {loadError}
                    </div>
                )}
                {job && <JobCard job={job} />}
                {job?.status === 'done' && (
                    <>
                        <ReviewTabs
                            gameId={gameId}
                            gameSlug={gameSlug}
                            job={job}
                        />
                        <CommitPanel
                            job={job}
                            gameId={gameId}
                            gameSlug={gameSlug}
                            onChanged={refresh}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export const SRC_PREFIX = 'https://www.speedrun.com/';

/**
 * The user types only the part after the prefix (the game abbreviation), but a
 * pasted full URL still works: any speedrun.com origin is stripped back to its
 * path, and the result is re-joined onto the canonical prefix. Returns '' when
 * there is nothing to send.
 */
export function srcUrlFromInput(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const path = trimmed
        .replace(/^(?:https?:\/\/)?(?:www\.)?speedrun\.com\/?/i, '')
        .replace(/^\/+/, '');
    return path ? `${SRC_PREFIX}${path}` : '';
}

function JobCard({ job }: { job: SrcImportJob }) {
    const inFlight = job.status === 'queued' || job.status === 'running';
    return (
        <section className={styles.jobCard} aria-label="Import job">
            <div className={styles.jobHead}>
                {inFlight && <span className={styles.spinner} aria-hidden />}
                <span
                    className={`${styles.statusBadge} ${BADGE_CLASS[job.status]}`}
                >
                    {job.status}
                </span>
                <span className={styles.jobTitle}>{job.srcGameName}</span>
                <a
                    className={styles.jobLink}
                    href={job.srcUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    View on speedrun.com
                    <BoxArrowUpRight size={12} aria-hidden />
                </a>
                <span className={styles.jobTimes}>
                    Started {job.startedAt ? fmtDate(job.startedAt) : '—'}
                    {job.finishedAt
                        ? ` · finished ${fmtDate(job.finishedAt)}`
                        : ''}
                </span>
            </div>
            {inFlight && (
                <>
                    <JobProgress job={job} />
                    <p className={styles.muted}>
                        Phase: {PHASE_LABEL[job.phase]}. speedrun.com is rate
                        limited, so large boards take a while. This page updates
                        on its own.
                    </p>
                </>
            )}
            {job.status === 'failed' && (
                <div className={`${styles.callout} ${styles.calloutError}`}>
                    Import failed{job.error ? `: ${job.error}` : '.'} You can
                    start it again with the same URL.
                </div>
            )}
            <div className={styles.counters}>
                <Counter label="Categories" value={job.categoriesCount} />
                <Counter label="Levels" value={job.levelsCount} />
                <Counter label="Variables" value={job.variablesCount} />
                <Counter label="Runs" value={job.runsCount} />
                <Counter label="Players" value={job.playersCount} />
                <Counter label="Matched" value={job.playersMatchedCount} />
                <Counter label="API requests" value={job.requestsMade} />
            </div>
            {job.changeSummary && (
                <div className={styles.changedBand}>
                    <p className={styles.bandLabel}>What this import changed</p>
                    <div className={styles.counters}>
                        <Counter
                            label="Runs added"
                            value={job.changeSummary.added}
                        />
                        <Counter
                            label="Runs updated"
                            value={job.changeSummary.updated}
                        />
                        <Counter
                            label="Runs removed"
                            value={job.changeSummary.removed}
                        />
                        <Counter
                            label="Categories archived"
                            value={job.changeSummary.archived}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}

/**
 * Progress + time remaining while the staging walk runs. The importer is
 * throttled to ~1 request/second and the backend pre-computes how many
 * requests the whole job needs (estimatedRequests), so requests-made over
 * that estimate is a faithful percentage AND the remainder is seconds left.
 * Capped at 99% — only "done" ends the bar. Renders nothing when the
 * estimate is missing (the pre-fetch is best-effort).
 */
function JobProgress({ job }: { job: SrcImportJob }) {
    if (!job.estimatedRequests || job.estimatedRequests <= 0) return null;
    const fraction = Math.min(0.99, job.requestsMade / job.estimatedRequests);
    const pct = Math.floor(fraction * 100);
    const secondsLeft = Math.max(0, job.estimatedRequests - job.requestsMade);
    return (
        <div className={styles.progressRow}>
            <div
                className={styles.progressTrack}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className={styles.progressFill}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={styles.progressPct}>{pct}%</span>
            <span className={styles.muted}>~{fmtEta(secondsLeft)} left</span>
        </div>
    );
}

function fmtEta(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function Counter({ label, value }: { label: string; value: number }) {
    return (
        <div className={styles.counter}>
            <span className={styles.counterValue}>
                {value.toLocaleString()}
            </span>
            <span className={styles.counterLabel}>{label}</span>
        </div>
    );
}

function fmtDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
