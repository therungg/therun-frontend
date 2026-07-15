# Board Visual Unification — Design

Date: 2026-07-15
Status: implemented
Branch: `tier1-console-completion` (continues the tier-1 stack)

## Problem

The games-v2 surfaces speak two visual languages. The admin console (moderation
redesign) follows a crafted design system (`.interface-design/system.md`:
severity spine, mono tabular times, token surfaces). Everything built since is
raw Bootstrap: the setup wizard's six steps, the live leaderboard preview, the
new console panes (board health, setup checklist, moderators, game details,
mod applications), the claim CTA, the admin board-claims queue — and the
public leaderboard page itself is a bare `table table-hover` under a stack of
independently-styled chrome (header, category pills, filter bar, rules panel,
floating self-claim button, sidebar). The result reads boring and
onsamenhangend.

Goal: **overzichtelijk** — clean, tight, instantly legible. Not more data;
better-organized data. One visual language, with the public leaderboard as the
flagship whose character the mod surfaces follow.

## Decisions made

- Scope: setup wizard, console panes, public leaderboard, claim + admin claims.
- Leaderboard-first: design the leaderboard's look as the site's flagship
  visual, then restyle the mod surfaces to match it.
- Depth: restyle + layout pass. Page chrome may be merged/moved/collapsed to
  reduce clutter. Behavior, data flow, URLs, copy, and actions stay identical.
- Strategy: shared SCSS foundation (mixins/partials), not a React component
  library and not per-surface freehand.

## Section 1 — Shared foundation (the "board" vocabulary)

New partial `app/(new-layout)/styles/_board.scss` (importable as
`@use '../styles/board'` like `design-tokens`/`mixins`), built on the existing
`_design-tokens.scss`. Provides mixins that per-surface `*.module.scss` files
compose:

- **`board-surface`** — the single card look: 1px border
  `rgba(var(--bs-border-color-rgb), 0.5)`, faint tint
  (`color-mix(in srgb, var(--bs-body-bg) 92%, var(--bs-secondary-bg) 8%)`),
  `$radius-lg`, `$spacing-2xl` padding (compact variant `$spacing-lg`).
  Replaces ad-hoc `border rounded p-3`, `railCard`, and alert boxes.
- **`board-table`** — dense data table (applied to a `<table>`; no Bootstrap
  `.table`): compact rows (`$spacing-xs $spacing-md` cell padding), hairline
  row dividers `rgba(var(--bs-border-color-rgb), 0.2)`, header cells uppercase
  `$font-size-2xs` letter-spaced 0.06em muted, quiet row hover
  (`--bs-tertiary-bg`), no zebra. Times inside always `mono-time`.
- **`mono-time`** — `$font-mono`, `font-variant-numeric: tabular-nums`,
  `--bs-emphasis-color` (promotion of the console's `.time`).
- **`eyebrow`** — uppercase `$font-size-2xs`, letter-spacing 0.08em, 600–700,
  muted (promotion of the console's `.eyebrow`/`.groupLabel`).
- **Rank accents** — `board-rank` cell mixin (mono, right-aligned, narrow) and
  modifiers for ranks 1/2/3: rank-1 `$accent-gold`, rank-2 new token
  `$accent-silver: #9ca3af`, rank-3 new token `$accent-bronze: #b87333`
  (tokens added to `_design-tokens.scss`). Treatment: colored rank number +
  600 weight; no medals/emoji.
- **`control-band`** — horizontal control row: pill-shaped buttons sharing one
  shape (`$badge-radius`, `$badge-padding`, `$font-size-sm`), inactive =
  transparent bg + muted text, hover = `rgba(var(--bs-primary-rgb), 0.06)`,
  active = `rgba(var(--bs-primary-rgb), 0.1)` bg + `--bs-primary` text + 600
  weight. Secondary row variant is visually subordinate (smaller, more muted).
- **`board-input`** — the console's input treatment (subtle inset bg, low-alpha
  border, primary focus ring `0 0 0 3px rgba(var(--bs-primary-rgb), 0.15)`),
  exposed both as a mixin and as a `:global(.form-control/.form-select)`
  scoped-override pattern for Bootstrap-form-heavy files (the trick
  `console.module.scss` `.content` already uses).

Relationship to existing files: `console.module.scss` migrates its duplicated
rules (`.surface`, `.time`, `.eyebrow`, input overrides) to the shared mixins —
zero visual change intended. The orphaned `styles/shared/data-table.module.scss`
stays untouched (used-by-nobody; superseded in spirit by `board-table` —
deleting it is out of scope). `system.md` scope widens from "admin console" to
all games-v2 surfaces; rank accents join severity-spine and mono-times as
signatures; the "Feel" gains the leaderboard's competitive register while the
console keeps its calm one.

## Section 2 — Public leaderboard page (flagship)

Target composition, top to bottom: header → control band → board. Nothing else
competes.

- **Header:** cover art (48×64), game title, runner-count/total-time as one
  quiet meta line (numbers in `mono-time`). All actions right-aligned in one
  group: Submit a run (primary `btn-primary`-weight), Moderate/Manage (quiet),
  claim CTA (quiet). **Self-claim moves into this action group** as a quiet
  action; the floating button above the table is removed.
- **Control band:** `CategoryPills` and `FilterBar` merge into one band
  (styling merge — the components may stay separate files). Row 1: main
  categories with the control-band active treatment. Row 2 (rendered only when
  the category has variables): variable pills + verified toggle in the
  subordinate variant. A small "Rules" toggle sits at the right end of the
  band; expanded rules render as a `board-surface` panel between band and
  table (collapsed by default; `RulesPanel`'s existing expand state reused).
- **Table:** new `leaderboard.module.scss` composing `board-table`. Columns:
  rank (`board-rank`, top-3 accents), runner (strongest cell —
  `--bs-emphasis-color`, 600), times (`mono-time`), date (tertiary), VOD
  (small icon-link, `react-bootstrap-icons`), verified (small icon with
  tooltip/aria-label, not a text column), row-actions menu (unchanged
  behavior). Current-user row: `rgba(var(--bs-primary-rgb), 0.06)` tint +
  3px primary left edge (the spine vocabulary, reused as "you"). Obsolete
  rows keep their dimmed treatment via opacity on text, not the whole row's
  interactivity.
- **Sidebar:** WR card, quick stats, live panel, recent PBs become
  `board-surface` panels with `eyebrow` titles. The WR time is the sidebar's
  single loud element: `$accent-gold`, `mono-time`, `$font-size-2xl`. Stat
  values `mono-time`; labels eyebrow.
- **Pagination:** slim centered bar, mono page numbers, quiet chevron buttons.
- **Empty / invalid-combination states:** calm `board-surface` notices, calm
  copy unchanged, suggestion chips in control-band pill style.

## Section 3 — Setup wizard

One guided flow whose output visibly is the section-2 board.

- **Shell (`wizard-shell.tsx` + `setup.module.scss`):** header matches the
  console pattern — cover, eyebrow ("Game setup"), title, "saves as you go" as
  quiet meta. Stepper becomes a connected progress rail: numbered nodes joined
  by a hairline connector; done = green check node (`--bs-primary` fill,
  white check icon from `react-bootstrap-icons`), current = filled primary
  node + emphasized label, upcoming = muted outline node. Nodes stay
  clickable. "Your board so far" rail: `board-surface`, eyebrow title,
  aligned per-step status rows (green Check icon / muted Dot), sticky.
- **All six steps:** shared section anatomy — each logical section is a
  `board-surface` with an eyebrow section label and a short muted description
  above its fields. Inputs via the `board-input` scoped-override pattern
  applied at the wizard layout level (one wrapper class in
  `setup.module.scss`), so the 971-line category-config and 744-line defaults
  steps get consistent inputs without touching every field. One primary
  action per step; Back/Skip stay quiet in the nav bar.
- **Category-config step:** timing/rules/variables/standards sub-sections
  become uniform surfaces. The **live preview adopts `board-table`** — rank
  accents, mono times; held rows dim + red "would be held" pill using the
  console pill system; pending rows get the neutral pill. Skeleton/loading and
  error states restyled to the calm board language (no `alert-warning`).
- **Defaults + finish:** same anatomy; the finish step's moderator rows use
  the same row treatment as the console moderators pane (section 4).
- Emoji/glyph cleanup: the `✓`/`·` text glyphs in the rail become
  `react-bootstrap-icons` per the system's no-emoji rule.

## Section 4 — Console panes + claims

- **Board health card + setup checklist card:** console surfaces with eyebrow
  titles. Health signals = severity-map pills (red/amber/neutral) with mono
  counts, not alert boxes. The checklist reuses the wizard rail's step-status
  row look — "board progress" looks identical everywhere it appears.
- **Moderators pane + game details pane:** pane-header pattern
  (`paneTitle` + `paneCount`); moderator rows = quiet bordered rows with role
  pills and right-aligned actions; forms via `board-input`.
- **Mod applications card:** applications render as attention items — the
  severity-spine item pattern with a neutral spine, meta row (mono
  timestamps), action row: approve (primary), deny (quiet danger).
- **Claim CTA (game page):** quiet header action consistent with the section-2
  action group; expanded/pending states are small `board-surface` notices,
  not Bootstrap alerts.
- **Admin board-claims queue (`/admin/board-claims`):** same attention-item
  pattern — neutral spine, requester meta, mono timestamps, approve/deny
  action row; calm "all clear" empty state.

## Non-goals

- No behavior, data-flow, copy, URL, or action changes anywhere.
- No React component library extraction (revisit if drift recurs).
- No redesign of the already-crafted console shell/sidebar/queue.
- No changes to `(old-layout)` or other games-v2 pages (submit form, run
  detail) beyond what the shared partial passively improves.
- Not deleting `styles/shared/data-table.module.scss`.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run build` green.
- Visual pass per surface in light **and** dark mode (tokens are
  `--bs-*`-based; dark must not regress) — Joey's browser pass, since the
  sandbox can't run `next dev`.
- Grep-level checks: no `table table-hover` on the leaderboard, no
  `alert alert-warning` in the preview, no text-glyph checkmarks in wizard
  rail, no `border rounded p-3` in touched files.
- `system.md` updated in the same branch.
