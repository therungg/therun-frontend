# Races Hero Cards Redesign

**Date**: 2026-02-25
**Status**: Approved

## Problem

The current races panel is bland. Live and imminent races don't visually excite — they use subtle left borders and small game art. They need to feel spectacular, like a premium sports app.

## Design Direction

Premium sports app energy — clean but bold. Strong typography, live indicators, status-driven color. Game art as a hero element.

## Card Layout & Art

- Cards become tall hero cards (~150px)
- Game art covers full card background via `object-fit: cover`, positioned `center right`
- Bottom-heavy gradient overlay: transparent at top → 85% opaque at bottom
- Secondary left-to-right gradient for text readability
- Cards get `border-radius: 8px` and margin to float within the panel
- Imminent cards get same hero treatment as live (difference via badge/color only)

## Visual Effects & Animation

### Live Cards
- Full border glow: animated amber pulse around entire card
- `box-shadow: 0 0 15px rgba(amber, 0.3), 0 0 30px rgba(amber, 0.15)` pulsing
- 1px amber border all around (replaces 3px left-only)
- LIVE badge: frosted glass (`backdrop-filter: blur(8px)`) with amber background

### Imminent Cards
- Static 1px blue border with subtle steady blue glow
- STARTING SOON badge: frosted blue glass treatment

### Shared
- Hover: `transform: scale(1.01)` (replaces `translateX(2px)`)
- Smooth 0.2s ease transition

## Typography & Information Hierarchy

Content bottom-aligned within card:

```
[LIVE badge]                      [8 runners]
Super Mario 64
16 Star · Leader: Cheese05
00:12:34
```

- Badge: top-left, frosted glass pill, 0.65rem uppercase
- Participant count: top-right, white with text-shadow
- Game name: 1.3rem, weight 800, white, text-shadow for contrast
- Category + leader: 0.82rem, rgba(255,255,255,0.8), text-shadow
- Timer: 2.2rem monospace bold, amber (live) / blue (imminent), text-shadow
- Imminent: "Starts in 3 min · 8 runners waiting" single line for social proof

## Compact Rows

No changes. The visual quietness of rows contrasts with hero cards, making cards pop more.

## Files to Modify

- `app/(new-layout)/frontpage/sections/race-card.tsx` — restructure card markup
- `app/(new-layout)/frontpage/sections/races-section.module.scss` — new hero card styles
- `app/(new-layout)/frontpage/sections/races-section.tsx` — minor: add gap/spacing for floating cards
