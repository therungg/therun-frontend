# Leaderboard Premium Redesign — "The Crown" — Design

Date: 2026-07-16
Status: proposed (awaiting Joey's review)
Depends on: board visual unification (implemented 2026-07-15, `tier1-console-completion`)

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

## Section 1 — The hero (signature element)

Full-width band above the current two-column layout, replacing the current
small header row.

```
┌──────────────────────────────────────────────────────────────────┐
│ ░░ cover art, blur(80px) saturate(140%), scrim → page bg ░░░░░░ │
│  ┌────────┐   SUPER MARIO ODYSSEY                    [Submit run]│
│  │ cover  │   1,204 runners · 18,433 runs             [Manage ▾] │
│  │ 96×128 │                                                      │
│  │        │   WORLD RECORD — ANY%                                │
│  └────────┘   58:11.9   Nindo · 3 days ago · ▸ history           │
└──────────────────────────────────────────────────────────────────┘
```

- **Ambient backdrop:** the game's own cover art, `object-fit: cover`,
  `filter: blur(80px) saturate(140%)`, low opacity, under a two-stop scrim
  (`linear-gradient(transparent → var(--bs-body-bg))`) so it melts into the
  page. Light and dark mode both work because the scrim ends at the theme's
  body bg. Pure CSS — no color-extraction library, no layout shift
  (`overflow: hidden` band, image absolutely positioned).
- **Sharp cover art** 96×128 (3:4 per project rule), `$radius-lg`,
  `$shadow-lg` — the one object that sits "on" the ambience.
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
  `$font-size-display`), actions wrap below.

## Section 2 — Frosted sticky control band

The category pills + variable filter rows become one **sticky** band that
holds under scroll (`position: sticky`, below the site header), on the
Apple-signature material:

- Material mixin `board-glass`: `background: color-mix(in srgb,
  var(--bs-body-bg) 72%, transparent)`, `backdrop-filter: blur(20px)
  saturate(180%)`, hairline bottom border. Fallback (`@supports not
  (backdrop-filter…)`): 96% body-bg opacity.
- Row 1: main category pills (existing active treatment, slightly larger hit
  areas). Row 2 (only when variables exist): variable pills + verified toggle,
  subordinate as today. Rules toggle stays at the band's right end; the
  expanded rules panel renders below the band as today.
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
- Runner name 600 `--bs-emphasis-color`; times `mono-time` linked as today;
  date column becomes relative ("3 days ago", title-attr full date);
  VOD/verified icons unchanged; actions menu unchanged.
- **You-row** keeps its primary tint + spine. If both "you" and podium apply,
  podium wins the spine, tint stays.
- Hover: `--bs-tertiary-bg` wash + the row's time warms to
  `--bs-emphasis-color` — no lift/scale.
- Wizard live preview (`category-leaderboard-preview.tsx`) reuses these
  classes and inherits the look; verify it still reads at compact width.

## Section 4 — Sidebar, pagination, states

- Sidebar loses the WR card (crown replaced it). Quick stats, live panel,
  recent PBs stay as `board-surface` panels but gain the glass material on
  the live panel only (it's the "now" element). Recent-PB times `mono-time`.
- Pagination unchanged structurally; buttons get the larger hit-area pill.
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
- No data/behavior/URL changes; no new columns beyond the avatar cell.
- No changes to console/wizard/claims beyond what shared mixins passively
  give them; no separate podium cards; no webfonts; no color-extraction JS.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run build` green.
- Joey's browser pass, light **and** dark, on: art-rich game, no-art game,
  empty board, 2-entry board, filtered combination, mobile width; sticky band
  over long boards; reduced-motion.
- Grep checks: no emoji glyphs in touched files; no `alert-*` introduced;
  glass used only in the three sanctioned spots.
