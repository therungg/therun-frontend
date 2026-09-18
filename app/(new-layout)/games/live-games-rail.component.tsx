import Image from 'next/image';
import { connection } from 'next/server';
import { type LiveRun } from '~app/(new-layout)/live/live.types';
import { getAllLiveRuns } from '~src/lib/live-runs';
import { safeEncodeURI } from '~src/utils/uri';

const RAIL_SIZE = 8;
// Same placeholder GameImage falls back to when a game has no art
// (src/components/image/gameimage.tsx) — this rail doesn't reuse that
// component (see liveTileImageSrc below) but mirrors its output exactly.
const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

interface LiveGameGroup {
    game: string;
    count: number;
    gameImage?: string;
}

function groupLiveRunsByGame(runs: LiveRun[]): LiveGameGroup[] {
    const byGame = new Map<string, LiveGameGroup>();

    for (const run of runs) {
        const existing = byGame.get(run.game);
        if (existing) {
            existing.count += 1;
            if (!existing.gameImage && run.gameImage) {
                existing.gameImage = run.gameImage;
            }
        } else {
            byGame.set(run.game, {
                game: run.game,
                count: 1,
                gameImage: run.gameImage,
            });
        }
    }

    return Array.from(byGame.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, RAIL_SIZE);
}

// Mirrors GameImage's own IGDB URL handling (src/components/image/gameimage.tsx)
// instead of rendering through that component: GameImage calls useMemo, so it
// only works inside a client boundary, and this rail has to stay a plain
// Server Component so it can call connection() itself (see the caching note
// where it's mounted, in page.tsx).
// cover_big (264x374), not cover_small: the tile draws at 96 CSS px, and
// cover_small is 90x128 — under the tile's own width before a retina screen
// doubles it. It matches the grid tiles below, which render through GameImage
// at quality="medium" (the same cover_big step).
function liveTileImageSrc(gameImage?: string): string {
    if (!gameImage || gameImage === 'noimage') return FALLBACK_IMAGE;
    const file = gameImage.slice(gameImage.lastIndexOf('/'));
    return `https://images.igdb.com/igdb/image/upload/t_cover_big${file}`;
}

export async function LiveGamesRail() {
    // Force this component to render per-request instead of being folded
    // into an ancestor's prerendered/cached shell. getAllLiveRuns() already
    // carries its own short profile (5s stale / 15s revalidate / 120s
    // expire) via 'use cache: remote' -- connection() is what lets that
    // profile actually apply here, rather than the value being resolved
    // once and frozen for as long as whatever cached the caller.
    await connection();

    const runs = await getAllLiveRuns();
    const groups = groupLiveRunsByGame(runs);

    if (groups.length === 0) return null;

    return (
        <div className="live-games-rail">
            <div className="games-grid-head">
                <h2>Live now</h2>
            </div>
            <div className="live-games-rail-track">
                {groups.map((group) => (
                    <a
                        key={group.game}
                        href={`/games/${safeEncodeURI(group.game)}`}
                        className="live-game-tile"
                    >
                        <div className="live-game-tile-art">
                            <Image
                                unoptimized
                                alt={group.game}
                                src={liveTileImageSrc(group.gameImage)}
                                width={96}
                                height={128}
                            />
                            <span
                                className="live-game-tile-dot"
                                aria-hidden="true"
                            />
                        </div>
                        <div className="live-game-tile-meta">
                            <div className="live-game-tile-name">
                                {group.game}
                            </div>
                            <div className="live-game-tile-count">
                                {group.count} live
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
