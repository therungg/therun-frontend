# Trending Games — Glassmorphism Redesign

## Problem

The trending section looks flat and boring compared to other frontpage sections (PB feed carousel, animated streak cards, glowing race cards). All 5 game rows look identical with no visual hierarchy.

## Design: Frosted Glass Card List

Each game becomes a frosted-glass card with a faint game-art background, creating a visually rich, modern look that stands out from the current flat list.

### Card Surface

- **Background**: `rgba(var(--bs-body-bg-rgb), 0.55)` — semi-transparent surface
- **Backdrop filter**: `blur(20px)` — strong frosted glass effect
- **Border**: `1px solid rgba(255,255,255,0.1)` (dark mode), `1px solid rgba(0,0,0,0.06)` (light mode) — glass edge shimmer
- **Border-radius**: `0.5rem`
- **Gap between cards**: `6px` (up from 2px) so glass edges are visible

### Game Art Background

Each card has the game's cover art as a faint blurred background:
- Positioned right-aligned, `background-size: cover`
- Opacity: `0.12` (dark mode), `0.08` (light mode)
- Gives each card a unique visual identity/tint

### Visual Hierarchy (#1 vs #2-5)

**#1 Game:**
- Green glow border: `box-shadow: 0 0 20px rgba(0,124,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)`
- Green border: `1px solid rgba(0,124,0,0.4)`
- Larger game art: 72×96 (vs 60×80)
- Larger game name: 1.1rem (vs 1rem)

**#2-3 Games:**
- Standard glass card with subtle border
- Normal game art: 60×80

**#4-5 Games:**
- Same as #2-3 but stats use `--bs-secondary-color` for progressive visual fade

### Hover State

- `backdrop-filter: blur(24px)` (sharper glass)
- Background opacity increases
- Shadow deepens: `0 4px 20px rgba(0,0,0,0.15)`
- Art background opacity bumps to ~0.18
- Slight lift: `translateY(-1px)`
- Border brightens

### Stats (All Four)

Aligned right, single row:
- **Hours**: Amber (`#f59e0b`) — accent stat
- **Players**: Body color
- **Attempts & PBs**: `--bs-secondary-color` (muted)
- Monospace values, tiny uppercase labels below
- All four stats visible on desktop

### Categories

- Pills with softer borders (`border-color` at 20% opacity)
- Slightly more padding: `0.15rem 0.5rem`
- On card hover, pills brighten subtly

### Transitions & Motion

- Card background, shadow, transform: `0.2s ease`
- `prefers-reduced-motion: reduce` — disable transforms

### Mobile (≤768px)

- Glass effect stays, simplified shadow
- Stats collapse to vertical, attempts/PBs hidden
- Game art shrinks (48×64, 56×75 for #1)
- Category pills lose border/background

### Implementation Notes

- Game art background uses a pseudo-element (`::before`) with the game image URL, absolute positioned, blurred and faded. The image URL needs to be passed as a CSS custom property (`--bg-image`) or inline style.
- `backdrop-filter` has broad support but needs `-webkit-backdrop-filter` for Safari.
- The card component already receives `game.gameImage` — use it for both the thumbnail and the background.
- Period toggle and overall layout structure remain unchanged.

## Files to Modify

1. `trending-section.module.scss` — Card styles, glass effect, hover states, hierarchy
2. `trending-section-client.tsx` — Add background image inline style, adjust className logic for rank-based hierarchy

## Status: Approved
