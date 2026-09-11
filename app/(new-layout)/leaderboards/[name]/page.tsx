import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import buildMetadata, { getUserProfilePhoto } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { LeaderboardsProfileGame } from '../../../../types/leaderboards-profile.types';
import { GameThemeStyle } from '../../games-v2/[game]/theme/game-theme-style';
import styles from './leaderboards-profile.module.scss';
import { ProfileHeader } from './profile-header';
import { ProfileSidebar } from './profile-sidebar';
import { ProfileTabs } from './profile-tabs';
import { RecentPbs } from './recent-pbs';
import { RejectedEntries } from './rejected-entries';
import { plural } from './standing-row';

interface PageProps {
    params: Promise<{ name: string }>;
}

/**
 * The runner's main game, whose theme dresses the whole page: the best rank
 * wins, more attempts break a tie, and a runner with no rank gets no theme.
 */
function mainGame(
    games: LeaderboardsProfileGame[],
): LeaderboardsProfileGame | null {
    let best: LeaderboardsProfileGame | null = null;
    let bestRank = Number.POSITIVE_INFINITY;
    for (const g of games) {
        if (g.bestRank === null) continue;
        if (
            g.bestRank < bestRank ||
            (g.bestRank === bestRank &&
                (g.attempts ?? 0) > (best?.attempts ?? 0))
        ) {
            best = g;
            bestRank = g.bestRank;
        }
    }
    return best;
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
        description: `${profile.runner.name} is on ${standing.boards} ${plural(standing.boards, 'leaderboard', 'leaderboards')} with ${standing.first} ${plural(standing.first, 'first place', 'first places')}.`,
        images: await getUserProfilePhoto(profile.runner.name),
    });
}

export default async function LeaderboardsProfilePage({ params }: PageProps) {
    const { name } = await params;
    const decoded = safeDecodeURI(name);
    const profile = await getLeaderboardsProfile(decoded);
    if (!profile) notFound();

    const theme = mainGame(profile.games)?.theme ?? null;

    return (
        <div className={styles.page}>
            <GameThemeStyle theme={theme} />
            <ProfileHeader
                runner={profile.runner}
                standing={profile.standing}
            />
            <div className={styles.columns}>
                <div className={styles.main}>
                    <ProfileTabs
                        games={profile.games}
                        country={profile.runner.country}
                    />
                    <Suspense fallback={null}>
                        <RejectedEntries
                            name={profile.runner.name}
                            games={profile.games}
                            country={profile.runner.country}
                        />
                    </Suspense>
                    {profile.recentPbs.length > 0 ? (
                        <RecentPbs pbs={profile.recentPbs} />
                    ) : null}
                </div>
                <ProfileSidebar profile={profile} />
            </div>
        </div>
    );
}
