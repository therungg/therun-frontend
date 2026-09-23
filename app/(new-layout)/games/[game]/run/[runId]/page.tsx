import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type React from 'react';
import { getSession } from '~src/actions/session.action';
import { buildManageRunHref } from '~src/lib/board-url';
import { resolveGame } from '~src/lib/games-v1';
import { getRunById } from '~src/lib/leaderboards-v1';
import { rendersAsRoster, rosterNames } from '~src/lib/run-view/roster';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import buildMetadata from '~src/utils/metadata';
import { formatSubcategoryKey } from '../../labels';
import { RunPageMount } from '../../manage/moderation/moderate/run-page-mount';
import { loadRunViewData } from '../../run-view/load-run-view';
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

    let modPanel: React.ReactNode;
    if (isMod && mod?.detail) {
        // The panel builds its own reads; keep the heavy fields off the client.
        const {
            splits: _splits,
            vodReview: _vodReview,
            autoVerifyResult: _autoVerifyResult,
            ...modRun
        } = mod.detail;
        modPanel = (
            <RunPageMount
                run={modRun}
                rank={model.boardContext?.rank ?? 0}
                provenance={mod.provenance}
                consoleHref={buildManageRunHref(game.name, runId)}
                context={mod.sheet}
                board={mod.board}
            />
        );
    }

    return (
        <>
            <RunView
                model={model}
                history={history}
                sessionUsername={session.username || null}
                isMod={isMod}
                modPanel={modPanel}
            />
        </>
    );
}
