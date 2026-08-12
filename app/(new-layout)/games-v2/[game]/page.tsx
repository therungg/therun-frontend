import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getMyBoardClaim } from '~src/lib/board-claims';
import { listGameModerators } from '~src/lib/game-moderators';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getPublicModLog } from '~src/lib/moderation/public-mod-log';
import { selfAnonymizeState } from '~src/lib/moderation/self-service';
import {
    getAllActiveRacesByGame,
    getRaceGameStatsByGame,
} from '~src/lib/races';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { ClaimCtaState } from './claim/claim-cta';
import { loadGamePageData } from './data';
import { GamePage } from './game-page';
import { loadGameOverviewData } from './overview/data';
import { GameOverviewPage } from './overview/overview-page';
import { decideGameRootView } from './root-view';
import type { GamePageSearchParams } from './types';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<GamePageSearchParams>;
}

export default async function GameV2Page({ params, searchParams }: PageProps) {
    const { game } = await params;
    const sp = await searchParams;
    if (!game) notFound();

    const session = await getSession();
    if (!session?.roles?.includes('admin')) notFound();
    const sessionUsername =
        session?.username && session.username.length > 0
            ? session.username
            : null;

    const resolvedGame = await resolveGame(game);
    if (!resolvedGame) notFound();
    if (
        resolvedGame.redirectedToGameId != null &&
        resolvedGame.redirectedToSlug
    ) {
        permanentRedirect(
            `/games-v2/${encodeURIComponent(resolvedGame.redirectedToSlug)}`,
        );
    }

    const { categories, groups } = await resolveCategory(resolvedGame.id);
    const decision = decideGameRootView(categories, sp.category);
    if (decision.view === 'redirect') {
        redirect(`/games-v2/${encodeURIComponent(resolvedGame.name)}`);
    }

    const ability = defineAbilityFor(session);
    const canManage = ability.can(
        'edit',
        caslSubject('category-settings', { game: resolvedGame.name }),
    );
    const canManageRuns = ability.can(
        'edit',
        caslSubject('leaderboard', { game: resolvedGame.name }),
    );
    const canSiteBan = ability.can('moderate', 'admins');

    // Fetched unconditionally now: the sidebar's Moderators panel needs it
    // on every board view, not just the claim-CTA path.
    // Race data rides along: the race API keys on the DISPLAY name. Both
    // calls fail soft — a race-API blip must never take down a game page.
    // `selfHidden` rides along: "am I hidden on this game's boards?" is a
    // per-session read (bearer token), so it can't live in the cache-shared
    // `loadGamePageData`, but it must not cost a serial round trip on the
    // critical path either. Fails soft — a board still renders if
    // /v1/me/anonymize is down, it just can't offer the un-hide control (see
    // LeaderboardPager's `selfHidden`).
    const raceKey = encodeURIComponent(resolvedGame.display);
    const [moderators, raceStats, activeRaces, selfHidden] = await Promise.all([
        listGameModerators(resolvedGame.id),
        getRaceGameStatsByGame(raceKey).catch(() => null),
        getAllActiveRacesByGame(raceKey).catch(() => []),
        session?.id && decision.view === 'board'
            ? selfAnonymizeState(session.id, resolvedGame.id).catch(() => null)
            : Promise.resolve(null),
    ]);
    const showRaces = (raceStats?.stats?.totalRaces ?? 0) > 0;

    let claim: ClaimCtaState | null = null;
    if (sessionUsername && !canManage && !canManageRuns) {
        const myClaim = await getMyBoardClaim(
            session.id,
            resolvedGame.id,
        ).catch(() => null);
        claim = {
            gameId: resolvedGame.id,
            hasModerators: moderators.length > 0,
            myClaimPending: myClaim?.status === 'pending',
        };
    }

    if (decision.view === 'overview' || decision.view === 'empty') {
        const featured = decision.view === 'overview' ? decision.featured : [];
        const data = await loadGameOverviewData(
            resolvedGame,
            featured,
            groups,
            sessionUsername,
        );
        return (
            <GameOverviewPage
                data={data}
                canManage={canManage}
                canModerate={canManageRuns}
                claim={claim}
                moderators={moderators}
                showRaces={showRaces}
                activeRaces={activeRaces}
            />
        );
    }

    // decision.view === 'board': load exactly as before; pass the decided
    // category slug so the loader and the decision can't diverge.
    const data = await loadGamePageData(
        game,
        { ...sp, category: decision.category.name },
        sessionUsername,
    );
    if (!data) notFound();

    // The board's public "Moderation" tab (?view=moderation) — a sibling
    // view of the leaderboard itself, not a separate route. Only fetched
    // when actually viewing it, so a normal board load never pays for it.
    const boardView = sp.view === 'moderation' ? 'moderation' : 'board';
    const initialModLog =
        boardView === 'moderation'
            ? await getPublicModLog({ gameId: resolvedGame.id }).catch(
                  () => null,
              )
            : null;

    return (
        <GamePage
            data={data}
            canManage={canManage}
            canManageRuns={canManageRuns}
            canSiteBan={canSiteBan}
            claim={claim}
            moderators={moderators}
            activeRaces={activeRaces}
            view={boardView}
            initialModLog={initialModLog}
            selfHidden={selfHidden}
        />
    );
}

export async function generateMetadata({
    params,
    searchParams,
}: PageProps): Promise<Metadata> {
    const { game } = await params;
    if (!game) return buildMetadata();
    const sp = await searchParams;
    const resolved = await resolveGame(game);
    const display = resolved?.display ?? safeDecodeURI(game);

    let categoryDisplay: string | undefined;
    if (resolved && sp.category) {
        const { selected } = await resolveCategory(resolved.id, sp.category);
        categoryDisplay = selected?.display;
    }

    const title = categoryDisplay
        ? `${display} ${categoryDisplay} — Leaderboard`
        : `${display} — Leaderboards`;

    return buildMetadata({
        title,
        description: `View statistics for ${display}, including categories, top runners, total run time, and more!`,
        images: await getGameImage(display),
    });
}
