import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { getManualTimeById } from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getManualTimeProvenance } from '~src/lib/moderation/provenance';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import buildMetadata from '~src/utils/metadata';
import { formatSubcategoryKey } from '../../labels';
import { ModProvenancePanel } from '../../run-view/mod-provenance-panel';
import { RunView } from '../../run-view/run-view';

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

    const provenance =
        isMod && session.id
            ? await getManualTimeProvenance(
                  session.id,
                  game.id,
                  manualTimeId,
              ).catch(() => null)
            : null;

    return (
        <RunView
            model={{
                kind: 'manual',
                id: manualTimeId,
                game,
                categoryDisplay: mt.categoryDisplay,
                subcategoryKey: mt.subcategoryKey,
                runnerName: mt.runnerName,
                userId: mt.userId,
                isGuest: mt.isGuest,
                realTime: mt.timing === 'realtime' ? mt.timeMs : null,
                gameTime: mt.timing === 'gametime' ? mt.timeMs : null,
                runDate: null,
                vodUrl: mt.evidenceUrl,
                verificationStatus: mt.verificationStatus,
                variables: {},
                origin: mt.origin,
                verifiedBy: null,
                rejectionReason: null,
                boardStanding: null,
            }}
            history={[]}
            sessionUsername={session.username || null}
            modPanel={
                isMod ? (
                    <ModProvenancePanel
                        provenance={provenance}
                        history={[]}
                        gameSlug={game.name}
                        runId={null}
                    />
                ) : undefined
            }
        />
    );
}
