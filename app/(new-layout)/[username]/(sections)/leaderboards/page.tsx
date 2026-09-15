import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { plural } from '../../../leaderboards/[name]/format';
import { OwnerControls } from '../../../leaderboards/[name]/owner-controls';
import { PinnedRuns } from '../../../leaderboards/[name]/pinned-runs';
import { ProfileTabs } from '../../../leaderboards/[name]/profile-tabs';
import { RejectedEntries } from '../../../leaderboards/[name]/rejected-entries';
import { ShowcaseProvider } from '../../../leaderboards/[name]/showcase-provider';
import { DEFAULT_LAYOUT } from '../../../leaderboards/[name]/showcase-rules';
import sectionStyles from '../sections.module.scss';
import styles from './leaderboards.module.scss';
import { SectionEditBar } from './section-edit-bar';
import { ShowcaseHeading } from './showcase-heading';
import { StandingStrip } from './standing-strip';

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
    const name = safeDecodeURI(username);
    const [profile, head] = await Promise.all([
        getLeaderboardsProfile(name),
        getRunnerProfileHead(name),
    ]);
    if (!profile) notFound();
    const games = profile.games.map((g) => ({ ...g, theme: null }));
    // An older backend sends no layout; saving from that would wipe the
    // runner's arrangement, so there is nothing to customize.
    const canCustomize =
        profile.layout !== undefined && profile.runner.userId !== null;
    const empty = profile.games.length === 0;

    return (
        <ShowcaseProvider
            games={games}
            layout={profile.layout ?? DEFAULT_LAYOUT}
        >
            <div className={styles.page}>
                {empty ? null : (
                    <StandingStrip
                        profile={profile}
                        saved={head?.strips?.leaderboards}
                    />
                )}
                {empty ? null : (
                    <section className={styles.block}>
                        <ShowcaseHeading>
                            {canCustomize ? (
                                <Suspense fallback={null}>
                                    <OwnerControls name={profile.runner.name} />
                                </Suspense>
                            ) : null}
                        </ShowcaseHeading>
                        <div className={sectionStyles.ledger}>
                            <PinnedRuns />
                        </div>
                    </section>
                )}
                <section className={styles.block}>
                    {empty ? null : (
                        <h2 className={styles.blockTitle}>All runs</h2>
                    )}
                    <div className={sectionStyles.ledger}>
                        <ProfileTabs country={profile.runner.country} />
                        <Suspense fallback={null}>
                            <RejectedEntries
                                name={profile.runner.name}
                                country={profile.runner.country}
                            />
                        </Suspense>
                    </div>
                </section>
                {canCustomize ? <SectionEditBar /> : null}
            </div>
        </ShowcaseProvider>
    );
}
