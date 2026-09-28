import { Suspense } from 'react';
import type { LeaderboardsProfile } from '../../../../../types/leaderboards-profile.types';
import {
    gameRefOf,
    medalOf,
    profileBoardHref,
    profileGameHref,
} from '../../../leaderboards/[name]/format';
import { autoPins } from '../../../leaderboards/[name]/showcase-rules';
import { StatStrip } from '../stat-strip';
import { leaderboardsStrip } from '../strips/leaderboards';
import { resolveStrip } from '../strips/resolve';
import { StripEditor } from '../strips/strip-editor';

const count = (n: number) => n.toLocaleString('en-US');

/** The runner's standing at a glance: their best result, then the stats they chose. */
export function StandingStrip({
    profile,
    saved,
    boardsVisible,
    canCustomize,
}: {
    profile: LeaderboardsProfile;
    saved: string[] | null | undefined;
    /** Whether the best result may link to its board. */
    boardsVisible: boolean;
    /** Whether the page shows a Customize button, which opens the picker too. */
    canCustomize: boolean;
}) {
    // The lead is the showcase's own first verified pick: the run worth the
    // most placement points, not simply the lowest rank number. A pending run
    // is not a result yet.
    const top =
        autoPins(profile.games).find((p) => p.entry.status === 'verified') ??
        null;
    const best =
        top && top.entry.rank !== null
            ? {
                  rank: top.entry.rank,
                  game: top.game.game,
                  category: top.entry.category,
                  total: top.entry.totalRunners ?? 0,
                  medal: medalOf(top.entry),
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
                          medal: best.medal,
                          image: best.image,
                      }
                    : null
            }
            tiles={strip.tiles}
            strip={strip}
            editor={
                profile.runner.userId !== null ? (
                    <Suspense fallback={null}>
                        <StripEditor
                            name={profile.runner.name}
                            strip={strip}
                            hidePencil={canCustomize}
                        />
                    </Suspense>
                ) : null
            }
        />
    );
}
