import { normalizeSlug } from '~src/lib/normalize-slug';

/** One row of the levels table. `id` is null until the level is saved. */
export interface LevelDraft {
    /** Stable row identity across renames; the slug at creation. */
    key: string;
    id: number | null;
    name: string;
    rules: string;
}

/** One row of the subcategories table. `id` is null until saved. */
export interface SubcategoryDraft {
    key: string;
    id: number | null;
    name: string;
}

export interface LevelSetupState {
    hasLevels: boolean;
    levels: LevelDraft[];
    hasSubcategories: boolean;
    subcategories: SubcategoryDraft[];
    /** Unchecked matrix cells (subcategory excluded from level), by row key. */
    excluded: Array<{ levelKey: string; subcategoryKey: string }>;
}

export interface ExistingLevels {
    levelGroups: Array<{
        id: number;
        name: string;
        rules: string | null;
        /** Has an active board with no template (the no-subcategories shape). */
        hasLevelOnlyBoard: boolean;
    }>; // kind:'level' groups; name = display
    templates: Array<{ id: number; display: string }>; // isLevelTemplate categories
    categories: Array<{ id: number; name: string }>; // full-game categories; name = backend slug
    exclusions: Array<{ groupId: number; templateId: number }>;
    /** Level boards detached from their template. Save resyncs them: the
     * matrix has no "edited on this level" state, so the template wins. */
    overriddenCategoryIds: number[];
    /** Some level × template pair has no board at all. */
    needsMaterialise: boolean;
}

export type LevelPlanOp =
    | { kind: 'delete-level'; groupId: number; levelName: string }
    | { kind: 'archive-subcategory'; templateId: number; display: string }
    | { kind: 'create-level'; levelName: string; levelKey: string }
    | { kind: 'rename-level'; groupId: number; levelName: string }
    | {
          kind: 'set-rules';
          levelKey: string;
          levelName: string;
          rules: string | null;
      }
    | {
          kind: 'move-category';
          categoryId: number;
          levelKey: string;
          levelName: string;
      }
    | { kind: 'create-level-only-board'; display: string; levelKey: string }
    | { kind: 'create-subcategory'; display: string; subcategoryKey: string }
    | { kind: 'materialise' }
    | {
          kind: 'set-exclusion';
          levelKey: string;
          levelName: string;
          subcategoryKey: string;
          subcategoryName: string;
          excluded: boolean;
      }
    | { kind: 'resync-instance'; categoryId: number };

const slug = (s: string) => normalizeSlug(s.trim());

const normRules = (r: string | null | undefined) => {
    const t = (r ?? '').trim();
    return t === '' ? null : t;
};

/** Ops that archive boards — the ones a save has to confirm first. */
export function destructiveOps(plan: LevelPlanOp[]): LevelPlanOp[] {
    return plan.filter(
        (op) => op.kind === 'delete-level' || op.kind === 'archive-subcategory',
    );
}

/**
 * Diffs the drafted levels/subcategories against what exists and returns the
 * writes, in an order where every op's prerequisites precede it: removals,
 * then creates and renames, then boards, then the matrix.
 *
 * Unchecking "has levels" with levels saved deletes every level; unchecking
 * "has subcategories" archives every template and gives each level a
 * level-only board instead. Both are flagged by destructiveOps so the UI can
 * confirm before running them.
 */
export function buildLevelSetupPlan(
    state: LevelSetupState,
    existing: ExistingLevels,
): LevelPlanOp[] {
    const draftLevels = state.hasLevels ? state.levels : [];
    const draftSubs =
        state.hasLevels && state.hasSubcategories ? state.subcategories : [];

    const groupById = new Map(existing.levelGroups.map((g) => [g.id, g]));
    const keptGroupIds = new Set(
        draftLevels.flatMap((l) => (l.id == null ? [] : [l.id])),
    );
    const keptTemplateIds = new Set(
        draftSubs.flatMap((s) => (s.id == null ? [] : [s.id])),
    );
    const categoryBySlug = new Map(
        existing.categories.map((c) => [slug(c.name), c.id]),
    );

    const removals: LevelPlanOp[] = [];
    for (const g of existing.levelGroups) {
        if (!keptGroupIds.has(g.id)) {
            removals.push({
                kind: 'delete-level',
                groupId: g.id,
                levelName: g.name,
            });
        }
    }
    for (const t of existing.templates) {
        if (!keptTemplateIds.has(t.id)) {
            removals.push({
                kind: 'archive-subcategory',
                templateId: t.id,
                display: t.display,
            });
        }
    }

    const levelOps: LevelPlanOp[] = [];
    const rulesOps: LevelPlanOp[] = [];
    const boards: LevelPlanOp[] = [];
    for (const l of draftLevels) {
        const name = l.name.trim();
        const current = l.id == null ? undefined : groupById.get(l.id);
        if (!current) {
            levelOps.push({
                kind: 'create-level',
                levelName: name,
                levelKey: l.key,
            });
        } else if (current.name !== name) {
            levelOps.push({
                kind: 'rename-level',
                groupId: current.id,
                levelName: name,
            });
        }
        const rules = normRules(l.rules);
        if (current ? normRules(current.rules) !== rules : rules !== null) {
            rulesOps.push({
                kind: 'set-rules',
                levelKey: l.key,
                levelName: name,
                rules,
            });
        }
        if (!state.hasSubcategories && !current?.hasLevelOnlyBoard) {
            const matchId = current
                ? undefined
                : categoryBySlug.get(slug(name));
            boards.push(
                matchId != null
                    ? {
                          kind: 'move-category',
                          categoryId: matchId,
                          levelKey: l.key,
                          levelName: name,
                      }
                    : {
                          kind: 'create-level-only-board',
                          display: name,
                          levelKey: l.key,
                      },
            );
        }
    }

    const subCreates: LevelPlanOp[] = draftSubs
        .filter((s) => s.id == null)
        .map((s) => ({
            kind: 'create-subcategory',
            display: s.name.trim(),
            subcategoryKey: s.key,
        }));

    // Boards for existing level × template pairs nobody materialised. New
    // levels and templates materialise themselves on create.
    const materialise: LevelPlanOp[] =
        state.hasSubcategories && existing.needsMaterialise
            ? [{ kind: 'materialise' }]
            : [];

    const exclusions: LevelPlanOp[] = [];
    if (state.hasSubcategories) {
        const wanted = new Set(
            state.excluded.map((e) => `${e.levelKey}|${e.subcategoryKey}`),
        );
        const levelKeyById = new Map(
            draftLevels.flatMap((l) =>
                l.id == null ? [] : [[l.id, l.key] as const],
            ),
        );
        const subKeyById = new Map(
            draftSubs.flatMap((s) =>
                s.id == null ? [] : [[s.id, s.key] as const],
            ),
        );
        const current = new Set(
            existing.exclusions.flatMap((e) => {
                const lk = levelKeyById.get(e.groupId);
                const sk = subKeyById.get(e.templateId);
                return lk && sk ? [`${lk}|${sk}`] : [];
            }),
        );
        for (const l of draftLevels) {
            for (const s of draftSubs) {
                const cell = `${l.key}|${s.key}`;
                const want = wanted.has(cell);
                if (want === current.has(cell)) continue;
                exclusions.push({
                    kind: 'set-exclusion',
                    levelKey: l.key,
                    levelName: l.name.trim(),
                    subcategoryKey: s.key,
                    subcategoryName: s.name.trim(),
                    excluded: want,
                });
            }
        }
    }

    const resyncs: LevelPlanOp[] = state.hasSubcategories
        ? existing.overriddenCategoryIds.map((categoryId) => ({
              kind: 'resync-instance',
              categoryId,
          }))
        : [];

    return [
        ...removals,
        ...levelOps,
        ...subCreates,
        ...rulesOps,
        ...boards,
        ...materialise,
        ...exclusions,
        ...resyncs,
    ];
}
