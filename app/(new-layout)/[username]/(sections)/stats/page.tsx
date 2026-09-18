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
import { StatStrip } from '../stat-strip';
import { resolveStrip } from '../strips/resolve';
import { statsStrip } from '../strips/stats';
import { StripEditor } from '../strips/strip-editor';
import { GamesPanel } from './games-panel';
import { PlaytimeBar } from './playtime-bar';

interface PageProps {
    params: Promise<{ username: string }>;
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

export default async function RunnerStatsPage({ params }: PageProps) {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const [head, stats, leaderboards] = await Promise.all([
        getRunnerProfileHead(name),
        getRunnerStats(name),
        getLeaderboardsProfile(name),
    ]);
    if (!head || head.runner.guest || !stats) notFound();
    if (stats.games.length === 0) {
        return <p className={styles.empty}>No splits uploaded yet.</p>;
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
                        <StripEditor name={head.runner.name} strip={strip} />
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
                <GamesPanel games={ordered} username={head.runner.name} />
            </ProfileBlock>
        </div>
    );
}
