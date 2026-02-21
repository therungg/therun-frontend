# Community Pulse Compact Layout

## Goal

Reduce the height of the Community Pulse panel by switching from a fully stacked vertical layout to a two-column split, without losing any content or visual impact.

## Current Layout (vertical stack)

1. Section header ("Last 24 Hours" + live indicator)
2. 4-cell stat ticker (horizontal row)
3. "All Time" section header + 4 chips
4. "Top Games" section header + 3 horizontal game cards

Three section headers with `border-top` dividers contribute significant vertical space.

## New Layout (two-column split)

```
┌─────────────────────────────────┬──────────────────────┐
│ Last 24h          ● 42 live now │  Top Games           │
│ ┌──────┬──────┬──────┬────────┐ │  ┌─img─ Name ──────┐ │
│ │ PBs  │ Runs │ Atts │ Hours  │ │  │      123 hrs    │ │
│ └──────┴──────┴──────┴────────┘ │  ├─img─ Name ──────┤ │
│ 🏃12K runners 🎮3K games ...    │  │      456 hrs    │ │
│                                 │  ├─img─ Name ──────┤ │
│                                 │  │      789 hrs    │ │
└─────────────────────────────────┴──────────────────────┘
```

**Left column (~60-65%):**
- Section header: "Last 24 Hours" + live indicator (unchanged)
- 4-cell stat ticker in a horizontal row (unchanged layout)
- All-time chips row (runners, games, categories, races)

**Right column (~35-40%):**
- "Top Games" small header
- 3 game cards stacked vertically with current 44x59 images
- Tighter card padding/gaps

**Vertical border** between columns via `border-left` on right column.

## Changes

- Wrap content in a two-column flex container
- Remove separate "All Time" and "Top Games" `border-top` section headers — saves ~2.5rem + borders per header
- All-time chips sit directly below the ticker with a small gap (no header needed)
- Game cards stack vertically in right column instead of horizontal row
- Game card padding tightened slightly

## Unchanged

- All data, count-up animations, polling, intersection observer
- Stat number sizes (2.25rem, amber hero)
- Game image sizes (44x59)
- All-time chip style
- Live indicator
- Panel wrapper

## Responsive

- Below 768px: collapses to single column, games below stats (similar to current mobile layout)

## Files to modify

- `community-pulse-client.tsx` — restructure JSX into two-column layout
- `community-pulse.module.scss` — add two-column grid/flex styles, remove section header margins/borders, add vertical divider
