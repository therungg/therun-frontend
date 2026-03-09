import type {
    FrontpageConfig,
    SectionId,
    SectionMetadata,
} from '../../types/frontpage-config.types';

export const SECTION_METADATA: Record<SectionId, SectionMetadata> = {
    trending: { name: 'Trending', column: 'left' },
    'pb-feed': { name: 'PB Feed', column: 'left' },
    races: { name: 'Races', column: 'left' },
    'quick-links': { name: 'Quick Links', column: 'right' },
    'your-stats': { name: 'Your Stats', column: 'right' },
    'community-pulse': { name: 'Community Pulse', column: 'right' },
    patreon: { name: 'Patreon', column: 'right' },
};

export const ALL_SECTION_IDS = Object.keys(SECTION_METADATA) as SectionId[];

/** Sections that can be reordered but never hidden */
export const NON_HIDEABLE_SECTIONS: SectionId[] = ['patreon'];

export const DEFAULT_FRONTPAGE_CONFIG: FrontpageConfig = {
    sections: [
        { id: 'trending', visible: true, order: 0, column: 'left' },
        { id: 'pb-feed', visible: true, order: 1, column: 'left' },
        { id: 'races', visible: true, order: 2, column: 'left' },
        { id: 'quick-links', visible: true, order: 0, column: 'right' },
        { id: 'your-stats', visible: true, order: 1, column: 'right' },
        { id: 'community-pulse', visible: true, order: 2, column: 'right' },
        { id: 'patreon', visible: true, order: 3, column: 'right' },
    ],
};

/**
 * Merge a saved config with the current section registry.
 * Handles new sections being added or old ones being removed.
 */
export function mergeConfigWithDefaults(
    saved: FrontpageConfig,
): FrontpageConfig {
    const validSaved = saved.sections.filter((s) =>
        ALL_SECTION_IDS.includes(s.id),
    );
    const savedIds = validSaved.map((s) => s.id);
    const newSections = ALL_SECTION_IDS.filter((id) => !savedIds.includes(id));

    if (
        newSections.length === 0 &&
        validSaved.length === saved.sections.length
    ) {
        return saved;
    }

    const getNextOrder = (column: 'left' | 'right'): number => {
        const columnSections = validSaved.filter((s) => s.column === column);
        return columnSections.length > 0
            ? Math.max(...columnSections.map((s) => s.order)) + 1
            : 0;
    };

    return {
        sections: [
            ...validSaved,
            ...newSections.map((id) => ({
                id,
                visible: true,
                order: getNextOrder(SECTION_METADATA[id].column),
                column: SECTION_METADATA[id].column,
            })),
        ],
    };
}
