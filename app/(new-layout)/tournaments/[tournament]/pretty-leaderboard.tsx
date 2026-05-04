'use client';

import React, { ReactNode, useMemo, useState } from 'react';
import { Search as SearchIcon } from 'react-bootstrap-icons';
import { UserLink } from '~src/components/links/links';
import styles from './tournament-detail.module.scss';

const PAGE_SIZE = 10;

export interface LeaderboardRow {
    username: string;
    stat: number | string;
    placing?: number;
    url?: string;
}

export interface PrettyLeaderboardProps {
    rows: LeaderboardRow[] | undefined;
    formatStat: (stat: string | number, key: number) => ReactNode;
    statLabel?: string;
}

const rankClass = (placing: number) => {
    if (placing === 1) return styles.rankGold;
    if (placing === 2) return styles.rankSilver;
    if (placing === 3) return styles.rankBronze;
    return '';
};

export const PrettyLeaderboard: React.FC<PrettyLeaderboardProps> = ({
    rows,
    formatStat,
    statLabel,
}) => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        if (!rows) return [];
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => r.username.toLowerCase().includes(q));
    }, [rows, search]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount - 1);
    const visible = filtered.slice(
        safePage * PAGE_SIZE,
        safePage * PAGE_SIZE + PAGE_SIZE,
    );

    return (
        <div className={styles.lbWrap}>
            <div className={styles.lbSearch}>
                <SearchIcon
                    size={14}
                    className={styles.lbSearchIcon}
                    aria-hidden
                />
                <input
                    type="search"
                    className={styles.lbSearchInput}
                    placeholder="Search runner…"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(0);
                    }}
                />
            </div>

            {visible.length === 0 ? (
                <div className={styles.lbEmpty}>
                    {search ? 'No runners match.' : 'No entries yet.'}
                </div>
            ) : (
                <ol className={styles.lbList}>
                    {visible.map((row, idx) => {
                        const placing =
                            row.placing ?? safePage * PAGE_SIZE + idx + 1;
                        return (
                            <li
                                key={`${row.username}-${row.stat}-${placing}`}
                                className={`${styles.lbRow} ${rankClass(placing)}`}
                            >
                                <span className={styles.lbRank}>{placing}</span>
                                <span className={styles.lbUser}>
                                    <UserLink
                                        url={row.url}
                                        username={row.username}
                                    />
                                </span>
                                <span className={styles.lbStat}>
                                    {formatStat(
                                        row.stat,
                                        safePage * PAGE_SIZE + idx,
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}

            {pageCount > 1 && (
                <div className={styles.lbPager}>
                    <button
                        type="button"
                        className={styles.lbPagerBtn}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={safePage === 0}
                    >
                        ←
                    </button>
                    <span className={styles.lbPagerInfo}>
                        {statLabel ? `${statLabel} · ` : ''}
                        {safePage + 1} / {pageCount}
                    </span>
                    <button
                        type="button"
                        className={styles.lbPagerBtn}
                        onClick={() =>
                            setPage((p) => Math.min(pageCount - 1, p + 1))
                        }
                        disabled={safePage >= pageCount - 1}
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    );
};
