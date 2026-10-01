'use client';

import { type ReactNode, useState } from 'react';
import { CappedList } from './capped-list';
import styles from './sidebar.module.scss';

/** One server-rendered row plus what the controls sort and filter on. */
export interface StandingRow {
    key: string;
    node: ReactNode;
    groupKey: string;
    groupLabel: string;
    /** Position in the game's board order. */
    order: number;
    /** The open board's row — leads "Board order" so its gap line shows. */
    pinned: boolean;
    runDate: string;
    rank: number | null;
    totalRunners: number;
    pending: boolean;
}

type SortKey = 'board' | 'recent' | 'rank' | 'pending';

const SORTS: { key: SortKey; label: string }[] = [
    { key: 'board', label: 'Board order' },
    { key: 'recent', label: 'Most recent' },
    { key: 'rank', label: 'Best rank' },
    { key: 'pending', label: 'Pending first' },
];

const ALL_GROUPS = 'all';

interface Props {
    rows: StandingRow[];
    limit: number;
}

const byBoard = (a: StandingRow, b: StandingRow) =>
    Number(b.pinned) - Number(a.pinned) || a.order - b.order;

// Plain rank, so the list reads #1, #1, #2, … as the label promises; among
// equal ranks the bigger board leads. Unranked rows go last.
const byRank = (a: StandingRow, b: StandingRow) => {
    if (a.rank == null || b.rank == null) {
        return Number(a.rank == null) - Number(b.rank == null);
    }
    return a.rank - b.rank || b.totalRunners - a.totalRunners;
};

const COMPARE: Record<SortKey, (a: StandingRow, b: StandingRow) => number> = {
    board: byBoard,
    recent: (a, b) => b.runDate.localeCompare(a.runDate) || byBoard(a, b),
    rank: (a, b) => byRank(a, b) || byBoard(a, b),
    pending: (a, b) => Number(b.pending) - Number(a.pending) || byBoard(a, b),
};

/**
 * Your standing's rows with a group filter and a sort. Both only appear
 * once the list is long enough to be capped — five boards need neither —
 * and the group filter only when the runner's boards span two groups.
 */
export function StandingList({ rows, limit }: Props) {
    const [group, setGroup] = useState(ALL_GROUPS);
    const [sort, setSort] = useState<SortKey>('board');

    const groups: { key: string; label: string }[] = [];
    for (const r of [...rows].sort(byBoard)) {
        if (!groups.some((g) => g.key === r.groupKey)) {
            groups.push({ key: r.groupKey, label: r.groupLabel });
        }
    }
    const showControls = rows.length > limit;

    const visible = rows
        .filter((r) => group === ALL_GROUPS || r.groupKey === group)
        .sort(COMPARE[sort]);

    return (
        <>
            {showControls && (
                <div className={styles.standingControls}>
                    {groups.length > 1 && (
                        <select
                            aria-label="Category group"
                            className={styles.standingSelect}
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                        >
                            <option value={ALL_GROUPS}>
                                All category groups
                            </option>
                            {groups.map((g) => (
                                <option key={g.key} value={g.key}>
                                    {g.label}
                                </option>
                            ))}
                        </select>
                    )}
                    <select
                        aria-label="Sort"
                        className={styles.standingSelect}
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortKey)}
                    >
                        {SORTS.map((s) => (
                            <option key={s.key} value={s.key}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <CappedList items={visible.map((r) => r.node)} limit={limit} />
        </>
    );
}
