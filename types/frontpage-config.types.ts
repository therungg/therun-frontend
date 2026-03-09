export type SectionId =
    | 'trending'
    | 'pb-feed'
    | 'races'
    | 'quick-links'
    | 'your-stats'
    | 'community-pulse'
    | 'patreon';

export type ColumnId = 'left' | 'right';

export interface SectionConfigItem {
    id: SectionId;
    visible: boolean;
    order: number;
    column: ColumnId;
}

export interface FrontpageConfig {
    sections: SectionConfigItem[];
}

export interface SectionMetadata {
    name: string;
    column: ColumnId;
}
