'use client';

import moment from 'moment';
import type { BackupRecentEntry } from 'types/backups.types';
import { DownloadButton } from './download-button';
import styles from './downloads.module.scss';

interface RecentListProps {
    entries: BackupRecentEntry[];
    filenameBase: string;
}

export function RecentList({ entries, filenameBase }: RecentListProps) {
    return (
        <section>
            <h4 className={styles.subsectionLabel}>Recent · last 5 uploads</h4>
            {entries.length === 0 ? (
                <div className={styles.inlineEmpty}>No recent snapshots.</div>
            ) : (
                <div className={styles.list}>
                    {entries.map((entry) => {
                        const ts = moment(entry.uploadedAt);
                        const filename = `${filenameBase} (${ts.format('YYYY-MM-DD HH-mm')}).lss`;
                        return (
                            <div key={entry.uploadedAt} className={styles.row}>
                                <div className={styles.rowPrimaryCol}>
                                    <div className={styles.rowPrimary}>
                                        {ts.format('MMM D, YYYY · HH:mm')}
                                    </div>
                                    <div className={styles.rowSecondary}>
                                        {ts.fromNow()}
                                    </div>
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
