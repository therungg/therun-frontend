import { Suspense } from 'react';
import type { LeaderboardsProfile } from '../../../../../types/leaderboards-profile.types';
import {
    gameRefOf,
    profileBoardHref,
    profileGameHref,
} from '../../../leaderboards/[name]/format';
import { autoPins } from '../../../leaderboards/[name]/showcase-rules';
import { StatStrip } from '../stat-strip';
import { leaderboardsStrip } from '../strips/leaderboards';
import { resolveStrip } from '../strips/resolve';
import { StripEditor } from '../strips/strip-editor';

const MEDALS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };
const count = (n: number) => n.toLocaleString('en-US');

/** The runner's standing at a glance: their best result, then the stats they chose. */
export function StandingStrip({
    profile,
    saved,
    boardsVisible,
}: {
    profile: LeaderboardsProfile;
    saved: string[] | null | undefined;
    /** Whether the best result may link to its board. */
    boardsVisible: boolean;
}) {
    // The lead is the showcase's own first pick: the run worth the most
    // placement points, not simply the lowest rank number.
    const top = autoPins(profile.games)[0] ?? null;
    const best =
        top && top.entry.rank !== null
            ? {
                  rank: top.entry.rank,
                  game: top.game.game,
                  category: top.entry.category,
                  total: top.entry.totalRunners ?? 0,
                  image: top.game.imageUrl,
                  href:
                      profileBoardHref(
                          gameRefOf(top.game),
                          top.entry,
                          boardsVisible,
                      ) ?? profileGameHref(top.game, boardsVisible),
              }
            : null;
    const strip = resolveStrip(leaderboardsStrip, profile, saved);

    return (
        <StatStrip
            label="Standing"
            lead={
                best
                    ? {
                          value: `#${best.rank}`,
                          label:
                              best.total > 1
                                  ? `Best result · of ${count(best.total)} runners`
                                  : 'Best result',
                          what: `${best.game} · ${best.category}`,
                          href: best.href,
                          medal: MEDALS[best.rank],
                          image: best.image,
                      }
                    : null
            }
            tiles={strip.tiles}
            strip={strip}
            editor={
                profile.runner.userId !== null ? (
                    <Suspense fallback={null}>
                        <StripEditor name={profile.runner.name} strip={strip} />
                    </Suspense>
                ) : null
            }
        />
    );
}
