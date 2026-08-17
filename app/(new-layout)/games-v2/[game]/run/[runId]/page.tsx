import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { getRunById, getUserRankingsByName } from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getRunProvenance } from '~src/lib/moderation/provenance';
import { getRunHistory } from '~src/lib/moderation/runs';
import { getRunByIdAsViewer } from '~src/lib/run-detail-viewer';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import buildMetadata from '~src/utils/metadata';
import { formatSubcategoryKey } from '../../labels';
import { ModProvenancePanel } from '../../run-view/mod-provenance-panel';
import { type RunBoardStanding, RunView } from '../../run-view/run-view';
import { isSameRunner } from '../../shared/is-same-runner';

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
    const { game, runId } = data;

    const session = await getSession();
    const isMod = canModerateGame(session, game.name);

    // The cached public payload redacts a hidden runner — placeholder name,
    // null userId — and every owner control on this page is gated on "is this
    // run mine", decided from exactly those two fields. So a runner who hid
    // their identity would find Restore / Appeal / Hide / Move AND the
    // un-hide toggle gone from their own run, with no way back (a rejected run
    // is on no board either).
    //
    // The backend exempts the run's owner from redaction when the read carries
    // their bearer token, so re-read it as this visitor. Deliberately a
    // separate, uncached call — `getRunById` is a shared `'use cache'` read and
    // must never carry a session (see run-detail-viewer.ts).
    //
    // Only when it can possibly change the answer: a redacted run is exactly a
    // non-guest row with no userId. Guest rows and normal rows skip the extra
    // request, so the common path costs nothing.
    let run = data.run;
    // The authed read is also the only source of owner-only fields
    // (descriptionRestriction), which the cached getRunById strips. Fetch as
    // this viewer when the run is redacted OR the visitor owns it and isn't a
    // mod (mods read restrictions on their own surfaces, not here).
    const needsViewerRead =
        (run.userId == null && !run.isGuest) ||
        (!isMod &&
            !run.isGuest &&
            isSameRunner(session.username, run.runnerName));
    if (session.id && needsViewerRead) {
        const asViewer = await getRunByIdAsViewer(runId, session.id).catch(
            () => null,
        );
        // Only swap in a payload that actually de-redacted something: a
        // non-owner gets the same masked body back, and `null` means the
        // authenticated read failed — neither should disturb what renders.
        if (asViewer && asViewer.userId != null) run = asViewer;
    }

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
                gameId: run.gameId,
                categoryId: run.categoryId,
                categoryDisplay: run.categoryDisplay,
                subcategoryKey: run.subcategoryKey,
                runnerName: run.runnerName,
                userId: run.userId,
                isGuest: run.isGuest,
                realTime: run.realTime,
                gameTime: run.gameTime,
                gameTimeLabel: run.gameTimeLabel ?? 'igt',
                runDate: run.runDate,
                vodUrl: run.vodUrl,
                description: run.description ?? null,
                descriptionRevoked: run.descriptionRestriction != null,
                verificationStatus: run.verificationStatus,
                variables: run.variables,
                origin: run.origin ?? null,
                verifiedBy: run.verifiedBy ?? null,
                rejectionReason: run.rejectionReason ?? null,
                boardStanding,
            }}
            history={history}
            sessionUsername={session.username || null}
            isMod={isMod}
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
