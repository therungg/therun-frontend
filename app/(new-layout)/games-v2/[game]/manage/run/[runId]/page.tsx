import { subject as caslSubject } from '@casl/ability';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { getRunProvenance } from '~src/lib/moderation/provenance';
import { getRunHistory } from '~src/lib/moderation/runs';
import { defineAbilityFor } from '~src/rbac/ability';
import { loadConsoleChrome } from '../../console/load-chrome';
import { SubrouteChrome } from '../../console/subroute-chrome';
import { loadManageRunData } from './data';
import { ManageRunPage } from './manage-run-page';

interface Props {
    params: Promise<{ game: string; runId: string }>;
}

export default async function GameRunManagePage({ params }: Props) {
    const { game: slug, runId: runIdRaw } = await params;
    const runId = Number.parseInt(runIdRaw, 10);
    if (!slug || !Number.isFinite(runId)) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const data = await loadManageRunData(slug, runId);
    if (!data) notFound();

    const ability = defineAbilityFor(session);
    if (
        !ability.can(
            'edit',
            caslSubject('leaderboard', { game: data.game.name }),
        )
    ) {
        notFound();
    }

    // User-from-category exclusion (POST /admin/exclusions) is admin-only.
    const canExcludeUsers = (session.roles ?? []).includes('admin');

    const game = await resolveGame(slug);
    if (!game) notFound();
    const chrome = await loadConsoleChrome(session, game);

    const [provenance, history] = await Promise.all([
        getRunProvenance(session.id, game.id, runId).catch(() => null),
        getRunHistory(runId).catch(() => []),
    ]);

    return (
        <SubrouteChrome
            game={game}
            categories={chrome.categories}
            flags={chrome.flags}
            attentionCount={chrome.attentionCount}
        >
            <ManageRunPage
                data={data}
                canExcludeUsers={canExcludeUsers}
                provenance={provenance}
                history={history}
            />
        </SubrouteChrome>
    );
}
