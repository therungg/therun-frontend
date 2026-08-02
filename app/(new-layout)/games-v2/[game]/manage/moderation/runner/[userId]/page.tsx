import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import {
    getCategoryRoster,
    getUserEligibleRuns,
    listExclusionRules,
    listModActions,
} from '~src/lib/moderation/mass-mgmt';
import buildMetadata from '~src/utils/metadata';
import type {
    GameExclusionRuleRow,
    ManualTimeRow,
    ModActionRow,
    UserEligibleRunRow,
} from '../../../../../../../../types/moderation.types';
import { loadConsoleChrome } from '../../../console/load-chrome';
import { SubrouteChrome } from '../../../console/subroute-chrome';
import { resolveRunnerBackTarget } from './runner-back-target';
import {
    buildBanState,
    buildCombos,
    buildSummary,
    filterRunnerActions,
} from './runner-model';
import { RunnerView } from './runner-view';

interface Props {
    params: Promise<{ game: string; userId: string }>;
    searchParams: Promise<{ from?: string; categoryId?: string }>;
}

// The audit feed is game-scoped (no runner filter server-side), so pull a
// generous window and slice it down to this runner in the model.
const ACTIONS_DAYS = 365;
const ACTIONS_LIMIT = 500;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { game: slug } = await params;
    const game = await resolveGame(slug);
    const display = game?.display ?? slug;
    return buildMetadata({
        title: `Runner — ${display}`,
        description: `Moderate a runner's ${display} runs.`,
    });
}

export default async function RunnerPage({ params, searchParams }: Props) {
    const { game: slug, userId: userIdRaw } = await params;
    const { from, categoryId } = await searchParams;
    const userId = Number.parseInt(userIdRaw, 10);
    if (!slug || !Number.isFinite(userId)) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    // Every feed degrades to empty rather than failing the page — a runner
    // with zero eligible runs can still be banned, have manual times, or
    // have history worth showing.
    const [rows, manualTimes, rules, actions, resolvedCats, chrome] =
        await Promise.all([
            getUserEligibleRuns(session.id, game.id, userId).catch(
                () => [] as UserEligibleRunRow[],
            ),
            listManualTimes(session.id, game.id, { userId }).catch(
                () => [] as ManualTimeRow[],
            ),
            listExclusionRules(session.id, game.id).catch(
                () => [] as GameExclusionRuleRow[],
            ),
            listModActions(session.id, game.id, {
                days: ACTIONS_DAYS,
                limit: ACTIONS_LIMIT,
            }).catch(() => [] as ModActionRow[]),
            resolveCategory(game.id),
            loadConsoleChrome(session, game),
        ]);

    const combos = buildCombos(rows, manualTimes, resolvedCats.categories);
    const banState = buildBanState(rules, userId);
    const summary = buildSummary(combos);
    const runnerActions = filterRunnerActions(
        actions,
        new Set(rows.map((r) => r.runId)),
        new Set(manualTimes.map((m) => m.id)),
        userId,
    );

    // No name-by-id resolver exists in src/lib; recover the display name
    // from whichever runner-scoped feed carries one, then fall back to a
    // roster lookup on the runner's top board, then to a stable cosmetic
    // label (every action keys on the numeric userId, not this string).
    let runnerName: string | null =
        manualTimes.find((m) => m.userId === userId)?.runnerName ??
        (banState.gameRule ?? banState.categoryRules[0])?.targetDisplayName ??
        null;
    if (!runnerName && combos.length > 0) {
        const top = combos[0];
        const roster = await getCategoryRoster(
            session.id,
            game.id,
            top.categoryId,
            {
                subcategoryKey: top.subcategoryKey,
                limit: 2000,
            },
        ).catch(() => []);
        runnerName =
            roster.find((r) => r.userId === userId)?.runnerName ?? null;
    }
    runnerName ??= `Runner #${userId}`;

    const backTarget = resolveRunnerBackTarget(
        game.name,
        from ?? null,
        categoryId ?? null,
        chrome.categories,
    );

    return (
        <SubrouteChrome
            game={game}
            flags={chrome.flags}
            attentionCount={chrome.attentionCount}
            badgeDegraded={chrome.degradedSources.length > 0}
            moderatedGamesCount={chrome.moderatedGamesCount}
        >
            <RunnerView
                gameSlug={game.name}
                gameDisplay={game.display}
                userId={userId}
                runnerName={runnerName}
                combos={combos}
                banState={banState}
                summary={summary}
                actions={runnerActions}
                backHref={backTarget.href}
                backLabel={backTarget.label}
            />
        </SubrouteChrome>
    );
}
