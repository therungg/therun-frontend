# Frontpage Panel Gradient Background Design

**Date:** 2026-02-04
**Status:** Validated, Ready for Implementation

## Problem Statement

Panels on the new-layout frontpage use `var(--bs-body-bg)` as their background, which is identical to the page background (`#0D0F0D` in dark mode, `#fbfbfb` in light mode). This creates zero visual separation between panels and the page, making the interface feel flat and undefined despite the distinctive green border and bookmark folder design.

## Design Solution

Implement a subtle gradient background system that creates depth and visual hierarchy through three distinct surface layers, with consistent directional lighting at 135° (top-left to bottom-right).

### Visual Hierarchy Layers

**Layer 0: Page Background**
- Solid color: `var(--bs-body-bg)`
- Dark mode: `#0D0F0D`
- Light mode: `#fbfbfb`

**Layer 1: Panel Surfaces**
- Gradient: `linear-gradient(135deg, var(--bs-secondary-bg) 0%, var(--bs-tertiary-bg) 100%)`
- Dark mode: `#1C221E` → `#232A25`
- Light mode: `#eee` → `#ddd`
- Creates ~5-7% lightness difference for subtle depth

**Layer 2: Cards Within Panels**
- Gradient: `linear-gradient(135deg, var(--bs-tertiary-bg) 0%, color-mix(in srgb, var(--bs-tertiary-bg) 95%, black 5%) 100%)`
- Dark mode: `#232A25` → slightly darker
- Light mode: `#ddd` → slightly darker
- Elevated surfaces above the panel background

### Hover Interactions

**Panel Hover:**
```scss
background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--bs-secondary-bg) 97%, white 3%) 0%,
    color-mix(in srgb, var(--bs-tertiary-bg) 97%, white 3%) 100%
);
```
- Adds 3% white on hover
- Creates "lifting closer to light" effect
- Combined with existing shadow enhancement

**Card Hover:**
```scss
background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--bs-tertiary-bg) 98%, white 2%) 0%,
    color-mix(in srgb, var(--bs-tertiary-bg) 93%, white 7%) 100%
);
```
- Brightens gradient on hover
- Maintains existing transform/shadow effects

### Special Cases

**Elements That Get Gradients:**
- Main panel backgrounds (bookmark folder containers)
- Interior cards (race cards, PB cards, stat items)
- Live run panels (gradient + existing pulse animation)

**Elements That Stay Flat:**
- Draggable panel controls (UI chrome, not content surfaces)
- Green tabs (labels, not surfaces)
- Badges and small UI elements under ~40px (gradients become muddy at small sizes)
- Empty/loading state containers still get panel gradient

**Nested Panels:**
- Each nesting level gets progressively lighter gradients
- Maintains depth hierarchy

### Visual Polish Details

**Shadow Refinement:**
```scss
// Light mode
box-shadow: 2px 4px 12px rgba(0, 0, 0, 0.08);

// Dark mode
box-shadow: 2px 4px 12px rgba(0, 0, 0, 0.25);
```
- Asymmetric shadow matches 135° light direction
- Creates directional depth

**Green Border Enhancement:**
```scss
box-shadow:
    inset 0 0 0 1px rgba(96, 140, 89, 0.1),  // inner glow
    2px 4px 12px rgba(0, 0, 0, 0.25);        // outer shadow
```
- Subtle inner shadow on border for "framed" feel

**Transitions:**
```scss
transition: background 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
```
- Smooth gradient shifts on hover
- Matches existing animation timing

### Browser Compatibility

**CSS color-mix() Support:**
- Chrome 111+ (March 2023)
- Safari 16.2+ (December 2022)
- Firefox 113+ (May 2023)
- Edge 111+ (March 2023)
- Coverage: ~95% of global users

**Graceful Degradation:**
- Older browsers see gradient backgrounds (universal support)
- Miss only the subtle hover gradient brightening
- Core visual separation maintained

**Performance:**
- GPU-accelerated CSS gradients
- No JavaScript required
- Minimal CSS size increase (~200 bytes)
- Hardware-accelerated transitions

### Implementation Files

**Core Changes:**
1. `app/(new-layout)/components/styles/panel.component.module.scss`
   - Update `$panel-bg` variable
   - Add hover gradient enhancement

**Panel-Specific Updates:**
2. `app/(new-layout)/frontpage/panels/stats-panel/stats-panel.module.scss`
3. `app/(new-layout)/frontpage/panels/race-panel/race-panel.module.scss`
4. `app/(new-layout)/frontpage/panels/latest-pbs-panel/latest-pbs-panel.module.scss`
5. `app/(new-layout)/frontpage/panels/live-runs-panel/live-runs-panel.module.scss`
6. `app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel.module.scss`
7. `app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel.module.scss`

**Shared Components:**
8. `app/(new-layout)/components/styles/card.component.module.scss`

### Implementation Order

1. Update `panel.component.module.scss` (foundation)
2. Test in browser (verify base gradient)
3. Update individual panel card styles
4. Verify light and dark modes
5. Test hover interactions
6. Run accessibility checks

### Testing Checklist

- [ ] Light mode panel visibility
- [ ] Dark mode panel visibility
- [ ] Hover states feel responsive
- [ ] Text contrast remains readable (WCAG AA)
- [ ] Gradient renders smoothly (no banding)
- [ ] Mobile/responsive views
- [ ] All special cases handled correctly

### Design Principles Applied

**Steve Jobs / Apple Philosophy:**
- Subtle, not garish (5-7% lightness difference)
- Consistent light source (135° direction throughout)
- Physically grounded metaphor (surfaces catching light, casting shadows)
- Graceful degradation for older browsers
- No unnecessary complexity (uses existing design system colors)
- Theme-aware (automatic light/dark mode adaptation)

**Visual Result:**
Panels feel like physical cards floating above the page surface, catching light from above-left. The signature green border provides brand identity while the gradient provides the depth and separation that was missing. The interface feels tactile and dimensional without being heavy-handed.
