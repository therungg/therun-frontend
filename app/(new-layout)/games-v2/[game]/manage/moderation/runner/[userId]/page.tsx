import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getUserEligibleRuns } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import buildMetadata from '~src/utils/metadata';
import type { UserEligibleRunRow } from '../../../../../../../../types/moderation.types';
import { loadConsoleChrome } from '../../../console/load-chrome';
import { SubrouteChrome } from '../../../console/subroute-chrome';
import { RunnerView } from './runner-view';

interface Props {
    params: Promise<{ game: string; userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { game: slug } = await params;
    const game = await resolveGame(slug);
    const display = game?.display ?? slug;
    return buildMetadata({
        title: `Runner — ${display}`,
        description: `Moderate a runner's ${display} runs.`,
    });
}

export default async function RunnerPage({ params }: Props) {
    const { game: slug, userId: userIdRaw } = await params;
    const userId = Number.parseInt(userIdRaw, 10);
    if (!slug || !Number.isFinite(userId)) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    let rows: UserEligibleRunRow[];
    try {
        rows = await getUserEligibleRuns(session.id, game.id, userId);
    } catch (e) {
        if (e instanceof ModError) {
            // No eligible runs / unknown user — treat as empty rather than 404
            // so the page can still show the game-level exclusion control.
            rows = [];
        } else {
            throw e;
        }
    }

    const chrome = await loadConsoleChrome(session, game);

    // UserEligibleRunRow carries no runner name and no name-by-id resolver
    // exists in src/lib. Fall back to a stable cosmetic label; the ban still
    // works because the rule keys on the numeric userId, not this string.
    return (
        <SubrouteChrome
            game={game}
            categories={chrome.categories}
            flags={chrome.flags}
            attentionCount={chrome.attentionCount}
            badgeDegraded={chrome.degradedSources.length > 0}
        >
            <RunnerView
                gameSlug={game.name}
                gameDisplay={game.display}
                userId={userId}
                runnerName={`Runner #${userId}`}
                rows={rows}
            />
        </SubrouteChrome>
    );
}
