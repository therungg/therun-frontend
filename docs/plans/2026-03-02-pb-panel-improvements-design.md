# PB Panel Improvements Design

**Date:** 2026-03-02
**Status:** Approved

## Goal

Make the PB panel both celebrate individual achievements and convey community activity. Keep server-cached data (no real-time). Keep carousel up to 10 slides.

## Changes

### 1. Carousel — tappable slides

Each carousel slide becomes a clickable link to `/{username}`. Currently slides are only swipeable with no navigation action.

### 2. Feed — replaces compact list

Replace the static compact list with a richer feed:

- **Game thumbnails** (36x48, 3:4 portrait) on each row. Runner avatar (24px) overlaps bottom-right corner of the game thumbnail.
- **Row data**: runner name, game/category, time, improvement delta or "First PB!" badge, relative timestamp.
- **15 items** instead of 10.
- Rows link to `/{username}`.
- No filtering or tabs on the frontpage — that belongs on the runs explorer.

### 3. Panel header — "View All" link

Add a "View All" link in the Panel header. Target URL is TBD — will point to the future runs explorer page with a PB filter applied (e.g. `/runs?pbs=true`). Omit the link until that page exists.

## Not changing

- Carousel auto-rotate, progress bar, dots, swipe (±1 clamped), keyboard nav
- Carousel slide content/layout/visual design
- Data fetching approach (server-cached, `'use cache'` + `cacheLife('minutes')`)
- Notable vs. all PBs split (carousel = notable, feed = all recent)
- No real-time/WebSocket updates
