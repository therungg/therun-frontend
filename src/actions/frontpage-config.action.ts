'use server';

import { cacheLife, cacheTag, revalidateTag } from 'next/cache';
import { apiFetch } from '~src/lib/api-client';
import {
    ALL_SECTION_IDS,
    DEFAULT_FRONTPAGE_CONFIG,
    mergeConfigWithDefaults,
    NON_HIDEABLE_SECTIONS,
} from '~src/lib/frontpage-sections-metadata';
import type { FrontpageConfig } from '../../types/frontpage-config.types';
import { getSession } from './session.action';

export async function getFrontpageConfig(
    username?: string,
): Promise<FrontpageConfig> {
    if (!username) {
        const session = await getSession();
        if (!session?.username) return DEFAULT_FRONTPAGE_CONFIG;
        username = session.username;
    }

    return getCachedFrontpageConfig(username);
}

async function getCachedFrontpageConfig(
    username: string,
): Promise<FrontpageConfig> {
    'use cache';
    cacheLife('hours');
    cacheTag(`frontpage-config-${username}`);

    try {
        const config = await apiFetch<FrontpageConfig | null>(
            `/users/${username}/frontpage-config`,
        );

        if (!config) {
            return DEFAULT_FRONTPAGE_CONFIG;
        }

        const merged = mergeConfigWithDefaults(config);
        return enforceNonHideableSections(merged);
    } catch {
        return DEFAULT_FRONTPAGE_CONFIG;
    }
}

function enforceNonHideableSections(config: FrontpageConfig): FrontpageConfig {
    return {
        sections: config.sections.map((s) =>
            NON_HIDEABLE_SECTIONS.includes(s.id) ? { ...s, visible: true } : s,
        ),
    };
}

export async function updateFrontpageConfig(
    config: FrontpageConfig,
): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();
    if (!session?.username) {
        return { success: false, error: 'Not authenticated' };
    }

    const visibleCount = config.sections.filter((s) => s.visible).length;
    if (visibleCount < 2) {
        return {
            success: false,
            error: 'Must have at least 2 visible sections',
        };
    }

    const allValid = config.sections.every((s) =>
        ALL_SECTION_IDS.includes(s.id),
    );
    if (!allValid) {
        return { success: false, error: 'Invalid section configuration' };
    }

    const enforced = enforceNonHideableSections(config);

    try {
        await apiFetch(`/users/${session.username}/frontpage-config`, {
            method: 'PUT',
            body: JSON.stringify(enforced),
            sessionId: session.id,
        });

        revalidateTag(`frontpage-config-${session.username}`, 'hours');

        return { success: true };
    } catch (error) {
        console.error('Failed to update frontpage config:', error);
        return { success: false, error: 'Failed to save configuration' };
    }
}

export async function resetFrontpageConfig(): Promise<void> {
    const session = await getSession();
    if (!session?.username) {
        throw new Error('Not authenticated');
    }

    await apiFetch(`/users/${session.username}/frontpage-config`, {
        method: 'PUT',
        body: JSON.stringify(null),
        sessionId: session.id,
    });

    revalidateTag(`frontpage-config-${session.username}`, 'hours');
}
