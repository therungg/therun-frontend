'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
    SrcUserImportGameResult,
    SrcUserImportJob,
} from 'types/src-import.types';
import { canUndoImport } from 'types/src-import.types';
import { ProfileBlock } from '~app/(new-layout)/[username]/(sections)/profile-block';
import { getMyImportJob, undoMyImport } from '~src/actions/src-import.action';
import styles from './import.module.scss';

const POLL_MS = 5000;

function isActive(job: SrcUserImportJob | null): boolean {
    return !!job && (job.status === 'queued' || job.status === 'running');
}

const OUTCOME_LABEL: Record<SrcUserImportGameResult['outcome'], string> = {
    imported: 'Imported',
    skipped: 'Skipped',
    parked: 'Saved',
    failed: 'Failed',
};

function reasonText(g: SrcUserImportGameResult): string | null {
    if (g.outcome === 'imported' || !g.reason) return null;
    if (g.reason === 'game-not-matched') {
        return "This game can't be matched yet. These runs import once it can.";
    }
    if (g.reason === 'game-not-on-therun') {
        return "This game isn't on therun.gg yet.";
    }
    if (g.reason === 'game-purged') {
        return "This game's speedrun.com data was removed from therun.gg.";
    }
    if (g.reason === 'game-busy') {
        return 'Another import is running on this game. Try again later.';
    }
    if (g.reason.startsWith('plan-conflicts:')) {
        const n = g.reason.split(':')[1];
        return `A moderator has to resolve ${n} board conflict(s) first.`;
    }
    if (g.reason === 'staging') return 'In progress…';
    return g.reason;
}

export function ImportPanel({ initialJob }: { initialJob: SrcUserImportJob }) {
    const [job, setJob] = useState<SrcUserImportJob | null>(initialJob);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmUndo, setConfirmUndo] = useState(false);

    const refresh = useCallback(async () => {
        const res = await getMyImportJob();
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setError(null);
        setJob(res.job);
    }, []);

    useEffect(() => {
        if (!isActive(job)) return;
        const id = setInterval(() => {
            void refresh();
        }, POLL_MS);
        return () => clearInterval(id);
    }, [job, refresh]);

    const runUndo = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await undoMyImport();
            if ('error' in res) setError(res.error);
            else await refresh();
            setConfirmUndo(false);
        } catch {
            setError("Couldn't undo. Try again.");
        } finally {
            setBusy(false);
        }
    };

    const waiting = job?.status === 'waiting';
    const active = isActive(job);
    const undoable = canUndoImport(job);

    return (
        <ProfileBlock
            title="speedrun.com export"
            note={job && !waiting ? <StatusNote job={job} /> : null}
        >
            {error && (
                <div className={styles.error} role="alert">
                    {error}
                </div>
            )}

            <p className={styles.claimText}>
                Runs from the export you uploaded earlier.
            </p>

            {job?.status === 'failed' && job.error && (
                <div className={styles.error}>{job.error}</div>
            )}

            {job && (active || job.status === 'done') && (
                <Progress job={job} active={active} />
            )}

            {busy && (
                <p className={styles.working}>
                    <span className={styles.spinner} aria-hidden />
                    Removing imported runs…
                </p>
            )}

            {!busy && undoable && (
                <div className={styles.actions}>
                    {confirmUndo ? (
                        <>
                            <button
                                type="button"
                                className={styles.danger}
                                onClick={runUndo}
                            >
                                Remove imported runs
                            </button>
                            <button
                                type="button"
                                className={styles.pill}
                                onClick={() => setConfirmUndo(false)}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className={styles.pill}
                            onClick={() => setConfirmUndo(true)}
                        >
                            Undo import
                        </button>
                    )}
                </div>
            )}
        </ProfileBlock>
    );
}

function StatusNote({ job }: { job: SrcUserImportJob }) {
    if (job.undoneAt) return <>Last import undone</>;
    if (job.status === 'failed') return <>Last import failed</>;
    if (job.status === 'done') {
        const when = job.finishedAt ?? job.createdAt;
        return <>Imported {new Date(when).toLocaleDateString()}</>;
    }
    return <>Importing as {job.srcUserName}</>;
}

export function Progress({
    job,
    active,
}: {
    job: SrcUserImportJob;
    active: boolean;
}) {
    return (
        <div className={styles.panel}>
            <dl className={styles.stats}>
                <div>
                    <dt>Games</dt>
                    <dd>
                        {job.gamesDone.toLocaleString()} /{' '}
                        {job.gamesTotal.toLocaleString()}
                    </dd>
                </div>
                <div>
                    <dt>Runs imported</dt>
                    <dd>{job.runsImported.toLocaleString()}</dd>
                </div>
                <div>
                    <dt>Runs skipped</dt>
                    <dd>{job.runsSkipped.toLocaleString()}</dd>
                </div>
            </dl>
            {active && (
                <p className={styles.working}>
                    <span className={styles.spinner} aria-hidden />
                    Importing. This page updates on its own.
                </p>
            )}
            {job.gameResults.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Game</th>
                                <th>Result</th>
                                <th className={styles.num}>Runs</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {job.gameResults.map((g) => (
                                <tr key={g.srcGameId}>
                                    <td>{g.srcGameName}</td>
                                    <td>
                                        <span
                                            className={styles.outcome}
                                            data-outcome={g.outcome}
                                        >
                                            {OUTCOME_LABEL[g.outcome]}
                                        </span>
                                    </td>
                                    <td className={styles.num}>
                                        {g.imported.toLocaleString()}
                                    </td>
                                    <td className={styles.note}>
                                        {reasonText(g)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
