import { notFound, redirect } from 'next/navigation';
import { buildRunHref } from '~src/lib/board-url';
import { resolveGame } from '~src/lib/games-v1';
import { getManualTimeById } from '~src/lib/leaderboards-v1';

interface PageProps {
    params: Promise<{ game: string; manualTimeId: string }>;
}

// Manual times are runs now. An old manual-time link lands on the run it
// became.
export default async function ManualTimeRedirectPage({ params }: PageProps) {
    const { game: gameSlug, manualTimeId: manualTimeIdRaw } = await params;
    if (!/^\d+$/.test(manualTimeIdRaw)) notFound();
    const manualTimeId = Number.parseInt(manualTimeIdRaw, 10);
    if (!Number.isSafeInteger(manualTimeId)) notFound();
    const game = await resolveGame(gameSlug);
    if (!game) notFound();

    const mapped = await getManualTimeById(manualTimeId);
    if (!mapped) notFound();
    redirect(buildRunHref(game.name, mapped.runId));
}
