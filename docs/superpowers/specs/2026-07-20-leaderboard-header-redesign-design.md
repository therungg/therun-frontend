# Leaderboard header redesign — "Spec sheet" (Direction B)

**Date:** 2026-07-20
**Status:** Approved design, pending implementation
**Mockup:** https://claude.ai/code/artifact/be409633-eadb-45dd-b087-ba98007fd24f (Direction B)

## Goal

Replace the games-v2 leaderboard hero (`app/(new-layout)/games-v2/[game]/header/game-hero.tsx`)
with a clean, category-free header that shows only game identity: title, cover,
IGDB metadata (release year, platforms, developer, genres, summary), Discord
link, and site stats. The category-scoped world record ("the crown") moves out
of the header onto the rank-1 table row.

Visual direction: flat band on a solid surface with hairline rules — no
backdrop image, no scrim, no glass, no gradients. Site tokens throughout
(DM Sans, `#608C59`, design-tokens.scss).

## Non-goals

- No moderator-editable community links (customizations system stays untouched).
- No backend code changes in this round (data handoffs listed at the bottom).
- No changes to category pills, filters, or board table behavior beyond the
  rank-1 emphasis and the WR-history button's new home.

## 1. Data

`GET /v1/games/:id` already serves the denormalized `pageData` blob with
everything needed. Extend `GameMetadata` + `getGameMetadata()` in
`src/lib/game-mgmt.ts` (same fetch, same `game-meta:{id}` cache tag) with:

- `summary: string | null` — `pageData.game.summary`
- `firstReleaseDate: string | null` — `pageData.game.firstReleaseDate`
- `seriesDisplay: string | null` — `pageData.game.seriesDisplay`
- `genres: string[]` — `pageData.metadata.genres`
- `igdbPlatforms: { name: string; abbreviation: string | null }[]` — `pageData.metadata.platforms`
- `companies: { name: string; isDeveloper: boolean; isPublisher: boolean }[]` — `pageData.metadata.companies`

`loadGamePageData` (`app/(new-layout)/games-v2/[game]/data.ts`) fetches it
inside the existing `Promise.all`, with a `.catch` fallback to the empty shape
(header degrades, page never breaks).

### Derivation helpers

Pure functions, colocated in the header directory with unit tests (follow the
`labels.ts` / `labels.test.ts` pattern):

- **Release year:** moderator `releaseYear` → else year of `firstReleaseDate` → else hide.
- **Platforms:** moderator `platforms` (string[]) → else IGDB abbreviations
  (fall back to name when abbreviation is null), capped at 4 with `+N` overflow → else hide.
- **Developer:** companies with `isDeveloper: true` (joined with ", ") → else
  first company → else hide. Publisher-only rows (regional publishers) are ignored
  when any developer exists.
- **Genres:** capped at 3, joined with ", " → else hide.

## 2. Header component

Rebuild `GameHero` as a flat band (`.b-band` in the mockup):

- **Left:** cover 96×128 (3:4), small radius. Omitted when no image.
- **Middle:** `h1` title; summary clamped to 3 lines (`-webkit-line-clamp`),
  max-width ~66ch; actions row: "Submit a run" (primary, keeps
  `buildSubmitHref` with current board context), "Discord" (quiet button,
  moderator-set `discordUrl` only), "Manage"/"Moderate" (existing logic).
- **Right:** bordered-left facts grid, 2×2: RELEASED / PLATFORM / DEVELOPER /
  GENRES as label-over-value pairs. Missing fields collapse; the whole grid
  is omitted when all four are empty.
- **Bottom strip:** hairline top; stats left (runners, attempts, playtime —
  existing `QuickStats`); right side shows `seriesDisplay` as plain text
  ("Part of the X series") when present — no link, no series page exists yet.
- **Floor** (no IGDB data at all): cover + title + stats + actions — roughly
  today's header minus the crown.

Props removed: `wrEntry`, `boardIsEmpty`, `subcategoryLabel`,
`showMilliseconds` (crown-only concerns — the header no longer renders any
time; `showMilliseconds` itself lives on in the table rows and moves to the
board controls for the WR-history drawer, see section 3). The full `category` object narrows
to `categorySlug: string | null`, kept together with `subcategoryKey` solely
to build the submit href (link context, not displayed category info).

Responsive: facts grid wraps below the title block on narrow viewports;
bottom strip wraps. Reuse existing board breakpoint conventions in
`game-page.module.scss`.

## 3. Crown → rank-1 table row

In `leaderboard-table.tsx` / `leaderboard-row.tsx`:

- When the row with `rank === 1` is present in the rendered entries (page 1,
  no offset hiding it), it gets WR treatment: gold rank numeral
  (`$accent-gold`/`$gold`), "WR" chip, faint gold row tint + 2px gold left rule.
- The "WR" chip renders only when the entry is verified. A pending rank-1
  keeps the existing pending presentation (no chip) — same honesty rule as the
  old crown eyebrow ("Fastest time" vs "World record").
- Deep-linked pages without rank 1 in view get no special treatment.

**WR-history drawer** keeps a home: a quiet "WR history" button in the board
controls row (next to filters/clear-filters), opening the existing
`WrHistoryDrawer` with the current category/subcategory context. The drawer
needs `category`, `subcategoryKey`, `showMilliseconds` — these move to the
board-controls component, which already has category context.

## 4. Cleanup

- Remove dead hero styles: `.heroBackdrop`, `.heroScrim`, `.crown*` rules in
  `game-page.module.scss` once unreferenced.
- `eyebrowText()` and the crown-only imports leave `game-hero.tsx`.
- Verify `WrHistoryDrawer` dynamic import moves with the button.

## 5. Testing

- Unit tests for the four derivation helpers (moderator override, IGDB
  fallback, caps/overflow, empty).
- Existing colocated test conventions; no component snapshot tests (none in
  the project).
- `npm run typecheck` + `npm run lint` clean.

## Backend handoffs (Joey, not this round)

1. Run `backfill-igdb-metadata.ts` to completion (only processes rows with
   `igdbId` set and `igdbSyncedAt` null).
2. Make the backfill/`syncIgdbMetadataToDb` call `rebuildGamePageData` after
   each sync — today `pageData` stays stale until an unrelated game-mgmt
   mutation, which is why e.g. Portal (16) and SM64 (1) show metadata but
   Super Metroid (6252) doesn't.
3. Duplicate-game merges (reassignment project) fix slugs resolving to
   unsynced duplicate rows (e.g. `sm64` → 11175 instead of 1).

The frontend ships with per-field fallbacks either way; the header fills in
as backfill/rebuild lands.
