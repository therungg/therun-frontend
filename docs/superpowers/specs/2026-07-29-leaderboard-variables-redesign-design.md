# Leaderboard variables — redesign

Date: 2026-07-29
Status: approved, not yet implemented
Area: `app/(new-layout)/games-v2/[game]/manage/variables/`,
`app/(new-layout)/games-v2/[game]/setup/steps/step-variables.tsx`,
`src/lib/variables/` (new), backend `src/api/games/` + `src/api/leaderboards/`.
Audit this answers: `2026-07-29-setup-flow-ux-audit.md` §E.

## Problem

Variables are the most consequential thing a board admin edits — they decide how many
leaderboards a category has, which board each run lands on, and which world records
exist — and they are the least legible surface in the product.

Four failures, from the audit:

1. **Scope is expressed three times and the outer control does nothing.** The console pane
   is category-scoped, so you must pick a category to reach it; the section then opens on
   game-wide rows, where that category is irrelevant. The wizard stacks a third control on
   top. Nothing states how they relate.
2. **The merged truth is never shown.** A category row wholesale-replaces the game-wide row
   of the same name, but each tab lists only its own scope. You cannot see what a board
   actually has, and you can shadow a shared variable without being told.
3. **Edits that re-partition the board carry no warning.** Renaming a value, removing one,
   or changing the default moves existing runs between leaderboards. Only the *delete*
   dialog mentions this class of consequence; the far more common edit path says nothing.
4. **The one warning that exists is unactionable.** "…until a re-resolve worker runs" is
   internal vocabulary, and the rebuild it refers to is gated on global roles — the
   per-game admin who reads the warning cannot act on it.

## Principles

The bar for this surface, in priority order:

1. **Never make the mod assemble state in their head.** If the system knows the answer,
   show the answer.
2. **Consequences before commitment, in real numbers.** A warning that can't be sized is
   noise. "412 runs move" is a decision; "some runs may move" is anxiety.
3. **Ceremony scales to consequence.** Editing a description is one click. Changing a
   default is a reviewed decision.
4. **Plain language, no internals.** The mod never reads `subcategoryKey`, `bucket`,
   `nameNormalized`, `published`, or "re-resolve worker".
5. **One implementation.** The wizard and the console render the same components. A
   divergence is a future drift.

## Decisions taken

| Question | Decision |
|---|---|
| Scope of work | The variables surface front to back — console panes, wizard step, and the backend changes they need. |
| Game-wide vs category-specific | Keep both tabs. Add an always-visible "in effect" panel above them. (Rejected: collapsing to a single effective list with inline override — larger change, more risk.) |
| Edit consequences | Real numbers from a backend dry-run, shown in a review step before the write. |
| Wizard step 4 | Renders the same components as the console, plus sub-boards. No wizard-only variant. |
| Sub-boards | Folded into the Variables screen as a third zone. The nav item survives as a deep link. |
| Counting unit | Leaderboard **entries** (one row per runner per board), not raw attempts. |

---

## The design

### 1. One screen, three zones

```
Variables — Any%

┌─ In effect on Any% ─────────────────────── what runners see ─┐
│ Platform    splits this board into 4      Shared             │
│ N64 · Virtual Console · Emulator · Switch      default: N64  │
│                                                              │
│ Version     splits this board into 2      Any% only          │
│ 1.0 · 1.1                                      default: 1.0  │
│                                                              │
│ Region      filter only                   Shared             │
│ US · JP · EU                                                 │
└──────────────────────────────────────────────────────────────┘

[ Shared by all categories ] [ Any% only ]        + Add variable
 …editable table for the selected tab…

┌─ Sub-boards ─────────────────────────────────────────────────┐
│ 8 combinations, all live boards                              │
└──────────────────────────────────────────────────────────────┘
```

**Zone 1 — In effect.** The merged, published, per-category list. Read-only.

Fed by the **public** endpoint `GET /v1/leaderboards/{game}/{category}/variables` — the
same call the board itself makes. Not re-derived client-side. This is the load-bearing
decision of the redesign: the panel cannot drift from what runners see, because it *is*
what runners see.

Each row carries a source badge in plain words:

- `Shared` — game-wide row, no category override.
- `Any% only` — category row, no game-wide row of that name.
- `Any% only — replaces the shared Platform` — category row shadowing a game-wide one.

Clicking a row selects the owning tab and focuses that row in the table below. The panel
is the map; the tabs are the workshop.

Empty state: *"No variables. This category is a single leaderboard."*

**Zone 2 — The two tabs.** Today's Game-wide / Category-specific tables, relabelled
*Shared by all categories* / *{Category} only*, with the fixes in §3.

**Zone 3 — Sub-boards.** Today's `CombinationsSection`, moved onto this screen and rendered
only when at least one *splits this board* variable is in effect. Combinations exist purely
as a consequence of the variables above them; separating the two forces the mod to hold the
relationship in their head, which principle 1 forbids.

The `combinations` nav item stays in the sidebar and deep-links to this section so existing
bookmarks and links keep working.

Sub-boards changes beyond the move:

- Mode stated in plain words with a count: *"8 combinations, all live boards"* /
  *"6 of 8 combinations are live boards"*.
- Each row shows its **entry count**, so unchecking a combination that holds 300 runs says
  so before you save.
- An explicit *Allow every combination* action — leaving managed mode is currently only
  possible implicitly by checking every row, and that is never stated.

### 2. Language

Applied everywhere, including the wizard's teaching copy.

| Today | Becomes |
|---|---|
| "subcategory variable" | **splits this board** (`subcategory` shown once, as the technical name) |
| "filter variable" | **filter only** |
| "bucket" | **value** |
| "aliases" | **also accept** |
| "Default value" / `defaultValueIndex` | **used when a run doesn't say** |
| "until a re-resolve worker runs" | **on the next rebuild** |
| `nameNormalized` / "URL key" | **web address** |
| `published`, `version`, `subcategoryKey` | never shown |

The role choice gets a live consequence sentence rather than an abstract definition.
Selecting *splits this board* with four values reads:

> **Any% becomes 4 separate leaderboards, each with its own world record.**

Selecting *filter only*:

> **Any% stays one leaderboard. Runners can filter by Region.**

This sentence lives in `src/lib/variables/language.ts` and is reused by the wizard, the
form, and the in-effect panel so the three cannot describe the same thing differently.

### 3. The form

Reordered from field-shaped to question-shaped:

**Name → What it does → Values → Which one when a run doesn't say → Notes.**

*Also accept* (aliases) collapses per value, as today. Sort order and description move
under a **More** fold — neither is a first-run concern.

Four fixes:

- **The role lock is stated in create mode**, where the choice is still free. Today the
  "role is locked once a variable exists" note renders only in edit mode, after the choice
  is irreversible. The wizard already says it up front; the console must too.
- **The form captures its scope and category at open time** and prints them in its own
  header — *"New variable — Any% only"*. Submit uses the captured values, not live props.
  This fixes the retargeting bug: today an open create form silently re-aims at whichever
  category is selected at submit time, while an open edit form does not.
- **A dirty form is never discarded silently.** Switching tabs, switching category, or
  leaving the screen with unsaved input asks first.
- **The reserved-name error names the collision** — *"'page' is reserved"* — instead of
  dumping the entire reserved list.

**Shadow warning.** Creating a category-scoped variable whose name matches a game-wide one
shows, before submit:

> This replaces the shared **Platform** for Any% only — its values *and* its default.
> Other categories keep the shared one.

### 4. Consequences, in numbers

Saving no longer writes directly. It goes through a **review step**.

The frontend sends the *proposed* definition to a dry-run endpoint, which re-resolves the
category's current leaderboard entries against it and returns per-board before/after
counts.

```
Change default from "N64" to "Emulator"?

  412 runs sit on the N64 board because they
  never specified a Platform. They move to Emulator.

    N64        1,204 → 792
    Emulator      18 → 430

  Runs move on the next rebuild.   [ Rebuild now ]

  [Cancel]                        [Change default]
```

**Ceremony scales.** When the dry-run reports no movement — a description edit, a sort
change, a new value no run uses — the review step reads **"Nothing moves"** and collapses
to a single confirm.

**Delete** uses the same shape, plus what happens to any sub-board rows keyed on the
deleted variable's name.

**Counting unit: entries, not attempts.** One row per runner per board — the number a mod
actually reasons about, and cheap to compute because the entry flags already exist on
`finished_runs`. Attempt counts would be an order of magnitude larger, slower, and less
meaningful.

**"Rebuild now"** triggers `invalidate-cache` for the game. The rebuild is asynchronous
(SQS, with continuations on large games), so the button confirms the rebuild was *queued*
and states the expectation — *"Rebuild queued. Boards update within a few minutes."* — and
does not pretend to a progress bar it cannot honour. Declining is safe: the daily cron
rebuilds anyway. This requires the authz change in §5.2 — without it the button cannot
exist for the very person the wizard onboards.

### 5. Backend

Three additions. No schema change, no migration.

**5.1 Dry-run preview**

```
POST /v1/games/{gameId}/variables/preview     (auth: category-settings for this game)

body: {
  categoryId: number | null,        // scope of the proposed definition; null = game-wide
  proposed: {                       // same shape the CRUD endpoint accepts
    name, role, values, defaultValueIndex, sortOrder, description
  } | null                          // null = preview a delete of `name`
  name?: string                     // required when proposed is null
}

→ { result: {
      moved: number,                          // total entries changing board
      unresolved: number,                     // entries whose value matches nothing
      categories: [ {                         // one entry per affected category
        categoryId, display, moved,
        boards: [ { label, key, before, after } ]
      } ]
} }
```

**Which categories are reported.** A category-scoped edit affects exactly that category.
A game-wide edit affects every category that does not override the same name — the endpoint
resolves that set itself rather than taking it as input, so the UI cannot ask the wrong
question. The dialog shows the affected-category count in its lede when it is more than one
(*"This changes 6 categories"*) and lists per-category board movement below it.

Reuses the existing resolution path (`resolve-run-variables.ts`, the same code the rebuild
and the drift probe use) so the preview cannot disagree with what the rebuild later does.
Read-only — it must not write, enqueue, or invalidate anything.

**5.2 Rebuild trigger authz**

`POST /v1/leaderboards/invalidate-cache/{gameId}` currently requires a global role
(`admin` / `board-admin` / `board-moderator`), enforced in the frontend action
(`invalidate-cache.action.ts:30-35`) and backend-side. Extend both to allow a game's own
`game-admin` for **that game only**. The frontend check is advisory; the backend one is the
gate.

**5.3 Combination entry counts**

Add `entryCount: number` per combination to the existing combinations read, so zone 3 can
show what a row holds before it is unchecked.

### 6. Code shape

`variables-section.tsx` is 440 lines today and this work would push it past 700, so it
splits along the zones:

```
manage/variables/
  variables-screen.tsx       composition + shared state (replaces variables-section.tsx)
  in-effect-panel.tsx        zone 1
  scope-tabs.tsx             zone 2 chrome
  variable-table.tsx         extracted from today's RoleTable
  variable-row.tsx           (existing, trimmed)
  variable-form.tsx          (existing, restructured per §3)
  consequence-dialog.tsx     the review step
  combinations-section.tsx   zone 3 (existing + §1 changes)

src/lib/variables/
  effective.ts               source labelling, shadow detection
  consequences.ts            dry-run result → human sentences
  language.ts                the §2 vocabulary + live consequence sentences
```

The three `src/lib/variables/` modules are pure and unit-tested, matching how
`src/lib/setup/` is already structured. Correctness lives there; the components stay thin.

### 7. Wizard step 4

Renders the same `VariablesScreen` the console renders — in-effect panel, tabs, and
sub-boards — plus the step's existing teaching content and the band preview used by steps
2 and 3.

Fixes carried by this step:

- The step's own "Editing category" select becomes the same category picker the console
  sidebar uses, driving one selection rather than competing with the tabs.
- `category-band-preview.tsx:186-189` — "Subcategories come from variables, which you set
  up in the console — not in this wizard" — is wrong and is deleted; it appears one step
  before the variables step.
- The step's primary button is relabelled **Continue**. It calls `onAdvance()` and saves
  nothing; "Save & continue" promises a save that never happens.

## Out of scope

- Drag-and-drop reordering. The ↑/↓ arrows stay, made transactional with revert on
  failure, and the raw integer `sortOrder` field is removed from the form — two mechanisms
  for one concept, one of them meaningless to the user.
- Variable templates or presets.
- Bulk import.
- Any UI for `published` / `version`.
- Role-change migration. Delete-and-recreate stays the answer, now with the consequence
  preview attached so it is an informed one.
- The four setup-flow blockers (audit §A). Separate work.

## Testing

Pure modules, unit-tested in the existing vitest style:

- `effective.ts` — merge/source labelling: shared only, category only, category shadowing
  shared, name collision across scopes, sort ordering.
- `consequences.ts` — dry-run result → sentences: nothing moves, default change, value
  removal, value rename, delete, unresolved values present.
- `language.ts` — role → consequence sentence for 0, 1, 2, and n values; singular/plural.

Backend: the dry-run endpoint asserted to be read-only and to agree with a subsequent real
rebuild on a fixture game.

Manual pass: create a shared variable and confirm the in-effect panel matches the live
board; create a category variable shadowing it and confirm the badge and the warning;
change a default on a category with real runs and confirm the counts match what the rebuild
produces; uncheck a sub-board holding runs; leave a dirty form by every exit.

## Consequences of this design

- The in-effect panel adds a public-endpoint fetch per screen load. It is cached
  (`game-vars:{game}:{category}`) and must be revalidated after every admin write — the
  existing tag convention already covers this.
- The review step adds a round trip before every save. Accepted: it is the feature.
- Sub-boards moving onto the Variables screen makes that screen long. Zone 3 renders only
  when subcategory variables exist, which is the minority of boards.
