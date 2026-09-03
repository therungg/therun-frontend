'use client';

import { type ReactNode, useState, useTransition } from 'react';
import type {
    SrcImportCommitFlags,
    SrcImportJob,
} from '../../../../../../types/src-import.types';
import { runsReport, settingsReport } from './change-report';
import styles from './src-import.module.scss';
import { resyncAction } from './src-import-actions';
import { isSettled } from './use-src-import-job';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "in 7h" / "in 43m" until the daily gate lifts. */
function untilLabel(readyAt: number, now: number): string {
    const ms = readyAt - now;
    if (ms <= 0) return '';
    const hours = Math.floor(ms / (60 * 60 * 1000));
    if (hours >= 1) return `in ${hours}h`;
    return `in ${Math.max(1, Math.floor(ms / (60 * 1000)))}m`;
}

function fmtWhen(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

/** "Never imported" or the finish (else start) time of the last job. */
export function lastImportLabel(job: SrcImportJob | null): {
    text: string;
    time: string | null;
} {
    if (!job) return { text: 'Never imported', time: null };
    return {
        text: 'Last import',
        time: fmtWhen(job.finishedAt ?? job.createdAt),
    };
}

function phaseText(job: SrcImportJob): string {
    if (job.status === 'queued') return 'Queued';
    if (job.status === 'running') {
        switch (job.phase) {
            case 'meta':
                return 'Reading categories & variables';
            case 'players':
                return 'Finding runners';
            case 'matching':
                return 'Matching runners to therun accounts';
            case 'runs':
                return 'Fetching runs';
            default:
                return 'Finishing';
        }
    }
    switch (job.commitStatus) {
        case 'applying':
            return 'Applying settings';
        case 'importing':
            return 'Importing runs';
        case 'pruning':
            return 'Removing runs that left the source';
        default:
            return 'Finishing';
    }
}

function Progress({ job }: { job: SrcImportJob }) {
    const staging = job.status === 'queued' || job.status === 'running';
    const determinate =
        staging && !!job.estimatedRequests && job.estimatedRequests > 0;
    const pct = determinate
        ? Math.floor(
              Math.min(
                  0.99,
                  job.requestsMade / (job.estimatedRequests as number),
              ) * 100,
          )
        : null;
    return (
        <div className={styles.progress}>
            <div
                className={
                    pct === null
                        ? `${styles.track} ${styles.trackBusy}`
                        : styles.track
                }
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct ?? undefined}
                aria-label="Import progress"
            >
                <div
                    className={styles.fill}
                    style={pct === null ? undefined : { width: `${pct}%` }}
                />
            </div>
            {pct !== null && <span className={styles.pct}>{pct}%</span>}
            <span>{phaseText(job)}</span>
        </div>
    );
}

function Report({
    job,
    kind,
}: {
    job: SrcImportJob;
    kind: 'settings' | 'resync';
}) {
    const rows = kind === 'settings' ? settingsReport(job) : runsReport(job);
    if (rows === null) return <p className={styles.empty}>Finished.</p>;
    if (rows.length === 0) {
        return (
            <p className={styles.empty}>
                Everything already matched the source.
            </p>
        );
    }
    return (
        <div>
            <p className={styles.reportTitle}>What changed</p>
            <dl className={styles.report}>
                {rows.map((r) => (
                    <div key={r.label} className={styles.reportRow}>
                        <dt className={styles.reportLabel}>{r.label}</dt>
                        <dd className={styles.reportValue}>{r.value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

export interface ImportSectionProps {
    kind: 'settings' | 'resync';
    title: string;
    description: string;
    buttonLabel: string;
    gameId: number;
    gameSlug: string;
    job: SrcImportJob | null;
    loading: boolean;
    loadError: string | null;
    /** A job of either kind is in flight — the backend allows one at a time. */
    anyRunning: boolean;
    bypassCooldown: boolean;
    onStarted: () => Promise<void>;
    commitFlags?: SrcImportCommitFlags;
    children?: ReactNode;
}

/**
 * One import kind: what it does, when it last ran, one button that runs it
 * now, and — while it runs / once it is done — progress or what changed.
 */
export function ImportSection({
    kind,
    title,
    description,
    buttonLabel,
    gameId,
    gameSlug,
    job,
    loading,
    loadError,
    anyRunning,
    bypassCooldown,
    onStarted,
    commitFlags,
    children,
}: ImportSectionProps) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const now = Date.now();
    const readyAt = job ? new Date(job.createdAt).getTime() + DAY_MS : 0;
    const running = job !== null && !isSettled(job);
    const failed =
        job !== null &&
        (job.status === 'failed' || job.commitStatus === 'failed');
    // A failed import doesn't burn the daily allowance — it can be retried now.
    const throttled = !bypassCooldown && !failed && readyAt > now;
    const disabled = pending || anyRunning || throttled;
    const last = lastImportLabel(job);
    // At most one line under the button: the other import running wins, since
    // it blocks this one regardless of the cooldown.
    const hint =
        anyRunning && !running
            ? 'Wait for the other import to finish'
            : throttled && !running
              ? `Available again ${untilLabel(readyAt, now)}`
              : null;

    const start = () => {
        setError(null);
        startTransition(async () => {
            const res = await resyncAction({
                gameId,
                gameSlug,
                kind,
                ...(commitFlags ? { commitFlags } : {}),
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await onStarted();
        });
    };

    return (
        <section className={styles.section} aria-labelledby={`import-${kind}`}>
            <div className={styles.head}>
                <div>
                    <h3 id={`import-${kind}`} className={styles.title}>
                        {title}
                    </h3>
                    <p className={styles.desc}>{description}</p>
                </div>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.btn}
                        onClick={start}
                        disabled={disabled}
                    >
                        {pending ? 'Starting…' : buttonLabel}
                    </button>
                    {hint && <p className={styles.hint}>{hint}</p>}
                </div>
            </div>

            <p className={styles.meta}>
                {loading ? (
                    'Loading…'
                ) : (
                    <>
                        {last.text}
                        {last.time && (
                            <>
                                {' '}
                                <span className={styles.metaTime}>
                                    {last.time}
                                </span>
                            </>
                        )}
                    </>
                )}
            </p>

            {loadError && !job && (
                <p className={styles.error}>
                    Couldn’t load the import status: {loadError}
                </p>
            )}
            {/* One red line only: what the moderator just did beats the
                previous job's failure. */}
            {error ? (
                <p className={styles.error}>{error}</p>
            ) : (
                job &&
                failed && (
                    <p className={styles.error}>
                        Import failed: {job.error ?? 'unknown error'}
                    </p>
                )
            )}
            {job && running && <Progress job={job} />}
            {job && !running && !failed && <Report job={job} kind={kind} />}

            {children}
        </section>
    );
}
