import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getUserRuns } from '~src/lib/get-user-runs';
import {
    getRunnerActivity,
    getRunnerProfileHead,
} from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { formatCount } from '../format';
import { ProfileBlock } from '../profile-block';
import ui from '../profile-ui.module.scss';
import { plural } from '../ranks';
import { StatStrip, type StripLead, type StripTile } from '../stat-strip';
import { DayOfWeek, TimeOfDay } from './rhythm';
import { toSessionRows } from './session-rows';
import { SessionsPanel } from './sessions-panel';
import { YearHeatmap } from './year-heatmap';

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

/** "London" from "Europe/London", "New York" from "America/New_York". */
const shortTimezone = (timezone: string) =>
    (timezone.split('/').pop() ?? timezone).replace(/_/g, ' ');

export default async function RunnerActivityPage({ params }: PageProps) {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const [head, activity] = await Promise.all([
        getRunnerProfileHead(name),
        getRunnerActivity(name),
    ]);
    if (!head || head.runner.guest || !activity) notFound();
    const runs = (await getUserRuns(name)) ?? [];
    const sessions = toSessionRows(runs);

    const { streaks } = activity;
    const activeDays = activity.days.filter((d) => d.attempts > 0).length;
    const attempts = activity.days.reduce((s, d) => s + d.attempts, 0);

    const lead: StripLead | null =
        streaks.current > 0
            ? {
                  value: plural(streaks.current, 'day', 'days'),
                  label: 'Current streak',
                  what:
                      streaks.longest > streaks.current
                          ? `Longest ${plural(streaks.longest, 'day', 'days')}`
                          : 'Their longest yet',
              }
            : streaks.longest > 0
              ? {
                    value: plural(streaks.longest, 'day', 'days'),
                    label: 'Longest streak',
                    what: null,
                }
              : null;
    const tiles: StripTile[] = [];
    if (activity.hoursThisYear > 0) {
        tiles.push({
            value: `${formatCount(activity.hoursThisYear)} h`,
            label: 'played this year',
        });
    }
    if (attempts > 0) {
        tiles.push({
            value: formatCount(attempts),
            label: 'attempts in 12 months',
        });
    }
    if (activeDays > 0) {
        tiles.push({
            value: formatCount(activeDays),
            label: activeDays === 1 ? 'active day' : 'active days',
        });
    }

    const place = head.runner.timezone
        ? shortTimezone(head.runner.timezone)
        : null;

    return (
        <div className={ui.page}>
            <StatStrip label="Activity" lead={lead} tiles={tiles} />
            {activity.days.length > 0 ? (
                <>
                    <ProfileBlock
                        title="Last 12 months"
                        note={`${plural(attempts, 'attempt', 'attempts')} on ${plural(activeDays, 'day', 'days')}`}
                    >
                        <YearHeatmap days={activity.days} />
                    </ProfileBlock>
                    <div className={ui.columns}>
                        <ProfileBlock title="Time of day">
                            <TimeOfDay
                                usual={activity.usualHours}
                                place={place}
                            />
                        </ProfileBlock>
                        <ProfileBlock title="Day of the week">
                            <DayOfWeek days={activity.days} />
                        </ProfileBlock>
                    </div>
                </>
            ) : (
                <p className={ui.empty}>No activity in the last year.</p>
            )}
            {sessions.length > 0 ? (
                <ProfileBlock title="Recent sessions">
                    <SessionsPanel sessions={sessions} />
                </ProfileBlock>
            ) : null}
        </div>
    );
}
