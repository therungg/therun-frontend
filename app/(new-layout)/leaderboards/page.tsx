import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FaRankingStar } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
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
        <div className={styles.columns}>
            <div className={styles.list}>
                <Panel
                    panelId="boards"
                    title="Leaderboards"
                    subtitle="Most run games and their records"
                    mobileSubtitle="Most run games"
                    icon={FaRankingStar}
                    className="p-0 overflow-hidden"
                    link={{ url: '/games', text: 'All Games' }}
                >
                    <div className={styles.content}>
                        <p className={styles.lede}>
                            One game, one category, one clock. Built from the
                            splits runners upload while they play &mdash;{' '}
                            <Link href="#how">
                                here is how yours get on one
                            </Link>
                            .
                        </p>

                        <div className={styles.columnHeads}>
                            <span className={styles.rank} />
                            <span className={styles.artHead} />
                            <span className={styles.game}>Game</span>
                            <span className={styles.runners}>Runners</span>
                            <span className={styles.boards}>
                                Biggest boards &mdash; current record
                            </span>
                        </div>

                        {rows.length === 0 ? (
                            <p className={styles.empty}>
                                Boards could not be loaded right now.
                            </p>
                        ) : (
                            <div className={styles.rows}>
                                {rows.map((row, index) => (
                                    <BoardRow
                                        key={row.gameId}
                                        row={row}
                                        rank={index + 1}
                                    />
                                ))}
                            </div>
                        )}

                        <Link href="/games" className={styles.allGames}>
                            All games &rarr;
                        </Link>
                    </div>
                </Panel>
            </div>

            <aside className={styles.sidebar}>
                <GetOnABoard signedIn={Boolean(session?.id)} />
                <Suspense fallback={null}>
                    <JustNow />
                </Suspense>
            </aside>
        </div>
    );
}
