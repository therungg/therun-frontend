# Category Sort Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Moderators reorder Featured categories in the console; the public pill band and overview card grid honor that order via a shared sort helper.

**Architecture:** Thread `sortOrder` from pageData into `ResolvedCategory`; one plain-module sort helper (`sortOrder<=0` = unset → sorts last, playtime tiebreak) consumed by pills + overview; a pure `computeReorderChanges` renumbers a Featured group scope 1..N and diffs; a server action persists diffs via the existing category PUT; the categories table gains arrow/drag reorder on Featured rows with optimistic state in `console-shell`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, SCSS modules.

**Spec:** `docs/superpowers/specs/2026-07-20-category-sort-order-design.md`

## Global Constraints

- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons.
- Ordering semantics (exact): `sortOrder <= 0` = unset → sorts AFTER explicitly-ordered, tiebreak `totalRunTime` desc. All-unset preserves today's playtime order. Renumbering assigns `1..N` across the moved row's Featured group scope only.
- Reorder UI: Featured rows only; within-scope moves only; enabled only when search query empty and filter ≠ "Archived".
- No backend changes; persistence via existing `PUT /v1/games/:gameId/categories/:categoryId` (accepts `sortOrder`), diffs only.
- Typecheck gate = no NEW errors (repo baseline 356 pre-existing). Tests green (506 baseline). Commit per task. Branch: `category-sort-order`.
- Shared checkout warning: verify `git branch --show-current` = category-sort-order before working; if another session switched branches and status is clean (except next-env.d.ts), switch back.

---

### Task 1: Thread `sortOrder` into the data layer

**Files:**
- Modify: `types/leaderboards.types.ts` (`ResolvedCategory`)
- Modify: `src/lib/games-v1.ts` (flags plumbing)
- Modify: `src/lib/category-mgmt.ts` (`UpdateCategoryBody`)

**Interfaces:**
- Produces: `ResolvedCategory.sortOrder: number` (0 when absent); `UpdateCategoryBody.sortOrder?: number`.

- [ ] **Step 1: `types/leaderboards.types.ts`** — in `ResolvedCategory`, after the `archived` field add:

```typescript
    /** Moderator-set display order within its group scope; 0 = unset (sorts last, playtime tiebreak). */
    sortOrder: number;
```

- [ ] **Step 2: `src/lib/games-v1.ts`** — three edits:

1. `PageDataCategoryFlags` gains `sortOrder?: number | null;`
2. Both `flagsById.set(c.id, {...})` sites add `sortOrder: c.sortOrder ?? 0,` (the map value type widens accordingly).
3. The `ResolvedCategory` mapping adds `sortOrder: flags?.sortOrder ?? 0,` next to `archived`.

- [ ] **Step 3: `src/lib/category-mgmt.ts`** — `UpdateCategoryBody` gains:

```typescript
    sortOrder?: number;
```

- [ ] **Step 4: Fix compile fallout.** `npm run typecheck` — `sortOrder` is now required on `ResolvedCategory`, so object literals constructing it break: the synthetic placeholder in `app/(new-layout)/games-v2/[game]/data.ts` (no-categories branch) gets `sortOrder: 0,`; test fixtures in `root-view.test.ts` and `category-visibility.test.ts` `cat()` helpers get `sortOrder: 0,` defaults. Fix every site typecheck names the same way.

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck` (zero new vs 356), `npm run lint`, `npm run test` (506 green).

```bash
git add -A
git commit -m "feat(games-v2): thread category sortOrder through ResolvedCategory"
```

---

### Task 2: `sortCategoriesForDisplay` helper (TDD)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/category-sort.ts`
- Test: `app/(new-layout)/games-v2/[game]/category-sort.test.ts`

**Interfaces:**
- Produces:

```typescript
/** sortOrder <= 0 is the "unset" sentinel — treated as Infinity so unordered rows sort last. */
export function effectiveSortKey(sortOrder: number): number;
/** Stable display order: explicit sortOrder asc (unset last), playtime desc tiebreak. Non-mutating. */
export function sortCategoriesForDisplay<
    T extends { sortOrder: number; totalRunTime?: number },
>(categories: T[]): T[];
```

(Generic over the minimal shape so both `ResolvedCategory` and `ManageCategoryRow` can use it.)

- [ ] **Step 1: Write the failing test `category-sort.test.ts`:**

```typescript
import { describe, expect, it } from 'vitest';
import { effectiveSortKey, sortCategoriesForDisplay } from './category-sort';

function c(id: number, sortOrder: number, totalRunTime: number) {
    return { id, sortOrder, totalRunTime };
}

describe('effectiveSortKey', () => {
    it('passes positive orders through', () => {
        expect(effectiveSortKey(3)).toBe(3);
    });
    it('treats 0 and negatives as unset (Infinity)', () => {
        expect(effectiveSortKey(0)).toBe(Infinity);
        expect(effectiveSortKey(-1)).toBe(Infinity);
    });
});

describe('sortCategoriesForDisplay', () => {
    it('all-unset preserves playtime-desc order', () => {
        const rows = [c(1, 0, 50), c(2, 0, 200), c(3, 0, 100)];
        expect(sortCategoriesForDisplay(rows).map((r) => r.id)).toEqual([
            2, 3, 1,
        ]);
    });
    it('explicit order beats playtime', () => {
        const rows = [c(1, 2, 999), c(2, 1, 5)];
        expect(sortCategoriesForDisplay(rows).map((r) => r.id)).toEqual([
            2, 1,
        ]);
    });
    it('unset rows sort after ordered rows, playtime tiebroken', () => {
        const rows = [c(1, 0, 300), c(2, 1, 5), c(3, 0, 400)];
        expect(sortCategoriesForDisplay(rows).map((r) => r.id)).toEqual([
            2, 3, 1,
        ]);
    });
    it('does not mutate the input array', () => {
        const rows = [c(1, 0, 1), c(2, 1, 1)];
        const copy = rows.slice();
        sortCategoriesForDisplay(rows);
        expect(rows).toEqual(copy);
    });
    it('missing totalRunTime is treated as 0', () => {
        const rows = [{ id: 1, sortOrder: 0 }, { id: 2, sortOrder: 0, totalRunTime: 10 }];
        expect(sortCategoriesForDisplay(rows).map((r) => r.id)).toEqual([
            2, 1,
        ]);
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/category-sort.test.ts"`
Expected: FAIL — cannot resolve `./category-sort`.

- [ ] **Step 3: Implement `category-sort.ts`:**

```typescript
/** sortOrder <= 0 is the "unset" sentinel — treated as Infinity so unordered rows sort last. */
export function effectiveSortKey(sortOrder: number): number {
    return sortOrder > 0 ? sortOrder : Infinity;
}

/**
 * Display order for a category scope: explicit sortOrder ascending with
 * unset (<= 0) last, playtime descending as the tiebreak — so a game
 * nobody reordered keeps its historical playtime order, and categories
 * created after a reorder append at the end instead of jumping first.
 */
export function sortCategoriesForDisplay<
    T extends { sortOrder: number; totalRunTime?: number },
>(categories: T[]): T[] {
    return [...categories].sort(
        (a, b) =>
            effectiveSortKey(a.sortOrder) - effectiveSortKey(b.sortOrder) ||
            (b.totalRunTime ?? 0) - (a.totalRunTime ?? 0),
    );
}
```

- [ ] **Step 4: Run to verify pass** — Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/category-sort.ts" "app/(new-layout)/games-v2/[game]/category-sort.test.ts"
git commit -m "feat(games-v2): shared category display-sort helper"
```

---

### Task 3: Public surfaces honor sortOrder

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/category-visibility.ts`
- Modify: `app/(new-layout)/games-v2/[game]/header/category-visibility.test.ts`
- Modify: `app/(new-layout)/games-v2/[game]/overview/overview-page.tsx` (`sectionize`)

**Interfaces:**
- Consumes: `sortCategoriesForDisplay` (Task 2).

- [ ] **Step 1: `category-visibility.ts`** — delete the local `byPlaytimeDesc`; import `sortCategoriesForDisplay` from `../category-sort`; replace all three sort sites (`const visible = [...categories].sort(byPlaytimeDesc)` → `const visible = sortCategoriesForDisplay(categories)`; the two per-section `.sort(byPlaytimeDesc)` calls → `sortCategoriesForDisplay(...)` around the arrays). Update the doc comment's ordering sentence to "explicit sortOrder first (unset last), playtime tiebreak".

- [ ] **Step 2: `overview-page.tsx` `sectionize`** — cards are `{ category: ResolvedCategory; wrEntry: ... }`; sort each section's card array explicitly instead of trusting API order. After building `byGroup`/`ungrouped`, sort with the helper mapped over `card.category`:

```typescript
const byCategoryOrder = (arr: GameOverviewData['cards']) =>
    sortCategoriesForDisplay(
        arr.map((card) => ({ card, sortOrder: card.category.sortOrder, totalRunTime: card.category.totalRunTime })),
    ).map((x) => x.card);
```

Apply `byCategoryOrder` to each group's array and to `ungrouped` when pushing sections. Import from `../category-sort`.

- [ ] **Step 3: `category-visibility.test.ts`** — extend the `cat()` fixture helper with a `sortOrder` override param; add two tests:

```typescript
    it('explicit sortOrder beats playtime within a section', () => {
        const cats = [
            cat({ id: 1, name: 'a', totalRunTime: 999, sortOrder: 2 }),
            cat({ id: 2, name: 'b', totalRunTime: 5, sortOrder: 1 }),
        ];
        const { sections } = computeCategoryVisibility(cats, []);
        expect(sections[0].pills.map((c) => c.id)).toEqual([2, 1]);
    });
    it('unset sortOrder rows trail ordered rows', () => {
        const cats = [
            cat({ id: 1, name: 'a', totalRunTime: 999, sortOrder: 0 }),
            cat({ id: 2, name: 'b', totalRunTime: 5, sortOrder: 1 }),
        ];
        const { sections } = computeCategoryVisibility(cats, []);
        expect(sections[0].pills.map((c) => c.id)).toEqual([2, 1]);
    });
```

- [ ] **Step 4: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test` — green, zero new.

```bash
git add -A
git commit -m "feat(games-v2): pills + overview honor category sortOrder"
```

---

### Task 4: `computeReorderChanges` (TDD) + `reorderCategoriesAction`

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/game-tab/reorder-changes.ts`
- Test: `app/(new-layout)/games-v2/[game]/manage/game-tab/reorder-changes.test.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/game-tab/actions/reorder-categories.action.ts`

**Interfaces:**
- Produces:

```typescript
// reorder-changes.ts
export interface ReorderChange {
    categoryId: number;
    sortOrder: number;
}
export interface ReorderResult {
    /** Scope rows' ids in their new order. */
    orderedIds: number[];
    /** Only the rows whose sortOrder actually changes (1..N assignment diffed against current). */
    changes: ReorderChange[];
}
export function computeReorderChanges(
    scopeRows: { id: number; sortOrder: number }[],
    fromIndex: number,
    toIndex: number,
): ReorderResult;

// reorder-categories.action.ts
export async function reorderCategoriesAction(input: {
    gameSlug: string;
    gameId: number;
    changes: ReorderChange[];
}): Promise<{ result: { reordered: boolean } } | { error: string }>;
```

- [ ] **Step 1: Write the failing test `reorder-changes.test.ts`:**

```typescript
import { describe, expect, it } from 'vitest';
import { computeReorderChanges } from './reorder-changes';

const row = (id: number, sortOrder: number) => ({ id, sortOrder });

describe('computeReorderChanges', () => {
    it('moves a row down and renumbers 1..N, diffing unchanged rows away', () => {
        // Rows already ordered 1,2,3 — move first to last.
        const res = computeReorderChanges(
            [row(10, 1), row(20, 2), row(30, 3)],
            0,
            2,
        );
        expect(res.orderedIds).toEqual([20, 30, 10]);
        expect(res.changes).toEqual([
            { categoryId: 20, sortOrder: 1 },
            { categoryId: 30, sortOrder: 2 },
            { categoryId: 10, sortOrder: 3 },
        ]);
    });
    it('first move over an all-unset scope renumbers every row', () => {
        const res = computeReorderChanges(
            [row(10, 0), row(20, 0), row(30, 0)],
            2,
            0,
        );
        expect(res.orderedIds).toEqual([30, 10, 20]);
        expect(res.changes).toEqual([
            { categoryId: 30, sortOrder: 1 },
            { categoryId: 10, sortOrder: 2 },
            { categoryId: 20, sortOrder: 3 },
        ]);
    });
    it('adjacent swap emits only the two changed rows', () => {
        const res = computeReorderChanges(
            [row(10, 1), row(20, 2), row(30, 3)],
            1,
            2,
        );
        expect(res.orderedIds).toEqual([10, 30, 20]);
        expect(res.changes).toEqual([
            { categoryId: 30, sortOrder: 2 },
            { categoryId: 20, sortOrder: 3 },
        ]);
    });
    it('no-op move returns empty changes', () => {
        const res = computeReorderChanges([row(10, 1), row(20, 2)], 1, 1);
        expect(res.orderedIds).toEqual([10, 20]);
        expect(res.changes).toEqual([]);
    });
    it('out-of-range indices return the scope unchanged', () => {
        const res = computeReorderChanges([row(10, 1)], 0, 5);
        expect(res.orderedIds).toEqual([10]);
        expect(res.changes).toEqual([]);
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/game-tab/reorder-changes.test.ts"`
Expected: FAIL — cannot resolve `./reorder-changes`.

- [ ] **Step 3: Implement `reorder-changes.ts`:**

```typescript
export interface ReorderChange {
    categoryId: number;
    sortOrder: number;
}

export interface ReorderResult {
    /** Scope rows' ids in their new order. */
    orderedIds: number[];
    /** Only the rows whose sortOrder actually changes (1..N assignment diffed against current). */
    changes: ReorderChange[];
}

/**
 * Renumbers a Featured group scope after a move: the scope's rows (in
 * their current DISPLAY order) get `fromIndex`'s row moved to `toIndex`,
 * then every row is assigned 1..N — but only rows whose stored sortOrder
 * differs from their new number are emitted as changes, so an untouched
 * tail costs no PUTs.
 */
export function computeReorderChanges(
    scopeRows: { id: number; sortOrder: number }[],
    fromIndex: number,
    toIndex: number,
): ReorderResult {
    const valid =
        fromIndex >= 0 &&
        fromIndex < scopeRows.length &&
        toIndex >= 0 &&
        toIndex < scopeRows.length &&
        fromIndex !== toIndex;
    if (!valid) {
        return { orderedIds: scopeRows.map((r) => r.id), changes: [] };
    }
    const next = scopeRows.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const changes: ReorderChange[] = [];
    next.forEach((r, i) => {
        const target = i + 1;
        if (r.sortOrder !== target) {
            changes.push({ categoryId: r.id, sortOrder: target });
        }
    });
    return { orderedIds: next.map((r) => r.id), changes };
}
```

- [ ] **Step 4: Run to verify pass** — Expected: 5 tests PASS.

- [ ] **Step 5: Write `actions/reorder-categories.action.ts`** (mirrors `updateVisibilityAction`'s shape; `updateCategory` from `~src/lib/category-mgmt` now accepts `sortOrder` via Task 1):

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateCategory } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { ReorderChange } from '../reorder-changes';

interface Input {
    gameSlug: string;
    gameId: number;
    changes: ReorderChange[];
}

export async function reorderCategoriesAction(
    input: Input,
): Promise<{ result: { reordered: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }
    if (input.changes.length === 0) {
        return { result: { reordered: false } };
    }

    try {
        // Sequential on purpose: each PUT triggers a pageData rebuild
        // backend-side; parallel writes could interleave rebuilds.
        for (const change of input.changes) {
            await updateCategory(user.id, input.gameId, change.categoryId, {
                sortOrder: change.sortOrder,
            });
        }
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result: { reordered: true } };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to reorder categories.' };
    }
}
```

- [ ] **Step 6: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test` — green, zero new.

```bash
git add "app/(new-layout)/games-v2/[game]/manage/game-tab/reorder-changes.ts" "app/(new-layout)/games-v2/[game]/manage/game-tab/reorder-changes.test.ts" "app/(new-layout)/games-v2/[game]/manage/game-tab/actions/reorder-categories.action.ts"
git commit -m "feat(games-v2): category reorder diffing + server action"
```

---

### Task 5: Console reorder UI

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx` (state owner: add `applyRowsReorder`)
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx` (thread prop)
- Modify: `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx` (thread prop)
- Modify: `app/(new-layout)/games-v2/[game]/manage/game-tab/categories-table.tsx` (sort + controls)

**Interfaces:**
- Consumes: `computeReorderChanges`, `reorderCategoriesAction`, `ReorderChange` (Task 4); `sortCategoriesForDisplay`/`effectiveSortKey` (Task 2); `ManageCategoryRow.sortOrder` (already exists); `ManageGroup.sortOrder` (already exists).
- Produces: `onRowsReorder(changes: ReorderChange[]): void` prop threaded console-shell → content-router → game-tab → categories-table.

- [ ] **Step 1: `console-shell.tsx`** — next to the existing `applyRowPatch` (~line 293), add and pass down:

```typescript
    const applyRowsReorder = (changes: ReorderChange[]) => {
        if (changes.length === 0) return;
        const byId = new Map(changes.map((c) => [c.categoryId, c.sortOrder]));
        setRows((rs) =>
            rs.map((r) =>
                byId.has(r.id)
                    ? { ...r, sortOrder: byId.get(r.id) as number }
                    : r,
            ),
        );
    };
```

Import `ReorderChange` (type-only) from the game-tab path. Pass `onRowsReorder={applyRowsReorder}` at the GameTab render site (~line 467, next to `onRowChange`).

- [ ] **Step 2: `content-router.tsx` + `game-tab.tsx`** — add `onRowsReorder: (changes: ReorderChange[]) => void;` to their props interfaces and pass through to `CategoriesTable` (exactly how `onRowChange` flows today).

- [ ] **Step 3: `categories-table.tsx` — display sort.** Replace the `visibleRows` sort (currently `isMain first, then playtime`) with the public-mirroring order. Build a group-rank map from the `groups` prop and sort:

```typescript
    const groupRank = useMemo(() => {
        const m = new Map<number, number>();
        groups.forEach((g) => m.set(g.id, g.sortOrder));
        return m;
    }, [groups]);

    // ... inside the visibleRows useMemo, replacing the old .sort:
        return filtered.sort((a, b) => {
            if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
            // Mirror the public page: group rank (ungrouped trailing),
            // then explicit order (unset last), then playtime.
            const ga = a.groupId != null ? (groupRank.get(a.groupId) ?? 0) : Infinity;
            const gb = b.groupId != null ? (groupRank.get(b.groupId) ?? 0) : Infinity;
            if (ga !== gb) return ga - gb;
            return (
                effectiveSortKey(a.sortOrder) - effectiveSortKey(b.sortOrder) ||
                b.totalRunTime - a.totalRunTime
            );
        });
```

Import `effectiveSortKey` from `../../category-sort`. Add `groupRank` to the memo's dependency array.

- [ ] **Step 4: `categories-table.tsx` — reorder handlers.** Add prop `onRowsReorder: (changes: ReorderChange[]) => void`. Add state `const [dragId, setDragId] = useState<number | null>(null);` and `const [reorderPending, setReorderPending] = useState(false);`. Reorder gating + scope:

```typescript
    // Reorder is honest only when the full Featured scope is visible:
    // a search or the Archived filter hides rows a renumber would touch.
    const reorderEnabled = normalized === '' && filter !== 'archived';

    // The moved row's Featured scope, in current display order. Matches
    // the PUBLIC scope exactly (isMain && active): an archived-but-Featured
    // row is not publicly ordered, and including it only under the "All"
    // filter would make renumbering filter-dependent.
    const featuredScopeOf = (row: ManageCategoryRow) =>
        visibleRows.filter(
            (r) =>
                r.isMain &&
                r.active &&
                (r.groupId ?? null) === (row.groupId ?? null),
        );

    const commitReorder = (row: ManageCategoryRow, toIndex: number) => {
        const scope = featuredScopeOf(row);
        const fromIndex = scope.findIndex((r) => r.id === row.id);
        const { changes } = computeReorderChanges(scope, fromIndex, toIndex);
        if (changes.length === 0) return;
        const prev = scope.map((r) => ({
            categoryId: r.id,
            sortOrder: r.sortOrder,
        }));
        onRowsReorder(changes);
        setReorderPending(true);
        startTransition(async () => {
            const res = await reorderCategoriesAction({
                gameSlug: game.name,
                gameId: game.id,
                changes,
            });
            setReorderPending(false);
            if ('error' in res) {
                toast.error(res.error);
                onRowsReorder(prev);
            }
        });
    };

    const moveBy = (row: ManageCategoryRow, delta: -1 | 1) => {
        const scope = featuredScopeOf(row);
        const idx = scope.findIndex((r) => r.id === row.id);
        const target = idx + delta;
        if (idx < 0 || target < 0 || target >= scope.length) return;
        commitReorder(row, target);
    };

    const onDropRow = (overRow: ManageCategoryRow) => {
        if (dragId === null || dragId === overRow.id) {
            setDragId(null);
            return;
        }
        const dragged = rows.find((r) => r.id === dragId);
        setDragId(null);
        if (!dragged || !dragged.isMain || !dragged.active) return;
        if (!overRow.isMain || !overRow.active) return;
        // Cross-group drops are ignored — group membership has its own control.
        if ((dragged.groupId ?? null) !== (overRow.groupId ?? null)) return;
        const scope = featuredScopeOf(dragged);
        const toIndex = scope.findIndex((r) => r.id === overRow.id);
        if (toIndex < 0) return;
        commitReorder(dragged, toIndex);
    };
```

Import `computeReorderChanges` and type `ReorderChange` from `./reorder-changes`, `reorderCategoriesAction` from `./actions/reorder-categories.action`.

- [ ] **Step 5: `categories-table.tsx` — row controls.** In the row render (Featured non-archived rows only — `row.isMain && row.active`), add a leading cell/segment mirroring groups-section's affordance: a `⠿` drag handle (`draggable={reorderEnabled && !reorderPending}`, `onDragStart={() => setDragId(row.id)}`, `onDragOver={(e) => { e.preventDefault(); }}`, `onDrop={() => onDropRow(row)}`, `onDragEnd={() => setDragId(null)}`, `style={{ cursor: 'grab' }}`, opacity-50 class while `dragId === row.id`) plus a compact `btn-group btn-group-sm` with ▲/▼ buttons calling `moveBy(row, -1)` / `moveBy(row, 1)`, disabled when `!reorderEnabled || reorderPending` (and naturally no-op at scope edges). Non-Featured rows render a placeholder cell with `title="Feature a category to order it"`. When `!reorderEnabled`, the handle/buttons carry `title="Clear the search to reorder"` (or the Archived-filter variant). Drag events attach to the row `<tr>` so a row is a drop target; the `draggable` attribute lives on the handle span only. Match existing table markup/classes — read the current row JSX first and keep its structure; this is an added control cluster, not a rewrite.

- [ ] **Step 6: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test` — green, zero new.

```bash
git add -A
git commit -m "feat(games-v2): drag/arrow category reorder in console table"
```

---

### Task 6: Sweep + full verification

**Files:** verification sweep; fix anything found.

- [ ] **Step 1:** `grep -rn "byPlaytimeDesc" "app/(new-layout)/games-v2"` — expect zero hits (helper replaced it everywhere).
- [ ] **Step 2:** `npm run typecheck && npm run lint && npm run test` — zero new vs 356; all green.
- [ ] **Step 3:** `rm -rf .next`
- [ ] **Step 4: Commit any cleanup + STOP (controller pushes after final review)**

```bash
git add -A && git diff --cached --quiet || git commit -m "chore(games-v2): sort-order sweep"
```
