# Individual Levels (IL) Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Levels" step to the board setup wizard that lets an owner declare individual levels (and optional level subcategories) with plain names, mapping onto the existing IL backend ops behind the scenes.

**Architecture:** Frontend-only orchestration over existing level actions. A **pure planner** turns wizard state into an ordered, idempotent list of name-keyed ops (create level, move existing category into a level, create a level-only board, create a subcategory, set a matrix exclusion). A thin **executor** runs those ops sequentially, resolving level/subcategory names to the ids returned by create calls. Levels map to `kind:'level'` groups (option A: each level is its own group), subcategories to level templates; the backend auto-materialises the level×subcategory matrix.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest + Testing Library, SCSS modules. Server actions via `apiFetch`.

**Spec:** `docs/plans/2026-08-30-il-setup-wizard-design.md`

## Global Constraints

- **Frontend only.** No backend/CDK changes. Reuse existing ops.
- **Never create a colliding level-only board.** A fresh level-only board is created ONLY when no existing category matches the level name; a match is moved in instead (`curateCategoryAction`). This is both the dedup and the avoidance of the backend's unguarded-create 500.
- **Match by backend slug.** Compare a typed level name's normalised slug to existing categories' `name` (the backend slug), per the `category-slug-backend-name` rule — never guess from `display`.
- **Copy rule:** never reference speedrun.com/SRC in UI text.
- **Biome formatting:** 4-space indent, single quotes, trailing commas, semicolons. Unused vars prefixed `_`.
- **Caching:** server actions already use `updateTag('game-cats:{id}')`; the step re-reads via the wizard's normal refresh — do not add ad-hoc revalidate.
- **Levels are optional and never block** completeness.

---

## File structure

- Create `app/(new-layout)/games-v2/[game]/setup/steps/level-plan.ts` — pure planner + types (the testable core).
- Create `app/(new-layout)/games-v2/[game]/setup/steps/level-plan.test.ts` — planner unit tests.
- Create `src/lib/levels.ts` addition `createLevelOnlyBoard` — POST /categories with a level groupId.
- Create `src/actions/levels/create-level-board.action.ts` — server action wrapper.
- Create `app/(new-layout)/games-v2/[game]/setup/steps/step-levels.tsx` — the step component (progressive form + matrix + save executor).
- Create `app/(new-layout)/games-v2/[game]/setup/steps/step-levels.test.tsx` — render/interaction test.
- Modify `src/lib/setup/completeness.ts` — add `'levels'` id + order + status.
- Modify `src/lib/setup/steps.ts` — add meta + renumber.
- Modify `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` — render `StepLevels`.
- Reuse (no change): `createLevelAction`, `createLevelTemplateAction`, `levelOpAction`, `curateCategoryAction`, `CategoryBandPreview`, `normalizeSlug`.

---

### Task 1: Register the `levels` step

**Files:**
- Modify: `src/lib/setup/completeness.ts:6-13` (SetupStepId), `:60-67` (SETUP_STEP_ORDER)
- Modify: `src/lib/setup/steps.ts:24-43` (SETUP_STEPS)
- Test: `src/lib/setup/__tests__/steps.test.ts`

**Interfaces:**
- Produces: `SetupStepId` now includes `'levels'`; `SETUP_STEP_ORDER` = `['details','categories','levels','groups','category-setup','variables','boards']`; `SETUP_STEPS` has a `{ id:'levels', num:3, label:'Levels', skippable:true }` entry with groups/category-setup/variables/boards renumbered to 4/5/6/7.

- [ ] **Step 1: Update the order test expectation**

In `src/lib/setup/__tests__/steps.test.ts`, find the assertion that `SETUP_STEPS.map(s=>s.id)` equals `SETUP_STEP_ORDER` and the numbering assertion. Add `'levels'` between `'categories'` and `'groups'` in any hard-coded expected array, and update expected `num` values (levels=3, groups=4, category-setup=5, variables=6, boards=7).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/setup/__tests__/steps.test.ts`
Expected: FAIL (order/number mismatch — `'levels'` not yet in the registry).

- [ ] **Step 3: Add the step id and order**

In `src/lib/setup/completeness.ts`, add `| 'levels'` to `SetupStepId` (after `'categories'`), and insert `'levels'` into `SETUP_STEP_ORDER` between `'categories'` and `'groups'`.

- [ ] **Step 4: Add the step meta and renumber**

In `src/lib/setup/steps.ts` `SETUP_STEPS`, insert after the `categories` entry:

```ts
{ id: 'levels', num: 3, label: 'Levels', skippable: true },
```

Renumber the following entries: `groups` → `num: 4`, `category-setup` → `num: 5`, `variables` → `num: 6`, `boards` → `num: 7`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/setup/__tests__/steps.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/setup/completeness.ts src/lib/setup/steps.ts src/lib/setup/__tests__/steps.test.ts
git commit -m "feat(setup): register the Levels wizard step"
```

---

### Task 2: The pure level planner

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/level-plan.ts`
- Test: `app/(new-layout)/games-v2/[game]/setup/steps/level-plan.test.ts`

**Interfaces:**
- Produces:

```ts
export interface LevelSetupState {
    hasLevels: boolean;
    levelNames: string[];        // trimmed, non-empty, de-duped by slug, in order
    hasSubcategories: boolean;
    subcategoryNames: string[];  // trimmed, non-empty, de-duped by slug, in order
    /** Unchecked matrix cells (subcategory excluded from level), by display name. */
    excluded: Array<{ levelName: string; subcategoryName: string }>;
}

export interface ExistingLevels {
    levelGroups: Array<{ id: number; name: string }>;       // kind:'level' groups; name = display
    templates: Array<{ id: number; display: string }>;      // isLevelTemplate categories
    categories: Array<{ id: number; name: string }>;        // full-game categories; name = backend slug
    exclusions: Array<{ groupId: number; templateId: number }>;
}

export type LevelPlanOp =
    | { kind: 'create-level'; levelName: string }
    | { kind: 'move-category'; categoryId: number; levelName: string }
    | { kind: 'create-level-only-board'; display: string; levelName: string }
    | { kind: 'create-subcategory'; display: string }
    | { kind: 'set-exclusion'; levelName: string; subcategoryName: string; excluded: boolean };

export function buildLevelSetupPlan(
    state: LevelSetupState,
    existing: ExistingLevels,
): LevelPlanOp[];
```

- Consumes (later tasks): the executor in Task 4 runs these ops in order, resolving `levelName`→groupId and `subcategoryName`→templateId from create results.

**Planner rules (implement exactly):**
1. If `!state.hasLevels`, return `[]`.
2. Slug helper: `slug(s) = normalizeSlug(s.trim())` (import from `~src/lib/normalize-slug`). Two names "match" iff equal slugs.
3. For each level name not already a level group (by slug vs `existing.levelGroups[].name`), emit `create-level`. Levels already present emit no create.
4. **Boards for each level** — only when `!state.hasSubcategories`:
   - If a full-game category matches the level name by slug (`existing.categories[].name`), emit `move-category` for it.
   - Else emit `create-level-only-board`.
   - (When `hasSubcategories`, emit no board ops — the matrix owns boards.)
5. **Subcategories** — only when `state.hasSubcategories`: for each subcategory name not already a template (by slug vs `existing.templates[].display`), emit `create-subcategory`.
6. **Exclusions** — only when `state.hasSubcategories`: for each `excluded` cell emit `set-exclusion {excluded:true}`. (Re-including a previously excluded cell is out of scope for pass one; do not emit `excluded:false`.)
7. Order of ops: all `create-level` first, then `create-subcategory`, then board ops (`move-category`/`create-level-only-board`), then `set-exclusion`. This lets the executor resolve ids: groups and templates exist before boards/exclusions reference them.

- [ ] **Step 1: Write the failing tests**

```ts
// level-plan.test.ts
import { describe, expect, it } from 'vitest';
import { buildLevelSetupPlan } from './level-plan';

const empty = { levelGroups: [], templates: [], categories: [], exclusions: [] };

describe('buildLevelSetupPlan', () => {
    it('no-op when the game has no levels', () => {
        expect(
            buildLevelSetupPlan(
                { hasLevels: false, levelNames: ['E1M1'], hasSubcategories: false, subcategoryNames: [], excluded: [] },
                empty,
            ),
        ).toEqual([]);
    });

    it('creates a level-only board when no category matches and no subcategories', () => {
        const plan = buildLevelSetupPlan(
            { hasLevels: true, levelNames: ['E1M1'], hasSubcategories: false, subcategoryNames: [], excluded: [] },
            empty,
        );
        expect(plan).toEqual([
            { kind: 'create-level', levelName: 'E1M1' },
            { kind: 'create-level-only-board', display: 'E1M1', levelName: 'E1M1' },
        ]);
    });

    it('moves a matching category in instead of creating (dedup + 500-avoidance)', () => {
        const plan = buildLevelSetupPlan(
            { hasLevels: true, levelNames: ['E1M1'], hasSubcategories: false, subcategoryNames: [], excluded: [] },
            { ...empty, categories: [{ id: 42, name: 'e1m1' }] },
        );
        expect(plan).toEqual([
            { kind: 'create-level', levelName: 'E1M1' },
            { kind: 'move-category', categoryId: 42, levelName: 'E1M1' },
        ]);
    });

    it('skips levels that already exist as level groups', () => {
        const plan = buildLevelSetupPlan(
            { hasLevels: true, levelNames: ['E1M1', 'E1M2'], hasSubcategories: false, subcategoryNames: [], excluded: [] },
            { ...empty, levelGroups: [{ id: 9, name: 'E1M1' }] },
        );
        expect(plan).toEqual([
            { kind: 'create-level', levelName: 'E1M2' },
            { kind: 'create-level-only-board', display: 'E1M2', levelName: 'E1M2' },
        ]);
    });

    it('with subcategories: creates levels + templates, no board ops, all-on = no exclusions', () => {
        const plan = buildLevelSetupPlan(
            { hasLevels: true, levelNames: ['E1M1'], hasSubcategories: true, subcategoryNames: ['Any%', '100%'], excluded: [] },
            empty,
        );
        expect(plan).toEqual([
            { kind: 'create-level', levelName: 'E1M1' },
            { kind: 'create-subcategory', display: 'Any%' },
            { kind: 'create-subcategory', display: '100%' },
        ]);
    });

    it('emits set-exclusion for unchecked cells', () => {
        const plan = buildLevelSetupPlan(
            {
                hasLevels: true, levelNames: ['E1M1'], hasSubcategories: true,
                subcategoryNames: ['Any%'], excluded: [{ levelName: 'E1M1', subcategoryName: 'Any%' }],
            },
            empty,
        );
        expect(plan).toContainEqual({ kind: 'set-exclusion', levelName: 'E1M1', subcategoryName: 'Any%', excluded: true });
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/setup/steps/level-plan.test.ts"`
Expected: FAIL ("buildLevelSetupPlan is not a function" / module not found).

- [ ] **Step 3: Implement the planner**

```ts
// level-plan.ts
import { normalizeSlug } from '~src/lib/normalize-slug';

// ...types from the Interfaces block above...

const slug = (s: string) => normalizeSlug(s.trim());

export function buildLevelSetupPlan(
    state: LevelSetupState,
    existing: ExistingLevels,
): LevelPlanOp[] {
    if (!state.hasLevels) return [];

    const existingLevelSlugs = new Set(existing.levelGroups.map((g) => slug(g.name)));
    const existingTemplateSlugs = new Set(existing.templates.map((t) => slug(t.display)));
    const categoryBySlug = new Map(existing.categories.map((c) => [slug(c.name), c.id]));

    const creates: LevelPlanOp[] = [];
    const boards: LevelPlanOp[] = [];
    for (const name of state.levelNames) {
        if (!existingLevelSlugs.has(slug(name))) {
            creates.push({ kind: 'create-level', levelName: name });
        }
        if (!state.hasSubcategories) {
            const matchId = categoryBySlug.get(slug(name));
            boards.push(
                matchId != null
                    ? { kind: 'move-category', categoryId: matchId, levelName: name }
                    : { kind: 'create-level-only-board', display: name, levelName: name },
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/setup/steps/level-plan.test.ts"`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/steps/level-plan.ts" "app/(new-layout)/games-v2/[game]/setup/steps/level-plan.test.ts"
git commit -m "feat(setup): pure planner mapping level wizard state to ops"
```

---

### Task 3: Level-only board create action

**Files:**
- Modify: `src/lib/levels.ts` (add `createLevelOnlyBoard`)
- Create: `src/actions/levels/create-level-board.action.ts`

**Interfaces:**
- Produces:

```ts
// src/lib/levels.ts
export interface CreateLevelOnlyBoardBody { display: string; groupId: number; }
export async function createLevelOnlyBoard(
    sessionId: string, gameId: number, body: CreateLevelOnlyBoardBody,
): Promise<{ id: number; created: number }>;

// src/actions/levels/create-level-board.action.ts
export async function createLevelBoardAction(input: {
    gameSlug: string; gameId: number; display: string; groupId: number;
}): Promise<{ result: { id: number; created: number } } | { error: string }>;
```

- Consumes: the executor (Task 4) calls `createLevelBoardAction` for `create-level-only-board` ops, passing the groupId resolved from the preceding `create-level`.

- [ ] **Step 1: Add the lib function**

In `src/lib/levels.ts`, mirror `createLevel`'s shape:

```ts
export interface CreateLevelOnlyBoardBody {
    display: string;
    groupId: number;
}

export async function createLevelOnlyBoard(
    sessionId: string,
    gameId: number,
    body: CreateLevelOnlyBoardBody,
): Promise<{ id: number; created: number }> {
    return apiFetch<{ id: number; created: number }>(
        `/v1/games/${gameId}/categories`,
        { method: 'POST', body, sessionId },
    );
}
```

- [ ] **Step 2: Add the server action**

Create `src/actions/levels/create-level-board.action.ts` mirroring `create-level.action.ts` exactly (same permission check `confirmPermission(user,'edit','category-settings',{game})`, same `updateTag`):

```ts
'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createLevelOnlyBoard } from '~src/lib/levels';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    display: string;
    groupId: number;
}

export async function createLevelBoardAction(
    input: Input,
): Promise<{ result: { id: number; created: number } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }
    try {
        const result = await createLevelOnlyBoard(user.id, input.gameId, {
            display: input.display,
            groupId: input.groupId,
        });
        updateTag(`game-cats:${input.gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create level board.' };
    }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "levels.ts|create-level-board" || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/levels.ts src/actions/levels/create-level-board.action.ts
git commit -m "feat(levels): action to create a level-only board in a level group"
```

---

### Task 4: The `StepLevels` component + save executor

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-levels.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (import + `case 'levels'`)
- Test: `app/(new-layout)/games-v2/[game]/setup/steps/step-levels.test.tsx`

**Interfaces:**
- Consumes: `StepProps` (`{ data: WizardData; onAdvance; onBack }`), `buildLevelSetupPlan`, `createLevelAction`, `createLevelTemplateAction`, `createLevelBoardAction`, `curateCategoryAction`, `levelOpAction`, `CategoryBandPreview`.
- Produces: `export function StepLevels(props: StepProps)`.

**Existing-state derivation (from `data`):**
- `levelGroups = data.groups.filter(g => g.kind === 'level')`
- `templates` — from `data`; level templates are served under `pageData.levelTemplates`. Read them off `data.game`/pageData if present (`data` may expose `levelTemplates`; if not surfaced on WizardData, derive from categories with `isLevelTemplate`). Verify the field during implementation; fall back to `[]`.
- `categories = data.categories.filter(c => !c.archived).map(c => ({ id: c.id, name: c.name }))`
- Initial form state seeded from existing: `hasLevels = levelGroups.length > 0`, `levelNames = levelGroups.map(g => g.name)`, likewise subcategories from templates.

**Executor (the save handler) — resolve names→ids as you create:**

```ts
const runPlan = async (plan: LevelPlanOp[]) => {
    const groupIdByLevelSlug = new Map<string, number>(
        levelGroups.map((g) => [slug(g.name), g.id]),
    );
    const templateIdBySubSlug = new Map<string, number>(
        templates.map((t) => [slug(t.display), t.id]),
    );
    for (let i = 0; i < plan.length; i++) {
        const op = plan[i];
        setProgress(`Saving ${i + 1} / ${plan.length}…`);
        if (op.kind === 'create-level') {
            const res = await createLevelAction({ gameSlug, gameId, name: op.levelName });
            if ('error' in res) return op.levelName; // failing name
            groupIdByLevelSlug.set(slug(op.levelName), res.result.id);
        } else if (op.kind === 'create-subcategory') {
            const res = await createLevelTemplateAction({ gameSlug, gameId, display: op.display });
            if ('error' in res) return op.display;
            templateIdBySubSlug.set(slug(op.display), res.result.id);
        } else if (op.kind === 'move-category') {
            const groupId = groupIdByLevelSlug.get(slug(op.levelName))!;
            const res = await curateCategoryAction({ gameSlug, gameId, categoryId: op.categoryId, groupId });
            if ('error' in res) return op.levelName;
        } else if (op.kind === 'create-level-only-board') {
            const groupId = groupIdByLevelSlug.get(slug(op.levelName))!;
            const res = await createLevelBoardAction({ gameSlug, gameId, display: op.display, groupId });
            if ('error' in res) return op.display;
        } else if (op.kind === 'set-exclusion') {
            const groupId = groupIdByLevelSlug.get(slug(op.levelName))!;
            const templateId = templateIdBySubSlug.get(slug(op.subcategoryName))!;
            const res = await levelOpAction({ gameId, op: { op: 'level-exclusion', groupId, templateId, excluded: op.excluded } });
            if ('error' in res) return op.subcategoryName;
        }
    }
    return null; // success
};
```

`save()` calls `buildLevelSetupPlan(state, existing)`, then `runPlan`; on `null` calls `onAdvance()`, else sets an error naming the failing item. Wrap in `useTransition` like `StepGroups.save`.

**Presentation (progressive form):**
1. `StepHeader step="levels" title="Does this game have individual levels?"`.
2. A checkbox "This game has individual levels" bound to `hasLevels`. Off → show a one-line explainer + a Continue button calling `onAdvance` (nothing to save).
3. When on: a level-names list input (reuse the pattern from `GroupBuilder`'s add-row, or a `<textarea>` one-name-per-line parsed on change). Validate: trim, drop blanks, warn on duplicate slugs.
4. `CategoryBandPreview` showing the Levels dropdown for the typed levels (build preview categories/groups from current state; a single "Levels" section per option A — reuse how `step-groups` feeds `levelGroups` to the preview).
5. A checkbox "These levels have subcategories" bound to `hasSubcategories`. When on: a subcategory-names list input, then the matrix.
6. Matrix: a table, rows = levels, cols = subcategories, each cell a checkbox defaulting checked; unchecking adds `{levelName, subcategoryName}` to `excluded`. Reuse `.table` / `.colCenter` classes already in `setup.module.scss`.
7. `Save & continue` button (disabled while saving) + a `progress` line.

- [ ] **Step 1: Write the failing render test**

```tsx
// step-levels.test.tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StepLevels } from './step-levels';

vi.mock('./level-plan', async (orig) => await orig());

const data = {
    game: { id: 1, name: 'doom' },
    categories: [],
    groups: [],
    // ...minimal WizardData shape; cast as any in the test
} as any;

describe('StepLevels', () => {
    it('hides level inputs until "has individual levels" is checked', () => {
        render(<StepLevels data={data} onAdvance={() => {}} onBack={() => {}} />);
        expect(
            screen.getByRole('checkbox', { name: /individual levels/i }),
        ).not.toBeChecked();
        expect(screen.queryByLabelText(/your levels/i)).not.toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/setup/steps/step-levels.test.tsx"`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `StepLevels`**

Build the component per the Presentation + Executor sections above. Keep the save executor exactly as specified. Import `slug` as `const slug = (s:string)=>normalizeSlug(s.trim())`. Derive `gameSlug = data.game.name`, `gameId = data.game.id`.

- [ ] **Step 4: Wire into the wizard shell**

In `wizard-shell.tsx`, add `import { StepLevels } from './steps/step-levels';` near the other step imports, and a case in the `switch (step)`:

```tsx
case 'levels':
    return <StepLevels data={data} onAdvance={onAdvance} onBack={onBack} />;
```

Also add `'levels'` wherever the shell lists non-wide/other steps if needed (check the `step === 'category-setup' || …` width block at ~line 151 — levels is a normal-width form step, so it does NOT go in the wide list).

- [ ] **Step 5: Run the render test**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/setup/steps/step-levels.test.tsx"`
Expected: PASS.

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit 2>&1 | grep -E "step-levels|wizard-shell" || echo "clean"`
Expected: `clean`.

- [ ] **Step 7: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/steps/step-levels.tsx" "app/(new-layout)/games-v2/[game]/setup/steps/step-levels.test.tsx" "app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx"
git commit -m "feat(setup): Levels wizard step — progressive form + save executor"
```

---

### Task 5: Completeness status + summary for the Levels step

**Files:**
- Modify: `src/lib/setup/completeness.ts` (status rule + input if needed)
- Test: existing completeness test file (find via `grep -rl "computeCompleteness\|BoardCompleteness" src/lib/setup`)

**Interfaces:**
- Consumes: `CompletenessInput` — add an optional `levelGroupCount?: number` if the status needs it; the step is `done` when `levelGroupCount > 0`, else `todo`. Never `blocker`/`warning`.

- [ ] **Step 1: Write the failing test**

In the completeness test, add a case: given input with `levelGroupCount: 0`, the `levels` step status is `'todo'`; with `levelGroupCount: 2`, it is `'done'`. Summary strings: `'No levels yet'` / `'{n} levels'`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run <completeness test path>`
Expected: FAIL (no `levels` step in the produced `steps`).

- [ ] **Step 3: Implement the status rule**

Add `levelGroupCount?: number` to `CompletenessInput`. In the function that builds `steps`, push a `levels` `SetupStepState` between `categories` and `groups`:

```ts
const levelCount = input.levelGroupCount ?? 0;
steps.push({
    step: 'levels',
    status: levelCount > 0 ? 'done' : 'todo',
    summary: levelCount > 0 ? `${levelCount} levels` : 'No levels yet',
});
```

Ensure it is inserted in the correct order position (or sort by `SETUP_STEP_ORDER` if the builder already does).

- [ ] **Step 4: Feed `levelGroupCount` at the call site**

Find where `CompletenessInput` is assembled for the wizard (grep `computeCompleteness(` / `groupCount:`), and pass `levelGroupCount: groups.filter(g => g.kind === 'level').length`.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run <completeness test path>`
Expected: PASS.

- [ ] **Step 6: Full suite + typecheck**

Run: `npx vitest run src/lib/setup && npx tsc --noEmit 2>&1 | grep -E "completeness" || echo "clean"`
Expected: setup tests PASS; `clean`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/setup/completeness.ts <completeness test path> <call site file>
git commit -m "feat(setup): completeness status for the Levels step"
```

---

## Self-Review notes

- **Spec coverage:** checkbox gate → Task 4 step 2; level names + match-or-create → Tasks 2+3+4; subcategories → Tasks 2+4; matrix/exclusions → Tasks 2+4; preview → Task 4; step placement/renumber → Task 1; optional/non-blocking completeness → Task 5; 500-avoidance → Task 2 rule 4 + Global Constraints.
- **Verify-during-implementation flags (not placeholders — real lookups):** (a) whether `WizardData` already surfaces `levelTemplates`, else derive from `isLevelTemplate` categories (Task 4); (b) exact completeness builder call site (Task 5 step 4); (c) `levelOpAction` input shape for `level-exclusion` — confirm it is `{ gameId, op: { op:'level-exclusion', groupId, templateId, excluded } }` against `src/actions/levels/level-op.action.ts` and `LevelOp` in `src/lib/levels.ts`.
- **Out of scope (pass one):** removing a level/subcategory (deleting boards) and re-including an excluded cell — the step only adds/updates; deletion stays in the console.
