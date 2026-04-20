'use client';

import moment from 'moment';
import type { BackupDailyEntry } from 'types/backups.types';
import { DownloadButton } from './download-button';
import styles from './downloads.module.scss';

interface DailyListProps {
    entries: BackupDailyEntry[];
    filenameBase: string;
}

export function DailyList({ entries, filenameBase }: DailyListProps) {
    return (
        <section>
            <h4 className={styles.subsectionLabel}>Daily · one per day</h4>
            {entries.length === 0 ? (
                <div className={styles.inlineEmpty}>No daily snapshots.</div>
            ) : (
                <div className={styles.list}>
                    {entries.map((entry) => {
                        const filename = `${filenameBase}_${entry.date}.lss`;
                        const date = moment(entry.date);
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
                                <div className={styles.rowMetaCol}>
                                    {entry.expiresAt === null ? (
                                        <div className={styles.rowMetaPrimary}>
                                            Never expires
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className={
                                                    styles.rowMetaPrimary
                                                }
                                            >
                                                Expires{' '}
                                                {moment(
                                                    entry.expiresAt,
                                                ).fromNow()}
                                            </div>
                                            <div
                                                className={
                                                    styles.rowMetaSecondary
                                                }
                                            >
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
            )}
        </section>
    );
}
