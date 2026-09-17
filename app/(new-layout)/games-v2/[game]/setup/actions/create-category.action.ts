'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createCategory, updateCategory } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';
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
    showMilliseconds: boolean;
    /** null = no minimum of its own; the board's applies. */
    minMs: number | null;
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
        ({ id } = await createCategory(user.id, input.gameId, {
            display,
            primaryTiming: input.primaryTiming,
            gameTimeLabel: input.gameTimeLabel,
            hideRealTime: input.hideRealTime,
            hideGameTime: input.hideGameTime,
            ...(input.rules.trim() ? { rules: input.rules.trim() } : {}),
            showMilliseconds: input.showMilliseconds,
            isMain: true,
        }));
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create category.' };
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

export interface UpdateCategorySettingsInput {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    primaryTiming: 'rt' | 'gt';
    gameTimeLabel: 'igt' | 'lrt';
    hideRealTime: boolean;
    hideGameTime: boolean;
    rtaFallback: boolean;
    showMilliseconds: boolean;
    rules: string;
    /** undefined leaves the minimum alone; null clears the category's own. */
    minMs?: number | null;
    /** See `invalidate` on CreateCategoryInput. */
    invalidate?: boolean;
}

/**
 * The same settings as the create form, on a category that already exists.
 * The column settings go in one write; a changed minimum follows as a policy
 * write and, like on create, comes back as a `warning` if only it fails.
 */
export async function updateCategorySettingsAction(
    input: UpdateCategorySettingsInput,
): Promise<{ ok: true; warning?: string } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit categories.' };
    }

    if (input.hideRealTime && input.hideGameTime) {
        return { error: 'A category has to show at least one time.' };
    }
    if (
        input.minMs !== undefined &&
        input.minMs !== null &&
        (!Number.isInteger(input.minMs) || input.minMs <= 0)
    ) {
        return { error: 'Minimum time must be above zero.' };
    }

    try {
        await updateCategory(user.id, input.gameId, input.categoryId, {
            primaryTiming:
                input.primaryTiming === 'gt' ? 'gametime' : 'realtime',
            gameTimeLabel: input.gameTimeLabel,
            hideRealTime: input.hideRealTime,
            hideGameTime: input.hideGameTime,
            rtaFallback: input.primaryTiming === 'gt' && input.rtaFallback,
            showMilliseconds: input.showMilliseconds,
            rules: input.rules.trim() || null,
        });
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to save category.' };
    }
    if (input.invalidate !== false) updateTag(`game-cats:${input.gameId}`);

    if (input.minMs !== undefined) {
        const res = await setCategoryMinimumAction({
            gameSlug: input.gameSlug,
            categoryId: input.categoryId,
            timing: input.primaryTiming,
            minMs: input.minMs,
        });
        if ('error' in res) {
            return {
                ok: true,
                warning:
                    'Saved, but the minimum time did not. Set it in Category settings.',
            };
        }
    }

    return { ok: true };
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
