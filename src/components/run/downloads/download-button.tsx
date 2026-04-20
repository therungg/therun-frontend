'use client';

import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Download, Lock } from 'react-bootstrap-icons';

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
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                aria-label={`Download ${filename}`}
            >
                <Download aria-hidden="true" />
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
            <button
                type="button"
                disabled
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                aria-label="Locked download — supporter-only"
            >
                <Lock aria-hidden="true" />
                <span>Locked</span>
            </button>
        </OverlayTrigger>
    );
}
