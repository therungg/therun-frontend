# Setup step 4 — bulk-first redesign

Date: 2026-08-05
Repo: therun-frontend + therun-backend
Status: **implemented** — backend on `setup-step4-backend`, frontend on
`setup-step4-matrix`. Neither pushed; backend not deployed, so the two batch
endpoints 403 at the gateway until it is. Browser pass outstanding.

## What is wrong with step 4 today

`app/(new-layout)/games-v2/[game]/setup/steps/step-category-setup.tsx` is a hub
listing featured categories, where each row's "Set up" button replaces the whole
step body with `CategoryEditor` — the console's five-section auto-saving editor.

1. **It is not a step.** Steps 1/2/3/5 are one screen, one form, one Continue.
   Step 4 is a tree: hub → category → five sections. You end up two levels deep
   inside a linear wizard with two competing back affordances (the wizard's
   bottom "Back" goes to step 3, "All categories" goes to the hub) and a left
   step rail that no longer describes where you are.
2. **Unbounded work behind a "5 steps" promise.** 20 featured categories is 20
   round trips of open → scroll five sections → save → back.
3. **Wrong tool reused.** `CategoryEditor` is built for "I came here to change
   one thing". Setup wants "fill these, next category". `Copy from…` — the
   control that actually matches the job — is parked in a corner as a rescue
   hatch.
4. **The check mark lies.** `categorySetupStatus` sets `ok` on rules being
   non-empty. One character of rules is a green check with no minimum, no
   variables and default timing.
5. **Two unrelated jobs on one screen.** Board ordering (also available in
   step 3, step 5 and the console) is bolted onto the setup-status rows.
6. **No bulk anything.** Timing, minimum and rules are near-uniform across a
   board in practice, and there is no way to say so.

## The reframe

Board-level defaults already exist in the data model — `GameMetadata` carries
`primaryTiming`, `hideRealTime`, `hideGameTime`, `rulesTemplate`, `gameRules`,
`emulatorPolicy`, and `findGameMinPolicy` (the `categoryId: null` min_time
policy) is still alive. Per `LEGACY_STEP_MAP`, those are already edited in
**step 1** ("board-defaults half of step 1"), which step 4 currently never
mentions.

So step 4's real job is narrower than it has been drawn:

> **Exceptions to the board defaults, plus the things that have no default.**

That reframe is what makes a matrix tractable. The grid does not render N × M
*values*; it renders N × M *deviations*. A cell matching the board default
renders as a muted `—`. On a healthy board the grid is nearly empty and the eye
catches only the exceptions — which is what makes it scale to 30 categories
where raw values would not.

## Two zones, because the data has two shapes

Per-category configuration splits cleanly into **scalars with a board-level
default** and **variables**, and they need different UI. Forcing them into one
control is what makes the current screen bad.

```
Set up each category                                          4 of 5

Board defaults:  RTA · min 10:00 · rules template · lowest wins   [Change]
                 ↑ read-only; [Change] links to step 1

─ Zone 1: scalars ─────────────────────────────────────────────────
☐   Category      Timing   Minimum   Rules       Rank    ms
☐   Any%          —        —         custom  ▾   —       —
☐   100%          —        —         default     —       —
☑   16 Star       IGT      —         none    ▾   —       —
☑   70 Star       —        12:00     default     highest on

  2 selected →  Timing ▾ · Minimum ▾ · Apply template · Copy from ▾

─ Zone 2: variables ───────────────────────────────────────────────
┌ Platform · sub-boards · on 4 of 4 ────────────────────────── ▾ ┐
│                       Any%    100%    16 Star   70 Star        │
│   N64                  ◉       ◉        ◉         ◉   ← default│
│   Virtual Console      ●       ●        ○         ●            │
│   Emulator             ○       ●        ○         ○            │
│   ───────────────────────────────────────────────────          │
│   role                sub     sub      sub      filter  ⚠ drift│
│                                                                │
│   → Any% 2 sub-boards · 100% 3 · 16 Star 1 · 70 Star filter    │
│   [+ bucket]   [Apply this shape to all categories]            │
└────────────────────────────────────────────────────────────────┘
┌ Route · filter · on 2 of 4 ─────────────────────────────────  ▸ ┐

                                            [ Continue to boards ]
```

## Zone 1 — the scalar matrix

Columns, and what each inherits from:

| Column | Inherits from | Cell |
|---|---|---|
| Timing (RTA/IGT + hide flags) | `metadata.primaryTiming` etc. | select |
| Minimum time | game min_time policy (`categoryId: null`) | time input |
| Rules | `metadata.rulesTemplate` | chip: `default` / `custom` / `none` |
| Ranking direction | **new** game-level field | select |
| Show milliseconds | **new** game-level field | toggle |

Ranking direction and show-milliseconds become game-level values (backend item
1 below) specifically so they can inherit — a column with nothing to inherit
from always renders a raw value, which is exactly the noise the blank-cell trick
removes.

- `—` means "inherits". Typing a value makes that category an explicit
  exception. Clearing a cell returns it to inheriting.
- **Rules open as an inline expanded row** beneath the category, not a screen
  takeover. Keeping the list on screen is the entire point of the redesign; a
  side drawer solves it too but costs a lot more UI and is cramped on narrow
  viewports.
- **Writes are immediate.** Scalar edits are trivially reversible.
- **Bulk apply previews the diff before writing**: "3 will change, 1 already
  differs", with a checkbox to include the deviating ones. Select-all is the
  natural gesture here and there is no undo, so silent clobbering of hand-tuned
  categories must not be possible.
- Rows are grouped by the same `sectionsFor` group sections the public band
  uses, so the grid reads in board order.
- **Reordering leaves this screen entirely** — it is already in step 3, step 5
  and the console.
- `CategoryEditor` survives as an "Open full editor →" affordance per row for
  the rare deep case, and is untouched in its console context.

## Zone 2 — variables as a view, never as a scope

`VariableRow` is `nameNormalized` (identity), `role: 'subcategory' | 'filter'`,
`values: string[][]` — ordered **buckets of aliases**, not an enum —
`defaultValueIndex` (where unmatched runs land), plus `version` / `published`.
Editing one **moves existing runs between boards**, which is why
`describeConsequences` / `ConsequenceDialog` exist; `VariablePreview` already
reports movement **per category**.

Two non-starters follow directly:

- **Not a matrix column.** A cell can hold `RTA` or `10:00`. It cannot hold
  name + role + ordered alias buckets + default index.
- **Not a game-level default.** The game tier was removed on 2026-08-04 and
  stays removed. The buckets genuinely differ per category (100% allows
  Emulator, Any% does not) and `defaultValueIndex` differs, so no single shared
  row can describe a real board.

What a moderator *thinks* is shared is the variable's **identity and shape**
(name, role, bucket names). What actually varies is **which buckets apply
where**, the default, and occasionally the aliases. `nameNormalized` is already
a grouping key. Therefore:

> **Reintroduce game-wide variables as a _view_, never as a _scope_.** Group the
> category-scoped rows by `nameNormalized`, render one board-level object, fan
> edits out as per-category writes. No schema change; nothing shared in the
> database; the 2026-08-04 refactor stays intact.

Behaviour of the bucket × category grid:

- **Cell toggle** adds/removes that bucket on that category's own copy.
- **An empty column** means the variable is not on that category. Ticking any
  cell creates the row; clearing the last one deletes it. Add / remove / scope
  collapse into a single gesture.
- **The `role` footer row** shows per-category role and flags disagreement with
  a drift marker. The old shared scope pretended disagreement could not happen;
  this surfaces it and offers to normalise.
- **Sub-boards appear as the consequence, where you cause it** — the
  `→ Any% 2 sub-boards` line under the grid, rather than a separate section.
- **Aliases sit one level deeper** (click a bucket name). They are near-always
  uniform, so they are edited at palette level and stamped down, with a marker
  on any category whose aliases have drifted.
- **"Apply this shape to all categories"** stamps name / role / buckets onto
  every **featured** category as independent copies. Featured only — matching
  what the rest of step 4 lists. Archived categories are never targeted.

### Staging (the deliberate asymmetry with zone 1)

Cell toggles **stage** as client-side pending state; they do not write on click.
Applying runs one batched dry-run and shows a single honest summary —
"3 pending changes → 47 runs move across 2 categories, 4 unresolved" — instead
of N separate scary confirmations. `VariablePreview.categories[]` already
carries per-category movement, so this is expressible against the existing
preview shape.

**Staging is purely client-side.** There is no draft lifecycle in this product
and this design does not introduce one — it must not touch `published`, and
pending state dies with the component. This is the one asymmetry with zone 1,
and it is justified: scalar edits are reversible, variable edits relocate runs.

## Status model

`categorySetupStatus` set `ok` on rules alone, which made the check mark
meaningless. With the matrix the per-row glyph is redundant — the row *is* the
status, and a quiet cell already reads as "on the default, fine".

`category-status.ts` and its test are **deleted**; the hub was their only
consumer. The step-level signal `computeCompleteness` already produces
("N of M featured categories missing rules") was already exactly the rule the
design called for, and needed no change: applying the template writes real text
into the category's `rules`, so template-filled counts as resolved.

## Backend (built, `setup-step4-backend`)

1. **`sortAscending` / `showMilliseconds` on the game** — migration 0085,
   nullable. Named after the category columns they mirror, rather than the
   `rankingDirection` the design first proposed.

   **Correction to the original design.** These do NOT resolve at read time.
   `games.primaryTiming` carries an explicit comment that it is a wizard
   default the wizard *stamps* onto categories, and that `resolveTiming()` is
   deliberately not rewired to read it. Introducing an inheritance tier for the
   two new columns would have been a second, conflicting model. So they follow
   the stamp rule: a category always holds its own concrete value, a cell reads
   as "same as default" by **comparison**, and clearing a cell **re-stamps**
   the default rather than nulling the column. Same UX, no read-path rewiring,
   and changing a board default can never silently reorder every leaderboard.

2. **`PUT /v1/games/:id/categories/bulk`** — one field set, many categories,
   one transaction, one `syncGamePageData`, one audit row per category. The
   planning half is the pure `planBulkCategoryUpdates`, unit-tested without a
   database: cross-game ids, unknown ids, and the per-row hide-timing mutex
   (legality depends on the value each category already holds).

3. **`POST /v1/games/:id/variables/bulk`**, `?dryRun=1` for the preview.
   `previewVariableChangeSet` plans movement once per category with all of that
   category's changes applied together — subcategory variables compose
   multiplicatively, so previewing them one at a time understates movement.
   The preview loop already iterated an `ids` array of one, a leftover from the
   removed game-wide fan-out, so generalizing it was small.

   Confirmed while building: `published` + `version` is a **supersede history**
   (`upsertVariable` flips the old row false and inserts version+1), not a
   draft lifecycle. Staging stays client-side and never writes `published`.

## Known limitation

**Bulk apply cannot cover the minimum column.** A minimum is a `min_time`
board *policy*, not a category column, so it has no batch endpoint — the
matrix edits it per cell through create/update/delete, and the bulk bar
deliberately offers no Minimum control rather than pretending to be atomic
across a selection. A batch policy route would be the fix.

## Decisions taken

- Board defaults stay owned by **step 1**; step 4 shows them read-only with a
  `[Change]` link and inherits every cell from them. (Joey, 2026-08-05)
- Ranking direction and show-milliseconds **become game-level values**. (Joey)
- Variables get their **own zone with its own shape** — not a matrix column.
  (Joey: "variables is different and we should treat it differently")
- **No draft lifecycle.** Staging is client-side only. (Joey)
- "Apply this shape" targets **featured categories only**. (Joey)
- Bulk apply **previews the diff before writing** (recommended, unchallenged).
- Rules open as an **inline expanded row** (recommended, unchallenged).
- Reordering **leaves step 4**.


## Update, 2026-08-05 — the category detail screen is gone

Joey: *everything* must be settable from the all-categories view, with no
category detail. `CategoryEditor` is no longer mounted by the wizard at all;
`?cat=<id>` deep links now open that category's row expanded.

The rule that decides where a setting lives:

- **A column** when it is scannable across the whole board — one glance tells
  you which categories deviate. Timing, minimum, rules state, ranking,
  milliseconds, leaderboard count.
- **A pane** on the expanded row when it is not — a wall of rules text, an
  image, a pair of switches nobody compares across rows, a list of
  combinations. Panes are tabs (`row-panel.tsx`): Rules · Leaderboards · Time
  columns · Emblem.
- **Never a route.** Losing the list is what made the old step 4 unusable.

**Where the combination list ended up.** It was first built as a Leaderboards
pane on the category row, then removed: with a single subcategory group every
leaderboard *is* one option, so "close 100% · Emulator" and "untick Emulator on
100%" are two ways to say the same thing, and the pane was a second surface
restating the grid. It only has something of its own to say at two or more
groups, where "Virtual Console exists, US exists, but not together" has no cell
to untick. So it now sits at the foot of the Subcategories section — beside its
cause — and renders only for the categories that qualify
(`categoriesNeedingCombinations`).

What moved in:

| Was | Now |
|---|---|
| `TimingSettingsSection` hide flags | Time columns pane, one field per write (the forceRealTime guard must not see untouched fields) |
| `CategorySettingsSection` emblem | Emblem pane |
| `CombinationsSection` | Foot of the Subcategories section, and only for categories with **two or more** groups |
| `VariablesSection` per-option detail | Option editor in zone 2: rename, aliases, order, remove-everywhere; plus a per-category default row |
| `RulesSection` | already the inline rules pane |

Aliases became board-level (`VariableGroup.buckets[].aliases`) and fan out on
write. A category whose spellings had drifted converges on the next edit —
deliberately, since that is how two spellings of one option stop existing.

**Not carried over, on purpose or pending a decision:**

- `CopyFromControl` ("copy this category's config from another") — the bulk bar
  covers the same job by naming values explicitly. It does not copy variables.
- The Standards below-minimum sample list. The minimum itself is a column; the
  diagnostic list of runs that would be cut has no home in setup any more.
- `CategoryEditor` is untouched in its console context.
