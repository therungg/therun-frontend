'use client';

import { Download, FileEarmarkCode } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { Run } from '~src/common/types';
import styles from './downloads.module.scss';
import { SectionHeader } from './section-header';

interface CurrentSplitsProps {
    run: Run;
}

export function CurrentSplits({ run }: CurrentSplitsProps) {
    return (
        <section className={styles.section}>
            <SectionHeader
                icon={<FileEarmarkCode size={28} />}
                kicker="Live file"
                title="Current splits file"
                subtitle="The .lss file currently attached to this run — always fresh."
                tone="primary"
            />
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

/** The run's current .lss, fetched and saved under a readable name. */
export function splitsFileUrl(
    run: Run,
): { url: string; fallbackUrl: string; filename: string } | null {
    if (!run.splitsFile) return null;
    const splitsFile = decodeURIComponent(run.splitsFile)
        .replaceAll('%', '%25')
        .replaceAll('+++', '+%2B+')
        .replaceAll('++', '%2B+')
        .replaceAll('NG+', 'NG%2B');
    return {
        url: `${process.env.NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL}/${splitsFile}`,
        fallbackUrl: `${process.env.NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL}/${splitsFile.replaceAll('+', '%2B')}`,
        filename: `${run.user}_${run.game}_${run.run}.lss`,
    };
}

export async function downloadSplitsFile(run: Run): Promise<void> {
    const file = splitsFileUrl(run);
    if (!file) return;
    toast.info(
        `If you want to remove the run history on these splits, use 'Edit Splits' -> 'Other...' -> 'Clear History' from within LiveSplit.`,
    );

    let response = await fetch(file.url);
    if (!response.ok) {
        response = await fetch(file.fallbackUrl);
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
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
}

function CurrentCard({ run }: { run: Run }) {
    const file = splitsFileUrl(run);
    const url = file?.url ?? '';
    const downloadFilename = file?.filename ?? '';

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        await downloadSplitsFile(run);
    };

    return (
        <div className={styles.currentCard}>
            <div className={styles.currentCardGlow} aria-hidden="true" />
            <div className={styles.currentBody}>
                <div className={styles.currentPrimary}>
                    Latest uploaded file
                </div>
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
