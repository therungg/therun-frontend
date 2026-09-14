'use client';

import { Fragment, useState } from 'react';
import { ClockHistory, Download } from 'react-bootstrap-icons';
import type { Run } from '~src/common/types';
import { downloadSplitsFile } from '~src/components/run/downloads/current-splits';
import { RunDownloadsView } from '~src/components/run/downloads/run-downloads-view';
import { getFormattedString } from '~src/components/util/datetime';
import { safeEncodeURI } from '~src/utils/uri';
import { formatCount } from '../format';
import { ProfileGroup } from '../profile-group';
import ui from '../profile-ui.module.scss';
import { categoryOf, plural } from '../ranks';
import styles from './splits.module.scss';

const gameOf = (run: Run) => run.game.split('#')[0];

const shortDate = (value: Date | string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year:
            d.getUTCFullYear() === new Date().getUTCFullYear()
                ? undefined
                : 'numeric',
        timeZone: 'UTC',
    });
};

/** Every uploaded run, grouped by game, with its .lss one click away. */
export function SplitsPanel({
    runs,
    username,
}: {
    runs: Run[];
    username: string;
}) {
    const [backupsFor, setBackupsFor] = useState<string | null>(null);
    const groups = new Map<string, Run[]>();
    for (const run of runs) {
        const game = gameOf(run);
        groups.set(game, [...(groups.get(game) ?? []), run]);
    }
    const ordered = [...groups.entries()].sort(
        (a, b) =>
            Math.max(...b[1].map((r) => new Date(r.uploadTime).getTime())) -
            Math.max(...a[1].map((r) => new Date(r.uploadTime).getTime())),
    );

    return (
        <div className={`${ui.panel} ${styles.splits}`}>
            <div className={ui.colHead} aria-hidden>
                <span>Category</span>
                <span className={ui.end}>PB</span>
                <span className={`${ui.end} ${ui.optional}`}>Attempts</span>
                <span className={`${ui.end} ${ui.optional}`}>Uploaded</span>
                <span />
            </div>
            {ordered.map(([game, list], i) => (
                <ProfileGroup
                    key={game}
                    title={game}
                    meta={plural(list.length, 'run', 'runs')}
                    defaultOpen={ordered.length <= 6 || i < 4}
                    collapsible={ordered.length > 1}
                >
                    {list.map((run, index) => {
                        // Two runs can share a game and category.
                        const key = `${run.game}|${run.run}|${index}`;
                        const open = backupsFor === key;
                        return (
                            <Fragment key={key}>
                                <div className={ui.row}>
                                    <a
                                        className={ui.name}
                                        href={`/${run.url
                                            .split('/')
                                            .map((p) => safeEncodeURI(p))
                                            .join('/')}`}
                                    >
                                        <span className={ui.nameMain}>
                                            {categoryOf(run)}
                                        </span>
                                    </a>
                                    <span
                                        className={`${ui.num} ${ui.strong} ${ui.end}`}
                                    >
                                        {run.personalBest
                                            ? getFormattedString(
                                                  run.personalBest,
                                              )
                                            : '—'}
                                    </span>
                                    <span
                                        className={`${ui.num} ${ui.muted} ${ui.end} ${ui.optional}`}
                                    >
                                        {formatCount(
                                            Number(run.attemptCount) || 0,
                                        )}
                                    </span>
                                    <span
                                        className={`${ui.small} ${ui.muted} ${ui.end} ${ui.optional}`}
                                    >
                                        {shortDate(run.uploadTime)}
                                    </span>
                                    <span className={styles.actions}>
                                        <button
                                            type="button"
                                            className={ui.iconLink}
                                            aria-expanded={open}
                                            onClick={() =>
                                                setBackupsFor(open ? null : key)
                                            }
                                            title="Earlier versions of this file"
                                        >
                                            <ClockHistory
                                                size={13}
                                                aria-hidden
                                            />
                                            <span
                                                className={styles.actionLabel}
                                            >
                                                Backups
                                            </span>
                                        </button>
                                        {run.splitsFile ? (
                                            <button
                                                type="button"
                                                className={ui.button}
                                                onClick={() =>
                                                    void downloadSplitsFile(run)
                                                }
                                            >
                                                <Download
                                                    size={13}
                                                    aria-hidden
                                                />
                                                .lss
                                            </button>
                                        ) : (
                                            <span
                                                className={`${ui.small} ${ui.faint}`}
                                            >
                                                No file
                                            </span>
                                        )}
                                    </span>
                                </div>
                                {open ? (
                                    <div className={ui.detail}>
                                        <RunDownloadsView
                                            run={run}
                                            username={username}
                                            isActive
                                            backupsOnly
                                        />
                                    </div>
                                ) : null}
                            </Fragment>
                        );
                    })}
                </ProfileGroup>
            ))}
        </div>
    );
}
