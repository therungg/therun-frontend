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

- CSS `:hover` triggered on desktop (on the parent `<div>` wrapping label + panel)
- Each nav group label is a `<button>` or `<a>` element
- Dropdown panel is a `<div>` with vertical list of `<a>` links
- No click required on desktop; click opens on mobile
- Simple vertical list, minimal shadow, tight padding, no rounded corners

## Mobile (below `lg` breakpoint)

- Hamburger icon replaces the nav zone
- Tap opens full-screen slide-in overlay
- All groups listed vertically with items expanded (no nested accordions)
- Search input prominent at top of mobile menu
- Dark mode toggle and user avatar remain visible in topbar on mobile
- Checkbox-based toggle (like lichess) or state-based — implementation detail

## Styling

- Custom React components + CSS modules, no Bootstrap navbar
- Compact height: ~40-44px
- Dense spacing between nav groups
- Hover underline animation on nav group labels (preserve current `scaleX` transition)
- Dropdown panels: `box-shadow` for depth, no border-radius, tight padding
- Follows existing CSS custom properties for dark/light mode
- No images in nav chrome except logo and user avatar
- Font: inherit from site (no special topbar font)

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
