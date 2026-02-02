# Controls Bar Visual Refinement Design

**Date:** 2026-02-03
**Status:** Approved

## Overview

Refine the live page controls bar to improve visual hierarchy, spacing, and label clarity. Move filters to the right, increase breathing room, and update terminology for better user understanding.

## User Requirements

- Rename sort option "Best Pace" → "Delta to PB"
- Rename filter "PB Pace" → "Ahead of PB"
- Move filters to the right side of the controls bar
- Improve overall visual structure and appeal

## Design Principles

**Visual Hierarchy:**
1. **Search** - Primary action, center stage
2. **Filters** - Secondary refinement, right-aligned group
3. **Sort** - Tertiary preference, left position

**Spacing Philosophy:**
- More breathing room between controls
- Remove visual noise (dividers)
- Let whitespace create natural separation

## Visual Design

### Layout Structure

```
[Sort ↓]        [🔍 Search input expanding naturally...]        [🔴 Live] [▶️ Ongoing] [⚡ Ahead of PB]
```

**Three distinct zones:**
- **Left:** Sort control
- **Center:** Search input (flexes to fill available space)
- **Right:** Filter controls (grouped together)

### Spacing & Rhythm

**Container:**
- Padding: `p-4` (increased from `p-3`)
- Gap: `gap-4` (increased from `gap-3`)
- Creates more generous breathing room

**Divider Removal:**
- Remove vertical divider between sort and search
- Spacing alone creates sufficient visual separation
- Reduces visual clutter

### Filter Alignment

**Right-aligned grouping:**
- Wrap FilterControl in container with `margin-left: auto`
- Pushes filters to the right edge
- Creates clear visual separation: "Primary controls" vs "Refinement controls"
- Filters maintain their internal `gap-2` spacing

### Typography Changes

**Sort Control:**
- Old: "⚡ Best Pace"
- New: "⚡ Delta to PB"
- Rationale: More precise terminology, clearer meaning

**Filter Control:**
- Old: "⚡ PB Pace"
- New: "⚡ Ahead of PB"
- Rationale: More natural language, easier to understand
- ARIA label remains descriptive: "Filter by runs ahead of personal best"

### Search Input

**Sizing:**
- Remove: `maxWidth: '400px'` constraint
- Behavior: Flexes naturally between sort and filters
- Result: Finds optimal size based on available space

## Responsive Behavior

**Mobile (flex-wrap active):**
Natural stacking order due to flexbox:
1. Sort control (wraps first)
2. Search input (takes full width)
3. Filter controls (group together below)

No special responsive code needed - flexbox handles it elegantly.

## Implementation Details

### File Changes

**1. app/(old-layout)/live/sort-control.tsx**
- Line 17: Change label from "⚡ Best Pace" to "⚡ Delta to PB"

**2. app/(old-layout)/live/filter-control.tsx**
- Line 31: Change label from "⚡ PB Pace" to "⚡ Ahead of PB"
- Line 36: Keep descriptive aria-label (no change needed)

**3. app/(old-layout)/live/live.tsx**
- Line 170: Change `gap-3 p-3` to `gap-4 p-4`
- Lines 180-187: Remove vertical divider
- Line 190: Remove `style={{ maxWidth: '400px' }}` from search wrapper
- Lines 220-223: Wrap FilterControl in div with `style={{ marginLeft: 'auto' }}`

### Code Structure

**Before:**
```tsx
<div className="d-flex flex-wrap align-items-center gap-3 p-3 rounded-3 shadow-sm">
    <SortControl />
    <div>/* divider */</div>
    <div className="input-group flex-grow-1" style={{ maxWidth: '400px' }}>
        {/* search */}
    </div>
    <FilterControl />
</div>
```

**After:**
```tsx
<div className="d-flex flex-wrap align-items-center gap-4 p-4 rounded-3 shadow-sm">
    <SortControl />
    <div className="input-group flex-grow-1">
        {/* search */}
    </div>
    <div style={{ marginLeft: 'auto' }}>
        <FilterControl />
    </div>
</div>
```

## Visual Impact

**Before:**
- Cramped spacing (gap-3, p-3)
- Visual divider creating noise
- Search constrained to 400px
- Filters inline, no grouping
- Labels: "Best Pace" and "PB Pace" (redundant)

**After:**
- Generous spacing (gap-4, p-4)
- Clean separation through whitespace
- Search flexes naturally
- Filters grouped and right-aligned
- Labels: "Delta to PB" and "Ahead of PB" (clearer)

## Success Criteria

- Controls bar feels more spacious and organized
- Clear visual hierarchy: search prominent, filters grouped right
- Labels are more intuitive and less redundant
- Responsive behavior remains clean
- No functional regressions

## Design Philosophy

This refinement embodies the principle: **Less is more**. By removing visual noise (dividers), increasing breathing room (spacing), and clarifying language (labels), we create a more elegant and intuitive interface.

The design respects user intent:
- Search is the primary discovery tool → center stage, natural flex
- Filters are refinement tools → grouped together, right-aligned
- Sort is a preference → left position, unobtrusive

Whitespace does the work of creating visual separation, eliminating the need for explicit dividers.
