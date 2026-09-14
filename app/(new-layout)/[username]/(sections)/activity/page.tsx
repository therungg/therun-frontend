import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SessionOverview } from '~src/components/run/user-detail/session-overview';
import { getUserRuns } from '~src/lib/get-user-runs';
import {
    getRunnerActivity,
    getRunnerProfileHead,
} from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { ActivityHeatmap } from '../../../leaderboards/[name]/activity-heatmap';
import { prepareSessions } from '../../prepare-sessions.component';
import { formatCount, formatHourWindow } from '../format';
import styles from '../sections.module.scss';

interface PageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const head = await getRunnerProfileHead(name);
    if (!head || head.runner.guest) {
        return buildMetadata({ description: 'Runner profile' });
    }
    return buildMetadata({
        title: `${head.runner.name} — Activity`,
        description: `${head.runner.name}'s streaks, activity and sessions on therun.gg.`,
    });
}

const days = (n: number) => `${formatCount(n)} ${n === 1 ? 'day' : 'days'}`;

/** "London" from "Europe/London", "New York" from "America/New_York". */
const shortTimezone = (timezone: string) => {
    const last = timezone.split('/').pop() ?? timezone;
    return last.replace(/_/g, ' ');
};

export default async function RunnerActivityPage({ params }: PageProps) {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const [head, activity] = await Promise.all([
        getRunnerProfileHead(name),
        getRunnerActivity(name),
    ]);
    if (!head || head.runner.guest || !activity) notFound();
    const runs = (await getUserRuns(name)) ?? [];
    const sessions = prepareSessions(runs, false);
    const usualHoursLabel = head.runner.timezone
        ? `Usually runs (${shortTimezone(head.runner.timezone)})`
        : 'Usually runs';
    return (
        <>
            <div className={styles.facts}>
                <div className={styles.fact}>
                    <b>{days(activity.streaks.current)}</b>
                    <span>Current streak</span>
                </div>
                <div className={styles.fact}>
                    <b>{days(activity.streaks.longest)}</b>
                    <span>Longest streak</span>
                </div>
                <div className={styles.fact}>
                    <b>{formatCount(activity.hoursThisYear)} h</b>
                    <span>This year</span>
                </div>
                {activity.usualHours ? (
                    <div className={styles.fact}>
                        <b>
                            {formatHourWindow(
                                activity.usualHours.startHour,
                                activity.usualHours.endHour,
                            )}
                        </b>
                        <span>{usualHoursLabel}</span>
                    </div>
                ) : null}
            </div>
            {activity.days.length > 0 ? (
                <ActivityHeatmap
                    activity={activity.days.map((d) => ({
                        date: d.date,
                        attempts: d.attempts,
                    }))}
                />
            ) : (
                <p className={styles.empty}>No activity in the last year.</p>
            )}
            <section
                className={styles.panel}
                aria-labelledby="activity-sessions"
            >
                <h2 id="activity-sessions" className={styles.panelTitle}>
                    Sessions
                </h2>
                <SessionOverview sessions={sessions} />
            </section>
        </>
    );
}
