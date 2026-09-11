import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import type { LeaderboardsProfile } from '../../../../types/leaderboards-profile.types';
import { ActivityHeatmap } from './activity-heatmap';
import { formatProfileDate } from './format';
import styles from './leaderboards-profile.module.scss';
import { LiveStrip } from './live-strip';
import { RecentPbs } from './recent-pbs';
import { plural } from './standing-row';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const n = (v: number) => v.toLocaleString('en-US');

function AboutCard({ runner }: { runner: LeaderboardsProfile['runner'] }) {
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
                        <li>
                            Joined {dateFmt.format(new Date(runner.joinedAt))}
                        </li>
                    ) : null}
                    {runner.firstBoardRunAt ? (
                        <li>
                            First board run{' '}
                            {dateFmt.format(new Date(runner.firstBoardRunAt))}
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
                                        href={`/games-v2/${encodeURIComponent(m.gameSlug)}`}
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

/** Every game, in the main column's order; a row jumps to that game's block. */
function GamesCard({ games }: { games: LeaderboardsProfile['games'] }) {
    return (
        <section className={styles.card} aria-labelledby="profile-games">
            <h2 id="profile-games" className={styles.cardTitle}>
                Games
            </h2>
            <div className={styles.gameList}>
                {games.map((game) => {
                    const line = [
                        game.bestRank !== null
                            ? `best #${game.bestRank}`
                            : null,
                        game.attempts !== null
                            ? `${n(game.attempts)} attempts`
                            : null,
                        game.playtimeMs !== null && game.playtimeMs > 0
                            ? `${n(Math.round(game.playtimeMs / 3_600_000))} h`
                            : null,
                        game.lastRanAt
                            ? `last ran ${formatProfileDate(game.lastRanAt)}`
                            : null,
                    ].filter(Boolean);
                    return (
                        <a
                            key={game.gameId}
                            href={`#game-${game.gameId}`}
                            className={styles.gameListRow}
                        >
                            <GameImage
                                src={game.imageUrl ?? ''}
                                alt=""
                                quality="small"
                                width={48}
                                height={64}
                            />
                            <span className={styles.gameListText}>
                                <span className={styles.gameListName}>
                                    {game.game}
                                </span>
                                {line.length > 0 ? (
                                    <span className={styles.gameListLine}>
                                        {line.join(' · ')}
                                    </span>
                                ) : null}
                            </span>
                        </a>
                    );
                })}
            </div>
        </section>
    );
}

/** The right-hand column: About, Standing, Games, Activity and Recent PBs. */
export function ProfileSidebar({ profile }: { profile: LeaderboardsProfile }) {
    return (
        <aside className={styles.sidebar} aria-label="Runner">
            <AboutCard runner={profile.runner} />
            <StandingCard standing={profile.standing} />
            {profile.games.length > 0 ? (
                <GamesCard games={profile.games} />
            ) : null}
            {profile.activity.length > 0 ? (
                <ActivityHeatmap activity={profile.activity} />
            ) : null}
            {profile.recentPbs.length > 0 ? (
                <RecentPbs pbs={profile.recentPbs} />
            ) : null}
        </aside>
    );
}
