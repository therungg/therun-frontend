import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getUserRuns } from '~src/lib/get-user-runs';
import {
    getRunnerActivity,
    getRunnerProfileHead,
} from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { ProfileBlock } from '../profile-block';
import ui from '../profile-ui.module.scss';
import { plural } from '../ranks';
import { SectionColumns } from '../runner-sidebar';
import { StatStrip } from '../stat-strip';
import {
    activityLead,
    activityStrip,
    activityStripData,
} from '../strips/activity';
import { resolveStrip } from '../strips/resolve';
import { StripEditor } from '../strips/strip-editor';
import { DayOfWeek } from './rhythm';
import { toSessionRows } from './session-rows';
import { SessionsPanel } from './sessions-panel';
import { TimeOfDay } from './time-of-day';
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

    const data = activityStripData(activity);
    const { attempts, activeDays } = data;
    const lead = activityLead(activity.streaks);
    const strip = resolveStrip(activityStrip, data, head.strips?.activity);

    return (
        <SectionColumns name={head.runner.name}>
            <div className={ui.page}>
                <StatStrip
                    label="Activity"
                    lead={lead}
                    tiles={strip.tiles}
                    strip={strip}
                    editor={
                        <Suspense fallback={null}>
                            <StripEditor
                                name={head.runner.name}
                                strip={strip}
                            />
                        </Suspense>
                    }
                />
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
                                    timezone={head.runner.timezone}
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
        </SectionColumns>
    );
}
