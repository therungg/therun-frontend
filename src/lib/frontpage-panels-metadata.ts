import type {
    PanelConfig,
    PanelId,
    PanelMetadata,
} from '../../types/frontpage-config.types';

export const PANEL_METADATA: Record<PanelId, PanelMetadata> = {
    'live-runs': { name: 'Live Runs', defaultColumn: 'left' },
    stats: { name: 'Stats', defaultColumn: 'left' },
    'current-user-live': { name: 'Your Live Run', defaultColumn: 'right' },
    race: { name: 'Races', defaultColumn: 'right' },
    patreon: { name: 'Patreon', defaultColumn: 'right' },
    'latest-pbs': { name: 'Latest PBs', defaultColumn: 'right' },
};

/** Panels that can be reordered but never hidden */
export const NON_HIDEABLE_PANELS: PanelId[] = ['patreon'];

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
