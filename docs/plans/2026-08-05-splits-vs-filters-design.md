# Subcategories vs. filters — splitting one primitive into two concepts

Date: 2026-08-05
Repo: therun-frontend (presentation only; no API or schema change)
Status: **setup step 4 implemented** (`variables-grid.tsx` + `language.ts` +
`variable-view.ts`, on `main` locally, unpushed). Console, submission and
public copy still to do — see Propagation. Browser pass outstanding.

## The problem

`VariableRow.role: 'subcategory' | 'filter'` is one field on one row type, so
every authoring surface presents **one object with a role picker**. That is
correct storage and wrong UI: the moderator has to already understand the
distinction in order to fill in the field that establishes it.

They are not two configurations of one concept. They differ in every dimension
a moderator cares about:

| | `subcategory` | `filter` |
|---|---|---|
| What it does | **Creates leaderboards.** N buckets = N boards, each with its own WR | Narrows the rows of one board |
| Blast radius | Editing **moves existing runs between boards** | Changes nothing about standings |
| Reversible | No — needs `ConsequenceDialog` | Yes, trivially |
| `defaultValueIndex` | Required (where unmatched runs land) | Meaningless |
| Runner experience | Which board am I competing on | A lens I toggle |
| Count matters | Yes — 3 × 2 × 2 = 12 boards, most empty forever | No |
| Sits next to | Categories | Country, Year, Verified, Timing |

The last row is the one the current UI hides hardest. A filter variable is not
a new concept for a runner — the board already has a filter bar
(`reservedParams`: combined, verified, country, year, page, pagesize, timing,
view). A filter variable is **one more control on a bar that already exists**.

## Vocabulary

Three nested levels, no shared word between them. **Call each thing by its
name** (Joey, 2026-08-05) rather than by its consequence:

- **Categories** — what you run. *Any%, 100%, 16 Star*
- **Subcategories** — which leaderboard within a category. A **subcategory
  group** (*Platform*) holds **subcategory options** (*N64, VC, Emulator*);
  each option is a subcategory with its own record.
- **Filters** — what you narrow a leaderboard by once you are on it. A
  **filter** (*Route*) holds **filter options**, sitting beside the built-in
  Country / Year / Verified / Timing.

Earlier drafts used "Separate leaderboards" and "Run details" — descriptions of
the consequence, which read as euphemisms for words the community already uses.
"Subcategory" is the runner's word and matches SRC, so the risk of it colliding
with *category* is smaller than the cost of inventing a synonym.

The one word that stays banned is **variable**: it is the word that spans both
and therefore the word that made them look like the same thing. A moderator
also never reads "role", "bucket" or `nameNormalized`.

`src/lib/variables/language.ts` is the single source for this surface's words
(`SECTION`, `BUILT_IN_FILTERS`, `conversionLabel`, `driftNotice`, plus the
older `ROLE_LABEL` / `roleConsequence`). Internals (`role`, `'subcategory'`,
`bucketKey`, the API contract) are **unchanged everywhere**.

## Surface: two sections, not one list with a role column

```
─ Subcategories ──────────────────────────── 9 leaderboards ─
  Split up a category into different subcategories. Each subcategory
  is its own leaderboard with its own record.

  ┌ Platform ────── on 4 of 4 · 3 subcategory options ───── ▾ ┐
  │                    Any%   100%   16 Star   70 Star        │
  │  N64                ◉      ◉       ◉         ◉  ← runs    │
  │  Virtual Console    ●      ●       ○         ●    that    │
  │  Emulator           ○      ●       ○         ○    don't   │
  │                                                    say    │
  │  Any% → 2 subcategories · 100% → 3 · 16 Star → 1   land   │
  │  [Make this a filter]                              here   │
  └───────────────────────────────────────────────────────────┘

  [+ Add a subcategory group]

─ Filters ────────────────────────────────────────── 1 added ─
  Runners narrow a leaderboard with these. Filters do not create
  subcategories and do not affect records.

  Always available     Country · Year · Verified · Timing
                       ↑ built in, nothing to configure

  ┌ Route ────────── on 2 of 4 · 3 filter options ───────── ▸ ┐

  [+ Add a filter]
```

The bucket × category grid from the step-4 redesign
(`setup/steps/variables/variables-grid.tsx`) is kept — it is the right editor.
It is partitioned by `role` into the two sections, and each section renders a
different field set.

### Consequences of the split

**1. No role picker.** Two different add buttons; `role` is a consequence of
which section you were standing in. The creation flow asks exactly one
question, phrased as an outcome:

> Should each option be its own subcategory with its own record?
> **Yes** → a subcategory group · **No** → a filter

`variable-form.tsx`'s current role radio + explainer block is replaced by this
single question on create, and disappears entirely on edit (see 3).

In step 4 the question is answered structurally: each section carries its own
inline add form (name + options, one per line) which creates the variable on
**every featured category** with the section's role. That is what makes the
board-level view an editor rather than a viewer — previously nothing could be
created from here at all, only from a single category's full editor. The form
checks the name against existing groups, `BUILT_IN_FILTERS` and the reserved
params before submit.

**2. Different fields per section.** `defaultValueIndex` exists only in the top
section, labelled as "runs that don't say land here" — it is currently a
required-but-unexplained field on a form that also renders it for filters,
where it does nothing. Sub-board counts (`subBoardCount`) and the concrete
resulting board names render only up top. Aliases appear in both, framed as a
"also known as" detail rather than structure.

**3. Changing your mind is an explicit conversion, not a dropdown.** "Make this
a filter" / "Make this a subcategory group" — a named action with the existing
`describeConsequences` / `ConsequenceDialog` preview, because it either
collapses N boards into 1 or explodes 1 into N. Today it is a two-click silent
catastrophe on a `<select>`.

**4. `roleDrift` becomes an error, not a footnote.** A variable that is
`subcategory` on three categories and `filter` on one currently renders as a
`⚠ drift` marker in a summary row of the grid. Surface it instead as a notice
with two resolve buttons:

> **Platform** makes subcategories on Any%, 100% and 16 Star but is only a
> filter on 70 Star. → *Subcategories everywhere* · *Filter everywhere*

`VariableGroup.roleDrift` already computes this; only presentation changes.

*Implementation deviation:* the doc first said a drifting group should appear
in **both** sections. Built as a single row placed by `dominantRole` carrying
the notice — two grids for one variable reads as two variables, which is the
exact confusion this split exists to remove. `partitionGroups` enforces the
single placement and has a test for it.

**5. Reserved params stop being a write-time 400.** Showing the built-in
filters as read-only rows in the same list makes the collision visible before
typing, and lets a name clash read as *"Country is already a built-in filter"*
instead of a rejected save.

**6. Write semantics become asymmetric — deliberately.** `VariablesGrid` today
stages *every* toggle behind preview → confirm → apply, which makes adding a
Route option feel as dangerous as re-slicing the board.

- **Subcategories** — keep staging. Edits relocate runs; preview the whole set
  once, confirm once.
- **Filters** — write immediately, like the scalar matrix in zone 1. Additive,
  reversible, touches no standings.

This mirrors the scalar-matrix / variables-grid asymmetry already argued in
`2026-08-05-setup-step-4-redesign-design.md`, one level deeper.

## Preview panel (optional, recommended)

The grid is the editor; a board list beside it is the preview:

```
100% will have these boards:
   ● 100% · N64                (default)
   ● 100% · Virtual Console
   ○ 100% · Emulator       ← not offered
```

This is the only view where "12 boards, 9 of which will be empty forever" is
visible *before* it is caused, and it is the same shape as the managed
`validCombinations` set (`"platform=n64|version=jp"` keys) that
`combinations-section.tsx` edits as an unrelated admin surface today. Unifying
them is out of scope here but this preview is the seam that makes it possible
later. The product is already computed by `subBoardCount`.

## Propagation

The vocabulary has to hold everywhere or the confusion just moves.

| Surface | File | State |
|---|---|---|
| Public board — subcategories | `filters/subcategory-pills.tsx` | Already separate from the filter bar. Check the heading/copy uses the new words. |
| Public board — filters | `filters/filter-bar.tsx`, `variable-pills.tsx`, `filters-popover.tsx` | Filter bar mixes reserved params + filter variables, which is **correct** under this model — no structural change, copy only. |
| Setup step 4 | `setup/steps/variables/variables-grid.tsx` | **Done** — Subcategories + Filters sections, asymmetric writes, drift-as-error, conversion action, per-section add form. |
| Console | `manage/variables/variables-section.tsx`, `variable-table.tsx`, `variable-row.tsx`, `variable-form.tsx` | Same split and same words; role radio → creation question + conversion action. |
| Submission | `submit/submit-form.tsx` | Already splits `subcatDefs` / `filterDefs` (l. 223-224). Frame subcategories as "which subcategory is this?" (required-ish) and filters as optional. |
| Board curation | `manage/boards/subcategory-bands.tsx`, `board-controls.tsx` | Reads subcategories only; copy check. |
| Words | `src/lib/variables/language.ts` | Extend; keep as the only place the copy lives. |

## Explicitly unchanged

- API contract, `VariableRow`, `role` values, endpoints, `nameNormalized`.
- The bucket × category grid as the editing gesture.
- `describeConsequences` / `VariablePreview` — reused, now reached by fewer and
  better-named paths.

## Open questions

1. Does drift block Continue in the wizard, or is it a warning? Leaning
   warning — a half-configured board should still be savable.
2. Do we show the built-in filter rows in the console too, or only in setup?
   Leaning both, for one vocabulary.
3. Preview panel in v1 or follow-up.
