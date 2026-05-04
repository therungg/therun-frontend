'use client';

import clsx from 'clsx';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatTimeMs } from '../format';
import { useCommentatorData } from '../use-commentator-data';

const StatCard = ({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) => (
    <div className={styles.statCard}>
        <span className={styles.statCardLabel}>{label}</span>
        <span className={styles.statCardValue}>
            {value == null || value === '' ? '—' : value}
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

const formatDate = (iso: string | undefined): string | undefined => {
    if (!iso) return undefined;
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return iso;
    }
};

const finishRate = (run: RunShape): string | null => {
    if (!run.attemptCount || run.attemptCount <= 0) return null;
    return `${Math.round(((run.finishedCount ?? 0) / run.attemptCount) * 100)}%`;
};

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
    const pb = run.pb ?? liveRun.pb;
    const sob = run.sob ?? liveRun.sob;
    const fr = finishRate(run);

    const metaItems: { label: string; value: string }[] = [];
    if (advanced.pronouns)
        metaItems.push({ label: 'Pronouns', value: advanced.pronouns });
    if (advanced.country)
        metaItems.push({ label: 'Country', value: advanced.country });
    const firstRunFormatted = formatDate(advanced.firstRunDate);
    if (firstRunFormatted)
        metaItems.push({ label: 'On therun since', value: firstRunFormatted });

    return (
        <>
            <div className={styles.sectionTitle}>Runner</div>
            {metaItems.length > 0 ? (
                <div className={styles.metaRow}>
                    {metaItems.map((item, idx) => (
                        <span key={item.label}>
                            <span className={styles.metaRowItem}>
                                <span className={styles.metaRowItemLabel}>
                                    {item.label}
                                </span>
                                <span className={styles.metaRowItemValue}>
                                    {item.value}
                                </span>
                            </span>
                            {idx < metaItems.length - 1 && (
                                <span className={styles.metaRowDot}> · </span>
                            )}
                        </span>
                    ))}
                </div>
            ) : (
                <div className={styles.empty}>
                    No public profile metadata available.
                </div>
            )}

            <div className={styles.sectionTitle}>{liveRun.category}</div>
            <div className={styles.heroDuo}>
                <div className={styles.heroCard}>
                    <span className={styles.heroNumberLabel}>PB</span>
                    <span className={styles.heroNumber}>
                        {formatTimeMs(pb)}
                    </span>
                    {run.pbDate && (
                        <span className={styles.heroNumberLabel}>
                            set {formatDate(run.pbDate)}
                        </span>
                    )}
                </div>
                <div className={styles.heroCard}>
                    <span className={styles.heroNumberLabel}>
                        Sum of best (SOB)
                    </span>
                    <span className={styles.heroNumber}>
                        {formatTimeMs(sob)}
                    </span>
                </div>
            </div>

            <div className={styles.statCardRow}>
                <StatCard
                    label="Attempts"
                    value={
                        run.attemptCount != null
                            ? String(run.attemptCount)
                            : null
                    }
                />
                <StatCard
                    label="Finished"
                    value={
                        run.finishedCount != null
                            ? String(run.finishedCount)
                            : null
                    }
                />
                <StatCard label="Finish rate" value={fr} />
            </div>

            <div className={styles.sectionTitle}>Volume</div>
            <div className={clsx(styles.statCardRow, styles.statCardRow2)}>
                <StatCard
                    label="Total playtime"
                    value={
                        advanced.totalPlaytime != null
                            ? formatTimeMs(advanced.totalPlaytime)
                            : null
                    }
                />
                <StatCard
                    label="First run"
                    value={formatDate(advanced.firstRunDate)}
                />
            </div>

            {(advanced.runsToday != null || advanced.resetsToday != null) && (
                <>
                    <div className={styles.sectionTitle}>Today's session</div>
                    <div
                        className={clsx(
                            styles.statCardRow,
                            styles.statCardRow2,
                        )}
                    >
                        <StatCard
                            label="Runs"
                            value={
                                advanced.runsToday != null
                                    ? String(advanced.runsToday)
                                    : null
                            }
                        />
                        <StatCard
                            label="Resets"
                            value={
                                advanced.resetsToday != null
                                    ? String(advanced.resetsToday)
                                    : null
                            }
                        />
                    </div>
                </>
            )}
        </>
    );
};
