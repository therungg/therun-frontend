import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import buildMetadata, { getUserProfilePhoto } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { GameThemeStyle } from '../../games-v2/[game]/theme/game-theme-style';
import { plural } from './hero-stats';
import styles from './leaderboards-profile.module.scss';
import { PinnedRuns } from './pinned-runs';
import { ProfileHeader } from './profile-header';
import { ProfileSidebar } from './profile-sidebar';
import { ProfileTabs } from './profile-tabs';
import { RejectedEntries } from './rejected-entries';
import { DEFAULT_LAYOUT, ShowcaseProvider } from './showcase-provider';
import { mainGameOf } from './showcase-rules';

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
        description: `${profile.runner.name} is on ${standing.boards} ${plural(standing.boards, 'leaderboard', 'leaderboards')} with ${standing.first} ${plural(standing.first, 'first place', 'first places')}.`,
        images: await getUserProfilePhoto(profile.runner.name),
    });
}

export default async function LeaderboardsProfilePage({ params }: PageProps) {
    const { name } = await params;
    const decoded = safeDecodeURI(name);
    const profile = await getLeaderboardsProfile(decoded);
    if (!profile) notFound();

    const layout = profile.layout ?? DEFAULT_LAYOUT;
    const theme = mainGameOf(profile.games, layout.mainGameId)?.theme ?? null;
    const games = profile.games.map((g) => ({ ...g, theme: null }));

    return (
        <ShowcaseProvider games={games} layout={layout}>
            <div className={styles.page}>
                <GameThemeStyle theme={theme} />
                <ProfileHeader
                    runner={profile.runner}
                    standing={profile.standing}
                    games={profile.games.length}
                />
                <div className={styles.columns}>
                    <div className={styles.main}>
                        <PinnedRuns />
                        <ProfileTabs country={profile.runner.country} />
                        <Suspense fallback={null}>
                            <RejectedEntries
                                name={profile.runner.name}
                                country={profile.runner.country}
                            />
                        </Suspense>
                    </div>
                    <ProfileSidebar profile={profile} />
                </div>
            </div>
        </ShowcaseProvider>
    );
}
