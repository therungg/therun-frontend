# Topbar Visual Redesign — Design Spec

**Date:** 2026-03-18
**Branch:** `worktree-topbar-redesign`
**Status:** Approved

## Context

The topbar structure (components, keyboard nav, RBAC, mobile menu) is complete. The visual treatment is bare — plain text in empty space, sharp-cornered dropdowns, no background, generic hover effects. This spec covers the CSS/styling overhaul to make the topbar feel premium and sleek.

No structural or behavioral changes to components. This is purely visual.

## Design Decisions

### 1. Bar Treatment: Frosted Glass

The topbar gets a translucent backdrop-blur treatment, full-width edge-to-edge.

```scss
.topbar {
    height: 48px; // up from 44px for breathing room
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    position: sticky;
    top: 0;
    z-index: 100;
}

// Dark mode
[data-bs-theme="dark"] .topbar {
    background: rgba(18, 26, 17, 0.8);
    border-bottom-color: rgba(255, 255, 255, 0.06);
}
```

### 2. Nav Item States: Pill + Underline Combo

Three states for nav triggers:

- **Default:** Muted text, no background
- **Hover:** Soft green-tinted pill background + green underline slides in from center
- **Active (current page):** Green text, bold weight, persistent green underline

```scss
.trigger {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.855rem;
    font-weight: 500;
    color: #555;
    transition: all 0.15s ease;

    &::after {
        // Green underline that slides in
        content: '';
        position: absolute;
        bottom: 1px;
        left: 10px;
        right: 10px;
        height: 2px;
        background: #608C59;
        border-radius: 1px;
        transform: scaleX(0);
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover {
        background: rgba(96, 140, 89, 0.08);
        color: #333;
        &::after { transform: scaleX(1); }
    }

    &.active {
        color: #608C59;
        font-weight: 600;
        &::after { transform: scaleX(1); }
    }
}
```

Dark mode: hover bg `rgba(96,140,89,0.12)`, hover text `#c0d0be`, active text `#7DA876`.

### 3. Dropdowns: Floating Glass

Dropdowns match the glass aesthetic of the bar. Slight gap from bar, rounded, backdrop-blur, gentle translateY entrance animation.

```scss
.dropdown {
    top: calc(100% + 4px);       // 4px gap from bar
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(20px);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.5);
    padding: 4px;                // inner padding for rounded item hover states
    transform: translateY(-4px);
    transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease;

    // Open state adds: transform: translateY(0)
}

.item {
    padding: 7px 12px;
    border-radius: 6px;          // rounded hover states inside the dropdown
    font-size: 0.825rem;

    &:hover {
        background: rgba(96, 140, 89, 0.1);
    }
}
```

Dark mode: bg `rgba(30,43,28,0.9)`, border `rgba(255,255,255,0.08)`, stronger shadow.

### 4. "Support Us" Link: Subtle Green Pill

Separated from nav items with a thin green-tinted border, pill shape, smaller text.

```scss
.supportLink {
    padding: 4px 12px;
    font-size: 0.8rem;
    font-weight: 500;
    color: #608C59;
    border: 1px solid rgba(96, 140, 89, 0.25);
    border-radius: 20px;
    background: rgba(96, 140, 89, 0.04);

    &:hover {
        background: rgba(96, 140, 89, 0.1);
        border-color: rgba(96, 140, 89, 0.4);
    }
}
```

### 5. Utilities Area

- **Search box:** Soft background, rounded, subtle border. Shows keyboard shortcut hint.
- **Theme toggle:** 32px square, rounded, subtle background.
- **Avatar:** 28px circle, green ring on hover via `box-shadow: 0 0 0 2px rgba(96,140,89,0.3)`.

### 6. User Menu Dropdown

Same floating glass treatment as nav dropdowns. Aligns right instead of left.

### 7. Dark Mode Color Map

| Element | Light | Dark |
|---------|-------|------|
| Bar bg | `rgba(255,255,255,0.72)` | `rgba(18,26,17,0.8)` |
| Bar border | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` |
| Nav text | `#555` | `#8a9a88` |
| Nav hover text | `#333` | `#c0d0be` |
| Nav active text | `#608C59` | `#7DA876` |
| Hover pill bg | `rgba(96,140,89,0.08)` | `rgba(96,140,89,0.12)` |
| Dropdown bg | `rgba(255,255,255,0.82)` | `rgba(30,43,28,0.9)` |
| Dropdown border | `rgba(255,255,255,0.5)` | `rgba(255,255,255,0.08)` |
| Dropdown shadow | `0.1` opacity | `0.3` opacity |
| Dropdown item text | `#444` | `#8a9a88` |
| Dropdown item hover bg | `rgba(96,140,89,0.1)` | `rgba(96,140,89,0.15)` |

## Scope

### In scope
- All 4 SCSS module files (Topbar, NavGroup, UserMenu, MobileMenu)
- TopbarLogo inline styles → move to SCSS module
- Dark mode variants for all new styles

### Out of scope
- Component structure, props, keyboard navigation (unchanged)
- Mobile menu visual refresh (separate effort)
- Search box and dark mode slider internals (only outer container styling)
- Nav item data definitions

## Files Modified

1. `src/components/Topbar/Topbar.module.scss` — bar glass treatment, support link pill, height bump
2. `src/components/Topbar/NavGroup.module.scss` — pill hover, underline combo, glass dropdown, item radius
3. `src/components/Topbar/UserMenu.module.scss` — glass dropdown, avatar hover ring
4. `src/components/Topbar/MobileMenu.module.scss` — glass overlay treatment (optional, stretch)
5. `src/components/Topbar/TopbarLogo.tsx` — extract inline styles to SCSS module
6. `src/components/Topbar/NavGroup.tsx` — add `transform` style to open state for translateY animation
