'use client';

import { ReactNode } from 'react';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { UserStats as UserRaceStats } from '~app/(old-layout)/races/races.types';
import { DurationToFormatted } from '~src/components/util/datetime';
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

interface RaceStatsPanelProps {
    raceStats: UserRaceStats;
    username: string;
}

export const RaceStatsPanel = ({
    raceStats,
    username,
}: RaceStatsPanelProps) => {
    const finishPct =
        raceStats.totalRaces > 0
            ? (
                  (raceStats.totalFinishedRaces / raceStats.totalRaces) *
                  100
              ).toFixed(0)
            : '0';

    return (
        <Panel
            subtitle="Racing"
            title="Race Stats"
            link={{
                url: `/${username}/races`,
                text: 'View Race Details',
            }}
        >
            <div className={styles.statsGrid}>
                <QuickStatItem
                    label="Total Races"
                    value={raceStats.totalRaces}
                />
                <QuickStatItem
                    label="Finished"
                    value={raceStats.totalFinishedRaces}
                />
                <QuickStatItem label="Finish %" value={`${finishPct}%`} />
                <QuickStatItem
                    label="Race Time"
                    value={
                        <DurationToFormatted
                            duration={raceStats.totalRaceTime}
                        />
                    }
                />
            </div>
        </Panel>
    );
};
