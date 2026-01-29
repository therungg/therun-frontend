# Current User Live Run Panel Design

**Date:** 2026-01-29
**Status:** Approved
**Location:** New frontpage, top of right column

## Overview

Add a prominent live run panel to the new frontpage that displays the current user's active speedrun in real-time. The panel only appears when the user is logged in and has an active live run, providing detailed at-a-glance information about their current performance.

## Requirements

### Positioning
- **Location**: Top of right column in `app/(new-layout)/frontpage/frontpage.tsx`
- **Visibility**: Only visible when user is logged in AND has an active live run
- **Priority**: Above RacePanel, PatreonPanel, and LatestPbsPanel

### Content Display
- **Detailed personal view** with:
  - Live timer (large, prominent)
  - Current split name and index
  - Delta to PB (color-coded: green if ahead, red if behind)
  - Game image, name, and category
  - Personal Best reference time
  - Time-based progress indicator (relative to PB ± delta)
  - Twitch streaming indicator (if applicable)

### Real-Time Updates
- Use websocket connection via `useLiveRunsWebsocket(username)` hook
- Handle UPDATE messages: refresh live run data
- Handle DELETE messages: hide panel when run ends
- Automatic appearance/disappearance as runs start/stop

### Interaction
- **Entire panel is clickable** → navigates to `/live/{username}`
- Panel acts as quick view with link to detailed live run page

### Visual Design
- **Special highlight styling** to emphasize active run:
  - Animated pulsing border (primary green shades)
  - Subtle glow effect with box-shadow
  - "LIVE" indicator badge
  - Smooth fade-in/out transitions
  - Enhanced hover state

## Architecture

### Component Structure

```
app/(new-layout)/frontpage/panels/current-user-live-panel/
├── current-user-live-panel.tsx          # Server Component
├── current-user-live-panel-view.tsx     # Client Component
└── current-user-live-panel.module.scss  # Styles
```

### Server Component (`current-user-live-panel.tsx`)

**Responsibilities:**
- Fetch session via `getSession()`
- Fetch live run data via `getLiveRunForUser(username)`
- Return `null` if no session or no live run
- Pass initial live data to client component

**Flow:**
```typescript
1. getSession() → session
2. If no session.username → return null
3. getLiveRunForUser(username) → liveData
4. If liveData is undefined/empty → return null
5. Render Panel with CurrentUserLivePanelView
```

### Client Component (`current-user-live-panel-view.tsx`)

**Responsibilities:**
- Manage live run state with websocket updates
- Render live run content
- Handle run end/deletion (hide panel)
- Provide clickable link wrapper

**State Management:**
```typescript
const [liveRun, setLiveRun] = useState(initialLiveData);
const lastMessage = useLiveRunsWebsocket(username);

useEffect(() => {
    if (lastMessage !== null) {
        if (lastMessage.type === "UPDATE") {
            setLiveRun(lastMessage.run);
        }
        if (lastMessage.type === "DELETE") {
            setLiveRun(undefined);
        }
    }
}, [lastMessage]);
```

## Data Flow

### Initial Load (Server-Side)
1. Page loads → Server component executes
2. `getSession()` retrieves current user
3. `getLiveRunForUser(username)` fetches live run from API
4. If live run exists → pass to client component
5. If no live run → return `null` (panel hidden)

### Real-Time Updates (Client-Side)
1. Client component establishes websocket connection
2. Websocket sends messages when run state changes:
   - **UPDATE**: New split, time update, etc. → refresh `liveRun` state
   - **DELETE**: Run finished/stopped → set `liveRun` to `undefined`
3. Component re-renders with updated data
4. Timer updates via `LiveSplitTimerComponent`

### Run State Transitions
- **Run starts**: Websocket UPDATE → panel appears
- **Run progresses**: Websocket UPDATE → data refreshes
- **Run ends**: Websocket DELETE → panel disappears
- **Page refresh during run**: Server fetches current state → panel renders

## UI Layout

### Panel Header
- **Title**: "Your Live Run"
- **Subtitle**: "Currently Running"
- **Link**: "View Details" → `/live/{username}`

### Content Sections

**Top Section:**
- Game image (80x80px, left-aligned)
- Game name (bold, truncated if needed)
- Category name (truncated if needed)
- Twitch icon (if `currentlyStreaming === true`)

**Center Section - Primary Stats:**
- **Live Timer**: Large display using `LiveSplitTimerComponent`
  - Inherits existing timer styling and animation
- **Current Split**:
  - Format: "Split {currentSplitIndex}/{splits.length}: {currentSplitName}"
  - Truncate split name if too long
- **Delta to PB**:
  - Show using `DurationToFormatted` component
  - Prefix with "+" or "-"
  - Color: green if negative (ahead), red if positive (behind)

**Bottom Section:**
- **Personal Best**: Display `pb` time for context
- **Progress Indicator**:
  - Horizontal progress bar
  - Fill based on `currentTime / pb` percentage
  - Color-tinted based on delta:
    - Green tint if ahead of PB
    - Red tint if behind PB
  - Style similar to race panel progress indicators

### Visual Design

**Panel Wrapper:**
```scss
.liveRunPanel {
    border: 2px solid var(--bs-primary);
    animation: live-pulse 2s ease-in-out infinite;
    box-shadow: 0 0 12px rgba(96, 140, 89, 0.3);
    cursor: pointer;
    transition: all 0.3s ease-in-out;

    &:hover {
        box-shadow: 0 0 16px rgba(96, 140, 89, 0.4);
        transform: translateY(-2px);
    }
}

@keyframes live-pulse {
    0%, 100% {
        border-color: var(--bs-primary);
        box-shadow: 0 0 12px rgba(96, 140, 89, 0.3);
    }
    50% {
        border-color: var(--bs-primary-light);
        box-shadow: 0 0 16px rgba(96, 140, 89, 0.5);
    }
}
```

**Live Badge:**
- Position: Top-right corner of panel
- Component: `LiveIcon` from `live-user-run.tsx`
- Size: 16px height
- Includes subtle pulse animation

**Transitions:**
- Fade-in when panel appears (0.3s)
- Fade-out when run ends (0.3s)
- Smooth hover lift effect

## Error Handling

### Session States
- **No session**: Return `null` immediately (panel doesn't render)
- **Session without username**: Return `null`
- **Valid session**: Proceed to fetch live run data

### Live Run Data
- **`getLiveRunForUser` returns `undefined`**: Return `null` (no active run)
- **Empty array returned**: Return `null`
- **Valid LiveRun object**: Render panel

### Websocket Issues
- **Connection lost**: Continue showing last known state
- **Reconnection**: Handled automatically by `useLiveRunsWebsocket` hook
- **No error UI needed**: Graceful degradation

### Data Validation
- Check for required fields before rendering:
  - `currentTime` (required for timer)
  - `pb` (required for progress)
  - `splits` (required for split info)
- Fallback for optional fields:
  - `gameImage`: Use default logo if missing
  - `currentlyStreaming`: Hide icon if undefined
  - `delta`: Calculate from current data if missing

### Edge Cases
- **Multiple tabs open**: All tabs receive websocket updates simultaneously
- **Run starts mid-session**: Panel appears automatically via UPDATE message
- **Run ends mid-session**: Panel disappears automatically via DELETE message
- **Page refresh during run**: Server fetches current state, renders correctly
- **API timeout**: Fail gracefully, return `null` (panel hidden)

## Performance Considerations

### Server-Side
- Session fetch: Already cached by Next.js
- Live run API call: Single request per page load
- Conditional rendering: No overhead for logged-out users

### Client-Side
- Websocket connection: Reuses existing `useLiveRunsWebsocket` pattern
- State updates: Only re-renders panel, not entire page
- Timer updates: Handled by optimized `LiveSplitTimerComponent`
- No extra websocket connections (shares with existing user profile logic)

### Impact
- **Logged-out users**: Zero overhead (panel doesn't render)
- **Logged-in users without runs**: Minimal overhead (one API call, returns null)
- **Active runners**: Standard websocket overhead (already used elsewhere)

## Integration

### Frontpage Updates

**File**: `app/(new-layout)/frontpage/frontpage.tsx`

**Change**: Add panel import and render at top of right column

```typescript
import CurrentUserLivePanel from './panels/current-user-live-panel/current-user-live-panel';

// In render:
<div className="col col-lg-6 col-xl-5 col-12">
    <CurrentUserLivePanel />  {/* NEW - appears only when user has live run */}
    <RacePanel />
    <PatreonPanel />
    <LatestPbsPanel />
</div>
```

### Dependencies
- `getLiveRunForUser` from `~src/lib/live-runs`
- `getSession` from `~src/actions/session.action`
- `useLiveRunsWebsocket` from existing hook
- `LiveSplitTimerComponent` from `~app/(old-layout)/live/`
- `LiveIcon` from `~src/components/live/live-user-run`
- `DurationToFormatted` from `~src/components/util/datetime`
- `Panel` component from `~app/(new-layout)/components/panel.component`

### Component Reuse
- **LiveSplitTimerComponent**: Timer display (already handles live updates)
- **LiveIcon**: "LIVE" badge indicator
- **DurationToFormatted**: Time formatting
- **Panel**: Consistent panel wrapper
- **useLiveRunsWebsocket**: Real-time data hook (existing pattern)

## Testing Considerations

### Manual Test Cases
1. **Logged-out user**: Panel should not appear
2. **Logged-in, no active run**: Panel should not appear
3. **Logged-in, active run**: Panel appears with correct data
4. **Start run while on page**: Panel appears automatically
5. **End run while on page**: Panel disappears automatically
6. **Click panel**: Navigates to `/live/{username}`
7. **Websocket disconnect**: Panel shows last state, reconnects automatically
8. **Page refresh during run**: Panel renders with current live state

### Visual Testing
- Verify pulse animation doesn't interfere with readability
- Check delta color coding (green ahead, red behind)
- Confirm progress bar fills correctly relative to PB
- Test hover state doesn't conflict with pulse animation
- Verify responsive behavior on mobile/tablet

## Future Enhancements (Out of Scope)

These are potential improvements for later iterations:

1. **Split-by-split breakdown**: Expandable view showing all splits with comparisons
2. **Graph visualization**: Mini-chart showing delta over time
3. **Sound notifications**: Optional audio alert for gold splits or PB pace
4. **Customizable display**: User preferences for which stats to show
5. **Comparison mode**: Toggle between PB, Best Segments, or custom comparison
6. **Milestone alerts**: Visual feedback when hitting certain achievements

## Success Metrics

The panel is successful if:
- Speedrunners can quickly check their current run status without leaving frontpage
- Panel appears/disappears reliably based on run state
- Real-time updates are smooth and don't cause layout shifts
- Click-through rate to `/live/{username}` is measurable
- No performance degradation on frontpage load times
- No increase in websocket connection errors

## Notes

- Panel design follows existing patterns from user-profile.tsx for consistency
- Websocket handling mirrors proven implementation
- Visual emphasis distinguishes from static panels
- Entire panel is interactive (not just a button) for better UX
- Graceful degradation ensures no impact if API/websocket fails
