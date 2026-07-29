# Category-Centric Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the games-v2 setup wizard from seven steps to five (Game → Categories → Groups → Category setup → Boards), with a shared per-category editor and a board-curation final step that also mounts as a console pane.

**Architecture:** The wizard step canon lives in `src/lib/setup/completeness.ts` + `steps.ts`; changing the `SetupStepId` union ripples through the shell, rail, checklist card and vocabulary by design. The per-category editor is extracted from the console's `category-detail.tsx` (already a thin composition over shared sections) and rendered by both console and wizard. The Boards step is a new `BoardCuration` component over the existing mod roster/exclusion/manual-time APIs, plus three backend contract items (game columns, mark-for-later, board override) that are defined in a handoff doc first and mirrored into frontend types.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, vitest (`npx vitest run`), Biome formatting, server actions in `*.action.ts` files, backend via `apiFetch`/`modFetch`.

**Spec:** `docs/superpowers/specs/2026-07-30-category-centric-setup-design.md`

## Global Constraints

- Branch: `setup-category-centric` in `therun-fr`. **Never push to main. Never open a PR** (Joey opens PRs himself).
- Typecheck/lint are NOT clean on main (~356 pre-existing errors). Gate on a **baseline diff**: capture `npm run typecheck 2>&1 | sort > /tmp/base.txt` from the branch point, compare after your change; only NEW errors are yours. Same for lint.
- Typographic apostrophes (`’`) in all user-facing copy, never `'`. Check with `grep -P "[A-Za-z]'[A-Za-z]"` on changed files.
- Biome formats on commit (4-space indent, single quotes, trailing commas). Unused vars prefixed `_`.
- Design principles (binding, from spec): hierarchy from type/spacing/scale, **no gradient washes**; one obvious action per moment; reversible actions apply instantly with undo toasts — confirmation dialogs ONLY for ban; the board preview must look like the public board, not a queue.
- `revalidateTag(tag, profile)` needs 2 args; for read-your-writes flows use `updateTag(tag)` (server actions do NOT read their own `revalidateTag` writes).
- min_time policy value keys are `{ minTimeMs, minGameTimeMs }` — anything else 400s.
- Never leave a dev server running; never `rm -rf .next` or build while one runs.
- Backend items 1–3 do not exist yet. Tasks 10–13 build against the contract from Task 1; until the backend ships, those controls fail with a toast — acceptable on this branch, it cannot merge before the backend lands. Everything else works against production APIs today.
- Timing enums: `ResolvedGame.primaryTiming`/`ResolvedCategory.primaryTiming` use `'rt' | 'gt'`; `PrimaryTiming` from `~src/lib/category-mgmt` uses `'realtime' | 'gametime'`; `ModTiming` (moderation) is its own type. Convert explicitly at every seam.

## File Structure

```
docs/plans/2026-07-30-category-centric-backend-handoff.md   (new, Task 1)
types/leaderboards.types.ts                                  (modify: game fields)
types/moderation.types.ts                                    (modify: roster row fields)
src/lib/game-mgmt.ts                                         (modify: UpdateGameBody/GameMetadata)
src/lib/moderation/curation.ts                               (new: markRuns/setBoardOverride fetchers)
src/lib/variables/keys.ts                                    (new: parse/build subcategory keys)
src/lib/setup/completeness.ts                                (modify: new step canon)
src/lib/setup/steps.ts                                       (modify: 5 steps)
src/lib/setup/category-status.ts                             (new: hub row status)
src/lib/setup/copy-category.ts                               (new: copy-from planner)
src/lib/setup/game-minimum.ts                                (new: min policy helpers)
src/lib/console/vocabulary.ts                                (modify: boards concept)
app/(new-layout)/games-v2/[game]/setup/
    wizard-shell.tsx                                         (modify: 5-step switch, legacy map)
    types.ts                                                 (unchanged shape, WizardData reused)
    steps/step-details.tsx                                   (modify: Board defaults section)
    steps/step-category-setup.tsx                            (new: hub)
    steps/step-boards.tsx                                    (new: curation + go-live footer)
    steps/step-defaults.tsx, step-exceptions.tsx,
    steps/step-variables.tsx, step-finish.tsx                (DELETE in Task 8)
app/(new-layout)/games-v2/[game]/manage/
    category/category-editor.tsx                             (new: shared editor)
    category/[categoryId]/category-detail.tsx                (modify: use editor)
    boards/board-curation.tsx                                (new: shared curation view)
    boards/board-curation.test.tsx                           (new)
    boards/row-actions.tsx, add-runner-row.tsx,
    boards/board-controls.tsx                                (new: split by responsibility)
    moderation/shared/actions/marks.action.ts                (new)
    moderation/shared/actions/board-override.action.ts       (new)
    moderation/shared/actions/eligible-runs.action.ts        (new)
    console/nav-model.ts                                     (modify: boards item)
    console/console-shell.tsx                                (modify: boards pane)
app/(new-layout)/games-v2/[game]/setup/actions/
    update-game-metadata.action.ts                           (modify: new fields)
    curate-category.action.ts                                (modify: seed param)
app/(new-layout)/games-v2/[game]/game-page.tsx               (modify: game rules display)
```

---

### Task 1: Backend handoff contract + frontend type mirrors

**Files:**
- Create: `docs/plans/2026-07-30-category-centric-backend-handoff.md`
- Modify: `types/moderation.types.ts` (roster row), `src/lib/game-mgmt.ts` (UpdateGameBody, GameMetadata)
- Create: `src/lib/moderation/curation.ts`

**Interfaces:**
- Produces: `UpdateGameBody` gains `primaryTiming?: 'rt' | 'gt'; rulesTemplate?: string | null; gameRules?: string | null; emulatorPolicy?: 'allowed' | 'banned' | null`. `GameMetadata` gains the same three string fields (read side). `LeaderboardRosterRow` gains `markedForLater?: boolean; boardOverride?: { categoryId: number; subcategoryKey: string } | null`. `src/lib/moderation/curation.ts` exports `markRuns(sessionId, gameId, input: { runIds: number[]; marked: boolean }): Promise<{ updated: number }>` and `setBoardOverride(sessionId, gameId, runId, target: { categoryId: number; subcategoryKey: string } | null): Promise<{ updated: boolean }>`.

- [ ] **Step 1: Write the handoff doc.** Full contract, in the style of `docs/frontend-guide-*.md` but reversed (frontend → backend request). Contents:

```markdown
# Backend handoff: category-centric setup (3 items)

Frontend branch `setup-category-centric` builds against this contract.
Base path for items 2–3: `/v1/leaderboards/games/:gameId` (mod auth, same as
mass-mgmt endpoints).

## 1. Game-level board configuration columns

New nullable columns on `games`:
- `rules_template` TEXT — category rules template, seeds new featured categories
- `game_rules` TEXT — rules shown above category rules on every board
- `emulator_policy` TEXT CHECK IN ('allowed','banned')

Update endpoint (existing game update used by update-game-metadata.action):
accept `rulesTemplate`, `gameRules`, `emulatorPolicy`, and `primaryTiming`
('rt'|'gt', existing column). Read side: include all four in the mod game
payload consumed by getGameMetadata, and gameRules + emulatorPolicy in the
public game/pageData payload.

## 2. Mark-for-later run flag

- `PUT /v1/leaderboards/games/:gameId/runs/marks` body
  `{ "runIds": number[], "marked": boolean }` → `{ "updated": number }`.
  Shared across the game's mods (not per-mod). Audit-logged like verdicts.
- Roster rows (`GET .../categories/:categoryId/eligible-runs`) gain
  `markedForLater: boolean`.
- Roster filter gains optional `markedForLater=true` query param.

## 3. Board assignment override

- `PUT /v1/leaderboards/games/:gameId/runs/:runId/board-override` body
  `{ "categoryId": number, "subcategoryKey": string }` or `null` to clear
  → `{ "updated": boolean }`. Run data untouched; boards/rosters resolve the
  override when placing the run. Designed so a runner-suggested variant can
  layer on later (override row keeps an `origin` slot: 'mod' now).
- Roster rows gain `boardOverride: { categoryId, subcategoryKey } | null`.
```

- [ ] **Step 2: Mirror types.** In `types/moderation.types.ts` add to `LeaderboardRosterRow` (after `isLeaderboardEntryGt`):

```ts
    /** Backend item 2 (2026-07-30 handoff): shared mark-for-later flag. */
    markedForLater?: boolean;
    /** Backend item 3: mod-set board assignment override; run data untouched. */
    boardOverride?: { categoryId: number; subcategoryKey: string } | null;
```

Add `markedForLater?: boolean` to `RosterFilter`. In `src/lib/game-mgmt.ts` extend `UpdateGameBody` and `GameMetadata` with the fields from Interfaces, and map them in the `getGameMetadata` return (same pattern as `summaryOverride`: `data?.game?.rulesTemplate ?? null` etc.).

- [ ] **Step 3: Create `src/lib/moderation/curation.ts`:**

```ts
import { modFetch } from './mod-fetch';

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}`;

export function markRuns(
    sessionId: string,
    gameId: number,
    input: { runIds: number[]; marked: boolean },
): Promise<{ updated: number }> {
    return modFetch(`${base(gameId)}/runs/marks`, {
        sessionId,
        method: 'PUT',
        body: input,
    });
}

export function setBoardOverride(
    sessionId: string,
    gameId: number,
    runId: number,
    target: { categoryId: number; subcategoryKey: string } | null,
): Promise<{ updated: boolean }> {
    return modFetch(`${base(gameId)}/runs/${runId}/board-override`, {
        sessionId,
        method: 'PUT',
        body: target,
    });
}
```

Match `modFetch`'s existing option shape (see `src/lib/moderation/manual-times.ts`) — if `body` must be pre-stringified or `method` named differently there, copy that convention.

- [ ] **Step 4: Verify.** `npm run typecheck` — no NEW errors vs baseline. There is no runtime to test (pure types + fetchers against a not-yet-live contract).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(setup): backend handoff contract + type mirrors for category-centric setup"`

---

### Task 2: Subcategory key helpers

**Files:**
- Create: `src/lib/variables/keys.ts`, `src/lib/variables/__tests__/keys.test.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/variables/combinations-section.tsx` (use the shared helper, delete its local `parseKey`)

**Interfaces:**
- Produces: `parseSubcategoryKey(key: string): { name: string; value: string }[]` and `buildSubcategoryKey(parts: { name: string; value: string }[]): string` (joins `name=value` with `|`, sorted by `name` for stability). Consumed by Tasks 9–12.

- [ ] **Step 1: Write failing tests** in `src/lib/variables/__tests__/keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildSubcategoryKey, parseSubcategoryKey } from '../keys';

describe('parseSubcategoryKey', () => {
    it('splits pipe-joined name=value pairs', () => {
        expect(parseSubcategoryKey('platform=pc|version=1.0')).toEqual([
            { name: 'platform', value: 'pc' },
            { name: 'version', value: '1.0' },
        ]);
    });
    it('returns [] for the empty key (the no-variables board)', () => {
        expect(parseSubcategoryKey('')).toEqual([]);
    });
    it('tolerates a pair without =', () => {
        expect(parseSubcategoryKey('weird')).toEqual([
            { name: 'weird', value: '' },
        ]);
    });
});

describe('buildSubcategoryKey', () => {
    it('round-trips parse, sorted by name', () => {
        const key = buildSubcategoryKey([
            { name: 'version', value: '1.0' },
            { name: 'platform', value: 'pc' },
        ]);
        expect(key).toBe('platform=pc|version=1.0');
    });
    it('builds the empty key from no parts', () => {
        expect(buildSubcategoryKey([])).toBe('');
    });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run src/lib/variables/__tests__/keys.test.ts` — FAIL (module missing).
- [ ] **Step 3: Implement** — lift the exact `parseKey` body from `combinations-section.tsx:22-30` into `parseSubcategoryKey`; `buildSubcategoryKey` sorts by `name` then joins `${name}=${value}` with `|`. **Before shipping, verify sorting matches reality:** load a real combo key from any managed game (`loadCombinationsAction`) or check how the backend orders pairs in `subcategoryKey` values in `types/moderation.types.ts` fixtures/tests — if backend order is variable `sortOrder` rather than alphabetical, sort by that instead and adjust the test.
- [ ] **Step 4: Run to pass**, rewire `combinations-section.tsx` to import `parseSubcategoryKey` and delete its local copy. Run its test: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/variables"`.
- [ ] **Step 5: Commit** — `git commit -m "refactor(variables): shared subcategory key helpers"`

---

### Task 3: Extract the shared CategoryEditor

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/category/category-editor.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/category/[categoryId]/category-detail.tsx`

**Interfaces:**
- Produces: `CategoryEditor` props `{ game: ResolvedGame; category: ResolvedCategory; canConfigure: boolean; canModerate: boolean; canEditStandards: boolean; context: 'console' | 'wizard' }`. Renders the section rail + sections exactly as `category-detail.tsx` does today (`SECTIONS` array, IntersectionObserver highlight, `CONCEPT_LABEL` headings). Consumed by Task 7 (wizard hub) and stays under `category-detail.tsx`.

- [ ] **Step 1: Move the body.** Cut everything from `category-detail.tsx` below the `<header>` (the `SECTIONS` const, `SectionId`, observer effect, `body` record, rail + sections JSX, and the `category-detail.module.scss` classes they use) into `category-editor.tsx`. The new component takes the props above; `context` currently only exists so Task 7 can pass `'wizard'` — no behavioral difference yet beyond `context === 'console'` keeping the section-rail sticky offset as-is (the wizard shell has its own header height; adjust with a `data-context` attribute on the wrapper for the SCSS to key on). Move `category-detail.module.scss` rules for rail/sections into a new `category-editor.module.scss` imported by the editor; the detail keeps only header styles.
- [ ] **Step 2: Slim the detail.** `category-detail.tsx` keeps its header (back link, title, prev/next) and renders `<CategoryEditor game={game} category={category} canConfigure={canConfigure} canModerate={canModerate} canEditStandards={canEditStandards} context="console" />`.
- [ ] **Step 3: Verify** — `npm run typecheck` (baseline diff), then `npm run dev`, open `/games-v2/<any-game>/manage/category/<id>` and confirm the detail screen renders identically (rail highlight works, all sections present). **Kill the dev server.**
- [ ] **Step 4: Commit** — `git commit -m "refactor(console): extract CategoryEditor from category-detail"`

---

### Task 4: Copy-from-category planner + editor UI

**Files:**
- Create: `src/lib/setup/copy-category.ts`, `src/lib/setup/__tests__/copy-category.test.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/category/category-editor.tsx` (header control)

**Interfaces:**
- Consumes: `ResolvedCategory`, `VariableRow`, `BoardPolicyRow`, `UpsertVariableInput` (from `~src/lib/leaderboard-variables`).
- Produces:

```ts
export interface CopyChoices {
    rules: boolean;
    timing: boolean;
    proof: boolean;
    minimum: boolean;
    variables: boolean;
}
export type CopyStep =
    | { kind: 'rules'; rules: string }
    | { kind: 'timing'; primaryTiming: 'realtime' | 'gametime'; hideRealTime: boolean; hideGameTime: boolean }
    | { kind: 'proof'; requireVideo: boolean; requireVideoTopN: number | null; showMilliseconds: boolean }
    | { kind: 'minimum'; value: { minTimeMs?: number; minGameTimeMs?: number }; targetPolicyId: number | null }
    | { kind: 'variable'; body: UpsertVariableInput }
    | { kind: 'combinations'; sourceCategoryId: number };
export interface CopyPlan { steps: CopyStep[]; overwrites: string[] }
export function planCategoryCopy(input: {
    source: ResolvedCategory;
    target: ResolvedCategory;
    choices: CopyChoices;
    variables: VariableRow[];   // all game variables
    policies: BoardPolicyRow[]; // all game policies
}): CopyPlan;
```

- [ ] **Step 1: Failing tests** for the planner (pure function — this is where the test value is):

```ts
// src/lib/setup/__tests__/copy-category.test.ts — representative cases:
// 1. rules choice, target has rules  -> step present, overwrites includes 'Rules'
// 2. rules choice, source has none   -> no rules step
// 3. timing maps 'rt' -> 'realtime'
// 4. minimum: source has category-scoped min_time policy -> step carries its
//    value keys verbatim ({ minTimeMs } only when source primary is rt);
//    targetPolicyId = target's existing category min policy id or null
// 5. variables: source-scoped VariableRow becomes UpsertVariableInput with
//    categoryId=target.id, same name/role/values/defaultValueIndex/sortOrder;
//    game-wide (categoryId=null) variables are NOT copied
// 6. variables choice with source variables -> plan also gains one
//    { kind: 'combinations', sourceCategoryId } step; overwrites lists
//    'Variables (N)' when target already has category-scoped variables
```

Write these as concrete `it()` blocks with literal fixture objects (a `ResolvedCategory` needs only the fields the planner reads: `id`, `display`, `primaryTiming`, `rules`, `hideRealTime`, `hideGameTime`, `requireVideo`, `requireVideoTopN`, `showMilliseconds` — build a `mkCat(overrides)` helper in the test file).

- [ ] **Step 2: Run to fail** — `npx vitest run src/lib/setup/__tests__/copy-category.test.ts`.
- [ ] **Step 3: Implement `planCategoryCopy`** per the interface. Minimum policies: `policies.filter(p => p.policyType === 'min_time' && p.categoryId === source.id)`, take the first; carry `p.value` through unchanged. `overwrites` collects human labels ('Rules', 'Timing', 'Proof', 'Minimum time', 'Variables (2)') for anything the target already has a non-empty value for.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Editor UI.** In `CategoryEditor`, add a header-right control: `Copy from…` opens a small popover — source `<select>` (all featured categories except self), five checkboxes (all checked), an overwrite warning list rendered from `plan.overwrites` ("Replaces: Rules · Variables (2)"), and one Apply button. Apply executes the plan sequentially with existing actions:
  - `rules`/`proof` → `updateCategorySettingsAction({ gameSlug, gameId, categoryId: target.id, ...fields })`
  - `timing` → `updateTimingSettingsAction({ gameSlug, gameId, categoryId: target.id, primaryTiming, hideRealTime, hideGameTime })`
  - `minimum` → `targetPolicyId ? updatePolicyAction(gameSlug, targetPolicyId, value) : createPolicyAction(gameSlug, { policyType: 'min_time', value, categoryId: target.id })` (from `manage/moderation/policies/actions/policies-actions.action`)
  - `variable` → `createVariableAction` / `updateVariableAction` (`manage/variables/actions/…`, body is the `UpsertVariableInput`; update when the target already has a category variable of the same `nameNormalized`, create otherwise)
  - `combinations` → `loadCombinationsAction` for the source category, rewrite each key's category scope implicitly (keys carry no category), `saveCombinationsAction` for the target.
  On completion `router.refresh()` and a success toast naming what was copied. Per-step failure: stop, show the error inline in the popover, list which steps already applied.
- [ ] **Step 6: Verify in dev** (real game with two categories: copy rules+timing, confirm target updated; kill server). Typecheck baseline diff.
- [ ] **Step 7: Commit** — `git commit -m "feat(console): copy-from-category in the category editor"`

---

### Task 5: Game-level defaults plumbing

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/actions/update-game-metadata.action.ts` (pass-through for the four new fields)
- Create: `src/lib/setup/game-minimum.ts`, `src/lib/setup/__tests__/game-minimum.test.ts`

**Interfaces:**
- Consumes: Task 1's `UpdateGameBody` fields.
- Produces:

```ts
// src/lib/setup/game-minimum.ts
import type { BoardPolicyRow } from '../../../types/moderation.types';
/** The categoryId-null min_time policy, if set. */
export function findGameMinPolicy(policies: BoardPolicyRow[]): BoardPolicyRow | undefined;
/** Category-scoped min_time policy for one category. */
export function findCategoryMinPolicy(policies: BoardPolicyRow[], categoryId: number): BoardPolicyRow | undefined;
/** Timing-bound value: rt -> { minTimeMs }, gt -> { minGameTimeMs }. Never both. */
export function minValueForTiming(timing: 'rt' | 'gt', ms: number): { minTimeMs: number } | { minGameTimeMs: number };
/** The ms shown in an input for a policy, honoring the timing binding. */
export function minMsFromPolicy(policy: BoardPolicyRow | undefined, timing: 'rt' | 'gt'): number | null;
```

- [ ] **Step 1: Failing tests** — `minValueForTiming('rt', 600000)` → `{ minTimeMs: 600000 }` and has NO `minGameTimeMs` key; `('gt', …)` symmetric; `findGameMinPolicy` picks `policyType === 'min_time' && categoryId === null && subcategoryKey === null` (fixture list with a category-scoped decoy); `minMsFromPolicy(policy, 'rt')` reads `value.minTimeMs` and ignores `minGameTimeMs`.
- [ ] **Step 2: Run to fail, implement, run to pass** — `npx vitest run src/lib/setup/__tests__/game-minimum.test.ts`.
- [ ] **Step 3: Extend the action.** `update-game-metadata.action.ts` wraps `updateGame` with an allowlisted input — add `primaryTiming`, `rulesTemplate`, `gameRules`, `emulatorPolicy` to its input type and body pass-through (read the file first; mirror how `summaryOverride` flows through).
- [ ] **Step 4: Typecheck baseline diff; commit** — `git commit -m "feat(setup): game-level defaults plumbing (timing, template, rules, emulator)"`

---

### Task 6: Step 1 gains the Board defaults section

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx`

**Interfaces:**
- Consumes: Task 5's helpers + extended action; `WizardData.policies`, `data.metadata` (now carrying `rulesTemplate`/`gameRules`/`emulatorPolicy`), `data.game.primaryTiming`.
- Produces: step 1 saves game-level values only — **no category stamping here** (that's Task 7's seeding).

- [ ] **Step 1: Build the section.** Below the existing details form add a `Board defaults` section (`styles.section`, `h6` headings — match the file's existing structure):
  - **Timing** — RTA/IGT segmented pair (radio group styled as the wizard's existing pills), initial value `data.game.primaryTiming ?? 'rt'`, saved as `primaryTiming`.
  - **Category rules template** — textarea, initial `data.metadata.rulesTemplate ?? RULES_STARTER_TEMPLATE` (import from `~src/lib/setup/rules-template`), helper line "Seeds the rules of every category you feature. Fill in the [brackets]."
  - **Game rules** — textarea, initial `data.metadata.gameRules ?? ''`, helper "Shown above category rules on every board."
  - **Emulator policy** — three radios: Not specified (null) / Allowed / Banned.
  - **Minimum time** — ONE input labeled by the chosen timing ("Minimum real time" / "Minimum in-game time"), parsed with `parseTimeInput`, displayed with `formatTimeInput` (both `~src/lib/time-input`). Initial from `minMsFromPolicy(findGameMinPolicy(data.policies), timing)`. Empty input + existing policy → delete the policy. **Only the timing-bound key is ever written** (`minValueForTiming`). Save via `createPolicyAction`/`updatePolicyAction`/`deletePolicyAction` exactly as `step-defaults.tsx:204-233` does today (track `minPolicyId` state seeded from the found policy to avoid duplicate creates).
  - Save-and-continue button extends the step's existing save handler: one `updateGameMetadataAction` call with the four new fields, then the min-policy write, then `onAdvance()`. Errors render in the step's existing error slot; partial failure keeps the user on the step.
- [ ] **Step 2: Verify in dev** — set IGT + a minimum; reload; the input shows the saved value under the IGT label; switch to RTA and confirm the field relabels and the IGT value is not silently carried into `minTimeMs`. Save will fail against prod backend until item 1 ships for the game fields — the min policy save works today; confirm at least that. Kill the server.
- [ ] **Step 3: Commit** — `git commit -m "feat(setup): board defaults on step 1"`

---

### Task 7: Seeding on feature + category status lib

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/actions/curate-category.action.ts`
- Create: `src/lib/setup/category-status.ts`, `src/lib/setup/__tests__/category-status.test.ts`

**Interfaces:**
- Produces: `curateCategoryAction` input gains `seed?: { primaryTiming: 'realtime' | 'gametime'; rulesTemplate: string | null }` — applied only when `input.isMain === true`, writing `primaryTiming` always and `rules` only when the category's current rules are empty. And:

```ts
// src/lib/setup/category-status.ts
export interface CategorySetupStatus {
    categoryId: number;
    ok: boolean;
    /** Human parts for the hub row, e.g. ['RTA', 'min 10:00', '2 variables'] */
    parts: string[];
    /** What's missing, e.g. ['rules'] — nonempty => warning row */
    missing: string[];
}
export function categorySetupStatus(
    cat: ResolvedCategory,
    variables: VariableRow[],
    policies: BoardPolicyRow[],
): CategorySetupStatus;
```

- [ ] **Step 1: Failing tests for `categorySetupStatus`** — category with rules+rt+category min+2 category variables → `ok: true`, parts `['RTA', 'min 10:00', '2 variables']`; category without rules → `missing: ['rules']`, ok false; game-wide min policy counts as covered (part `'min 10:00 (game-wide)'`); zero variables → no variables part, still ok. Use `formatTimeInput` for the min display inside the lib.
- [ ] **Step 2: Run to fail, implement, run to pass** — `npx vitest run src/lib/setup/__tests__/category-status.test.ts`.
- [ ] **Step 3: Seeding.** In `curateCategoryAction`, after the existing `updateCategory` succeeds and when `input.isMain === true && input.seed`: fetch nothing extra — the client passes `currentRulesEmpty: boolean` alongside seed (it has the row). Then:

```ts
if (input.isMain === true && input.seed) {
    const seedBody: UpdateCategoryBody = {
        primaryTiming: input.seed.primaryTiming,
        ...(input.currentRulesEmpty && input.seed.rulesTemplate?.trim()
            ? { rules: input.seed.rulesTemplate }
            : {}),
    };
    await updateCategory(user.id, input.gameId, input.categoryId, seedBody);
}
```

Wire the caller: `step-categories.tsx` passes `seed` built from `data.game.primaryTiming` (mapped `'rt'→'realtime'`) and `data.metadata.rulesTemplate`, plus `currentRulesEmpty: !(cat.rules ?? '').trim()`, ONLY on the feature-on transition. The console `categories-table.tsx` also calls this action — leave its calls seedless (console featuring is a curation act, not first setup; note this in a comment on the input field).
- [ ] **Step 4: Verify in dev** — feature a rules-less category in the wizard; open its editor; rules show the template, timing shows the game default. Kill server. Commit — `git commit -m "feat(setup): seed featured categories from game defaults"`

---

### Task 8: The canon switch — 5 steps, new shell, hub, boards footer

This is the big coordinated change; everything in it must land in one commit because the `SetupStepId` union breaks the old step files the moment it changes.

**Files:**
- Modify: `src/lib/setup/completeness.ts`, `src/lib/setup/steps.ts`, `src/lib/setup/__tests__/steps.test.ts`, `src/lib/setup/__tests__/completeness.test.ts`, `src/lib/console/vocabulary.ts`, `src/lib/console/__tests__/*` (vocabulary test), `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx`
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-category-setup.tsx`, `steps/step-boards.tsx`
- Delete: `steps/step-defaults.tsx`, `steps/step-exceptions.tsx`, `steps/step-variables.tsx`, `steps/step-finish.tsx`
- Check for stragglers: `grep -rn "exceptions\|'defaults'\|'variables'\|'finish'" src/lib/setup src/lib/console app/\(new-layout\)/games-v2/\[game\]/setup app/\(new-layout\)/games-v2/\[game\]/manage --include="*.ts*"` — `health.ts`, `legacy-panes.ts`, SetupChecklistCard and BoardHealthCard are the likely hits; update each to the new ids.

**Interfaces:**
- Produces: `SetupStepId = 'details' | 'categories' | 'groups' | 'category-setup' | 'boards'`. `SETUP_STEPS`: details "Game details" 1, categories "Categories" 2, groups "Groups" 3, category-setup "Category setup" 4, boards "Boards" 5 (`skippable: false` on boards only). Legacy URL map `LEGACY_STEP_MAP: Record<string, SetupStepId> = { variables: 'category-setup', defaults: 'details', exceptions: 'category-setup', finish: 'boards' }` applied in the shell's step resolution. `step-boards.tsx` exports `StepBoards(props: StepProps)` and initially renders only the go-live footer (`GoLiveFooter`) — Task 9 mounts `BoardCuration` above it.

- [ ] **Step 1: Update the canon tests first** (`steps.test.ts`, `completeness.test.ts`): five steps in the order above; completeness statuses — details=slug check (unchanged), categories/groups logic unchanged, `category-setup` takes over the old `exceptions` logic verbatim (mains-without-rules warning / todo when no mains), `boards` takes the old `finish` logic (`configured` flag). Delete the old `variables`/`defaults` step-status expectations. Run: FAIL.
- [ ] **Step 2: Rewrite `completeness.ts` + `steps.ts`** to satisfy them. `CompletenessInput` keeps its shape (drop nothing; `variableCount`/`policyCount`/`requireVideoAnywhere` are still used by summaries — fold the variables count into the category-setup summary: "All 4 featured categories have rules · 3 variables"). Run: PASS.
- [ ] **Step 3: Vocabulary.** `ConceptId` gains `'boards'`; `CONCEPT_LABEL.boards = 'Boards'`; `STEP_CONCEPTS` re-keyed: `details: ['game-details', 'timing', 'rules']`, `categories: ['categories']`, `groups: ['groups']`, `'category-setup': ['categories']`, `boards: ['boards']`. `TILE_CONCEPT_IDS` gains `'boards'` (after `groups`); `CONCEPT_TILE.boards = { action: 'Curate the boards', blurb: 'See each leaderboard as runners do, and fix what’s wrong — remove, correct, or add runs.' }`. `BOARD_PANES` gains `'boards'`. Update the vocabulary test that pins tiles to nav items (it will fail until Task 13 adds the nav item — if the test pins them 1:1, do the nav-model `NavItemId`/group entry addition here instead of Task 13 and let the pane content land later; keep the tile/nav consistent in one commit).
- [ ] **Step 4: The hub** — `step-category-setup.tsx`:

```tsx
'use client';
// Hub: featured categories with status; a row opens the shared editor
// full-screen inside the wizard (?step=category-setup&cat=<id>).
import { useRouter, useSearchParams } from 'next/navigation';
import { CategoryEditor } from '../../manage/category/category-editor';
import { categorySetupStatus } from '~src/lib/setup/category-status';
// ...
export function StepCategorySetup({ data, onAdvance }: StepProps) {
    const params = useSearchParams();
    const catId = Number(params.get('cat')) || null;
    const mains = data.categories.filter((c) => !c.archived && (c.isMain ?? false));
    const open = mains.find((c) => c.id === catId) ?? null;
    if (open) {
        return (
            <section>
                {/* back-to-hub header: router.replace strips &cat= */}
                <CategoryEditor
                    game={data.game}
                    category={open}
                    canConfigure canModerate canEditStandards={false}
                    context="wizard"
                />
            </section>
        );
    }
    return (
        <section>
            <StepHeader step="category-setup" title="Set up each category"
                lede="Rules, timing, variables — everything one category needs, in one place. Copy from a finished category to go faster." />
            <ul>{mains.map((c) => {
                const s = categorySetupStatus(c, data.variables, data.policies);
                return (
                    <li key={c.id}>{/* row: name · s.parts.join(' · ') · warning
                        when s.missing.length; button label s.ok ? 'Edit' : 'Set up';
                        onClick router.replace(`?step=category-setup&cat=${c.id}`) */}</li>
                );
            })}</ul>
            <button type="button" onClick={onAdvance}>Continue to boards</button>
        </section>
    );
}
```

(Real permission flags: the wizard route already gates on configure permission — pass `canConfigure`/`canModerate` as true, `canEditStandards` from whatever the setup `page.tsx` already resolves; read it first.) Style the rows like the hub mock in the spec: status dot, name strong, muted parts line, action right-aligned. `deep link ?step=category-setup&cat=<id>` must work cold (the old `?step=exceptions&cat=` shape maps onto it via `LEGACY_STEP_MAP` + preserved `cat` param).
- [ ] **Step 5: Boards step skeleton** — `step-boards.tsx` with `GoLiveFooter` lifted from `step-finish.tsx`: the review list (statuses from `data.completeness.steps`, minus itself), blockers/warnings notes, the mod-team add/remove block (`addGameModeratorAction`/`removeGameModeratorAction` — move verbatim), and the `setGameConfiguredAction` button ("Put the board live"), plus the already-live variant. The curation area above it renders a placeholder `<p>` this commit only ("Board preview lands with the next commit" — no, per no-dead-UI: instead render the existing read-only `category-leaderboard-preview.tsx` component for the selected category as a stopgap so the step is useful, swapped out in Task 9).
- [ ] **Step 6: Shell rewire** — `wizard-shell.tsx`: import the two new steps, drop the four dead imports, new `switch`, and the legacy map:

```ts
const LEGACY_STEP_MAP: Record<string, SetupStepId> = {
    variables: 'category-setup', defaults: 'details',
    exceptions: 'category-setup', finish: 'boards',
};
const raw = searchParams.get('step');
const mapped = raw && LEGACY_STEP_MAP[raw] ? LEGACY_STEP_MAP[raw] : raw;
```

Delete the four old step files. Fix every straggler the Step-0 grep found (health.ts step references, checklist card copy, `consoleLocationForStep` callers).
- [ ] **Step 7: Verify** — `npx vitest run src/lib` (all setup/console tests), typecheck baseline diff, dev-server walk of all five steps + a legacy URL (`?step=exceptions&cat=<id>` lands on the hub with the editor open). Kill server.
- [ ] **Step 8: Commit** — `git commit -m "feat(setup): five-step category-centric wizard"`

---

### Task 9: BoardCuration scaffold — render the real board

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/boards/board-curation.tsx`, `boards/board-curation.module.scss`, `boards/use-board-data.ts`
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-boards.tsx` (mount it, remove stopgap)

**Interfaces:**
- Consumes: `loadRosterAction(gameSlug, categoryId, filter)` → `{ ok: true; rows: LeaderboardRosterRow[] } | { error }`; `parseSubcategoryKey`/`buildSubcategoryKey`; `loadCombinationsAction`.
- Produces: `BoardCuration` props:

```ts
export interface BoardCurationProps {
    game: ResolvedGame;
    categories: ResolvedCategory[];   // featured, board order
    groups: ResolvedGroup[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    canConfigure: boolean;
    context: 'wizard' | 'console';
}
```

`use-board-data.ts` exports `useBoardData(gameSlug, categoryId, subcategoryKey)` returning `{ rows, loading, error, reload }` — every mutation task calls `reload()` after success.

- [ ] **Step 1: Selection model.** Category: segmented control across `categories` (grouped headers when `groups` exist). Subcategory: for the selected category, subcategory-role variables (`variables.filter(v => v.role === 'subcategory' && (v.categoryId === cat.id || v.categoryId === null))`) render one button row each (canonical value = `values[i][0]`), exactly like the public band; the selected value per variable builds the key with `buildSubcategoryKey` using `nameNormalized`. No subcategory variables → no bands, key `''`.
- [ ] **Step 2: Table.** Rows from `useBoardData`, sorted by the category's primary timing field (`time` for rt, `gameTime` for gt, nulls last), rank = index+1. Columns: rank, runner, time (formatted with the same helper the public board uses — find it with `grep -rn "formatTime" app/(new-layout)/games-v2/[game]/leaderboard | head -3` and reuse), date. A run below the effective minimum (`findCategoryMinPolicy` ?? `findGameMinPolicy`, timing-bound ms) gets a quiet "below minimum" tag. `markedForLater` rows get a pin glyph. Board look per the spec: this must read as the leaderboard, not a table of checkboxes — selection affordances appear on hover/focus only.
- [ ] **Step 3: Component test** (`board-curation.test.tsx`, jsdom, mock `use-board-data` module with `vi.mock`): renders rows ranked by time; switching a subcategory button re-keys the query; below-minimum tag appears for a row under the fixture policy.
- [ ] **Step 4: Run tests, mount in `step-boards.tsx`** above `GoLiveFooter` (`context="wizard"`), dev-server check on a real game, kill server, typecheck diff.
- [ ] **Step 5: Commit** — `git commit -m "feat(boards): board curation view renders the real board"`

---

### Task 10: Row actions — later, remove (+next-run +undo), ban, fix time

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/boards/row-actions.tsx`, `manage/moderation/shared/actions/marks.action.ts`, `manage/moderation/shared/actions/eligible-runs.action.ts`
- Modify: `boards/board-curation.tsx`, `boards/board-curation.test.tsx`

**Interfaces:**
- Consumes: `excludeAction(gameSlug, { runIds, reason } | { rule, reason })`, `previewExcludeAction(gameSlug, target)`, `restoreRunsAction(gameSlug, runIds, reason)`, `createManualTimeAction(gameSlug, { runnerRef, categoryId, subcategoryKey, timing, timeMs, evidenceUrl?, reason })` (all in `manage/moderation/shared/actions/`), `markRuns`/`getUserEligibleRuns` libs, Task 1 types.
- Produces: `markRunsAction(gameSlug: string, runIds: number[], marked: boolean): Promise<{ ok: true; updated: number } | { error: string }>`; `loadUserEligibleRunsAction(gameSlug: string, userId: number): Promise<{ ok: true; rows: UserEligibleRunRow[] } | { error: string }>` (guard clauses copied from `load-roster.action.ts` — session, resolveGame, canModerateGame, ModError mapping). `RowActions` component props `{ row: LeaderboardRosterRow; category: ResolvedCategory; subcategoryKey: string; gameSlug: string; onMutated: () => void }`.

- [ ] **Step 1: The two new actions** — write them exactly in the `load-roster.action.ts` mold (they are 30-line files; `markRunsAction` calls `markRuns` from `~src/lib/moderation/curation`, `loadUserEligibleRunsAction` calls `getUserEligibleRuns` from `~src/lib/moderation/mass-mgmt`).
- [ ] **Step 2: Row action cluster.** Hover/focus reveals four quiet buttons at row end (Later · Remove · Ban · Fix time). Behaviors:
  - **Later**: `markRunsAction(gameSlug, [row.runId], !row.markedForLater)`, optimistic pin toggle, revert on error toast.
  - **Remove**: immediately `excludeAction(gameSlug, { runIds: [row.runId], reason: 'Board curation during setup' })`; on success the row animates out, an undo toast ("Removed <runner> — Undo") calls `restoreRunsAction` on click, and if `row.userId` an inline slip queries `loadUserEligibleRunsAction`, filters to `categoryId === category.id && subcategoryKey === current && runId !== removed`, takes the best remaining time: "next: 10:42 · Keep it / Remove too" (Remove-too = same exclude path). No confirm dialog.
  - **Ban**: `previewExcludeAction(gameSlug, { rule: { type: 'user', targetId: row.userId } })` → slim confirm sheet listing `affectedRunCount` + per-board counts from the preview → `excludeAction(gameSlug, { rule: { type: 'user', targetId }, reason })` with a required reason field in the sheet. Guests (`userId === null`) don't get Ban.
  - **Fix time**: the time cell becomes an input (`parseTimeInput`); Enter calls `createManualTimeAction(gameSlug, { runnerRef: row.userId ? { userId: row.userId } : { guestName: row.runnerName }, categoryId: category.id, subcategoryKey, timing: <category primary as ModTiming — check the ModTiming values in types/moderation.types.ts and map>, timeMs, reason: 'Corrected during board curation' })`; Escape cancels; then `onMutated()`.
- [ ] **Step 3: Component tests** — mock all five action modules; assert: Later toggles optimistically and calls with the right args; Remove calls exclude then shows the undo toast and the next-run slip when the mocked eligible-runs return has a same-board run; Ban renders the preview sheet before excluding and never calls exclude for a guest row; Fix time submits the parsed ms with the right `runnerRef` discriminant.
- [ ] **Step 4: Run tests, dev pass** (Remove and undo against a real board are safe: exclude + restore round-trips — use a throwaway/test game if in doubt; Ban only through preview WITHOUT confirming). Kill server.
- [ ] **Step 5: Commit** — `git commit -m "feat(boards): instant per-run curation actions"`

---

### Task 11: Move-to, add runner, multi-select bulk

**Files:**
- Create: `manage/moderation/shared/actions/board-override.action.ts`, `manage/boards/add-runner-row.tsx`
- Modify: `boards/board-curation.tsx`, `boards/row-actions.tsx`, tests

**Interfaces:**
- Consumes: `setBoardOverride` (Task 1), user search — find the existing username-search input with `grep -rln "searchName\|user-search\|UserSearch" src/components src/lib | head` and reuse it; if none is client-reusable, a plain text input is acceptable (backend resolves usernames in `RunnerRef` flows elsewhere — verify by reading how `manage-moderators.action.ts` resolves `username`).
- Produces: `moveRunAction(gameSlug: string, runId: number, target: { categoryId: number; subcategoryKey: string } | null): Promise<{ ok: true } | { error: string }>`.

- [ ] **Step 1: `moveRunAction`** in the `load-roster.action.ts` mold, calling `setBoardOverride`.
- [ ] **Step 2: Move-to UI** — fifth row action: popover with a category select (featured cats) + the target category's subcategory bands (same band renderer as Task 9, reuse the component) → Apply calls `moveRunAction`, row leaves this board with an undo toast (`moveRunAction(gameSlug, runId, null)`). Rows whose `boardOverride` is non-null show a small "moved here" tag with a clear (×) that also calls the null variant.
- [ ] **Step 3: Add-runner ghost row** at table end: name input (user match or free text ⇒ guest), time input, Add button → `createManualTimeAction` with `runnerRef` = `{ userId }` when a real user was picked, else `{ guestName: name }`; `reason: 'Added during board curation'`; then `onMutated()`.
- [ ] **Step 4: Multi-select** — row checkboxes (visible on hover/when any selected), selection bar above the table: "N selected · Accept · Ban…". Accept = `markRunsAction(gameSlug, ids, false)` (clears later-marks; that is all "accept" means) + clear selection. Ban = unique non-null `userId`s → ONE preview sheet aggregating `previewExcludeAction` per user (sequential; show combined count) → sequential rule `excludeAction`s with the shared reason.
- [ ] **Step 5: Tests** — move popover calls with built key; add-runner discriminates guest vs user; bulk accept passes all selected ids with `marked:false`; bulk ban skips guest rows. Run suite.
- [ ] **Step 6: Commit** — `git commit -m "feat(boards): move, add-runner and bulk curation"`

---

### Task 12: Board-level controls — minimum, reorder, default view, display

**Files:**
- Create: `manage/boards/board-controls.tsx`
- Modify: `boards/board-curation.tsx`, tests

**Interfaces:**
- Consumes: policies actions (min), `reorderCategoriesAction({ gameSlug, gameId, changes: { categoryId, sortOrder }[] })`, `reorderGroupsAction` (`src/actions/category-group/reorder-groups.action.ts` — read for its exact input first), `updateVariableAction({ gameSlug, gameId, body: UpsertVariableInput })`, `updateTimingSettingsAction`, `updateCategorySettingsAction`, `findCategoryMinPolicy`/`minValueForTiming`.

- [ ] **Step 1: A quiet toolbar** above the board (right-aligned, icon+label buttons — visible only when `canConfigure`): **Minimum**, **Reorder**, **Display**, **Set as default view**.
  - **Minimum**: popover, one timing-bound input (category primary timing), initial from `findCategoryMinPolicy(policies, cat.id) ?? findGameMinPolicy(policies)`; writes a category-scoped min_time policy (create/update; clearing deletes only a category-scoped one, never the game-wide). On save `reload()` — the board re-renders under the new floor.
  - **Reorder**: toggles reorder mode — category tabs get drag handles (or ←/→ nudge buttons; nudge is simpler and keyboard-safe: swap `sortOrder` with neighbor via `reorderCategoriesAction`), group headers likewise via `reorderGroupsAction`, each subcategory band row gets ↑/↓ (swap `sortOrder` via `updateVariableAction` with the full `UpsertVariableInput` built from the `VariableRow`), and each value button gets ←/→ (reorder `values` array, same action). Nudge buttons over drag: matches "clear and clean" without a DnD dependency.
  - **Set as default view**: for each subcategory variable of the current selection, `updateVariableAction` with `defaultValueIndex` = the selected value's index. Confirmation toast "New default: PC · 1.0".
  - **Display**: popover with Milliseconds (`showMilliseconds`), Show RTA / Show IGT (`hideRealTime`/`hideGameTime` inverted, guard both-hidden exactly like `step-defaults` did: refuse with inline note), Lower is better toggle (`sortAscending`) — all via `updateCategorySettingsAction`/`updateTimingSettingsAction`, then `reload()`.
- [ ] **Step 2: Tests** — minimum popover writes `{ minGameTimeMs }` for a gt-primary category and never both keys; default-view writes the right `defaultValueIndex` per variable; value nudge sends a reordered `values` array; both-hidden guard blocks.
- [ ] **Step 3: Run suite, dev pass, kill server, commit** — `git commit -m "feat(boards): board-level curation controls"`

---

### Task 13: Console Boards pane + later badge

**Files:**
- Modify: `manage/console/nav-model.ts` (+test), `manage/console/console-shell.tsx`, `manage/console/tile-grid.test.tsx` if it pins tiles, `manage/page.tsx` (pane data wiring — read how existing panes get their props first)

**Interfaces:**
- Consumes: `BoardCurationProps` (Task 9), `buildNav`/`NavFlags`.
- Produces: `NavItemId` gains `'boards'`; board group item `{ id: 'boards', label: CONCEPT_LABEL.boards }` between `groups` and `moderators`; `itemVisible`: `if (itemId === 'boards') return flags.canModerate || flags.canConfigure;`.

- [ ] **Step 1: Nav-model test first** — a moderator-only viewer sees `boards`; a configure-only viewer sees it too; a viewer with neither doesn't. Run: FAIL. Implement. PASS. (If Task 8 Step 3 already added the nav entry to keep the tile/nav pin test green, this step is just the visibility tests.)
- [ ] **Step 2: Pane mount.** In `console-shell.tsx`'s pane switch, `boards` renders `<BoardCuration context="console" …props />`; wire the props from whatever the shell/page already loads (`categories`, `groups`, `variables`, `policies` are all in the console's data path — find where `pane === 'categories'` gets its rows and mirror). Subcategory tabs per category come free from the component.
- [ ] **Step 3: Later badge.** Where the sidebar renders count badges (see `attentionCount` in `tile-grid.test.tsx`/sidebar), add a marked-for-later count for `boards` — sum of `markedForLater` rows is not available without a roster call; use the count endpoint from the handoff (item 2). Until backend ships, the badge renders nothing when the fetch fails — never an error state in the nav.
- [ ] **Step 4: Tests + dev pass** (console → Boards pane shows the same view as wizard step 5, minus the go-live footer — footer is wizard-only, verify). Kill server. Commit — `git commit -m "feat(console): boards curation pane"`

---

### Task 14: Public board shows game rules + emulator policy

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx` (rules composition), possibly `[game]/data.ts` (fields through the public payload)

**Interfaces:**
- Consumes: public game payload's `gameRules`/`emulatorPolicy` (backend item 1 read side; mirror the fields in whatever type `data.ts` declares for the public game — find the `summaryOverride` precedent and sit beside it).

- [ ] **Step 1:** Thread `gameRules` + `emulatorPolicy` through the public data path (typed optional — absent until backend ships, page renders unchanged).
- [ ] **Step 2:** Where `game-page.tsx` passes `rules` to `RulesPanel`/`RulesBody`, compose: when `gameRules` is non-empty, the rules body renders game rules first, a divider, then category rules; the collapsed excerpt uses category rules as today. Emulator policy renders as one quiet line at the top of the rules body: "Emulators are allowed." / "Emulators are banned." — nothing when null.
- [ ] **Step 3:** Typecheck diff; dev render of a public board (unchanged today — fields absent); kill server; commit — `git commit -m "feat(boards): game-level rules and emulator policy on public boards"`

---

### Task 15: Sweep, verify, hand off

**Files:** whatever the sweeps surface.

- [ ] **Step 1: Reference sweep** — `grep -rn "step=exceptions\|step=defaults\|step=variables\|step=finish" app src --include="*.ts*"`: every producer of legacy links updated to new ids (LEGACY_STEP_MAP covers inbound, but we don't mint legacy URLs ourselves). `grep -rn "step-defaults\|step-exceptions\|step-variables\|step-finish" app src` must return nothing.
- [ ] **Step 2: Copy sweep** — `git diff main --name-only | xargs grep -lP "[A-Za-z]'[A-Za-z]"` → fix straight apostrophes in any changed file.
- [ ] **Step 3: Full verification** — `npx vitest run` (whole suite), typecheck + lint **baseline diffs** (zero new), `npm run dev` full walk: five steps in order on a real game, legacy deep link, console category detail, console Boards pane, copy-from, public board page. Kill the server.
- [ ] **Step 4:** Mark the spec implemented (status line), note the three backend items as the merge blocker in the spec status.
- [ ] **Step 5: Push the branch** — `git push -u origin setup-category-centric`. **No PR.** Tell Joey: branch ready for browser pass; backend handoff doc at `docs/plans/2026-07-30-category-centric-backend-handoff.md`; the branch cannot merge before backend items 1–3 deploy.

---

## Self-Review Notes

- Spec coverage: step canon (T8), step-1 defaults incl. timing-bound minimum (T5/T6), seeding (T7), hub + shared editor (T3/T8), copy-from (T4), boards render (T9), five row actions + accept-as-default (T10), move/add/bulk (T11), minimum/reorder/default-view/display (T12), console pane + badge (T13), public display (T14), handoff doc (T1), legacy redirects (T8/T15). Go-live + mod team folded into step-boards footer (T8) — the spec's "completeness summary and go-live control"; the mod-team block rides along because deleting step-finish would otherwise orphan it.
- The `ModTiming` mapping and `reorderGroupsAction` input are read-at-execution checks with exact locations given, not inventions.
- Order matters: T2–T7 all compile under the OLD canon; T8 is the only commit where old and new must swap atomically.
