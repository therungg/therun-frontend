# Board coherence redesign — design

Date: 2026-07-31
Status: implemented 2026-07-31, pending browser pass
Scope: everything under `/games-v2/[game]` public views — overview, board, standings. Not `/manage`, `/setup`, `/submit`.

## Problem

The game page reads as incoherent and random compared to speedrun.com's game
pages. Joey's named pain points, all confirmed by code inventory:

- Sections don't line up (masthead, table, sidebar feel like separate widgets).
- Too airy — few runs per screen.
- Mixed card/heading styles.
- Navigation between overview / categories / sub-boards feels arbitrary.

Measured incoherence:

- Three card recipes on one page: `board-surface` (plate, railCard, table
  wrapper, notices, popovers) vs hand-rolled `overview/.plaque`
  (`--bs-tertiary-bg`, border alpha 0.7) vs hand-rolled `sidebar/.panel`
  (solid `--bs-border-color`).
- Six border opacities in use: 0.35, 0.4, 0.5, 0.6, 0.7, 1.0.
- Five control languages: `board-chip`, `.tier .chip` override, `control-pill`,
  `.quietChip`, underline view-tabs (plus `board-pill` tags).
- Cover art at three radii across three sizes (lg / md / sm).
- Standings mounts `colMain` without `.grid` → different content width than
  every other view, and no sidebar.
- Board view h1 is 1.25rem while overview h1 is 2.75rem.
- Masthead is two stacked surfaces (`.plate` + `.railCard`).

## Goals (what the redesign optimizes for)

Clear structure, density, one consistent visual language. Explicitly NOT
game-art theming; the existing flat accent tint stays, no gradients
(standing rule).

## Design

### 1. Surface & border vocabulary (`app/(new-layout)/styles/_board.scss`)

- `board-surface` is the only card recipe. `overview/.plaque` and
  `sidebar/.panel` drop their hand-rolled backgrounds/borders and consume it.
- Border opacity collapses to two values: **0.5** for surface outlines,
  **0.35** for internal dividers. All 0.4 / 0.6 / 0.7 / 1.0 usages migrate.
- Radius map: `radius-lg` = surfaces only; `radius-md` = all cover art and
  emblems at every size (heroCover, heroCoverSm, stickyArt, chipEmblem,
  emblem); `999px` = pills. No other radii on this page.

### 2. Controls: exactly three roles

- **Category chip** (`board-chip`) — category rail only.
- **Filter pill** (`control-pill`) — subcategory pills, Find me, Show
  more/previous, rules toggle, standings category toggles, Discord/link/Manage
  chips. The `.tier .chip` override and `.quietChip` are deleted.
- **View tab** (underline, `view-tabs.module.scss`) — unchanged.
- `board-pill` remains as the single *tag* style (WR, Ranked) — a tag, not a
  control.

### 3. One heading system

- Shared section-head treatment (eyebrow + optional mono count + hairline
  rule), used by overview group sections, sidebar panels, and standings.
- Standings' `font-size-xl` title is replaced by the shared treatment.
- Masthead `.endcap` stops un-setting the eyebrow style; endcaps render as
  standard eyebrows.
- Board view h1 promoted from 1.25rem/650 to ~`font-size-xl`/700 so the board
  page has a real title anchor. Overview full hero title unchanged.

### 4. Layout spine (includes the B fold-in)

- All three views render the same `.grid` (main + sidebar) at one width.
  Standings gains the sidebar it currently lacks.
- The masthead's `.plate` + `.railCard` merge into **one** surface: condensed
  hero, category rail, filter tier, and rules toggle become internal sections
  of a single card, separated by 0.35 hairline dividers. Header → categories →
  filters → table reads as one vertical spine, not stacked widgets.
- Sticky slim bar unchanged (glass stays sticky-bar-only).

### 5. Density pass

- Leaderboard table row padding down one step; "When" column narrower.
- Hero three-stat band (runners / attempts / hours) folds into the facts line;
  hero vertical padding reduced.
- Plaque body/podium and sidebar panel padding down one step.
- Success criterion: visibly more runs per screen on a 1080p viewport
  (target ≥ +25% rows above the fold on the board view).

## Non-goals

- No IA/navigation rebuild: root-view logic, category rail concept, tabs, and
  URL scheme stay. (No return of removed pill navigation.)
- No game theming beyond the existing flat `--board-accent-soft` tint.
- No changes to `/manage`, `/setup`, `/submit`, run detail, or drawers beyond
  what shared mixin edits imply.
- No backend or data-shape changes.

## Error handling / edge cases

- Accent sampling failure paths stay silent no-ops (unchanged).
- Empty states (no featured categories, invalid combination notice) restyle to
  the shared surface but keep their logic.
- Reduced-motion behavior unchanged.

## Testing & verification

- `npm run typecheck` and existing vitest suites (labels, category-sort,
  root-view tests must stay green).
- Before/after screenshots of overview, board, and standings via the
  admin-gate screenshot recipe; compare row density.
- Joey's browser pass is the final gate.
