# Console Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Regroup the /manage console sidebar by frequency of use, add an Overview item, move Setup/History to a utility footer, merge the two Levels items, render items as real links, and add ambient status badges.

**Architecture:** All IA changes live in the pure `nav-model.ts` (tested); the shared `ConsoleSidebar`/`ConsoleChrome` grow three generic optional props (`badges`, `hrefFor`, `footerItems`) so the settings console is untouched; `ConsoleShell` and `SubrouteChrome` wire the manage-specific hrefs and badge data; a new `LevelsSection` tab wrapper merges the two level panes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, vitest + @testing-library/react, SCSS modules, react-bootstrap-icons.

**Spec:** The approved 5-point proposal in conversation (2026-08-29). Summary: (1) Overview item + regroup into Overview / Queue / Structure / Game, restore Needs attention to the nav; (2) Setup + History become a sidebar utility footer, not ordinary nav items; (3) merge Levels + Level categories into one item with tabs; (4) nav items render as real `<Link>`s; (5) ambient badges — attention count (existing), pending mod applications on Moderators, sync-state dot on Import, health dot on Overview.

## Global Constraints

- Branch: `console-sidebar-redesign`, created off `manage-overview` (the BoardOverview front door lives there, unmerged).
- **The working tree has unrelated uncommitted changes** under `app/(new-layout)/games-v2/[game]/` (game-page.tsx, header/*, leaderboard/*, loading.*) and an untracked `header/category-band-header.*`. NEVER stage or commit those. Always `git add` explicit file paths, never `git add -A` or `git add .`.
- NEVER push to main. Do not open PRs.
- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons. Pre-commit hook runs Biome on staged files.
- Typecheck baseline is NOT clean on main (~356 pre-existing errors). Gate on "no NEW errors in touched files", not exit 0.
- Run tests with `npx vitest run <path>`.
- The settings console (`app/(new-layout)/settings/settings-chrome.tsx`) uses `ConsoleChrome` with none of the new props — every new prop must be optional with today's behavior as the default. Exception: `attentionCount`/`badgeDegraded` are replaced by `badges` (settings passes neither).
- Do not rename `CONCEPT_LABEL.import` ("Import from speedrun.com") — it is one of the deliberately-kept functional speedrun.com references.

---

### Task 1: nav-model regroup — Overview, Queue/Structure/Game, footer builder, levels merge (model side)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts`
- Modify: `src/lib/console/vocabulary.ts` (add `overview` concept)
- Modify: `src/components/console-chrome/nav-icons.ts` (add `overview` icon)

**Interfaces:**
- Consumes: `CONCEPT_LABEL` from `~src/lib/console/vocabulary`.
- Produces (later tasks rely on these exact names):
  - `type NavGroupId = 'overview' | 'moderate' | 'structure' | 'game'`
  - `NavItemId` union gains `'overview'` (keeps `'level-categories'` — still a hidden landing id).
  - `buildNav(flags: NavFlags): NavGroup[]` — new grouping (below).
  - `buildFooterNav(flags: NavFlags): NavItem[]` — NEW: `setup` (if `canConfigure`), then `history` (if `canModerate`).
  - `sidebarActiveItem(activeItem: NavItemId | null, kind: string | null): NavItemId | null` — `null` now maps to `'overview'`; `attention`+`kind=report` now returns `'attention'` (the `'reports'` mapping is retired with the item).
  - `showSetupCard(groups, activeItem)` — true on panes in the `structure` or `game` groups.
  - `resolveInitialPane` unchanged signature; `'level-categories'` becomes a hidden landing id for `canConfigure` viewers; `'attention'` is no longer hidden (it is in the nav again) but must still resolve for moderators.

New grouping (permission rule per item unchanged from today unless stated):

```
overview  (label: '')          overview        — visible if any of canModerate/canConfigure/canEditMods/canReassign
moderate  (label: 'Queue')     attention, bans — canModerate
structure (label: 'Structure') boards, categories, groups, levels, variables
game      (label: 'Game')      game-details, moderators, import, reassign
```

`level-categories` leaves the nav (merged into `levels`). `setup` and `history` leave the groups for `buildFooterNav`. `roster`/`reports` stay out. NON_LANDING_IDS gains `'overview'` (a hand-typed `?pane=overview` lands on `null`, which IS the overview).

- [ ] **Step 1: Rewrite `nav-model.test.ts` to describe the new shape**

Replace the `buildNav`, `nav shape`, `levels nav items`, `showSetupCard`, and `sidebarActiveItem` describe blocks; keep `isLandingPaneId`/`resolveInitialPane` blocks with the edits shown. Full new test content for the changed blocks:

```typescript
import { describe, expect, it } from 'vitest';
import {
    buildFooterNav,
    buildNav,
    isLandingPaneId,
    type NavFlags,
    resolveInitialPane,
    showSetupCard,
    sidebarActiveItem,
} from './nav-model';

const NO_FLAGS: NavFlags = {
    canModerate: false,
    canEditStandards: false,
    canConfigure: false,
    canReassign: false,
    canEditMods: false,
};

const ALL: NavFlags = {
    canModerate: true,
    canEditStandards: true,
    canConfigure: true,
    canReassign: true,
    canEditMods: true,
};

const ids = (flags: NavFlags) =>
    buildNav(flags)
        .flatMap((g) => g.items)
        .map((it) => it.id as string);

describe('sidebarActiveItem', () => {
    it('maps the front door (null) to the Overview item', () => {
        expect(sidebarActiveItem(null, null)).toBe('overview');
    });

    it('highlights Needs attention even when filtered to reports', () => {
        // The Reports nav item is retired; kind=report is just a filter now.
        expect(sidebarActiveItem('attention', 'report')).toBe('attention');
    });

    it('leaves other panes untouched regardless of kind', () => {
        expect(sidebarActiveItem('bans', 'report')).toBe('bans');
    });
});

describe('buildNav', () => {
    it('groups by frequency: overview, queue, structure, game', () => {
        expect(buildNav(ALL).map((g) => g.id)).toEqual([
            'overview',
            'moderate',
            'structure',
            'game',
        ]);
    });

    it('puts daily curation first in Structure and admin last in Game', () => {
        const byId = new Map(buildNav(ALL).map((g) => [g.id, g.items]));
        expect(byId.get('structure')?.map((i) => i.id)).toEqual([
            'boards',
            'categories',
            'groups',
            'levels',
            'variables',
        ]);
        expect(byId.get('game')?.map((i) => i.id)).toEqual([
            'game-details',
            'moderators',
            'import',
            'reassign',
        ]);
    });

    it('restores Needs attention to the Queue group for moderators', () => {
        const queue = buildNav({ ...NO_FLAGS, canModerate: true }).find(
            (g) => g.id === 'moderate',
        );
        expect(queue?.items.map((i) => i.id)).toEqual(['attention', 'bans']);
    });

    it('gives Overview to every console viewer and drops it for no-flag viewers', () => {
        expect(ids({ ...NO_FLAGS, canModerate: true })).toContain('overview');
        expect(ids({ ...NO_FLAGS, canConfigure: true })).toContain('overview');
        expect(ids({ ...NO_FLAGS, canEditMods: true })).toContain('overview');
        expect(ids({ ...NO_FLAGS, canReassign: true })).toContain('overview');
        expect(buildNav(NO_FLAGS)).toEqual([]);
    });

    it('leaves setup, history and level-categories out of the groups', () => {
        for (const gone of ['setup', 'history', 'level-categories']) {
            expect(ids(ALL), gone).not.toContain(gone);
        }
    });

    it('keeps the retired per-category and triage ids out', () => {
        for (const retired of [
            'standards',
            'timing',
            'rules',
            'combinations',
            'category-settings',
            'roster',
            'reports',
        ]) {
            expect(ids(ALL), retired).not.toContain(retired);
        }
    });

    it('shows boards, categories and import to moderate-only and configure-only viewers alike', () => {
        for (const item of ['boards', 'categories', 'import']) {
            expect(ids({ ...NO_FLAGS, canModerate: true })).toContain(item);
            expect(ids({ ...NO_FLAGS, canConfigure: true })).toContain(item);
        }
        expect(ids(NO_FLAGS)).not.toContain('boards');
    });

    it('keeps structure editing (groups, levels, variables) to configurers', () => {
        const modOnly = ids({ ...NO_FLAGS, canModerate: true });
        for (const item of ['groups', 'levels', 'variables']) {
            expect(modOnly, item).not.toContain(item);
            expect(ids({ ...NO_FLAGS, canConfigure: true })).toContain(item);
        }
    });

    it('gates moderators and reassign on their own flags', () => {
        expect(ids({ ...NO_FLAGS, canEditMods: true })).toContain('moderators');
        expect(ids({ ...NO_FLAGS, canReassign: true })).toContain('reassign');
        expect(ids({ ...NO_FLAGS, canConfigure: true })).not.toContain(
            'moderators',
        );
    });
});

describe('buildFooterNav', () => {
    it('gives a configurer the setup wizard and a moderator the history overlay', () => {
        expect(buildFooterNav(ALL).map((i) => i.id)).toEqual([
            'setup',
            'history',
        ]);
        expect(
            buildFooterNav({ ...NO_FLAGS, canConfigure: true }).map(
                (i) => i.id,
            ),
        ).toEqual(['setup']);
        expect(
            buildFooterNav({ ...NO_FLAGS, canModerate: true }).map(
                (i) => i.id,
            ),
        ).toEqual(['history']);
        expect(buildFooterNav(NO_FLAGS)).toEqual([]);
    });
});

describe('showSetupCard', () => {
    it('shows on Structure and Game panes', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        expect(showSetupCard(groups, 'game-details')).toBe(true);
        expect(showSetupCard(groups, 'groups')).toBe(true);
        expect(showSetupCard(groups, 'boards')).toBe(true);
    });

    it('hides on triage panes and the front door', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        expect(showSetupCard(groups, 'attention')).toBe(false);
        expect(showSetupCard(groups, 'bans')).toBe(false);
        expect(showSetupCard(groups, null)).toBe(false);
        expect(showSetupCard([], null)).toBe(false);
    });
});

describe('isLandingPaneId', () => {
    const visible = buildNav({ ...NO_FLAGS, canModerate: true })
        .flatMap((g) => g.items)
        .map((it) => it.id);

    it('accepts a visible pane id', () => {
        expect(isLandingPaneId('bans', visible)).toBe(true);
    });

    it('rejects overview — the front door is null, not a pane', () => {
        expect(isLandingPaneId('overview', visible)).toBe(false);
    });

    it('rejects history, roster, reports and setup', () => {
        for (const id of ['history', 'roster', 'reports', 'setup']) {
            expect(isLandingPaneId(id, visible), id).toBe(false);
        }
    });

    it('rejects null/undefined/empty and invisible ids', () => {
        expect(isLandingPaneId(null, visible)).toBe(false);
        expect(isLandingPaneId(undefined, visible)).toBe(false);
        expect(isLandingPaneId('', visible)).toBe(false);
        expect(isLandingPaneId('groups', visible)).toBe(false);
    });
});

describe('resolveInitialPane', () => {
    const modFlags = { ...NO_FLAGS, canModerate: true };
    const groups = buildNav(modFlags);

    it('a valid ?pane= deep link wins outright', () => {
        expect(resolveInitialPane('bans', groups, modFlags)).toBe('bans');
        expect(resolveInitialPane('attention', groups, modFlags)).toBe(
            'attention',
        );
    });

    it('a bare URL and junk land on the overview (null)', () => {
        expect(resolveInitialPane(null, groups, modFlags)).toBeNull();
        expect(resolveInitialPane('not-a-pane', groups, modFlags)).toBeNull();
        expect(resolveInitialPane('overview', groups, modFlags)).toBeNull();
    });

    it('rejects overlay/redirect ids and panes the viewer cannot see', () => {
        expect(resolveInitialPane('history', groups, modFlags)).toBeNull();
        expect(resolveInitialPane('setup', groups, modFlags)).toBeNull();
        expect(resolveInitialPane('groups', groups, modFlags)).toBeNull();
    });

    it('keeps level-categories deep links landing for configurers — the item merged into Levels', () => {
        const configurerFlags = { ...NO_FLAGS, canConfigure: true };
        expect(
            resolveInitialPane(
                'level-categories',
                buildNav(configurerFlags),
                configurerFlags,
            ),
        ).toBe('level-categories');
        expect(
            resolveInitialPane('level-categories', groups, modFlags),
        ).toBeNull();
    });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts"`
Expected: FAIL (`buildFooterNav` not exported, group ids wrong, etc.)

- [ ] **Step 3: Rewrite `nav-model.ts` to pass**

Keep the file's header comment style. The full new model section (types + groups + visibility + footer):

```typescript
export type NavItemId =
    | 'overview'
    | 'attention'
    | 'roster'
    | 'reports'
    | 'bans'
    | 'history'
    | 'setup'
    | 'game-details'
    | 'categories'
    | 'groups'
    | 'levels'
    | 'level-categories'
    | 'variables'
    | 'boards'
    | 'moderators'
    | 'reassign'
    | 'import';

export type NavGroupId = 'overview' | 'moderate' | 'structure' | 'game';
```

`NavItem`/`NavGroup`/`NavFlags` interfaces stay as they are. Replace `ALL_GROUPS`:

```typescript
// Grouped by how often a moderator touches them, not by concept: Overview is
// the front door, Queue is the daily loop, Structure is the board's shape,
// Game is occasional administration. Setup and History are NOT nav items any
// more — Setup leaves the console and History is an overlay, so both live in
// the utility footer (buildFooterNav) where their different behavior is
// visually honest.
const ALL_GROUPS: NavGroup[] = [
    {
        id: 'overview',
        // No caption — a one-item "group" for the front door.
        label: '',
        items: [{ id: 'overview', label: CONCEPT_LABEL.overview }],
    },
    {
        id: 'moderate',
        label: 'Queue',
        items: [
            { id: 'attention', label: CONCEPT_LABEL.attention },
            { id: 'bans', label: CONCEPT_LABEL.bans },
        ],
    },
    {
        id: 'structure',
        label: 'Structure',
        items: [
            { id: 'boards', label: CONCEPT_LABEL.boards },
            { id: 'categories', label: CONCEPT_LABEL.categories },
            { id: 'groups', label: CONCEPT_LABEL.groups },
            // One item now: the level categories (templates) are a tab inside
            // the Levels pane. ?pane=level-categories still deep-links there.
            { id: 'levels', label: CONCEPT_LABEL.levels },
            { id: 'variables', label: CONCEPT_LABEL.variables },
        ],
    },
    {
        id: 'game',
        label: 'Game',
        items: [
            { id: 'game-details', label: CONCEPT_LABEL['game-details'] },
            { id: 'moderators', label: CONCEPT_LABEL.moderators },
            { id: 'import', label: CONCEPT_LABEL.import },
            { id: 'reassign', label: CONCEPT_LABEL.reassign },
        ],
    },
];

function anyConsoleAccess(flags: NavFlags): boolean {
    return (
        flags.canModerate ||
        flags.canConfigure ||
        flags.canEditMods ||
        flags.canReassign
    );
}

function itemVisible(
    groupId: NavGroupId,
    itemId: NavItemId,
    flags: NavFlags,
): boolean {
    if (itemId === 'overview') return anyConsoleAccess(flags);
    if (itemId === 'reassign') return flags.canReassign;
    if (itemId === 'moderators') return flags.canEditMods;
    if (groupId === 'moderate') return flags.canModerate;
    if (itemId === 'categories') return flags.canConfigure || flags.canModerate;
    if (itemId === 'boards') return flags.canModerate || flags.canConfigure;
    if (itemId === 'import') return flags.canModerate || flags.canConfigure;
    return flags.canConfigure;
}

/** The utility footer under the nav: doors that are not panes. Setup leaves
 * the console for the wizard; History opens an overlay drawer. */
export function buildFooterNav(flags: NavFlags): NavItem[] {
    const items: NavItem[] = [];
    if (flags.canConfigure) {
        items.push({ id: 'setup', label: CONCEPT_LABEL.setup });
    }
    if (flags.canModerate) {
        items.push({ id: 'history', label: CONCEPT_LABEL.history });
    }
    return items;
}
```

`buildNav` unchanged. `NON_LANDING_IDS` becomes `['overview', 'history', 'roster', 'reports', 'setup']`. `sidebarActiveItem` becomes:

```typescript
/**
 * The sidebar highlight: the front door (activeItem null) IS the Overview
 * item. `kind=report` used to promote the highlight to a separate Reports
 * item; that item is retired, so the attention pane is simply current
 * whatever its filter.
 */
export function sidebarActiveItem(
    activeItem: NavItemId | null,
    _kind: string | null,
): NavItemId | null {
    if (activeItem === null) return 'overview';
    return activeItem;
}
```

`showSetupCard`: replace the board-group lookup with

```typescript
    if (activeItem == null) return false;
    return groups.some(
        (g) =>
            (g.id === 'structure' || g.id === 'game') &&
            g.items.some((it) => it.id === activeItem),
    );
```

(keep the existing doc comment, updating "Board-group" wording to "Structure/Game"). `hiddenLandingIds` becomes:

```typescript
function hiddenLandingIds(flags: NavFlags): NavItemId[] {
    // level-categories merged into the Levels pane but stays deep-linkable —
    // it lands on the Levels pane's templates tab (see content-router.tsx).
    return flags.canConfigure ? ['level-categories'] : [];
}
```

(`attention` leaves the hidden list — it is back in the nav, so `resolveInitialPane` finds it among visible items.)

- [ ] **Step 4: Add the vocabulary + icon entries**

In `src/lib/console/vocabulary.ts`: add `'overview'` to the `ConceptId` union (first) and `overview: 'Overview',` to `CONCEPT_LABEL`. Do NOT touch `TILE_CONCEPT_IDS`/`CONCEPT_TILE` (overview deliberately has no jump tile — it is the screen the tiles are on).

In `src/components/console-chrome/nav-icons.ts`: add `Speedometer2` to the import list and `overview: Speedometer2,` to `NAV_ICON`.

- [ ] **Step 5: Run the model + vocabulary tests**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts" src/lib/console/__tests__/vocabulary.test.ts`
Expected: nav-model PASS. If the vocabulary test pins `ConceptId`/tile ids to `NavItemId`, update its expectations for `overview` (it is a real concept with no tile).

- [ ] **Step 6: Fix compile fallout in consumers, minimally**

Run: `npx tsc --noEmit 2>&1 | grep -E "console|nav-model|vocabulary|nav-icons" | head -30`
Expected new errors only where later tasks land (console-shell/subroute-chrome still compile — `buildNav`/`sidebarActiveItem` signatures are unchanged; `showSetupCard` unchanged). `nav-icons.ts` needs no removal (`level-categories` stays in `NavItemId`). Fix anything else new that this task caused (e.g. the `nav shape` describe import list).

- [ ] **Step 7: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts" \
    "app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts" \
    src/lib/console/vocabulary.ts src/components/console-chrome/nav-icons.ts \
    src/lib/console/__tests__/vocabulary.test.ts \
    docs/superpowers/plans/2026-08-29-console-sidebar-redesign.md
git commit -m "feat(console): regroup sidebar nav by frequency — Overview/Queue/Structure/Game + utility footer model"
```

---

### Task 2: Generic sidebar chrome — badges, links, footer, empty group labels

**Files:**
- Modify: `src/components/console-chrome/nav-types.ts`
- Modify: `src/components/console-chrome/console-sidebar.tsx`
- Modify: `src/components/console-chrome/console-chrome.tsx`
- Modify: `src/components/console-chrome/console.module.scss`
- Create: `src/components/console-chrome/console-sidebar.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 (game-agnostic layer).
- Produces:
  - `nav-types.ts`: `export interface NavBadge { count?: number; degraded?: boolean; dot?: 'info' | 'warning' | 'danger' }`
  - `ConsoleSidebar` props: `attentionCount`/`badgeDegraded` REPLACED by `badges?: Record<string, NavBadge>`; new `hrefFor?: (id: string) => string | undefined`, `footerItems?: NavItem[]`, `onLinkNavigate?: () => void`.
  - `ConsoleChrome` props: same replacement + pass-through (`badges`, `hrefFor`, `footerItems`). Internally: button selects keep `handleSelect` (close drawer + `onNavigate`); link clicks call only `closeSidebar` via `onLinkNavigate`.
  - SCSS: `.navLink` (composes the `.navItem` look for anchors), `.dot` with `data-tone`, `.navFooter`.

- [ ] **Step 1: Write the failing component test**

`src/components/console-chrome/console-sidebar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Trophy } from 'react-bootstrap-icons';
import { ConsoleSidebar } from './console-sidebar';

vi.mock('~src/components/link', () => ({
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const GROUPS = [
    { id: 'overview', label: '', items: [{ id: 'overview', label: 'Overview' }] },
    {
        id: 'structure',
        label: 'Structure',
        items: [{ id: 'boards', label: 'Boards' }],
    },
];

describe('ConsoleSidebar', () => {
    it('renders an item as a link when hrefFor provides one, else a button', () => {
        render(
            <ConsoleSidebar
                groups={GROUPS}
                icons={{ boards: Trophy }}
                activeItem="boards"
                onSelect={() => {}}
                hrefFor={(id) => (id === 'boards' ? '?pane=boards' : undefined)}
            />,
        );
        const link = screen.getByRole('link', { name: /Boards/ });
        expect(link.getAttribute('href')).toBe('?pane=boards');
        expect(link.getAttribute('aria-current')).toBe('page');
        expect(screen.getByRole('button', { name: /Overview/ })).toBeTruthy();
    });

    it('skips the caption for an unlabeled group', () => {
        const { container } = render(
            <ConsoleSidebar
                groups={GROUPS}
                icons={{}}
                activeItem={null}
                onSelect={() => {}}
            />,
        );
        expect(screen.getByText('Structure')).toBeTruthy();
        // Only one caption div — the empty label renders nothing.
        expect(container.textContent).not.toMatch(/^\s*$/);
        expect(screen.queryAllByText('', { selector: 'div' })).toHaveLength(0);
    });

    it('renders count badges and status dots from the badges map', () => {
        render(
            <ConsoleSidebar
                groups={[
                    {
                        id: 'g',
                        label: 'G',
                        items: [
                            { id: 'attention', label: 'Needs attention' },
                            { id: 'import', label: 'Import' },
                        ],
                    },
                ]}
                icons={{}}
                activeItem={null}
                onSelect={() => {}}
                badges={{
                    attention: { count: 4 },
                    import: { dot: 'danger' },
                }}
            />,
        );
        expect(screen.getByText('4')).toBeTruthy();
        const dot = screen
            .getByRole('button', { name: /Import/ })
            .querySelector('[data-tone="danger"]');
        expect(dot).toBeTruthy();
    });

    it('renders footer items after the groups and routes their clicks through onSelect', async () => {
        const onSelect = vi.fn();
        render(
            <ConsoleSidebar
                groups={GROUPS}
                icons={{}}
                activeItem={null}
                onSelect={onSelect}
                footerItems={[{ id: 'history', label: 'History' }]}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'History' }));
        expect(onSelect).toHaveBeenCalledWith('history');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/console-chrome/console-sidebar.test.tsx`
Expected: FAIL (unknown props).

- [ ] **Step 3: Implement**

`nav-types.ts` — append:

```typescript
/** Ambient per-item status: a count pill (optionally marked degraded when a
 * source failed and the count may be an undercount) or a small status dot. */
export interface NavBadge {
    count?: number;
    degraded?: boolean;
    dot?: 'info' | 'warning' | 'danger';
}
```

`console-sidebar.tsx` — new props and rendering. Replace `attentionCount`/`badgeDegraded` with `badges`; factor the row content so button and link share it:

```tsx
'use client';

import clsx from 'clsx';
import type { Icon as IconType } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { AttentionBadge } from './attention-badge';
import styles from './console.module.scss';
import type { NavBadge, NavGroup, NavItem } from './nav-types';

interface Props {
    groups: NavGroup[];
    icons: Record<string, IconType>;
    activeItem: string | null;
    onSelect: (id: string) => void;
    /** Per-item status decorations, keyed by item id. */
    badges?: Record<string, NavBadge | undefined>;
    /** When it returns a URL for an item, that item renders as a real link
     * (middle-click, copy-address, prefetch); otherwise a button that goes
     * through onSelect. Link clicks call onLinkNavigate (drawer close), not
     * onSelect — the URL change itself is the navigation. */
    hrefFor?: (id: string) => string | undefined;
    onLinkNavigate?: () => void;
    /** Utility doors under the nav (wizard, history overlay) — rendered
     * apart so items that are not panes don't masquerade as panes. */
    footerItems?: NavItem[];
    ariaLabel?: string;
}

export function ConsoleSidebar({
    groups,
    icons,
    activeItem,
    onSelect,
    badges,
    hrefFor,
    onLinkNavigate,
    footerItems,
    ariaLabel,
}: Props) {
    const renderItem = (item: NavItem) => {
        const Icon = icons[item.id];
        const isActive = activeItem === item.id;
        const badge = badges?.[item.id];
        const href = hrefFor?.(item.id);
        const className = clsx(
            styles.navItem,
            href && styles.navLink,
            isActive && styles.active,
            item.reserved && styles.reserved,
        );
        const content = (
            <>
                {Icon && (
                    <Icon
                        size={16}
                        className={styles.navIcon}
                        aria-hidden="true"
                    />
                )}
                <span className={styles.navLabel}>{item.label}</span>
                {item.reserved && <span className={styles.soon}>soon</span>}
                {badge?.count != null && (
                    <AttentionBadge
                        count={badge.count}
                        degraded={badge.degraded}
                    />
                )}
                {badge?.dot && !badge.count && (
                    <span
                        className={styles.dot}
                        data-tone={badge.dot}
                        aria-hidden="true"
                    />
                )}
            </>
        );
        if (href) {
            return (
                <Link
                    key={item.id}
                    href={href}
                    scroll={false}
                    className={className}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={onLinkNavigate}
                >
                    {content}
                </Link>
            );
        }
        return (
            <button
                key={item.id}
                type="button"
                className={className}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelect(item.id)}
            >
                {content}
            </button>
        );
    };

    return (
        <nav aria-label={ariaLabel ?? 'Console navigation'}>
            {groups.map((group) => (
                <div key={group.id} className={styles.navGroup}>
                    {group.label && (
                        <div className={styles.groupLabel}>{group.label}</div>
                    )}
                    {group.items.map(renderItem)}
                </div>
            ))}
            {footerItems && footerItems.length > 0 && (
                <div className={styles.navFooter}>
                    {footerItems.map(renderItem)}
                </div>
            )}
        </nav>
    );
}
```

Move the mark-for-later TODO comment (currently inside the button) above `renderItem`. Note `.navGroup` gap comes from `.sidebarInner`'s flex gap — the `<nav>` is the flex child now holding groups; keep the existing structure where each `.navGroup` is a direct child of `<nav>` and add to SCSS (Step 4) `nav { display: flex; flex-direction: column; gap: dt.$spacing-2xl; }` scoped as `.sidebarInner nav` ONLY IF group spacing visually collapses — check: today groups are separated because `<nav>` has no gap but `.sidebarInner` does? No: `.sidebarInner` gap separates the setup card and `<nav>`; the groups inside `<nav>` today have no explicit gap between them. Inspect the current rendering before/after and preserve whatever spacing exists today.

`console-chrome.tsx` — replace `attentionCount`/`badgeDegraded` props with `badges?: Record<string, NavBadge | undefined>`, add `hrefFor`, `footerItems` pass-throughs:

```tsx
interface Props {
    header: ConsoleHeader;
    groups: NavGroup[];
    icons: Record<string, IconType>;
    activeItem: string | null;
    onNavigate: (id: string) => void;
    badges?: Record<string, NavBadge | undefined>;
    hrefFor?: (id: string) => string | undefined;
    footerItems?: NavItem[];
    navAriaLabel?: string;
    plain?: boolean;
    children: ReactNode;
}
```

and in the JSX:

```tsx
<ConsoleSidebar
    groups={groups}
    icons={icons}
    activeItem={activeItem}
    onSelect={handleSelect}
    badges={badges}
    hrefFor={hrefFor}
    onLinkNavigate={closeSidebar}
    footerItems={footerItems}
    ariaLabel={navAriaLabel}
/>
```

`console.module.scss` — add after `.count`:

```scss
// Anchor variant of .navItem — same box, link semantics.
.navLink {
    text-decoration: none;

    &:hover {
        text-decoration: none;
    }
}

// Ambient status dot (sync running/failed, health) — quieter than .count.
.dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &[data-tone='info'] {
        background: var(--bs-primary);
    }
    &[data-tone='warning'] {
        background: dt.$accent-amber;
    }
    &[data-tone='danger'] {
        background: dt.$accent-red;
    }
}

// Utility doors under the nav — not panes, so visually apart: a hairline
// above, quieter text.
.navFooter {
    margin-top: dt.$spacing-xl;
    padding-top: dt.$spacing-lg;
    border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    display: flex;
    flex-direction: column;
    gap: 2px;

    .navItem {
        color: var(--bs-secondary-color);
        font-weight: 500;
    }
}
```

- [ ] **Step 4: Fix the two existing callers to compile (mechanical only)**

`console-shell.tsx` and `subroute-chrome.tsx` still pass `attentionCount`/`badgeDegraded`. Replace each with the equivalent badges map so this task stands alone (real wiring is Task 3):
- console-shell: `badges={{ attention: { count: attentionItems.length, degraded: degradedSources.length > 0 } }}`
- subroute-chrome: `badges={{ attention: { count: attentionCount, degraded: badgeDegraded } }}`

`settings-chrome.tsx` passes neither prop — untouched.

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/components/console-chrome/console-sidebar.test.tsx && npx tsc --noEmit 2>&1 | grep -E "console-chrome|console-shell|subroute-chrome|settings-chrome" | head`
Expected: test PASS; no new type errors in those files.

- [ ] **Step 6: Commit**

```bash
git add src/components/console-chrome/nav-types.ts \
    src/components/console-chrome/console-sidebar.tsx \
    src/components/console-chrome/console-sidebar.test.tsx \
    src/components/console-chrome/console-chrome.tsx \
    src/components/console-chrome/console.module.scss \
    "app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx" \
    "app/(new-layout)/games-v2/[game]/manage/console/subroute-chrome.tsx"
git commit -m "feat(console-chrome): sidebar links, per-item badges/dots, utility footer, unlabeled groups"
```

---

### Task 3: Wire the manage console — hrefs, footer, badges, Overview navigation

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/subroute-chrome.tsx`

**Interfaces:**
- Consumes: `buildFooterNav`, new `sidebarActiveItem` (Task 1); `badges`/`hrefFor`/`footerItems` chrome props (Task 2). `SrcImportStatus` = `'queued' | 'running' | 'done' | 'failed'`; `BoardHealth.items[].severity` = `'blocker' | 'warning' | 'info'`.
- Produces: nothing new for later tasks.

- [ ] **Step 1: console-shell.tsx — footer, hrefs, badges, overview**

In `ConsoleShell`:

```tsx
const footerItems = useMemo(() => buildFooterNav(flags), [flags]);

const base = `/games-v2/${encodeURIComponent(game.name)}/manage`;

// Real links for every sidebar destination. History stays a button — it is
// an overlay, and writing ?pane=history from inside the console would yank
// the pane out from under the drawer (see handleNavigate).
const hrefFor = useCallback(
    (id: string): string | undefined => {
        if (id === 'history') return undefined;
        if (id === 'setup')
            return `/games-v2/${encodeURIComponent(game.name)}/setup`;
        if (id === 'overview') return base;
        return `${base}?pane=${id}`;
    },
    [game.name, base],
);

// Ambient sidebar status from data the shell already holds. The count pill
// wins over a dot when both could apply.
const badges = useMemo(() => {
    const map: Record<string, NavBadge | undefined> = {
        attention: {
            count: attentionItems.length,
            degraded: degradedSources.length > 0,
        },
    };
    const pending = modApplications?.length ?? 0;
    if (pending > 0) map.moderators = { count: pending };
    if (syncJob?.status === 'queued' || syncJob?.status === 'running') {
        map.import = { dot: 'info' };
    } else if (syncJob?.status === 'failed') {
        map.import = { dot: 'danger' };
    }
    if (boardHealth?.items.some((i) => i.severity === 'blocker')) {
        map.overview = { dot: 'danger' };
    } else if (boardHealth?.items.some((i) => i.severity === 'warning')) {
        map.overview = { dot: 'warning' };
    }
    return map;
}, [attentionItems.length, degradedSources.length, modApplications, syncJob, boardHealth]);
```

Import `NavBadge` from `~src/components/console-chrome/nav-types`, `buildFooterNav` from `./nav-model`, and `useCallback` (already imported). In `handleNavigate`, add an overview branch (BoardOverview's jump tiles and programmatic calls):

```tsx
if (id === 'overview') {
    router.push(base, { scroll: false });
    setActiveItem(null);
    return;
}
```

Pass to `ConsoleChrome`: `badges={badges}` (replacing the Task 2 stopgap), `hrefFor={hrefFor}`, `footerItems={footerItems}`. `activeItem={activeSidebarItem}` is already derived — with Task 1's `sidebarActiveItem`, the Overview item highlights on the front door automatically.

Link-driven pane switches now flow: Link updates `?pane=` → `initialActive` recomputes → the existing sync effect (`setActiveItem(initialActive)`) applies it. Verify `handleNavigate` remains for BoardOverview/`ContentRouter` callers; sidebar link clicks no longer call it (they only close the drawer).

- [ ] **Step 2: subroute-chrome.tsx — same wiring, link-first**

```tsx
const groups = useMemo(() => buildNav(flags), [flags]);
const footerItems = useMemo(() => buildFooterNav(flags), [flags]);
const base = `/games-v2/${encodeURIComponent(game.name)}/manage`;

// Every sidebar door on a sub-route page is a real cross-page link — even
// History, which the console opens as a drawer on arrival (?pane=history).
const hrefFor = (id: string): string => {
    if (id === 'setup')
        return `/games-v2/${encodeURIComponent(game.name)}/setup`;
    if (id === 'overview') return base;
    return `${base}?pane=${id}`;
};
```

Keep `navigate` as the `onNavigate` fallback but simplify: drop the `roster`/`reports` branches (neither is in the nav or footer any more) and route everything through the same URLs as `hrefFor`. Pass `hrefFor={hrefFor}`, `footerItems={footerItems}`, and `badges={{ attention: { count: attentionCount, degraded: badgeDegraded } }}`.

- [ ] **Step 3: Typecheck + full console test sweep**

Run: `npx tsc --noEmit 2>&1 | grep -E "manage/console|console-chrome" | head` and `npx vitest run "app/(new-layout)/games-v2/[game]/manage" src/components/console-chrome src/lib/console`
Expected: no new type errors; all suites pass.

- [ ] **Step 4: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx" \
    "app/(new-layout)/games-v2/[game]/manage/console/subroute-chrome.tsx"
git commit -m "feat(console): wire sidebar links, utility footer, and ambient badges into the manage shell"
```

---

### Task 4: Merge Levels + Level categories into one tabbed pane

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/levels/levels-section.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/levels/levels-section.test.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/levels/levels.module.scss` (or wherever the levels panes' module lives — check imports in levels-pane.tsx; if none fits, add a small `levels-section.module.scss`)

**Interfaces:**
- Consumes: `LevelsPane({ gameId, gameSlug, templates })`, `LevelCategoriesPane({ gameId, gameSlug })` — both unchanged. `LevelTemplate` from `types/levels.types`.
- Produces: `LevelsSection({ gameId, gameSlug, templates, initialTab })` with `initialTab?: 'levels' | 'templates'`.

- [ ] **Step 1: Write the failing test**

`levels-section.test.tsx` (mock both panes — they fetch on mount):

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./levels-pane', () => ({
    LevelsPane: () => <div data-testid="levels-pane" />,
}));
vi.mock('./level-categories-pane', () => ({
    LevelCategoriesPane: () => <div data-testid="templates-pane" />,
}));

import { LevelsSection } from './levels-section';

describe('LevelsSection', () => {
    it('shows the levels list by default and switches to templates', async () => {
        render(<LevelsSection gameId={1} gameSlug="g" templates={[]} />);
        expect(screen.getByTestId('levels-pane')).toBeTruthy();
        expect(screen.queryByTestId('templates-pane')).toBeNull();

        await userEvent.click(
            screen.getByRole('tab', { name: 'Level categories' }),
        );
        expect(screen.getByTestId('templates-pane')).toBeTruthy();
        expect(screen.queryByTestId('levels-pane')).toBeNull();
    });

    it('lands on the templates tab when deep-linked', () => {
        render(
            <LevelsSection
                gameId={1}
                gameSlug="g"
                templates={[]}
                initialTab="templates"
            />,
        );
        expect(screen.getByTestId('templates-pane')).toBeTruthy();
        expect(
            screen
                .getByRole('tab', { name: 'Level categories' })
                .getAttribute('aria-selected'),
        ).toBe('true');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/levels/levels-section.test.tsx"`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `LevelsSection`**

```tsx
'use client';

import { useState } from 'react';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { LevelTemplate } from '../../../../../../types/levels.types';
import { LevelCategoriesPane } from './level-categories-pane';
import { LevelsPane } from './levels-pane';
import styles from './levels-section.module.scss';

type LevelsTab = 'levels' | 'templates';

interface Props {
    gameId: number;
    gameSlug: string;
    templates: LevelTemplate[];
    /** ?pane=level-categories deep links land on the templates tab. */
    initialTab?: LevelsTab;
}

/**
 * One door for both level surfaces: the levels themselves and the level
 * categories (the templates every level's boards are materialised from).
 * They used to be two near-identically named sidebar items; the split is
 * now a tab inside the pane, where the relationship is visible.
 */
export function LevelsSection({
    gameId,
    gameSlug,
    templates,
    initialTab = 'levels',
}: Props) {
    const [tab, setTab] = useState<LevelsTab>(initialTab);

    return (
        <div>
            <div role="tablist" aria-label="Levels" className={styles.tabs}>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'levels'}
                    className={styles.tab}
                    onClick={() => setTab('levels')}
                >
                    {CONCEPT_LABEL.levels}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'templates'}
                    className={styles.tab}
                    onClick={() => setTab('templates')}
                >
                    {CONCEPT_LABEL['level-categories']}
                </button>
            </div>
            {tab === 'levels' ? (
                <LevelsPane
                    gameId={gameId}
                    gameSlug={gameSlug}
                    templates={templates}
                />
            ) : (
                <LevelCategoriesPane gameId={gameId} gameSlug={gameSlug} />
            )}
        </div>
    );
}
```

`levels-section.module.scss` (match the console's segmented-control idiom — check `board.scss` for an existing pill/segment mixin like `control-pill` and prefer it):

```scss
@use '../../../../styles/design-tokens' as dt;

.tabs {
    display: inline-flex;
    gap: dt.$spacing-xs;
    padding: dt.$spacing-xs;
    margin-bottom: dt.$spacing-lg;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    border-radius: dt.$radius-md;
    background: color-mix(in srgb, var(--bs-body-bg) 92%, var(--bs-secondary-bg) 8%);
}

.tab {
    border: 0;
    background: transparent;
    padding: dt.$spacing-xs dt.$spacing-md;
    border-radius: dt.$radius-sm;
    font-size: dt.$font-size-sm;
    font-weight: 500;
    color: var(--bs-secondary-color);
    cursor: pointer;

    &[aria-selected='true'] {
        background: var(--bs-body-bg);
        color: var(--bs-emphasis-color);
        font-weight: 600;
        box-shadow: dt.$shadow-sm;
    }
}
```

(Verify the relative `@use` path against how sibling modules in `manage/levels/` import design-tokens; copy their exact path.)

- [ ] **Step 4: Route both pane ids through it in `content-router.tsx`**

```tsx
case 'levels':
    return (
        <LevelsSection
            gameId={game.id}
            gameSlug={game.name}
            templates={props.levelTemplates}
        />
    );
case 'level-categories':
    // Merged into the Levels pane; the old id survives as a deep link
    // landing on the templates tab (see hiddenLandingIds in nav-model.ts).
    return (
        <LevelsSection
            gameId={game.id}
            gameSlug={game.name}
            templates={props.levelTemplates}
            initialTab="templates"
        />
    );
```

Swap the `LevelsPane`/`LevelCategoriesPane` imports for `LevelsSection`.

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/levels" && npx tsc --noEmit 2>&1 | grep -E "levels|content-router" | head`
Expected: new + existing levels tests PASS (levels-pane.test.tsx and level-categories-pane.test.tsx are untouched); no new type errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/levels/levels-section.tsx" \
    "app/(new-layout)/games-v2/[game]/manage/levels/levels-section.test.tsx" \
    "app/(new-layout)/games-v2/[game]/manage/levels/levels-section.module.scss" \
    "app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx"
git commit -m "feat(console): merge Levels and Level categories into one tabbed pane"
```

---

### Task 5: Full verification sweep

**Files:** none new — fixes only if the sweep finds fallout.

- [ ] **Step 1: Full unit test run**

Run: `npx vitest run`
Expected: no failures beyond pre-existing ones (`row-actions.test` has 3 known pre-existing failures — see memory). Fix anything this branch broke.

- [ ] **Step 2: Typecheck + lint against baseline**

Run: `npx tsc --noEmit 2>&1 | wc -l` and compare against the same command on `manage-overview` (stash nothing — use `git stash` is FORBIDDEN with the dirty tree; instead run the baseline count once at branch start or diff error lists by file). Simpler: `npx tsc --noEmit 2>&1 | grep -E "console|manage|levels" ` must show nothing new in files this branch touched. Same for `npm run lint -- --quiet` scoped output.

- [ ] **Step 3: Grep for orphans**

- `grep -rn "'board'" "app/(new-layout)/games-v2/[game]/manage" src/components/console-chrome | grep -i navgroup` — no stale `'board'` group references.
- `grep -rn "attentionCount\|badgeDegraded" src/components/console-chrome` — only inside `NavBadge`-based code/comments, no leftover props.
- `grep -rn "level-categories" "app/(new-layout)/games-v2/[game]/manage" src` — remaining references are: `NavItemId`/`ConceptId` unions, `NAV_ICON`, `CONCEPT_LABEL`/`CONCEPT_TILE`, `hiddenLandingIds`, content-router case, LevelsSection, and BoardOverview's `CONCEPT_TILE` filter (its jump grid drops the tile automatically because the id is no longer in `navGroups` — confirm by reading `jumpItems`).

- [ ] **Step 4: Interactive smoke check (dev server)**

`ps -eo pid,args | grep "next dev" | grep -v grep` first (must be empty). Then `npm run dev`, load `/games-v2/<some game>/manage` as an admin if a session is available; otherwise at minimum confirm the page compiles and renders the login/permission gate without crashing. Check: Overview item highlighted on the front door; pane links carry `?pane=`; footer shows Setup/History; History opens the drawer without a URL write; `?pane=level-categories` lands on the templates tab. **Kill the dev server afterwards (exact pid).**

- [ ] **Step 5: Push the branch**

```bash
git push -u origin console-sidebar-redesign
```

(No PR — Joey opens PRs himself.)

---

## Self-review notes

- Spec point 1 → Task 1 (+3 for highlight wiring). Point 2 → Tasks 1–3. Point 3 → Tasks 1, 4. Point 4 → Tasks 2, 3. Point 5 → Tasks 2, 3.
- `sidebarActiveItem`'s `kind` param is kept (unused, `_kind`) to avoid touching every caller; console-shell already passes it.
- Deep-link compat: `?pane=attention`, `?pane=level-categories`, `?pane=history`, legacy `?pane=rules&cat=` all still resolve. `?pane=setup`/`?pane=overview`/junk land on the overview.
- BoardOverview (`board-overview.tsx`) reads `navGroups` for `showImport`/`showModerators`/`jumpItems` — all id-based, unaffected by regrouping; `setup`'s tile disappears from the jump grid (it's in the sidebar footer now), which is correct: `FEATURED_ON_DASHBOARD` already excluded it.
