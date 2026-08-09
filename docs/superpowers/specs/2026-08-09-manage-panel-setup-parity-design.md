# Manage panel ↔ setup parity

**Date:** 2026-08-09
**Status:** implemented on branch `manage-setup-parity`. See "What the
build changed about this plan" at the foot.

## Problem

The setup wizard absorbed a lot of work — the category matrix, the group
builder, the rebuilt subcategories/filters grid with its value-suggestions
panel and show-on-board toggles. None of it is visible in the admin console.
Two panes already reuse setup (`game-details` mounts `GameDetailsForm`,
`boards` mounts `BoardCuration` with `context="console"`); the rest do not.

The sharpest gap: **Subcategories & filters is not a console menu item at
all.** The only console path to a variable is opening a category's detail
screen and scrolling to a `VariablesSection` that predates the grid.

## Scope

1. `Subcategories & filters` becomes a console nav item backed by setup's
   `VariablesGrid`.
2. The per-category `VariablesSection` is deleted — one editor for structure.
3. `CategoriesPane` and `GameTab` (groups) adopt the setup steps' *pieces*
   while keeping live writes.
4. `variables-grid.tsx` gets a mechanical split; it is too large to keep
   growing.

Out of scope: the moderation panes, the tile grid's copy, anything about the
public board.

## 1. Nav & IA

`nav-model.ts` gains `variables` in the `board` group, in wizard order:

```
Board
  Setup wizard
  Game details
  Categories
  Groups
  Subcategories & filters   ← new
  Boards
  Moderators
  Merge games & categories
```

- Label: `CONCEPT_LABEL.variables`, already `'Subcategories & filters'`. No
  new vocabulary entry.
- Visibility: `canConfigure`. This is the fall-through default in
  `itemVisible`, so no new branch is needed — only the `NavItemId` union and
  the `ALL_GROUPS` entry.
- It is a real content pane: not in `NON_LANDING_IDS`, so `?pane=variables`
  deep-links and `isLandingPaneId` accepts it.
- It gets a tile on the `/manage` front door: add `'variables'` to
  `TILE_CONCEPT_IDS` and a `CONCEPT_TILE.variables` entry with verb-led copy
  ("Structure each board", naming subcategories, filters and their buckets).
  The vocabulary test pins the two lists together, so both must move.

## 2. The Variables pane

`ContentRouter` gains a `case 'variables'` that renders `VariablesGrid`.

`VariablesGrid` today is `({ data }: { data: WizardData })` but reads only
`data.game`, `data.variables` and `data.categories`. Narrow it:

```ts
export function VariablesGrid({
    game,
    categories,
    variables,
}: {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    variables: VariableRow[];
})
```

- `StepVariables` passes `data.game` / `data.categories` / `data.variables`.
- The console pane passes `props.game`, `props.boardCategories`,
  `props.variables` — all already on `ContentRouterProps`. No new fetch, and
  no synthetic `WizardData`.

Empty state is the wizard's: with no featured categories, show "Feature at
least one category first — subcategories and filters are configured per
featured category." The wizard keeps that check in `StepVariables`; move it
into the grid so both surfaces get it.

The grid reloads via `router.refresh()` as it already does. The console's
`reload()` path is not wired in — the grid owns its own refresh today and
that stays true.

## 3. Category detail loses its Variables section

- `SECTIONS` in `category-editor.tsx` drops the `variables` entry.
- `VariablesSection` (`manage/variables/variables-section.tsx`) and
  `variable-form.tsx` are deleted, along with any action only they call.
- In their place, the category detail shows a single link:
  "Subcategories & filters are configured for all categories at once →"
  pointing at `?pane=variables`.

**Risk, handled explicitly:** these files are where the variable
display-name / LiveSplit-key split landed (editing `name` without
re-deriving `nameNormalized`). Before deleting anything, diff the two
surfaces field by field — name, key, role, buckets, default index,
`showValueOnBoard`, description, sort order — and confirm the grid covers
each. Any field the grid does not cover gets built in the grid first. The
deletion does not ship ahead of the parity.

Rationale for one editor rather than two: every write path is a
full-replace upsert, so each one must carry every field. The
`showValueOnBoard` regression caught during this session's merge is the
concrete cost of a second write path.

## 4. Categories & Groups panes — lift the pieces, keep live writes

The setup steps are staged (draft state → one Save → Continue). The console
panes write on change. Mounting the steps wholesale would import the draft
model into a screen people open to flip one flag. So port the visible gains
instead:

**`CategoriesPane`**
- Activity columns from `StepCategories`: unique runners and playtime
  (`formatPlaytime`, `activityShare` from `~src/lib/setup/*`).
- `CategoryBandPreview`, so the pane shows what the board will look like.
- Existing behaviour unchanged: featured/archived/group/stats columns, the
  `▲` disagreement markers, click-through to category detail, instant writes.

**`GameTab` (groups)**
- `GroupBuilder`'s column layout and nudge controls.
- Writes land immediately through the existing `onGroupsChange` /
  `onRowGroupChange` callbacks rather than accumulating into a save pass.
  `GroupBuilder` therefore needs its persistence to be caller-supplied — it
  takes handlers, not its own `curateCategoryAction` calls.

No draft state and no Save button is added to either pane.

## 5. Splitting `variables-grid.tsx`

2808 lines / 121KB, and it is about to serve two surfaces. Mechanical
extraction, no behaviour change:

- the preview/confirm dialog → its own sibling module
- the per-group (per-variable) editor → its own sibling module

`variables-grid.tsx` keeps the grid shell, the category axis, and the state
that spans groups. The suggestions panel is already a sibling
(`variable-suggestions.tsx`) and stays put.

## Testing

- `nav-model.test.ts` — `variables` appears for `canConfigure`, is absent
  without it, and is a valid landing pane id.
- `variables-grid.test.tsx` — mounts with the narrowed props (proving it
  works outside the wizard) plus the no-featured-categories empty state.
  Existing cases keep passing against the new signature.
- `category-editor` test — the variables section is gone and the link to
  `?pane=variables` is present.
- `categories-table` / `game-tab` tests — activity columns render; group
  changes still write immediately (no Save button).
- Full suite must stay at its current baseline: 3 known pre-existing
  failures in `manage/boards/row-actions.test.tsx`, nothing new.
- `npm run typecheck` must stay at the 356-error baseline.

## What the build changed about this plan

The parity check in section 3 answered three of its own questions before any
deletion, and two of the gaps it was written to catch turned out not to exist:

- **Reserved-param collisions were already covered.** The grid's add form
  carries the same eight-name list the old form did. It moved to
  `variable-keys.ts` so the grid and the form share one copy.
- **Variable reordering was already covered.** `onMoveGroup` / "Move up" /
  "Move down" exist at the foot of each group panel; the old table's per-row
  nudges had nothing the grid lacked.
- **The mod-facing note was the one real gap.** `description` is stored per
  row and the retired form was its only editor, so it came over as
  `group-note.tsx` — board-level, written straight through, since it moves no
  runs.

Section 4 also over-planned:

- **Activity columns already existed** in `CategoriesTable` (Runs / Runners /
  Playtime). What the console genuinely lacked was the *band preview*, which
  now renders in both panes off `previewCategories()` — a pure merge of the
  live-edited rows over the server snapshot, so the preview reflects an
  unsaved Featured toggle.
- **`GroupBuilder` needed no persistence rework** — it already commits
  immediately, so nothing had to be lifted. The console's own
  `GroupsSection` was instead missing `hiddenByDefault` entirely: settable in
  the wizard and nowhere else. It has the toggle now.
- **Added, not planned:** an offer of the wizard's suggested picks while a
  board features nothing at all (it writes on click rather than pre-ticking,
  because this screen writes live), and a correction to the tip beneath the
  table, which still promised a top-5-by-playtime fallback that no longer
  exists.

Section 5 split further than planned — five modules, not two:
`consequence-dialog`, `option-editor`, `add-variable-form`, `tri-checkbox`
and `variable-palette` (the per-variable editor), plus `variable-keys.ts`.
`variables-grid.tsx` went from 2808 lines to 1363.

One incidental fix: `option-editor.tsx` used two **literal NUL bytes** as a
join separator (inherited from the grid). Git and grep both classified the
file as binary because of them — which is why text searches over the grid
returned nothing. They are backslash-u escapes now, same runtime value.
