'use server';

import { getSession } from '~src/actions/session.action';
import { getVariables } from '~src/lib/leaderboards-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    categorySlug: string;
}

/**
 * The merged, published list exactly as the public board receives it. Read
 * through the public endpoint on purpose: the in-effect panel must not be able
 * to disagree with what runners see.
 */
export async function loadMergedVariablesAction(
    input: Input,
): Promise<{ result: VariableRow[] } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to view variables.' };
    }
    try {
        const { variables } = await getVariables(
            input.gameSlug,
            input.categorySlug,
        );
        return { result: variables as VariableRow[] };
    } catch {
        return { error: 'Could not load what this board currently shows.' };
    }
}
