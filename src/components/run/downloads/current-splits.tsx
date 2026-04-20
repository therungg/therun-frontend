'use client';

import { Download } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { Run } from '~src/common/types';
import styles from './downloads.module.scss';

interface CurrentSplitsProps {
    run: Run;
}

export function CurrentSplits({ run }: CurrentSplitsProps) {
    return (
        <section>
            <h3 className={styles.sectionLabel}>Current</h3>
            {run.splitsFile ? (
                <CurrentCard run={run} />
            ) : (
                <div className={styles.emptyCard}>
                    <div className={styles.emptyCardTitle}>No splits file</div>
                    <p className={styles.emptyCardCopy}>
                        Nothing has been uploaded to this run yet.
                    </p>
                </div>
            )}
        </section>
    );
}

function CurrentCard({ run }: { run: Run }) {
    const splitsFile = decodeURIComponent(run.splitsFile as string)
        .replaceAll('%', '%25')
        .replaceAll('+++', '+%2B+')
        .replaceAll('++', '%2B+')
        .replaceAll('NG+', 'NG%2B');

    const url = `${process.env.NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL}/${splitsFile}`;
    const fallbackUrl = `${process.env.NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL}/${splitsFile.replaceAll('+', '%2B')}`;
    const downloadFilename = `${run.user}_${run.game}_${run.run}.lss`;

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        toast.info(
            `If you want to remove the run history on these splits, use 'Edit Splits' -> 'Other...' -> 'Clear History' from within LiveSplit.`,
        );

        let response = await fetch(url);
        if (!response.ok) {
            response = await fetch(fallbackUrl);
        }
        if (!response.ok) {
            toast.error('Failed to download splits file.');
            return;
        }

        const blob = new Blob([await response.blob()], {
            type: 'application/octet-stream',
        });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = downloadFilename;
        a.click();
        URL.revokeObjectURL(blobUrl);
    };

    return (
        <div className={styles.currentCard}>
            <div className={styles.currentBody}>
                <div className={styles.currentPrimary}>Live splits</div>
                <div className={styles.currentSecondary}>
                    The .lss file currently attached to this run.
                </div>
                <div className={styles.currentFilename}>{downloadFilename}</div>
            </div>
            <a
                href={url}
                download={downloadFilename}
                onClick={handleDownload}
                className={styles.btnPrimaryLg}
            >
                <Download size={14} aria-hidden="true" />
                <span>Download</span>
            </a>
        </div>
    );
}
