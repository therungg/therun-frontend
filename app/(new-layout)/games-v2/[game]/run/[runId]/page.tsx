import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { getRunById, getUserRankingsByName } from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getRunProvenance } from '~src/lib/moderation/provenance';
import { getRunHistory } from '~src/lib/moderation/runs';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import buildMetadata from '~src/utils/metadata';
import { formatSubcategoryKey } from '../../labels';
import { ModProvenancePanel } from '../../run-view/mod-provenance-panel';
import { type RunBoardStanding, RunView } from '../../run-view/run-view';

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
    return buildMetadata({
        title: `${data.run.runnerName} — ${time} — ${categoryScope} · ${data.run.gameDisplay}`,
        description: `${data.run.runnerName}'s ${data.run.categoryDisplay} run of ${data.run.gameDisplay} in ${time}, on therun.gg leaderboards.`,
    });
}

export default async function RunDetailPage({ params }: PageProps) {
    const { game: gameSlug, runId: runIdRaw } = await params;
    const data = await load(gameSlug, runIdRaw);
    if (!data) notFound();
    const { game, run, runId } = data;

    const session = await getSession();
    const isMod = canModerateGame(session, game.name);

    const [history, provenance, rankings] = await Promise.all([
        getRunHistory(runId).catch(() => []),
        isMod && session.id
            ? getRunProvenance(session.id, game.id, runId).catch(() => null)
            : Promise.resolve(null),
        getUserRankingsByName(run.runnerName).catch(() => []),
    ]);

    // A hit means this run is the runner's *current* board entry for that
    // category/subcategory (getUserRankingsByName returns each category's
    // standing run, not every run ever submitted) — a miss just means this
    // particular run has been superseded or isn't on the live board, not an
    // error. See RunView's boardStanding handling.
    const match = rankings.find((r) => r.runId === runId) ?? null;
    const boardStanding: RunBoardStanding | null =
        match && match.rank != null
            ? {
                  categorySlug: match.categorySlug,
                  subcategoryKey: match.subcategoryKey,
                  rank: match.rank,
                  totalRunners: match.totalRunners,
              }
            : null;

    return (
        <RunView
            model={{
                kind: 'run',
                id: runId,
                game,
                categoryDisplay: run.categoryDisplay,
                subcategoryKey: run.subcategoryKey,
                runnerName: run.runnerName,
                userId: run.userId,
                isGuest: run.isGuest,
                realTime: run.realTime,
                gameTime: run.gameTime,
                runDate: run.runDate,
                vodUrl: run.vodUrl,
                verificationStatus: run.verificationStatus,
                variables: run.variables,
                origin: run.origin ?? null,
                verifiedBy: run.verifiedBy ?? null,
                rejectionReason: run.rejectionReason ?? null,
                boardStanding,
            }}
            history={history}
            sessionUsername={session.username || null}
            modPanel={
                isMod ? (
                    <ModProvenancePanel
                        provenance={provenance}
                        history={history}
                        gameSlug={game.name}
                        runId={runId}
                    />
                ) : undefined
            }
        />
    );
}
