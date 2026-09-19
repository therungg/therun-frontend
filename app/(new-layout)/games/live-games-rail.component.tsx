import Image from 'next/image';
import { connection } from 'next/server';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { type LiveRun } from '~app/(new-layout)/live/live.types';
import { sortLiveRuns } from '~app/(new-layout)/live/utilities';
import { getAllLiveRuns } from '~src/lib/live-runs';
import { safeEncodeURI } from '~src/utils/uri';

// Same placeholder GameImage falls back to when a game has no art
// (src/components/image/gameimage.tsx) — this rail doesn't reuse that
// component (see liveTileImageSrc below) but mirrors its output exactly.
const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

interface LiveGameGroup {
    game: string;
    count: number;
    gameImage?: string;
}

// Groups runs by game, keeping each group's position at the game's
// highest-importance run. Sorting the flat run list by importance first
// (the same "Most Hype" order used on /live) means the first time we see a
// game is already its most-important appearance, so group order falls out
// of insertion order with no separate sort of the groups themselves.
function groupLiveRunsByGame(runs: LiveRun[]): LiveGameGroup[] {
    const byGame = new Map<string, LiveGameGroup>();

    for (const run of sortLiveRuns(runs, 'importance')) {
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

    return Array.from(byGame.values());
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
        <Panel
            title="Live now"
            className="games-panel-body"
            link={{ url: '/live', text: 'All live runs' }}
        >
            <div className="live-games-rail-track">
                {groups.map((group) => (
                    <a
                        key={group.game}
                        // Not a strict game filter — /live's search box also
                        // matches runner and category text (liveRunIsInSearch
                        // in app/(new-layout)/live/utilities.ts), so this seeds
                        // that same free-text search with the game name.
                        href={`/live?game=${safeEncodeURI(group.game)}`}
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
                            {group.count > 1 && (
                                <div className="live-game-tile-count">
                                    {group.count} live
                                </div>
                            )}
                        </div>
                    </a>
                ))}
            </div>
        </Panel>
    );
}
