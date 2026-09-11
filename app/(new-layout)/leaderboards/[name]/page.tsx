import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import buildMetadata, { getUserProfilePhoto } from '~src/utils/metadata';
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
    const decoded = decodeURIComponent(name);
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
    const decoded = decodeURIComponent(name);
    const [profile, session] = await Promise.all([
        getLeaderboardsProfile(decoded),
        getSession(),
    ]);
    if (!profile) notFound();

    const viewerLoggedIn = Boolean(session.username);

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
                <h2 className={styles.sectionTitle}>Games</h2>
                {profile.games.map((game) => (
                    <GameBlock key={game.gameId} game={game} />
                ))}
                {viewerLoggedIn ? (
                    <Suspense fallback={null}>
                        <RejectedEntries
                            name={profile.runner.name}
                            sessionId={session.id}
                            games={profile.games}
                        />
                    </Suspense>
                ) : null}
            </section>
            {profile.recentPbs.length > 0 ? (
                <RecentPbs pbs={profile.recentPbs} />
            ) : null}
        </div>
    );
}
