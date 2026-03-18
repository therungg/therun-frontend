# Topbar Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the existing topbar from bare wireframe to a premium frosted-glass design with polished hover states and floating dropdowns.

**Architecture:** CSS-only overhaul of 4 SCSS module files + 1 minor TSX tweak. No component structure or behavior changes. Dark mode handled via `:global([data-bs-theme="dark"])` nesting in CSS modules.

**Tech Stack:** SCSS modules, Bootstrap 5.3 CSS custom properties, next-themes

**Spec:** `docs/superpowers/specs/2026-03-18-topbar-visual-redesign-design.md`

---

### Task 1: Topbar Bar — Frosted Glass Treatment

**Files:**
- Modify: `src/components/Topbar/Topbar.module.scss`

- [ ] **Step 1: Update `.topbar` with glass styles**

Replace the full contents of `Topbar.module.scss` with:

```scss
.topbar {
    display: flex;
    align-items: center;
    height: 48px;
    padding: 0 1.25rem;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);

    :global([data-bs-theme='dark']) & {
        background: rgba(18, 26, 17, 0.8);
        border-bottom-color: rgba(255, 255, 255, 0.06);
    }
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
    padding: 4px 12px;
    color: var(--bs-primary);
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
    border: 1px solid rgba(96, 140, 89, 0.25);
    border-radius: 20px;
    background: rgba(96, 140, 89, 0.04);
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
        background: rgba(96, 140, 89, 0.1);
        border-color: rgba(96, 140, 89, 0.4);
        color: var(--bs-primary);
    }

    :global([data-bs-theme='dark']) & {
        color: #7DA876;
        border-color: rgba(96, 140, 89, 0.2);
        background: rgba(96, 140, 89, 0.06);

        &:hover {
            background: rgba(96, 140, 89, 0.12);
            border-color: rgba(96, 140, 89, 0.35);
        }
    }
}

.utilities {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build 2>&1 | head -30`
Expected: No SCSS compilation errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Topbar/Topbar.module.scss
git commit -m "style(topbar): apply frosted glass bar and support link pill"
```

---

### Task 2: NavGroup — Pill Hover, Underline, Glass Dropdowns

**Files:**
- Modify: `src/components/Topbar/NavGroup.module.scss`
- Modify: `src/components/Topbar/NavGroup.tsx` (one line — add `transform` to open style)

- [ ] **Step 1: Replace NavGroup.module.scss**

```scss
.group {
    position: relative;
    display: flex;
    align-items: center;

    // Invisible bridge so hover survives the 4px gap to dropdown
    &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        height: 8px;
    }
}

.trigger {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background: none;
    border: none;
    color: var(--bs-body-color);
    opacity: 0.65;
    font-size: 0.855rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    position: relative;
    text-decoration: none;
    border-radius: 6px;
    transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;

    &::after {
        content: '';
        position: absolute;
        left: 10px;
        right: 10px;
        bottom: 1px;
        height: 2px;
        background-color: var(--bs-primary);
        border-radius: 1px;
        transform: scaleX(0);
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
}

.dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 100;
    min-width: 180px;
    padding: 4px;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.05);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease;

    :global([data-bs-theme='dark']) & {
        background: rgba(30, 43, 28, 0.9);
        border-color: rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.15);
    }
}

.item {
    display: block;
    padding: 7px 12px;
    color: var(--bs-body-color);
    text-decoration: none;
    font-size: 0.825rem;
    white-space: nowrap;
    border-radius: 6px;
    transition: background 0.1s ease;

    &:hover {
        background: rgba(96, 140, 89, 0.1);
        color: var(--bs-body-color);
    }

    :global([data-bs-theme='dark']) &:hover {
        background: rgba(96, 140, 89, 0.15);
    }
}

.active {
    color: var(--bs-primary);
    opacity: 1;

    &::after {
        transform: scaleX(1);
    }

    :global([data-bs-theme='dark']) & {
        color: #7DA876;
    }
}

// Desktop hover behavior — only on devices that support hover
@media (hover: hover) {
    .trigger:hover {
        background: rgba(96, 140, 89, 0.08);
        opacity: 1;

        :global([data-bs-theme='dark']) & {
            background: rgba(96, 140, 89, 0.12);
        }
    }

    .group:hover .trigger::after {
        transform: scaleX(1);
    }

    .group:hover .trigger {
        opacity: 1;
    }

    .group:hover .dropdown {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
}
```

- [ ] **Step 2: Update NavGroup.tsx open-state inline style**

In `src/components/Topbar/NavGroup.tsx`, find the `style` prop on the dropdown div (around line 100-104). Change from:

```tsx
style={
    open
        ? { opacity: 1, visibility: 'visible' as const }
        : undefined
}
```

To:

```tsx
style={
    open
        ? { opacity: 1, visibility: 'visible' as const, transform: 'translateY(0)' }
        : undefined
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/components/Topbar/NavGroup.module.scss src/components/Topbar/NavGroup.tsx
git commit -m "style(topbar): add pill hover, underline states, and glass dropdowns to NavGroup"
```

---

### Task 3: UserMenu — Glass Dropdown & Avatar Ring

**Files:**
- Modify: `src/components/Topbar/UserMenu.module.scss`

- [ ] **Step 1: Replace UserMenu.module.scss**

```scss
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
    transition: box-shadow 0.15s ease;

    &:hover {
        box-shadow: 0 0 0 2px rgba(96, 140, 89, 0.3);
    }
}

.dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 100;
    min-width: 160px;
    padding: 4px;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.05);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease;

    :global([data-bs-theme='dark']) & {
        background: rgba(30, 43, 28, 0.9);
        border-color: rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.15);
    }
}

.dropdownOpen {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.item {
    display: block;
    padding: 7px 12px;
    color: var(--bs-body-color);
    text-decoration: none;
    font-size: 0.825rem;
    white-space: nowrap;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.1s ease;

    &:hover {
        background: rgba(96, 140, 89, 0.1);
    }

    :global([data-bs-theme='dark']) &:hover {
        background: rgba(96, 140, 89, 0.15);
    }
}

@media (hover: hover) {
    .container:hover .dropdown {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/components/Topbar/UserMenu.module.scss
git commit -m "style(topbar): apply glass dropdown and avatar hover ring to UserMenu"
```

---

### Task 4: TopbarLogo — Extract Inline Styles to SCSS Module

**Files:**
- Modify: `src/components/Topbar/TopbarLogo.tsx`
- Create: `src/components/Topbar/TopbarLogo.module.scss`

- [ ] **Step 1: Create TopbarLogo.module.scss**

```scss
.logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--bs-body-color);
    font-weight: 700;
    font-size: 0.95rem;
    white-space: nowrap;
    margin-right: 0.25rem;
    transition: opacity 0.15s ease;

    &:hover {
        opacity: 0.8;
    }
}

.logoImage {
    border-radius: 4px;
}
```

- [ ] **Step 2: Update TopbarLogo.tsx to use the module**

Replace the component with:

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import styles from './TopbarLogo.module.scss';

export function TopbarLogo() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const theme = mounted ? resolvedTheme || 'dark' : 'dark';

    return (
        <Link href="/" className={styles.logo}>
            <Image
                unoptimized
                alt="TheRun"
                src={`/logo_${theme}_theme_no_text_transparent.png`}
                height={36}
                width={36}
                className={styles.logoImage}
                suppressHydrationWarning
            />
            <span suppressHydrationWarning>The Run</span>
        </Link>
    );
}
```

Changes from original: removed inline `style` prop, use `className={styles.logo}`, added `margin-right` to give breathing room before nav items.

- [ ] **Step 3: Verify build compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/components/Topbar/TopbarLogo.tsx src/components/Topbar/TopbarLogo.module.scss
git commit -m "refactor(topbar): extract TopbarLogo inline styles to SCSS module"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Run build**

Run: `rm -rf .next && npm run build`
Expected: Successful build with no errors.

- [ ] **Step 4: Visual check list**

Start dev server (`npm run dev`) and manually verify:
- Light mode: glass bar, pill hover + underline on nav items, glass dropdowns, green pill on "Support us"
- Dark mode: dark glass bar, green-tinted hovers, dark glass dropdowns
- Dropdown hover: mouse can travel from trigger through 4px gap into dropdown without closing
- Keyboard: Escape/Arrow still works on nav groups
- Avatar: green ring on hover
- Logo: properly styled, no inline styles in DOM
