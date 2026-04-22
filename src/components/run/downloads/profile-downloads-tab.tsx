'use client';

import { useMemo, useState } from 'react';
import { Search } from 'react-bootstrap-icons';
import type { Run } from '~src/common/types';
import { getFormattedString } from '~src/components/util/datetime';
import styles from './downloads.module.scss';
import { LayoutsSection } from './layouts-section';
import { RunDownloadsView } from './run-downloads-view';

interface ProfileDownloadsTabProps {
    username: string;
    runs: Run[];
    isActive: boolean;
}

function gameDisplay(run: Run): string {
    return run.game.split('#')[0];
}

export function ProfileDownloadsTab({
    username,
    runs,
    isActive,
}: ProfileDownloadsTabProps) {
    const [selectedKey, setSelectedKey] = useState<string | null>(() => {
        return runs.length > 0 ? runKey(runs[0]) : null;
    });
    const [filter, setFilter] = useState('');

    const filteredRuns = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return runs;
        return runs.filter((r) => {
            return (
                gameDisplay(r).toLowerCase().includes(q) ||
                r.run.toLowerCase().includes(q)
            );
        });
    }, [runs, filter]);

    const selectedRun = useMemo(() => {
        if (!selectedKey) return null;
        return runs.find((r) => runKey(r) === selectedKey) ?? null;
    }, [runs, selectedKey]);

    return (
        <div className={styles.profileContainer}>
            <LayoutsSection username={username} isActive={isActive} />

            <section className={styles.runPickerSection}>
                <h3 className={styles.sectionLabel}>Downloads per run</h3>

                {runs.length === 0 ? (
                    <div className={styles.emptyCard}>
                        <div className={styles.emptyCardTitle}>
                            No runs uploaded yet
                        </div>
                        <p className={styles.emptyCardCopy}>
                            When {username} uploads a run, its splits + cloud
                            backups will be available here.
                        </p>
                    </div>
                ) : (
                    <div className={styles.runPickerLayout}>
                        <aside className={styles.runSidebar}>
                            <div className={styles.runSearchWrap}>
                                <Search
                                    size={12}
                                    aria-hidden="true"
                                    className={styles.runSearchIcon}
                                />
                                <input
                                    type="search"
                                    className={styles.runSearchInput}
                                    placeholder="Filter runs…"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                />
                            </div>
                            <div
                                className={styles.runList}
                                role="listbox"
                                aria-label="Select a run"
                            >
                                {filteredRuns.length === 0 ? (
                                    <div className={styles.runListEmpty}>
                                        No runs match "{filter}".
                                    </div>
                                ) : (
                                    filteredRuns.map((run) => {
                                        const key = runKey(run);
                                        const active = key === selectedKey;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                role="option"
                                                aria-selected={active}
                                                onClick={() =>
                                                    setSelectedKey(key)
                                                }
                                                className={`${
                                                    styles.runListItem
                                                } ${
                                                    active
                                                        ? styles.runListItemActive
                                                        : ''
                                                }`}
                                            >
                                                <span
                                                    className={
                                                        styles.runListGame
                                                    }
                                                >
                                                    {gameDisplay(run)}
                                                </span>
                                                <span
                                                    className={
                                                        styles.runListCategory
                                                    }
                                                >
                                                    {run.run}
                                                </span>
                                                {run.personalBest && (
                                                    <span
                                                        className={
                                                            styles.runListPb
                                                        }
                                                        title="Personal best"
                                                    >
                                                        {getFormattedString(
                                                            run.personalBest,
                                                        )}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </aside>

                        <div className={styles.runDetail}>
                            {selectedRun ? (
                                <RunDownloadsView
                                    run={selectedRun}
                                    username={username}
                                    isActive={isActive}
                                />
                            ) : (
                                <div className={styles.emptyCard}>
                                    <div className={styles.emptyCardTitle}>
                                        Pick a run
                                    </div>
                                    <p className={styles.emptyCardCopy}>
                                        Select a run from the list to see its
                                        current .lss file and cloud backups.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

function runKey(run: Run): string {
    return `${run.game}__${run.run}`;
}
