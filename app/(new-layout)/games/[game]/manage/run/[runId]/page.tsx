import { notFound, redirect } from 'next/navigation';
import { buildRunHref } from '~src/lib/board-url';

interface Props {
    params: Promise<{ game: string; runId: string }>;
}

// The console's run page is gone: moderators review a run on its public
// page, which carries the moderation layer.
export default async function GameRunManagePage({ params }: Props) {
    const { game, runId: runIdRaw } = await params;
    if (!/^\d+$/.test(runIdRaw)) notFound();
    redirect(buildRunHref(game, Number.parseInt(runIdRaw, 10)));
}
