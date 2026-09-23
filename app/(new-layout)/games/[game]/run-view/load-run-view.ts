import 'server-only';

import { canSeeBoards } from '~src/lib/board-access';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveCategory } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import {
    getManualTimeById,
    getRunById,
    getRunnerGameEntries,
} from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import {
    getManualTimeProvenance,
    getRunProvenance,
} from '~src/lib/moderation/provenance';
import { getRunReview } from '~src/lib/moderation/run-review';
import { getRunHistory } from '~src/lib/moderation/runs';
import {
    getManualTimeByIdAsViewer,
    getRunByIdAsViewer,
} from '~src/lib/run-detail-viewer';
import { resolveBoardPlayers } from '~src/lib/run-view/board-players';
import { viewerStanding } from '~src/lib/run-view/roster';
import { defineAbilityFor } from '~src/rbac/ability';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import type {
    HistoryEvent,
    RunProvenance,
} from '../../../../../types/moderation.types';
import type { RunReview } from '../../../../../types/run-review.types';
import type { User } from '../../../../../types/session.types';
import type {
    SheetBoard,
    SheetContext,
} from '../manage/moderation/moderate/subject';
import { isSameRunner } from '../shared/is-same-runner';
import type { RunViewModel } from './run-view';

export type ModContext = {
    sheet: SheetContext;
    board: SheetBoard;
    /** The review payload; null for manual times, or when the read failed. */
    review: RunReview | null;
    /** Whether a moderator removed the run, where it came from, the note;
     * null when the read failed. */
    provenance: RunProvenance | null;
};

export type RunViewData = {
    model: RunViewModel;
    history: HistoryEvent[];
    isMod: boolean;
    mod: ModContext | null;
};

type LoadArgs = {
    game: ResolvedGame;
    kind: 'run' | 'manual';
    id: number;
    session: User | null;
};

/**
 * Everything the run page renders, for a run or a manual time: the view
 * model, the run's history, and — for a moderator of the game — what the
 * moderation layer needs. Null when the id does not exist or belongs to
 * another game. The run page, the manual-time page and the moderator modal
 * all read through here so they cannot drift apart.
 */
export async function loadRunViewData(
    args: LoadArgs,
): Promise<RunViewData | null> {
    return args.kind === 'run' ? loadRun(args) : loadManual(args);
}

/**
 * What the moderation layer needs for one run or manual time: the Moderate
 * sheet's game context and the board the entry sits on.
 */
function modContextOf({
    game,
    session,
    categories,
    variables,
    gameMeta,
    groups,
    entry,
    category,
    review,
    provenance,
}: {
    game: ResolvedGame;
    session: User | null;
    categories: ResolvedCategory[];
    variables: SheetContext['variables'];
    gameMeta: Awaited<ReturnType<typeof getGameMetadata>> | null;
    groups: ResolvedGroup[];
    entry: {
        categoryId: number;
        categoryDisplay: string;
        subcategoryKey?: string | null;
    };
    category: ResolvedCategory | null | undefined;
    review: RunReview | null;
    provenance: RunProvenance | null;
}): ModContext {
    return {
        sheet: {
            gameSlug: game.name,
            gameId: game.id,
            gameDisplay: game.display,
            categories,
            variables,
            gameRules: gameMeta?.gameRules ?? null,
            emulatorPolicy: gameMeta?.emulatorPolicy ?? null,
            groups,
            canSiteBan: defineAbilityFor(session ?? undefined).can(
                'moderate',
                'admins',
            ),
            boardsVisible: canSeeBoards(session),
        },
        board: {
            categoryId: entry.categoryId,
            categorySlug: category?.name ?? '',
            categoryDisplay: entry.categoryDisplay,
            subcategoryKey: entry.subcategoryKey ?? '',
            primaryTiming: category?.primaryTiming === 'gt' ? 'gt' : 'rt',
        },
        review,
        provenance,
    };
}

function modVariablesFor(
    isMod: boolean,
    sessionId: string | undefined,
    gameId: number,
    categories: ResolvedCategory[],
) {
    return isMod && sessionId && categories.length
        ? listCategoryVariables(
              sessionId,
              gameId,
              categories.map((c) => c.id),
          ).catch(() => [])
        : Promise.resolve([]);
}

async function loadRun({
    game,
    id: runId,
    session,
}: LoadArgs): Promise<RunViewData | null> {
    const fetched = await getRunById(runId);
    if (!fetched || fetched.gameId !== game.id) return null;

    const username = session?.username || null;
    const sessionId = session?.id || undefined;
    const isMod = canModerateGame(session ?? undefined, game.name);

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
    let run = fetched;
    // The authed read is also the only source of owner-only fields
    // (descriptionRestriction), which the cached getRunById strips. Fetch as
    // this viewer when the run is redacted OR the visitor owns it and isn't a
    // mod (mods read restrictions on their own surfaces, not here).
    const needsViewerRead =
        (run.userId == null && !run.isGuest) ||
        (!isMod && !run.isGuest && isSameRunner(username, run.runnerName));
    if (sessionId && needsViewerRead) {
        const asViewer = await getRunByIdAsViewer(runId, sessionId).catch(
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
    const [history, provenance, review, boards, gameMeta, runnerEntries] =
        await Promise.all([
            getRunHistory(runId).catch(() => []),
            isMod && sessionId
                ? getRunProvenance(sessionId, game.id, runId).catch(() => null)
                : Promise.resolve(null),
            isMod && sessionId
                ? getRunReview(sessionId, game.id, runId).catch(() => null)
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
    // which the manual-time branch calls with the same arguments so the two
    // pages cannot answer this differently.
    const viewer = viewerStanding(run, username);

    const [modVariables, boardPolicy] = await Promise.all([
        modVariablesFor(isMod, sessionId, game.id, categories),
        resolveBoardPlayers({
            gameSlug: game.name,
            category: runCategory,
            subcategoryKey: run.subcategoryKey ?? null,
            detail: run,
            viewer: { isMod, ...viewer },
        }),
    ]);

    const model: RunViewModel = {
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
        timerTime: run.timerTime ?? null,
        timerGameTime: run.timerGameTime ?? null,
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
        splitsHref: run.splitsHref ?? null,
        splits: run.splits ?? [],
        vodReview: run.vodReview ?? null,
        picture: run.picture ?? null,
        comparison: run.comparison ?? null,
        // Absent means solo, and a solo run must look exactly as it did
        // before co-op existed — so this stays null rather than becoming an
        // empty array.
        participants: run.participants ?? null,
        // The one reason that is always about who is credited, and the one
        // the person reading can fix. It rides the public payload, so the
        // runner sees it too and not only a moderator. The provenance
        // fallback keeps the notice working against a backend that predates
        // the field.
        rosterIncomplete:
            run.rosterIncomplete ??
            provenance?.moderation.ineligibleReason ===
                'participants_incomplete',
        // The other public ineligible reason (guide §5) — a roster that
        // credits MORE runners than the board's maximum. Same fallback shape
        // as rosterIncomplete above.
        rosterTooMany:
            run.rosterTooMany ??
            provenance?.moderation.ineligibleReason === 'participants_too_many',
        // The board's resolved runner range, for naming the count rather
        // than only saying the run doesn't fit. Read from the board itself,
        // not the per-run cache — see `resolveBoardPlayers`.
        players: boardPolicy.players,
        playersScope: boardPolicy.scope,
        coopBoard: boardPolicy.coopBoard,
        runnerEntries:
            runnerEntries?.status === 'found' ? runnerEntries.entries : [],
        boardsVisible: canSeeBoards(session),
    };

    const mod: ModContext | null = isMod
        ? modContextOf({
              game,
              session,
              categories,
              variables: modVariables,
              gameMeta,
              groups: boardGroups,
              entry: run,
              category: runCategory,
              review,
              provenance,
          })
        : null;

    return { model, history, isMod, mod };
}

async function loadManual({
    game,
    id: manualTimeId,
    session,
}: LoadArgs): Promise<RunViewData | null> {
    const mt = await getManualTimeById(manualTimeId);
    if (!mt || mt.gameId !== game.id) return null;

    const username = session?.username || null;
    const sessionId = session?.id || undefined;
    const isMod = canModerateGame(session ?? undefined, game.name);

    // getManualTimeById is the cached public read and strips owner-only fields
    // (descriptionRestriction). Re-read as this viewer when the visitor owns
    // the time and isn't a mod, so the revoke note is accurate.
    let detail = mt;
    if (
        sessionId &&
        !isMod &&
        !mt.isGuest &&
        isSameRunner(username, mt.runnerName)
    ) {
        const asViewer = await getManualTimeByIdAsViewer(
            manualTimeId,
            sessionId,
        ).catch(() => null);
        if (asViewer) detail = asViewer;
    }

    // Exactly the run branch's conditions, through the same helper: the
    // probe is for whoever could act on the roster — the filer, a credited
    // member, a moderator — or for anybody at all once the time is held for
    // its roster, where the notice is the point and has to be current.
    const viewer = viewerStanding(detail, username);
    const needsCategory =
        viewer.rosterHeld || isMod || viewer.isFiler || viewer.onRoster;

    const [provenance, boards, gameMeta] = await Promise.all([
        isMod && sessionId
            ? getManualTimeProvenance(sessionId, game.id, manualTimeId).catch(
                  () => null,
              )
            : Promise.resolve(null),
        // A manual time carries its category's id and display name but not
        // its slug, and the probe is addressed by slug. Only read the
        // category list when the probe would actually be made.
        needsCategory
            ? resolveCategory(game.id).catch(() => ({
                  categories: [],
                  groups: [],
              }))
            : Promise.resolve({ categories: [], groups: [] }),
        isMod ? getGameMetadata(game.id).catch(() => null) : null,
    ]);
    const { categories, groups: boardGroups } = boards;
    const timeCategory =
        categories.find((c) => c.id === detail.categoryId) ?? null;

    const [modVariables, boardPolicy] = await Promise.all([
        modVariablesFor(isMod, sessionId, game.id, categories),
        resolveBoardPlayers({
            gameSlug: game.name,
            category: timeCategory,
            subcategoryKey: detail.subcategoryKey ?? null,
            detail,
            viewer: { isMod, ...viewer },
        }),
    ]);

    const model: RunViewModel = {
        kind: 'manual',
        id: manualTimeId,
        game,
        gameId: mt.gameId,
        categoryId: mt.categoryId,
        categoryDisplay: mt.categoryDisplay,
        subcategoryKey: mt.subcategoryKey,
        runnerName: mt.runnerName,
        userId: mt.userId,
        isGuest: mt.isGuest,
        country: null,
        realTime: mt.timing === 'realtime' ? mt.timeMs : null,
        gameTime: mt.timing === 'gametime' ? mt.timeMs : null,
        gameTimeLabel: 'igt',
        runDate: mt.runDate ?? null,
        vodUrl: mt.evidenceUrl,
        description: detail.description ?? null,
        descriptionRevoked: detail.descriptionRestriction != null,
        verificationStatus: mt.verificationStatus,
        variables: {},
        origin: mt.origin,
        verifiedBy: null,
        rejectionReason: null,
        verifiedVia: null,
        autoVerifyResult: null,
        verifiedAt: null,
        categorySlug: null,
        boardContext: null,
        timerStats: null,
        splits: [],
        vodReview: null,
        picture: null,
        comparison: null,
        runnerEntries: [],
        boardsVisible: canSeeBoards(session),
        // Who the time credits, and what its board credits — read off
        // `detail`, not `mt`: the owner's re-read is the copy that is not
        // redacted for them, and a masked time carries no roster at all
        // (guide §11.5).
        participants: detail.participants,
        rosterIncomplete: detail.rosterIncomplete === true,
        rosterTooMany: detail.rosterTooMany === true,
        players: boardPolicy.players,
        playersScope: boardPolicy.scope,
        coopBoard: boardPolicy.coopBoard,
    };

    const mod: ModContext | null = isMod
        ? modContextOf({
              game,
              session,
              categories,
              variables: modVariables,
              gameMeta,
              groups: boardGroups,
              entry: mt,
              category: timeCategory,
              review: null,
              provenance,
          })
        : null;

    return { model, history: [], isMod, mod };
}
