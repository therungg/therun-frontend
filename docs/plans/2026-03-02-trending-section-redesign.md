# Trending Section Redesign

## Problem

The current trending games section has several issues:
- All-Time sub-section doesn't belong under "Trending" — static content diluting a dynamic section
- Client component (`'use client'`) with no client-side features — unnecessary JS shipped
- Stats displayed as a 2×2 grid that reads like a spreadsheet
- Game art too small (45×60, 30×40) to be recognizable
- No visual hierarchy between rank positions
- Zebra-striped rows feel tabular rather than browsable
- No empty state
- Mobile hides all stats instead of adapting them

## Design

### Trending Panel (main column)

**Panel wrapper:**
- Title: "Trending Games", subtitle: "Last 24 Hours"
- `panelId="trending"` (unchanged)
- `p-0 overflow-hidden` (unchanged)

**Server component only** — remove `'use client'`. No client-side features needed.

**Card layout (each of the 5 hot games):**
- Flex row: rank number | game art | game info | inline stats
- Game art: **60×80px** with 4px border-radius, 1px border
- Game info: name (bold, ellipsis) + categories (secondary, top 2 joined by ·)
- Stats: single horizontal row of `icon + value` pills, no text labels
  - FaClock (hours, amber highlight), FaUsers (players), FaBolt (attempts), FaTrophy (PBs)
  - Compact number formatting, monospace values
  - Separated by subtle gaps, no grid
- No zebra striping — uniform background, hover effect only

**#1 card emphasis:**
- Art size: **72×96px** (larger than 2-5)
- 3px solid amber left border
- Game name font-size slightly larger (1.1rem vs 1rem)

**Empty state:**
- Centered text: "No trending activity in the last 24 hours"
- Secondary color, 0.9rem, 2rem vertical padding

**Mobile (max-width: 480px):**
- Art shrinks to 48×64 (#1: 56×75)
- Stats collapse to 2 items: hours + players (hide attempts, PBs)
- Keep rank numbers visible

### Most Popular Panel (sidebar)

New panel relocated from the old All-Time zone.

**Panel wrapper:**
- Title: "Most Popular", subtitle: "All Time"
- `panelId="popular"`

**List layout (5 games):**
- Compact rows: rank + art (30×40) + game name + total hours (right-aligned)
- Crown icon in panel header
- Same hover pattern as other sidebar panels

**Data fetching:**
- `getTopGames(5)` — same API call, moved to sidebar
- `cacheLife('days')` since this data barely changes

**Mobile:**
- Hide rank numbers
- Full width when sidebar stacks below main content

## Files to modify

1. `app/(new-layout)/frontpage/sections/trending-section.tsx` — remove allTimeGames fetch, update Panel props, convert to server-rendered markup
2. `app/(new-layout)/frontpage/sections/trending-section-client.tsx` — delete (replace with server component inline or new file without `'use client'`)
3. `app/(new-layout)/frontpage/sections/trending-section.module.scss` — rewrite styles
4. `app/(new-layout)/frontpage/frontpage.tsx` — add MostPopular panel to sidebar column
5. New: `app/(new-layout)/frontpage/sections/most-popular.tsx` — server component for sidebar
6. New: `app/(new-layout)/frontpage/sections/most-popular.module.scss` — styles
