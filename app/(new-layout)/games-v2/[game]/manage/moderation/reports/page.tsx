import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { listGameReports } from '~src/lib/moderation/reports';
import type { ModReportRow } from '../../../../../../../types/moderation.types';
import { ReportsView } from './reports-view';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function ReportsPage({ params }: Props) {
    const { game: slug } = await params;
    if (!slug) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    let reports: ModReportRow[];
    try {
        reports = await listGameReports(session.id, game.id);
    } catch (e) {
        if (e instanceof ModError) {
            // Empty / not-yet-registered route — render an empty table.
            reports = [];
        } else {
            throw e;
        }
    }

    return (
        <ReportsView
            gameSlug={game.name}
            gameDisplay={game.display}
            reports={reports}
        />
    );
}
