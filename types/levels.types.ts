// Individual levels — see docs/frontend-guide-levels.md (backend copy is
// authoritative). A level is a CATEGORY in the game's one level group
// (kind: 'level'); what it splits into are subcategory values on that
// category. A level category (`isLevelTemplate`) is the definition that says
// every level has that variant — served only under pageData.levelTemplates,
// never in groups[].categories/ungroupedCategories, and never a board.

export interface LevelTemplate {
    id: number;
    display: string;
    isMain: boolean;
    sortOrder: number;
    /** pageData serves level categories as ordinary category entries, so a
     * consumer that only wants a label can ignore the rest. */
    rules?: string | null;
    imageUrl?: string | null;
    primaryTiming?: 'rt' | 'gt';
    gameTimeLabel?: 'igt' | 'lrt';
    sortAscending?: boolean;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    rtaFallback?: boolean;
    requireVideoTopN?: number | null;
}

export interface LevelOverview {
    levels: Array<{
        categoryId: number;
        name: string;
        display: string;
        rules: string | null;
        sortOrder: number;
        /** The variant labels this level currently carries. */
        variants: string[];
    }>;
    templates: LevelTemplate[];
}
