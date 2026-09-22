'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createCategory, updateCategory } from '~src/lib/category-mgmt';
import { ensureLevelGroup } from '~src/lib/levels';
import { millisecondsModeToBoolean } from '~src/lib/milliseconds-mode';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { MillisecondsMode } from '../../../../../../types/leaderboards.types';
import { setCategoryMinimumAction } from './set-category-minimum.action';

export interface CreateCategoryInput {
    gameSlug: string;
    gameId: number;
    display: string;
    primaryTiming: 'realtime' | 'gametime';
    gameTimeLabel: 'igt' | 'lrt';
    hideRealTime: boolean;
    hideGameTime: boolean;
    rtaFallback: boolean;
    rules: string;
    millisecondsMode: MillisecondsMode;
    /** null = no minimum of its own; the board's applies. */
    minMs: number | null;
    /**
     * Create a level: the category goes into the game's level group, which is
     * created on first use. The backend gives a new level its variables.
     */
    levelGroup?: boolean;
    /**
     * False leaves the category cache alone. Invalidating from a server action
     * refreshes the whole page, and the setup wizard's Categories step remounts
     * on every refresh — which would throw away ticks the moderator has not
     * saved yet. That step invalidates on save instead, through
     * `refreshCategoriesAction`.
     */
    invalidate?: boolean;
}

/**
 * Creates a category straight onto the board, settings and all.
 *
 * Three writes, because two of the settings are not create fields: the create
 * route drops `rtaFallback`, and a minimum is a board policy rather than a
 * category column. Once the create lands the category exists, so a failed
 * follow-up comes back as a `warning` next to the id — reporting it as an error
 * would invite a retry that collides with the category just made.
 */
export async function createCategoryAction(
    input: CreateCategoryInput,
): Promise<{ result: { id: number }; warning?: string } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to create categories.' };
    }

    const display = input.display.trim();
    if (!display) return { error: 'Name the category.' };
    if (display.length > 200) {
        return { error: 'Name must be at most 200 characters.' };
    }
    if (input.hideRealTime && input.hideGameTime) {
        return { error: 'A category has to show at least one time.' };
    }
    if (
        input.minMs !== null &&
        (!Number.isInteger(input.minMs) || input.minMs <= 0)
    ) {
        return { error: 'Minimum time must be above zero.' };
    }

    let id: number;
    try {
        const groupId = input.levelGroup
            ? (await ensureLevelGroup(user.id, input.gameId)).id
            : undefined;
        ({ id } = await createCategory(user.id, input.gameId, {
            display,
            primaryTiming: input.primaryTiming,
            gameTimeLabel: input.gameTimeLabel,
            hideRealTime: input.hideRealTime,
            hideGameTime: input.hideGameTime,
            ...(input.rules.trim() ? { rules: input.rules.trim() } : {}),
            millisecondsMode: input.millisecondsMode,
            // The boolean half too: an older backend reads only that one.
            showMilliseconds: millisecondsModeToBoolean(input.millisecondsMode),
            isMain: true,
            ...(groupId !== undefined ? { groupId } : {}),
        }));
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return {
            error: input.levelGroup
                ? 'Failed to create level.'
                : 'Failed to create category.',
        };
    }
    const invalidate = () => {
        if (input.invalidate !== false) updateTag(`game-cats:${input.gameId}`);
    };
    invalidate();

    const failed: string[] = [];

    if (input.rtaFallback && !input.hideGameTime) {
        try {
            await updateCategory(user.id, input.gameId, id, {
                rtaFallback: true,
            });
            invalidate();
        } catch {
            failed.push('RTA fallback');
        }
    }

    if (input.minMs !== null) {
        const res = await setCategoryMinimumAction({
            gameSlug: input.gameSlug,
            categoryId: id,
            timing: input.primaryTiming === 'gametime' ? 'gt' : 'rt',
            minMs: input.minMs,
        });
        if ('error' in res) failed.push('minimum time');
    }

    return failed.length > 0
        ? {
              result: { id },
              warning: `Created, but the ${failed.join(' and ')} did not save. Set it in Category settings.`,
          }
        : { result: { id } };
}

/** The deferred half of `invalidate: false`: the step calls this on save. */
export async function refreshCategoriesAction(
    gameSlug: string,
    gameId: number,
): Promise<void> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: gameSlug,
        });
    } catch {
        return;
    }
    updateTag(`game-cats:${gameId}`);
}
