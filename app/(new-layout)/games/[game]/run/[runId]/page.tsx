import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { getRunById } from '~src/lib/leaderboards-v1';
import { rendersAsRoster, rosterNames } from '~src/lib/run-view/roster';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import buildMetadata from '~src/utils/metadata';
import { formatSubcategoryKey } from '../../labels';
import { loadRunViewData } from '../../run-view/load-run-view';
import { ModRunView } from '../../run-view/mod/mod-run-view';
import { RunView } from '../../run-view/run-view';

interface PageProps {
    params: Promise<{ game: string; runId: string }>;
}

async function load(gameSlug: string, runIdRaw: string) {
    if (!/^\d+$/.test(runIdRaw)) return null;
    const runId = Number.parseInt(runIdRaw, 10);
    if (!Number.isFinite(runId)) return null;
    const game = await resolveGame(gameSlug);
    if (!game) return null;
    const run = await getRunById(runId);
    if (!run || run.gameId !== game.id) return null;
    return { game, run, runId };
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { game, runId } = await params;
    const data = await load(game, runId);
    if (!data) return buildMetadata();
    const time = formatTimeMs(data.run.time);
    const subcategoryLabel = formatSubcategoryKey(data.run.subcategoryKey);
    const categoryScope = subcategoryLabel
        ? `${data.run.categoryDisplay} · ${subcategoryLabel}`
        : data.run.categoryDisplay;
    // A co-op run is the team's, not the filer's: name everyone it credits,
    // through the same test the board row and the hero use.
    const subject = rendersAsRoster(data.run.participants, data.run)
        ? (rosterNames(data.run.participants) ?? data.run.runnerName)
        : data.run.runnerName;
    return buildMetadata({
        title: `${subject} — ${time} — ${categoryScope} · ${data.run.gameDisplay}`,
        description: `${subject}'s ${data.run.categoryDisplay} run of ${data.run.gameDisplay} in ${time}, on therun.gg leaderboards.`,
    });
}

export default async function RunDetailPage({ params }: PageProps) {
    const { game: gameSlug, runId: runIdRaw } = await params;
    if (!/^\d+$/.test(runIdRaw)) notFound();
    const runId = Number.parseInt(runIdRaw, 10);
    if (!Number.isFinite(runId)) notFound();
    const game = await resolveGame(gameSlug);
    if (!game) notFound();

    const session = await getSession();
    const data = await loadRunViewData({
        game,
        kind: 'run',
        id: runId,
        session,
    });
    if (!data) notFound();
    const { model, history, isMod, mod } = data;
    const sessionUsername = session.username || null;

    if (isMod && mod) {
        return (
            <ModRunView
                model={model}
                history={history}
                sessionUsername={sessionUsername}
                mod={mod}
            />
        );
    }

    return (
        <>
            <RunView
                model={model}
                history={history}
                sessionUsername={sessionUsername}
                isMod={isMod}
            />
        </>
    );
}
