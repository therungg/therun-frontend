# Hero Run Refresh Design

## Problem

The frontpage hero fetches 5 runs on page load (sorted by importance), subscribes to per-user WebSocket updates, but never swaps in new runs. When runners reset, finish, or go offline, the sidebar shows stale/dead runs indefinitely.

## Constraints

- No global WebSocket feed exists — only per-user subscriptions
- Minimize API calls to `/live?limit=5`
- Featured run (left panel) should stay pinned to avoid jarring the user mid-stream

## Design

### Staleness Detection

Detect staleness from existing WebSocket data in `handleWsMessage`:

| Event | Detection | Grace Period |
|-------|-----------|-------------|
| Reset | `currentSplitIndex` drops to 0 (or decreases significantly) from a higher value | 15 seconds |
| Finished | `currentSplitIndex === splits.length` | 60 seconds |
| Disconnect | WebSocket `type: 'DELETE'` message | 10 seconds |

Track staleness per-run via a ref: `Map<username, { reason: 'reset' | 'finished' | 'offline', expiry: number }>`.

### Visual Treatment During Grace Period

When a run enters stale state but the grace period hasn't expired:

- **Sidebar cards**: Reduce opacity (~0.6), show badge ("Finished" / "Reset" / "Offline")
- **Featured panel**: Same dimming + badge if the featured run goes stale
- Card remains interactive during grace period

### Replacement Flow

When a grace period expires:

1. Fetch `/live?limit=5` client-side
2. Diff against current runs by username
3. Replace each stale sidebar run with the highest-importance new run not already displayed
4. If the **featured run** goes stale and expires: auto-promote the top sidebar run to featured, backfill the sidebar slot
5. Unsubscribe from old runner's WebSocket, subscribe to new runner's

### Swap Animation

When replacing a run after grace period:

- Stale card: fade out + slide down (~300ms)
- New card: fade in + slide up (~300ms)
- Triggered via CSS transitions on key change + animation class

### Backup Polling

`setInterval` every 2 minutes fetches `/live?limit=5`. If any returned run has higher importance than a current non-featured sidebar run and isn't already displayed, swap it in with the same animation (no grace period — the old run isn't stale, just less interesting).

### Architecture

All new logic in `hero-content.tsx`:

- **`useRunRefresh` hook**: Encapsulates staleness tracking, grace timers, polling, and replacement logic. Returns current run list + stale states.
- **`handleWsMessage` extension**: Detect resets (splitIndex drops to 0) and finishes (splitIndex === splits.length), mark runs stale with appropriate grace period.
- **`SidebarCard` update**: Receives optional `staleReason` prop for visual indicator.
- **New SCSS classes**: `.sidebarCardStale`, `.sidebarCardEnter`, `.sidebarCardExit` for stale state + swap animations.

No backend changes required. The existing `/live?limit=N` endpoint is sufficient.
