# Patron CTA Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small rotating pill CTA with a prominent Spotlight Strip that showcases featured patrons with styled names and a persistent "Become a Patron" button.

**Architecture:** Rewrite `PatronCta.tsx` and its SCSS module in place. Add a mobile version inside `MobileMenu.tsx`. The data layer (`FeaturedPatronsResponse`, `getFeaturedPatrons`) is unchanged — this is purely a component/styling rewrite. The desktop strip uses a slide-up animation for rotating between supporter of the day and latest patron. The mobile version appears at the top of the hamburger menu as a card.

**Tech Stack:** React 19, Next.js 16, CSS Modules (SCSS), existing `PatreonName` and `BunnyIcon` components.

**Spec:** `docs/superpowers/specs/2026-03-27-topbar-patron-cta-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/Topbar/PatronCta.module.scss` | Rewrite | Spotlight strip styles, slide-up animation, mobile card, light/dark |
| `src/components/Topbar/PatronCta.tsx` | Rewrite | Desktop spotlight strip with slide-up rotation |
| `src/components/Topbar/MobileMenu.tsx` | Modify | Add patron CTA card at top of mobile menu, pass `featuredPatrons` prop |
| `src/components/Topbar/MobileMenu.module.scss` | Modify | Remove unused `.supportButton`, simplify footer |
| `src/components/Topbar/Topbar.tsx` | Modify | Pass `featuredPatrons` to `MobileMenu` |

---

### Task 1: Rewrite PatronCta SCSS — Spotlight Strip Layout

**Files:**
- Rewrite: `src/components/Topbar/PatronCta.module.scss`

- [ ] **Step 1: Replace the entire SCSS file with spotlight strip styles**

```scss
// Spotlight strip container — sits between nav and utilities
.container {
    display: none;

    @media (min-width: 992px) {
        display: flex;
    }

    align-items: center;
    gap: 14px;
    background: linear-gradient(
        135deg,
        rgba(96, 140, 89, 0.14) 0%,
        rgba(96, 140, 89, 0.03) 100%
    );
    border: 1px solid rgba(96, 140, 89, 0.25);
    border-radius: 10px;
    padding: 6px 10px 6px 16px;
    flex: 1;
    max-width: 460px;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    color: inherit;

    &:hover {
        background: linear-gradient(
            135deg,
            rgba(96, 140, 89, 0.22) 0%,
            rgba(96, 140, 89, 0.08) 100%
        );
        border-color: rgba(96, 140, 89, 0.4);
    }

    :global([data-bs-theme='dark']) & {
        background: linear-gradient(
            135deg,
            rgba(96, 140, 89, 0.12) 0%,
            rgba(96, 140, 89, 0.02) 100%
        );
        border-color: rgba(96, 140, 89, 0.2);

        &:hover {
            background: linear-gradient(
                135deg,
                rgba(96, 140, 89, 0.2) 0%,
                rgba(96, 140, 89, 0.06) 100%
            );
            border-color: rgba(96, 140, 89, 0.35);
        }
    }
}

// Bunny icon anchor on the left
.icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
}

// Two-line rotating text area
.textArea {
    flex: 1;
    min-width: 0;
    position: relative;
    overflow: hidden;
    height: 34px; // Fits label (12px) + name (16px) + gap
}

// Each slide in the rotation
.slide {
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: absolute;
    inset: 0;
    transform: translateY(100%);
    opacity: 0;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slideActive {
    transform: translateY(0);
    opacity: 1;
}

.slideExiting {
    transform: translateY(-100%);
    opacity: 0;
}

// Small uppercase label ("Patron of the day", "Latest patron")
.label {
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: rgba(96, 140, 89, 0.65);
    line-height: 1;

    :global([data-bs-theme='dark']) & {
        color: rgba(125, 168, 118, 0.6);
    }
}

// Patron display name
.name {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 700;
    font-size: 0.875rem;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--bs-body-color);
}

// CTA button on the right
.ctaButton {
    flex-shrink: 0;
    background: #608c59;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    letter-spacing: 0.2px;
    cursor: pointer;
    transition: background 0.15s ease;
    text-decoration: none;

    &:hover {
        background: #4e7348;
        color: #fff;
    }
}

// Fallback layout when no patrons (just CTA text + button)
.fallbackText {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--bs-body-color);
    white-space: nowrap;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
}

// === Mobile menu card ===
.mobileCard {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0.75rem 1rem;
    margin: 0 1.25rem 0.75rem;
    background: linear-gradient(
        135deg,
        rgba(96, 140, 89, 0.1) 0%,
        rgba(96, 140, 89, 0.02) 100%
    );
    border: 1px solid rgba(96, 140, 89, 0.2);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: background 0.15s ease;

    &:hover {
        background: linear-gradient(
            135deg,
            rgba(96, 140, 89, 0.18) 0%,
            rgba(96, 140, 89, 0.06) 100%
        );
    }

    :global([data-bs-theme='dark']) & {
        background: linear-gradient(
            135deg,
            rgba(96, 140, 89, 0.08) 0%,
            rgba(96, 140, 89, 0.01) 100%
        );
        border-color: rgba(96, 140, 89, 0.15);
    }
}

.mobileTextArea {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.mobileName {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 700;
    font-size: 0.875rem;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--bs-body-color);
}

.mobileCtaButton {
    flex-shrink: 0;
    background: #608c59;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    text-decoration: none;

    &:hover {
        background: #4e7348;
        color: #fff;
    }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
    .slide {
        transition: none;
    }

    .container,
    .ctaButton,
    .mobileCard,
    .mobileCtaButton {
        transition: none;
    }
}
```

- [ ] **Step 2: Verify formatting**

Run: `npx @biomejs/biome check src/components/Topbar/PatronCta.module.scss`

- [ ] **Step 3: Commit**

```bash
git add src/components/Topbar/PatronCta.module.scss
git commit -m "style(patron-cta): rewrite SCSS for spotlight strip layout"
```

---

### Task 2: Rewrite PatronCta Component — Desktop Spotlight Strip

**Files:**
- Rewrite: `src/components/Topbar/PatronCta.tsx`

- [ ] **Step 1: Replace the entire component with the spotlight strip implementation**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '~src/components/link';
import PatreonName from '~src/components/patreon/patreon-name';
import { BunnyIcon } from '~src/icons/bunny-icon';
import type { FeaturedPatronsResponse } from '../../../types/patreon.types';
import styles from './PatronCta.module.scss';

interface PatronCtaProps {
    featuredPatrons: FeaturedPatronsResponse;
}

interface Slide {
    key: string;
    label: string;
    patron: {
        patreonName: string;
        username: string | null;
        preferences: { colorPreference: number; showIcon: boolean } | null;
    };
}

function PatronDisplayName({
    patron,
}: {
    patron: Slide['patron'];
}) {
    const displayName = patron.username ?? patron.patreonName;

    if (patron.preferences) {
        return (
            <span className={styles.name}>
                <PatreonName
                    name={displayName}
                    color={patron.preferences.colorPreference}
                    icon={false}
                />
                {patron.preferences.showIcon && <BunnyIcon size={16} />}
            </span>
        );
    }

    return <span className={styles.name}>{displayName}</span>;
}

export function PatronCta({ featuredPatrons }: PatronCtaProps) {
    const { supporterOfTheDay, latestPatron } = featuredPatrons;
    const [activeIndex, setActiveIndex] = useState(0);
    const [exitingIndex, setExitingIndex] = useState<number | null>(null);
    const [reducedMotion, setReducedMotion] = useState(false);
    const isPaused = useRef(false);

    useEffect(() => {
        setReducedMotion(
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        );
    }, []);

    const slides: Slide[] = [];

    if (supporterOfTheDay) {
        slides.push({
            key: 'sotd',
            label: 'Patron of the day',
            patron: supporterOfTheDay,
        });
    }

    if (latestPatron) {
        slides.push({
            key: 'latest',
            label: 'Latest patron',
            patron: latestPatron,
        });
    }

    useEffect(() => {
        if (slides.length <= 1 || reducedMotion) return;

        const interval = setInterval(() => {
            if (!isPaused.current) {
                setActiveIndex((prev) => {
                    const next = (prev + 1) % slides.length;
                    setExitingIndex(prev);
                    setTimeout(() => setExitingIndex(null), 400);
                    return next;
                });
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [slides.length, reducedMotion]);

    // Fallback: no featured patrons at all
    if (slides.length === 0) {
        return (
            <Link href="/patron" className={styles.container}>
                <span className={styles.icon}>
                    <BunnyIcon size={22} />
                </span>
                <span className={styles.fallbackText}>
                    Support therun.gg
                </span>
                <span className={styles.ctaButton}>Become a Patron</span>
            </Link>
        );
    }

    return (
        <Link
            href="/patron"
            className={styles.container}
            onMouseEnter={() => {
                isPaused.current = true;
            }}
            onMouseLeave={() => {
                isPaused.current = false;
            }}
        >
            <span className={styles.icon}>
                <BunnyIcon size={22} />
            </span>

            <div className={styles.textArea} aria-live="polite">
                {slides.map((slide, i) => (
                    <div
                        key={slide.key}
                        className={`${styles.slide} ${i === activeIndex ? styles.slideActive : ''} ${i === exitingIndex ? styles.slideExiting : ''}`}
                    >
                        <span className={styles.label}>{slide.label}</span>
                        <PatronDisplayName patron={slide.patron} />
                    </div>
                ))}
            </div>

            <span className={styles.ctaButton}>Become a Patron</span>
        </Link>
    );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/Topbar/PatronCta.tsx
git commit -m "feat(patron-cta): rewrite as spotlight strip with slide-up animation"
```

---

### Task 3: Add PatronCta to Mobile Menu

**Files:**
- Modify: `src/components/Topbar/MobileMenu.tsx`
- Modify: `src/components/Topbar/Topbar.tsx` (line 76 — pass `featuredPatrons` to `MobileMenu`)

- [ ] **Step 1: Add imports to MobileMenu.tsx**

Add after the existing imports (after line 16):

```tsx
import type { FeaturedPatronsResponse } from '../../../types/patreon.types';
import PatreonName from '~src/components/patreon/patreon-name';
import patronCtaStyles from './PatronCta.module.scss';
```

- [ ] **Step 2: Add the MobilePatronName helper component**

Add before the `MobileMenu` function (after the `DarkModeSlider` dynamic import, around line 28):

```tsx
function MobilePatronName({
    patron,
}: {
    patron: {
        patreonName: string;
        username: string | null;
        preferences: { colorPreference: number; showIcon: boolean } | null;
    };
}) {
    const displayName = patron.username ?? patron.patreonName;

    if (patron.preferences) {
        return (
            <span className={patronCtaStyles.mobileName}>
                <PatreonName
                    name={displayName}
                    color={patron.preferences.colorPreference}
                    icon={false}
                />
                {patron.preferences.showIcon && <BunnyIcon size={16} />}
            </span>
        );
    }

    return (
        <span className={patronCtaStyles.mobileName}>{displayName}</span>
    );
}
```

- [ ] **Step 3: Update MobileMenuProps and component signature**

Change the interface and function signature:

```tsx
interface MobileMenuProps {
    username?: string;
    featuredPatrons?: FeaturedPatronsResponse;
}

export function MobileMenu({ username, featuredPatrons }: MobileMenuProps) {
```

- [ ] **Step 4: Add the mobile patron CTA card**

Insert after the `searchWrapper` div (after line 193) and before the `sections` div (line 195):

```tsx
                {featuredPatrons &&
                    (featuredPatrons.supporterOfTheDay ||
                        featuredPatrons.latestPatron) && (
                        <Link
                            href="/patron"
                            className={patronCtaStyles.mobileCard}
                            onClick={close}
                        >
                            <span className={patronCtaStyles.icon}>
                                <BunnyIcon size={22} />
                            </span>
                            <div className={patronCtaStyles.mobileTextArea}>
                                <span className={patronCtaStyles.label}>
                                    {featuredPatrons.supporterOfTheDay
                                        ? 'Patron of the day'
                                        : 'Latest patron'}
                                </span>
                                <MobilePatronName
                                    patron={
                                        (featuredPatrons.supporterOfTheDay ??
                                        featuredPatrons.latestPatron)!
                                    }
                                />
                            </div>
                            <span className={patronCtaStyles.mobileCtaButton}>
                                Join
                            </span>
                        </Link>
                    )}
```

- [ ] **Step 5: Replace the footer "Support us" link with just the dark mode toggle**

Replace the footer section (lines 206-217) with:

```tsx
                <div className={styles.footer}>
                    <div className={styles.footerToggle}>
                        <DarkModeSlider />
                    </div>
                </div>
```

- [ ] **Step 6: Pass `featuredPatrons` to MobileMenu from Topbar**

In `src/components/Topbar/Topbar.tsx`, change line 76 from:

```tsx
            <MobileMenu username={username} />
```

To:

```tsx
            <MobileMenu username={username} featuredPatrons={featuredPatrons} />
```

- [ ] **Step 7: Verify it compiles**

Run: `npm run typecheck 2>&1 | head -20`

- [ ] **Step 8: Commit**

```bash
git add src/components/Topbar/MobileMenu.tsx src/components/Topbar/Topbar.tsx
git commit -m "feat(patron-cta): add patron CTA card to mobile menu"
```

---

### Task 4: Clean Up Unused Mobile Menu Styles

**Files:**
- Modify: `src/components/Topbar/MobileMenu.module.scss`

- [ ] **Step 1: Remove the `.supportButton` styles**

Delete the `.supportButton` block (lines 263-293 in the current file). Keep `.footer` and `.footerToggle`.

- [ ] **Step 2: Simplify the `.footer` layout**

Replace the `.footer` class with a centered layout since the dark mode toggle is now the only child:

```scss
.footer {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;

    :global([data-bs-theme='dark']) & {
        border-top-color: rgba(255, 255, 255, 0.06);
    }
}
```

- [ ] **Step 3: Remove `.supportButton` from the reduced-motion block**

In the `@media (prefers-reduced-motion: reduce)` block at the bottom of the file (lines 299-312), remove `.supportButton` from the selector list. The block should become:

```scss
@media (prefers-reduced-motion: reduce) {
    .overlay,
    .scrim,
    .bar,
    .link,
    .closeButton {
        transition: none;
    }

    .liveDot {
        animation: none;
    }
}
```

- [ ] **Step 4: Verify lint passes**

Run: `npx @biomejs/biome check src/components/Topbar/MobileMenu.module.scss`

- [ ] **Step 5: Commit**

```bash
git add src/components/Topbar/MobileMenu.module.scss
git commit -m "style(patron-cta): remove unused supportButton styles from mobile menu"
```

---

### Task 5: Visual Verification and Polish

**Files:**
- Possibly modify: `src/components/Topbar/PatronCta.module.scss`, `src/components/Topbar/PatronCta.tsx`

- [ ] **Step 1: Start dev server and verify desktop**

Run: `npm run dev`

Check in browser at desktop width (>= 992px):
1. Spotlight strip is visible between nav links and utility icons
2. Shows bunny icon on left, two-line text (label + patron name), "Become a Patron" button on right
3. If both patrons present: slides rotate every 5s with slide-up animation
4. Hovering pauses rotation
5. Entire strip links to `/patron`
6. Toggle dark mode — verify colors look correct

- [ ] **Step 2: Verify mobile**

Resize browser below 992px:
1. Spotlight strip is hidden in topbar
2. Open hamburger menu — patron CTA card appears between search and nav sections
3. Card shows bunny icon, label, patron name with tier styling, "Join" button
4. Tapping card navigates to `/patron` and closes menu
5. Dark mode toggle still in footer, "Support us" link is gone

- [ ] **Step 3: Test edge cases**

1. Both patrons null → shows fallback "Support therun.gg" with button (desktop), no card in mobile menu
2. Only one patron → shows statically, no rotation
3. Long patron name → truncates with ellipsis

- [ ] **Step 4: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 5: Commit any polish fixes (skip if none needed)**

```bash
git add -u
git commit -m "fix(patron-cta): visual polish from manual testing"
```
