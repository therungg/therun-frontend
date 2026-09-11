import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import { isEmbeddableVod } from '~src/lib/vod-url';
import buildMetadata, { getUserProfilePhoto } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type {
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
} from '../../../../types/leaderboards-profile.types';
import { GameThemeStyle } from '../../games-v2/[game]/theme/game-theme-style';
import { FeaturedRun } from './featured-run';
import { plural } from './hero-stats';
import styles from './leaderboards-profile.module.scss';
import { ProfileHeader } from './profile-header';
import { ProfileSidebar } from './profile-sidebar';
import { ProfileTabs } from './profile-tabs';
import { RejectedEntries } from './rejected-entries';

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

type Playable = LeaderboardsProfileEntry & { vodUrl: string };

/**
 * The run the page leads with: the best-ranked visible entry whose video can
 * be embedded (unranked last). On a tie a full-game run beats a level run,
 * then the most recent run wins.
 */
function featuredRun(
    games: LeaderboardsProfileGame[],
): { entry: Playable; game: LeaderboardsProfileGame } | null {
    let best: { entry: Playable; game: LeaderboardsProfileGame } | null = null;
    const rankOf = (e: LeaderboardsProfileEntry) =>
        e.rank ?? Number.POSITIVE_INFINITY;
    const levelOf = (e: LeaderboardsProfileEntry) => (e.level === null ? 0 : 1);
    const dateOf = (e: LeaderboardsProfileEntry) =>
        e.runDate ? Date.parse(e.runDate) || 0 : 0;
    const outranks = (
        a: LeaderboardsProfileEntry,
        b: LeaderboardsProfileEntry,
    ) => {
        if (rankOf(a) !== rankOf(b)) return rankOf(a) < rankOf(b);
        if (levelOf(a) !== levelOf(b)) return levelOf(a) < levelOf(b);
        return dateOf(a) > dateOf(b);
    };
    for (const game of games) {
        for (const entry of game.entries) {
            if (entry.archived || !entry.vodUrl) continue;
            if (!isEmbeddableVod(entry.vodUrl)) continue;
            const candidate = entry as Playable;
            if (!best || outranks(candidate, best.entry)) {
                best = { entry: candidate, game };
            }
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
    const featured = featuredRun(profile.games);

    return (
        <div className={styles.page}>
            <GameThemeStyle theme={theme} />
            <ProfileHeader
                runner={profile.runner}
                standing={profile.standing}
            />
            <div className={styles.columns}>
                <div className={styles.main}>
                    {featured ? (
                        <FeaturedRun
                            entry={featured.entry}
                            game={featured.game}
                        />
                    ) : null}
                    <ProfileTabs
                        games={profile.games.map((g) => ({
                            ...g,
                            theme: null,
                        }))}
                        country={profile.runner.country}
                    />
                    <Suspense fallback={null}>
                        <RejectedEntries
                            name={profile.runner.name}
                            games={profile.games}
                            country={profile.runner.country}
                        />
                    </Suspense>
                </div>
                <ProfileSidebar profile={profile} />
            </div>
        </div>
    );
}
