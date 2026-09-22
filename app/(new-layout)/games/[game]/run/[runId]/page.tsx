import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { canSeeBoards } from '~src/lib/board-access';
import { buildManageRunHref } from '~src/lib/board-url';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import { getRunById, getRunnerGameEntries } from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getRunProvenance } from '~src/lib/moderation/provenance';
import { getRunHistory } from '~src/lib/moderation/runs';
import { getRunByIdAsViewer } from '~src/lib/run-detail-viewer';
import { resolveBoardPlayers } from '~src/lib/run-view/board-players';
import {
    rendersAsRoster,
    rosterNames,
    viewerStanding,
} from '~src/lib/run-view/roster';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata from '~src/utils/metadata';
import { formatSubcategoryKey } from '../../labels';
import { RunPageMount } from '../../manage/moderation/moderate/run-page-mount';
import { RunView } from '../../run-view/run-view';
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
    const [history, provenance, boards, gameMeta, runnerEntries] =
        await Promise.all([
            getRunHistory(runId).catch(() => []),
            isMod && session.id
                ? getRunProvenance(session.id, game.id, runId).catch(() => null)
                : Promise.resolve(null),
            resolveCategory(game.id).catch(() => ({
                categories: [],
                groups: [],
            })),
            getGameMetadata(game.id).catch(() => null),
            // A hidden runner's placeholder name must not be looked up.
            run.userId == null && !run.isGuest
                ? Promise.resolve(null)
                : getRunnerGameEntries(game.id, runnerRef).catch(() => null),
        ]);
    const { categories, groups: boardGroups } = boards;
    const runCategory = categories.find((c) => c.id === run.categoryId) ?? null;
    const boardContext = run.boardContext ?? null;

    // What this run's board credits, read from the board rather than from
    // the per-run cache — the whole reasoning, and the conditions under
    // which it is worth a request at all, live in `resolveBoardPlayers`,
    // which the manual-time page calls with the same arguments so the two
    // pages cannot answer this differently.
    const viewer = viewerStanding(run, session.username);

    const [modVariables, boardPolicy] = await Promise.all([
        isMod && session.id && categories.length
            ? listCategoryVariables(
                  session.id,
                  game.id,
                  categories.map((c) => c.id),
              ).catch(() => [])
            : Promise.resolve([]),
        resolveBoardPlayers({
            gameSlug: game.name,
            category: runCategory,
            subcategoryKey: run.subcategoryKey ?? null,
            detail: run,
            viewer: { isMod, ...viewer },
        }),
    ]);
    const boardPlayers = boardPolicy.players;
    const boardCoopBoard = boardPolicy.coopBoard;
    // The panel builds its own reads; keep the heavy fields off the client.
    const {
        splits: _splits,
        vodReview: _vodReview,
        autoVerifyResult: _autoVerifyResult,
        ...modRun
    } = run;

    return (
        <>
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
                    picture: run.picture ?? null,
                    comparison: run.comparison ?? null,
                    // Absent means solo, and a solo run must look exactly as
                    // it did before co-op existed — so this stays null rather
                    // than becoming an empty array.
                    participants: run.participants ?? null,
                    // The one reason that is always about who is credited,
                    // and the one the person reading can fix. It rides the
                    // public payload, so the runner sees it too and not only
                    // a moderator. The provenance fallback keeps the notice
                    // working against a backend that predates the field.
                    rosterIncomplete:
                        run.rosterIncomplete ??
                        provenance?.moderation.ineligibleReason ===
                            'participants_incomplete',
                    // The other public ineligible reason (guide §5) — a
                    // roster that credits MORE runners than the board's
                    // maximum. Same fallback shape as rosterIncomplete above.
                    rosterTooMany:
                        run.rosterTooMany ??
                        provenance?.moderation.ineligibleReason ===
                            'participants_too_many',
                    // The board's resolved runner range, for naming the count
                    // rather than only saying the run doesn't fit. Read from
                    // the board itself, not the per-run cache — see the
                    // `boardPlayers` comment above.
                    players: boardPlayers,
                    playersScope: boardPolicy.scope,
                    // Read from the board itself, not the per-run cache —
                    // see the `boardCoopBoard` comment above.
                    coopBoard: boardCoopBoard,
                    runnerEntries:
                        runnerEntries?.status === 'found'
                            ? runnerEntries.entries
                            : [],
                    boardsVisible: canSeeBoards(session),
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
                            consoleHref={buildManageRunHref(game.name, runId)}
                            context={{
                                gameSlug: game.name,
                                gameId: game.id,
                                gameDisplay: game.display,
                                categories,
                                variables: modVariables,
                                gameRules: gameMeta?.gameRules ?? null,
                                emulatorPolicy:
                                    gameMeta?.emulatorPolicy ?? null,
                                groups: boardGroups,
                                canSiteBan: defineAbilityFor(session).can(
                                    'moderate',
                                    'admins',
                                ),
                                boardsVisible: canSeeBoards(session),
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
