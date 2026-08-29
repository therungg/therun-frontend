# Individual Levels (IL) setup wizard — design

Date: 2026-08-30
Repo: therun-fr (frontend only)
Status: proposed

## Goal

Let a board owner set up individual levels from the setup wizard, without
touching the manage console's level panes and without ever seeing the
underlying "level group / template / instance" machinery. They answer a couple
of yes/no questions and type plain names; the wizard maps that onto the
existing IL model behind the scenes.

The IL model already works end to end (see the manage `levels` panes and
`docs/frontend-guide-levels.md`). This is a friendlier front door over the same
backend ops — **no backend changes**.

## Non-goals (YAGNI)

- No per-level rules editing, per-board overrides, detach/resync, or
  exclusion-repair UI — those stay in the manage console.
- No bulk-create backend op. N levels = N calls, sequenced like the Groups
  step already does.
- No renaming/deleting levels from the wizard beyond what re-running the step
  naturally does (adding/removing names). Full lifecycle stays in the console.
- No adopting an existing category as a *synced subcategory instance* — the
  backend can't (levelTemplateId isn't settable via the API). Matching an
  existing category only ever produces a **level-only board** (the no-subcategory
  case), which is exactly where name-matching matters.

## Model mapping (decided: option A)

| Wizard word | Model thing | Op |
|---|---|---|
| A **level** ("E1M1") | a `kind:'level'` group | `createLevelAction` → `POST /groups {kind:'level'}` |
| A **subcategory** ("Any%") | a level category / template | `createLevelTemplateAction` → `POST /categories {isLevelTemplate:true}` |
| **matching a level to a category** | move an existing normal category into the level group → level-only board | `curateCategoryAction({categoryId, groupId})` |
| a fresh **level-only board** | new category whose `groupId` is the level group | create-category action with `groupId` |
| the **level × subcategory matrix** | template instances | auto-materialised on each `createLevel`/`createLevelTemplate`; per-cell off = `levelOp('level-exclusion')` |

Each level is its own group (option A), so the board's **Levels** dropdown lists
the level names directly and a single-board level shows no extra pills — the
existing `LevelPicker` renders this with no changes. All the level groups still
appear under one "Levels" rail section.

## Backend fan-out (already automatic)

- `createLevel` materialises a board for every existing active template.
- `createLevelTemplate` materialises into every existing level.
- So the create order doesn't matter; the matrix fills itself. `level-materialise`
  is only a manual backfill and the wizard doesn't need it.

## The wizard step

New step **`levels`**, inserted **between `categories` and `groups`** (levels
reference categories by name, so categories come first; it sits above Category
groups as requested). Renumbers the steps after it.

Progressive form (one `StepLevels` component), each answer revealing the next:

1. **"This game has individual levels."** — checkbox. Off (default) → the step
   is a no-op, shows a one-line explainer and Continue. On → reveals 2.
2. **Your levels** — a list input (one name per line / add-row). Live-validates
   for blank/duplicate names. Below it, the **live Levels-dropdown preview**
   (reuses the `CategoryBandPreview` levels rendering).
3. **"Your levels have subcategories."** — checkbox. Off → each level is a single
   level-only board. On → reveals 4.
4. **Your subcategories** — a list input (one per line), same validation.
5. **Which subcategories apply to which levels** — a levels × subcategories grid
   of checkboxes, all on by default. Unchecking a cell = exclude that
   subcategory from that level. (Only shown when both lists are non-empty.)

`Save & continue` commits everything, then advances (same pattern as
`StepGroups.save`, with a `Saving i / N…` progress line).

## Save orchestration

Compute a diff against current state (existing level groups, their boards,
existing templates, existing exclusions), then apply the minimum set of calls.
For the first pass the important flows:

**Levels (always):** for each typed level name not already a level group:
- `createLevelAction({name, kind:'level'})` → new group id.
- **No subcategories case** — give the group its one board:
  - If a *normal* category's slug matches the level name
    (`convertToSearchable(name)` — the same normalisation the backend slugs
    with), **move it in**: `curateCategoryAction({categoryId, groupId})`. This
    reuses the category (dedup) and, crucially, creates **no new slug**, so it
    can't hit the unguarded-create 500.
  - Else create a fresh level-only board (create-category action with
    `groupId`). Only reached when no category of that name exists, so no slug
    collision.

**Subcategories (when enabled):** for each typed subcategory not already a
template: `createLevelTemplateAction({display, isLevelTemplate:true})`. Backend
auto-materialises its instances into every level and pre-checks those slugs
(clean 400 on any clash). When subcategories exist we do **not** create
level-only boards — the matrix owns the boards.

**Matrix exclusions (when enabled):** for each unchecked (level, subcategory)
cell, `levelOp('level-exclusion', {groupId, templateId, excluded:true})`; for a
re-checked cell, `excluded:false`. Default all-on means no calls in the common
case.

Removing a name (present before, absent now) is **out of scope for pass one** —
the step only adds/updates. Deleting levels stays in the console. (Called out so
the save logic doesn't silently destroy boards.)

### The 500 the backend agent flagged — avoided by construction

The only unguarded path is creating a level-only board whose slug collides with
an existing category. Because we **match-and-move** whenever a category of that
name already exists, a fresh level-only create only happens when no such slug
exists — so the wizard never triggers that collision. No backend change needed.

## Completeness / step registry

- Add `'levels'` to `SetupStepId` and `SETUP_STEP_ORDER` (between `categories`
  and `groups`) in `completeness.ts`.
- Add a `SETUP_STEPS` entry in `steps.ts` (label "Levels", `skippable: true`),
  renumber `num` for groups/category-setup/variables/boards, keep order in sync
  (asserted by `steps.test.ts`).
- Completeness status: `todo` when the game has no level groups, `done` once it
  has ≥1 (or when explicitly skipped — levels are optional). It never blocks.
- `LEGACY_STEP_MAP`: no change (new id, no old alias).

## Files touched (frontend only)

- `src/lib/setup/completeness.ts` — new step id + order + status rule.
- `src/lib/setup/steps.ts` — new step meta + renumber.
- `app/(new-layout)/games-v2/[game]/setup/steps/step-levels.tsx` — new component.
- `app/(new-layout)/games-v2/[game]/setup/steps/level-list-input.tsx` and
  `level-matrix.tsx` — small sub-components (list input + the grid), or inline
  if they stay small.
- `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` — render `StepLevels`.
- Possibly a thin `create-category` action wrapper if one doesn't already exist
  for the level-only create (verify during implementation; the categories step
  creates categories already).
- Reuse: `createLevelAction`, `createLevelTemplateAction`, `levelOp`,
  `curateCategoryAction`, `CategoryBandPreview`.
- `StepHeader` copy for the `levels` step.

## Testing

- `steps.test.ts` / `completeness` tests: order + numbering + status for the new
  step.
- A save-orchestration unit test (pure function that turns wizard state → the
  ordered list of ops), covering: no-subcategory match-and-move vs fresh create;
  with-subcategories create + default all-on (no exclusion calls); a few
  excluded cells; idempotent re-run (no dup groups/templates).
- Preview rendering test: typed levels show under the Levels dropdown.

## Open questions

- None blocking. Name-match normalisation must equal the backend's
  `convertToSearchable`; confirm the frontend has that helper (search
  `convertToSearchable` / `normalizeSlug`) or mirror it during implementation.
