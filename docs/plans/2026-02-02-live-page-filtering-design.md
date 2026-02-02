# Live Page Filtering Design

**Date:** 2026-02-02
**Status:** Approved

## Overview

Add filtering capabilities to the live runs page, allowing users to filter runs by streaming status, run state, and performance. Filters will be implemented as toggle buttons in the existing controls bar alongside sort and search.

## User Requirements

Enable speedrun watchers to quickly find runs matching specific criteria:
- Runs currently streaming on Twitch
- Active runs (not reset or finished)
- Runs ahead of personal best pace

## UI Design

### Layout

Filters appear as pill-shaped toggle buttons in the controls bar after the search input:

```
[Sort Icon + Dropdown] | [Search Icon + Input] [Live] [Ongoing] [PB Pace]
```

### Toggle Button Design

**Visual Style:**
- Height: 32px (matches search input)
- Border-radius: 16px (pill shape)
- Gap between buttons: 8px
- Icons + labels for clarity

**States:**
- **Active:**
  - Live on Twitch: Red background (#dc3545)
  - Ongoing: Blue/primary background (#0d6efd)
  - PB Pace: Green/success background (#198754)
  - White text
- **Inactive:**
  - Transparent background
  - 1px border in theme border color
  - Muted text color
- **Hover:**
  - Slight scale transform (1.02)
  - Smooth transition (0.15s ease)

**Responsive Behavior:**
- Desktop: Filters inline with search
- Mobile: Stack filters below search on small screens

### Filter Behavior

**Logic:**
- All filters are cumulative (AND logic)
- Filters work together with search
- Active filters persist through websocket updates
- Filter state saves to URL params for shareability

**Empty States:**
- No matches: "No runs match your current filters. Try adjusting your filters or search."
- Search + filters: "No runs matched your search and filters."

## Filter Specifications

### 1. Live on Twitch
- **Label:** "🔴 Live"
- **Logic:** `liveRun.currentlyStreaming === true`
- **Edge case:** Treat `undefined` as `false`

### 2. Ongoing
- **Label:** "▶️ Ongoing"
- **Logic:** `!liveRun.hasReset && !liveRun.endedAt`
- **Description:** Filters out reset and completed runs

### 3. PB Pace
- **Label:** "⚡ PB Pace"
- **Logic:** `liveRun.delta < 0`
- **Edge case:** Exclude runs where `liveRun.pb` is null/undefined or `liveRun.delta` is missing (cannot determine pace without PB)

## Technical Implementation

### Type Definitions

```typescript
interface FilterState {
    liveOnTwitch: boolean;
    ongoing: boolean;
    pbPace: boolean;
}
```

### New Files

**`app/(old-layout)/live/filter-control.tsx`**
- Component for filter toggle buttons
- Props: `filters: FilterState`, `onChange: (filters: FilterState) => void`
- Renders three toggle buttons with proper accessibility
- Handles click events and visual states

### Modified Files

**`app/(old-layout)/live/live.types.ts`**
- Add `FilterState` interface export

**`app/(old-layout)/live/utilities.ts`**
- Add `filterLiveRuns(liveRun: LiveRun, filters: FilterState): boolean`
  - Returns `true` if run passes all active filters
  - Returns `true` if no filters active (show all)
  - Short-circuits on first failed filter for performance
- Add `parseFilterParams(searchParams: string): FilterState`
- Add `serializeFilterParams(filters: FilterState): string`

**`app/(old-layout)/live/live.tsx`**
- Import `FilterControl` component
- Add `filters` state: `useState<FilterState>({ liveOnTwitch: false, ongoing: false, pbPace: false })`
- Add `useEffect` for URL param synchronization:
  - Read params on mount
  - Update URL when filters change (without reload)
- Insert `FilterControl` component after search input (line ~186)
- Update filter chain in render:
  ```typescript
  Object.values(updatedLiveDataMap)
      .filter(liveRun => liveRunIsInSearch(liveRun, search))
      .filter(liveRun => filterLiveRuns(liveRun, filters))
  ```
- Update empty state messages to mention filters

### URL Parameter Format

**Format:** `?filters=live,ongoing,pbpace`

**Mapping:**
- `live` → `liveOnTwitch: true`
- `ongoing` → `ongoing: true`
- `pbpace` → `pbPace: true`

**Invalid params:** Silently ignore unknown filter names

## Accessibility

- Each toggle button includes `aria-pressed` attribute (`"true"` / `"false"`)
- Clear `aria-label` for screen readers (e.g., "Filter by live on Twitch")
- Keyboard navigation: Space/Enter to toggle
- Focus styles visible and consistent with theme

## Edge Cases

1. **No PB to compare:** Runs without `pb` or `delta` excluded from "PB Pace" filter
2. **Streaming status unknown:** `currentlyStreaming` undefined treated as `false`
3. **All runs filtered out:** Show clear message mentioning filters
4. **Filter + Search combo:** Empty state mentions both
5. **Invalid URL params:** Silently ignore, apply valid filters only
6. **Websocket updates:** New/deleted runs respect active filters immediately

## Future Considerations

Potential filters for future iterations:
- Real-time vs Game-time timing method
- Console vs Emulator
- Marathon/event runs
- Region/platform filters
- World record pace (requires WR data integration)

## Success Criteria

- Users can quickly filter runs by streaming status, run state, and performance
- Filters work seamlessly with existing search and sort
- UI is responsive and accessible
- Filter state persists via URL for sharing
- No performance degradation with filters active
