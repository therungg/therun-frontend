'use client';

import { toast } from 'react-toastify';
import type { Run } from '~src/common/types';

interface CurrentSplitsProps {
    run: Run;
}

export function CurrentSplits({ run }: CurrentSplitsProps) {
    if (!run.splitsFile) {
        return (
            <div>
                <h3 className="fs-5 mb-2">Current splits</h3>
                <p className="text-muted mb-0">
                    No splits file uploaded for this run.
                </p>
            </div>
        );
    }

    const splitsFile = decodeURIComponent(run.splitsFile)
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
        <div>
            <h3 className="fs-5 mb-2">Current splits</h3>
            <div className="d-flex align-items-center justify-content-between border rounded p-3">
                <div>
                    <div className="fw-semibold">{downloadFilename}</div>
                    <small className="text-muted">
                        The live splits file currently on this run.
                    </small>
                </div>
                <a
                    href={url}
                    download={downloadFilename}
                    onClick={handleDownload}
                    className="btn btn-sm btn-outline-primary"
                >
                    Download
                </a>
            </div>
        </div>
    );
}
