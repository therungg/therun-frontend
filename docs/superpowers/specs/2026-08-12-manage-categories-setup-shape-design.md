# Manage → Categories: setup-shaped, featured-only

Date: 2026-08-12

## Problem

The console's Categories pane (`manage/console/categories-pane.tsx` +
`manage/game-tab/categories-table.tsx`) is a 14-column live-write spreadsheet
over *every* category, defaulting to the `All` filter. On a big game that is
~860 rows, nearly all of them junk harvested from LiveSplit splits. The board
itself is 8 rows. The screen therefore answers "what categories exist" when the
question a moderator actually has is "what is on my board, and where does it
disagree with itself".

Setup step 2 (`setup/steps/step-categories.tsx`) already answers a version of
that question well: band preview, ranked list, activity bars, coverage meter.
The console should read the same way.

## Design

### 1. Featured-only, setup vocabulary

Rows are `isMain && active` only. The pane adopts setup's page vocabulary from
`setup/setup.module.scss` (`stepHeader`/`stepTitle`, `section`, `zoneTitle`,
`previewPanel`, `table`, `activityBar`, `meter`).

```
Categories                                   [ + Add category to board ]
The categories on your board right now.

┌ live band preview (CategoryBandPreview) ─────────────────────────────┐

Order  Category   Group   Runners  Runs  Playtime  Timing  Min  Rules  Sub  ⋯
⠿ ▲▼   Any%       Main    412      3.1k  980h      RTA     —    ✓      2    ⋯
⠿ ▲▼   120 Star   Main    198      1.2k  610h      IGT ▲   —    ✓      0    ⋯

8 featured · covers 94% of finished runs   [meter]
3 archived categories ▾
```

Removed: the Featured checkbox column (every row is featured by definition), the
Archived checkbox column, the All/Current/Archived filter tabs, the select-all
column and bulk-move bar, and the search box (8 rows do not need one).

Kept: drag-reorder and ▲/▼, the group `<select>`, the config columns
(Timing / Minimum / Rules / Sub-boards) with the ▲ outlier marker, `Edit →`,
undo toasts, optimistic row state. `disagreementsByColumn` is computed over the
featured rows only — that cut is what makes ▲ mean something ("this one
category is on IGT while the rest of the board is RTA") instead of drowning in
860 uncurated rows.

Per-row actions: `Edit →` · `Remove` · `Archive`, as three plain link buttons
in the last cell. The design called for a `⋯` overflow menu; at eight rows the
buttons are calmer than they sound and, more to the point, an overflow menu
inside `.table-responsive` (`overflow: auto`) gets clipped, which is a real bug
this screen does not need.

Footer: the coverage meter from setup step 2 (`activityShare`).

Archived categories: a collapsed text link under the table
("3 archived categories") expanding an inline muted list with Restore. Not a
filter tab.

### 2. "Add category to board" dialog

A button in the pane header opens a search-first modal over
`rows.filter(r => !r.isMain && r.active)`, sorted by unique runners (the same
signal setup uses — runner count is harder for one prolific runner to inflate
than raw run count), showing runners / finished runs / playtime and the
activity bar.

Multi-select; confirm features all picked categories at once with bounded
concurrency. Because the pool is ~860 on big games, the dialog reuses setup's
row-cut behaviour: show the busiest 50, let search reach the rest.

The dialog does *not* create new category records. A category with no runs is
inert; categories arrive from submissions and splits imports.

### 3. Seeding on feature-on

`setup/actions/curate-category.action.ts` currently documents seeding
(game-default timing + rules template applied when a category becomes Featured)
as setup-only: "the console categories table always leaves it unset".

The Add-to-board dialog performs the same act as setup step 2 — featuring a
cold category — so it **does** seed, via `buildCategorySeed(metadata)` +
`currentRulesEmpty`. Without it a category added here lands on the board with no
timing and no rules until someone opens Edit. The action's comment is updated:
the old rule was about a bulk checkbox column applied to hundreds of rows, not
about a deliberate one-off "add this to the board" action.

## Non-goals

- Creating category records from scratch.
- Any change to the public board renderer.
- Touching the category detail screen (`manage/category/[categoryId]`).
