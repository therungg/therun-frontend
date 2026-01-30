import CurrentUserLivePanel from '~app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel';
import { LatestPbsPanel } from '~app/(new-layout)/frontpage/panels/latest-pbs-panel/latest-pbs-panel';
import { LiveRunsPanel } from '~app/(new-layout)/frontpage/panels/live-runs-panel/live-runs-panel';
import PatreonPanel from '~app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel';
import RacePanel from '~app/(new-layout)/frontpage/panels/race-panel/race-panel';
import StatsPanel from '~app/(new-layout)/frontpage/panels/stats-panel/stats-panel';
import type {
    PanelConfig,
    PanelId,
    PanelMetadata,
} from '../../types/frontpage-config.types';

export const PANEL_REGISTRY = {
    'live-runs': LiveRunsPanel,
    stats: StatsPanel,
    'current-user-live': CurrentUserLivePanel,
    race: RacePanel,
    patreon: PatreonPanel,
    'latest-pbs': LatestPbsPanel,
} as const;

export const PANEL_METADATA: Record<PanelId, PanelMetadata> = {
    'live-runs': { name: 'Live Runs', defaultColumn: 'left' },
    stats: { name: 'Stats', defaultColumn: 'left' },
    'current-user-live': { name: 'Your Live Run', defaultColumn: 'right' },
    race: { name: 'Races', defaultColumn: 'right' },
    patreon: { name: 'Patreon', defaultColumn: 'right' },
    'latest-pbs': { name: 'Latest PBs', defaultColumn: 'right' },
};

export const DEFAULT_FRONTPAGE_CONFIG: PanelConfig = {
    panels: [
        { id: 'live-runs', visible: true, order: 0, column: 'left' },
        { id: 'stats', visible: true, order: 1, column: 'left' },
        { id: 'current-user-live', visible: true, order: 0, column: 'right' },
        { id: 'race', visible: true, order: 1, column: 'right' },
        { id: 'patreon', visible: true, order: 2, column: 'right' },
        { id: 'latest-pbs', visible: true, order: 3, column: 'right' },
    ],
};

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
