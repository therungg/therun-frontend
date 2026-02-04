import 'server-only';

import CurrentUserLivePanel from '~app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel';
import { LatestPbsPanel } from '~app/(new-layout)/frontpage/panels/latest-pbs-panel/latest-pbs-panel';
import { LiveRunsPanel } from '~app/(new-layout)/frontpage/panels/live-runs-panel/live-runs-panel';
import PatreonPanel from '~app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel';
import RacePanel from '~app/(new-layout)/frontpage/panels/race-panel/race-panel';
import StatsPanel from '~app/(new-layout)/frontpage/panels/stats-panel/stats-panel';
import type { PanelConfig, PanelId } from '../../types/frontpage-config.types';
import {
    DEFAULT_FRONTPAGE_CONFIG,
    NON_HIDEABLE_PANELS,
    PANEL_METADATA,
} from './frontpage-panels-metadata';

export const PANEL_REGISTRY = {
    'live-runs': LiveRunsPanel,
    stats: StatsPanel,
    'current-user-live': CurrentUserLivePanel,
    race: RacePanel,
    patreon: PatreonPanel,
    'latest-pbs': LatestPbsPanel,
} as const;

// Re-export for convenience
export { DEFAULT_FRONTPAGE_CONFIG, NON_HIDEABLE_PANELS, PANEL_METADATA };

export function mergeConfigWithDefaults(savedConfig: PanelConfig): PanelConfig {
    const allPanelIds = Object.keys(PANEL_REGISTRY) as PanelId[];
    const savedPanelIds = savedConfig.panels.map((p) => p.id);

    const newPanels = allPanelIds.filter((id) => !savedPanelIds.includes(id));

    if (newPanels.length === 0) {
        return savedConfig;
    }

    const getNextOrder = (column: 'left' | 'right'): number => {
        const columnPanels = savedConfig.panels.filter(
            (p) => p.column === column,
        );
        return columnPanels.length > 0
            ? Math.max(...columnPanels.map((p) => p.order)) + 1
            : 0;
    };

    return {
        panels: [
            ...savedConfig.panels,
            ...newPanels.map((id) => ({
                id,
                visible: true,
                order: getNextOrder(PANEL_METADATA[id].defaultColumn),
                column: PANEL_METADATA[id].defaultColumn,
            })),
        ],
    };
}
