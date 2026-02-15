# SEO Metadata Improvements

## Overview

Improve all `generateMetadata` calls across the site for better search engine visibility. Enrich dynamic pages with real data, add metadata to static pages, and fix bugs in the shared `buildMetadata()` helper.

## Changes

### 1. Fix `buildMetadata()` bugs (`src/utils/metadata.ts`)

- `props?.index || true` always evaluates to `true` — change to `props?.index ?? true`
- Same for `follow` — currently uses `props?.index` instead of `props?.follow`, fix to `props?.follow ?? true`

### 2. `[run]/page.tsx` — Load run data for rich descriptions

Fetch the run via `getRun()` (cached, `cacheLife('minutes')`) in `generateMetadata`.

**Title:** `"{username}: {game} - {category}"`

**Description:** `"{username}'s {game} - {category} speedrun | PB: {pb} | {attempts} attempts, {totalTime} played | Sum of bests: {sob}"`

- Format `personalBest`, `sumOfBests`, `totalRunTime` as human-readable durations
- Fall back gracefully if fields are missing

### 3. `[username]/page.tsx` — Show games they run

Fetch `getUserRuns()` (cached) in `generateMetadata`.

**Description:** `"{username} on The Run | Runs {game1}, {game2}, and {N} other games"`

- Extract unique games from runs, pick top 2-3
- If only 1 game: `"Runs {game}"`
- If 0 runs: keep current generic description

### 4. `[username]/[game]/page.tsx` (custom URL) — Match [run] page

Already fetches run data in metadata. Add PB time and attempt stats to description.

### 5. `events/[event]/page.tsx` — Use `buildMetadata()`

Currently constructs metadata manually. Switch to `buildMetadata()` for consistency (robots, keywords, manifest, etc).

### 6. Footer/static pages — Add static metadata exports

Each page gets `export const metadata` with a specific title and description:

| Page | Title | Description |
|------|-------|-------------|
| about | About The Run | Free speedrun statistics tool — profiles, splits analysis, game pages, and LiveSplit integration |
| blog | Blog | Updates and news about new features on The Run |
| blog/[post] | Dynamic from post title | Dynamic from post content |
| faq | FAQ | Frequently asked questions about using The Run |
| contact | Contact | Get in touch with The Run team |
| privacy-policy | Privacy Policy | How The Run collects, uses, and protects your data |
| terms | Terms & Conditions | Terms of use for The Run |
| roadmap | Roadmap | Development progress and planned features |
| discord | Discord | Join The Run's Discord community |
| media | Media Kit | Branding assets and guidelines for The Run |

### 7. Add `formatDuration()` utility

Simple helper to format duration strings (e.g., `"PT1H49M23S"` or millisecond values) into human-readable form like `"1:49:23"` for use in metadata descriptions.

## Out of scope

- OG image generation (dynamic images)
- New JSON-LD schemas
- Canonical URL changes
