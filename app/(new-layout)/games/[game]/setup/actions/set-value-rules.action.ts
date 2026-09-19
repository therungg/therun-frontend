'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { upsertGameVariable } from '~src/lib/leaderboard-variables';
import { normalizeVariableName } from '~src/lib/variables/keys';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { VariableRow } from '../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    /** The slug of the category this variable belongs to, for its cache tag. */
    categorySlug: string;
    /** The variable as it stands; everything but the rules is written back
     *  unchanged, because the upsert replaces the whole row. */
    variable: VariableRow;
    /** The value whose rules are being set, as its label. */
    valueLabel: string;
    /** The new rules, or empty to clear this value's. */
    rules: string;
}

/**
 * One value's rules.
 *
 * Rules live on the variable, keyed by the value, so this reads the variable's
 * current rules, changes the one value and writes the row back. A board's
 * other values are untouched, and so is everything else about the variable.
 */
export async function setValueRulesAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit this board.' };
    }

    const key = normalizeVariableName(input.valueLabel);
    if (!key) return { error: 'That value has no name to hang rules on.' };

    const next: Record<string, string> = {
        ...(input.variable.valueRules ?? {}),
    };
    const trimmed = input.rules.trim();
    if (trimmed) next[key] = trimmed;
    else delete next[key];

    try {
        await upsertGameVariable(user.id, input.gameId, {
            categoryId: input.variable.categoryId,
            name: input.variable.name,
            nameNormalized: input.variable.nameNormalized,
            role: input.variable.role,
            values: input.variable.values,
            defaultValueIndex: input.variable.defaultValueIndex,
            sortOrder: input.variable.sortOrder,
            description: input.variable.description,
            showValueOnBoard: input.variable.showValueOnBoard ?? false,
            valueRules: next,
        });
        // updateTag, not revalidateTag: the dialog re-reads through the same
        // cached fetch as soon as this resolves, and stale-while-revalidate
        // would hand it back the rules as they were.
        updateTag(`game-vars:${input.gameSlug}:${input.categorySlug}`);
        updateTag(`game-cats:${input.gameId}`);
        return { ok: true };
    } catch (e) {
        return {
            error:
                e instanceof ApiError ? e.message : 'Failed to save the rules.',
        };
    }
}
