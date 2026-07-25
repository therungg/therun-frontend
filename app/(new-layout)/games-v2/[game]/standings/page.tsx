import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { getQuickStats, resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getGameStandings } from '~src/lib/standings';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import gamePageStyles from '../game-page.module.scss';
import { GameHero } from '../header/game-hero';
import { ViewTabs } from '../header/view-tabs';
import styles from './standings.module.scss';
import { StandingsView } from './standings-view';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
}

export default async function GameStandingsPage({ params }: PageProps) {
    const { game } = await params;
    if (!game) notFound();

    const session = await getSession();
    if (!session?.roles?.includes('admin')) notFound();

    const resolvedGame = await resolveGame(game);
    if (!resolvedGame) notFound();
    if (
        resolvedGame.redirectedToGameId != null &&
        resolvedGame.redirectedToSlug
    ) {
        permanentRedirect(
            `/games-v2/${resolvedGame.redirectedToSlug}/standings`,
        );
    }

    const { categories } = await resolveCategory(resolvedGame.id);
    const featured = categories.filter((c) => !c.archived && c.isMain);
    // Standings across a single category is just that category's board. Same
    // threshold decideGameRootView applies to the overview, so the tab band and
    // this route can't disagree about whether standings exist.
    if (featured.length < 2) redirect(`/games-v2/${resolvedGame.name}`);

    const ability = defineAbilityFor(session);
    const canManage = ability.can(
        'edit',
        caslSubject('category-settings', { game: resolvedGame.name }),
    );
    const canModerate = ability.can(
        'edit',
        caslSubject('leaderboard', { game: resolvedGame.name }),
    );

    const [standings, quickStats, gameMeta] = await Promise.all([
        getGameStandings(resolvedGame.id),
        getQuickStats(resolvedGame.id).catch(() => ({
            totalRunTime: 0,
            totalAttemptCount: 0,
            totalFinishedAttemptCount: 0,
            uniqueRunners: 0,
        })),
        getGameMetadata(resolvedGame.id).catch(() => EMPTY_GAME_METADATA),
    ]);

    return (
        <div>
            <GameHero
                game={resolvedGame}
                stats={quickStats}
                gameMeta={gameMeta}
                categorySlug={null}
                subcategoryKey=""
                canManage={canManage}
                canModerate={canModerate}
                claim={null}
            />
            <div className={gamePageStyles.colMain}>
                <ViewTabs gameSlug={resolvedGame.name} />
                {standings ? (
                    <StandingsView
                        gameSlug={resolvedGame.name}
                        data={standings}
                    />
                ) : (
                    <div className={styles.empty}>
                        <p className={styles.emptyTitle}>No standings yet.</p>
                        <p className={styles.emptyBody}>
                            Standings appear once this game&apos;s featured
                            categories have ranked runs.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { game } = await params;
    if (!game) return buildMetadata();
    const resolved = await resolveGame(game);
    const display = resolved?.display ?? safeDecodeURI(game);

    return buildMetadata({
        title: `${display} — Standings`,
        description: `The top runners across every ${display} category, ranked by how close they get to each category's world record.`,
        images: await getGameImage(display),
    });
}
