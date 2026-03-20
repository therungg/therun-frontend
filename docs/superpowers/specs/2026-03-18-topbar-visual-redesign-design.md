# Topbar Visual Redesign — Design Spec

**Date:** 2026-03-18
**Branch:** `worktree-topbar-redesign`
**Status:** Approved

## Context

The topbar structure (components, keyboard nav, RBAC, mobile menu) is complete. The visual treatment is bare — plain text in empty space, sharp-cornered dropdowns, no background, generic hover effects. This spec covers the CSS/styling overhaul to make the topbar feel premium and sleek.

No structural or behavioral changes to components. This is purely visual.

## Design Decisions

### 1. Bar Treatment: Frosted Glass

The topbar gets a translucent backdrop-blur treatment, full-width edge-to-edge. All new styles are additive — existing layout properties (`display: flex`, `align-items: center`, `gap`, etc.) are preserved.

```scss
.topbar {
    height: 48px; // up from 44px for breathing room
    padding: 0 1.25rem; // slightly wider than current 1rem
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
```

**Note on sticky positioning:** The existing topbar is not sticky. Adding `position: sticky` is desirable but requires auditing ancestor elements for `overflow` properties. If ancestors have `overflow: hidden/auto`, sticky will silently fail. Defer sticky to a follow-up if it doesn't work out of the box.

Dark mode uses `:global([data-bs-theme="dark"])` selector (CSS modules scope):
```scss
:global([data-bs-theme="dark"]) & {
    background: rgba(18, 26, 17, 0.8);
    border-bottom-color: rgba(255, 255, 255, 0.06);
}
```

### 2. Nav Item States: Pill + Underline Combo

Three states for nav triggers. All changes are additive to existing properties (`position: relative`, `background: none`, `border: none`, `cursor: pointer`, `white-space: nowrap`).

- **Default:** Muted text, no background
- **Hover:** Soft green-tinted pill background + green underline slides in from center
- **Active (current page):** Green text, persistent green underline

```scss
.trigger {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.855rem;
    font-weight: 500;
    color: var(--bs-body-color);
    opacity: 0.65;
    transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;

    &::after {
        // Existing ::after is preserved, just updated values
        background: var(--bs-primary); // #608C59
        border-radius: 1px;
        bottom: 1px;
    }

    // Hover: pill bg + underline
    &:hover {
        background: rgba(96, 140, 89, 0.08);
        opacity: 1;
    }
    // Hover underline handled in existing @media (hover: hover) block

    &.active {
        color: var(--bs-primary);
        opacity: 1;
    }
}
```

Using `opacity` for the muted/active distinction avoids the `font-weight` layout shift issue entirely. Active items are full opacity with green color; default items are 65% opacity.

Dark mode: hover bg `rgba(96,140,89,0.12)`.

### 3. Dropdowns: Floating Glass

Dropdowns match the glass aesthetic. Rounded corners, backdrop-blur, gentle translateY entrance animation.

**Hover gap bridge:** The dropdown has `top: calc(100% + 4px)` for visual spacing, but this gap would break CSS `:hover` continuity. Bridge it with a pseudo-element on `.group`:

```scss
.group {
    // Invisible bridge between trigger and dropdown
    &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        height: 8px; // covers the 4px gap with margin
        // No background — invisible but captures hover
    }
}

.dropdown {
    top: calc(100% + 4px);
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.5);
    padding: 4px;
    transform: translateY(-4px);
    transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease;
}
```

Open state (in the existing `@media (hover: hover)` block and via inline style for JS-toggled open):
```scss
// CSS hover open
@media (hover: hover) {
    .group:hover .dropdown {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
}
```

JS open (existing inline style pattern in NavGroup.tsx) adds `transform: translateY(0)` alongside the existing opacity/visibility overrides.

```scss
.item {
    padding: 7px 12px;
    border-radius: 6px;
    font-size: 0.825rem;
    transition: background 0.1s ease;

    &:hover {
        background: rgba(96, 140, 89, 0.1);
    }
}
```

Dark mode:
```scss
:global([data-bs-theme="dark"]) .dropdown {
    background: rgba(30, 43, 28, 0.9);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.15);
}
:global([data-bs-theme="dark"]) .item:hover {
    background: rgba(96, 140, 89, 0.15);
}
```

### 4. "Support Us" Link: Subtle Green Pill

Additive to existing `.supportLink` properties (`display: flex`, `align-items: center`, `gap`, `text-decoration: none`, `white-space: nowrap`).

```scss
.supportLink {
    padding: 4px 12px;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--bs-primary);
    border: 1px solid rgba(96, 140, 89, 0.25);
    border-radius: 20px;
    background: rgba(96, 140, 89, 0.04);
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
        background: rgba(96, 140, 89, 0.1);
        border-color: rgba(96, 140, 89, 0.4);
        color: var(--bs-primary); // override default link hover
    }
}
```

Dark mode: color `#7DA876`, border `rgba(96,140,89,0.2)`, bg `rgba(96,140,89,0.06)`.

### 5. Utilities Area

Concrete values for utility elements. These styles target the outer containers only — internal component styling (GlobalSearch, DarkModeSlider) is out of scope.

**Avatar hover ring** (UserMenu):
```scss
.avatar {
    // existing: width: 28px, height: 28px, border-radius: 50%
    transition: box-shadow 0.15s ease;

    &:hover {
        box-shadow: 0 0 0 2px rgba(96, 140, 89, 0.3);
    }
}
```

### 6. User Menu Dropdown

Same floating glass treatment as nav dropdowns. Only difference: `right: 0` instead of `left: 0` for right-alignment. Same border-radius, backdrop-filter, shadow, padding, and item styles.

### 7. Dark Mode Color Map

| Element | Light | Dark |
|---------|-------|------|
| Bar bg | `rgba(255,255,255,0.72)` | `rgba(18,26,17,0.8)` |
| Bar border | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` |
| Nav text | `var(--bs-body-color)` at 65% opacity | same (theme handles it) |
| Nav hover pill bg | `rgba(96,140,89,0.08)` | `rgba(96,140,89,0.12)` |
| Nav active text | `var(--bs-primary)` | `#7DA876` |
| Dropdown bg | `rgba(255,255,255,0.82)` | `rgba(30,43,28,0.9)` |
| Dropdown border | `rgba(255,255,255,0.5)` | `rgba(255,255,255,0.08)` |
| Dropdown shadow | `0.1` / `0.05` opacity | `0.3` / `0.15` opacity |
| Dropdown item text | `var(--bs-body-color)` | same |
| Dropdown item hover bg | `rgba(96,140,89,0.1)` | `rgba(96,140,89,0.15)` |
| Support link color | `var(--bs-primary)` | `#7DA876` |
| Support link border | `rgba(96,140,89,0.25)` | `rgba(96,140,89,0.2)` |
| Support link bg | `rgba(96,140,89,0.04)` | `rgba(96,140,89,0.06)` |

## Scope

### In scope
- SCSS module files: Topbar, NavGroup, UserMenu
- TopbarLogo inline styles → move to SCSS module
- Dark mode variants for all new styles
- NavGroup.tsx: add `transform` to inline open-state style

### Out of scope
- Component structure, props, keyboard navigation (unchanged)
- MobileMenu visual refresh (separate effort)
- Search box and dark mode slider internals (only outer container styling)
- Nav item data definitions
- Sticky positioning (defer to follow-up after overflow audit)

## Files Modified

1. `src/components/Topbar/Topbar.module.scss` — bar glass treatment, support link pill, height/padding bump
2. `src/components/Topbar/NavGroup.module.scss` — pill hover, underline combo, glass dropdown, item radius, hover gap bridge
3. `src/components/Topbar/NavGroup.tsx` — add `transform: translateY(0)` to open-state inline style
4. `src/components/Topbar/UserMenu.module.scss` — glass dropdown, avatar hover ring
5. `src/components/Topbar/TopbarLogo.tsx` + new `TopbarLogo.module.scss` — extract inline styles
