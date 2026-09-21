import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { canSeeBoards } from '~src/lib/board-access';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getManualTimeById } from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getManualTimeProvenance } from '~src/lib/moderation/provenance';
import { getManualTimeByIdAsViewer } from '~src/lib/run-detail-viewer';
import { resolveBoardPlayers } from '~src/lib/run-view/board-players';
import { viewerStanding } from '~src/lib/run-view/roster';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import buildMetadata from '~src/utils/metadata';
import { formatSubcategoryKey } from '../../labels';
import { ModProvenancePanel } from '../../run-view/mod-provenance-panel';
import { RunView } from '../../run-view/run-view';
import { isSameRunner } from '../../shared/is-same-runner';
import { PageTheme } from '../../theme/page-theme';

interface PageProps {
    params: Promise<{ game: string; manualTimeId: string }>;
}

async function load(gameSlug: string, manualTimeIdRaw: string) {
    if (!/^\d+$/.test(manualTimeIdRaw)) return null;
    const manualTimeId = Number.parseInt(manualTimeIdRaw, 10);
    if (!Number.isFinite(manualTimeId)) return null;
    const game = await resolveGame(gameSlug);
    if (!game) return null;
    const mt = await getManualTimeById(manualTimeId);
    if (!mt || mt.gameId !== game.id) return null;
    return { game, mt, manualTimeId };
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { game, manualTimeId } = await params;
    const data = await load(game, manualTimeId);
    if (!data) return buildMetadata();
    const time = formatTimeMs(data.mt.timeMs);
    const subcategoryLabel = formatSubcategoryKey(data.mt.subcategoryKey);
    const categoryScope = subcategoryLabel
        ? `${data.mt.categoryDisplay} · ${subcategoryLabel}`
        : data.mt.categoryDisplay;
    return buildMetadata({
        title: `${data.mt.runnerName} — ${time} — ${categoryScope} · ${data.mt.gameDisplay}`,
        description: `${data.mt.runnerName}'s ${data.mt.categoryDisplay} manual time of ${data.mt.gameDisplay} in ${time}, on therun.gg leaderboards.`,
    });
}

export default async function ManualTimeDetailPage({ params }: PageProps) {
    const { game: gameSlug, manualTimeId: manualTimeIdRaw } = await params;
    const data = await load(gameSlug, manualTimeIdRaw);
    if (!data) notFound();
    const { game, mt, manualTimeId } = data;

    const session = await getSession();
    const isMod = canModerateGame(session, game.name);

    // getManualTimeById is the cached public read and strips owner-only fields
    // (descriptionRestriction). Re-read as this viewer when the visitor owns
    // the time and isn't a mod, so the revoke note is accurate.
    let detail = mt;
    if (
        session.id &&
        !isMod &&
        !mt.isGuest &&
        isSameRunner(session.username, mt.runnerName)
    ) {
        const asViewer = await getManualTimeByIdAsViewer(
            manualTimeId,
            session.id,
        ).catch(() => null);
        if (asViewer) detail = asViewer;
    }

    // Exactly the run page's conditions, through the same helper: the probe
    // is for whoever could act on the roster — the filer, a credited member,
    // a moderator — or for anybody at all once the time is held for its
    // roster, where the notice is the point and has to be current.
    const viewer = viewerStanding(detail, session.username);
    const needsCategory =
        viewer.rosterHeld || isMod || viewer.isFiler || viewer.onRoster;

    const [provenance, gameMeta, timeCategory] = await Promise.all([
        isMod && session.id
            ? getManualTimeProvenance(session.id, game.id, manualTimeId).catch(
                  () => null,
              )
            : Promise.resolve(null),
        getGameMetadata(game.id).catch(() => null),
        // A manual time carries its category's id and display name but not
        // its slug, and the probe is addressed by slug. Only read the
        // category list when the probe would actually be made.
        needsCategory
            ? resolveCategory(game.id)
                  .then(
                      ({ categories }) =>
                          categories.find((c) => c.id === detail.categoryId) ??
                          null,
                  )
                  .catch(() => null)
            : Promise.resolve(null),
    ]);

    const boardPolicy = await resolveBoardPlayers({
        gameSlug: game.name,
        category: timeCategory,
        subcategoryKey: detail.subcategoryKey ?? null,
        detail,
        viewer: { isMod, ...viewer },
    });

    return (
        <>
            <PageTheme
                kind="game"
                label={game.display}
                theme={gameMeta?.theme ?? null}
            />
            <RunView
                model={{
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
                    // Who the time credits, and what its board credits —
                    // read off `detail`, not `mt`: the owner's re-read is
                    // the copy that is not redacted for them, and a masked
                    // time carries no roster at all (guide §11.5).
                    participants: detail.participants,
                    rosterIncomplete: detail.rosterIncomplete === true,
                    rosterTooMany: detail.rosterTooMany === true,
                    players: boardPolicy.players,
                    coopBoard: boardPolicy.coopBoard,
                }}
                history={[]}
                sessionUsername={session.username || null}
                isMod={isMod}
                modPanel={
                    isMod ? (
                        <ModProvenancePanel
                            provenance={provenance}
                            history={[]}
                            gameSlug={game.name}
                            runId={null}
                            manualTimeId={manualTimeId}
                        />
                    ) : undefined
                }
            />
        </>
    );
}
