'use server';

import { eq } from 'drizzle-orm';
import { db } from '~src/db';
import { users } from '~src/db/schema';
import {
    DEFAULT_FRONTPAGE_CONFIG,
    mergeConfigWithDefaults,
    NON_HIDEABLE_PANELS,
    PANEL_REGISTRY,
} from '~src/lib/frontpage-panels';
import { PanelConfig } from '../../types/frontpage-config.types';
import { getSession } from './session.action';

export async function getFrontpageConfig(): Promise<PanelConfig> {
    const session = await getSession();
    if (!session?.username) return DEFAULT_FRONTPAGE_CONFIG;

    const result = await db
        .select()
        .from(users)
        .where(eq(users.username, session.username))
        .limit(1);

    const user = result[0];
    if (!user?.frontpageConfig) {
        return DEFAULT_FRONTPAGE_CONFIG;
    }

    const merged = mergeConfigWithDefaults(user.frontpageConfig as PanelConfig);
    return enforceNonHideablePanels(merged);
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
    if (visibleCount < 3) {
        return {
            success: false,
            error: 'Must have at least 3 visible panels',
        };
    }

    const validPanelIds = Object.keys(PANEL_REGISTRY);
    const allValid = config.panels.every((p) => validPanelIds.includes(p.id));
    if (!allValid) {
        return { success: false, error: 'Invalid panel configuration' };
    }

    const enforced = enforceNonHideablePanels(config);

    try {
        await db
            .update(users)
            .set({ frontpageConfig: enforced })
            .where(eq(users.username, session.username));

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

    await db
        .update(users)
        .set({ frontpageConfig: null })
        .where(eq(users.username, session.username));
}
