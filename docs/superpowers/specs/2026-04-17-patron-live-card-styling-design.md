# Patron-Styled Live Run Cards

## Goal

Make the `LiveUserRun` cards on the live page visually reflect each patron's chosen style (color, gradient, animation). Treatment is progressive by tier — higher tiers get more expressive cards.

## Scope

- **In scope**: `LiveUserRun` card component and its SCSS
- **Out of scope**: `RecommendedStream` hero section, `PatronPreferences` type changes, backend changes

## Current State

- Cards already use the patron's color/gradient as a border (`borderColor` / `borderImageSource`)
- `resolveFill()` resolves patron preferences into a solid or gradient fill
- `usePatreons()` provides patron data (tier, preferences) client-side
- `PatronPreferences` supports: `customColor`, `customGradient`, `gradientAngle`, `gradientAnimated`, `bold`, `italic`

## Design

### Approach: CSS Custom Properties + Tier Classes

Set CSS custom properties on the card element and apply tier/modifier CSS classes. All visual logic lives in SCSS.

**Custom properties (set on card `style` prop):**

| Property | Value |
|----------|-------|
| `--patron-primary` | Primary color (solid color, or first gradient stop) |
| `--patron-gradient` | Full gradient CSS value, e.g. `linear-gradient(90deg, #ff0, #0ff)` — only set for gradient patrons |

**CSS classes (added to card `className`):**

| Class | When |
|-------|------|
| `.patronTier1` | Patron is tier 1 |
| `.patronTier2` | Patron is tier 2 |
| `.patronTier3` | Patron is tier 3 |
| `.patronGradient` | Patron has a gradient fill (not solid) |
| `.patronAnimated` | Patron has `gradientAnimated: true` |

### Tier 1 — "Tinted"

- **Border**: existing colored border behavior (unchanged)
- **Background**: `::before` pseudo-element with `background: var(--patron-primary); opacity: 0.08`
- Card container gets `position: relative` to anchor the pseudo-element. `overflow: hidden` (already set) clips it to the border radius.

### Tier 2 — "Washed"

Everything from tier 1, plus:

- **Background**: for `.patronGradient`, `::before` uses `background-image: var(--patron-gradient); opacity: 0.10`. For solid patrons, `opacity: 0.12`.
- **Avatar ring**: `.liveRunAvatar` border becomes `var(--patron-primary)` with `box-shadow: 0 0 6px color-mix(in srgb, var(--patron-primary) 40%, transparent)`.
- **Split timeline**: `.splitSegmentCurrent` inside a tier 2+ card pulses in `var(--patron-primary)` instead of white.

### Tier 3 — "Full Canvas"

Everything from tier 2, plus:

- **Background**: `::before` opacity bumped to `0.15` (solid) / `0.18` (gradient).
- **Animated sweep**: for `.patronAnimated`, the `::before` pseudo-element gets `background-size: 200% 100%` and a `background-position` animation cycling from `0% 50%` to `100% 50%` over 8 seconds (`linear infinite`).
- **Game image vignette**: `::after` on `.liveRunArt` — a gradient overlay from `transparent` to `var(--patron-primary)` at ~20% opacity on the right edge. Blends the game art into the tinted card background.

### Accessibility

- All animations (`patronAnimated` sweep, split timeline pulse override) are disabled inside `@media (prefers-reduced-motion: reduce)`. The static tint/gradient background remains.
- Background tints are low opacity (8-18%), so text contrast is not meaningfully affected. The card text color and font remain unchanged.

## Files Modified

### `src/components/live/live-user-run.tsx`

Extend the existing `useEffect` (lines 93-116) that computes `liveUserStyles`:

1. Resolve the patron's fill via `resolveFill()` (already done).
2. Compute `--patron-primary` (solid value, or first gradient stop).
3. Compute `--patron-gradient` (the full `linear-gradient(...)` string, using the patron's angle and colors) — only for gradient patrons.
4. Determine tier class: `styles.patronTier1` / `styles.patronTier2` / `styles.patronTier3`.
5. Determine modifier classes: `styles.patronGradient` if gradient, `styles.patronAnimated` if `gradientAnimated`.
6. Apply custom properties via `style` prop alongside existing border styles.
7. Apply tier/modifier classes via `clsx` alongside existing classes.
8. For tier 2+: apply `borderColor` and `boxShadow` inline styles to the `.liveRunAvatar` div.

The existing border inline styles remain unchanged.

### `src/components/css/LiveRun.module.scss`

Add new rules after the existing `.liveRunActive` block:

1. **Shared patron base** (all tiers): `position: relative` on the container. `::before` pseudo-element with `position: absolute; inset: 0; z-index: 0; pointer-events: none; border-radius: inherit; content: ''`. All direct children get `position: relative; z-index: 1`.

2. **`.patronTier1`**: `::before { background: var(--patron-primary); opacity: 0.08; }`

3. **`.patronTier2`**: `::before { opacity: 0.12; }` — `.patronTier2.patronGradient`: `::before { background-image: var(--patron-gradient); background: none; opacity: 0.10; }`

4. **`.patronTier3`**: `::before { opacity: 0.15; }` — `.patronTier3.patronGradient`: `::before { opacity: 0.18; }`

5. **`.patronTier3.patronAnimated`**: `::before { background-size: 200% 100%; animation: patronSweep 8s linear infinite; }` — new `@keyframes patronSweep { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }`

6. **Game image vignette** (tier 3): `.patronTier3 .liveRunArt { position: relative; }` and `.patronTier3 .liveRunArt::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 40%; background: linear-gradient(to right, transparent, var(--patron-primary)); opacity: 0.2; pointer-events: none; }`

7. **Split timeline override** (tier 2+): `.patronTier2 .splitSegmentCurrent, .patronTier3 .splitSegmentCurrent { background: var(--patron-primary); box-shadow: 0 0 3px color-mix(in srgb, var(--patron-primary) 50%, transparent); }`

8. **Reduced motion**: extend existing block with `.patronAnimated::before { animation: none; }`

## Not Changed

- `resolveFill()` / `buildPatronStyle()` — used as-is
- `usePatreons()` — used as-is
- `PatronPreferences` type — no new fields
- `RecommendedStream` — out of scope
- Backend — all data already available
