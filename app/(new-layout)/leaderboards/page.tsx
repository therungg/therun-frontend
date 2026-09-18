import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import { getLeaderboardRows } from '~src/lib/leaderboards-page';
import buildMetadata from '~src/utils/metadata';
import { BoardRow } from './board-row';
import { GetOnABoard } from './get-on-a-board';
import { JustNow } from './just-now';
import styles from './leaderboards-page.module.scss';

export const metadata: Metadata = buildMetadata({
    title: 'Leaderboards',
    description:
        'Speedrun leaderboards built from the splits runners upload while they play. See the most run games and their current records.',
    canonical: '/leaderboards',
});

export default async function LeaderboardsPage() {
    const rows = await getLeaderboardRows();
    const session = await getSession();

    return (
        <div className={styles.page}>
            <header className={styles.masthead}>
                <h1 className={styles.title}>
                    Leaderboards
                    <sup className={styles.beta}>beta</sup>
                </h1>
                <p className={styles.lede}>
                    One game, one category, one clock. Built from the splits
                    runners upload while they play &mdash;{' '}
                    <Link href="#how">here is how yours get on one</Link>.
                </p>
            </header>

            <div className={styles.columns}>
                <main className={styles.list}>
                    <div className={styles.columnHeads}>
                        <span className={styles.rank} />
                        <span className={styles.artHead} />
                        <span className={styles.game}>Game</span>
                        <span className={styles.runners}>Runners</span>
                        <span className={styles.boards}>
                            Biggest boards &mdash; current record
                        </span>
                    </div>

                    {rows.map((row, index) => (
                        <BoardRow key={row.gameId} row={row} rank={index + 1} />
                    ))}

                    <Link href="/games" className={styles.allGames}>
                        All games &rarr;
                    </Link>
                </main>

                <aside className={styles.sidebar}>
                    <GetOnABoard signedIn={Boolean(session?.id)} />
                    <Suspense fallback={null}>
                        <JustNow />
                    </Suspense>
                </aside>
            </div>
        </div>
    );
}
