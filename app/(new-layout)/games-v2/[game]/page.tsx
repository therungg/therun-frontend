import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
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

    const ability = defineAbilityFor(session);
    const canManage = ability.can(
        'edit',
        caslSubject('category-settings', { game: data.game.name }),
    );
    const canManageRuns = ability.can(
        'edit',
        caslSubject('leaderboard', { game: data.game.name }),
    );
    return (
        <GamePage
            data={data}
            canManage={canManage}
            canManageRuns={canManageRuns}
        />
    );
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { game } = await params;
    if (!game) return buildMetadata();
    const display = safeDecodeURI(game);
    return buildMetadata({
        title: `Statistics for ${display}`,
        description: `View statistics for ${display}, including categories, top runners, total run time, and more!`,
        images: await getGameImage(display),
    });
}
