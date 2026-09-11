import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import buildMetadata, { getUserProfilePhoto } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { ActivityHeatmap } from './activity-heatmap';
import { GameBlock } from './game-block';
import styles from './leaderboards-profile.module.scss';
import { LiveStrip } from './live-strip';
import { ProfileHeader } from './profile-header';
import { RecentPbs } from './recent-pbs';
import { RejectedEntries } from './rejected-entries';
import { StandingRow } from './standing-row';

interface PageProps {
    params: Promise<{ name: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { name } = await params;
    const decoded = safeDecodeURI(name);
    const profile = await getLeaderboardsProfile(decoded);
    if (!profile) return buildMetadata({ description: 'Leaderboards profile' });
    const { standing } = profile;
    return buildMetadata({
        title: `${profile.runner.name} — Leaderboards profile`,
        description: `${profile.runner.name} is on ${standing.boards} leaderboards with ${standing.first} first places.`,
        images: await getUserProfilePhoto(profile.runner.name),
    });
}

export default async function LeaderboardsProfilePage({ params }: PageProps) {
    const { name } = await params;
    const decoded = safeDecodeURI(name);
    const profile = await getLeaderboardsProfile(decoded);
    if (!profile) notFound();

    return (
        <div className={styles.page}>
            <ProfileHeader runner={profile.runner} />
            {profile.runner.userId !== null ? (
                <LiveStrip username={profile.runner.name} />
            ) : null}
            <StandingRow standing={profile.standing} />
            {profile.activity.length > 0 ? (
                <ActivityHeatmap activity={profile.activity} />
            ) : null}
            <section className={styles.section}>
                {profile.games.length > 0 ? (
                    <h2 className={styles.sectionTitle}>Games</h2>
                ) : (
                    <div className={styles.gameSummary}>
                        No leaderboard runs yet.
                    </div>
                )}
                {profile.games.map((game) => (
                    <GameBlock
                        key={game.gameId}
                        game={game}
                        country={profile.runner.country}
                    />
                ))}
                <Suspense fallback={null}>
                    <RejectedEntries
                        name={profile.runner.name}
                        games={profile.games}
                        country={profile.runner.country}
                    />
                </Suspense>
            </section>
            {profile.recentPbs.length > 0 ? (
                <RecentPbs pbs={profile.recentPbs} />
            ) : null}
        </div>
    );
}
