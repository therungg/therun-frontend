'use client';

import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatTimeMs } from '../format';
import { useCommentatorData } from '../use-commentator-data';

const Row = ({
    label,
    value,
}: {
    label: string;
    value: string | number | null | undefined;
}) => (
    <div className={styles.statRow}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>
            {value === null || value === undefined || value === ''
                ? '—'
                : String(value)}
        </span>
    </div>
);

interface AdvancedShape {
    pronouns?: string;
    country?: string;
    totalPlaytime?: number;
    firstRunDate?: string;
    runsToday?: number;
    resetsToday?: number;
    [k: string]: unknown;
}

interface RunShape {
    pb?: number;
    pbDate?: string;
    sob?: number;
    attemptCount?: number;
    finishedCount?: number;
    [k: string]: unknown;
}

export const CareerTab = ({ liveRun }: { liveRun: LiveRun }) => {
    const { data, isLoading, error } = useCommentatorData(
        liveRun.user,
        liveRun.game,
        liveRun.category,
    );

    if (isLoading) {
        return <div className={styles.empty}>Loading career data…</div>;
    }
    if (error) {
        return <div className={styles.empty}>Career data unavailable.</div>;
    }

    const advanced = (data.advanced ?? {}) as AdvancedShape;
    const run = (data.run ?? {}) as RunShape;

    return (
        <>
            <div className={styles.sectionTitle}>Profile</div>
            <Row label="User" value={liveRun.user} />
            <Row label="Pronouns" value={advanced.pronouns} />
            <Row label="Country" value={advanced.country} />
            <Row
                label="Total playtime"
                value={formatTimeMs(advanced.totalPlaytime)}
            />
            <Row label="First run" value={advanced.firstRunDate} />

            <div className={styles.sectionTitle}>This game/category</div>
            <Row label="PB" value={formatTimeMs(run.pb ?? liveRun.pb)} />
            <Row label="PB date" value={run.pbDate} />
            <Row label="SOB" value={formatTimeMs(run.sob ?? liveRun.sob)} />
            <Row
                label="Attempts"
                value={
                    run.attemptCount != null
                        ? `${run.finishedCount ?? 0} / ${run.attemptCount}`
                        : null
                }
            />

            <div className={styles.sectionTitle}>Today</div>
            <Row label="Runs today" value={advanced.runsToday} />
            <Row label="Resets today" value={advanced.resetsToday} />
        </>
    );
};
