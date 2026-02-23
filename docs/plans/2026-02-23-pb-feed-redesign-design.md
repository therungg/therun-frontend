# Personal Bests Feed Redesign

## Goal

Replace the current dense log-style PB feed with a hybrid layout: a prominent featured card that auto-rotates through the most recent PBs, plus a refined compact list for the rest. Match the visual quality of the hero panel and community pulse.

## Layout

### Featured Card (top, ~160px)

- Shows top 3 most recent PBs, auto-rotating every 8 seconds with a crossfade
- Game art faded on the right using the hero panel's gradient-mask technique
- Left-aligned content: runner name (linked), game · category, large monospace time, improvement delta (green) or "First PB!" badge
- Timestamp bottom-left
- Dot indicators at bottom center (clickable, shows active state)
- Pauses rotation on hover
- Smooth crossfade via CSS opacity transitions + absolute positioning

### Compact List (below, scrollable)

- Remaining PBs (items 4–20) in a more spacious format
- 40px game icons (up from 28px), rounded corners
- Runner name + game · category on left, time + delta + timestamp right-aligned
- Subtle hover effect, clean 1px separator lines
- Same custom scrollbar treatment as current
- Max-height with overflow scroll

### Container

- Wrapped in existing Panel component ("Personal Bests" / "Recent PBs" tab header)
- `p-0` on Panel for edge-to-edge content

## Styling

- All existing CSS variables (`--bs-body-bg`, `--bs-border-color`, `--bs-secondary-color`, etc.)
- Same monospace font stack as hero/community pulse
- Green (#4caf50) for improvement deltas
- Game art mask: `linear-gradient(90deg, transparent 0%, black 25%)` matching hero
- Featured card border-radius matches Panel inner content
- Crossfade: stacked absolutely positioned cards, opacity 0/1 transitions (500ms ease)

## Data Flow

No changes to data fetching. Same `getRecentNotablePBs(20)` + `getGameImageMap()` calls. Client component splits the array: first 3 for featured rotation, rest for compact list.

## Files Modified

- `app/(new-layout)/frontpage/sections/pb-feed-client.tsx` — rewrite component markup
- `app/(new-layout)/frontpage/sections/pb-feed.module.scss` — rewrite styles

## Files Unchanged

- `app/(new-layout)/frontpage/sections/pb-feed-section.tsx` — server component stays the same
- `app/(new-layout)/frontpage/frontpage.tsx` — layout stays the same
