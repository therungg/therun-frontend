# Topbar Patron CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static "Support us" topbar link with a rotating widget showing featured patrons and a CTA to drive patron conversion.

**Architecture:** Server-side fetch in `header.tsx` passes featured patron data through props to a new client-side `PatronCta` component that handles rotation. Falls back to static CTA on error or null data.

**Tech Stack:** Next.js 16 (App Router, `'use cache'`), React 19, TypeScript, SCSS Modules

**Spec:** `docs/superpowers/specs/2026-03-27-topbar-patron-cta-design.md`

**No test framework** is configured in this project. Verification steps use `npm run typecheck`, `npm run lint`, and manual browser inspection.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `types/patreon.types.ts` | Export `PatronPreferences`, add `FeaturedPatron` and `FeaturedPatronsResponse` |
| Create | `src/lib/featured-patrons.ts` | Server-side cached fetch for `/featured` endpoint |
| Create | `src/components/Topbar/PatronCta.tsx` | Client component — rotation logic, slide rendering |
| Create | `src/components/Topbar/PatronCta.module.scss` | Crossfade animation, pill container, reduced-motion |
| Modify | `app/(new-layout)/header.tsx` | Call `getFeaturedPatrons()` with try/catch, forward to `Topbar` |
| Modify | `src/components/Topbar/Topbar.tsx` | Accept `featuredPatrons` prop, render `PatronCta` instead of static link |
| Modify | `src/components/Topbar/Topbar.module.scss` | Adjust `.supportLink` for rotation container |

---

### Task 1: Add types

**Files:**
- Modify: `types/patreon.types.ts`

- [ ] **Step 1: Export `PatronPreferences` and add new interfaces**

```typescript
export interface PatronPreferences {
    hide: boolean;
    featureOnOverview: boolean;
    colorPreference: number;
    featureInScrollbar: boolean;
    showIcon: boolean;
}

export interface Patron {
    preferences: PatronPreferences;
    tier: number;
}

export interface PatronMap {
    [PatronName: string]: Patron;
}

export interface FeaturedPatron {
    patronId: number;
    patreonName: string;
    tier: number;
    username: string | null;
    preferences: PatronPreferences | null;
}

export interface FeaturedPatronsResponse {
    supporterOfTheDay: FeaturedPatron | null;
    latestPatron: FeaturedPatron | null;
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS (no consumers of the non-exported `PatronPreferences` should break since it was only used internally)

- [ ] **Step 3: Commit**

```bash
git add types/patreon.types.ts
git commit -m "feat(patron-cta): add FeaturedPatron types and export PatronPreferences"
```

---

### Task 2: Create server-side data fetching

**Files:**
- Create: `src/lib/featured-patrons.ts`

- [ ] **Step 1: Create the cached fetch function**

Reference `app/api/patreons/get-all-patrons.action.ts` for the pattern. Use `fetcher` from `~src/utils/fetcher`. Filter out patrons with `preferences.hide = true` as a safety check.

```typescript
import { cacheLife, cacheTag } from 'next/cache';
import type { FeaturedPatronsResponse } from '../../types/patreon.types';

export async function getFeaturedPatrons(): Promise<FeaturedPatronsResponse> {
    'use cache';
    cacheLife('hours');
    cacheTag('featured-patrons');

    const url = `${process.env.NEXT_PUBLIC_PATREON_API_URL}/featured`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Featured patrons API error: ${res.status}`);
    }

    const data: FeaturedPatronsResponse = await res.json();

    return {
        supporterOfTheDay:
            data.supporterOfTheDay?.preferences?.hide
                ? null
                : data.supporterOfTheDay,
        latestPatron:
            data.latestPatron?.preferences?.hide
                ? null
                : data.latestPatron,
    };
}
```

Note: Do NOT use `fetcher` from `~src/utils/fetcher` — it doesn't check `response.ok`, so API errors would silently return garbage data instead of throwing.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/featured-patrons.ts
git commit -m "feat(patron-cta): add server-side getFeaturedPatrons with caching"
```

---

### Task 3: Create PatronCta component and styles

**Files:**
- Create: `src/components/Topbar/PatronCta.tsx`
- Create: `src/components/Topbar/PatronCta.module.scss`

- [ ] **Step 1: Create SCSS module**

The container reuses the `.supportLink` pill shape. Slides use absolute positioning with opacity crossfade. Reduced-motion users see only the static CTA.

```scss
.container {
    display: none;

    @media (min-width: 992px) {
        display: flex;
    }

    position: relative;
    align-items: center;
    justify-content: center;
    max-width: 260px;
    height: 32px;
    padding: 5px 14px;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    border: 1px solid rgba(96, 140, 89, 0.25);
    border-radius: 20px;
    background: rgba(96, 140, 89, 0.04);
    overflow: hidden;
    transition: background 0.15s ease, border-color 0.15s ease;
    color: var(--bs-primary);
    cursor: pointer;

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

.slide {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    position: absolute;
    inset: 0;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--bs-primary);

    :global([data-bs-theme='dark']) & {
        color: #7DA876;
    }
}

.slideActive {
    opacity: 1;
    pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
    .slide {
        transition: none;
    }
}

.label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
```

- [ ] **Step 2: Create PatronCta component**

Client component. Builds slides array from props, cycles with `setInterval`, pauses on hover. Uses `PatreonName` for styled names (with `icon={false}` — renders a standalone `BunnyIcon` separately to avoid tooltip clipping). Falls back to static CTA if no patron data.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '~src/components/link';
import { BunnyIcon } from '~src/icons/bunny-icon';
import type { FeaturedPatronsResponse } from '../../../types/patreon.types';
import PatreonName from '~src/components/patreon/patreon-name';
import styles from './PatronCta.module.scss';

interface PatronCtaProps {
    featuredPatrons: FeaturedPatronsResponse;
}

interface Slide {
    key: string;
    content: React.ReactNode;
}

function PatronDisplayName({ patron }: { patron: { patreonName: string; username: string | null; preferences: { colorPreference: number; showIcon: boolean } | null } }) {
    const displayName = patron.username ?? patron.patreonName;

    if (patron.preferences) {
        return (
            <>
                <PatreonName
                    name={displayName}
                    color={patron.preferences.colorPreference}
                    icon={false}
                />
                {patron.preferences.showIcon && <BunnyIcon size={20} />}
            </>
        );
    }

    return <span>{displayName}</span>;
}

export function PatronCta({ featuredPatrons }: PatronCtaProps) {
    const { supporterOfTheDay, latestPatron } = featuredPatrons;
    const [activeIndex, setActiveIndex] = useState(0);
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
            content: (
                <span className={styles.label}>
                    Supporter of the Day:{' '}
                    <PatronDisplayName patron={supporterOfTheDay} />
                </span>
            ),
        });
    }

    if (latestPatron) {
        slides.push({
            key: 'latest',
            content: (
                <span className={styles.label}>
                    Welcome{' '}
                    <PatronDisplayName patron={latestPatron} />!
                </span>
            ),
        });
    }

    slides.push({
        key: 'cta',
        content: (
            <>
                Support us <BunnyIcon size={20} />
            </>
        ),
    });

    useEffect(() => {
        if (slides.length <= 1 || reducedMotion) return;

        const interval = setInterval(() => {
            if (!isPaused.current) {
                setActiveIndex((prev) => (prev + 1) % slides.length);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [slides.length, reducedMotion]);

    // For reduced motion, only show static CTA (no hydration mismatch —
    // reducedMotion starts false and updates after mount via useEffect)
    const visibleSlides = reducedMotion
        ? [slides[slides.length - 1]]
        : slides;
    const visibleIndex = reducedMotion ? 0 : activeIndex;

    return (
        <Link
            href="/patron"
            className={styles.container}
            onMouseEnter={() => { isPaused.current = true; }}
            onMouseLeave={() => { isPaused.current = false; }}
            aria-live="polite"
        >
            {visibleSlides.map((slide, i) => (
                <span
                    key={slide.key}
                    className={`${styles.slide} ${i === visibleIndex ? styles.slideActive : ''}`}
                >
                    {slide.content}
                </span>
            ))}
        </Link>
    );
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/Topbar/PatronCta.tsx src/components/Topbar/PatronCta.module.scss
git commit -m "feat(patron-cta): add rotating PatronCta component with crossfade animation"
```

---

### Task 4: Wire up data flow (header → topbar)

**Files:**
- Modify: `app/(new-layout)/header.tsx`
- Modify: `src/components/Topbar/Topbar.tsx`
- Modify: `src/components/Topbar/Topbar.module.scss`

- [ ] **Step 1: Update `header.tsx` — fetch featured patrons and pass to Topbar**

Make `Header` an async server component. Call `getFeaturedPatrons()` with try/catch directly in `header.tsx` (it's already a server component). No changes needed in `layout.tsx`.

```typescript
import { ErrorBoundary } from 'react-error-boundary';
import { Topbar } from '~src/components/Topbar/Topbar';
import { TopbarSkeleton } from '~src/components/Topbar/TopbarSkeleton';
import { getFeaturedPatrons } from '~src/lib/featured-patrons';
import type { FeaturedPatronsResponse } from '../../types/patreon.types';

interface HeaderProps {
    username: string;
    picture: string;
    sessionError: string | null;
}

export const Header = async ({
    username,
    picture,
    sessionError,
}: Partial<HeaderProps>) => {
    let featuredPatrons: FeaturedPatronsResponse;
    try {
        featuredPatrons = await getFeaturedPatrons();
    } catch {
        featuredPatrons = { supporterOfTheDay: null, latestPatron: null };
    }

    return (
        <ErrorBoundary fallback={<TopbarSkeleton />}>
            <Topbar
                username={username}
                picture={picture}
                sessionError={sessionError}
                featuredPatrons={featuredPatrons}
            />
        </ErrorBoundary>
    );
};
```

- [ ] **Step 2: Update `Topbar.tsx` — accept `featuredPatrons`, replace static link with `PatronCta`**

Add `featuredPatrons` to `TopbarProps`. Replace the static `<Link href="/patron">` with `<PatronCta>`. If `featuredPatrons` is undefined, pass `{ supporterOfTheDay: null, latestPatron: null }` as a safe default.

```typescript
import type { FeaturedPatronsResponse } from '../../../types/patreon.types';
import { PatronCta } from './PatronCta';

interface TopbarProps {
    username: string;
    picture: string;
    sessionError: string | null;
    featuredPatrons: FeaturedPatronsResponse;
}

// In the JSX, replace:
//   <Link href="/patron" className={topbarStyles.supportLink}>
//       Support us <BunnyIcon />
//   </Link>
// With:
<PatronCta
    featuredPatrons={featuredPatrons ?? { supporterOfTheDay: null, latestPatron: null }}
/>
```

Remove the `BunnyIcon` import from Topbar.tsx — it's no longer used there. The `Link` import is still used for nav items.

- [ ] **Step 3: Clean up `Topbar.module.scss`**

Remove the `.supportLink` class — its styling is now in `PatronCta.module.scss`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 5: Manual verification**

Run: `npm run dev`
Check in browser:
1. The pill appears in the topbar at desktop width (992px+)
2. It rotates through slides every ~5 seconds with crossfade
3. Hovering pauses rotation
4. Clicking navigates to `/patron`
5. Hidden on mobile widths
6. Dark mode styling works

- [ ] **Step 6: Commit**

```bash
git add app/(new-layout)/header.tsx src/components/Topbar/Topbar.tsx src/components/Topbar/Topbar.module.scss
git commit -m "feat(patron-cta): wire up featured patrons data flow and replace static CTA"
```
