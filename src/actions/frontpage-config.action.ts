'use server';

import { cacheLife, cacheTag, revalidateTag } from 'next/cache';
import { apiFetch } from '~src/lib/api-client';
import {
    DEFAULT_FRONTPAGE_CONFIG,
    mergeConfigWithDefaults,
    NON_HIDEABLE_PANELS,
    PANEL_REGISTRY,
} from '~src/lib/frontpage-panels';
import { PanelConfig } from '../../types/frontpage-config.types';
import { getSession } from './session.action';

export async function getFrontpageConfig(
    username?: string,
): Promise<PanelConfig> {
    if (!username) {
        const session = await getSession();
        if (!session?.username) return DEFAULT_FRONTPAGE_CONFIG;
        username = session.username;
    }

    return getCachedFrontpageConfig(username);
}

async function getCachedFrontpageConfig(
    username: string,
): Promise<PanelConfig> {
    'use cache';
    cacheLife('hours');
    cacheTag(`frontpage-config-${username}`);

    try {
        const config = await apiFetch<PanelConfig | null>(
            `/users/${username}/frontpage-config`,
        );

        if (!config) {
            return DEFAULT_FRONTPAGE_CONFIG;
        }

        const merged = mergeConfigWithDefaults(config);
        return enforceNonHideablePanels(merged);
    } catch {
        return DEFAULT_FRONTPAGE_CONFIG;
    }
}

function enforceNonHideablePanels(config: PanelConfig): PanelConfig {
    return {
        panels: config.panels.map((p) =>
            NON_HIDEABLE_PANELS.includes(p.id) ? { ...p, visible: true } : p,
        ),
    };
}

export async function updateFrontpageConfig(
    config: PanelConfig,
): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();
    if (!session?.username) {
        return { success: false, error: 'Not authenticated' };
    }

    const visibleCount = config.panels.filter((p) => p.visible).length;
    if (visibleCount < 2) {
        return {
            success: false,
            error: 'Must have at least 2 visible panels',
        };
    }

    const validPanelIds = Object.keys(PANEL_REGISTRY);
    const allValid = config.panels.every((p) => validPanelIds.includes(p.id));
    if (!allValid) {
        return { success: false, error: 'Invalid panel configuration' };
    }

    const enforced = enforceNonHideablePanels(config);

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
