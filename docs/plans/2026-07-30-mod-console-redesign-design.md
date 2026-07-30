# Mod console redesign — framed shell, pane + form cleanup

**Date:** 2026-07-30
**Status:** Approved design, not yet implemented
**Scope:** frontend only, `app/(new-layout)/games-v2/[game]/manage/**` (+ the shared `GameDetailsForm` in `setup/`)

## Problem

The mod console (games-v2 manage) renders everything directly on the page
background: the sidebar is separated by a single hairline, some panes wrap in a
subtle `.surface` card while others (tile grid, GameTab, BoardCuration,
NeedsAttention, all configure forms) sit bare on the canvas. Config forms are
raw Bootstrap (`border rounded p-3` mini-cards, `form-check` radios,
`row g-3` two-column cramming, `alert-danger` blocks). The result reads
cluttered and inconsistent, most visibly on the Details & metadata pane.

## Direction (chosen)

**Framed app shell**: the whole console becomes one contained panel — like a
real admin app — with the site background visible around it. Plus pane
normalization and a shared form language. Depth stays borders + tint (the
app's strategy); no gradients, no shadows-as-depth.

## 1. The frame (`console-chrome.tsx` + `console.module.scss`)

One bordered, `radius-lg` panel containing header + body. Shell keeps
`max-width: 1600px` + outer padding so the site background frames it.

- **Header bar** (cover, "Admin" eyebrow, game title, "All your games",
  "Back to leaderboard") moves *inside* the frame as a top bar with a
  hairline bottom border.
- **Sidebar** becomes a tinted column (`color-mix` ~8% secondary-bg, same
  recipe as `board-surface`), hairline right border, stretching the full
  frame height (`align-items: stretch` on the body grid; nav content stays
  `position: sticky` within the column). Nav item active/hover styles
  unchanged.
- **Content region** sits on plain `body-bg` inside the frame with uniform
  padding (`spacing-2xl`). The frame *is* the surface.
- **Mobile (<768px)**: frame goes full-bleed — no radius, no side padding.
  The sidebar overlay drawer behavior is untouched.

All mod pages inherit this automatically: console panes render through
`ConsoleShell`, and category detail / run review / roster / runner render
through `SubrouteChrome` — both wrap `ConsoleChrome`. The cross-game hub at
`/games-v2/manage` has its own layout and is **out of scope**.

## 2. Pane normalization

- Console's `.surface` class flattens to padding-only (the frame already
  provides border + background) — no card-in-card. This is the console
  module's class; the `board-surface` mixin itself is untouched (used
  elsewhere).
- **One shared pane-header pattern**: title + optional count / primary action
  on one line, hairline rule below (`.paneHeader` extended, used by every
  pane). Bare panes (GameTab, BoardCuration, NeedsAttention, configure
  forms) adopt it.
- Self-carding top-level wrappers get de-carded into flat sections:
  `mod-applications-card`, reassign wizards, moderators pane, run-card.
- Inner *item* cards keep their card treatment (attention items, variable
  rows, ban rows, roster rows) — item-on-surface contrast is the point.
- Sub-route local headers (e.g. `category-detail`'s back/title/prev-next
  row) restyle to the shared pane-header pattern.

## 3. Details & metadata pane

`GameDetailsForm` drops the 2-column Bootstrap grid for a single readable
column (~640px max) grouped into labeled sections (uppercase eyebrow heading
+ hairline rule):

- **Identity** — cover image, release year, platforms
- **About** — description
- **Web & community** — URL slug, Discord invite, links

The IGDB match block (`igdb-match-section`) becomes a final **Data source**
section under the same rule pattern instead of a separate card. Save moves to
the pane header (form submits via `form=` attribute, as the setup wizard
already does).

**Shared-form caveat:** `GameDetailsForm` also renders in setup wizard step 1
(recently redesigned with facts/ground-rules zones). If the section chrome
clashes there, gate it behind a prop so the wizard keeps its current look —
verify wizard rendering before merging.

## 4. Form language (console-wide)

Applies to: category editor sections (settings / proof / rules), timing,
standards, variable form, roster invite, and the run-action / manual-time
dialogs.

- **Sections, not mini-cards**: every `border rounded p-3 mb-4` wrapper
  becomes a flat section with eyebrow heading + hairline rule.
- **Field pattern**: reuse `FieldLabel` (label + quiet hint underneath)
  console-wide; single column, no `col-md-6` packing.
- **Choice controls**: binary/ternary radio groups (ranking direction,
  primary timing) become segmented controls; booleans (show milliseconds,
  hide RTA/IGT) become styled switches. Both built from board tokens as
  small shared components/mixins — this replaces stock `form-check`.
- **Save pattern**: per-section save stays (forms are independent), but
  standardized: `board-btn-primary`, right-aligned in a section footer,
  disabled until dirty.
- **Errors**: `alert-danger` blocks become the console's quiet inline
  red-rail note (`.noteInfo` variant with red rail).
- The `.content :global(...)` Bootstrap-override shims in
  `console.module.scss` shrink or disappear as forms adopt the real
  vocabulary.

## Non-goals

- No route/IA changes — nav model, panes, deep links, `?pane=` behavior all
  stay as-is.
- No behavior changes to forms (fields, validation, actions unchanged).
- Cross-game hub (`/games-v2/manage`) untouched.
- Leaderboard-facing board styles (`_board.scss` mixins) untouched except
  additive mixins.

## Verification

- `npm run typecheck` / lint diffed against the existing baseline (~356
  pre-existing errors — gate on the diff, not exit 0).
- Existing console tests pass (`tile-grid`, `nav-model`, `variables-section`
  — note two pre-existing failures on main in `variables-section.test.tsx`).
- Visual pass via the gate-comment + curl screenshot recipe (games-v2 pages
  are admin-gated); light and dark theme both checked.
