'use client';

import { ReactNode } from 'react';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { Run } from '~src/common/types';
import {
    DurationToFormatted,
    IsoToFormatted,
} from '~src/components/util/datetime';
import styles from '../profile.module.scss';

interface QuickStatItemProps {
    label: string;
    value: ReactNode;
}

const QuickStatItem = ({ label, value }: QuickStatItemProps) => (
    <div className={styles.quickStatItem}>
        <div className={styles.quickStatValue}>{value}</div>
        <div className={styles.quickStatLabel}>{label}</div>
    </div>
);

export const QuickStatsPanel = ({ runs }: { runs: Run[] }) => {
    const totalPlayTime = runs
        .filter((run) => !!run.totalRunTime && run.totalRunTime !== 'NaN')
        .map((run) => parseInt(run.totalRunTime))
        .reduce((a, b) => a + b, 0)
        .toString();

    const totalAttempts = runs
        .map((run) => run.attemptCount)
        .reduce((a, b) => a + b, 0);

    const totalFinishedAttempts = runs
        .map((run) => parseInt(run.finishedAttemptCount))
        .reduce((a, b) => a + b, 0);

    const games = new Set(runs.map((run) => run.game)).size;

    const lastSessions = runs
        .filter((run) => run.sessions.length > 0)
        .map((run) => run.sessions[run.sessions.length - 1].endedAt)
        .sort();
    const lastSessionTime = lastSessions[lastSessions.length - 1];

    const completionPct =
        totalAttempts > 0
            ? ((totalFinishedAttempts / totalAttempts) * 100).toFixed(1)
            : '0.0';

    return (
        <Panel subtitle="Stats" title="Quick Stats">
            <div className={styles.statsGrid}>
                <QuickStatItem label="Games" value={games} />
                <QuickStatItem label="Categories" value={runs.length} />
                <QuickStatItem
                    label="Played"
                    value={<DurationToFormatted duration={totalPlayTime} />}
                />
                <QuickStatItem label="Attempts" value={totalAttempts} />
                <QuickStatItem
                    label="Completed"
                    value={totalFinishedAttempts}
                />
                <QuickStatItem label="Completion" value={`${completionPct}%`} />
                <QuickStatItem
                    label="Last Active"
                    value={<IsoToFormatted iso={lastSessionTime} />}
                />
            </div>
        </Panel>
    );
};
