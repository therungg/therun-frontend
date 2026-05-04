'use client';

import clsx from 'clsx';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { RunSession } from '~src/common/types';
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
    total?: number;
    playtimePerDayMap?: Record<string, { total?: number }>;
    [k: string]: unknown;
}

interface ProfileShape {
    pronouns?: string;
    country?: string;
    aka?: string | string[];
    createdAt?: string;
    [k: string]: unknown;
}

interface RunShape {
    personalBest?: string;
    personalBestTime?: string | Date;
    sumOfBests?: string;
    attemptCount?: number;
    finishedAttemptCount?: string | number;
    totalRunTime?: string;
    sessions?: RunSession[];
}

const toMs = (raw: string | number | undefined | null): number | null => {
    if (raw == null) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number.parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
};

const toInt = (raw: string | number | undefined | null): number | null => {
    if (raw == null) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
};

const formatDate = (raw: string | Date | undefined): string | undefined => {
    if (!raw) return undefined;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const earliestDayKey = (
    map: Record<string, unknown> | undefined,
): string | undefined => {
    if (!map) return undefined;
    const keys = Object.keys(map);
    if (keys.length === 0) return undefined;
    keys.sort();
    return keys[0];
};

const isToday = (iso: string | undefined): boolean => {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
};

const todaySession = (
    sessions: RunSession[] | undefined,
): RunSession | null => {
    if (!sessions || sessions.length === 0) return null;
    for (let i = sessions.length - 1; i >= 0; i--) {
        if (isToday(sessions[i].startedAt)) return sessions[i];
    }
    return null;
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
    const profile = (data.profile ?? {}) as ProfileShape;
    const run = (data.run ?? {}) as RunShape;

    const pbMs = toMs(run.personalBest) ?? liveRun.pb ?? null;
    const sobMs = toMs(run.sumOfBests) ?? liveRun.sob ?? null;
    const totalRunTimeMs = toMs(run.totalRunTime);
    const attemptCount = run.attemptCount ?? null;
    const finishedCount = toInt(run.finishedAttemptCount);
    const finishRate =
        attemptCount && attemptCount > 0 && finishedCount != null
            ? `${Math.round((finishedCount / attemptCount) * 100)}%`
            : null;
    const allTimePlaytimeMs = advanced.total ?? null;
    const firstRunDay = earliestDayKey(advanced.playtimePerDayMap);
    const profileSince = formatDate(profile.createdAt);

    const session = todaySession(run.sessions);
    const todayRuns =
        session && session.runIds
            ? session.runIds.last - session.runIds.first + 1
            : null;
    const todayFinished = session?.finishedRuns?.length ?? null;
    const todayResets =
        todayRuns != null && todayFinished != null
            ? Math.max(0, todayRuns - todayFinished)
            : null;

    const metaItems: { label: string; value: string }[] = [];
    if (profile.pronouns)
        metaItems.push({ label: 'Pronouns', value: profile.pronouns });
    if (profile.country)
        metaItems.push({ label: 'Country', value: profile.country });
    const akaJoined = Array.isArray(profile.aka)
        ? profile.aka.filter(Boolean).join(', ')
        : typeof profile.aka === 'string'
          ? profile.aka
          : '';
    if (akaJoined) metaItems.push({ label: 'Also known as', value: akaJoined });
    if (profileSince)
        metaItems.push({ label: 'On therun since', value: profileSince });

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
                        {formatTimeMs(pbMs)}
                    </span>
                    {run.personalBestTime && (
                        <span className={styles.heroNumberLabel}>
                            set {formatDate(run.personalBestTime)}
                        </span>
                    )}
                </div>
                <div className={styles.heroCard}>
                    <span className={styles.heroNumberLabel}>
                        Sum of best (SOB)
                    </span>
                    <span className={styles.heroNumber}>
                        {formatTimeMs(sobMs)}
                    </span>
                </div>
            </div>

            <div className={styles.statCardRow}>
                <StatCard
                    label="Attempts"
                    value={attemptCount != null ? String(attemptCount) : null}
                />
                <StatCard
                    label="Finished"
                    value={finishedCount != null ? String(finishedCount) : null}
                />
                <StatCard label="Finish rate" value={finishRate} />
            </div>

            <div className={styles.sectionTitle}>Volume</div>
            <div className={clsx(styles.statCardRow, styles.statCardRow2)}>
                <StatCard
                    label={`Time on ${liveRun.category}`}
                    value={formatTimeMs(totalRunTimeMs)}
                />
                <StatCard
                    label="All-time playtime"
                    value={formatTimeMs(allTimePlaytimeMs)}
                />
            </div>
            {firstRunDay && (
                <div className={styles.statCardRow}>
                    <div
                        className={clsx(styles.statCard)}
                        style={{ gridColumn: '1 / -1' }}
                    >
                        <span className={styles.statCardLabel}>
                            First tracked run
                        </span>
                        <span className={styles.statCardValue}>
                            {formatDate(firstRunDay) ?? firstRunDay}
                        </span>
                    </div>
                </div>
            )}

            {session && (
                <>
                    <div className={styles.sectionTitle}>Today's session</div>
                    <div className={styles.statCardRow}>
                        <StatCard
                            label="Runs"
                            value={todayRuns != null ? String(todayRuns) : null}
                        />
                        <StatCard
                            label="Finished"
                            value={
                                todayFinished != null
                                    ? String(todayFinished)
                                    : null
                            }
                        />
                        <StatCard
                            label="Resets"
                            value={
                                todayResets != null ? String(todayResets) : null
                            }
                        />
                    </div>
                </>
            )}
        </>
    );
};
