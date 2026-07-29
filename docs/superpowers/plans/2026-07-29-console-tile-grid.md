# Console Tile Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bare `/games-v2/[game]/manage` render a task-framed tile grid of everything a moderator can do, instead of silently resolving to a default pane.

**Architecture:** `activeItem === null` becomes a real state that `ContentRouter` renders as `<TileGrid>`, replacing a dead-end "Select an item from the sidebar" placeholder. The grid is driven by the same `buildNav(flags)` output the sidebar uses, so permission filtering, icons and the attention badge are shared rather than reimplemented. `resolveInitialPane()` stops falling back to a default pane, and the per-game lastPane *read* is deleted while its *write* is kept for a deferred skip setting.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SCSS modules, vitest, react-bootstrap-icons.

**Spec:** `docs/superpowers/specs/2026-07-29-console-tile-grid-design.md`

**Branch:** `console-tile-grid` (already created, sits directly on `main` at `6c28c052`).

## Global Constraints

- Formatting is Biome: 4-space indent, single quotes, trailing commas, semicolons. The husky pre-commit hook runs `npx @biomejs/biome check --write` on staged files.
- Unused variables must be prefixed with `_`.
- Run tests with `npx vitest run <path>`. **Do not run `npm run typecheck` as a pass/fail gate** — `main` carries ~356 pre-existing errors. If you typecheck, compare against that baseline rather than expecting exit 0.
- Icons come from `react-bootstrap-icons`. No emoji anywhere in the UI.
- SCSS design tokens are imported as `dt` (`@use '../../../../styles/design-tokens' as dt;`). Available: `$spacing-xs` `.25rem`, `$spacing-sm` `.5rem`, `$spacing-md` `.75rem`, `$spacing-lg` `1rem`, `$spacing-xl` `1.25rem`, `$radius-lg` `.75rem`, `$font-size-sm` `.875rem`, `$font-size-2xs`.
- Tile copy is fixed by the spec — use the exact strings in Task 2, do not paraphrase.
- Do **not** commit `app/(new-layout)/games-v2/[game]/manage/moderation/configure/history-drawer.tsx`. It has unrelated uncommitted changes belonging to the user. Stage files explicitly by path; never `git add -A` or `git commit -a`.
- Never push to `main` in this repo, and do not open PRs. Commit to `console-tile-grid` only.

**Path note:** every path below is relative to `/home/joey/therun/therun-fr`. The console directory `app/(new-layout)/games-v2/[game]/manage/console/` contains literal parentheses and square brackets — quote paths in shell commands.

---

## File Structure

| File | Responsibility |
|---|---|
| `console/nav-icons.ts` | **new** — the one `NavItemId → Icon` map, shared by sidebar and grid |
| `console/attention-badge-content.ts` | **new** — pure badge text/label logic, unit-tested |
| `console/attention-badge-content.test.ts` | **new** — its tests |
| `console/attention-badge.tsx` | **new** — thin component rendering the above |
| `console/tile-grid.tsx` | **new** — the grid itself |
| `console/console-sidebar.tsx` | drops its local icon map and inline badge markup |
| `console/console.module.scss` | adds the tile block |
| `console/content-router.tsx` | `case null` → `<TileGrid>`; gains `onNavigate`, `attentionCount` |
| `console/nav-model.ts` | `defaultItem` deleted; `resolveInitialPane` and `showSetupCard` simplified |
| `console/nav-model.test.ts` | tests updated to match |
| `console/console-shell.tsx` | lastPane read deleted, write kept; passes new router props |
| `console/console-chrome.tsx` | header title links home to the grid |
| `src/lib/console/vocabulary.ts` | adds `CONCEPT_TILE` |
| `src/lib/console/__tests__/vocabulary.test.ts` | covers `CONCEPT_TILE` |
| `manage/moderation/page.tsx` | redirects to bare `/manage` |

**Task order matters.** Tasks 1–3 are additive and leave the console behaving exactly as it does today. Task 4 flips the landing behavior and Task 5 wires it up. Following this order means there is never a commit where bare `/manage` renders the old dead-end placeholder.

---

### Task 1: Extract the shared icon map and attention badge

Pure refactor. The sidebar must look and behave identically afterwards; the point is that the grid in Task 3 can reuse both pieces instead of copying them.

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/console/nav-icons.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/console/attention-badge-content.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/console/attention-badge-content.test.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/console/attention-badge.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console-sidebar.tsx`

**Interfaces:**
- Consumes: `NavItemId` from `./nav-model`.
- Produces: `NAV_ICON: Record<NavItemId, IconType>`; `attentionBadgeContent(count: number, degraded: boolean): AttentionBadgeContent | null` where `AttentionBadgeContent = { text: string; label: string; title?: string }`; `<AttentionBadge count={number} degraded={boolean} className={string | undefined} />`.

- [ ] **Step 1: Write the failing test for the badge logic**

Create `app/(new-layout)/games-v2/[game]/manage/console/attention-badge-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { attentionBadgeContent } from './attention-badge-content';

describe('attentionBadgeContent', () => {
    it('renders nothing for a confirmed zero', () => {
        expect(attentionBadgeContent(0, false)).toBeNull();
    });

    it('renders the plain count when all sources loaded', () => {
        const badge = attentionBadgeContent(7, false);
        expect(badge?.text).toBe('7');
        expect(badge?.label).toBe('7 items need attention');
        expect(badge?.title).toBeUndefined();
    });

    it('caps the displayed count at 99+', () => {
        expect(attentionBadgeContent(100, false)?.text).toBe('99+');
    });

    it('marks a degraded count as a floor with a trailing +', () => {
        const badge = attentionBadgeContent(7, true);
        expect(badge?.text).toBe('7+');
        expect(badge?.label).toContain('actual count may be higher');
        expect(badge?.title).toBe(
            'Some sources failed to load — counts may be incomplete',
        );
    });

    it('shows a bare ! when everything failed and the count is zero', () => {
        const badge = attentionBadgeContent(0, true);
        expect(badge?.text).toBe('!');
        expect(badge?.label).toBe(
            'Some sources failed to load — counts may be incomplete',
        );
    });

    it('does not double up the + when a degraded count is also over the cap', () => {
        expect(attentionBadgeContent(100, true)?.text).toBe('99+');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/attention-badge-content.test.ts"`
Expected: FAIL — cannot resolve `./attention-badge-content`.

- [ ] **Step 3: Write the badge logic**

Create `app/(new-layout)/games-v2/[game]/manage/console/attention-badge-content.ts`:

```ts
// Badge content for the attention count, shared by the sidebar nav item and
// the tile grid so the degraded-source wording and the 99+ ceiling cannot
// drift between the two surfaces.

export interface AttentionBadgeContent {
    /** What the badge shows — '7', '7+', '99+' or '!'. */
    text: string;
    /** Screen-reader description of the same. */
    label: string;
    /** Hover hint, present only when sources are degraded. */
    title?: string;
}

const DEGRADED_TITLE =
    'Some sources failed to load — counts may be incomplete';

/**
 * Returns null when there is nothing worth showing — a confirmed zero. A zero
 * that might be an undercount still renders, as a bare '!'.
 */
export function attentionBadgeContent(
    count: number,
    degraded: boolean,
): AttentionBadgeContent | null {
    if (count === 0 && !degraded) return null;

    // The 99+ cap wins over the degraded '+' — '99++' would be nonsense, and
    // '99+' already reads as "at least this many".
    const text =
        degraded && count === 0
            ? '!'
            : count > 99
              ? '99+'
              : `${count}${degraded ? '+' : ''}`;

    const label = degraded
        ? count > 0
            ? `${count} items need attention — some sources didn't load, actual count may be higher`
            : DEGRADED_TITLE
        : `${count} items need attention`;

    return { text, label, title: degraded ? DEGRADED_TITLE : undefined };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/attention-badge-content.test.ts"`
Expected: PASS, 6 tests.

- [ ] **Step 5: Create the icon map**

Create `app/(new-layout)/games-v2/[game]/manage/console/nav-icons.ts`:

```ts
// One consistent icon set (react-bootstrap-icons) — no emoji. Lives apart
// from the sidebar so the tile grid shows the same glyph per section without
// a second copy of the map.
import {
    ArrowLeftRight,
    ClockHistory,
    Collection,
    Controller,
    ExclamationTriangle,
    Flag,
    type Icon as IconType,
    ListCheck,
    ListOl,
    ListUl,
    PersonX,
    ShieldLock,
} from 'react-bootstrap-icons';
import type { NavItemId } from './nav-model';

export const NAV_ICON: Record<NavItemId, IconType> = {
    attention: ExclamationTriangle,
    roster: ListOl,
    reports: Flag,
    bans: PersonX,
    history: ClockHistory,
    setup: ListCheck,
    'game-details': Controller,
    categories: ListUl,
    groups: Collection,
    moderators: ShieldLock,
    reassign: ArrowLeftRight,
};
```

- [ ] **Step 6: Create the badge component**

Create `app/(new-layout)/games-v2/[game]/manage/console/attention-badge.tsx`:

```tsx
'use client';

import { attentionBadgeContent } from './attention-badge-content';
import styles from './console.module.scss';

interface Props {
    count: number;
    /** True when one or more attention sources failed to load — the count
     * shown may be an undercount, not a confirmed total. */
    degraded?: boolean;
    /** Defaults to the sidebar's pill; the tile grid passes its own. */
    className?: string;
}

export function AttentionBadge({ count, degraded = false, className }: Props) {
    const badge = attentionBadgeContent(count, degraded);
    if (!badge) return null;

    return (
        <span
            className={className ?? styles.count}
            aria-label={badge.label}
            title={badge.title}
        >
            {badge.text}
        </span>
    );
}
```

- [ ] **Step 7: Rewire the sidebar to use both**

In `app/(new-layout)/games-v2/[game]/manage/console/console-sidebar.tsx`:

Replace the whole `react-bootstrap-icons` import block and the local `NAV_ICON` definition (lines 4–44) with:

```tsx
import { AttentionBadge } from './attention-badge';
import styles from './console.module.scss';
import { NAV_ICON } from './nav-icons';
import type { NavGroup, NavItemId } from './nav-model';
```

(Keep the existing `clsx` import above it.)

Then replace the inline badge block — the whole `{item.id === 'attention' && (attentionCount > 0 || badgeDegraded) && (...)}` expression — with:

```tsx
{item.id === 'attention' && (
    <AttentionBadge
        count={attentionCount}
        degraded={badgeDegraded}
    />
)}
```

The `(attentionCount > 0 || badgeDegraded)` guard moves inside `attentionBadgeContent`, which returns null in exactly the same case.

- [ ] **Step 8: Verify the existing suite still passes**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/"`
Expected: PASS — `nav-model.test.ts` and `attention-badge-content.test.ts`, no failures.

- [ ] **Step 9: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/nav-icons.ts" \
        "app/(new-layout)/games-v2/[game]/manage/console/attention-badge-content.ts" \
        "app/(new-layout)/games-v2/[game]/manage/console/attention-badge-content.test.ts" \
        "app/(new-layout)/games-v2/[game]/manage/console/attention-badge.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/console/console-sidebar.tsx"
git commit -m "refactor(console): share the nav icon map and attention badge

Both are about to have a second consumer in the tile grid. Extracting
them now keeps the degraded-source wording and the 99+ ceiling in one
place instead of two."
```

---

### Task 2: Add the tile copy to the shared vocabulary

The verb-led titles and blurbs live next to `CONCEPT_LABEL`, which exists precisely to stop the wizard and console vocabularies from drifting apart.

**Files:**
- Modify: `src/lib/console/vocabulary.ts`
- Test: `src/lib/console/__tests__/vocabulary.test.ts`

**Interfaces:**
- Produces: `TileConceptId` (the ten tiled sections), `ConceptTile = { action: string; blurb: string }`, and `CONCEPT_TILE: Record<TileConceptId, ConceptTile>`.

**Why `reports` is absent:** it is not a real pane — `handleNavigate('reports')` lands on the attention pane pre-filtered by `?kind=report`. A tile for it would be a second door to the same room. Task 3 relies on `reports` having no entry in this map.

**Why a locally-declared id union:** `nav-model.ts` imports *from* this file. Importing `NavItemId` back would be circular, so the union is spelled out here and Task 2's test pins the two lists together.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/console/__tests__/vocabulary.test.ts` — extend the existing import from `'../vocabulary'` to also pull in `CONCEPT_TILE` and `TILE_CONCEPT_IDS`, then append this block at the end of the file:

```ts
describe('CONCEPT_TILE', () => {
    it('gives every tiled concept a verb-led action and a blurb', () => {
        for (const id of TILE_CONCEPT_IDS) {
            expect(CONCEPT_TILE[id]?.action, id).toBeTruthy();
            expect(CONCEPT_TILE[id]?.blurb, id).toBeTruthy();
        }
    });

    it('has no tile for reports — it is the attention pane pre-filtered', () => {
        expect(Object.keys(CONCEPT_TILE)).not.toContain('reports');
    });

    it('only tiles concepts that also have a sidebar label', () => {
        for (const id of TILE_CONCEPT_IDS) {
            expect(CONCEPT_LABEL[id], id).toBeTruthy();
        }
    });

    it('phrases every action as something you do, not a section name', () => {
        for (const id of TILE_CONCEPT_IDS) {
            // A tile action that merely repeats the sidebar noun means the
            // grid has stopped answering "what can I do here".
            expect(CONCEPT_TILE[id].action, id).not.toBe(CONCEPT_LABEL[id]);
        }
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/console/__tests__/vocabulary.test.ts`
Expected: FAIL — `CONCEPT_TILE` and `TILE_CONCEPT_IDS` are not exported.

- [ ] **Step 3: Add the vocabulary entries**

Append to `src/lib/console/vocabulary.ts`, after the `conceptLabel` function:

```ts
/**
 * The console sections that get a tile on the `/manage` front door.
 *
 * `reports` is deliberately absent: it is the attention pane pre-filtered by
 * `?kind=report`, so a tile for it would be a second door to the same room.
 * The attention tile's blurb covers reports instead.
 *
 * Spelled out rather than derived from `NavItemId` because nav-model.ts
 * imports from this file — the reverse import would be circular. The
 * vocabulary test pins the two lists together.
 */
export const TILE_CONCEPT_IDS = [
    'attention',
    'roster',
    'bans',
    'history',
    'setup',
    'game-details',
    'categories',
    'groups',
    'moderators',
    'reassign',
] as const;

export type TileConceptId = (typeof TILE_CONCEPT_IDS)[number];

export interface ConceptTile {
    /** Verb-led title — what you came to do, not what the section is called. */
    action: string;
    /** One sentence naming the concrete things behind the tile. */
    blurb: string;
}

/**
 * Tile copy for the console front door. The sidebar keeps the terse nouns in
 * CONCEPT_LABEL; these are the same sections described as jobs, for a
 * moderator who has not learned the console yet.
 */
export const CONCEPT_TILE: Record<TileConceptId, ConceptTile> = {
    attention: {
        action: "Review what's waiting",
        blurb: 'Runs flagged for review, reports from runners, and people asking to moderate this board.',
    },
    roster: {
        action: 'Look up a run or runner',
        blurb: 'Search every submitted run, check a runner’s history, and act on anything you find.',
    },
    bans: {
        action: 'Manage banned runners',
        blurb: "See who's banned from this board and why, and lift a ban.",
    },
    history: {
        action: 'See what mods have done',
        blurb: 'Every moderation action on this board — who did it, when, and undo.',
    },
    setup: {
        action: 'Set the board up step by step',
        blurb: 'The guided walkthrough for configuring this board from scratch.',
    },
    'game-details': {
        action: "Edit the game's details",
        blurb: "Cover art, release info, the board's URL, and how it's matched to IGDB.",
    },
    categories: {
        action: 'Configure categories',
        blurb: 'Add and edit categories, set timing, proof and minimum-time rules, and pick what’s featured.',
    },
    groups: {
        action: 'Sort categories into groups',
        blurb: 'Bundle related categories so the leaderboard reads in a sensible order.',
    },
    moderators: {
        action: 'Manage who moderates',
        blurb: 'Add or remove moderators, and review applications from people who want to help.',
    },
    reassign: {
        action: 'Merge duplicates',
        blurb: 'Fold a duplicate game or category into the right one and move its runs across.',
    },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/console/__tests__/vocabulary.test.ts`
Expected: PASS, including the four new tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/console/vocabulary.ts src/lib/console/__tests__/vocabulary.test.ts
git commit -m "feat(console): add verb-led tile copy to the shared vocabulary

The sidebar keeps its terse nouns; CONCEPT_TILE describes the same
sections as jobs, for the front door. Reports gets no entry — it is the
attention pane pre-filtered, not a section of its own."
```

---

### Task 3: Build the tile grid and route `null` to it

After this task the grid renders, but nothing lands on it from a bare URL yet — `resolveInitialPane` still returns a default pane until Task 4. That is deliberate: it keeps every commit in a working state.

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/console/tile-grid.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx`

**Interfaces:**
- Consumes: `NAV_ICON` (Task 1), `AttentionBadge` (Task 1), `CONCEPT_TILE` / `TileConceptId` (Task 2), `NavGroup` / `NavItemId` from `./nav-model`.
- Produces: `<TileGrid groups={NavGroup[]} onNavigate={(id: NavItemId) => void} attentionCount={number} badgeDegraded={boolean} pendingApplications={number} />`. `ContentRouter` gains required props `onNavigate: (id: NavItemId) => void` and `attentionCount: number`.

- [ ] **Step 1: Create the tile grid component**

Create `app/(new-layout)/games-v2/[game]/manage/console/tile-grid.tsx`:

```tsx
'use client';

import { CONCEPT_TILE, type TileConceptId } from '~src/lib/console/vocabulary';
import { AttentionBadge } from './attention-badge';
import styles from './console.module.scss';
import { NAV_ICON } from './nav-icons';
import type { NavGroup, NavItemId } from './nav-model';

interface Props {
    /** Already permission-filtered by buildNav() — the grid does no gating
     * of its own, so it can never disagree with the sidebar. */
    groups: NavGroup[];
    onNavigate: (id: NavItemId) => void;
    attentionCount: number;
    badgeDegraded?: boolean;
    /** Mod applications awaiting a decision. */
    pendingApplications?: number;
}

/**
 * The console front door: every section this viewer can reach, described as a
 * job rather than named as a noun. The sidebar stays the fast path for people
 * who already know where things are; this is for the moderator who does not.
 *
 * Tiles call the same `onNavigate` the sidebar calls, so History still opens
 * as a drawer and Setup still leaves the console — there are no navigation
 * paths here that the sidebar does not already have.
 */
export function TileGrid({
    groups,
    onNavigate,
    attentionCount,
    badgeDegraded = false,
    pendingApplications = 0,
}: Props) {
    return (
        <div className={styles.tileGroups}>
            {groups.map((group) => {
                // `reports` has no CONCEPT_TILE entry — see the comment there.
                const items = group.items.filter((it) => it.id in CONCEPT_TILE);
                if (items.length === 0) return null;

                return (
                    <section key={group.id}>
                        <div className={styles.groupLabel}>{group.label}</div>
                        <div className={styles.tileGrid}>
                            {items.map((item) => {
                                const Icon = NAV_ICON[item.id];
                                const tile =
                                    CONCEPT_TILE[item.id as TileConceptId];
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={styles.tile}
                                        onClick={() => onNavigate(item.id)}
                                    >
                                        <span className={styles.tileTop}>
                                            <Icon
                                                size={20}
                                                className={styles.tileIcon}
                                                aria-hidden="true"
                                            />
                                            {item.id === 'attention' && (
                                                <AttentionBadge
                                                    count={attentionCount}
                                                    degraded={badgeDegraded}
                                                />
                                            )}
                                            {item.id === 'moderators' &&
                                                pendingApplications > 0 && (
                                                    <span
                                                        className={styles.count}
                                                        aria-label={`${pendingApplications} moderator applications waiting`}
                                                    >
                                                        {pendingApplications}
                                                    </span>
                                                )}
                                        </span>
                                        <span className={styles.tileAction}>
                                            {tile.action}
                                        </span>
                                        <span className={styles.tileBlurb}>
                                            {tile.blurb}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 2: Add the tile styles**

Append to `app/(new-layout)/games-v2/[game]/manage/console/console.module.scss`:

```scss
// ---- Tile grid (the console front door) --------------------
// Deliberately lighter than the overview `plaque` cards: those carry record
// times and podium rows, and a one-sentence tile at that weight would read
// as a row of empty boxes.

.tileGroups {
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-xl;
}

.tileGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: dt.$spacing-md;
    margin-top: dt.$spacing-sm;
}

.tile {
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-xs;
    width: 100%;
    text-align: left;
    padding: dt.$spacing-lg;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    border-radius: dt.$radius-lg;
    background: transparent;
    color: inherit;
    transition:
        border-color 0.15s ease,
        background 0.15s ease;

    &:hover {
        border-color: rgba(var(--bs-primary-rgb), 0.5);
        background: rgba(var(--bs-primary-rgb), 0.04);
    }
}

.tileTop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: dt.$spacing-sm;
    margin-bottom: dt.$spacing-xs;
}

.tileIcon {
    flex-shrink: 0;
    color: var(--bs-primary);
    opacity: 0.85;
}

.tileAction {
    font-weight: 600;
}

.tileBlurb {
    font-size: dt.$font-size-sm;
    line-height: 1.4;
    color: var(--bs-secondary-color);
}
```

- [ ] **Step 3: Route `null` to the grid**

In `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx`:

**Naming trap:** `ContentRouterProps` already has a `groups` prop, of type `ManageGroup[]` — those are *category* groups, an unrelated concept. The nav groups need a distinct name, hence `navGroups` below. Do not reuse `groups`.

Change the existing `./nav-model` type import to also bring in `NavGroup`, and add the component import:

```tsx
import type { NavGroup, NavItemId } from './nav-model';
import { TileGrid } from './tile-grid';
```

Add three props to `ContentRouterProps`:

```tsx
    /** Permission-filtered console nav, for the tile grid. Distinct from
     * `groups`, which is the category-grouping model. */
    navGroups: NavGroup[];
    /** Pane switcher, shared with the sidebar — the tile grid calls it too. */
    onNavigate: (id: NavItemId) => void;
    /** Live attention total for the grid's badge. */
    attentionCount: number;
```

Add `onNavigate` and `attentionCount` to the destructure at the top of `ContentRouter` (`navGroups` is read via `props` below, matching how the other pane props are accessed). Then add this case immediately before `default:`:

```tsx
        case null:
            return (
                <TileGrid
                    groups={props.navGroups}
                    onNavigate={onNavigate}
                    attentionCount={attentionCount}
                    badgeDegraded={degradedSources.length > 0}
                    pendingApplications={modApplications?.length ?? 0}
                />
            );
```

Leave the `default:` branch and its `Placeholder` in place — `Placeholder` is still used by the `game-details` fallback, and `default:` remains the unreachable-by-construction arm.

- [ ] **Step 4: Verify the suite still passes**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/" src/lib/console/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/tile-grid.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/console/console.module.scss" \
        "app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx"
git commit -m "feat(console): add the tile grid and route a null pane to it

Replaces the dead-end 'Select an item from the sidebar' placeholder.
Nothing lands here from a bare URL yet — that flips in the next commit."
```

---

### Task 4: Make a bare URL resolve to the grid

The behavioral core. Tests first.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts`
- Test: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts`

**Interfaces:**
- Produces: `resolveInitialPane(requestedPane: string | null, groups: NavGroup[]): NavItemId | null` — **note the dropped middle parameter**, Task 5 updates the only caller. `defaultItem` is removed from the module's exports entirely.
- Unchanged: `buildNav`, `isLandingPaneId`, `sidebarActiveItem`, `showSetupCard` signature.

- [ ] **Step 1: Update the tests**

In `app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts`:

Remove `defaultItem` from the import list at the top. Delete the entire `describe('defaultItem', ...)` block (lines 79–96).

Replace the entire `describe('resolveInitialPane', ...)` block with:

```ts
describe('resolveInitialPane', () => {
    const groups = buildNav({ ...NO_FLAGS, canModerate: true });

    it('a valid ?pane= deep link wins outright', () => {
        expect(resolveInitialPane('bans', groups)).toBe('bans');
    });

    it('a bare URL lands on the tile grid, not a default pane', () => {
        expect(resolveInitialPane(null, groups)).toBeNull();
    });

    it('an unrecognised ?pane= lands on the tile grid', () => {
        expect(resolveInitialPane('not-a-pane', groups)).toBeNull();
    });

    it('a pane this viewer cannot see lands on the tile grid', () => {
        // 'game-details' needs canConfigure, which this viewer lacks.
        expect(resolveInitialPane('game-details', groups)).toBeNull();
    });

    it('rejects overlay and redirect ids', () => {
        expect(resolveInitialPane('history', groups)).toBeNull();
        expect(resolveInitialPane('roster', groups)).toBeNull();
        expect(resolveInitialPane('reports', groups)).toBeNull();
    });

    it('rejects the setup wizard — a hand-typed ?pane=setup must not select it', () => {
        const configurerGroups = buildNav({ ...NO_FLAGS, canConfigure: true });
        expect(resolveInitialPane('setup', configurerGroups)).toBeNull();
    });

    it('lands a viewer with no visible items on the tile grid', () => {
        expect(resolveInitialPane(null, buildNav(NO_FLAGS))).toBeNull();
    });
});
```

In the `describe('showSetupCard', ...)` block, delete the two tests that assert the default-landing-pane behavior — `"shows on this viewer's default landing pane even outside the game group"` (lines 105–109) and `'hides on a triage pane that is not the landing default'` (lines 116–125). Then replace the remaining `'shows when nothing is active yet'` test with:

```ts
    it('shows on the tile grid — the front door is where a setup nag belongs', () => {
        expect(showSetupCard([], null)).toBe(true);
        expect(
            showSetupCard(buildNav({ ...NO_FLAGS, canModerate: true }), null),
        ).toBe(true);
    });

    it('stays out of every triage pane now that none of them is a default', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        expect(showSetupCard(groups, 'attention')).toBe(false);
        expect(showSetupCard(groups, 'bans')).toBe(false);
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts"`
Expected: FAIL — `resolveInitialPane` still takes three arguments, so the two-argument calls pass `groups` as `storedPane`; `showSetupCard(groups, 'attention')` still returns true.

- [ ] **Step 3: Rework nav-model**

In `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts`:

Delete the entire `defaultItem` function (lines 118–126) and its doc comment.

In the `NON_LANDING_IDS` doc comment just above it, change `Shared by \`defaultItem\` and \`isLandingPaneId\`` to `Used by \`isLandingPaneId\``.

Replace `showSetupCard` with:

```ts
/**
 * The setup-nudge slot (SetupChecklistCard while setup is incomplete,
 * BoardHealthCard once it's done) belongs on the tile grid — the front door,
 * where every viewer arrives — and above Board-group panes, where a board
 * admin is already in a "configure this board" mindset. It has no business
 * sitting above triage panes (Needs attention, Bans...): a moderator mid-queue
 * doesn't need a "finish setup" nag competing for their attention.
 */
export function showSetupCard(
    groups: NavGroup[],
    activeItem: NavItemId | null,
): boolean {
    if (activeItem == null) return true;
    const boardGroup = groups.find((g) => g.id === 'board');
    return boardGroup?.items.some((it) => it.id === activeItem) ?? false;
}
```

Replace `resolveInitialPane` with:

```ts
/**
 * Resolves which pane the console lands on: a valid `?pane=` deep link wins,
 * and anything else lands on the tile grid (`null`) — the console's front
 * door. There is no default pane and no stored-pane restore any more; see
 * docs/superpowers/specs/2026-07-29-console-tile-grid-design.md.
 */
export function resolveInitialPane(
    requestedPane: string | null,
    groups: NavGroup[],
): NavItemId | null {
    const visible = groups.flatMap((g) => g.items).map((it) => it.id);
    return isLandingPaneId(requestedPane, visible) ? requestedPane : null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts" \
        "app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts"
git commit -m "feat(console): resolve a bare /manage URL to the tile grid

Drops defaultItem and the stored-pane fallback: a valid ?pane= deep link
still wins, everything else is now the front door. showSetupCard loses
its default-pane arm, which is meaningless once no viewer has one."
```

---

### Task 5: Wire the shell, the way home, and the legacy redirect

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console-chrome.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/page.tsx`

**Interfaces:**
- Consumes: the two-argument `resolveInitialPane` (Task 4), `ContentRouter`'s new `onNavigate` / `attentionCount` / `navGroups` props (Task 3).

- [ ] **Step 1: Simplify the initial-pane resolution**

In `console-shell.tsx`, update the `initialActive` memo to the two-argument call:

```tsx
    const initialActive = useMemo<NavItemId | null>(
        () => resolveInitialPane(searchParams.get('pane'), groups),
        [searchParams, groups],
    );
```

Replace its preceding comment block with:

```tsx
    // A `?pane=` deep link (used by sub-route pages navigating back) decides
    // the pane. Anything else — a bare /manage — resolves to `null`, the tile
    // grid. `history` is an overlay, `roster` and `setup` leave the console,
    // and `reports` normalizes into the attention pane, so none of the four is
    // ever a landing pane.
```

- [ ] **Step 2: Delete the stored-pane bootstrap, keep the write**

Still in `console-shell.tsx`, replace the whole `appliedStoredPaneRef` effect (the `const appliedStoredPaneRef = useRef(false);` declaration through the end of that `useEffect`) with:

```tsx
    useEffect(() => {
        setActiveItem(initialActive);
    }, [initialActive]);
```

In the legacy-redirect effect above it, delete the retired-pane localStorage purge — the whole `if (typeof window !== 'undefined') { ... }` block containing `isRetiredPaneId`. Remove `isRetiredPaneId` from the `~src/lib/console/legacy-panes` import, keeping `legacyPaneRedirect`.

Replace the comment above the remaining lastPane write effect with:

```tsx
    // Deliberately written but never read. Bare /manage now always lands on
    // the tile grid, so nothing consults this — it is kept for the agreed
    // per-user "skip the grid" setting, which will most likely skip to the
    // viewer's last pane. Keeping the write means that lands as a one-line
    // change rather than a re-derivation of this bookkeeping.
```

- [ ] **Step 3: Pass the new props to ContentRouter**

Still in `console-shell.tsx`, add to the `<ContentRouter ...>` call:

```tsx
                    navGroups={groups}
                    onNavigate={handleNavigate}
                    attentionCount={liveAttentionCount}
```

- [ ] **Step 4: Make the header title the way home**

In `console-chrome.tsx`, replace the title heading:

```tsx
                    <h1 className={styles.title}>
                        <Link
                            href={`/games-v2/${game.name}/manage`}
                            className={styles.titleLink}
                        >
                            {game.display}
                        </Link>
                    </h1>
```

`Link` is already imported in this file. Append to `console.module.scss`:

```scss
// Without this the tile grid is unreachable after the first click — the
// header title is the console's app-logo-goes-home affordance, and the
// moderation sub-route pages share this chrome, so they get it too.
.titleLink {
    color: inherit;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
}
```

- [ ] **Step 5: Point the legacy moderation URL at the grid**

In `app/(new-layout)/games-v2/[game]/manage/moderation/page.tsx`, change the final line from `redirect(\`/games-v2/${slug}/manage?pane=attention\`);` to:

```tsx
    redirect(`/games-v2/${slug}/manage`);
```

Update the comment above the function to end with: `Lands on the console's tile grid rather than a pane — see the tile-grid design doc.` Leave the permission gating exactly as it is: a non-mod must still get `ModDoor`, never the grid.

- [ ] **Step 6: Run the full console suite**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/" src/lib/console/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/console/console-chrome.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/console/console.module.scss" \
        "app/(new-layout)/games-v2/[game]/manage/moderation/page.tsx"
git commit -m "feat(console): land /manage on the tile grid

Drops the stored-pane read and bootstrap; the write stays for the
deferred skip setting. The header title becomes the way back to the
grid — without it the front door is unreachable after the first click."
```

---

## Manual verification

The backend only runs deployed, but this change is frontend-only, so `npm run dev` against the committed `.env` config is enough. **Kill the dev server before finishing** — check with `ps -eo pid,args | grep "next dev" | grep -v grep` first, and kill by exact pid afterwards.

Sign in as a moderator of a game and check:

- [ ] Bare `/games-v2/<game>/manage` shows the tile grid, not a pane.
- [ ] A moderator with no configure rights sees only the four Moderate tiles; the Board group is absent entirely.
- [ ] The Needs attention tile's count matches the sidebar badge, including the degraded `+`/`!` state.
- [ ] The Moderators tile shows a count only when applications are pending.
- [ ] No Reports tile exists, but the sidebar still has its Reports item and it still lands on `?pane=attention&kind=report`.
- [ ] The History tile opens the drawer over the grid and leaves the URL untouched.
- [ ] The Setup tile leaves for `/setup`.
- [ ] Clicking a tile, then browser Back, returns to the grid.
- [ ] The header game title returns to the grid from a pane, and from `/manage/moderation/roster`.
- [ ] `/games-v2/<game>/manage/moderation` redirects to the grid; signed out, it still shows the recruiting door.
- [ ] `?pane=bans` still deep-links straight to Bans, skipping the grid.
- [ ] The setup checklist / board health card appears above the grid on an unfinished board, and does not appear above Needs attention.

## Out of scope

The per-user "skip the grid" setting. Agreed as a follow-up; the lastPane write is preserved for it.
