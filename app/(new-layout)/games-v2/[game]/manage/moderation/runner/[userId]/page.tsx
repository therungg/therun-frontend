import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import {
    getCategoryRoster,
    getUserEligibleRuns,
    listExclusionRules,
} from '~src/lib/moderation/mass-mgmt';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata from '~src/utils/metadata';
import type {
    GameExclusionRuleRow,
    ManualTimeRow,
} from '../../../../../../../../types/moderation.types';
import { loadConsoleChrome } from '../../../console/load-chrome';
import { SubrouteChrome } from '../../../console/subroute-chrome';
import { RunnerPageMount } from '../../moderate/runner-page-mount';
import { resolveRunnerBackTarget } from './runner-back-target';
import { buildBanState, buildCombos } from './runner-model';
import { SrcIdentityCard } from './src-identity-card';

interface Props {
    params: Promise<{ game: string; userId: string }>;
    searchParams: Promise<{ from?: string; categoryId?: string }>;
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

    const canSiteBan = defineAbilityFor(session).can('moderate', 'admins');

    // The panel reads the runner's boards, bans and log itself. The page only
    // needs the name, the game's categories and variables, and the chrome.
    const [manualTimes, rules, resolvedCats, chrome] = await Promise.all([
        listManualTimes(session.id, game.id, { userId }).catch(
            () => [] as ManualTimeRow[],
        ),
        listExclusionRules(session.id, game.id).catch(
            () => [] as GameExclusionRuleRow[],
        ),
        resolveCategory(game.id),
        loadConsoleChrome(session, game),
    ]);
    const categories = resolvedCats.categories;
    const variables = await listCategoryVariables(
        session.id,
        game.id,
        categories.map((c) => c.id),
    ).catch(() => []);

    // No name-by-id resolver exists in src/lib; recover the display name
    // from whichever runner-scoped feed carries one, then fall back to a
    // roster lookup on the runner's top board, then to a stable cosmetic
    // label (every action keys on the numeric userId, not this string).
    const banState = buildBanState(rules, userId);
    let runnerName: string | null =
        manualTimes.find((m) => m.userId === userId)?.runnerName ??
        (banState.gameRule ?? banState.categoryRules[0])?.targetDisplayName ??
        null;
    if (!runnerName) {
        const rows = await getUserEligibleRuns(
            session.id,
            game.id,
            userId,
        ).catch(() => []);
        const top = buildCombos(rows, manualTimes, categories)[0];
        if (top) {
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
    }
    runnerName ??= `Runner #${userId}`;

    const backTarget = resolveRunnerBackTarget(
        game.name,
        from ?? null,
        categoryId ?? null,
        chrome.categories,
    );
    const categoryIdNum =
        categoryId && /^\d+$/.test(categoryId)
            ? Number.parseInt(categoryId, 10)
            : null;
    const panelCategoryId =
        categoryIdNum != null && categories.some((c) => c.id === categoryIdNum)
            ? categoryIdNum
            : null;

    return (
        <SubrouteChrome
            game={game}
            flags={chrome.flags}
            attentionCount={chrome.attentionCount}
            badgeDegraded={chrome.degradedSources.length > 0}
            moderatedGamesCount={chrome.moderatedGamesCount}
        >
            <RunnerPageMount
                userId={userId}
                runnerName={runnerName}
                context={{
                    gameSlug: game.name,
                    gameId: game.id,
                    gameDisplay: game.display,
                    categories,
                    variables,
                    canSiteBan,
                }}
                categoryId={panelCategoryId}
                backHref={backTarget.href}
                backLabel={backTarget.label}
                srcIdentity={
                    <SrcIdentityCard
                        gameSlug={game.name}
                        userId={userId}
                        runnerName={runnerName}
                    />
                }
            />
        </SubrouteChrome>
    );
}
