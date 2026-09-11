import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { loadConsoleCatalog } from '~src/lib/category-mgmt';
import { keepConsoleRow } from '~src/lib/console/keep-console-row';
import { getGameIdentifiers, getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { getQuickStats, resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import { splitLevelBoards } from '~src/lib/levels/display';
import { listPolicies } from '~src/lib/moderation/policies';
import {
    categoryFactsFromResolved,
    computeCompleteness,
    type SetupStepId,
    variableFactsFromRows,
} from '~src/lib/setup/completeness';
import { resolveSetupStep } from '~src/lib/setup/steps';
import { getSrcImportJob } from '~src/lib/src-import';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { WizardData } from './types';
import { WizardShell } from './wizard-shell';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<{ step?: string }>;
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
    const { step } = await searchParams;
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

    const [
        stats,
        catData,
        policies,
        moderators,
        identifiers,
        metadata,
        settingsJob,
        catalog,
    ] = await Promise.all([
        getQuickStats(game.id),
        resolveCategory(game.id),
        listPolicies(session.id, game.id),
        listGameModerators(game.id),
        getGameIdentifiers(game.id),
        getGameMetadata(game.id),
        // The import step's status. A board nobody may import for still shows
        // the step (it is skippable); the read itself is moderator-gated, so a
        // failure means "no import to report", not a broken page.
        getSrcImportJob(session.id, game.id, 'settings').catch(() => null),
        // The console's rows/groups, so the Levels step can be the console's
        // Levels pane rather than a copy of it.
        loadConsoleCatalog(game.id),
    ]);

    // Variables are category-scoped only — one list call per category. The
    // hub rows, band previews and BoardCuration all filter this by category.
    const variables = await listCategoryVariables(
        session.id,
        game.id,
        catData.categories.map((c) => c.id),
    );

    const completeness = computeCompleteness({
        categories: categoryFactsFromResolved(catData.categories),
        policyCount: policies.length,
        requireVideoAnywhere: catData.categories.some(
            (c) => !c.archived && c.requireVideo,
        ),
        slug: identifiers.slug,
        moderatorCount: moderators.length,
        configured: metadata.configured,
        // Category groups only — the level group (one kind:'level' group
        // holding every level board) belongs to the Levels step, not the
        // category-grouping structure.
        groupCount: catData.groups.filter((g) => g.kind !== 'level').length,
        // A level is a category in that group, so count the boards, not the
        // group.
        levelCount: splitLevelBoards(
            catData.categories.filter((c) => !c.archived),
            catData.groups,
        ).levelBoards.length,
        ungroupedMainCount: catData.categories.filter(
            (c) => !c.archived && (c.isMain ?? false) && c.groupId == null,
        ).length,
        ...variableFactsFromRows(variables),
        srcImport: {
            linked: settingsJob !== null,
            configAppliedAt: settingsJob?.configAppliedAt ?? null,
            srcGameName: settingsJob?.srcGameName ?? null,
        },
    });

    const resolvedIds = new Set(catData.categories.map((c) => c.id));
    const data: WizardData = {
        game,
        stats,
        categories: catData.categories,
        groups: catData.groups,
        levelTemplates: catData.levelTemplates,
        // Same membership rule as the console: resolveCategory's list is the
        // verdict on which rows exist.
        manageRows: catalog.rows.filter((r) =>
            keepConsoleRow(r.id, resolvedIds),
        ),
        manageGroups: catalog.groups,
        variables,
        policies,
        moderators,
        identifiers,
        metadata,
        completeness,
        canEditStandards,
        canRematch: ability.can('edit', 'game'),
        canBypassImportCooldown: ability.can('moderate', 'admins'),
        renderedAt: Date.now(),
    };

    // Retired step ids resolve to their successor here too, so a cold load of
    // an old bookmark server-renders the right step instead of flashing
    // firstIncomplete before the client shell corrects it.
    const initialStep: SetupStepId =
        resolveSetupStep(step) ?? completeness.firstIncomplete ?? 'import';

    return <WizardShell data={data} initialStep={initialStep} />;
}
