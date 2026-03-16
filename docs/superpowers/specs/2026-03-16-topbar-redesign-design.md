# Topbar Redesign — Lichess-Inspired

## Overview

Replace the current Bootstrap-based navbar with a custom, compact topbar inspired by lichess.org. Dense, hover-driven dropdowns, no Bootstrap navbar dependency, CSS modules for styling.

## Structure

Single `<header>` with two zones in a flex row:

1. **Nav zone** (left) — Logo + nav groups flowing horizontally
2. **Utility zone** (right, `margin-left: auto`) — Search icon, dark mode toggle, user avatar/login

## Nav Groups

| Group | Items | Condition |
|-------|-------|-----------|
| *(logo)* | The Run logo + text | always |
| **Run** | Upload, Live, Runs | Upload: logged in only |
| **Compete** | Races, Tournaments, Events | always |
| **Explore** | Games, Recap | always |
| **Tools** | LiveSplit Key, Change Appearance, Story Preferences | logged in only |
| **Admin** | Stats, Roles, Move User, Exclusions | RBAC gated |
| **About** | How It Works, Blog, FAQ, Roadmap, About, Contact | always |
| **Support us** | standalone link (no dropdown) | always |

## Utility Zone (right)

- Search icon — expands to inline input on click, Ctrl+K/Cmd+K shortcut preserved
- Dark mode toggle (existing `DarkModeSlider`)
- User avatar → dropdown (Profile, Logout) / Login with Twitch button
- Session reset button (when session error exists)

## Dropdowns

- CSS `:hover` triggered on desktop via `@media (hover: hover)` — avoids sticky hover on touch-capable laptops/tablets
- Fallback: click/touch opens dropdown on devices reporting `hover: none`
- Each nav group label is a `<button>` element (not `<a>`, since it toggles a panel rather than navigating)
- Dropdown panel is a `<div>` with vertical list of `<a>` links
- No click required on desktop; click opens on mobile
- Simple vertical list, minimal shadow, tight padding, no rounded corners

### Keyboard Navigation

- Nav group buttons are focusable via Tab
- Enter/Space opens the dropdown
- Escape closes the open dropdown and returns focus to its trigger button
- Arrow Down/Up moves through dropdown items
- Tab from last dropdown item closes dropdown and moves to next nav group
- Dropdown items and panels use `role="menu"` / `role="menuitem"`, `aria-expanded`, and `aria-haspopup="true"` on trigger buttons

## Mobile (below `lg` breakpoint)

- Hamburger icon replaces the nav zone
- Tap opens full-screen slide-in overlay
- All groups listed vertically with items expanded (no nested accordions)
- Search input prominent at top of mobile menu
- Dark mode toggle and user avatar remain visible in topbar on mobile
- Checkbox-based toggle (like lichess) or state-based — implementation detail
- Focus trap: when mobile menu is open, Tab cycles within the overlay only

## Styling

- Custom React components + CSS modules, no Bootstrap navbar
- Compact height: ~40-44px
- Dense spacing between nav groups
- Hover underline animation on nav group labels (preserve current `scaleX` transition)
- Dropdown panels: `box-shadow` for depth, no border-radius, tight padding
- Follows existing CSS custom properties for dark/light mode
- No images in nav chrome except logo and user avatar
- Font: inherit from site (no special topbar font)
- Logo text: "The Run" — drop the "beta" superscript
- Active page indicator: nav group labels and dropdown items can highlight the current route via `usePathname()` (underline or font weight change)

## Component Architecture

```
src/components/Topbar/
├── Topbar.tsx              (main client component)
├── Topbar.module.scss      (all topbar styles)
├── TopbarLogo.tsx          (logo + site name)
├── TopbarNav.tsx           (renders all NavGroups + standalone links)
├── NavGroup.tsx            (reusable: label + hover dropdown)
├── NavGroup.module.scss    (dropdown hover styles)
├── TopbarUtilities.tsx     (search, dark mode, user menu)
├── UserMenu.tsx            (avatar dropdown or login button)
├── MobileMenu.tsx          (hamburger + full-screen overlay)
├── MobileMenu.module.scss  (mobile overlay styles)
└── TopbarSkeleton.tsx      (updated loading skeleton)
```

## NavGroup Component API

```tsx
interface NavGroupProps {
    label: string;
    items: {
        href: string;
        label: string;
        condition?: boolean; // defaults to true
    }[];
}
```

Items with `condition: false` are not rendered. If all items have `condition: false`, the entire group is hidden.

### RBAC Pattern for Admin Group

The Admin group cannot use the simple `condition` boolean because each item requires a different RBAC check, and the `<Can>` component is a JSX wrapper (not a hook). The Admin group is rendered as a special case:

```tsx
<Can I="view-restricted" a="admins">
    {/* Render Admin NavGroup — at least one item is visible if we get here */}
    <NavGroup label="Admin" items={[...]}>
        {/* Individual items also wrapped in <Can> where permissions differ */}
    </NavGroup>
</Can>
```

Alternatively, the Admin group can accept `children` instead of `items` for cases where JSX wrappers like `<Can>` are needed around individual items. The `NavGroup` component should support both patterns: `items` array for simple groups, `children` for complex conditional rendering.

## UserMenu Component

The `UserMenu` handles:
- **Logged in**: Avatar + dropdown with Profile (`/{username}`) and Logout
- **Logout**: POST to `/api/logout`, then `router.push('/') + router.refresh()` (requires `useRouter`)
- **Session error**: "Reset session" button calling `resetSession` server action + `window.location.reload()`
- **Not logged in**: `TwitchLoginButton` component

## TopbarSkeleton

The current skeleton uses Bootstrap utility classes (`d-none`, `d-lg-block`) and Bootstrap CSS variables (`--bs-secondary-bg`, `--bs-body-bg`). The updated skeleton must:
- Replace Bootstrap display classes with CSS module equivalents or `@media` queries
- Replace Bootstrap CSS variable references with the site's own CSS custom properties
- Keep `react-content-loader` for the skeleton shapes

## What Changes

- Bootstrap `<Navbar>`, `<Nav>`, `<NavDropdown>`, `<Container>` removed from topbar
- Nav items reorganized from flat list into grouped dropdowns
- Tools group added (logged-in user utilities, currently in user dropdown)
- Admin group added (RBAC-gated admin links, currently in user dropdown)
- More pages exposed: Games, Events, Tournaments, Runs, Recap, How It Works, Roadmap, About, Contact
- Search becomes icon-only by default (expands on interaction)
- User dropdown simplified to Profile + Logout only

## What Stays

- Logo image (theme-aware)
- `DarkModeSlider` component (dynamic import, no SSR)
- `GlobalSearch` component (dynamic import, no SSR) — just triggered differently
- `TwitchLoginButton` for unauthenticated users
- RBAC gating via `<Can>` component from `src/rbac/Can.component`
- `ErrorBoundary` wrapper in `app/(new-layout)/header.tsx`
- Theme awareness via `next-themes`
- `resetSession` action for session errors

## Dependencies to Remove

- `react-bootstrap` usage in Topbar (Navbar, Nav, NavDropdown, Container)
- `react-bootstrap-icons` Upload icon (replace with inline SVG or remove)

## Dependencies to Keep

- `next/dynamic` for code splitting
- `next/image` for logo
- `next-themes` for theme detection
- CASL/RBAC components

## Nav Item Details

### Run
- **Upload** `/upload` — logged in only
- **Live** `/live`
- **Runs** `/runs`

### Compete
- **Races** `/races`
- **Tournaments** `/tournaments`
- **Events** `/events`

### Explore
- **Games** `/games`
- **Recap** `/recap`

### Tools (logged in only)
- **LiveSplit Key** `/livesplit`
- **Change Appearance** `/change-appearance`
- **Story Preferences** `/stories/manage`

### Admin (RBAC gated)
- **Stats** `/data` — requires `view-restricted` on `admins`
- **Roles** `/admin/roles` — requires `moderate` on `roles`
- **Move User** `/admin/move-user` — requires `moderate` on `roles`
- **Exclusions** `/admin/exclusions` — requires `moderate` on `admins`

### About
- **How It Works** `/how-it-works`
- **Blog** `/blog`
- **FAQ** `/faq`
- **Roadmap** `/roadmap`
- **About** `/about`
- **Contact** `/contact`

### Support us (standalone)
- `/patron` — with BunnyIcon
