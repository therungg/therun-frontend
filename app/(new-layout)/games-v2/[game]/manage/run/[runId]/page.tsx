import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getRunProvenance } from '~src/lib/moderation/provenance';
import { getRunHistory } from '~src/lib/moderation/runs';
import buildMetadata from '~src/utils/metadata';
import { loadConsoleChrome } from '../../console/load-chrome';
import { SubrouteChrome } from '../../console/subroute-chrome';
import { loadManageRunData } from './data';
import { ManageRunPage } from './manage-run-page';

interface Props {
    params: Promise<{ game: string; runId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { game: slug } = await params;
    const game = await resolveGame(slug);
    const display = game?.display ?? slug;
    return buildMetadata({
        title: `Run — ${display}`,
        description: `Moderate a ${display} run.`,
    });
}

export default async function GameRunManagePage({ params }: Props) {
    const { game: slug, runId: runIdRaw } = await params;
    const runId = Number.parseInt(runIdRaw, 10);
    if (!slug || !Number.isFinite(runId)) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const data = await loadManageRunData(slug, runId);
    if (!data) notFound();

    if (!canModerateGame(session, data.game.name)) {
        notFound();
    }

    const game = await resolveGame(slug);
    if (!game) notFound();
    const chrome = await loadConsoleChrome(session, game);

    const [provenance, history] = await Promise.all([
        getRunProvenance(session.id, game.id, runId).catch(() => null),
        // Pass the session so a moderator gets the enriched history (actor
        // names + per-event ids), matching the board drawer's timeline.
        getRunHistory(runId, session.id).catch(() => []),
    ]);

    return (
        <SubrouteChrome
            game={game}
            flags={chrome.flags}
            attentionCount={chrome.attentionCount}
            badgeDegraded={chrome.degradedSources.length > 0}
            moderatedGamesCount={chrome.moderatedGamesCount}
        >
            <ManageRunPage
                data={data}
                provenance={provenance}
                history={history}
            />
        </SubrouteChrome>
    );
}
