import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { plural } from '../../../leaderboards/[name]/format';
import { ProfileTabs } from '../../../leaderboards/[name]/profile-tabs';
import { RejectedEntries } from '../../../leaderboards/[name]/rejected-entries';
import { ShowcaseProvider } from '../../../leaderboards/[name]/showcase-provider';
import { DEFAULT_LAYOUT } from '../../../leaderboards/[name]/showcase-rules';
import styles from '../sections.module.scss';

interface PageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { username } = await params;
    const profile = await getLeaderboardsProfile(safeDecodeURI(username));
    if (!profile) return buildMetadata({ description: 'Leaderboards' });
    const { standing } = profile;
    return buildMetadata({
        title: `${profile.runner.name} — Leaderboards`,
        description: `${profile.runner.name} is on ${standing.boards} ${plural(standing.boards, 'leaderboard', 'leaderboards')} with ${standing.first} ${plural(standing.first, 'first place', 'first places')}.`,
    });
}

export default async function RunnerLeaderboardsPage({ params }: PageProps) {
    const { username } = await params;
    const profile = await getLeaderboardsProfile(safeDecodeURI(username));
    if (!profile) notFound();
    const { standing } = profile;
    const games = profile.games.map((g) => ({ ...g, theme: null }));
    return (
        <ShowcaseProvider
            games={games}
            layout={profile.layout ?? DEFAULT_LAYOUT}
        >
            <div className={styles.facts}>
                <div className={styles.fact}>
                    <b>{standing.boards.toLocaleString('en-US')}</b>
                    <span>{plural(standing.boards, 'Board', 'Boards')}</span>
                </div>
                <div className={styles.fact}>
                    <b>{standing.first.toLocaleString('en-US')}</b>
                    <span>
                        {plural(standing.first, 'First place', 'First places')}
                    </span>
                </div>
                <div className={styles.fact}>
                    <b>{standing.podiums.toLocaleString('en-US')}</b>
                    <span>{plural(standing.podiums, 'Podium', 'Podiums')}</span>
                </div>
                <div className={styles.fact}>
                    <b>{standing.topTen.toLocaleString('en-US')}</b>
                    <span>Top 10</span>
                </div>
            </div>
            <div className={styles.ledger}>
                <ProfileTabs country={profile.runner.country} />
                <Suspense fallback={null}>
                    <RejectedEntries
                        name={profile.runner.name}
                        country={profile.runner.country}
                    />
                </Suspense>
            </div>
        </ShowcaseProvider>
    );
}
