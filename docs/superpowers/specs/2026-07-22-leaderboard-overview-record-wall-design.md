# Leaderboard overview "record wall" redesign

**Date:** 2026-07-22
**Status:** Approved (brainstorm with Joey, visual companion session)
**Scope:** `app/(new-layout)/games-v2/[game]/overview/*` + shared `GameHero` + category-image support in console. Frontend only; one small backend handoff.

## Goal

The game overview page (root `games-v2/[game]` URL with 2+ Featured categories) reads as a **record wall**: every featured category is a trophy plaque whose record is the visual star. Direction chosen over "ambient stage" and "clean sheet" alternatives. The governing quality bar, verbatim from Joey: **super tight** — pop comes from the gold time, avatar ring, and podium, never from decoration; spacing is disciplined, edges are few, nothing competes.

## 1. Hero — spec sheet, tightened (shared component)

`GameHero` is shared with the board page; both pages get this. Collapse the current three stacked zones (heroTop, factsGrid, heroStrip) into **one row + one hairline**:

- **Cover** 64×85 (3:4, per game-image rule), radius-md.
- **Title block** (flex-1):
    - Game title (existing hero-title scale, tight leading).
    - Facts line — one quiet `font-size-xs` tertiary line from the existing `game-facts.ts` derivations, dot-separated: `2017 · PC, Switch · Team Cherry · Metroidvania`. Missing facts just drop out. Series note appends to this line (`· Part of the X series`).
    - Stats line — `font-size-xs`, numbers bold emphasis-color, labels tertiary: `**1,204** runners · **86k** attempts · **4y 2mo** played`.
- **Actions** right-aligned, vertically centered: primary gold "Submit a run" (submit-href context props unchanged), quiet chips Discord / Manage / Moderate, Claim CTA logic unchanged.
- **Removed entirely:** IGDB summary paragraph, `factsGrid` spec-sheet block, `heroStrip`. `game-facts.ts` stays (feeds the facts line).
- One bottom hairline, then the wall. Vertical padding: `spacing-lg` top, `spacing-md` below — the hero must feel like a masthead, not a section.
- Mobile (<992px): cover+title+facts/stats wrap as a block, actions wrap below. Cover 48×64.

## 2. Plaque card

Replaces `CategoryCard`. A raised surface — subtle elevated background (distinct from page bg) + 1px low-alpha border + radius-lg — not the current outline-only box. Three zones:

### Header row
- **Emblem** 36×36, radius ~8px: category image if set, else fallback tile (see §3).
- Category name (`font-size-md`, 700, emphasis) with small stats line under it (`font-size-2xs` tertiary): `312 runners · 24k attempts`.
- Right-aligned eyebrow: gold `◆ WR` when rank-1 entry is verified; dim `Fastest` when not.

### Record row
- `RunnerAvatar` (existing component, `md` 34px), **gold ring** when verified (neutral border when not).
- Time: mono, `font-size-xl`+, 700, `$accent-gold` when verified, emphasis-color when not. Millis per category `showMilliseconds`.
- Holder line under time: `UserLink` + `CountryFlag` + `· 2mo ago` (existing `relativeDate`, tertiary, title = full date).

### Podium footer
- Hairline-top row, `font-size-2xs` tertiary: `2 Ferb 33:01.5   3 Zaphie 33:12.9` (rank mono, `UserLink`s, abbreviated times — mono).
- Board has 1 entry → footer omitted (no placeholder).
- Board has 2 entries → rank 2 only.

### States
- **No runs:** header row as normal, body = "No runs yet — set the first record" (link to submit, z-raised above stretched link). No avatar/time/footer.
- Whole card is a stretched-link to `buildBoardHref`; runner/submit links sit above it (existing z-index pattern).
- Hover: border brightens + background lifts one step. Transition fast. No transforms, no shadows-on-hover — tight, not bouncy.

### Tightness rules (binding)
- Zone gaps inside the plaque: `spacing-sm`/`spacing-md`, never larger. Grid gap `spacing-md`. Grid min column 280px (unchanged).
- Every text element maps to an existing design token; no new font sizes.
- No per-card art backdrops or banners — the emblem is the only image in a plaque.

## 3. Category emblem

- New optional field `imageUrl` on categories, surfaced through `ResolvedCategory`.
- **Fallback (day-one common case):** neutral dark tile, first letter of category display, `font-size-sm` 700 muted. Must look intentional, not missing.
- **Console:** category edit form gains an image upload using the existing S3 presigned-upload flow (same as game cover). Helper text: "Square, iconic art — renders at 36px. A boss face or item beats a screenshot."
- Frontend treats `imageUrl` as optional everywhere → ships before the backend lands, zero deploy coordination.

### Backend handoff (Joey)
1. Migration: `categories.image_url` (nullable text).
2. Category update API accepts `imageUrl`; resolved-game payload serves it.
3. Rides the /mod proxy base path if any new endpoint is needed (API Gateway resource cap) — expected: none new, just field additions.

## 4. Data changes

`overview/data.ts`:
- `fetchCardWr` → `fetchCardEntries`: identical `getLeaderboard` call with `pageSize: 3`.
- `OverviewCardData.wrEntry: LeaderboardEntry | null` → `entries: LeaderboardEntry[]` (index 0 = WR when `rank === 1 && time !== null`, else treat as empty; 1–2 = podium).
- Request count per page unchanged (one per featured category). If overview latency ever demands it, the existing backend wishlist item "batch rank-1 endpoint" becomes "batch top-3".

## 5. Layout, groups, empty state

- Page grid (`board-page-columns`) + sidebar rail: unchanged.
- Group sections: keep eyebrow section titles above each plaque grid; single unlabeled section skips headers (existing `sectionize` logic untouched).
- Empty state ("No leaderboards configured yet" + console CTA): restyled onto the plaque surface language; copy and role-gating unchanged.
- Mobile: plaque grid single-column via existing auto-fill; podium footer may wrap to two lines.

## 6. Out of scope

- Board page table, control band, drawers — untouched (hero change is the only board-page effect).
- Ambient art backdrops (rejected direction A), ledger table (rejected direction B).
- Batch top-3 endpoint (wishlist only).

## 7. Testing & verification

- Update `data.ts` consumers + any test touching `OverviewCardData`.
- Existing `game-facts`, `category-visibility`, `category-sort` tests unaffected (facts derivations unchanged).
- Podium slicing (WR/rank-2/rank-3 extraction, 0/1/2/3-entry boards) gets a unit test.
- `npm run typecheck` + `npm run lint` clean.
- Browser pass: overview at desktop/mobile widths, verified vs unverified records, no-image emblems, no-runs card, group sections, board-page hero regression. (Folds in the still-outstanding overview browser pass noted in project memory.)
