import Image from 'next/image';
import { getSession } from '~src/actions/session.action';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import { safeEncodeURI } from '~src/utils/uri';
import type { LeaderboardsProfileGame } from '../../../types/leaderboards-profile.types';

const RAIL_SIZE = 8;
// Same placeholder GameImage falls back to when a game has no art
// (src/components/image/gameimage.tsx). This rail mirrors LiveGamesRail's
// manual IGDB URL handling instead of rendering through GameImage: GameImage
// calls useMemo, so it only works inside a client boundary, and this stays a
// plain Server Component so it can read the session directly.
const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

function tileImageSrc(imageUrl: string | null): string {
    if (!imageUrl || imageUrl === 'noimage') return FALLBACK_IMAGE;
    const file = imageUrl.slice(imageUrl.lastIndexOf('/'));
    return `https://images.igdb.com/igdb/image/upload/t_cover_small${file}`;
}

/** `gameName` is what board and run links resolve to; it's absent on older
 *  payloads and `gameSlug` is empty for most games, so a game with neither
 *  renders unlinked rather than guessing a URL. */
function tileHref(game: LeaderboardsProfileGame): string | null {
    if (!game.gameName) return null;
    return `/games/${safeEncodeURI(game.gameName)}`;
}

function topGames(games: LeaderboardsProfileGame[]): LeaderboardsProfileGame[] {
    return [...games]
        .sort((a, b) => {
            if (a.bestRank === null && b.bestRank === null) return 0;
            if (a.bestRank === null) return 1;
            if (b.bestRank === null) return -1;
            return a.bestRank - b.bestRank;
        })
        .slice(0, RAIL_SIZE);
}

// This component reads the signed-in session, so it must stay outside the
// grid's 'use cache' scope (a cached scope can't call cookies()/headers()).
// It's mounted as its own Suspense sibling in page.tsx, same as
// LiveGamesRail, so it never taints the hourly-cached grid below it.
// Unlike LiveGamesRail, this doesn't need its own connection() call:
// getSession() calls cookies() internally, and cookies() is itself a
// dynamic API that already forces this boundary to render per-request.
export async function YourGamesRail() {
    // getSession() never throws -- it catches SessionError and any other
    // failure internally and falls back to DEFAULT_SESSION -- so it doesn't
    // need the same protection as the profile fetch below.
    const session = await getSession();
    if (!session?.username) return null;

    let profile: Awaited<ReturnType<typeof getLeaderboardsProfile>>;
    try {
        profile = await getLeaderboardsProfile(session.username);
    } catch (e) {
        // getLeaderboardsProfile only swallows 404 itself; a 5xx, a
        // timeout, or a raw network failure would otherwise propagate and
        // take down the whole /games page (no scoped error.tsx here) even
        // though the grid below is cached and fine on its own. This rail
        // is optional, so drop it instead.
        console.error(
            `your games rail: profile fetch failed for ${session.username}:`,
            e,
        );
        return null;
    }
    if (!profile || profile.games.length === 0) return null;

    const games = topGames(profile.games);

    return (
        <div className="your-games-rail">
            <div className="games-grid-head">
                <h2>Your games</h2>
            </div>
            <div className="your-games-rail-track">
                {games.map((game) => {
                    const href = tileHref(game);
                    const content = (
                        <>
                            <div className="live-game-tile-art">
                                <Image
                                    unoptimized
                                    alt={game.game}
                                    src={tileImageSrc(game.imageUrl)}
                                    width={96}
                                    height={128}
                                />
                            </div>
                            <div className="live-game-tile-meta">
                                <div className="live-game-tile-name">
                                    {game.game}
                                </div>
                                <div className="live-game-tile-count">
                                    {game.bestRank !== null
                                        ? `#${game.bestRank} best rank`
                                        : 'Ranked run pending'}
                                </div>
                            </div>
                        </>
                    );

                    if (!href) {
                        return (
                            <div
                                key={game.gameId}
                                className="live-game-tile your-game-tile-unlinked"
                            >
                                {content}
                            </div>
                        );
                    }

                    return (
                        <a
                            key={game.gameId}
                            href={href}
                            className="live-game-tile"
                        >
                            {content}
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
