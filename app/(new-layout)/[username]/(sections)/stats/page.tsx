import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRunnerProfileHead, getRunnerStats } from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { formatCount, formatHours } from '../format';
import styles from '../sections.module.scss';
import { GameStats } from './game-stats';

interface PageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { username } = await params;
    const name = safeDecodeURI(username);
    return buildMetadata({
        title: `${name} — Stats`,
        description: `${name}'s games, personal bests and attempts on therun.gg.`,
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
    return (
        <>
            <div className={styles.facts}>
                <div className={styles.fact}>
                    <b>{formatHours(totals.playtimeMs)}</b>
                    <span>Playtime</span>
                </div>
                <div className={styles.fact}>
                    <b>{formatCount(totals.attempts)}</b>
                    <span>Attempts</span>
                </div>
                <div className={styles.fact}>
                    <b>{formatCount(totals.finishedAttempts)}</b>
                    <span>Finished runs</span>
                </div>
                <div className={styles.fact}>
                    <b>{formatCount(totals.games)}</b>
                    <span>Games</span>
                </div>
            </div>
            {stats.games.map((g) => (
                <GameStats key={g.gameId} game={g} />
            ))}
        </>
    );
}
