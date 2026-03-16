# Topbar Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Bootstrap navbar topbar with a custom, compact, lichess-inspired topbar with grouped hover dropdowns.

**Architecture:** Custom React components with CSS modules. NavGroup component renders hover-triggered dropdown menus. No Bootstrap navbar dependency — just plain flexbox layout with CSS `:hover` dropdowns on desktop and a slide-in mobile menu.

**Tech Stack:** React 19, CSS Modules (SCSS), next-themes, next/dynamic, CASL RBAC

**Spec:** `docs/superpowers/specs/2026-03-16-topbar-redesign-design.md`

---

## File Structure

```
src/components/Topbar/
├── Topbar.tsx              (MODIFY - rewrite as shell that composes new components)
├── Topbar.module.scss      (CREATE - main topbar layout styles)
├── TopbarLogo.tsx          (CREATE - logo + site name)
├── NavGroup.tsx            (CREATE - reusable label + hover dropdown)
├── NavGroup.module.scss    (CREATE - hover dropdown styles)
├── TopbarUtilities.tsx     (CREATE - search, dark mode, user menu container)
├── UserMenu.tsx            (CREATE - avatar dropdown or login button)
├── UserMenu.module.scss    (CREATE - user menu dropdown styles)
├── MobileMenu.tsx          (CREATE - hamburger + slide-in overlay)
├── MobileMenu.module.scss  (CREATE - mobile overlay styles)
├── TopbarSkeleton.tsx      (MODIFY - remove Bootstrap classes)
├── topbar-nav-items.ts     (CREATE - nav group definitions as data)

src/components/twitch/
├── TwitchLoginButton.tsx   (MODIFY - remove Nav.Link wrapper)
```

---

## Chunk 1: Foundation Components

### Task 1: Define nav items data structure

**Files:**
- Create: `src/components/Topbar/topbar-nav-items.ts`

- [ ] **Step 1: Create the nav items data file**

```ts
// src/components/Topbar/topbar-nav-items.ts

export interface NavItem {
    href: string;
    label: string;
}

// Static groups (always visible, no auth/RBAC conditions)
export const runItems: NavItem[] = [
    { href: '/upload', label: 'Upload' },
    { href: '/live', label: 'Live' },
    { href: '/runs', label: 'Runs' },
];

export const competeItems: NavItem[] = [
    { href: '/races', label: 'Races' },
    { href: '/tournaments', label: 'Tournaments' },
    { href: '/events', label: 'Events' },
];

export const exploreItems: NavItem[] = [
    { href: '/games', label: 'Games' },
    { href: '/recap', label: 'Recap' },
];

export const toolsItems: NavItem[] = [
    { href: '/livesplit', label: 'LiveSplit Key' },
    { href: '/change-appearance', label: 'Change Appearance' },
    { href: '/stories/manage', label: 'Story Preferences' },
];

export const aboutItems: NavItem[] = [
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/blog', label: 'Blog' },
    { href: '/faq', label: 'FAQ' },
    { href: '/roadmap', label: 'Roadmap' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Topbar/topbar-nav-items.ts
git commit -m "feat(topbar): add nav items data definitions"
```

---

### Task 2: NavGroup component

**Files:**
- Create: `src/components/Topbar/NavGroup.tsx`
- Create: `src/components/Topbar/NavGroup.module.scss`

- [ ] **Step 1: Create NavGroup styles**

```scss
// src/components/Topbar/NavGroup.module.scss

.group {
    position: relative;
    display: flex;
    align-items: center;
}

.trigger {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    background: none;
    border: none;
    color: var(--bs-body-color);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    position: relative;
    text-decoration: none;

    &::after {
        content: '';
        position: absolute;
        left: 0.5rem;
        right: 0.5rem;
        bottom: 0;
        height: 2px;
        background-color: currentColor;
        transform: scaleX(0);
        transition: transform 0.2s ease;
    }
}

.dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 100;
    min-width: 180px;
    padding: 0.25rem 0;
    background-color: var(--bs-body-bg);
    border: 1px solid var(--bs-border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s ease, visibility 0.15s ease;
}

.item {
    display: block;
    padding: 0.375rem 0.75rem;
    color: var(--bs-body-color);
    text-decoration: none;
    font-size: 0.8125rem;
    white-space: nowrap;

    &:hover {
        background-color: var(--bs-tertiary-bg);
        color: var(--bs-body-color);
    }
}

.active {
    font-weight: 600;
}

// Desktop hover behavior — only on devices that support hover
@media (hover: hover) {
    .group:hover .trigger::after {
        transform: scaleX(1);
    }

    .group:hover .dropdown {
        opacity: 1;
        visibility: visible;
    }
}
```

- [ ] **Step 2: Create NavGroup component**

```tsx
// src/components/Topbar/NavGroup.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import type { NavItem } from './topbar-nav-items';
import styles from './NavGroup.module.scss';

interface NavGroupProps {
    label: string;
    items?: NavItem[];
    children?: React.ReactNode;
}

export function NavGroup({ label, items, children }: NavGroupProps) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const groupRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
                groupRef.current
                    ?.querySelector<HTMLButtonElement>('button')
                    ?.focus();
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                const firstItem =
                    groupRef.current?.querySelector<HTMLAnchorElement>(
                        '[role="menuitem"]',
                    );
                firstItem?.focus();
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const menuItems =
                    groupRef.current?.querySelectorAll<HTMLAnchorElement>(
                        '[role="menuitem"]',
                    );
                if (menuItems?.length) {
                    menuItems[menuItems.length - 1].focus();
                }
            }
        },
        [],
    );

    const handleItemKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const menuItems =
                groupRef.current?.querySelectorAll<HTMLAnchorElement>(
                    '[role="menuitem"]',
                );
            if (!menuItems) return;
            const currentIndex = Array.from(menuItems).indexOf(
                e.target as HTMLAnchorElement,
            );

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = menuItems[(currentIndex + 1) % menuItems.length];
                next?.focus();
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev =
                    menuItems[
                        (currentIndex - 1 + menuItems.length) %
                            menuItems.length
                    ];
                prev?.focus();
            }
            if (e.key === 'Escape') {
                setOpen(false);
                groupRef.current
                    ?.querySelector<HTMLButtonElement>('button')
                    ?.focus();
            }
        },
        [],
    );

    if (!children && (!items || items.length === 0)) return null;

    return (
        <div
            className={styles.group}
            ref={groupRef}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                className={styles.trigger}
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen((prev) => !prev)}
                onKeyDown={handleKeyDown}
            >
                {label}
            </button>
            <div
                className={styles.dropdown}
                role="menu"
                style={
                    open
                        ? { opacity: 1, visibility: 'visible' as const }
                        : undefined
                }
            >
                {children ??
                    items?.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.item} ${pathname === item.href ? styles.active : ''}`}
                            role="menuitem"
                            tabIndex={open ? 0 : -1}
                            onKeyDown={handleItemKeyDown}
                            onClick={() => setOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify the component compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to NavGroup

- [ ] **Step 4: Commit**

```bash
git add src/components/Topbar/NavGroup.tsx src/components/Topbar/NavGroup.module.scss
git commit -m "feat(topbar): add NavGroup component with hover dropdowns and keyboard nav"
```

---

### Task 3: TopbarLogo component

**Files:**
- Create: `src/components/Topbar/TopbarLogo.tsx`

- [ ] **Step 1: Create TopbarLogo component**

```tsx
// src/components/Topbar/TopbarLogo.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function TopbarLogo() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const theme = mounted ? resolvedTheme || 'dark' : 'dark';

    return (
        <Link
            href="/"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                color: 'var(--bs-body-color)',
                fontWeight: 600,
                fontSize: '1rem',
                whiteSpace: 'nowrap',
            }}
        >
            <Image
                unoptimized
                alt="TheRun"
                src={`/logo_${theme}_theme_no_text_transparent.png`}
                height={36}
                width={36}
                suppressHydrationWarning
            />
            <span suppressHydrationWarning>The Run</span>
        </Link>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Topbar/TopbarLogo.tsx
git commit -m "feat(topbar): add TopbarLogo component"
```

---

### Task 4: UserMenu component

**Files:**
- Create: `src/components/Topbar/UserMenu.tsx`
- Create: `src/components/Topbar/UserMenu.module.scss`

- [ ] **Step 1: Create UserMenu styles**

```scss
// src/components/Topbar/UserMenu.module.scss

.container {
    position: relative;
    display: flex;
    align-items: center;
}

.trigger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.375rem;
    background: none;
    border: none;
    color: var(--bs-body-color);
    cursor: pointer;
    font-size: 0.875rem;
}

.avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
}

.dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 100;
    min-width: 160px;
    padding: 0.25rem 0;
    background-color: var(--bs-body-bg);
    border: 1px solid var(--bs-border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s ease, visibility 0.15s ease;
}

.dropdownOpen {
    opacity: 1;
    visibility: visible;
}

.item {
    display: block;
    padding: 0.375rem 0.75rem;
    color: var(--bs-body-color);
    text-decoration: none;
    font-size: 0.8125rem;
    white-space: nowrap;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;

    &:hover {
        background-color: var(--bs-tertiary-bg);
    }
}

@media (hover: hover) {
    .container:hover .dropdown {
        opacity: 1;
        visibility: visible;
    }
}
```

- [ ] **Step 2: Create UserMenu component**

```tsx
// src/components/Topbar/UserMenu.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { resetSession } from '~src/actions/reset-session.action';
import { Button } from '~src/components/Button/Button';
import { NameAsPatreon } from '~src/components/patreon/patreon-name';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import styles from './UserMenu.module.scss';

interface UserMenuProps {
    username?: string;
    picture?: string;
    sessionError?: string | null;
}

export function UserMenu({ username, picture, sessionError }: UserMenuProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const logout = useCallback(async () => {
        await fetch('/api/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
    }, [router]);

    const handleResetSession = useCallback(async () => {
        await resetSession();
        window.location.reload();
    }, []);

    if (sessionError) {
        return (
            <Button className="btn btn-primary" onClick={handleResetSession}>
                Reset session
            </Button>
        );
    }

    if (!username) {
        return <TwitchLoginButton url="/api" />;
    }

    return (
        <div
            className={styles.container}
            ref={containerRef}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                className={styles.trigger}
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-haspopup="true"
            >
                {picture && (
                    <Image
                        src={picture}
                        alt={username}
                        width={28}
                        height={28}
                        className={styles.avatar}
                        unoptimized
                    />
                )}
                <NameAsPatreon name={username} />
            </button>
            <div
                className={`${styles.dropdown} ${open ? styles.dropdownOpen : ''}`}
                role="menu"
            >
                <Link
                    href={`/${username}`}
                    className={styles.item}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                >
                    Profile
                </Link>
                <button
                    type="button"
                    className={styles.item}
                    role="menuitem"
                    onClick={async () => {
                        setOpen(false);
                        await logout();
                    }}
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify the component compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to UserMenu

- [ ] **Step 4: Commit**

```bash
git add src/components/Topbar/UserMenu.tsx src/components/Topbar/UserMenu.module.scss
git commit -m "feat(topbar): add UserMenu component with avatar dropdown and logout"
```

---

### Task 5: Update TwitchLoginButton to remove Bootstrap Nav.Link

**Files:**
- Modify: `src/components/twitch/TwitchLoginButton.tsx`

- [ ] **Step 1: Remove Nav.Link wrapper**

Replace the current implementation:

```tsx
// src/components/twitch/TwitchLoginButton.tsx
'use client';

import React from 'react';
import { Button } from '~src/components/Button/Button';
import { getTwitchOAuthURL } from './twitch-oauth';

interface TwitchLoginButtonProps {
    url?: string;
}

export const TwitchLoginButton: React.FunctionComponent<
    TwitchLoginButtonProps
> = ({ url = '' }) => {
    const loginUrl = getTwitchOAuthURL({ redirect: url });
    return (
        <a href={loginUrl.href} style={{ textDecoration: 'none' }}>
            <Button className="twitch">Login with Twitch</Button>
        </a>
    );
};
```

- [ ] **Step 2: Check for other usages of TwitchLoginButton**

Run: `grep -r "TwitchLoginButton" --include="*.tsx" --include="*.ts" -l`

Verify no other file depends on the `Nav.Link` wrapper behavior. If other files import and use it, confirm they don't rely on Bootstrap Nav context.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/twitch/TwitchLoginButton.tsx
git commit -m "refactor: remove Bootstrap Nav.Link from TwitchLoginButton"
```

---

## Chunk 2: Main Topbar Assembly and Mobile Menu

### Task 6: TopbarUtilities component

**Files:**
- Create: `src/components/Topbar/TopbarUtilities.tsx`

- [ ] **Step 1: Create TopbarUtilities**

```tsx
// src/components/Topbar/TopbarUtilities.tsx
'use client';

import dynamic from 'next/dynamic';
import { UserMenu } from './UserMenu';

const DarkModeSlider = dynamic(() => import('../dark-mode-slider'), {
    ssr: false,
});

const GlobalSearch = dynamic(
    () =>
        import('~src/components/search/global-search.component').then(
            (mod) => mod.GlobalSearch,
        ),
    { ssr: false },
);

interface TopbarUtilitiesProps {
    username?: string;
    picture?: string;
    sessionError?: string | null;
}

export function TopbarUtilities({
    username,
    picture,
    sessionError,
}: TopbarUtilitiesProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
            }}
        >
            <GlobalSearch />
            <DarkModeSlider />
            <UserMenu
                username={username}
                picture={picture}
                sessionError={sessionError}
            />
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Topbar/TopbarUtilities.tsx
git commit -m "feat(topbar): add TopbarUtilities component"
```

---

### Task 7: MobileMenu component

**Files:**
- Create: `src/components/Topbar/MobileMenu.tsx`
- Create: `src/components/Topbar/MobileMenu.module.scss`

- [ ] **Step 1: Create MobileMenu styles**

```scss
// src/components/Topbar/MobileMenu.module.scss

.hamburger {
    display: none;
    background: none;
    border: none;
    padding: 0.375rem;
    cursor: pointer;
    color: var(--bs-body-color);

    @media (max-width: 991.98px) {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
}

.bar {
    display: block;
    width: 20px;
    height: 2px;
    background-color: currentColor;
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.barOpen:nth-child(1) {
    transform: translateY(6px) rotate(45deg);
}

.barOpen:nth-child(2) {
    opacity: 0;
}

.barOpen:nth-child(3) {
    transform: translateY(-6px) rotate(-45deg);
}

.overlay {
    position: fixed;
    inset: 0;
    z-index: 99;
    background-color: var(--bs-body-bg);
    padding: 4rem 1.5rem 1.5rem;
    overflow-y: auto;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
}

.overlayOpen {
    opacity: 1;
    visibility: visible;
}

.section {
    margin-bottom: 1.25rem;
}

.sectionLabel {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--bs-secondary-color);
    margin-bottom: 0.375rem;
    padding: 0 0.25rem;
}

.link {
    display: block;
    padding: 0.5rem 0.25rem;
    color: var(--bs-body-color);
    text-decoration: none;
    font-size: 0.9375rem;

    &:hover {
        color: var(--bs-primary);
    }
}

.standalone {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.25rem;
    color: var(--bs-body-color);
    text-decoration: none;
    font-size: 0.9375rem;
    font-weight: 500;
}
```

- [ ] **Step 2: Create MobileMenu component**

```tsx
// src/components/Topbar/MobileMenu.tsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BunnyIcon } from '~src/icons/bunny-icon';
import { Can } from '~src/rbac/Can.component';
import type { NavItem } from './topbar-nav-items';
import {
    aboutItems,
    competeItems,
    exploreItems,
    runItems,
    toolsItems,
} from './topbar-nav-items';
import styles from './MobileMenu.module.scss';

const GlobalSearch = dynamic(
    () =>
        import('~src/components/search/global-search.component').then(
            (mod) => mod.GlobalSearch,
        ),
    { ssr: false },
);

interface MobileMenuProps {
    username?: string;
}

export function MobileMenu({ username }: MobileMenuProps) {
    const [open, setOpen] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setOpen(false), []);

    // Focus trap
    useEffect(() => {
        if (!open) return;

        const overlay = overlayRef.current;
        if (!overlay) return;

        const focusable = overlay.querySelectorAll<HTMLElement>(
            'a, button, input, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        const trap = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                close();
                return;
            }
            if (e.key !== 'Tab') return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        };

        document.addEventListener('keydown', trap);
        first?.focus();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', trap);
            document.body.style.overflow = '';
        };
    }, [open, close]);

    const renderSection = (label: string, items: NavItem[]) => (
        <div className={styles.section} key={label}>
            <div className={styles.sectionLabel}>{label}</div>
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={styles.link}
                    onClick={close}
                >
                    {item.label}
                </Link>
            ))}
        </div>
    );

    // Filter Run items: only show Upload if logged in
    const filteredRunItems = username
        ? runItems
        : runItems.filter((item) => item.href !== '/upload');

    return (
        <>
            <button
                type="button"
                className={styles.hamburger}
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-label={open ? 'Close menu' : 'Open menu'}
            >
                <span
                    className={`${styles.bar} ${open ? styles.barOpen : ''}`}
                />
                <span
                    className={`${styles.bar} ${open ? styles.barOpen : ''}`}
                />
                <span
                    className={`${styles.bar} ${open ? styles.barOpen : ''}`}
                />
            </button>
            <div
                className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
                ref={overlayRef}
            >
                <div style={{ marginBottom: '1rem' }}>
                    <GlobalSearch />
                </div>
                {renderSection('Run', filteredRunItems)}
                {renderSection('Compete', competeItems)}
                {renderSection('Explore', exploreItems)}
                {username && renderSection('Tools', toolsItems)}
                <Can I="view-restricted" a="admins">
                    {renderSection('Admin', [
                        { href: '/data', label: 'Stats' },
                    ])}
                </Can>
                <Can I="moderate" a="roles">
                    {renderSection('Admin', [
                        { href: '/admin/roles', label: 'Roles' },
                        { href: '/admin/move-user', label: 'Move User' },
                    ])}
                </Can>
                <Can I="moderate" a="admins">
                    {renderSection('Admin', [
                        { href: '/admin/exclusions', label: 'Exclusions' },
                    ])}
                </Can>
                {renderSection('About', aboutItems)}
                <Link
                    href="/patron"
                    className={styles.standalone}
                    onClick={close}
                >
                    Support us <BunnyIcon />
                </Link>
            </div>
        </>
    );
}
```

Note: The Admin section rendering with multiple `<Can>` wrappers is not ideal (may render duplicate "Admin" headers). The implementer should refine this — e.g., collect visible admin items into a single section. This is called out so the implementer addresses it during build.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/Topbar/MobileMenu.tsx src/components/Topbar/MobileMenu.module.scss
git commit -m "feat(topbar): add MobileMenu component with slide-in overlay"
```

---

### Task 8: Main Topbar assembly and styles

**Files:**
- Create: `src/components/Topbar/Topbar.module.scss`
- Modify: `src/components/Topbar/Topbar.tsx` (full rewrite)

- [ ] **Step 1: Create main Topbar styles**

```scss
// src/components/Topbar/Topbar.module.scss

.topbar {
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 1rem;
    gap: 0.25rem;
}

.nav {
    display: none;
    align-items: center;
    gap: 0.125rem;

    @media (min-width: 992px) {
        display: flex;
    }
}

.supportLink {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    color: var(--bs-body-color);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;

    &:hover {
        color: var(--bs-primary);
    }
}

.utilities {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
}
```

- [ ] **Step 2: Rewrite Topbar.tsx**

Replace the entire contents of `src/components/Topbar/Topbar.tsx`:

```tsx
// src/components/Topbar/Topbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BunnyIcon } from '~src/icons/bunny-icon';
import { Can } from '~src/rbac/Can.component';
import { MobileMenu } from './MobileMenu';
import { NavGroup } from './NavGroup';
import styles from './NavGroup.module.scss';
import topbarStyles from './Topbar.module.scss';
import { TopbarLogo } from './TopbarLogo';
import { TopbarUtilities } from './TopbarUtilities';
import {
    aboutItems,
    competeItems,
    exploreItems,
    runItems,
    toolsItems,
} from './topbar-nav-items';

interface TopbarProps {
    username: string;
    picture: string;
    sessionError: string | null;
}

export const Topbar = ({
    username,
    picture,
    sessionError,
}: Partial<TopbarProps>) => {
    const pathname = usePathname();

    // Filter Run items: only show Upload if logged in
    const filteredRunItems = username
        ? runItems
        : runItems.filter((item) => item.href !== '/upload');

    // Helper for admin items rendered via children
    const adminLink = (href: string, label: string) => (
        <Link
            key={href}
            href={href}
            className={`${styles.item} ${pathname === href ? styles.active : ''}`}
            role="menuitem"
        >
            {label}
        </Link>
    );

    return (
        <nav className={topbarStyles.topbar}>
            <TopbarLogo />

            <div className={topbarStyles.nav}>
                <NavGroup label="Run" items={filteredRunItems} />
                <NavGroup label="Compete" items={competeItems} />
                <NavGroup label="Explore" items={exploreItems} />
                {username && (
                    <NavGroup label="Tools" items={toolsItems} />
                )}
                <AdminNavGroup adminLink={adminLink} />
                <NavGroup label="About" items={aboutItems} />
                <Link href="/patron" className={topbarStyles.supportLink}>
                    Support us <BunnyIcon />
                </Link>
            </div>

            <div className={topbarStyles.utilities}>
                <TopbarUtilities
                    username={username}
                    picture={picture}
                    sessionError={sessionError}
                />
            </div>

            <MobileMenu username={username} />
        </nav>
    );
};

Topbar.displayName = 'Topbar';

// Separate component for Admin group — uses children pattern for per-item RBAC
function AdminNavGroup({
    adminLink,
}: {
    adminLink: (href: string, label: string) => React.ReactNode;
}) {
    return (
        <Can I="view-restricted" a="admins">
            <NavGroup label="Admin">
                <Can I="view-restricted" a="admins">
                    {adminLink('/data', 'Stats')}
                </Can>
                <Can I="moderate" a="roles">
                    {adminLink('/admin/roles', 'Roles')}
                    {adminLink('/admin/move-user', 'Move User')}
                </Can>
                <Can I="moderate" a="admins">
                    {adminLink('/admin/exclusions', 'Exclusions')}
                </Can>
            </NavGroup>
        </Can>
    );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Run dev server and visually verify**

Run: `npm run dev`
Open `http://localhost:3000` and verify:
- Logo displays correctly
- Nav groups show on desktop with hover dropdowns
- Hamburger appears on mobile viewport
- Search, dark mode toggle, and user menu work
- Support us link visible with bunny icon

- [ ] **Step 5: Commit**

```bash
git add src/components/Topbar/Topbar.tsx src/components/Topbar/Topbar.module.scss
git commit -m "feat(topbar): rewrite main Topbar with grouped nav and compact layout"
```

---

## Chunk 3: Skeleton Update and Cleanup

### Task 9: Update TopbarSkeleton

**Files:**
- Modify: `src/components/Topbar/TopbarSkeleton.tsx`

- [ ] **Step 1: Replace Bootstrap classes with CSS module / media queries**

Replace the entire file:

```tsx
// src/components/Topbar/TopbarSkeleton.tsx
'use client';

import React from 'react';
import ContentLoader from 'react-content-loader';

export const TopbarSkeleton = (
    props: React.ComponentProps<typeof ContentLoader>,
) => {
    const contentLoaderProps = {
        id: 'skeleton-topbar',
        speed: 2,
        title: 'Loading Topbar',
        backgroundColor: 'var(--bs-secondary-bg)',
        foregroundColor: 'var(--bs-body-bg)',
        width: '100%',
        height: '44',
        viewBox: '0 0 100 4.4',
        preserveAspectRatio: 'none',
        ...props,
    };

    return (
        <>
            <ContentLoader
                {...contentLoaderProps}
                uniqueKey="skeleton-topbar-big"
                style={{ display: 'none' }}
                className="topbar-skeleton-desktop"
            >
                {/* Logo */}
                <rect x="1" y="0.8" rx="0.3" ry="0.3" width="12" height="2.8" />
                {/* Nav groups */}
                <rect x="15" y="1.2" rx="0.3" ry="0.3" width="4" height="2" />
                <rect x="20" y="1.2" rx="0.3" ry="0.3" width="6" height="2" />
                <rect x="27" y="1.2" rx="0.3" ry="0.3" width="6" height="2" />
                <rect x="34" y="1.2" rx="0.3" ry="0.3" width="5" height="2" />
                <rect x="40" y="1.2" rx="0.3" ry="0.3" width="8" height="2" />
                {/* Search */}
                <rect x="70" y="0.8" rx="0.3" ry="0.3" width="14" height="2.8" />
                {/* Theme + user */}
                <rect x="86" y="1.2" rx="0.3" ry="0.3" width="4" height="2" />
                <rect x="92" y="0.8" rx="0.3" ry="0.3" width="6" height="2.8" />
            </ContentLoader>
            <ContentLoader
                {...contentLoaderProps}
                uniqueKey="skeleton-topbar-small"
                style={{ display: 'none' }}
                className="topbar-skeleton-mobile"
            >
                {/* Logo */}
                <rect x="2" y="0.8" rx="0.3" ry="0.3" width="25" height="2.8" />
                {/* Hamburger */}
                <rect x="88" y="1" rx="0.3" ry="0.3" width="8" height="2.4" />
            </ContentLoader>
            <style>{`
                @media (min-width: 992px) {
                    .topbar-skeleton-desktop { display: block !important; }
                    .topbar-skeleton-mobile { display: none !important; }
                }
                @media (max-width: 991.98px) {
                    .topbar-skeleton-desktop { display: none !important; }
                    .topbar-skeleton-mobile { display: block !important; }
                }
            `}</style>
        </>
    );
};
```

Note: Using inline `<style>` tag with global class names for the responsive toggle since `react-content-loader` doesn't support CSS modules on `className`. This is scoped to the skeleton component and the class names are unique enough to avoid collisions.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/Topbar/TopbarSkeleton.tsx
git commit -m "refactor(topbar): update skeleton to remove Bootstrap display classes"
```

---

### Task 10: Clean up overrides SCSS

**Files:**
- Modify: `app/(new-layout)/styles/_overrides.scss`

- [ ] **Step 1: Remove the navbar nav-link hover styles**

Remove lines 34-58 from `_overrides.scss` (the `.navbar .nav-link` block). These styles targeted Bootstrap's navbar and are now replaced by CSS module styles in `NavGroup.module.scss`.

The remaining button and bg-tertiary overrides stay — they're used elsewhere.

- [ ] **Step 2: Verify no other component depends on those styles**

Run: `grep -r "nav-link" --include="*.tsx" --include="*.ts" -l`

Confirm no remaining topbar code uses the `nav-link` class. Other pages may still use it via Bootstrap — the override only applied within `.navbar` scope so removing it is safe.

- [ ] **Step 3: Commit**

```bash
git add app/(new-layout)/styles/_overrides.scss
git commit -m "cleanup: remove navbar nav-link hover styles from overrides"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No new errors

- [ ] **Step 3: Run build**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Visual verification on dev server**

Run: `npm run dev`

Check:
- Desktop: all nav groups visible with hover dropdowns, underline animation, keyboard nav (Tab/Enter/Escape/Arrow keys)
- Desktop: search, dark mode toggle, user menu all functional
- Desktop: Support us link with bunny icon
- Desktop: Admin group only visible for admin users
- Desktop: Tools group only visible for logged-in users
- Mobile: hamburger visible, slide-in menu shows all sections
- Mobile: search input at top of mobile menu
- Light/dark mode: all elements theme-aware
- Logo links to home
- Active page highlighting works via bold text

- [ ] **Step 5: Final commit if any fixups needed**
