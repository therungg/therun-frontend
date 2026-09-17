import Link from '~src/components/link';
import type { LeaderboardsProfile } from '../../../../types/leaderboards-profile.types';
import { ActivityGate } from './activity-gate';
import { ActivityHeatmap } from './activity-heatmap';
import { formatProfileDate, plural, profileGameHref } from './format';
import { GamesShelf } from './games-shelf';
import styles from './leaderboards-profile.module.scss';
import { LiveStrip } from './live-strip';
import { RecentPbs } from './recent-pbs';

const n = (v: number) => v.toLocaleString('en-US');

function AboutCard({
    runner,
    boardsVisible,
}: {
    runner: LeaderboardsProfile['runner'];
    boardsVisible: boolean;
}) {
    const hasAccount = runner.userId !== null;
    const hasFacts =
        runner.joinedAt ||
        runner.firstBoardRunAt ||
        runner.moderates.length > 0 ||
        runner.importLinked;
    if (!runner.bio && !hasFacts) return null;

    return (
        <section className={styles.card} aria-labelledby="profile-about">
            <h2 id="profile-about" className={styles.cardTitle}>
                About
            </h2>
            {hasAccount ? <LiveStrip username={runner.name} /> : null}
            {runner.bio ? <p className={styles.bio}>{runner.bio}</p> : null}
            {hasFacts ? (
                <ul className={styles.facts}>
                    {runner.joinedAt ? (
                        <li>Joined {formatProfileDate(runner.joinedAt)}</li>
                    ) : null}
                    {runner.firstBoardRunAt ? (
                        <li>
                            First board run{' '}
                            {formatProfileDate(runner.firstBoardRunAt)}
                        </li>
                    ) : null}
                    {runner.patron ? <li>Supporter</li> : null}
                    {runner.moderates.length > 0 ? (
                        <li>
                            Moderates{' '}
                            {runner.moderates.map((m, i) => (
                                <span key={m.gameId}>
                                    {i > 0 ? ', ' : ''}
                                    <Link
                                        href={profileGameHref(m, boardsVisible)}
                                    >
                                        {m.game}
                                    </Link>
                                </span>
                            ))}
                        </li>
                    ) : null}
                    {runner.importLinked ? (
                        <li>Imported runs are linked to this account.</li>
                    ) : null}
                </ul>
            ) : null}
        </section>
    );
}

function StandingCard({
    standing,
}: {
    standing: LeaderboardsProfile['standing'];
}) {
    const rows: [string, string][] = [
        [plural(standing.podiums, 'Podium', 'Podiums'), n(standing.podiums)],
        ['Top 10', n(standing.topTen)],
        ['Verified', n(standing.verified)],
    ];
    if (standing.pending > 0) rows.push(['Pending', n(standing.pending)]);
    if (standing.races) {
        rows.push([
            plural(standing.races.count, 'Race', 'Races'),
            n(standing.races.count),
        ]);
        rows.push(['Races finished', `${standing.races.finishPercentage}%`]);
    }

    return (
        <section className={styles.card} aria-labelledby="profile-standing">
            <h2 id="profile-standing" className={styles.cardTitle}>
                Standing
            </h2>
            <dl className={styles.statList}>
                {rows.map(([label, value]) => (
                    <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

/** The right-hand column: About, Standing, Games, Activity and Recent PBs. */
export function ProfileSidebar({
    profile,
    boardsVisible,
}: {
    profile: LeaderboardsProfile;
    /** Whether game names may link to their boards. */
    boardsVisible: boolean;
}) {
    return (
        <aside className={styles.sidebar} aria-label="Runner">
            <AboutCard runner={profile.runner} boardsVisible={boardsVisible} />
            <StandingCard standing={profile.standing} />
            <GamesShelf />
            {profile.activity.length > 0 ? (
                <ActivityGate>
                    <ActivityHeatmap activity={profile.activity} />
                </ActivityGate>
            ) : null}
            {profile.recentPbs.length > 0 ? (
                <RecentPbs pbs={profile.recentPbs} />
            ) : null}
        </aside>
    );
}
