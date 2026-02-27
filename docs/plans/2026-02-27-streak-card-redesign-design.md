# Streak Card Redesign

## Goal

Replace the current minimal streak bar with a visually compelling streak card that creates emotional investment. Users should feel compelled to maintain their streak daily.

## Files to Modify

- `app/(new-layout)/frontpage/sections/your-stats-client.tsx` — Replace `StreakBar` component with `StreakCard`
- `app/(new-layout)/frontpage/sections/your-stats.module.scss` — Replace streak bar styles with streak card styles
- Move period toggle above the streak card in `DashboardContent` render order

## Data Available (no backend changes needed)

From `DashboardStreak`:
- `current` — active streak in days
- `periodLongest` — best streak in selected period
- `longest` — all-time record streak

From `DashboardStreakMilestone`:
- `type` — `'near_record' | 'new_record' | 'at_risk'`
- `daysToRecord` — days remaining to beat record
- `message` — pre-built message string

## Layout

Order in DashboardContent changes to:
1. Period toggle (moved up from position 3)
2. **Streak card** (replaces streak bar)
3. Highlight carousel
4. Core stats ribbon
5. ...rest unchanged

## Streak Card States

### Active Streak

Full card with warm gradient background. Contents top to bottom:

1. **Hero number**: Fire icon + current streak count (large monospace, ~2rem)
2. **Label**: "days" in small caps below the number
3. **Progress bar**: Fills toward all-time record. Shows `current / longest` ratio. Warm amber-to-orange gradient fill on dark track.
4. **Three-column stats**: Current | Period Best | All-Time — each with a small label and monospace value
5. **Milestone message** (conditional): Uses existing `streakMilestone` data. Shown at bottom with lightning bolt icon.

### Visual intensity by proximity to record

| Threshold | Background | Bar | Icon |
|-----------|-----------|-----|------|
| < 50% of record | Subtle warm amber tint | Amber fill | Amber fire |
| 50-80% of record | Warmer amber gradient | Orange-amber fill | Orange fire |
| > 80% of record (near_record) | Hot gradient, subtle pulse on bar | Orange fill with glow | Orange-red fire |
| At/exceeding record | Gold gradient | Gold fill with glow | Gold fire |

### Zero Streak (CTA)

Card with muted/cool background. Contents:
1. Muted fire icon (gray/dim)
2. "Start Your Streak" heading
3. Motivational line: "Every record starts with Day 1. Complete a run today."
4. Empty progress bar with "Day 0" label — visual tension of an unfilled bar

## No Progress Bar Edge Case

When `streak.longest === 0` (brand new user, never had a streak), the progress bar is indeterminate — just show the current count growing with no max. The bar fills to represent "days so far" at a reasonable visual scale (e.g., cap display at 30 days = full).

## Implementation Notes

- All styling via SCSS modules (existing pattern)
- Progress bar is a CSS div with `width: percentage`, no JS animation needed
- Gradient intensity controlled by CSS classes based on threshold
- Fire icon from `react-icons/fa` (FaFire, already imported)
- Keep the component self-contained within `your-stats-client.tsx`
