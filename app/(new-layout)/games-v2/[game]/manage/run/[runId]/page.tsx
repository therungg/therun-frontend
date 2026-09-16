import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import { getUserRankingsByName } from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getRunProvenance } from '~src/lib/moderation/provenance';
import { getRunHistory } from '~src/lib/moderation/runs';
import { defineAbilityFor } from '~src/rbac/ability';
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

    const { run } = data;
    const [provenance, history, rankings, categories] = await Promise.all([
        getRunProvenance(session.id, game.id, runId).catch(() => null),
        // Pass the session so a moderator gets the enriched history (actor
        // names + per-event ids), matching the board drawer's timeline.
        getRunHistory(runId, session.id).catch(() => []),
        getUserRankingsByName(run.runnerName).catch(() => []),
        resolveCategory(game.id)
            .then((r) => r.categories)
            .catch(() => []),
    ]);
    const variables = categories.length
        ? await listCategoryVariables(
              session.id,
              game.id,
              categories.map((c) => c.id),
          ).catch(() => [])
        : [];
    const runCategory = categories.find((c) => c.id === run.categoryId) ?? null;
    // A hit means this run is the runner's current entry on its board.
    const rank = rankings.find((r) => r.runId === runId)?.rank ?? 0;
    // The panel builds its own reads; keep the heavy fields off the client.
    const {
        splits: _splits,
        vodReview: _vodReview,
        autoVerifyResult: _autoVerifyResult,
        ...panelRun
    } = run;

    return (
        <SubrouteChrome
            game={game}
            flags={chrome.flags}
            attentionCount={chrome.attentionCount}
            badgeDegraded={chrome.degradedSources.length > 0}
            moderatedGamesCount={chrome.moderatedGamesCount}
        >
            <ManageRunPage
                game={game}
                run={panelRun}
                rank={rank}
                provenance={provenance}
                history={history}
                context={{
                    gameSlug: game.name,
                    gameId: game.id,
                    gameDisplay: game.display,
                    categories,
                    variables,
                    canSiteBan: defineAbilityFor(session).can(
                        'moderate',
                        'admins',
                    ),
                }}
                board={{
                    categoryId: run.categoryId,
                    categorySlug: runCategory?.name ?? '',
                    categoryDisplay: run.categoryDisplay,
                    subcategoryKey: run.subcategoryKey ?? '',
                    primaryTiming:
                        runCategory?.primaryTiming === 'gt' ? 'gt' : 'rt',
                }}
            />
        </SubrouteChrome>
    );
}
