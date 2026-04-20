'use client';

import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Download, Lock } from 'react-bootstrap-icons';
import styles from './downloads.module.scss';

interface DownloadButtonProps {
    downloadUrl: string | null;
    filename: string;
    onClick?: () => void;
}

export function DownloadButton({
    downloadUrl,
    filename,
    onClick,
}: DownloadButtonProps) {
    if (downloadUrl) {
        return (
            <a
                href={downloadUrl}
                download={filename}
                onClick={onClick}
                className={styles.btnDownload}
                aria-label={`Download ${filename}`}
            >
                <Download size={13} aria-hidden="true" />
                <span>Download</span>
            </a>
        );
    }

    return (
        <OverlayTrigger
            placement="top"
            overlay={
                <Tooltip>
                    Supporter-only — cloud backups have storage costs.
                </Tooltip>
            }
        >
            <span
                className={styles.btnLocked}
                aria-label="Locked download — supporter-only"
                role="button"
                aria-disabled="true"
                tabIndex={0}
            >
                <Lock size={13} aria-hidden="true" />
                <span>Locked</span>
            </span>
        </OverlayTrigger>
    );
}
