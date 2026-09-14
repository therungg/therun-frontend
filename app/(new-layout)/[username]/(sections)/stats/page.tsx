import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRunnerProfileHead, getRunnerStats } from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { formatCount, formatHours } from '../format';
import { ProfileBlock } from '../profile-block';
import styles from '../profile-ui.module.scss';
import { medalOf, plural } from '../ranks';
import { StatStrip, type StripTile } from '../stat-strip';
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
        title: `${head.runner.name} — Stats`,
        description: `${head.runner.name}'s games, personal bests and attempts on therun.gg.`,
    });
}

export default async function RunnerStatsPage({ params }: PageProps) {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const [head, stats] = await Promise.all([
        getRunnerProfileHead(name),
        getRunnerStats(name),
    ]);
    if (!head || head.runner.guest || !stats) notFound();
    if (stats.games.length === 0) {
        return <p className={styles.empty}>No splits uploaded yet.</p>;
    }
    const { totals } = stats;
    const games = [...stats.games].sort((a, b) => b.playtimeMs - a.playtimeMs);
    const finishRate =
        totals.attempts > 0
            ? Math.round((totals.finishedAttempts / totals.attempts) * 100)
            : null;
    const bestRank = games.reduce<number | null>(
        (best, g) =>
            g.bestRank !== null && (best === null || g.bestRank < best)
                ? g.bestRank
                : best,
        null,
    );

    const tiles: StripTile[] = [
        { value: formatCount(totals.attempts), label: 'attempts' },
        { value: formatCount(totals.finishedAttempts), label: 'finished runs' },
    ];
    if (finishRate !== null) {
        tiles.push({ value: `${finishRate}%`, label: 'of attempts finished' });
    }
    if (bestRank !== null) {
        tiles.push({
            value: `#${bestRank}`,
            label: 'best rank',
            medal: medalOf(bestRank),
        });
    }

    return (
        <div className={styles.page}>
            <StatStrip
                label="Totals"
                lead={{
                    value: formatHours(totals.playtimeMs),
                    label: 'Played',
                    what: `${plural(totals.games, 'game', 'games')} · ${plural(totals.categories, 'category', 'categories')}`,
                }}
                tiles={tiles}
            />
            {games.length > 1 ? (
                <ProfileBlock title="Where the hours went">
                    <PlaytimeBar games={games} total={totals.playtimeMs} />
                </ProfileBlock>
            ) : null}
            <ProfileBlock title="Games" note="Most played first">
                <GamesPanel games={games} username={head.runner.name} />
            </ProfileBlock>
        </div>
    );
}
