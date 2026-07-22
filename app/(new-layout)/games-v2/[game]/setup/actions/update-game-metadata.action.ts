'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type GameLink,
    type UpdateGameBody,
    updateGame,
} from '~src/lib/game-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    coverUrl?: string | null;
    platforms?: string[];
    releaseYear?: number | null;
    discordUrl?: string | null;
    links?: GameLink[];
}

export async function updateGameMetadataAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit game details.' };
    }

    if (
        input.discordUrl &&
        !/^https:\/\/(www\.)?discord\.(gg|com)\//.test(input.discordUrl)
    ) {
        return { error: 'Discord link must be a discord.gg invite URL.' };
    }
    if (
        input.releaseYear !== undefined &&
        input.releaseYear !== null &&
        (!Number.isInteger(input.releaseYear) ||
            input.releaseYear < 1950 ||
            input.releaseYear > 2100)
    ) {
        return { error: 'Release year must be a valid year.' };
    }

    if (input.links !== undefined) {
        if (input.links.length > 10) {
            return { error: 'You can add up to 10 links.' };
        }
        for (const link of input.links) {
            const label = link.label.trim();
            if (!label || label.length > 40) {
                return {
                    error: 'Each link label must be 1–40 characters.',
                };
            }
            if (!link.url.startsWith('https://') || link.url.length > 2048) {
                return {
                    error: 'Each link URL must start with https:// and be 2048 characters or fewer.',
                };
            }
        }
    }

    const body: UpdateGameBody = {};
    if (input.coverUrl !== undefined) body.coverUrl = input.coverUrl;
    if (input.platforms !== undefined) body.platforms = input.platforms;
    if (input.releaseYear !== undefined) body.releaseYear = input.releaseYear;
    if (input.discordUrl !== undefined) body.discordUrl = input.discordUrl;
    if (input.links !== undefined) {
        body.links = input.links.map((link) => ({
            label: link.label.trim(),
            url: link.url,
        }));
    }

    if (Object.keys(body).length === 0) {
        return { result: { updated: false } };
    }

    try {
        const result = await updateGame(user.id, input.gameId, body);
        revalidateTag(`game-meta:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update game details.' };
    }
}
