import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { canSeeBoards } from '~src/lib/board-access';
import { buildManageRunHref } from '~src/lib/board-url';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import {
    getLeaderboard,
    getRunById,
    getRunnerGameEntries,
} from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getRunProvenance } from '~src/lib/moderation/provenance';
import { getRunHistory } from '~src/lib/moderation/runs';
import { getRunByIdAsViewer } from '~src/lib/run-detail-viewer';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';
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

    // `coopBoard`/`players` on the run-detail payload are cached per RUN
    // (`run:{id}`, `getRunById`), so after a moderator configures a board's
    // players policy every already-cached run page on it keeps reporting the
    // old answer until that entry's TTL expires — and a policy write has no
    // list of runs to drop. The board payload carries the same two facts
    // under the board's own cache tags (`lb:{gameSlug}:{categorySlug}`),
    // which a policy write DOES drop (`revalidateBoardsForRuleScope` on the
    // players-policy actions), so reading them from there is current the
    // moment a moderator changes the policy.
    //
    // Only worth a request when the answer can change what renders: for a
    // signed-out visitor, or a visitor with no stake in this run's roster,
    // the run-detail copies are good enough for a line of text, and every
    // run page paying for a third round trip (categories, then this) is not.
    // So this fires only for whoever could actually act on it — the filer, a
    // credited member, a moderator — or when the run is already held for its
    // roster, where the notice itself is the point and has to be current for
    // anyone reading it, signed in or not.
    const viewerIsFiler = isSameRunner(session.username, run.runnerName);
    const viewerOnRoster = (run.participants ?? []).some(
        (m) => m.userId != null && isSameRunner(session.username, m.name),
    );
    const rosterHeld =
        run.rosterIncomplete === true || run.rosterTooMany === true;
    const shouldProbeBoard =
        runCategory != null &&
        (rosterHeld || isMod || viewerIsFiler || viewerOnRoster);

    const [modVariables, boardPolicy] = await Promise.all([
        isMod && session.id && categories.length
            ? listCategoryVariables(
                  session.id,
                  game.id,
                  categories.map((c) => c.id),
              ).catch(() => [])
            : Promise.resolve([]),
        // A `pageSize: 1` probe of the run's own slice — the same cheap-probe
        // shape `loadYourStanding` uses for its rank-1 read elsewhere in this
        // app, but NOT the same cache entry the board page warms: that page
        // is keyed by the URL's (defaults-omitted) subcategory selection,
        // this one by the run's stored (defaults-materialized)
        // `subcategoryKey`, so this is its own cache entry, populated on
        // first use and then shared across every run on the same slice.
        // Timing matches the category's own default clock (the same rule
        // the mod board context below resolves it by) rather than a
        // hardcoded 'rt' — an IGT-only category has no 'rt' board to probe.
        shouldProbeBoard && runCategory
            ? getLeaderboard({
                  gameSlug: game.name,
                  categorySlug: runCategory.name,
                  timing: runCategory.primaryTiming === 'gt' ? 'gt' : 'rt',
                  subcategoryValues: Object.fromEntries(
                      parseSubcategoryKey(run.subcategoryKey ?? '').map((p) => [
                          p.name,
                          p.value,
                      ]),
                  ),
                  page: 1,
                  pageSize: 1,
              }).catch(() => null)
            : Promise.resolve(null),
    ]);
    // Prefer the board's own answer, and only when it actually describes
    // THIS run's own slice (`playersScope: 'slice'`) — a run whose
    // `subcategoryKey` is empty on a category that HAS subcategory
    // variables gets the combined view back (`'category'`), and its numbers
    // are the category-wide resolution, not this run's board's (guide §5).
    // Fall back to the run-detail copies whenever the board read is
    // unavailable (an error, an invalid-combination response, an older
    // backend that left the fields off, or a combined-view answer), or was
    // never made at all.
    const boardPolicyUsable =
        boardPolicy?.ok === true && boardPolicy.result.playersScope === 'slice';
    const boardPlayers = boardPolicyUsable
        ? (boardPolicy.result.players ?? run.players ?? null)
        : (run.players ?? null);
    const boardCoopBoard = boardPolicyUsable
        ? (boardPolicy.result.coopBoard ?? run.coopBoard === true)
        : run.coopBoard === true;
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
