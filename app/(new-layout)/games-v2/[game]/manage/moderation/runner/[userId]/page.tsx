import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import { listAnonymizeRules } from '~src/lib/moderation/anonymize';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import {
    getCategoryRoster,
    getUserEligibleRuns,
    listExclusionRules,
} from '~src/lib/moderation/mass-mgmt';
import { getPublicModLog } from '~src/lib/moderation/public-mod-log';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata from '~src/utils/metadata';
import type {
    AnonymizeRuleWithNames,
    GameExclusionRuleRow,
    ManualTimeRow,
    PublicModLogEntry,
    UserEligibleRunRow,
} from '../../../../../../../../types/moderation.types';
import { loadConsoleChrome } from '../../../console/load-chrome';
import { SubrouteChrome } from '../../../console/subroute-chrome';
import { resolveRunnerBackTarget } from './runner-back-target';
import { buildBanState, buildCombos, buildSummary } from './runner-model';
import { RunnerView } from './runner-view';

interface Props {
    params: Promise<{ game: string; userId: string }>;
    searchParams: Promise<{ from?: string; categoryId?: string }>;
}

// The runner's slice of the public mod log — E reuses F's endpoint
// (targetUserId query param) instead of the old game-scoped
// listModActions()+filterRunnerActions() derivation.
const RUNNER_LOG_LIMIT = 25;

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

    const ability = defineAbilityFor(session);
    const canSiteBan = ability.can('moderate', 'admins');

    // Every feed degrades to empty rather than failing the page — a runner
    // with zero eligible runs can still be banned, have manual times, or
    // have history worth showing.
    const [
        rows,
        manualTimes,
        rules,
        anonymizeRules,
        modLog,
        resolvedCats,
        chrome,
    ] = await Promise.all([
        getUserEligibleRuns(session.id, game.id, userId).catch(
            () => [] as UserEligibleRunRow[],
        ),
        listManualTimes(session.id, game.id, { userId }).catch(
            () => [] as ManualTimeRow[],
        ),
        listExclusionRules(session.id, game.id).catch(
            () => [] as GameExclusionRuleRow[],
        ),
        // Anonymize rules for this runner — live and lifted, this game's
        // plus any site-wide one, so the Identity card can show current
        // state per scope AND the audit trail behind it.
        listAnonymizeRules(session.id, game.id, {
            targetUserId: userId,
            includeGlobal: true,
            includeLifted: true,
        }).catch(() => [] as AnonymizeRuleWithNames[]),
        // Reuses workstream F's public per-game mod log, filtered to
        // this runner via targetUserId — this runner's slice of the
        // same feed the board's public "Moderation" tab reads, not a
        // mod-only derivation.
        getPublicModLog({
            gameId: game.id,
            targetUserId: userId,
            limit: RUNNER_LOG_LIMIT,
        }).catch(
            () =>
                ({
                    items: [] as PublicModLogEntry[],
                    total: 0,
                    limit: RUNNER_LOG_LIMIT,
                    offset: 0,
                    hasMore: false,
                }) as const,
        ),
        resolveCategory(game.id),
        loadConsoleChrome(session, game),
    ]);

    const combos = buildCombos(rows, manualTimes, resolvedCats.categories);
    const banState = buildBanState(rules, userId);
    const summary = buildSummary(combos);
    const variables = await listCategoryVariables(
        session.id,
        game.id,
        resolvedCats.categories.map((c) => c.id),
    ).catch(() => []);

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
                categories={resolvedCats.categories}
                variables={variables}
                canSiteBan={canSiteBan}
                modLog={modLog.items}
                modLogTotal={modLog.total}
                anonymizeRules={anonymizeRules}
                backHref={backTarget.href}
                backLabel={backTarget.label}
            />
        </SubrouteChrome>
    );
}
