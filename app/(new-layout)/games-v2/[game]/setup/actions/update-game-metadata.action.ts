'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type GameLink,
    type UpdateGameBody,
    updateGame,
} from '~src/lib/game-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { normalizeDiscordInvite } from '~src/utils/discord-invite';

interface Input {
    gameSlug: string;
    gameId: number;
    coverUrl?: string | null;
    summaryOverride?: string | null;
    platforms?: string[];
    releaseYear?: number | null;
    discordUrl?: string | null;
    links?: GameLink[];
    primaryTiming?: 'rt' | 'gt';
    rulesTemplate?: string | null;
    gameRules?: string | null;
    emulatorPolicy?: 'allowed' | 'banned' | null;
    hideRealTime?: boolean;
    hideGameTime?: boolean;
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

    let discordUrl = input.discordUrl;
    if (discordUrl) {
        const normalized = normalizeDiscordInvite(discordUrl);
        if (!normalized) {
            return {
                error: 'Discord invite must be an invite link (discord.gg/…) or just the invite code.',
            };
        }
        discordUrl = normalized;
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

    if (
        input.summaryOverride !== undefined &&
        input.summaryOverride !== null &&
        input.summaryOverride.length > 5000
    ) {
        return { error: 'The description must be 5000 characters or fewer.' };
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

    if (input.hideRealTime === true && input.hideGameTime === true) {
        return { error: 'Cannot hide both real time and game time.' };
    }

    const body: UpdateGameBody = {};
    if (input.coverUrl !== undefined) body.coverUrl = input.coverUrl;
    if (input.summaryOverride !== undefined)
        body.summaryOverride = input.summaryOverride;
    if (input.platforms !== undefined) body.platforms = input.platforms;
    if (input.releaseYear !== undefined) body.releaseYear = input.releaseYear;
    if (input.discordUrl !== undefined) body.discordUrl = discordUrl ?? null;
    if (input.links !== undefined) {
        body.links = input.links.map((link) => ({
            label: link.label.trim(),
            url: link.url,
        }));
    }
    if (input.primaryTiming !== undefined)
        body.primaryTiming = input.primaryTiming;
    if (input.rulesTemplate !== undefined)
        body.rulesTemplate = input.rulesTemplate;
    if (input.gameRules !== undefined) body.gameRules = input.gameRules;
    if (input.emulatorPolicy !== undefined)
        body.emulatorPolicy = input.emulatorPolicy;
    if (input.hideRealTime !== undefined)
        body.hideRealTime = input.hideRealTime;
    if (input.hideGameTime !== undefined)
        body.hideGameTime = input.hideGameTime;

    if (Object.keys(body).length === 0) {
        return { result: { updated: false } };
    }

    try {
        const result = await updateGame(user.id, input.gameId, body);
        // Read-your-writes: step 2 reads getGameMetadata on the very next
        // navigation to seed its default timing/rules template off what step
        // 1 just wrote. `revalidateTag`'s stale-while-revalidate would still
        // hand back the pre-write value on that immediate re-read — see
        // set-configured.action.ts, which updateTag's the same tag for the
        // same reason.
        updateTag(`game-meta:${input.gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update game details.' };
    }
}
