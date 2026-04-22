'use client';

import type { Run } from '~src/common/types';
import styles from './downloads.module.scss';
import { LayoutsSection } from './layouts-section';
import { RunDownloadsView } from './run-downloads-view';

interface DownloadsTabProps {
    run: Run;
    username: string;
    isActive: boolean;
}

export function DownloadsTab({ run, username, isActive }: DownloadsTabProps) {
    return (
        <div className={styles.container}>
            <RunDownloadsView
                run={run}
                username={username}
                isActive={isActive}
            />
            <LayoutsSection username={run.user} isActive={isActive} />
        </div>
    );
}
