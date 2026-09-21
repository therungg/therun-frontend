import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getConsoleGameMetadata, getGameIdentifiers } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { getQuickStats, resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import {
    canEditGameIdentity,
    canModerateGame,
} from '~src/lib/moderation/can-moderate';
import { listPolicies } from '~src/lib/moderation/policies';
import { getVerificationSettings } from '~src/lib/moderation/verification-settings';
import { computeCompleteness } from '~src/lib/setup/completeness';
import { buildCompletenessInput } from '~src/lib/setup/completeness-input';
import {
    firstLocationOf,
    resolveSetupLocation,
    type SetupLocation,
    withCategoryDeepLink,
} from '~src/lib/setup/steps';
import { getSrcImportJob } from '~src/lib/src-import';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { WizardData } from './types';
import { WizardShell } from './wizard-shell';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<{ step?: string; sub?: string; cat?: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { game: gameParam } = await params;
    const game = await resolveGame(safeDecodeURI(gameParam));
    const display = game?.display ?? safeDecodeURI(gameParam);
    return buildMetadata({
        title: `Set up — ${display}`,
        description: `Set up the ${display} leaderboard.`,
    });
}

export default async function SetupPage({ params, searchParams }: PageProps) {
    const { game: gameParam } = await params;
    const { step, sub, cat } = await searchParams;
    if (!gameParam) notFound();

    const session = await getSession();
    const game = await resolveGame(safeDecodeURI(gameParam));
    if (!game) notFound();

    const ability = defineAbilityFor(session);
    const canConfigure = ability.can(
        'edit',
        caslSubject('category-settings', { game: game.name }),
    );
    if (!canConfigure) notFound();
    // Same check the console uses (load-chrome.ts) — the per-category editor
    // gates its Minimum time section on it, and the wizard mounts that editor.
    const canEditStandards = ability.can('edit', 'moderators');
    // Verification settings are gated by the backend's own moderator check
    // (verify-reject-run), not category-settings edit rights, so a viewer who
    // can reach the wizard but can't moderate simply sees the step as todo.
    const canModerate = canModerateGame(session, game.name);

    const [
        stats,
        catData,
        policies,
        moderators,
        identifiers,
        metadata,
        settingsJob,
        verificationConfigured,
    ] = await Promise.all([
        getQuickStats(game.id),
        resolveCategory(game.id),
        listPolicies(session.id, game.id),
        listGameModerators(game.id),
        getGameIdentifiers(game.id),
        getConsoleGameMetadata(game.id),
        // The import step's status. A board nobody may import for still shows
        // the step (it is skippable); the read itself is moderator-gated, so a
        // failure means "no import to report", not a broken page.
        getSrcImportJob(session.id, game.id, 'settings').catch(() => null),
        canModerate
            ? getVerificationSettings(session.id, game.id)
                  .then((v) => v.configured)
                  .catch(() => false)
            : Promise.resolve(false),
    ]);

    // Variables are category-scoped only — one list call per category. The
    // hub rows, band previews and BoardCuration all filter this by category.
    const variables = await listCategoryVariables(
        session.id,
        game.id,
        catData.categories.map((c) => c.id),
    );

    const completeness = computeCompleteness(
        buildCompletenessInput({
            categories: catData.categories,
            groups: catData.groups,
            variables,
            policyCount: policies.length,
            slug: identifiers.slug,
            moderatorCount: moderators.length,
            configured: metadata.configured,
            hasTheme: metadata.theme != null,
            verificationConfigured,
            settingsJob,
        }),
    );

    const data: WizardData = {
        // The board-wide Pills / Dropdown default rides pageData, not the
        // lookup; the Boards step's live rail needs it to match the board.
        game: { ...game, categoryDisplayMode: catData.categoryDisplayMode },
        stats,
        categories: catData.categories,
        groups: catData.groups,
        variables,
        policies,
        moderators,
        identifiers,
        metadata,
        completeness,
        canEditStandards,
        canConfigure,
        canRematch: canEditGameIdentity(session, game.name),
        canBypassImportCooldown: ability.can('moderate', 'admins'),
        renderedAt: Date.now(),
    };

    // Retired step ids and `?cat=` resolve here too, so a cold load of an old
    // bookmark server-renders the right screen instead of flashing
    // firstIncomplete before the client shell corrects it. With no step named,
    // open the first unfinished step on the screen that owns its problem.
    const catId = Number(cat) || null;
    const firstStep = completeness.firstIncomplete ?? 'import';
    const firstSub = completeness.steps.find((s) => s.step === firstStep)?.sub;
    const fallback: SetupLocation = firstSub
        ? { step: firstStep, sub: firstSub }
        : firstLocationOf(firstStep);
    const initialLocation =
        withCategoryDeepLink(
            resolveSetupLocation(step, sub),
            catId,
            catData.categories,
            catData.groups,
        ) ?? fallback;

    return <WizardShell data={data} initialLocation={initialLocation} />;
}
