'use client';

import { useId, useState } from 'react';
import { BoardDialog } from '../shared/board-dialog';
import { RunEvidencePanel } from './run-evidence-panel';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

export function EvidenceDialog({
    model,
    sessionUsername,
    isMod,
    label,
}: {
    model: RunViewModel;
    sessionUsername: string | null;
    isMod: boolean;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const titleId = useId();
    return (
        <>
            <button
                type="button"
                className={styles.pill}
                onClick={() => setOpen(true)}
            >
                {label}
            </button>
            <BoardDialog
                open={open}
                onClose={() => setOpen(false)}
                labelledBy={titleId}
                size="lg"
            >
                <div className={styles.evidenceDialogHeader}>
                    <h5 id={titleId} className={styles.evidenceDialogTitle}>
                        Video and description
                    </h5>
                </div>
                <div className={styles.evidenceDialogBody}>
                    <RunEvidencePanel
                        model={model}
                        sessionUsername={sessionUsername}
                        isMod={isMod}
                    />
                </div>
            </BoardDialog>
        </>
    );
}
