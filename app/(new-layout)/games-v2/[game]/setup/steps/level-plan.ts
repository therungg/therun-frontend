import { normalizeSlug } from '~src/lib/normalize-slug';

export interface LevelSetupState {
    hasLevels: boolean;
    levelNames: string[]; // trimmed, non-empty, de-duped by slug, in order
    hasSubcategories: boolean;
    subcategoryNames: string[]; // trimmed, non-empty, de-duped by slug, in order
    /** Unchecked matrix cells (subcategory excluded from level), by display name. */
    excluded: Array<{ levelName: string; subcategoryName: string }>;
}

export interface ExistingLevels {
    levelGroups: Array<{ id: number; name: string }>; // kind:'level' groups; name = display
    templates: Array<{ id: number; display: string }>; // isLevelTemplate categories
    categories: Array<{ id: number; name: string }>; // full-game categories; name = backend slug
    exclusions: Array<{ groupId: number; templateId: number }>;
}

export type LevelPlanOp =
    | { kind: 'create-level'; levelName: string }
    | { kind: 'move-category'; categoryId: number; levelName: string }
    | { kind: 'create-level-only-board'; display: string; levelName: string }
    | { kind: 'create-subcategory'; display: string }
    | {
          kind: 'set-exclusion';
          levelName: string;
          subcategoryName: string;
          excluded: boolean;
      };

const slug = (s: string) => normalizeSlug(s.trim());

export function buildLevelSetupPlan(
    state: LevelSetupState,
    existing: ExistingLevels,
): LevelPlanOp[] {
    if (!state.hasLevels) return [];

    const existingLevelSlugs = new Set(
        existing.levelGroups.map((g) => slug(g.name)),
    );
    const existingTemplateSlugs = new Set(
        existing.templates.map((t) => slug(t.display)),
    );
    const categoryBySlug = new Map(
        existing.categories.map((c) => [slug(c.name), c.id]),
    );

    const creates: LevelPlanOp[] = [];
    const boards: LevelPlanOp[] = [];
    for (const name of state.levelNames) {
        const isNew = !existingLevelSlugs.has(slug(name));
        if (isNew) {
            creates.push({ kind: 'create-level', levelName: name });
        }
        if (isNew && !state.hasSubcategories) {
            const matchId = categoryBySlug.get(slug(name));
            boards.push(
                matchId != null
                    ? {
                          kind: 'move-category',
                          categoryId: matchId,
                          levelName: name,
                      }
                    : {
                          kind: 'create-level-only-board',
                          display: name,
                          levelName: name,
                      },
            );
        }
    }

    const subCreates: LevelPlanOp[] = state.hasSubcategories
        ? state.subcategoryNames
              .filter((n) => !existingTemplateSlugs.has(slug(n)))
              .map((n) => ({ kind: 'create-subcategory', display: n }))
        : [];

    const exclusions: LevelPlanOp[] = state.hasSubcategories
        ? state.excluded.map((c) => ({
              kind: 'set-exclusion',
              levelName: c.levelName,
              subcategoryName: c.subcategoryName,
              excluded: true,
          }))
        : [];

    return [...creates, ...subCreates, ...boards, ...exclusions];
}
