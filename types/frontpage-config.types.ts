export type PanelId =
    | 'stats'
    | 'current-user-live'
    | 'race'
    | 'patreon'
    | 'latest-pbs';

export type ColumnId = 'left' | 'right';

export interface PanelConfigItem {
    id: PanelId;
    visible: boolean;
    order: number;
    column: ColumnId;
}

export interface PanelConfig {
    panels: PanelConfigItem[];
}

export interface PanelMetadata {
    name: string;
    defaultColumn: ColumnId;
}
