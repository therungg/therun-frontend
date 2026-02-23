# Trending Games Panel Redesign — Design Doc

**Status:** Approved
**Date:** 2026-02-23

## Goal

Replace the current Trending section (hot games + player stats) with a two-zone "Trending Games" panel focused entirely on game/category data. Remove top games from the Community Pulse panel.

## Architecture

### Two-Zone Panel

**Zone 1 — "Hot Right Now"** (client-rendered, interactive)
- Period pill selector: 24h | 3 days | 7 days (default) | 30 days
- Metric sort toggle: Playtime (default) | Players | Attempts | PBs Set — re-sorts client-side, no new fetch
- 5-6 rich game cards per period, each showing:
  - Rank number (1-6) + game art (48×48, rounded 4px)
  - Game name (linked to game page)
  - Top 1-2 categories inline below game name (muted smaller text)
  - 2×2 mini stat grid: Playtime (hrs) | Unique Players | Attempts | Finished Runs
  - Primary sort metric slightly emphasized
- `minPlayers=2` for 24h/3d, `minPlayers=3` for 7d/30d

**Zone 2 — "All-Time"** (server-rendered, static)
- Visually distinct: subtle divider, slightly different background treatment
- Trophy/crown icon in header
- 5 compact game rows: rank + game art (32×32) + name + total hours + unique runners
- No category drill-down, no interactivity

### Data Sources

| Endpoint | Purpose |
|----------|---------|
| `/games/activity?from=X&to=Y&type=games&minPlayers=N&limit=6` | Hot games for selected period |
| `/games/activity?from=X&to=Y&type=categories&gameId=X&limit=2` | Top categories per hot game |
| `/v1/runs/games?sort=-total_run_time&limit=5` | All-time top games |

### New Types

```typescript
interface GameActivity {
    gameId: number;
    gameDisplay: string;
    gameImage: string;
    totalPlaytime: number;
    totalAttempts: number;
    totalFinishedAttempts: number;
    totalPbs: number;
    totalPbsWithPrevious: number;
    uniquePlayers: number;
}

interface CategoryActivity extends GameActivity {
    categoryId: number;
    categoryDisplay: string;
}
```

### New Data Functions (highlights.ts)

```typescript
getGameActivity(from: string, to: string, limit?: number, minPlayers?: number): Promise<GameActivity[]>
getCategoryActivityForGame(gameId: number, from: string, to: string, limit?: number): Promise<CategoryActivity[]>
```

### Client-Side Period Switching

- SWR with key derived from period
- Date ranges calculated on client: `new Date()` minus 1/3/7/30 days → formatted as `YYYY-MM-DD`
- Default 7-day data fetched server-side and passed as initial SWR data (no loading flash)
- Categories fetched in parallel for all visible games on period change

### Community Pulse Changes

- Remove `topGames` prop from `CommunityPulseClient`
- Remove `getTopGames()` call from server component
- Remove Top Games section and related SCSS
- Keep: 24h ticker, live count, all-time footer

### File Changes

| Action | File |
|--------|------|
| Rewrite | `trending-section.tsx` — server component, fetch 7d + all-time |
| Create | `trending-section-client.tsx` — client component, period switching, SWR, metric sort |
| Rewrite | `trending-section.module.scss` — styles for both zones |
| Modify | `community-pulse.tsx` — remove getTopGames call |
| Modify | `community-pulse-client.tsx` — remove topGames prop and Top Games section |
| Modify | `community-pulse.module.scss` — remove top games styles |
| Modify | `src/lib/highlights.ts` — add GameActivity types and fetching functions |

### Removed

- Player stats (Most Active Runners, Most PBs Runners) — dropped from trending
- Top Games from Community Pulse — moved to trending All-Time zone
- `getWeeklyTopRunners()` and `getMostPBsRunners()` calls from trending (functions remain in highlights.ts for potential use elsewhere)
