import { type ReactNode, Suspense } from 'react';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import { ActivityHeatmap } from '../../leaderboards/[name]/activity-heatmap';
import columnStyles from '../../leaderboards/[name]/leaderboards-profile.module.scss';
import { AboutCard } from '../../leaderboards/[name]/profile-sidebar';
import { RecentPbs } from '../../leaderboards/[name]/recent-pbs';

/**
 * Board links are drawn for everyone: `canSeeBoards` has returned true
 * unconditionally since the boards launched, so resolving it per request only
 * ever produced a constant — and cost the page a cookie read, which is what
 * would make it dynamic. Same constant the overview's chapters use.
 */
const BOARDS_VISIBLE = true;

/**
 * The runner column beside every profile section.
 *
 * Only the parts that describe the runner rather than their standing on the
 * boards: About, the activity heatmap and the recent PBs. Standing and the
 * games shelf stay on the Leaderboards tab, which is the page they answer
 * for. The heatmap is drawn without `ActivityGate` — that switch is the
 * showcase editor's, and the editor only exists on that tab.
 *
 * Both reads are cached and are the same ones the pages around it already
 * make, so mounting this costs no extra request.
 */
export async function RunnerSidebar({ name }: { name: string }) {
    const [head, profile] = await Promise.all([
        getRunnerProfileHead(name),
        getLeaderboardsProfile(name),
    ]);
    const runner = head?.runner ?? profile?.runner;
    if (!runner) return null;

    return (
        <aside className={columnStyles.sidebar} aria-label="Runner">
            <AboutCard runner={runner} boardsVisible={BOARDS_VISIBLE} />
            {profile && profile.activity.length > 0 ? (
                <ActivityHeatmap activity={profile.activity} />
            ) : null}
            {profile && profile.recentPbs.length > 0 ? (
                <RecentPbs pbs={profile.recentPbs} />
            ) : null}
        </aside>
    );
}

/**
 * A section page's two columns: the page itself, and the runner beside it.
 *
 * The same grid the Leaderboards tab uses, so the column widths line up as
 * the runner moves between tabs. The sidebar suspends on its own — a slow
 * profile read must not hold back the page it sits next to.
 */
export function SectionColumns({
    name,
    children,
}: {
    name: string;
    children: ReactNode;
}) {
    return (
        <div className={columnStyles.columns}>
            <div className={columnStyles.main}>{children}</div>
            <Suspense fallback={null}>
                <RunnerSidebar name={name} />
            </Suspense>
        </div>
    );
}
