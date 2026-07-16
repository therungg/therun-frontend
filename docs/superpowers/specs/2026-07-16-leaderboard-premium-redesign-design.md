# Leaderboard Premium Redesign — "The Crown" — Design

Date: 2026-07-16
Status: implemented
Depends on: board visual unification (implemented 2026-07-15, `tier1-console-completion`)

## Deviations from this plan

1. **Hero is a full-container-width rounded card (App-Store-card style), not
   viewport-bleed.** The page renders inside a Bootstrap `.container`, so a
   true full-bleed backdrop isn't available; the hero is a rounded card that
   fills the container width instead.
2. **The Filters popover renders whenever it has content**, not only when
   filter-type variables exist — it always hosts the verified toggle, so it
   is never empty. Count badge = active var filters + verified.
3. **Band rows wrap (`flex-wrap`) instead of horizontal-scroll-with-edge-fade
   on mobile** — fewer moving parts, same legibility.
4. **The crown column is inset ~2rem from the rail column below it.** The
   hero card's internal padding (`$spacing-3xl`) offsets its grid columns
   relative to the page grid, so the crown → live → recent-PBs vertical
   axis aligns approximately, not exactly. Consequence of deviation 1
   (rounded-card hero); revisit only if the browser pass finds it jarring.

## Implementation notes

- The moderator confirm dialog (`RunActionDialog`) is now portaled to
  `document.body`.
- "Show more" count shows the loaded-row count (`merged.length`), not the
  total.

## Problem

The unified board is clean but sterile. It reads as "well-organized admin
table", not "the home of a game's speedrunning community". speedrun.com — for
all its clutter — gives every game *identity*: themed backgrounds, trophy
icons, color, a sense of place. Our board is the same monochrome
token-Bootstrap surface for every game on the site. Runners will not abandon
SRC for a tidier spreadsheet.

Goal: the leaderboard must look like Apple designed it — material depth,
monumental typography, per-game identity, motion with restraint — while
keeping the scannability the unification pass achieved. Stunning first
impression, disciplined data below it.

## What "Apple-made" means here (concretely)

1. **Materials, not borders.** Translucency, blur, and light — frosted-glass
   surfaces over ambient color — instead of 1px hairlines everywhere.
2. **One monumental focal point.** Apple pages have a hero moment (the album
   header, the watch-face numeral). Ours is the game's art + the world record.
3. **Typography carries hierarchy.** Big confident display sizes, tight
   tracking, few weights. System font stack (SF on Apple hardware) — already
   the app's stack; we scale it up rather than add a webfont.
4. **Identity from content.** Apple Music derives each album page's ambiance
   from the artwork. We do the same with IGDB cover art — every game's board
   is automatically its own place, with zero moderator effort. This is the
   direct answer to SRC's hand-built themes, and it works for all ~30k games
   on day one.
5. **Motion as confirmation, not decoration.** One orchestrated load-in, a
   crossfade when the category changes, nothing else. `prefers-reduced-motion`
   respected throughout.
6. **Subtraction.** Mark the exception, not the rule; make the row the tap
   target, not a bucket of icon buttons; never show a numbered pager. The
   one deliberate non-Apple keep: the 3px accent spine (top-3, "you") — it
   is the site's established signature. Apple-grade, not Apple-brand.

## Approaches considered

- **A. Ambient identity redesign (recommended).** Art-driven hero with the WR
  set monumentally, frosted sticky control band, refined podium rows, airier
  table with runner avatars. Frontend-only for phase 1; per-game uniqueness is
  automatic. Chosen: it is the only option that changes what the page *is*
  rather than how tidy it is.
- **B. Another polish iteration on the calm system.** More spacing/type
  tweaks on the current look. Rejected: this is what the 07-15 pass already
  did; it cannot reach "stunning" because the system's register is
  deliberately quiet.
- **C. Mod-configured theming platform (roadmap Tier 4, item 21).** Custom
  backgrounds/accents/trophies per game. Deferred, not rejected: it requires
  backend + mod adoption and helps only configured boards. A is the floor
  every board gets free; C later multiplies it. A's hero is designed so C can
  swap the ambient source from "cover art" to "mod-chosen theme" without
  relayout.

## Section 0 — Page architecture (one composed grid, not a stack)

Today the page is five blocks under each other (header → band → rules →
table → sidebar cards). The redesign gives the page **one grid, established
in the hero and continued to the footer**. The crown sits in the hero's
right column, and the rail (live + recent PBs) continues that same column
below the band — a continuous vertical axis instead of a banner with stuff
underneath.

```
┌ HERO — full-bleed ambient art ────────────────────────────────────┐
│                                          ┊                        │
│  ┌──────┐  SUPER MARIO ODYSSEY           ┊  WORLD RECORD — ANY%   │
│  │cover │  1,204 runners · 18,433 runs   ┊  58:11.9               │
│  └──────┘  [Submit run] [Manage] [Claim] ┊  Nindo · 3d ▸ history  │
├ CONTROL BAND — sticky glass, full width ─┊────────────────────────┤
│ [Any%] [100%] [Darker Side]   [1.0][1.3] ┊  Filters · 2 ▾  Rules ▸│
├──────────────────────────────────────────┊────────────────────────┤
│  BOARD                                   ┊  RAIL (sticky)         │
│   #  runner        time         when     ┊  ● LIVE NOW            │
│   1  ● Nindo       58:11.9    3d ago  ▶  ┊  RECENT PBS            │
│   …                                      ┊                        │
│              [ Show more ]               ┊                        │
└──────────────────────────────────────────┴────────────────────────┘
```

- One CSS grid (`minmax(0, 1fr) 340px`, `$spacing-3xl` gutter) shared by
  hero content and body; the hero's backdrop is full-bleed but its content
  aligns to the same grid lines as the board and rail. The dashed axis above
  is the design's spine: crown → live → recent PBs.
- **Quick-stats card dies**: runner/run counts move into the hero meta line;
  anything only a mod cares about lives in the console, not here.
- **Rules** stay a disclosure at the band's right end (unchanged behavior).
- Rail is `position: sticky` below the band, so live runs stay in view while
  scrolling long boards.
- Mobile/tablet (`<lg`): single column — hero (crown under title), band,
  board, live, recent PBs.
- The empty-categories page uses the same hero with a calm notice in the
  board column.

## Section 1 — The hero (signature element)

Full-bleed band replacing the current header row. Left grid column: sharp
cover art (96×128, `$radius-lg`, `$shadow-lg`), game title, meta line,
action group. Right grid column: the crown.

- **Ambient backdrop:** the game's own cover art, `object-fit: cover`,
  `filter: blur(80px) saturate(140%)`, low opacity, under a two-stop scrim
  (`linear-gradient(transparent → var(--bs-body-bg))`) so it melts into the
  page. Light and dark mode both work because the scrim ends at the theme's
  body bg. Pure CSS — no color-extraction library, no layout shift
  (`overflow: hidden` band, image absolutely positioned).
- **Game title** in a new display size (`$font-size-hero-title: 2.25rem`,
  weight 700, tracking −0.02em). Meta line beneath it: quiet, numbers in
  `mono-time`.
- **The crown:** the current category's WR, `mono-time` at
  `$font-size-hero-time: 3rem`, `$accent-gold`, with an eyebrow
  ("WORLD RECORD — ANY%"), holder + relative date + the existing WR-history
  drawer trigger beside it. When the category/filter selection changes, the
  time crossfades (150ms out / 150ms in). **The sidebar WR card is removed** —
  the crown replaces it; its drawer trigger moves here.
- **Actions** (Submit a run, Manage/Moderate, claim CTA) right-aligned on
  frosted-glass chips (see Section 2 material) so they stay legible over any
  art.
- **Empty/unset states:** no cover art → scrim over a neutral
  `--bs-tertiary-bg` wash (never a broken image); no WR (empty board) → crown
  slot shows a calm "No verified runs yet — set the first record" with the
  Submit action emphasized.
- Mobile: band shrinks (cover 60×80, title `$font-size-2xl`, crown
  `$font-size-display`), crown moves under the title, actions wrap below.

## Section 2 — Frosted sticky control band

The category pills + variable filter rows become one **sticky** band that
holds under scroll (`position: sticky`, below the site header), on the
Apple-signature material:

- Material mixin `board-glass`: `background: color-mix(in srgb,
  var(--bs-body-bg) 72%, transparent)`, `backdrop-filter: blur(20px)
  saturate(180%)`, hairline bottom border. Fallback (`@supports not
  (backdrop-filter…)`): 96% body-bg opacity.
- Row 1: main category pills (existing active treatment, slightly larger hit
  areas). Row 2 renders only when the category has **subcategory** variables:
  subcategory pills stay visible — board structure must stay discoverable at
  a glance (hiding it is SRC's weakness, not a virtue).
- **Filter-type variables + the verified toggle move into a single "Filters"
  popover** at the band's right end, with a count badge when active
  ("Filters · 2"). Boards without filter variables never show it. The
  existing filter components render inside the popover; URL behavior
  unchanged.
- Rules toggle stays at the band's right end beside Filters; the expanded
  rules panel renders below the band as today.
- Horizontal scroll with edge-fade masks on overflow (mobile).
- Behavior, URLs, components unchanged — this is a styling + `position:
  sticky` wrapper change on the existing `CategoryPills`/`FilterBar`.

## Section 3 — The table (disciplined, but alive)

Keeps `board-table` bones; changes register from dense-admin to
comfortable-premium:

- **Row height** from dense to ~52px: cell padding `$spacing-md $spacing-lg`,
  vertical centering. The board breathes; scanning gets easier, not harder.
- **Avatars.** 28px circle before the runner name. Phase 1: initials monogram
  (deterministic muted hue from name hash, 2 letters) — needs no backend.
  Phase 2: real avatars + country flags when the entries API provides them
  (see Backend asks). Guests keep monograms.
- **Podium rows (top 3, page 1 only):** slightly elevated treatment — 3px
  left accent in gold/silver/bronze (the spine vocabulary), rank numeral at
  `$font-size-md` 700, avatar 32px. No medal icons, no emoji, no separate
  podium cards (they collapse badly on filtered/small boards).
- Runner name 600 `--bs-emphasis-color`; times `mono-time`; date column
  becomes relative ("3 days ago", title-attr full date). A row is four
  things: rank, runner, time(s), when.
- **Verified column removed — mark the exception, not the rule.** Verified
  rows show nothing; pending rows get the quiet neutral pill; the existing
  "set time" pill on manual entries is unchanged. (The verified *filter*
  lives in the band's Filters popover.)
- **The whole row opens the run detail.** The time cell keeps the real
  `<a>`; a stretched-link treatment makes the row the click target (no
  nested-interactive conflicts; keyboard focus lands on the time link).
  A small ▶ VOD glyph sits at the row's trailing edge only when a VOD
  exists, opening the video directly.
- **The visible ⋮ actions column disappears.** The existing actions menu
  (report / hide / appeal / mod verdicts) moves to a trailing button that is
  invisible at rest and revealed on row hover or keyboard focus — same
  dropdown component, no column of chrome. Mobile: long-press is not
  reliable, so the run-detail page (which already has all actions) is the
  path; the hover button simply never shows on coarse pointers.
- **You-row** keeps its primary tint + spine. If both "you" and podium apply,
  podium wins the spine, tint stays.
- Hover: `--bs-tertiary-bg` wash + the row's time warms to
  `--bs-emphasis-color` — no lift/scale.
- Wizard live preview (`category-leaderboard-preview.tsx`) reuses these
  classes and inherits the look; verify it still reads at compact width.

## Section 4 — Rail, pagination, states

- The sidebar becomes a **rail** with exactly two panels: **Live now**
  (glass material — it's the "now" element) and **Recent PBs**
  (`board-surface`, times in `mono-time`). WR card replaced by the crown;
  quick-stats card absorbed into the hero meta line. The rail is sticky
  below the control band.
- **Numbered pagination is replaced by "Show more"** — a single centered
  quiet button that appends the next page and updates the URL to the latest
  loaded page (`?page=N` deep links still render that page, with "Show
  previous" above when landing past page 1). The pager bar component is
  retired from this page; the wizard preview never paginated.
- Empty/invalid-combination states unchanged (already calm).
- Fix ride-along: `run-view/run-badges.tsx` `VerificationBadge` still uses
  Bootstrap `text-bg-success` + `✓`/`⌛` emoji — migrate to `board-pill` +
  `react-bootstrap-icons` per the system's no-emoji rule.

## Section 5 — Motion (one orchestrated moment)

- Page load: hero fades up 12px (250ms), then rows 1–10 stagger in
  (20ms/row, 150ms each). Once per navigation, not per filter.
- Category/filter change: table body crossfade (120ms) + crown crossfade.
- All under `@media (prefers-reduced-motion: reduce) { none }`.
- Easing: existing `$transition-*` cubic-bezier only. No bounce, no parallax.

## Tokens & system changes

Add to `_design-tokens.scss`: `$font-size-hero-title: 2.25rem`,
`$font-size-hero-time: 3rem`, `$avatar-sm: 28px`, `$avatar-md: 32px`.
Add to `_board.scss`: `board-glass` mixin, `board-hero` (backdrop + scrim),
`board-avatar` (monogram). `system.md` updates: signature #4 "ambient art
hero / the crown"; materials rule (glass reserved for hero actions, control
band, live panel — never for content surfaces); motion rule extended with the
load-in sequence.

## Backend asks (documented handoff, not built here)

Per-entry `avatarUrl` and `countryCode` on `LeaderboardResponse.entries`
would unlock phase 2 (real avatars, flags — SRC parity where it matters).
Frontend ships monograms first; no blocking dependency.

## Non-goals

- No mod-configured theming (Tier 4 — designed-for, not built).
- No data or URL-scheme changes. Behavior changes are limited to the four
  enumerated ones: row-as-link, hover-revealed actions, Filters popover,
  "Show more" pagination. Everything else is restyle/relayout only.
- No changes to console/wizard/claims beyond what shared mixins passively
  give them; no separate podium cards; no webfonts; no color-extraction JS.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run build` green.
- Joey's browser pass, light **and** dark, on: art-rich game, no-art game,
  empty board, 2-entry board, filtered combination, mobile width; sticky band
  over long boards; reduced-motion.
- Interaction pass: keyboard-only run-detail navigation (focus lands on time
  link, actions button visible on focus), Filters popover with active-count
  badge, "Show more" appending + deep-link `?page=3` rendering, mod actions
  still reachable on touch devices via run detail.
- Grep checks: no emoji glyphs in touched files; no `alert-*` introduced;
  glass used only in the three sanctioned spots.
