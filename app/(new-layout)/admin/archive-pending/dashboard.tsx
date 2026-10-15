'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { structureParts } from '~src/lib/src-archive-counts';
import type {
    SrcArchivePending,
    SrcArchivePendingRow,
} from '../../../../types/src-import.types';
import { RunnerAvatar } from '../../games/[game]/leaderboard/runner-avatar';
import {
    SegmentedControl,
    SwitchField,
} from '../../games/[game]/manage/shared/form-kit';
import {
    type ArchivePendingFilter,
    applyArchiveDefaults,
    markArchiveContacted,
} from './actions/archive-pending.action';
import styles from './archive-pending.module.scss';

type Row = Omit<SrcArchivePendingRow, 'moderators'> & {
    moderators: (SrcArchivePendingRow['moderators'][number] & {
        stale: boolean;
    })[];
};

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export function ArchivePendingDashboard({
    summary,
    rows,
    filter,
}: {
    summary: SrcArchivePending['summary'] | null;
    rows: Row[];
    filter: ArchivePendingFilter;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [q, setQ] = useState(filter.q ?? '');

    const setParam = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        const query = params.toString();
        startTransition(() => {
            router.push(query ? `${pathname}?${query}` : pathname, {
                scroll: false,
            });
        });
    };

    const act = (
        action: () => Promise<{ ok: true } | { error: string }>,
        done: string,
    ) => {
        startTransition(async () => {
            const res = await action();
            if ('error' in res) toast.error(res.error);
            else toast.success(done);
        });
    };

    const copyMessage = async (r: Row) => {
        const text = `Runs from speedrun.com are already on your board. The missing categories and variables are waiting in your console under speedrun.com archive: ${window.location.origin}/games/${r.slug}/manage. Nothing else changes until you turn them on.`;
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Message copied');
        } catch {
            toast.error('Could not copy the message.');
        }
    };

    const main = rows.filter((r) => r.status !== 'failed');
    const failed = rows.filter((r) => r.status === 'failed');

    const tiles: [string, number][] = summary
        ? [
              ['Behind', summary.behind],
              ['Runs waiting', summary.runsWaiting],
              ['Boards missing structure', summary.structureWaiting],
              ['Contacted', summary.contacted],
              ['Applied in 7 days', summary.appliedLast7d],
              ['Could not import', summary.failed],
          ]
        : [];

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>speedrun.com archive</h1>
            {summary === null && (
                <p role="alert">Couldn&apos;t load the archive status.</p>
            )}
            {tiles.length > 0 && (
                <div className={styles.tiles}>
                    {tiles.map(([label, value]) => (
                        <div key={label} className={styles.tile}>
                            <span className={styles.tileLabel}>{label}</span>
                            <span className={styles.tileValue}>
                                {value.toLocaleString('en-US')}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.filters}>
                <SegmentedControl
                    label="Status"
                    labelHidden
                    value={filter.status ?? 'all'}
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'behind', label: 'Behind' },
                        { value: 'contacted', label: 'Contacted' },
                        { value: 'applying', label: 'Applying' },
                        { value: 'applied', label: 'Applied' },
                        { value: 'failed', label: 'Failed' },
                    ]}
                    onChange={(v) => setParam('status', v === 'all' ? null : v)}
                />
                <SwitchField
                    id="archive-active-mods"
                    label="Active mods only"
                    checked={filter.activeMods ?? false}
                    onChange={(on) => setParam('activeMods', on ? '1' : null)}
                />
                <select
                    className={styles.select}
                    aria-label="Sort"
                    value={filter.sort ?? 'staged'}
                    onChange={(e) => setParam('sort', e.target.value)}
                >
                    <option value="runs">Most runs</option>
                    <option value="staged">Staged date</option>
                </select>
                <form
                    className={styles.search}
                    onSubmit={(e) => {
                        e.preventDefault();
                        setParam('q', q.trim() || null);
                    }}
                >
                    <input
                        type="search"
                        className={`form-control form-control-sm ${styles.input}`}
                        placeholder="Search games"
                        aria-label="Search games"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </form>
            </div>

            <div
                className={
                    isPending
                        ? `${styles.surface} ${styles.busy}`
                        : styles.surface
                }
            >
                {main.length === 0 ? (
                    <div className={styles.empty}>No games.</div>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Game</th>
                                    <th>Moderators</th>
                                    <th>Staged on</th>
                                    <th>Held runs</th>
                                    <th>To turn on</th>
                                    <th>Contacted</th>
                                    <th>Applied</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {main.map((r) => (
                                    <tr key={r.jobId ?? r.game}>
                                        <td>
                                            {r.slug ? (
                                                <Link
                                                    href={`/games/${r.slug}/manage`}
                                                >
                                                    {r.game}
                                                </Link>
                                            ) : (
                                                r.game
                                            )}
                                        </td>
                                        <td>
                                            <span className={styles.mods}>
                                                {r.moderators.map((m) => (
                                                    <span
                                                        key={m.userId}
                                                        className={
                                                            m.stale
                                                                ? `${styles.mod} ${styles.stale}`
                                                                : styles.mod
                                                        }
                                                    >
                                                        <RunnerAvatar
                                                            name={m.username}
                                                            picture={m.picture}
                                                            size="xs"
                                                        />
                                                        <UserLink
                                                            username={
                                                                m.username
                                                            }
                                                        />
                                                    </span>
                                                ))}
                                            </span>
                                        </td>
                                        <td className={styles.muted}>
                                            {day(r.stagedAt)}
                                        </td>
                                        <td>
                                            {r.held.toLocaleString('en-US')}
                                        </td>
                                        <td>
                                            {structureParts(r.structure).join(
                                                ', ',
                                            )}
                                        </td>
                                        <td className={styles.muted}>
                                            {day(r.contactedAt)}
                                        </td>
                                        <td className={styles.muted}>
                                            {r.status === 'applying'
                                                ? 'Applying'
                                                : day(r.appliedAt)}
                                        </td>
                                        <td>
                                            <RowActions
                                                row={r}
                                                busy={isPending}
                                                onCopy={() => copyMessage(r)}
                                                act={act}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {failed.length > 0 && (
                <>
                    <h2 className={styles.subtitle}>Could not import</h2>
                    <div className={styles.surface}>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Game</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {failed.map((r) => (
                                        <tr key={r.jobId ?? r.game}>
                                            <td>{r.game}</td>
                                            <td className={styles.muted}>
                                                {r.error ?? ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function RowActions({
    row,
    busy,
    onCopy,
    act,
}: {
    row: Row;
    busy: boolean;
    onCopy: () => void;
    act: (
        action: () => Promise<{ ok: true } | { error: string }>,
        done: string,
    ) => void;
}) {
    const jobId = row.jobId;
    return (
        <span className={styles.actions}>
            {row.slug &&
                (row.status === 'behind' || row.status === 'contacted') && (
                    <button
                        type="button"
                        className={styles.pill}
                        onClick={onCopy}
                    >
                        Copy message
                    </button>
                )}
            {jobId !== null && row.status === 'behind' && (
                <button
                    type="button"
                    className={styles.pill}
                    disabled={busy}
                    onClick={() =>
                        act(
                            () => markArchiveContacted(jobId),
                            `Marked ${row.game} as contacted`,
                        )
                    }
                >
                    Mark contacted
                </button>
            )}
            {jobId !== null &&
                row.status !== 'applied' &&
                row.status !== 'applying' && (
                    <button
                        type="button"
                        className={styles.pill}
                        disabled={busy}
                        onClick={() => {
                            if (
                                !confirm(
                                    `Turn on the speedrun.com structure for ${row.game}?`,
                                )
                            )
                                return;
                            act(
                                () => applyArchiveDefaults(jobId),
                                `Applying ${row.game}`,
                            );
                        }}
                    >
                        Apply with defaults
                    </button>
                )}
        </span>
    );
}
