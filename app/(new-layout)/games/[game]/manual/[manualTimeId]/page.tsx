import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { getManualTimeById } from '~src/lib/leaderboards-v1';
import { rendersAsRoster, rosterNames } from '~src/lib/run-view/roster';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import buildMetadata from '~src/utils/metadata';
import { formatSubcategoryKey } from '../../labels';
import { loadRunViewData } from '../../run-view/load-run-view';
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
    // A co-op time is the team's, not the filer's: name everyone it credits,
    // through the same test the board row and the hero use.
    const subject = rendersAsRoster(data.mt.participants, data.mt)
        ? (rosterNames(data.mt.participants) ?? data.mt.runnerName)
        : data.mt.runnerName;
    return buildMetadata({
        title: `${subject} — ${time} — ${categoryScope} · ${data.mt.gameDisplay}`,
        description: `${subject}'s ${data.mt.categoryDisplay} manual time of ${data.mt.gameDisplay} in ${time}, on therun.gg leaderboards.`,
    });
}

export default async function ManualTimeDetailPage({ params }: PageProps) {
    const { game: gameSlug, manualTimeId: manualTimeIdRaw } = await params;
    if (!/^\d+$/.test(manualTimeIdRaw)) notFound();
    const manualTimeId = Number.parseInt(manualTimeIdRaw, 10);
    if (!Number.isFinite(manualTimeId)) notFound();
    const game = await resolveGame(gameSlug);
    if (!game) notFound();

    const session = await getSession();
    const data = await loadRunViewData({
        game,
        kind: 'manual',
        id: manualTimeId,
        session,
    });
    if (!data) notFound();
    const { model, history, isMod, mod } = data;

    return (
        <>
            <RunView
                model={model}
                history={history}
                sessionUsername={session.username || null}
                isMod={isMod}
                modPanel={
                    isMod ? (
                        <ModProvenancePanel
                            provenance={mod?.provenance ?? null}
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
