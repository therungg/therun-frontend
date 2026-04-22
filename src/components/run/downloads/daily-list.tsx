'use client';

import moment from 'moment';
import type { BackupDailyEntry } from 'types/backups.types';
import { getFormattedString } from '../../util/datetime';
import { DownloadButton } from './download-button';
import styles from './downloads.module.scss';

interface DailyListProps {
    entries: BackupDailyEntry[];
    filenameBase: string;
}

function formatPb(entry: BackupDailyEntry): string | null {
    const ms = entry.pbRealtimeMs ?? entry.pbGametimeMs;
    if (!ms || ms <= 0) return null;
    return getFormattedString(String(ms));
}

function pbForFilename(entry: BackupDailyEntry): string | null {
    const ms = entry.pbRealtimeMs ?? entry.pbGametimeMs;
    if (!ms || ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return hours > 0
        ? `${hours}h${pad(minutes)}m${pad(seconds)}s`
        : `${minutes}m${pad(seconds)}s`;
}

export function DailyList({ entries, filenameBase }: DailyListProps) {
    if (entries.length === 0) {
        return <div className={styles.inlineEmpty}>No daily snapshots.</div>;
    }

    return (
        <div className={styles.list}>
            {entries.map((entry) => {
                const pbTag = pbForFilename(entry);
                const filename = pbTag
                    ? `${filenameBase}_daily_${entry.date}_pb-${pbTag}.lss`
                    : `${filenameBase}_daily_${entry.date}.lss`;
                const date = moment(entry.date);
                const pb = formatPb(entry);
                const sob =
                    entry.sumOfBestMs && entry.sumOfBestMs > 0
                        ? getFormattedString(String(entry.sumOfBestMs))
                        : null;
                const hasCounts =
                    entry.attemptCount !== null ||
                    entry.finishedRunCount !== null;

                return (
                    <div key={entry.date} className={styles.row}>
                        <div className={styles.rowPrimaryCol}>
                            <div className={styles.rowPrimary}>
                                {date.format('MMM D, YYYY')}
                            </div>
                            <div className={styles.rowSecondary}>
                                {date.fromNow()}
                            </div>
                        </div>

                        <div className={styles.rowStatsCol}>
                            {pb ? (
                                <div className={styles.statPbRow}>
                                    <span className={styles.statLabel}>PB</span>
                                    <span className={styles.statPb}>{pb}</span>
                                </div>
                            ) : (
                                <div className={styles.statPbRow}>
                                    <span className={styles.statEmpty}>
                                        No PB yet
                                    </span>
                                </div>
                            )}
                            <div className={styles.statChipsRow}>
                                {hasCounts && (
                                    <span
                                        className={styles.statChip}
                                        title={`${
                                            entry.finishedRunCount ?? 0
                                        } finished of ${
                                            entry.attemptCount ?? 0
                                        } attempts`}
                                    >
                                        {entry.finishedRunCount ?? 0}
                                        <span className={styles.statChipSep}>
                                            /
                                        </span>
                                        {entry.attemptCount ?? 0}
                                        <span className={styles.statChipUnit}>
                                            runs
                                        </span>
                                    </span>
                                )}
                                {sob && (
                                    <span
                                        className={styles.statChip}
                                        title="Sum of best"
                                    >
                                        <span className={styles.statChipLabel}>
                                            SoB
                                        </span>
                                        {sob}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={styles.rowMetaCol}>
                            {entry.expiresAt === null ? (
                                <div className={styles.rowMetaPrimary}>
                                    Never expires
                                </div>
                            ) : (
                                <>
                                    <div className={styles.rowMetaPrimary}>
                                        Expires{' '}
                                        {moment(entry.expiresAt).fromNow()}
                                    </div>
                                    <div className={styles.rowMetaSecondary}>
                                        {moment(entry.expiresAt).format(
                                            'MMM D, YYYY',
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={styles.rowAction}>
                            <DownloadButton
                                downloadUrl={entry.downloadUrl}
                                filename={filename}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
