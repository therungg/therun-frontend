# PB List Redesign — Rich Row Feed

## Problem

The 20 recent PBs list below the featured carousel is bland, cramped, and forgettable. Small 40px icons, tiny text, tight spacing — it reads like a log file rather than a feed of achievements.

## Solution: Rich Row Feed

Keep the list structure for scanability, but make every row feel substantial and intentional.

### Row Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────┐   runner_name                    1:23:45.670     │
│  │ GAME │                                                   │
│  │  ART │   Game · Category               ▼ 0:32.450      │
│  │   ○  │                                  5 min ago        │
│  └──────┘                                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Changes

**Game art**: 56px (up from 40px), border-radius 10px, subtle box-shadow for depth.

**Avatar**: 28px circle (up from 24px) overlaid at bottom-right of game art, 2px solid border matching bg.

**Typography**: Runner name 0.95rem bold (up from 0.88rem). Game/category 0.82rem (up from 0.75rem). More gap between the two lines.

**Time**: 1.05rem bold monospace (up from 0.9rem).

**Delta badge**: 0.82rem (up from 0.75rem), pill-shaped with green background + subtle green box-shadow glow (`0 0 8px rgba(green, 0.25)`). More padding. The most eye-catching element per row.

**First PB badge**: Same treatment in amber — glow + pill.

**Right column**: Stack vertically (time → delta → timestamp) always, instead of horizontal cramming. Right-aligned.

**Row padding**: 0.85rem vertical (up from 0.7rem). More breathing room.

**Hover**: Slightly stronger bg shift + 2px left border accent in green (or amber for first PBs) that slides in via transition.

**Scroll area**: max-height 500px (up from 440px), ~7 rows visible.

### What Stays the Same

- Panel wrapper, title, subtitle
- Featured carousel (untouched)
- Server component and data fetching
- UserLink, DurationToFormatted, FromNow utilities

### Files Modified

- `app/(new-layout)/frontpage/sections/pb-feed.module.scss` — list styles only (carousel styles untouched)
- `app/(new-layout)/frontpage/sections/pb-feed-client.tsx` — CompactItem markup only

### Files Unchanged

- `app/(new-layout)/frontpage/sections/pb-feed-section.tsx`
- `app/(new-layout)/frontpage/frontpage.tsx`
