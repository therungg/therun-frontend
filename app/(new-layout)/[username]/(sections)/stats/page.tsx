import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import { getRunnerProfileHead, getRunnerStats } from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import {
    DEFAULT_LAYOUT,
    orderGames,
} from '../../../leaderboards/[name]/showcase-rules';
import { formatHours } from '../format';
import { inLeaderboardsOrder } from '../game-order';
import { ProfileBlock } from '../profile-block';
import styles from '../profile-ui.module.scss';
import { plural } from '../ranks';
import { SectionColumns } from '../runner-sidebar';
import { StatStrip } from '../stat-strip';
import { resolveStrip } from '../strips/resolve';
import { statsStrip } from '../strips/stats';
import { StripEditor } from '../strips/strip-editor';
import { GamesPanel } from './games-panel';
import { PlaytimeBar } from './playtime-bar';
import { type GameOption, RunsFilters, type Timing } from './runs-filters';

interface PageProps {
    params: Promise<{ username: string }>;
    searchParams: Promise<{ [_: string]: string | string[] | undefined }>;
}

/** `?timing=`, when it names a clock this tab knows. */
function timingOf(value: string | string[] | undefined): Timing | null {
    return value === 'rta' || value === 'igt' ? value : null;
}

function firstOf(value: string | string[] | undefined): string {
    return (Array.isArray(value) ? value[0] : value) ?? '';
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const head = await getRunnerProfileHead(name);
    if (!head || head.runner.guest) {
        return buildMetadata({ description: 'Runner profile' });
    }
    return buildMetadata({
        title: `${head.runner.name} — Runs`,
        description: `${head.runner.name}'s games, personal bests and attempts on therun.gg.`,
    });
}

export default async function RunnerStatsPage({
    params,
    searchParams,
}: PageProps) {
    const { username } = await params;
    const query = await searchParams;
    const name = safeDecodeURI(username);
    const [head, stats, leaderboards] = await Promise.all([
        getRunnerProfileHead(name),
        getRunnerStats(name),
        getLeaderboardsProfile(name),
    ]);
    if (!head || head.runner.guest || !stats) notFound();
    if (stats.games.length === 0) {
        return (
            <SectionColumns name={head.runner.name}>
                <p className={styles.empty}>No splits uploaded yet.</p>
            </SectionColumns>
        );
    }
    const { totals } = stats;
    const games = [...stats.games].sort((a, b) => b.playtimeMs - a.playtimeMs);
    const layout = leaderboards?.layout ?? DEFAULT_LAYOUT;
    const ordered = leaderboards
        ? inLeaderboardsOrder(
              games,
              orderGames(leaderboards.games, layout).map((g) => g.gameId),
          )
        : games;
    // The filters read straight off the URL: a filtered Runs tab is a link,
    // and the back button undoes a pick.
    const timing = timingOf(query.timing);
    const gameOptions: GameOption[] = ordered.map((g) => ({
        slug: g.gameSlug,
        label: g.game,
    }));
    const picked = gameOptions.some((o) => o.slug === firstOf(query.game))
        ? firstOf(query.game)
        : '';
    const shown = picked
        ? ordered.filter((g) => g.gameSlug === picked)
        : ordered;

    const bestRank = games.reduce<number | null>(
        (best, g) =>
            g.bestRank !== null && (best === null || g.bestRank < best)
                ? g.bestRank
                : best,
        null,
    );
    const strip = resolveStrip(
        statsStrip,
        { totals, bestRank },
        head.strips?.stats,
    );

    return (
        <SectionColumns name={head.runner.name}>
            <div className={styles.page}>
                <StatStrip
                    label="Totals"
                    lead={{
                        value: formatHours(totals.playtimeMs),
                        label: 'Played',
                        what: `${plural(totals.games, 'game', 'games')} · ${plural(totals.categories, 'category', 'categories')}`,
                    }}
                    tiles={strip.tiles}
                    strip={strip}
                    editor={
                        <Suspense fallback={null}>
                            <StripEditor
                                name={head.runner.name}
                                strip={strip}
                            />
                        </Suspense>
                    }
                />
                {games.length > 1 ? (
                    <ProfileBlock title="Playtime per game">
                        <PlaytimeBar games={games} total={totals.playtimeMs} />
                    </ProfileBlock>
                ) : null}
                <ProfileBlock
                    title="Games"
                    note={leaderboards ? undefined : 'Most played first'}
                >
                    {gameOptions.length > 1 || timing ? (
                        <RunsFilters
                            games={gameOptions}
                            game={picked}
                            timing={timing}
                        />
                    ) : null}
                    <GamesPanel
                        games={shown}
                        username={head.runner.name}
                        timing={timing}
                    />
                </ProfileBlock>
            </div>
        </SectionColumns>
    );
}
