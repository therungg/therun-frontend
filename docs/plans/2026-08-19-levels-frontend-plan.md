# Individual Levels — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show individual levels on the leaderboard (Levels dropdown → level boards), and let mods manage levels and level categories in the console as two short lists — never the level × category cross product.

**Architecture:** Backend contract in `docs/frontend-guide-levels.md` (copied from the backend repo): levels are groups with `kind: 'level'`; templates live in `pageData.levelTemplates`; level boards are ordinary categories carrying `levelTemplateId`/`levelOverride`. Frontend threads those three facts through `resolveCategory` → `ResolvedCategory`/`ResolvedGroup`, adds a Levels dropdown to `CategoryRail`, a level-rules tier to `RulesPanel`, and two console panes (`levels`, `level-categories`) backed by server actions that call the existing group/category/variable routes with the new body fields/ops.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, vitest 4 + Testing Library (jsdom for `.test.tsx`, first line `// @vitest-environment jsdom`), Biome formatting, SCSS modules + design tokens.

**Spec:** backend `docs/plans/2026-08-19-levels-design.md`; contract `docs/frontend-guide-levels.md`.

## Global Constraints

- Branch `levels` in `/home/joey/therun/therun-fr`; never push to `main`; open a PR. Biome: 4-space indent, single quotes, trailing commas. `npx tsc --noEmit -p .` and `npx vitest run` must be clean for touched files (pre-existing failures in `boards/row-actions.test.tsx` are known).
- Mirror types by hand from the guide into `types/leaderboards.types.ts` / `types/levels.types.ts`; don't read backend source.
- Server actions: `'use server'`, `getSession()`, gate with `confirmPermission(user, 'edit', 'category-settings', { game: gameSlug })` (same as group actions), return `{ result } | { error }`, invalidate `game-cats:${gameId}` with `updateTag` (read-your-writes) like `reorder-groups.action.ts`.
- **Level boards start empty.** `category_stats` (the source of `/v1/runs/categories`) only contains categories with runs, and `resolveCategory` drops low-activity rows. Level boards must not be dropped: include every pageData category that sits in a level group (zero stats) and exempt `levelTemplateId != null` from `isLowActivityCategory` wherever it is applied (`games-v1.ts`, `manage/page.tsx`).
- Inside a level context the pill label is the **template display** (`levelTemplates.find(t => t.id === c.levelTemplateId)?.display`), falling back to the category display with the `"<Level> — "` prefix stripped. Everywhere else the full display is used.
- Templates never appear in category lists (they are not in pageData's lists; guard anyway with `isLevelTemplate` where a row is built from `levelTemplates`).
- No new routes; all writes go through `src/lib/category-mgmt.ts` helpers against existing endpoints.

---

## File map

Create:
- `types/levels.types.ts` — `LevelOverview`, `LevelInstanceState`, `LevelTemplate`.
- `src/lib/levels.ts` — `createLevel`, `updateLevel`, `createLevelTemplate`, `levelOp`, `fetchLevelOverview` (apiFetch wrappers).
- `src/actions/levels/*.action.ts` — `create-level`, `update-level`, `create-level-template`, `level-op` (exclusion/detach/resync/push/materialise), `level-overview`.
- `app/(new-layout)/games-v2/[game]/header/level-picker.tsx` (+ `.module.scss`) — the Levels dropdown.
- `app/(new-layout)/games-v2/[game]/manage/levels/levels-pane.tsx`, `level-row.tsx`, `level-categories-pane.tsx`, `levels.module.scss`, tests.
- `src/lib/levels/display.ts` — `levelBoardLabel`, `splitLevelBoards` (pure), tests under `src/lib/levels/__tests__/`.

Modify:
- `types/leaderboards.types.ts` (`ResolvedGroup.kind/rules`, `ResolvedCategory.levelTemplateId/levelOverride`).
- `src/lib/games-v1.ts` (`PageDataGroup`, `PageDataCategoryFlags`, `PageDataForCats.levelTemplates`, `resolveCategory`).
- `src/lib/category-mgmt.ts` (`ManageGroup.kind/rules`, `GameCategoryRow` linkage, `listManageCategories` keeps level boards, `CreateGroupBody.kind/rules`).
- `app/(new-layout)/games-v2/[game]/header/category-visibility.ts`, `category-rail.tsx`, `board-masthead.tsx`, `rules/rules-panel.tsx`.
- `app/(new-layout)/games-v2/[game]/data.ts`, `root-view.ts` (level boards are viewable like any featured category — no change in rule, but `levelTemplates` excluded).
- Console: `manage/console/nav-model.ts`, `nav-icons.ts`, `content-router.tsx`, `src/lib/console/vocabulary.ts`, `manage/console/board-categories-table.tsx` (collapse level bands), `manage/page.tsx` (low-activity exemption, pass `levelTemplates`), tests pinning counts.

---

### Task 1: Types + pageData threading

**Files:**
- Modify: `types/leaderboards.types.ts`, `src/lib/games-v1.ts` (`PageDataCategoryFlags` ~118, `PageDataGroup` ~127, `PageDataForCats` ~136, `resolveCategory` ~201-300), `src/lib/category-mgmt.ts` (`GameCategoryRow` ~31, `GamePageData` ~41, `ManageGroup` ~194, `CreateGroupBody` ~222, `UpdateGroupBody` ~229, `listManageCategories` ~86, `listManageGroups` ~212)
- Create: `types/levels.types.ts`, `src/lib/levels/display.ts`, `src/lib/levels/__tests__/display.test.ts`
- Test: `src/lib/__tests__/resolve-category-levels.test.ts` (if `resolveCategory` has an existing test, extend it; otherwise create with `vi.mock` of `v1Fetch`/`fetchAllCategoryStats` — look at how `src/lib/__tests__/` mocks `api-client`)

**Interfaces:**
- Produces:
  ```ts
  // types/leaderboards.types.ts
  export interface ResolvedGroup { …; kind: 'normal' | 'level'; rules: string | null }
  export interface ResolvedCategory { …; levelTemplateId?: number | null; levelOverride?: boolean }
  // types/levels.types.ts
  export type LevelInstanceState = 'synced' | 'overridden' | 'excluded' | 'level-only';
  export interface LevelTemplate { id: number; display: string; rules: string | null; isMain: boolean; sortOrder: number; imageUrl: string | null }
  export interface LevelOverview { levels: Array<{ id: number; name: string; rules: string | null; sortOrder: number; instances: Array<{ categoryId: number; templateId: number | null; state: LevelInstanceState; display: string }> }>; templates: Array<{ id: number; display: string; isMain: boolean; synced: number; overridden: number; excluded: number; total: number }> }
  // src/lib/levels/display.ts
  export function levelBoardLabel(c: { display: string; levelTemplateId?: number | null; groupName?: string | null }, templates: ReadonlyArray<{ id: number; display: string }>): string
  export function splitLevelBoards<T extends { groupId?: number | null }>(categories: T[], groups: ReadonlyArray<{ id: number; kind: string }>): { fullGame: T[]; levelBoards: T[] }
  ```
- `resolveCategory` return gains `levelTemplates: LevelTemplate[]`; `ResolvedGroup.kind/rules` populated; level boards included even without stats.

- [ ] **Step 1: Failing tests for the pure helpers** (`src/lib/levels/__tests__/display.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { levelBoardLabel, splitLevelBoards } from '../display';

describe('levelBoardLabel', () => {
    const templates = [{ id: 9, display: 'Any%' }];
    it('uses the template display when the board has one', () => {
        expect(levelBoardLabel({ display: 'E1M1 — Any%', levelTemplateId: 9 }, templates)).toBe('Any%');
    });
    it('strips the level prefix when the template is unknown', () => {
        expect(levelBoardLabel({ display: 'E1M1 — Secret exit', levelTemplateId: null, groupName: 'E1M1' }, templates)).toBe('Secret exit');
    });
    it('leaves a plain display alone', () => {
        expect(levelBoardLabel({ display: 'Any%', levelTemplateId: null }, templates)).toBe('Any%');
    });
});

describe('splitLevelBoards', () => {
    it('separates categories in level groups from the rest', () => {
        const groups = [{ id: 1, kind: 'level' }, { id: 2, kind: 'normal' }];
        const cats = [{ id: 10, groupId: 1 }, { id: 11, groupId: 2 }, { id: 12, groupId: null }];
        expect(splitLevelBoards(cats, groups)).toEqual({ fullGame: [cats[1], cats[2]], levelBoards: [cats[0]] });
    });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/levels`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement types + helpers**

`types/levels.types.ts` — the interfaces from the block above.

`types/leaderboards.types.ts`: add to `ResolvedGroup`
```ts
    /** category_groups.kind — 'level' groups are individual levels. */
    kind: 'normal' | 'level';
    /** Level-specific rules (level groups only). */
    rules: string | null;
```
and to `ResolvedCategory`
```ts
    /** Set on level boards: the level category (template) this board instantiates. */
    levelTemplateId?: number | null;
    /** Level board detached from its template (or excluded). */
    levelOverride?: boolean;
```
Fix every literal `ResolvedGroup` in tests/fixtures (`grep -rn "hiddenByDefault:" app src --include=*.test.ts*`) by adding `kind: 'normal', rules: null` — or make both optional with defaults if that churn is large (prefer required + fixture updates; `computeCategoryVisibility` tests construct groups inline).

`src/lib/levels/display.ts`:
```ts
export function levelBoardLabel(
    c: { display: string; levelTemplateId?: number | null; groupName?: string | null },
    templates: ReadonlyArray<{ id: number; display: string }>,
): string {
    if (c.levelTemplateId != null) {
        const t = templates.find((x) => x.id === c.levelTemplateId);
        if (t) return t.display;
    }
    const sep = ' — ';
    const i = c.display.indexOf(sep);
    if (i > 0 && (!c.groupName || c.display.slice(0, i) === c.groupName)) {
        return c.display.slice(i + sep.length);
    }
    return c.display;
}

export function splitLevelBoards<T extends { groupId?: number | null }>(
    categories: T[],
    groups: ReadonlyArray<{ id: number; kind: string }>,
): { fullGame: T[]; levelBoards: T[] } {
    const levelIds = new Set(groups.filter((g) => g.kind === 'level').map((g) => g.id));
    const fullGame: T[] = [];
    const levelBoards: T[] = [];
    for (const c of categories) (c.groupId != null && levelIds.has(c.groupId) ? levelBoards : fullGame).push(c);
    return { fullGame, levelBoards };
}
```

`src/lib/games-v1.ts`:
- `PageDataCategoryFlags` += `display?: string; name?: string; levelTemplateId?: number | null; levelOverride?: boolean; primaryTiming?: string; gameTimeLabel?: string; rules?: string | null; showMilliseconds?: boolean; requireVideo?: boolean; sortAscending?: boolean`.
- `PageDataGroup` += `kind?: string; rules?: string | null`.
- `PageDataForCats` += `levelTemplates?: PageDataCategoryFlags[]`.
- In `resolveCategory`: build `groups` with `kind: g.kind === 'level' ? 'level' : 'normal', rules: g.rules ?? null`; while iterating `g.categories` also collect `levelFlagsById` (the full entry) for level groups; after mapping stat rows, **append** a `ResolvedCategory` for every level-group category not present in the stats rows (zero stats, `totalRunTime: 0`, `totalFinishedAttemptCount: 0`, fields from the pageData entry, `name: normalizeSlug(entry.display)`); set `levelTemplateId`/`levelOverride` on all rows from `flagsById`; apply `isLowActivityCategory` only to rows whose `levelTemplateId == null` and that are not in a level group; return `levelTemplates` mapped from `pageDataResp.result?.levelTemplates ?? []`.

`src/lib/category-mgmt.ts`: `GameCategoryRow` += `levelTemplateId?: number | null; levelOverride?: boolean; name?: string`; `GamePageData` += `levelTemplates?: GameCategoryRow[]`; `ManageGroup` += `kind: 'normal' | 'level'; rules: string | null`; `ManageCategoryRow` += `levelTemplateId: number | null; levelOverride: boolean`; `CreateGroupBody` += `kind?: 'normal' | 'level'; rules?: string | null`; `UpdateGroupBody` += `rules?: string | null`; `listManageGroups` maps `kind`/`rules`; export `listLevelTemplates(gameId): Promise<LevelTemplate[]>` reading `pageData.levelTemplates`.

- [ ] **Step 4: Run**

Run: `npx vitest run src/lib/levels && npx tsc --noEmit -p . 2>&1 | grep -E "leaderboards.types|games-v1|category-mgmt|levels" ; npx vitest run app/\(new-layout\)/games-v2/\[game\]/header`
Expected: helpers PASS; tsc clean for touched files after fixture updates; header tests still PASS.

- [ ] **Step 5: Commit**

```bash
git checkout -b levels
git add types src/lib app
git commit -m "feat(levels): types + pageData threading — level groups, templates, level boards survive zero stats"
```

---

### Task 2: Leaderboard — Levels dropdown + level rules

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/category-visibility.ts`, `category-rail.tsx`, `board-masthead.tsx`, `rules/rules-panel.tsx`, `data.ts`, `types.ts` (`GamePageData` += `levelTemplates`)
- Create: `app/(new-layout)/games-v2/[game]/header/level-picker.tsx`, `level-picker.module.scss`
- Test: `header/category-visibility.test.ts` (extend), `header/level-picker.test.tsx` (create)

**Interfaces:**
- `computeCategoryVisibility(categories, groups, gameDisplayMode)` → `{ sections, levels }` where `levels: { groups: Array<{ id; name; rules; boards: ResolvedCategory[] }>; activeLevelId: number | null }` — level groups are removed from `sections` and returned separately; `sections` behaves exactly as today for everything else.
- `LevelPicker({ levels, activeLevelId, activeCategoryName, templates, boardCounts, onSelect })` — a `<select>` of levels (label "Levels"), then pills for the chosen level's boards (label = `levelBoardLabel`), same `onSelect(name)` contract as `CategoryRail` (writes `?category=`).
- `RulesPanel` gains `levelRules?: string | null` rendered between game rules and category rules, headed by the level name.

- [ ] **Step 1: Failing tests**

Extend `category-visibility.test.ts`:
```ts
it('pulls level groups out of the sections and returns them as levels', () => {
    const groups = [
        { id: 1, name: 'World 1', sortOrder: 1, kind: 'normal' as const, rules: null },
        { id: 2, name: 'E1M1', sortOrder: 2, kind: 'level' as const, rules: 'lvl' },
        { id: 3, name: 'E1M2', sortOrder: 3, kind: 'level' as const, rules: null },
    ];
    const cats = [
        cat({ id: 10, groupId: 1, display: 'Any%' }),
        cat({ id: 20, groupId: 2, display: 'E1M1 — Any%', levelTemplateId: 9 }),
        cat({ id: 30, groupId: 3, display: 'E1M2 — Any%', levelTemplateId: 9 }),
    ];
    const v = computeCategoryVisibility(cats, groups, null, 'e1m2-any');
    expect(v.sections.map((s) => s.id)).toEqual([1]);
    expect(v.levels.groups.map((g) => [g.id, g.boards.map((b) => b.id)])).toEqual([[2, [20]], [3, [30]]]);
    expect(v.levels.activeLevelId).toBe(3);
});
it('returns no levels for a game without level groups', () => {
    const v = computeCategoryVisibility([cat({ id: 1 })], [], null);
    expect(v.levels).toEqual({ groups: [], activeLevelId: null });
});
```
(`cat()` = the file's existing fixture helper; add `levelTemplateId` passthrough if it strips unknown keys.)

`level-picker.test.tsx` (jsdom): renders a `<select aria-label="Level">` with one option per level, selects the active level, shows pills for that level labelled by the template display, and calls `onSelect(board.name)` on pill click and on `<select>` change (first board of the chosen level).

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/header`
Expected: FAIL.

- [ ] **Step 3: Implement**

`category-visibility.ts`: add a 4th optional param `activeCategoryName?: string | null`; before the trivial check, `const levelGroups = groups.filter(g => g.kind === 'level'); const nonLevelGroups = groups.filter(g => g.kind !== 'level');` and `const { fullGame, levelBoards } = splitLevelBoards(visible, groups)`; compute sections from `fullGame`/`nonLevelGroups` exactly as today; `levels = { groups: levelGroups.sort(bySortOrder).map(g => ({ id: g.id, name: g.name, rules: g.rules, boards: sortCategoriesForDisplay(levelBoards.filter(c => c.groupId === g.id)) })).filter(g => g.boards.length > 0), activeLevelId: levelBoards.find(c => c.name === activeCategoryName)?.groupId ?? null }`. Keep the `CategoryVisibility` type: `{ sections; levels }`.

`level-picker.tsx` ('use client'): native `<select>` (matches the rail's dropdown choice for keyboard/AT) + pill buttons reusing the rail's pill classes (import `category-rail.module.scss` or move shared pill styles into a shared module); `aria-pressed` on the active pill; runner counts from `boardCounts?.[c.name]` like the rail. Remember the last chosen level in component state so switching levels without picking a board keeps the dropdown where the user put it.

`category-rail.tsx`: pass `activeCategoryName` through to `computeCategoryVisibility`; render `<LevelPicker>` after the sections when `levels.groups.length > 0`; the "don't render at all" guard must count levels too.

`board-masthead.tsx`: `levelRules = data.groups.find(g => g.id === category.groupId && g.kind === 'level')?.rules ?? null`; pass `levelRules` and `levelName` to `RulesPanel`. `rules-panel.tsx`: render the level tier (heading = level name) between game rules and category rules when `levelRules` is non-empty. `data.ts`: thread `levelTemplates` from `resolveCategory` into `GamePageData`; `sticky-board-bar.tsx`/`switch-board-popover.tsx`: label level boards with `levelBoardLabel` and group them under the level name (they already list grouped).

- [ ] **Step 4: Run**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/header && npx tsc --noEmit -p . 2>&1 | grep "games-v2/\[game\]/header"`
Expected: PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]
git commit -m "feat(levels): leaderboard Levels dropdown, level boards labelled by template, level rules tier"
```

---

### Task 3: Fetchers + server actions

**Files:**
- Create: `src/lib/levels.ts`, `src/actions/levels/create-level.action.ts`, `update-level.action.ts`, `create-level-template.action.ts`, `level-op.action.ts`, `level-overview.action.ts`
- Test: `src/actions/__tests__/levels.action.test.ts`

**Interfaces:**
```ts
// src/lib/levels.ts ('use server')
export async function createLevel(sessionId, gameId, body: { name: string; rules?: string | null; sortOrder?: number }): Promise<{ id: number; created: number }>   // POST /v1/games/{id}/groups { ...body, kind: 'level' }
export async function updateLevel(sessionId, gameId, groupId, body: { name?: string; rules?: string | null }): Promise<void>                               // PUT /v1/games/{id}/groups/{groupId}
export async function createLevelTemplate(sessionId, gameId, body: { display: string; primaryTiming?: string; gameTimeLabel?: string; rules?: string; requireVideo?: boolean; showMilliseconds?: boolean; isMain?: boolean }): Promise<{ id: number; created: number }>  // POST /v1/games/{id}/categories { ...body, isLevelTemplate: true }
export type LevelOp = { op: 'level-exclusion'; groupId: number; templateId: number; excluded: boolean } | { op: 'level-detach'; categoryId: number } | { op: 'level-resync'; categoryId: number } | { op: 'level-push'; templateId: number } | { op: 'level-materialise' };
export async function levelOp(sessionId, gameId, op: LevelOp): Promise<unknown>                                   // POST /v1/games/{id}/categories op
export async function fetchLevelOverview(sessionId, gameId): Promise<LevelOverview>                              // POST /v1/games/{id}/categories { op: 'level-overview' }
// actions: each takes { gameSlug, gameId, ...payload }, returns { result } | { error }, calls updateTag(`game-cats:${gameId}`) on success (overview: no tag).
```

- [ ] **Step 1: Failing action tests** — mirror `src/actions/__tests__/self-evidence.action.test.ts`: mock `~src/actions/session.action` (`getSession` → a user with the right role), mock `~src/lib/levels`, mock `next/cache` (`updateTag`), assert: permission denied → `{ error }`; happy path calls the lib with `session.id` and `updateTag('game-cats:12', …)`; `ApiError` message surfaces as `{ error }`.

- [ ] **Step 2: Run to verify fail** — `npx vitest run src/actions/__tests__/levels.action.test.ts`

- [ ] **Step 3: Implement** — follow `src/actions/category-group/create-group.action.ts` line by line (session → `confirmPermission(user, 'edit', 'category-settings', { game: gameSlug })` → try/catch `ApiError` → `updateTag`).

- [ ] **Step 4: Run** — PASS; `npx tsc --noEmit -p . | grep -E "src/(lib|actions)/levels"` clean.

- [ ] **Step 5: Commit** — `git commit -m "feat(levels): fetchers + server actions over the group/category routes"`

---

### Task 4: Console — Levels pane and Level categories pane

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/levels/levels-pane.tsx`, `level-row.tsx`, `level-categories-pane.tsx`, `levels.module.scss`, `levels-pane.test.tsx`, `level-categories-pane.test.tsx`
- Modify: `manage/console/nav-model.ts` (`NavItemId` += `'levels' | 'level-categories'`; in `ALL_GROUPS.board` after `groups`: `{ id: 'levels', label: CONCEPT_LABEL.levels }, { id: 'level-categories', label: CONCEPT_LABEL['level-categories'] }`; `itemVisible`: both `flags.canConfigure`), `nav-icons.ts` (`levels: Layers`, `'level-categories': Diagram3` from react-bootstrap-icons — verify both exist in `node_modules/react-bootstrap-icons/dist/index.d.ts`, else pick `Stack`/`Columns`), `src/lib/console/vocabulary.ts` (`ConceptId`, `CONCEPT_LABEL.levels = 'Levels'`, `'level-categories' = 'Level categories'`, `TILE_CONCEPT_IDS` after `groups`, `CONCEPT_TILE` entries: levels → `{ action: 'Set up individual levels', blurb: 'List the levels; every level category appears on each one.' }`, level-categories → `{ action: 'Define the level categories', blurb: 'The categories and subcategories every level gets — edit once, applied everywhere.' }`, `BOARD_PANES` += both), `content-router.tsx` (cases), `manage/page.tsx` (load `listLevelTemplates(game.id)` + `listManageGroups` already; pass `levelTemplates` + `groups` to `ConsoleShell` → router), tests: `nav-model.test.ts` (11 → 13; tile-grid count only if moderator-visible — they are configure-only, so `tile-grid.test.tsx` stays 5), `vocabulary.test.ts` (order pin: `groups → levels → level-categories → variables`; update the existing `groups → variables` adjacency assertion accordingly).

**Interfaces:**
- `LevelsPane({ gameId, gameSlug, templates: LevelTemplate[] })` — loads `levelOverviewAction` on mount; list of `LevelRow`s (name inline-editable → `updateLevelAction`; rules textarea behind a disclosure; per-level template checklist → `levelOpAction({ op: 'level-exclusion', … })`; level-only categories listed as "only on this level" with a link to `/manage/category/{id}`; detached boards with "Resync" → `level-resync`); create form (name) → `createLevelAction`; reorder via the existing `reorderGroupsAction` (levels and groups share one order — show "Reorder with groups" hint linking to the Groups pane rather than duplicating drag UI); "Materialise missing boards" button → `level-materialise` (shown only if overview reports fewer instances than levels × templates).
- `LevelCategoriesPane({ gameId, gameSlug })` — loads overview; table of templates: name, Featured, `synced/total` ("14/15 — 1 excluded"), actions: Edit (→ `/manage/category/{templateId}` — the existing detail route works for a template since it's a category; the page must show a "Level category — changes apply to N level boards" banner: Task 5), "Push now" → `level-push`, Archive (existing `updateVisibilityAction` with `active:false` works on the template id). Create form: display + timing → `createLevelTemplateAction`.
- Both panes reuse `consoleStyles.surface/paneHeader/paneTitle`, `FormSection`, `kit.saveBtn`, `InlineError`, and the src-import pane's `table`/`pill` classes (copy into `levels.module.scss`).

- [ ] **Step 1: Failing tests** (jsdom; mock the five actions) — `levels-pane.test.tsx`: renders one row per level from the overview with its instance states; ticking a template checkbox off calls `levelOpAction` with `{ op: 'level-exclusion', groupId, templateId, excluded: true }`; submitting the create form calls `createLevelAction({ gameSlug, gameId, name })` then reloads the overview; an overridden board shows a "Resync" button that calls `level-resync`. `level-categories-pane.test.tsx`: renders `synced/total` per template; "Push now" calls `level-push`; create form calls `createLevelTemplateAction` with `display` and `isMain: true`.
- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement panes + nav wiring + test pins.**
- [ ] **Step 4: Run** — `npx vitest run app/\(new-layout\)/games-v2/\[game\]/manage src/lib/console && npx tsc --noEmit -p . | grep -E "manage/(levels|console)|vocabulary"` → PASS/clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(manage): Levels and Level categories panes"`

---

### Task 5: Console — category index + category detail awareness

**Files:**
- Modify: `manage/console/board-categories-table.tsx` (~121 rows filter, ~143 bands), `manage/category/[categoryId]/page.tsx` + `category-detail.tsx`, `manage/page.tsx` (~122 low-activity drop), `manage/console/categories-pane.tsx` (add dialog pool)
- Test: `board-categories-table.test.tsx` (extend), `category-detail.test.tsx` (create or extend)

- [ ] **Step 1: Failing tests** — index: with 2 level groups × 2 templates (4 level boards, `isMain`), the table shows the full-game bands as before and ONE collapsed band "Level boards (4)" with a "Show level boards" disclosure; expanding lists them grouped by level with labels from the template display. Detail: opening a template shows a banner "Level category — saved changes apply to N level boards"; opening a level board shows "Level board of <template> — synced / detached" with a Detach/Resync control calling `levelOpAction`.
- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement** — `splitLevelBoards(rows, groups)`; render level boards as one band with a disclosure (default collapsed; remember in `localStorage` key `console:levelBoards:${gameId}`); inside, sub-bands per level; reorder scope excludes level boards (their order follows the template). `manage/page.tsx`: keep rows with `levelTemplateId != null` regardless of activity; load `listLevelTemplates` and thread to the index and the detail page. Add-category dialog pool excludes level boards (they are featured via the template). Detail page: look up `levelTemplates`/`levelTemplateId`, render the banner + control; for a template hide the "Group" and "Featured" controls that don't apply (group is fixed null; Featured is pushed) — or leave Featured and explain it propagates.
- [ ] **Step 4: Run + tsc.**
- [ ] **Step 5: Commit** — `git commit -m "feat(manage): level boards collapse in the index; template/instance banners on the detail page"`

---

### Task 6: Typecheck, full tests, PR

- [ ] **Step 1:** `npx tsc --noEmit -p . 2>&1 | grep -v "races\|tournaments\|wrapped\|live\|stories" | head` — expect no new errors.
- [ ] **Step 2:** `npx vitest run` — only the known pre-existing `row-actions` failures.
- [ ] **Step 3:** `npm run lint` clean for touched files; `npx @biomejs/biome check --write` on touched paths.
- [ ] **Step 4:** `git push -u origin levels && gh pr create` with a body listing the panes, the leaderboard dropdown, and the contract doc; mark that it depends on the backend `levels` branch being deployed.

---

## Self-review notes

- Spec coverage: Levels dropdown + level rules (T2), Levels/Level categories panes with exceptions 1–3 (T4: checklist = exclusion, level-only listing, detach/resync), index collapse (T5), types/contract (T1/T3). Zero-stats level boards handled (T1 + T5).
- Open decision flagged for Joey: whether *all* empty categories should appear on the public page (today they don't); this plan only exempts level boards.
- Names: `levelBoardLabel`, `splitLevelBoards`, `levelOpAction`, `createLevelAction`, `createLevelTemplateAction`, `updateLevelAction`, `levelOverviewAction` used consistently across T3–T5.
