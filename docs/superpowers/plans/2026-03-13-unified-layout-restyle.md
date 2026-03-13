# Unified Layout Restyle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all pages into `(new-layout)` with consistent styling using the existing design system (tokens, mixins, CSS Modules).

**Architecture:** Move pages from `(old-layout)` and `(footer)` route groups into `(new-layout)`. Extract shared CSS Modules for common component types (tables, cards, forms). Restyle existing components to use design tokens. Bootstrap grid stays for page layout; custom components get CSS Modules.

**Tech Stack:** Next.js 16 App Router, SCSS CSS Modules, Bootstrap grid, existing design tokens from `app/(new-layout)/styles/_design-tokens.scss`

**Spec:** `docs/superpowers/specs/2026-03-13-unified-layout-restyle-design.md`

**Note on testing:** This is a visual styling migration. There are no unit tests for CSS. Each task should be verified by running `npm run dev` and visually checking the affected pages in both light and dark mode. Run `npm run typecheck` after file moves to catch import breakage.

---

## Chunk 1: Infrastructure

### Task 1: Extract Providers to Shared Location

Currently `app/(old-layout)/providers.tsx` is imported by both layout groups. Extract it before removing `(old-layout)`.

**Files:**
- Move: `app/(old-layout)/providers.tsx` → `src/components/providers.tsx`
- Modify: `app/(new-layout)/layout.tsx` (update import)
- Modify: `app/(old-layout)/layout.tsx` (update import)

- [ ] **Step 1: Copy providers to shared location**

Create `src/components/providers.tsx` with the same content as `app/(old-layout)/providers.tsx`:

```tsx
'use client';

import { ThemeProvider } from 'next-themes';
import { PropsWithChildren } from 'react';
import { User } from 'types/session.types';
import { defineAbilityFor } from '~src/rbac/ability';
import { AbilityContext } from '~src/rbac/Can.component';

interface ProvidersProps {
    user: User;
}

export function Providers({
    children,
    user,
}: PropsWithChildren<ProvidersProps>) {
    const ability = defineAbilityFor(user);

    return (
        <ThemeProvider attribute="data-bs-theme">
            <AbilityContext.Provider value={ability}>
                {children}
            </AbilityContext.Provider>
        </ThemeProvider>
    );
}
```

- [ ] **Step 2: Update new-layout import**

In `app/(new-layout)/layout.tsx`, change:
```tsx
// Before
import { Providers } from '~app/(old-layout)/providers';
// After
import { Providers } from '~src/components/providers';
```

- [ ] **Step 3: Update old-layout import**

In `app/(old-layout)/layout.tsx`, change:
```tsx
// Before
import { Providers } from './providers';
// After
import { Providers } from '~src/components/providers';
```

- [ ] **Step 4: Delete old providers file**

Delete `app/(old-layout)/providers.tsx`.

- [ ] **Step 5: Verify**

Run: `npm run typecheck`
Expected: No errors related to providers imports.

- [ ] **Step 6: Commit**

```bash
git add src/components/providers.tsx app/(new-layout)/layout.tsx app/(old-layout)/layout.tsx
git rm app/(old-layout)/providers.tsx
git commit -m "Extract providers to shared location"
```

---

### Task 2: Relocate API Routes

Move all 30 API route handlers from `app/(old-layout)/api/` to `app/api/`. API routes don't use layouts.

**Files:**
- Move: `app/(old-layout)/api/` → `app/api/`

- [ ] **Step 1: Move API directory**

```bash
mv app/(old-layout)/api app/api
```

- [ ] **Step 2: Verify no import breakage**

Run: `npm run typecheck`

API routes use relative imports sparingly. Check if any route files import from `../(old-layout)` paths and fix if needed.

- [ ] **Step 3: Commit**

```bash
git add app/api/ app/(old-layout)/api/
git commit -m "Relocate API routes to top-level app/api/"
```

---

### Task 3: Extract Scripts to Shared Location

`app/(old-layout)/scripts.tsx` is imported by `app/(new-layout)/layout.tsx`. Extract it.

**Files:**
- Move: `app/(old-layout)/scripts.tsx` → `src/components/scripts.tsx`
- Modify: `app/(new-layout)/layout.tsx` (update import)
- Modify: `app/(old-layout)/layout.tsx` (update import)

- [ ] **Step 1: Move scripts file**

```bash
mv app/(old-layout)/scripts.tsx src/components/scripts.tsx
```

- [ ] **Step 2: Update imports in both layouts**

In `app/(new-layout)/layout.tsx`:
```tsx
// Before
import { Scripts } from '~app/(old-layout)/scripts';
// After
import { Scripts } from '~src/components/scripts';
```

In `app/(old-layout)/layout.tsx`:
```tsx
// Before
import { Scripts } from './scripts';
// After
import { Scripts } from '~src/components/scripts';
```

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck
git add src/components/scripts.tsx app/(new-layout)/layout.tsx app/(old-layout)/layout.tsx
git commit -m "Extract scripts component to shared location"
```

---

### Task 4: Create Slim Footer Component

**Files:**
- Create: `app/(new-layout)/components/footer.tsx`
- Create: `app/(new-layout)/components/styles/footer.module.scss`

- [ ] **Step 1: Create footer styles**

Create `app/(new-layout)/components/styles/footer.module.scss`:

```scss
@use '../../styles/design-tokens' as *;

.footer {
    border-top: 1px solid rgba(var(--bs-primary-rgb), 0.15);
    padding: $spacing-md 0;
    margin-top: auto;
}

.links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: $spacing-lg;
    list-style: none;
    padding: 0;
    margin: 0;
}

.link {
    font-size: $font-size-xs;
    color: var(--bs-secondary-color);
    text-decoration: none;
    transition: color $transition-fast;

    &:hover {
        color: var(--bs-primary);
    }
}

.copyright {
    font-size: $font-size-2xs;
    color: var(--bs-secondary-color);
    text-align: center;
    margin-top: $spacing-sm;
}
```

- [ ] **Step 2: Create footer component**

Create `app/(new-layout)/components/footer.tsx`:

```tsx
import Link from 'next/link';
import styles from './styles/footer.module.scss';

const links = [
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
    { href: '/privacy-policy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms' },
];

export const Footer = () => {
    return (
        <footer className={styles.footer}>
            <nav>
                <ul className={styles.links}>
                    {links.map(({ href, label }) => (
                        <li key={href}>
                            <Link
                                href={href}
                                className={styles.link}
                                prefetch={false}
                            >
                                {label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </footer>
    );
};
```

- [ ] **Step 3: Commit**

```bash
git add app/(new-layout)/components/footer.tsx app/(new-layout)/components/styles/footer.module.scss
git commit -m "Add slim footer component"
```

---

### Task 5: Add Footer to New Layout

**Files:**
- Modify: `app/(new-layout)/layout.tsx`
- Modify: `app/(new-layout)/layout.module.scss`

- [ ] **Step 1: Update layout to include footer**

In `app/(new-layout)/layout.tsx`, add the footer import and render it after `<main>`:

```tsx
import { Footer } from './components/footer';

// In the JSX, after </main>:
<footer className={styles.footer}>
    <Footer />
</footer>
```

The layout should now render: `<div className={styles.background}>` → header → main → footer → `</div>`.

- [ ] **Step 2: Verify visually**

Run `npm run dev`, check frontpage and /runs page have the slim footer. Check both light and dark mode.

- [ ] **Step 3: Commit**

```bash
git add app/(new-layout)/layout.tsx
git commit -m "Add slim footer to new layout"
```

---

### Task 6: Consolidate SCSS Imports

The old layout imports `~src/styles/_import.scss` which includes some files not in the new layout's `_imports.scss` (notably `nprogress`, `deprecated`, `calendar-heatmap`). Ensure the new layout's imports cover everything pages need.

**Files:**
- Modify: `app/(new-layout)/styles/_imports.scss`

- [ ] **Step 1: Compare import files**

Old layout (`src/styles/_import.scss`) includes:
- Bootstrap functions/mixins (separately)
- `nprogress/nprogress.css`
- `globals`, `deprecated`
- Bootstrap framework
- `overrides`
- `calendar-heatmap.min.css`
- `react-toastify`

New layout (`app/(new-layout)/styles/_imports.scss`) includes:
- Bootstrap framework
- `react-toastify`
- `design-tokens`, `mixins`, `globals`, `overrides`

- [ ] **Step 2: Add missing imports to new layout**

In `app/(new-layout)/styles/_imports.scss`, add the missing imports that pages depend on:

```scss
// Bootstrap framework
@import "bootstrap/bootstrap";

@import "node_modules/react-toastify/scss/main.scss";
@import "nprogress/nprogress.css";

@import "design-tokens";
@import "mixins";
@import "globals";
@import "overrides";
```

Note: `deprecated` styles from old layout should be reviewed — if they contain styles still used by migrating pages, include them. If truly deprecated, skip.
Note: `calendar-heatmap.min.css` — check if any migrating pages use calendar heatmaps. If so, add the import.

- [ ] **Step 3: Check for calendar heatmap usage**

```bash
# Search for calendar heatmap usage in components
grep -r "calendar-heatmap\|CalendarHeatmap\|react-calendar-heatmap" src/components/ app/
```

If found, add `@import "calendar-heatmap.min.css";` to the imports.

- [ ] **Step 4: Check deprecated styles**

Read `src/styles/_deprecated.scss` and determine if any styles are still used. If so, either add them to the new layout's globals or create a `_legacy.scss` in the new layout styles.

- [ ] **Step 5: Commit**

```bash
git add app/(new-layout)/styles/_imports.scss
git commit -m "Consolidate SCSS imports for layout migration"
```

---

### Task 7: Move Old-Layout Pages to New-Layout

Move all page directories from `(old-layout)` to `(new-layout)`. This is a file move — no styling changes yet.

**Files:**
- Move: All page directories from `app/(old-layout)/` to `app/(new-layout)/`
- Keep: `app/(old-layout)/layout.tsx` (remove later)

- [ ] **Step 1: List all page directories to move**

These directories need to move from `app/(old-layout)/` to `app/(new-layout)/`:

```
[username]/
admin/
change-appearance/
data/
events/
games/
how-it-works/
live/
livesplit/
marathon/
moist-setup/
old-frontpage/
patron/
patreon/
races/
recap/
stories/
tournaments/
upload/
upload-key/
```

- [ ] **Step 2: Move page directories**

```bash
# Move each directory
for dir in "[username]" admin change-appearance data events games how-it-works live livesplit marathon moist-setup patron patreon races recap stories tournaments upload upload-key; do
    mv "app/(old-layout)/$dir" "app/(new-layout)/$dir"
done
```

Note: Do NOT move `old-frontpage/` — it will be deleted in a later task.

- [ ] **Step 3: Move remaining old-layout components**

Check for any components in `app/(old-layout)/` that are imported by moved pages (e.g., `content.tsx`, `header.tsx`, `patreon/` directory). Move or update imports as needed.

```bash
# Check what remains in old-layout
ls app/(old-layout)/
```

The `content.tsx` in old-layout may be imported by some pages. Check and redirect imports to the new-layout's `content.tsx` or merge functionality.

- [ ] **Step 4: Verify**

```bash
npm run typecheck
```

Fix any broken imports. Common issues:
- Relative imports to sibling files within `(old-layout)` that didn't move
- Imports of `./content`, `./header`, `./footer` from old layout

- [ ] **Step 5: Commit**

```bash
git add -A app/(new-layout)/ app/(old-layout)/
git commit -m "Move old-layout pages to new-layout"
```

---

### Task 8: Move Footer-Group Pages to New-Layout

Move all page directories from `(footer)` to `(new-layout)`.

**Files:**
- Move: All page directories from `app/(footer)/` to `app/(new-layout)/`

- [ ] **Step 1: Move page directories**

```bash
for dir in about blog contact discord faq media privacy-policy roadmap terms; do
    mv "app/(footer)/$dir" "app/(new-layout)/$dir"
done
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add -A app/(new-layout)/ app/(footer)/
git commit -m "Move footer-group pages to new-layout"
```

---

### Task 9: Remove Old Layout Groups and Legacy Pages

**Files:**
- Delete: `app/(old-layout)/` (entire directory — should only contain layout files now)
- Delete: `app/(footer)/` (entire directory)
- Delete: `app/(new-layout)/old-frontpage/` (legacy page)

- [ ] **Step 1: Verify old-layout is empty of pages**

```bash
# Should only show layout files, no page directories
ls app/(old-layout)/
```

- [ ] **Step 2: Delete old layout group**

```bash
rm -rf app/(old-layout)/
```

- [ ] **Step 3: Delete footer layout group**

```bash
rm -rf app/(footer)/
```

- [ ] **Step 4: Delete old-frontpage**

```bash
rm -rf app/(new-layout)/old-frontpage/
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Remove old layout groups and legacy frontpage"
```

---

## Chunk 2: Shared CSS Modules

### Task 10: Create Shared Data Table CSS Module

Create a reusable table style module based on the existing `runs-table.module.scss` pattern.

**Files:**
- Create: `app/(new-layout)/styles/shared/data-table.module.scss`

- [ ] **Step 1: Read the runs-table module for reference**

Read `app/(new-layout)/runs/runs-table.module.scss` to understand the existing table styling pattern.

- [ ] **Step 2: Create shared data table styles**

Create `app/(new-layout)/styles/shared/data-table.module.scss`:

```scss
@use '../design-tokens' as *;

.table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: $font-size-sm;
}

.header {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--bs-secondary-bg);

    th {
        padding: $spacing-sm $spacing-md;
        font-size: $font-size-xs;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--bs-secondary-color);
        border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.15);
        white-space: nowrap;
    }
}

.body {
    tr {
        transition: background-color $transition-fast;

        &:nth-child(even) {
            background: rgba(var(--bs-secondary-bg-rgb), 0.18);
        }

        &:hover {
            background: rgba(var(--bs-primary-rgb), 0.06);
        }
    }

    td {
        padding: $spacing-xs $spacing-md;
        border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.3);
        vertical-align: middle;
    }
}

.numericCell {
    font-variant-numeric: tabular-nums;
    font-family: $font-mono;
    letter-spacing: -0.02em;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(new-layout)/styles/shared/data-table.module.scss
git commit -m "Add shared data table CSS module"
```

---

### Task 11: Create Shared Stat Card CSS Module

**Files:**
- Create: `app/(new-layout)/styles/shared/stat-card.module.scss`

- [ ] **Step 1: Create shared stat card styles**

Create `app/(new-layout)/styles/shared/stat-card.module.scss`:

```scss
@use '../design-tokens' as *;
@use '../mixins' as *;

.card {
    background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--bs-body-bg) 92%, var(--bs-primary) 8%) 0%,
        color-mix(in srgb, var(--bs-body-bg) 96%, var(--bs-primary) 4%) 100%
    );
    border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
    border-radius: $radius-lg;
    padding: $spacing-lg;
    box-shadow: $shadow-sm;
    transition: all $transition-base;

    &:hover {
        box-shadow: $shadow-md;
        border-color: rgba(var(--bs-primary-rgb), 0.25);
    }
}

.label {
    font-size: $font-size-xs;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--bs-secondary-color);
    margin-bottom: $spacing-xs;
}

.value {
    @include monospace-value;
    font-size: $font-size-lg;
    font-weight: 700;
    color: var(--bs-body-color);
}

.subtitle {
    font-size: $font-size-xs;
    color: var(--bs-secondary-color);
    margin-top: $spacing-xs;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(new-layout)/styles/shared/stat-card.module.scss
git commit -m "Add shared stat card CSS module"
```

---

### Task 12: Create Shared Form Elements CSS Module

**Files:**
- Create: `app/(new-layout)/styles/shared/form-elements.module.scss`

- [ ] **Step 1: Create shared form styles**

Create `app/(new-layout)/styles/shared/form-elements.module.scss`:

```scss
@use '../design-tokens' as *;

.input,
.select,
.textarea {
    background: color-mix(in srgb, var(--bs-body-bg) 95%, var(--bs-primary) 5%);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
    border-radius: $radius-md;
    padding: $spacing-sm $spacing-md;
    font-size: $font-size-base;
    color: var(--bs-body-color);
    transition: border-color $transition-fast, box-shadow $transition-fast;

    &:focus {
        border-color: var(--bs-primary);
        box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.15);
        outline: none;
    }

    &::placeholder {
        color: var(--bs-secondary-color);
        opacity: 0.6;
    }
}

.textarea {
    resize: vertical;
    min-height: 100px;
}

.label {
    display: block;
    font-size: $font-size-sm;
    font-weight: 600;
    color: var(--bs-body-color);
    margin-bottom: $spacing-xs;
}

.fieldGroup {
    margin-bottom: $spacing-lg;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(new-layout)/styles/shared/form-elements.module.scss
git commit -m "Add shared form elements CSS module"
```

---

### Task 13: Create Shared Page Header CSS Module

**Files:**
- Create: `app/(new-layout)/styles/shared/page-header.module.scss`

- [ ] **Step 1: Create shared page header styles**

Create `app/(new-layout)/styles/shared/page-header.module.scss`:

```scss
@use '../design-tokens' as *;

.header {
    margin-bottom: $spacing-xl;
}

.title {
    font-size: $font-size-2xl;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--bs-body-color);
    margin: 0;
}

.subtitle {
    font-size: $font-size-sm;
    color: var(--bs-secondary-color);
    margin-top: $spacing-xs;
}

.headerWithAction {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    flex-wrap: wrap;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(new-layout)/styles/shared/page-header.module.scss
git commit -m "Add shared page header CSS module"
```

---

### Task 14: Create Shared Filter Bar CSS Module

**Files:**
- Create: `app/(new-layout)/styles/shared/filter-bar.module.scss`

- [ ] **Step 1: Create shared filter bar styles**

Create `app/(new-layout)/styles/shared/filter-bar.module.scss`:

```scss
@use '../design-tokens' as *;

.filterBar {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    flex-wrap: wrap;
    margin-bottom: $spacing-lg;
}

.searchInput {
    background: color-mix(in srgb, var(--bs-body-bg) 95%, var(--bs-primary) 5%);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
    border-radius: $radius-md;
    padding: $spacing-sm $spacing-md;
    font-size: $font-size-sm;
    color: var(--bs-body-color);
    transition: border-color $transition-fast, box-shadow $transition-fast;
    min-width: 200px;

    &:focus {
        border-color: var(--bs-primary);
        box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.15);
        outline: none;
    }
}

.filterChip {
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-xs;
    border-radius: $radius-sm;
    background: color-mix(in srgb, var(--bs-primary) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--bs-primary) 20%, transparent);
    color: var(--bs-body-color);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
        background: color-mix(in srgb, var(--bs-primary) 18%, transparent);
    }

    &.active {
        background: color-mix(in srgb, var(--bs-primary) 20%, transparent);
        border-color: color-mix(in srgb, var(--bs-primary) 35%, transparent);
        font-weight: 600;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(new-layout)/styles/shared/filter-bar.module.scss
git commit -m "Add shared filter bar CSS module"
```

---

## Chunk 3: Component Restyling — User Pages

Components for user pages live in `src/components/user/`, `src/components/run/`, and `src/components/css/`. The page files themselves (`app/(new-layout)/[username]/page.tsx` etc.) are thin wrappers — the styling work is in the components they render.

### Task 15: Restyle User Profile Component

The `UserProfile` component is the main component for `/[username]`. It uses Bootstrap Card, Tabs, Row, Col and the `User.module.scss` CSS module.

**Files:**
- Modify: `src/components/css/User.module.scss`
- Modify: User profile component files in `src/components/user/`
- Reference: `app/(new-layout)/styles/_design-tokens.scss` for token values

- [ ] **Step 1: Read existing component and styles**

Read the UserProfile component and `src/components/css/User.module.scss` to understand current structure.

- [ ] **Step 2: Update User.module.scss with design tokens**

Restyle to use design tokens: `color-mix()` backgrounds, shadow scale, border radius scale, font sizes, spacing scale. Replace any hardcoded colors/sizes with token values. Import design tokens at top:

```scss
@use '../../app/(new-layout)/styles/design-tokens' as *;
```

Apply the stat-card pattern for user stat displays. Apply the data-table pattern for any tabular data.

- [ ] **Step 3: Update UserProfile JSX**

Replace Bootstrap Card classes with CSS Module classes where applicable. Keep Bootstrap grid (Row, Col). Replace Bootstrap utility classes for spacing/colors with CSS Module classes using design tokens.

- [ ] **Step 4: Visual verification**

Run `npm run dev`, visit a user profile page. Verify light and dark mode. Check stat cards, run tables, tabs, and profile header all match new design language.

- [ ] **Step 5: Commit**

```bash
git add src/components/css/User.module.scss src/components/user/
git commit -m "Restyle user profile with design tokens"
```

---

### Task 16: Restyle Run Detail / Split Components

Components for `/[username]/[game]` and `/[username]/[game]/[run]`. These show split tables, run history, comparison charts.

**Files:**
- Modify: `src/components/css/SplitStats.module.scss`
- Modify: `src/components/css/Runs.module.scss`
- Modify: `src/components/css/Session.module.scss`
- Modify: `src/components/run/` components as needed

- [ ] **Step 1: Read existing split/run components and styles**

Read the SplitStats, Runs, and Session CSS modules. Read key components in `src/components/run/`.

- [ ] **Step 2: Update CSS modules with design tokens**

For each CSS module, add the design token import and replace:
- Hardcoded colors → `color-mix()` patterns and CSS variables
- Hardcoded spacing → spacing scale tokens
- Hardcoded font sizes → font size scale tokens
- Hardcoded shadows → shadow scale tokens
- Hardcoded border radius → radius scale tokens
- Table styling → shared data-table pattern

- [ ] **Step 3: Update component JSX where needed**

Replace Bootstrap Card/Table classes with CSS Module + shared module classes. Keep Bootstrap grid.

- [ ] **Step 4: Visual verification**

Check `/[username]/[game]` and `/[username]/[game]/[run]` pages. Verify split tables, run history, graphs in both themes.

- [ ] **Step 5: Commit**

```bash
git add src/components/css/ src/components/run/
git commit -m "Restyle run detail and split components with design tokens"
```

---

### Task 17: Restyle User Races and Wrapped Pages

**Files:**
- Modify: Components rendered by `/[username]/races`, `/[username]/recap`, `/[username]/wrapped`

- [ ] **Step 1: Read the components rendered by these pages**

- [ ] **Step 2: Apply design token styling**

Same pattern as Tasks 15-16: import tokens, replace hardcoded values, use shared modules where applicable.

- [ ] **Step 3: Visual verification and commit**

```bash
git commit -m "Restyle user races, recap, and wrapped pages"
```

---

## Chunk 4: Component Restyling — Game Pages

### Task 18: Restyle Games List and Game Detail

**Files:**
- Modify: `src/components/css/Games.module.scss`
- Modify: `src/components/css/GamesTable.module.scss`
- Modify: `src/components/game/` components

- [ ] **Step 1: Read existing game components and styles**

Read Games.module.scss, GamesTable.module.scss, and key components in `src/components/game/`.

- [ ] **Step 2: Update Games.module.scss**

Import design tokens. Restyle game cards:
- Card backgrounds with `color-mix()`
- Shadow scale for depth
- Border radius from scale
- Font sizes from scale
- Spacing from scale

- [ ] **Step 3: Update GamesTable.module.scss**

Apply shared data-table pattern for leaderboard tables. Use `tabular-nums` for time values.

- [ ] **Step 4: Update game component JSX**

Replace Bootstrap Card classes with CSS Module styles. Keep grid layout.

- [ ] **Step 5: Visual verification**

Check `/games` and `/games/[game]` in both themes.

- [ ] **Step 6: Commit**

```bash
git add src/components/css/Games.module.scss src/components/css/GamesTable.module.scss src/components/game/
git commit -m "Restyle game pages with design tokens"
```

---

## Chunk 5: Component Restyling — Race Pages

### Task 19: Restyle Race Components

Race pages (`/races`, `/races/[race]`, etc.) use components in `src/components/` with Bootstrap heavily.

**Files:**
- Modify: Race-related components (find by reading race page files)
- Modify: Any associated CSS modules

- [ ] **Step 1: Read race page files and trace to components**

Read `app/(new-layout)/races/page.tsx` and related race page files. Identify all components they render.

- [ ] **Step 2: Read and restyle race components**

Apply design tokens to:
- Race cards (active/finished races)
- Participant lists
- Race detail panels with real-time data
- Race statistics tables
- Race creation/edit forms (use shared form-elements module)

- [ ] **Step 3: Visual verification**

Check all race pages in both themes.

- [ ] **Step 4: Commit**

```bash
git commit -m "Restyle race pages with design tokens"
```

---

## Chunk 6: Component Restyling — Event & Tournament Pages

### Task 20: Restyle Event Components

**Files:**
- Modify: Event-related components
- Modify: Search/filter UI (use shared filter-bar module)

- [ ] **Step 1: Read event page files and components**

- [ ] **Step 2: Restyle event components**

Apply design tokens. Event cards, search UI, event detail panels. Use shared filter-bar module for search/filter.

- [ ] **Step 3: Visual verification and commit**

```bash
git commit -m "Restyle event pages with design tokens"
```

---

### Task 21: Restyle Tournament Components

**Files:**
- Modify: `src/components/tournament/` components

- [ ] **Step 1: Read tournament components**

- [ ] **Step 2: Restyle tournament components**

Apply design tokens to tournament cards, bracket/standings displays.

- [ ] **Step 3: Visual verification and commit**

```bash
git commit -m "Restyle tournament pages with design tokens"
```

---

## Chunk 7: Component Restyling — Live & Utility Pages

### Task 22: Restyle Live Run Components

**Files:**
- Modify: `src/components/css/LiveRun.module.scss`
- Modify: `src/components/live/` components

- [ ] **Step 1: Read and restyle live components**

Apply design tokens. Live run cards should feel similar to the frontpage hero panels but simpler.

- [ ] **Step 2: Visual verification and commit**

```bash
git commit -m "Restyle live pages with design tokens"
```

---

### Task 23: Restyle Utility Pages

Pages: `/livesplit`, `/upload`, `/upload-key`, `/change-appearance`, `/how-it-works`, `/moist-setup`, `/marathon`

These are simpler pages — forms, instruction text, setup guides.

**Files:**
- Modify: Page files and their components

- [ ] **Step 1: Read each utility page**

- [ ] **Step 2: Restyle each page**

For pages using Bootstrap utility classes directly in JSX (like livesplit):
- Replace `bg-body-secondary` with CSS Module card styles
- Replace `fs-large` etc. with design token font sizes
- Replace spacing utilities with design token spacing
- Use shared form-elements module for any forms

For pages delegating to components:
- Restyle the components with design tokens

- [ ] **Step 3: Visual verification and commit**

```bash
git commit -m "Restyle utility pages with design tokens"
```

---

## Chunk 8: Component Restyling — Admin & Static Pages

### Task 24: Restyle Admin Pages

Pages: `/admin/roles`, `/admin/move-user`, `/admin/exclusions`, `/data`

**Files:**
- Modify: Admin components (UsersTable, etc.)

- [ ] **Step 1: Read admin components**

- [ ] **Step 2: Restyle admin components**

Apply shared data-table module for tables. Apply shared form-elements for forms. Use stat-card for any data displays.

- [ ] **Step 3: Visual verification and commit**

```bash
git commit -m "Restyle admin pages with design tokens"
```

---

### Task 25: Restyle Static Content Pages

Pages: `/about`, `/blog`, `/blog/[post]`, `/faq`, `/contact`, `/privacy-policy`, `/terms`, `/roadmap`, `/media`, `/discord`, `/patreon`, `/patron`

These are mostly text content. They need consistent typography and container styling.

**Files:**
- Create: `app/(new-layout)/styles/shared/content-page.module.scss`
- Modify: Static page components

- [ ] **Step 1: Create content page styles**

Create `app/(new-layout)/styles/shared/content-page.module.scss`:

```scss
@use '../design-tokens' as *;

.content {
    max-width: 800px;
    margin: 0 auto;
    padding: $spacing-xl $spacing-lg;

    h1 {
        font-size: $font-size-2xl;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-bottom: $spacing-xl;
    }

    h2 {
        font-size: $font-size-xl;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin-top: $spacing-2xl;
        margin-bottom: $spacing-md;
    }

    h3 {
        font-size: $font-size-md;
        font-weight: 600;
        margin-top: $spacing-xl;
        margin-bottom: $spacing-sm;
    }

    p, li {
        font-size: $font-size-base;
        line-height: 1.7;
        color: var(--bs-body-color);
    }

    a {
        color: var(--bs-primary);
        transition: color $transition-fast;

        &:hover {
            color: color-mix(in srgb, var(--bs-primary) 80%, white 20%);
        }
    }

    ul, ol {
        padding-left: $spacing-xl;
        margin-bottom: $spacing-lg;
    }

    li {
        margin-bottom: $spacing-xs;
    }
}
```

- [ ] **Step 2: Apply content-page styles to static pages**

Wrap static page content in a div with `className={styles.content}`. For pages using the `<Title>` component, the h1 styling from the content module will apply.

- [ ] **Step 3: Restyle FAQ accordion**

The FAQ page uses React Bootstrap Accordion. Apply design token colors to accordion headers and bodies via CSS Module overrides.

- [ ] **Step 4: Restyle blog components**

Blog cards and post layout. Apply card styles, typography tokens.

- [ ] **Step 5: Visual verification and commit**

```bash
git commit -m "Restyle static content pages with design tokens"
```

---

## Chunk 9: Cleanup and Polish

### Task 26: Remove Unused Old Styles

**Files:**
- Potentially delete: `src/styles/_deprecated.scss`
- Potentially delete: `src/styles/` files no longer imported
- Modify: `src/components/css/` — remove any CSS module files that have been fully replaced

- [ ] **Step 1: Check what remains in src/styles/**

Review which files in `src/styles/` are still imported by anything. Remove unused files.

- [ ] **Step 2: Clean up src/components/css/**

If any CSS module files were fully replaced by shared modules, remove the old files and update imports.

- [ ] **Step 3: Commit**

```bash
git commit -m "Remove unused old styles"
```

---

### Task 27: Final Verification

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Run build**

```bash
rm -rf .next
npm run build
```

- [ ] **Step 4: Full visual review**

Run `npm run dev` and check every page category:
- Frontpage, /runs (should be unchanged)
- User profile, game detail, run detail
- Games list, races, events, tournaments
- Live pages
- Admin pages
- Static content pages (about, blog, faq, etc.)
- Utility pages (livesplit, upload, etc.)

Check each in both light and dark mode.

- [ ] **Step 5: Commit any fixes**

```bash
git commit -m "Fix visual issues from final review"
```
