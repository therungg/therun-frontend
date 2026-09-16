import { getRunnerActivity } from '~src/lib/runner-profile';
import type { RunnerProfileHead } from '../../../../../types/runner-profile.types';
import activityStyles from '../../(sections)/activity/activity.module.scss';
import { YearHeatmap } from '../../(sections)/activity/year-heatmap';
import { StatStrip } from '../../(sections)/stat-strip';
import {
    activityLead,
    activityStrip,
    activityStripData,
} from '../../(sections)/strips/activity';
import { resolveStrip } from '../../(sections)/strips/resolve';
import { Chapter, ChapterError } from '../chapter';
import { UsualHours } from './usual-hours';

/** The Activity tab's strip, the runner's usual hours and the year of days. */
export async function ActivityChapter({ head }: { head: RunnerProfileHead }) {
    const name = head.runner.name;
    let activity: Awaited<ReturnType<typeof getRunnerActivity>>;
    try {
        activity = await getRunnerActivity(name);
    } catch {
        return <ChapterError id="activity" name={name} />;
    }
    if (!activity || activity.days.length === 0) return null;
    const { usualHours } = activity;
    const timezone = head.runner.timezone;
    const strip = resolveStrip(
        activityStrip,
        activityStripData(activity),
        head.strips?.activity,
    );

    return (
        <Chapter id="activity" name={name}>
            <StatStrip
                label="Activity"
                lead={activityLead(activity.streaks)}
                tiles={strip.tiles}
            />
            <YearHeatmap days={activity.days} />
            {usualHours && timezone ? (
                <p className={activityStyles.rhythmNote}>
                    Usually runs{' '}
                    <b>
                        <UsualHours
                            startHour={usualHours.startHour}
                            endHour={usualHours.endHour}
                            timezone={timezone}
                        />
                    </b>
                </p>
            ) : null}
        </Chapter>
    );
}
