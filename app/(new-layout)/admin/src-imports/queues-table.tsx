'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type {
    SrcQueueJob,
    SrcQueues,
} from '../../../../types/src-import.types';
import styles from '../admin.module.scss';
import { getSrcQueuesAction } from './actions/src-queues.action';
import own from './src-imports.module.scss';

/** How often the page re-reads while anything is still running. */
const POLL_MS = 5000;
/**
 * How often it re-reads while the queue looks empty. A job that arrives from
 * somewhere else has to be able to show up on a page that is already open, so
 * an idle page still polls — just slowly enough that it costs nothing.
 */
const IDLE_POLL_MS = 30000;

const KIND_LABEL: Record<SrcQueueJob['kind'], string> = {
    manual: 'Board import',
    resync: 'Board resync',
    settings: 'Settings sync',
    user: 'Runner import',
    purge: 'Purge',
    rename: 'Name change',
};

const badgeFor = (status: string) => {
    if (status === 'failed') return styles.badgeDanger;
    if (status === 'queued') return styles.badgeMuted;
    if (status === 'done' || status === 'applied' || status === 'imported')
        return styles.badgeSuccess;
    return styles.badgeInfo;
};

const ago = (iso: string) => {
    const secs = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
    return `${Math.round(secs / 86400)}d ago`;
};

const Progress = ({ job }: { job: SrcQueueJob }) => {
    if (!job.progress) return <span className={own.pale}>—</span>;
    const { done, total } = job.progress;
    // A rename knows how much it has moved but never how much is left: the
    // phases walk tables and buckets it has not listed yet. `total: 0` says
    // exactly that, so show the count alone rather than a percentage of
    // nothing — 0/0 renders NaN% and n/0 renders a confident 100%.
    if (total <= 0) {
        return (
            <span title={`${done} moved`}>
                {done.toLocaleString()} <span className={own.pale}>moved</span>
            </span>
        );
    }
    const pct = Math.min(100, Math.round((done / total) * 100));
    return (
        <span title={`${done} of ${total}`}>
            {pct}%{' '}
            <span className={own.pale}>
                ({done}/{total})
            </span>
        </span>
    );
};

/** A runner job and the board jobs it spawned, or a single ungrouped job. */
interface JobGroup {
    job: SrcQueueJob;
    children: SrcQueueJob[];
}

/**
 * One runner sync can queue several board jobs. Showing them flat buried the
 * rest of the site's work, so a child sits under its parent runner row.
 * A child whose parent is not in the same list stays top-level.
 */
const groupJobs = (jobs: SrcQueueJob[]): JobGroup[] => {
    // First pass builds the lookup only. Emitting here instead would put every
    // runner row above every standalone job, which loses the newest-first order
    // the server sends.
    const byParent = new Map<number, JobGroup>();
    for (const job of jobs) {
        if (job.kind === 'user') byParent.set(job.id, { job, children: [] });
    }
    const groups: JobGroup[] = [];
    for (const job of jobs) {
        if (job.kind === 'user') {
            const group = byParent.get(job.id);
            if (group) groups.push(group);
            continue;
        }
        const parent =
            job.parentUserJobId !== null
                ? byParent.get(job.parentUserJobId)
                : undefined;
        if (parent) parent.children.push(job);
        else groups.push({ job, children: [] });
    }
    return groups;
};

const JobCells = ({ job }: { job: SrcQueueJob }) => (
    <>
        <td>
            {job.target.href ? (
                <Link href={job.target.href}>{job.target.label}</Link>
            ) : (
                job.target.label
            )}
        </td>
        <td>
            <span className={`${styles.badge} ${badgeFor(job.status)}`}>
                {job.status}
            </span>{' '}
            <span className={own.pale}>{job.phase}</span>
        </td>
        <td>
            <Progress job={job} />
        </td>
        <td>{job.requestedBy ?? '—'}</td>
        <td title={job.createdAt}>{ago(job.createdAt)}</td>
        <td className={own.errorCell} title={job.error ?? undefined}>
            {job.error ?? ''}
        </td>
    </>
);

const GroupRows = ({ group }: { group: JobGroup }) => {
    const [open, setOpen] = useState(false);
    const { job, children } = group;
    return (
        <>
            <tr>
                <td>
                    {KIND_LABEL[job.kind] ?? job.kind}
                    {children.length > 0 ? (
                        <button
                            type="button"
                            className={own.expander}
                            aria-expanded={open}
                            onClick={() => setOpen((v) => !v)}
                        >
                            {open ? '▾' : '▸'} {children.length}{' '}
                            {children.length === 1 ? 'board' : 'boards'}
                        </button>
                    ) : null}
                </td>
                <JobCells job={job} />
            </tr>
            {open
                ? children.map((child) => (
                      <tr
                          key={`${child.kind}-${child.id}`}
                          className={own.childRow}
                      >
                          <td className={own.childLabel}>
                              {KIND_LABEL[child.kind] ?? child.kind}
                          </td>
                          <JobCells job={child} />
                      </tr>
                  ))
                : null}
        </>
    );
};

const JobRows = ({ jobs }: { jobs: SrcQueueJob[] }) => (
    <tbody className={styles.tableBody}>
        {groupJobs(jobs).map((group) => (
            <GroupRows
                key={`${group.job.kind}-${group.job.id}`}
                group={group}
            />
        ))}
    </tbody>
);

const Section = ({
    title,
    empty,
    jobs,
    note,
}: {
    title: string;
    empty: string;
    jobs: SrcQueueJob[];
    note?: string;
}) => (
    <section className={`${styles.panel} ${own.section}`}>
        <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>{title}</h2>
            {note ? <span className={own.pale}>{note}</span> : null}
            <span className={styles.panelCount}>{jobs.length}</span>
        </div>
        {jobs.length === 0 ? (
            <div className={styles.noData}>{empty}</div>
        ) : (
            <div className={styles.panelBody}>
                <table className={styles.table}>
                    <thead className={styles.tableHeader}>
                        <tr>
                            <th>Job</th>
                            <th>Target</th>
                            <th>Status</th>
                            <th>Progress</th>
                            <th>Requested by</th>
                            <th>Created</th>
                            <th>Error</th>
                        </tr>
                    </thead>
                    <JobRows jobs={jobs} />
                </table>
            </div>
        )}
    </section>
);

export const QueuesTable = ({ initial }: { initial: SrcQueues }) => {
    const [queues, setQueues] = useState(initial);
    const [error, setError] = useState('');
    // A quiet site should not re-read three job tables every five seconds, but
    // it must keep reading: stopping altogether froze the page on whatever it
    // loaded, and a job queued a minute later never appeared.
    const busy = queues.active.length > 0;

    const refresh = useCallback(async () => {
        try {
            setQueues(await getSrcQueuesAction());
            setError('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not read jobs');
        }
    }, []);

    useEffect(() => {
        const t = setInterval(refresh, busy ? POLL_MS : IDLE_POLL_MS);
        return () => clearInterval(t);
    }, [busy, refresh]);

    return (
        <>
            {error ? (
                <div className={`${styles.alert} ${styles.alertDanger}`}>
                    {error}
                </div>
            ) : null}
            <Section
                title="Running now"
                empty="Nothing is importing right now."
                jobs={queues.active}
                note={
                    queues.active.length > 0
                        ? `${queues.active.filter((j) => j.status === 'queued' || j.status === 'planning').length} waiting`
                        : undefined
                }
            />
            <Section
                title="Finished in the last 24 hours"
                empty="No jobs finished in the last 24 hours."
                jobs={queues.recent}
            />
            <button
                type="button"
                className={styles.btnOutline}
                onClick={refresh}
            >
                Refresh
            </button>
        </>
    );
};
