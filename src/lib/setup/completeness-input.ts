import type {
    ResolvedCategory,
    VariableRow,
} from '../../../types/leaderboards.types';
import { splitLevelBoards } from '../levels/display';
import {
    type CompletenessInput,
    categoryFactsFromResolved,
    variableFactsFromRows,
} from './completeness';

/**
 * One assembly of the completeness input for the wizard and the console, so
 * both grade the board the same way. Level boards are split off: the
 * Categories step counts full-game categories and their variables only, the
 * Levels step counts the level boards.
 */
export function buildCompletenessInput(input: {
    categories: ResolvedCategory[];
    groups: ReadonlyArray<{ id: number; kind: string }>;
    variables: VariableRow[];
    policyCount: number;
    slug: string | null;
    moderatorCount: number;
    configured: boolean;
    hasTheme: boolean;
    verificationConfigured: boolean;
    settingsJob: {
        configAppliedAt: string | null;
        srcGameName: string | null;
    } | null;
}): CompletenessInput {
    const { categories, groups, variables, settingsJob } = input;
    const fullGame = splitLevelBoards(categories, groups).fullGame;
    const fullGameIds = new Set(fullGame.map((c) => c.id));

    return {
        categories: categoryFactsFromResolved(fullGame),
        policyCount: input.policyCount,
        requireVideoAnywhere: categories.some(
            (c) => !c.archived && c.requireVideo,
        ),
        slug: input.slug,
        moderatorCount: input.moderatorCount,
        configured: input.configured,
        hasTheme: input.hasTheme,
        // Category groups only — the level group (one kind:'level' group
        // holding every level board) belongs to the Levels step, not the
        // category-grouping structure.
        groupCount: groups.filter((g) => g.kind !== 'level').length,
        // A level is a category in that group, so count the boards, not the
        // group.
        levelCount: splitLevelBoards(
            categories.filter((c) => !c.archived),
            groups,
        ).levelBoards.length,
        ungroupedMainCount: categories.filter(
            (c) => !c.archived && (c.isMain ?? false) && c.groupId == null,
        ).length,
        verificationConfigured: input.verificationConfigured,
        // Full-game variables only; a level's variables belong to Levels.
        ...variableFactsFromRows(
            variables.filter((v) => fullGameIds.has(v.categoryId)),
        ),
        srcImport: {
            linked: settingsJob !== null,
            configAppliedAt: settingsJob?.configAppliedAt ?? null,
            srcGameName: settingsJob?.srcGameName ?? null,
        },
    };
}
