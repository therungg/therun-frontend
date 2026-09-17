import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import { getRunById, getRunnerGameEntries } from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getRunProvenance } from '~src/lib/moderation/provenance';
import { getRunHistory } from '~src/lib/moderation/runs';
import { getRunByIdAsViewer } from '~src/lib/run-detail-viewer';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata from '~src/utils/metadata';
import { formatSubcategoryKey } from '../../labels';
import { RunPageMount } from '../../manage/moderation/moderate/run-page-mount';
import { RunView } from '../../run-view/run-view';
import { isSameRunner } from '../../shared/is-same-runner';
import { PageTheme } from '../../theme/page-theme';

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

    const runnerRef = run.isGuest
        ? { guestName: run.runnerName }
        : { username: run.runnerName };
    const [history, provenance, categories, gameMeta, runnerEntries] =
        await Promise.all([
            getRunHistory(runId).catch(() => []),
            isMod && session.id
                ? getRunProvenance(session.id, game.id, runId).catch(() => null)
                : Promise.resolve(null),
            resolveCategory(game.id)
                .then((r) => r.categories)
                .catch(() => []),
            getGameMetadata(game.id).catch(() => null),
            // A hidden runner's placeholder name must not be looked up.
            run.userId == null && !run.isGuest
                ? Promise.resolve(null)
                : getRunnerGameEntries(game.id, runnerRef).catch(() => null),
        ]);
    const modVariables =
        isMod && session.id && categories.length
            ? await listCategoryVariables(
                  session.id,
                  game.id,
                  categories.map((c) => c.id),
              ).catch(() => [])
            : [];
    const runCategory = categories.find((c) => c.id === run.categoryId) ?? null;
    const boardContext = run.boardContext ?? null;
    // The panel builds its own reads; keep the heavy fields off the client.
    const {
        splits: _splits,
        vodReview: _vodReview,
        autoVerifyResult: _autoVerifyResult,
        ...modRun
    } = run;

    return (
        <>
            <PageTheme
                kind="game"
                label={game.display}
                theme={gameMeta?.theme ?? null}
            />
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
                    country: run.country ?? null,
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
                    verifiedVia: run.verifiedVia ?? null,
                    autoVerifyResult: run.autoVerifyResult ?? null,
                    verifiedAt: run.verifiedAt ?? null,
                    categorySlug: runCategory?.name ?? null,
                    boardContext,
                    timerStats: run.timerStats ?? null,
                    splits: run.splits ?? [],
                    vodReview: run.vodReview ?? null,
                    runnerEntries:
                        runnerEntries?.status === 'found'
                            ? runnerEntries.entries
                            : [],
                }}
                history={history}
                sessionUsername={session.username || null}
                isMod={isMod}
                modPanel={
                    isMod ? (
                        <RunPageMount
                            run={modRun}
                            rank={boardContext?.rank ?? 0}
                            provenance={provenance}
                            context={{
                                gameSlug: game.name,
                                gameId: game.id,
                                gameDisplay: game.display,
                                categories,
                                variables: modVariables,
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
                                    runCategory?.primaryTiming === 'gt'
                                        ? 'gt'
                                        : 'rt',
                            }}
                        />
                    ) : undefined
                }
            />
        </>
    );
}
