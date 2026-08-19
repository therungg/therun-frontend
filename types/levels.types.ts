// Individual levels — see docs/frontend-guide-levels.md (backend copy is
// authoritative). A level is a category group with kind: 'level'; a level
// category (template) is served only under pageData.levelTemplates, never
// in groups[].categories/ungroupedCategories; a level board (instance) is a
// category inside a level group with levelTemplateId set.

export type LevelInstanceState =
    | 'synced'
    | 'overridden'
    | 'excluded'
    | 'level-only';

export interface LevelTemplate {
    id: number;
    display: string;
    rules: string | null;
    isMain: boolean;
    sortOrder: number;
    imageUrl: string | null;
}

export interface LevelOverview {
    levels: Array<{
        id: number;
        name: string;
        rules: string | null;
        sortOrder: number;
        instances: Array<{
            categoryId: number;
            templateId: number | null;
            state: LevelInstanceState;
            display: string;
        }>;
    }>;
    templates: Array<{
        id: number;
        display: string;
        isMain: boolean;
        synced: number;
        overridden: number;
        excluded: number;
        total: number;
    }>;
}
