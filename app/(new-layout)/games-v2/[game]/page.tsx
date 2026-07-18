import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getMyBoardClaim } from '~src/lib/board-claims';
import { listGameModerators } from '~src/lib/game-moderators';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { ClaimCtaState } from './claim/claim-cta';
import { loadGamePageData } from './data';
import { GamePage } from './game-page';
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

    const data = await loadGamePageData(game, sp, sessionUsername);
    if (!data) notFound();

    if (data.game.redirectedToGameId != null && data.game.redirectedToSlug) {
        permanentRedirect(`/games-v2/${data.game.redirectedToSlug}`);
    }

    const ability = defineAbilityFor(session);
    const canManage = ability.can(
        'edit',
        caslSubject('category-settings', { game: data.game.name }),
    );
    const canManageRuns = ability.can(
        'edit',
        caslSubject('leaderboard', { game: data.game.name }),
    );

    let claim: ClaimCtaState | null = null;
    if (sessionUsername && !canManage && !canManageRuns) {
        const [mods, myClaim] = await Promise.all([
            listGameModerators(data.game.id),
            getMyBoardClaim(session.id, data.game.id),
        ]);
        claim = {
            gameId: data.game.id,
            hasModerators: mods.length > 0,
            myClaimPending: myClaim?.status === 'pending',
        };
    }

    return (
        <GamePage
            data={data}
            canManage={canManage}
            canManageRuns={canManageRuns}
            claim={claim}
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
