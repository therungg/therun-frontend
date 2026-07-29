'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type DeleteVariableInput,
    previewGameVariable,
    type UpsertVariableInput,
} from '~src/lib/leaderboard-variables';
import type { VariablePreview } from '~src/lib/variables/consequences';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    mode: 'save' | 'delete';
    body: UpsertVariableInput | DeleteVariableInput;
}

export async function previewVariableAction(
    input: Input,
): Promise<{ result: VariablePreview } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit variables.' };
    }

    try {
        const preview = await previewGameVariable(
            user.id,
            input.gameId,
            input.body,
            input.mode,
        );
        return { result: preview };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Could not work out what this change would move.' };
    }
}
