# Unified Admin Console — Phase 1 (Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the unified game admin console shell at `/games-v2/[game]/manage` — a sidebar-driven layout with permission-gated navigation and a shared category context — and mount the *existing* moderation and config surfaces into its panes so nothing regresses.

**Architecture:** One server page (`manage/page.tsx`) loads session + game + categories + the two existing data sets (manage config rows/groups/identifiers and the moderation attention feed) and renders a client `ConsoleShell`. The shell owns UI state (active sidebar item, selected category, manage rows/groups) and renders existing components per pane. Navigation visibility is computed by a pure `nav-model` module from CASL ability flags.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CASL (`@casl/ability`), Bootstrap classes. **No test runner exists in this repo** (scripts are Biome `lint` + `tsc --noEmit` `typecheck` + `build`); verification is typecheck/lint/build + manual checks via the dev server. Pure logic is isolated in `nav-model.ts` for easy reasoning.

**Scope refinement vs. spec:** The spec's Phase 1 listed the `/manage/moderation` redirect. That is **deferred** here — redirecting before surfaces are migrated would regress live moderation. Phase 1 mounts existing surfaces functionally at `/manage`; the redirect, the per-surface visual redesign, the minimums consolidation, and legacy deletion are later phases. The old `/manage/moderation` route stays live and untouched.

**Out of scope (later phases):** visual restyle of mounted sections; full re-mount of the Roster and Reports *route pages* (Phase 1 links to them); minimums consolidation + legacy `/minimums` deletion; `/manage/moderation` redirect; net-new Metadata + Moderators surfaces.

---

## File structure

**Create:**
- `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts` — pure: nav item/group definitions + `buildNav(flags)` visibility computation. One responsibility: the IA-as-data.
- `app/(new-layout)/games-v2/[game]/manage/console/console-sidebar.tsx` — presentational sidebar (groups, items, badge, active state, category picker slot). No data fetching.
- `app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx` — client shell: owns UI state, renders sidebar + content router, responsive offcanvas.
- `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx` — maps active item → mounted existing component (or link pane).

**Modify:**
- `app/(new-layout)/games-v2/[game]/manage/page.tsx` — replace the `ManagePage` render with the data load + `ConsoleShell` render; gate on either audience.

**Leave untouched (mounted as-is):** `moderation/attention/needs-attention.tsx`, `moderation/configure/{standards,active-bans,history-drawer}.tsx`, `game-tab/game-tab.tsx`, `timing/timing-settings-section.tsx`, `category-tab/rules-section.tsx`, `category-tab/category-settings-section.tsx`, `variables/{variables-section,combinations-section}.tsx`. (The old `manage-page.tsx`, `tab-strip.tsx`, `category-tab/category-tab.tsx`, and `minimums/` remain on disk but are no longer rendered by `page.tsx`; their deletion is a later phase.)

---

## Task 1: Nav model (pure IA-as-data)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts`

- [ ] **Step 1: Write the module**

```ts
// Pure description of the console's sidebar IA + permission-driven visibility.
// No React, no fetching — trivially reasoned about and reused by the shell.

export type NavItemId =
    | 'attention'
    | 'roster'
    | 'reports'
    | 'bans'
    | 'history'
    | 'standards'
    | 'timing'
    | 'rules'
    | 'variables'
    | 'combinations'
    | 'category-settings'
    | 'game-details' // reserved (placeholder)
    | 'moderators' // reserved (placeholder)
    | 'groups'
    | 'categories-visibility'
    | 'identifiers';

export type NavGroupId = 'moderate' | 'game' | 'per-category';

export interface NavItem {
    id: NavItemId;
    label: string;
    /** Per-category items need the selected category to render. */
    categoryScoped: boolean;
    /** Reserved/not-yet-built items render a "coming soon" placeholder. */
    reserved?: boolean;
}

export interface NavGroup {
    id: NavGroupId;
    label: string;
    items: NavItem[];
}

/** Ability flags resolved server-side and passed in. */
export interface NavFlags {
    canModerate: boolean; // canModerateGame
    canEditStandards: boolean; // ability.can('edit','moderators')
    canConfigure: boolean; // ability.can('edit','category-settings',{game})
}

const ALL_GROUPS: NavGroup[] = [
    {
        id: 'moderate',
        label: 'Moderate',
        items: [
            { id: 'attention', label: 'Needs attention', categoryScoped: false },
            { id: 'roster', label: 'Roster', categoryScoped: false },
            { id: 'reports', label: 'Reports', categoryScoped: false },
            { id: 'bans', label: 'Bans', categoryScoped: false },
            { id: 'history', label: 'History', categoryScoped: false },
        ],
    },
    {
        id: 'game',
        label: 'Game',
        items: [
            { id: 'game-details', label: 'Details & metadata', categoryScoped: false, reserved: true },
            { id: 'moderators', label: 'Moderators', categoryScoped: false, reserved: true },
            { id: 'groups', label: 'Groups', categoryScoped: false },
            { id: 'categories-visibility', label: 'Categories & visibility', categoryScoped: false },
            { id: 'identifiers', label: 'Identifiers', categoryScoped: false },
        ],
    },
    {
        id: 'per-category',
        label: 'Per category',
        items: [
            // Standards self-manages its own category selector, so it is NOT
            // categoryScoped (it ignores the shell's selected category).
            { id: 'standards', label: 'Standards', categoryScoped: false },
            { id: 'timing', label: 'Timing', categoryScoped: true },
            { id: 'rules', label: 'Rules', categoryScoped: true },
            { id: 'variables', label: 'Variables', categoryScoped: true },
            { id: 'combinations', label: 'Combinations', categoryScoped: true },
            { id: 'category-settings', label: 'Category settings', categoryScoped: true },
        ],
    },
];

/**
 * Standards lives in the per-category group but is visible to ANY moderator
 * (read-only preview); only board-admins (canEditStandards) may edit it, and that
 * edit-gating is handled by the Standards component, not by visibility here.
 */
function itemVisible(groupId: NavGroupId, itemId: NavItemId, flags: NavFlags): boolean {
    if (groupId === 'moderate') return flags.canModerate;
    if (itemId === 'standards') return flags.canModerate;
    // remaining per-category items + all game items
    return flags.canConfigure;
}

/** Returns only the groups/items the viewer may use; drops empty groups. */
export function buildNav(flags: NavFlags): NavGroup[] {
    return ALL_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) => itemVisible(g.id, it.id, flags)),
    })).filter((g) => g.items.length > 0);
}

/** First visible item, used as the default landing pane. */
export function defaultItem(groups: NavGroup[]): NavItemId | null {
    return groups[0]?.items[0]?.id ?? null;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors referencing `nav-model.ts`).

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts"
git commit -m "feat(admin-console): nav model for console sidebar IA"
```

---

## Task 2: Console sidebar (presentational)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/console/console-sidebar.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import type { NavGroup, NavItemId } from './nav-model';

interface Props {
    groups: NavGroup[];
    activeItem: NavItemId | null;
    onSelect: (id: NavItemId) => void;
    attentionCount: number;
    /** Category picker for the per-category group. */
    categories: Array<{ id: number; display: string }>;
    selectedCategoryId: number | null;
    onSelectCategory: (id: number) => void;
}

export function ConsoleSidebar({
    groups,
    activeItem,
    onSelect,
    attentionCount,
    categories,
    selectedCategoryId,
    onSelectCategory,
}: Props) {
    return (
        <nav className="d-flex flex-column gap-3" aria-label="Admin console">
            {groups.map((group) => (
                <div key={group.id}>
                    <div className="text-uppercase small fw-semibold text-muted px-2 mb-1">
                        {group.label}
                    </div>
                    {group.id === 'per-category' && categories.length > 0 && (
                        <select
                            className="form-select form-select-sm mb-2"
                            aria-label="Category"
                            value={selectedCategoryId ?? ''}
                            onChange={(e) => {
                                const id = Number.parseInt(e.target.value, 10);
                                if (Number.isFinite(id)) onSelectCategory(id);
                            }}
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display}
                                </option>
                            ))}
                        </select>
                    )}
                    <ul className="nav nav-pills flex-column">
                        {group.items.map((item) => (
                            <li className="nav-item" key={item.id}>
                                <button
                                    type="button"
                                    className={`nav-link w-100 text-start d-flex align-items-center justify-content-between ${
                                        activeItem === item.id ? 'active' : ''
                                    }`}
                                    onClick={() => onSelect(item.id)}
                                >
                                    <span>
                                        {item.label}
                                        {item.reserved && (
                                            <span className="badge text-bg-light ms-2">
                                                soon
                                            </span>
                                        )}
                                    </span>
                                    {item.id === 'attention' &&
                                        attentionCount > 0 && (
                                            <span className="badge rounded-pill text-bg-danger">
                                                {attentionCount > 99
                                                    ? '99+'
                                                    : attentionCount}
                                            </span>
                                        )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/console-sidebar.tsx"
git commit -m "feat(admin-console): presentational console sidebar"
```

---

## Task 3: Content router (mount existing surfaces)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx`

Mounts the already-built components per active item. Per-category items receive the selected `ResolvedCategory`. Reserved items and the not-yet-migrated Roster/Reports route pages render a placeholder/link.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import Link from '~src/components/link';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { NeedsAttention } from '../moderation/attention/needs-attention';
import { ActiveBans } from '../moderation/configure/active-bans';
import { HistoryDrawer } from '../moderation/configure/history-drawer';
import { Standards } from '../moderation/configure/standards';
import { GameTab } from '../game-tab/game-tab';
import { RulesSection } from '../category-tab/rules-section';
import { CategorySettingsSection } from '../category-tab/category-settings-section';
import { TimingSettingsSection } from '../timing/timing-settings-section';
import { CombinationsSection } from '../variables/combinations-section';
import { VariablesSection } from '../variables/variables-section';
import type { NavItemId } from './nav-model';

export interface ContentRouterProps {
    activeItem: NavItemId | null;
    game: ResolvedGame;
    categories: Array<{ id: number; display: string }>;
    selectedCategory: ResolvedCategory | null;
    canEditStandards: boolean;
    // moderate data
    attentionItems: AttentionItem[];
    // game-tab state (lifted into the shell)
    initialSlug: string | null;
    initialAbbreviation: string | null;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    onGroupsChange: (g: ManageGroup[]) => void;
    onRowChange: (categoryId: number, patch: { isMain?: boolean; active?: boolean }) => void;
    onRowGroupChange: (categoryId: number, groupId: number | null, groupName: string | null) => void;
    onEditCategory: (categoryId: number) => void;
    // history drawer
    historyOpen: boolean;
    onHistoryClose: () => void;
}

function Placeholder({ title, children }: { title: string; children?: React.ReactNode }) {
    return (
        <div className="border rounded p-4 bg-light-subtle text-muted">
            <h2 className="h5">{title}</h2>
            {children}
        </div>
    );
}

export function ContentRouter(props: ContentRouterProps) {
    const {
        activeItem,
        game,
        categories,
        selectedCategory,
        canEditStandards,
        attentionItems,
    } = props;

    switch (activeItem) {
        case 'attention':
            return (
                <NeedsAttention
                    gameSlug={game.name}
                    gameDisplay={game.display}
                    items={attentionItems}
                    categories={categories}
                />
            );
        case 'bans':
            return <ActiveBans gameSlug={game.name} />;
        case 'history':
            return (
                <HistoryDrawer
                    gameSlug={game.name}
                    open={props.historyOpen}
                    onClose={props.onHistoryClose}
                />
            );
        case 'roster':
            return (
                <Placeholder title="Roster">
                    <Link href={`/games-v2/${game.name}/manage/moderation/roster`}>
                        Open the roster browser ↗
                    </Link>
                </Placeholder>
            );
        case 'reports':
            return (
                <Placeholder title="Reports">
                    Reports move here in a later phase.
                </Placeholder>
            );
        case 'standards':
            return (
                <Standards
                    gameSlug={game.name}
                    gameDisplay={game.display}
                    categories={categories}
                    canEdit={canEditStandards}
                />
            );
        case 'timing':
            return selectedCategory ? (
                <TimingSettingsSection
                    gameSlug={game.name}
                    gameId={game.id}
                    category={selectedCategory}
                />
            ) : (
                <Placeholder title="Timing">Pick a category.</Placeholder>
            );
        case 'rules':
            return selectedCategory ? (
                <RulesSection gameSlug={game.name} gameId={game.id} category={selectedCategory} />
            ) : (
                <Placeholder title="Rules">Pick a category.</Placeholder>
            );
        case 'variables':
            return selectedCategory ? (
                <VariablesSection
                    gameSlug={game.name}
                    gameId={game.id}
                    selectedCategory={selectedCategory}
                />
            ) : (
                <Placeholder title="Variables">Pick a category.</Placeholder>
            );
        case 'combinations':
            return selectedCategory ? (
                <CombinationsSection
                    gameSlug={game.name}
                    gameId={game.id}
                    selectedCategory={selectedCategory}
                />
            ) : (
                <Placeholder title="Combinations">Pick a category.</Placeholder>
            );
        case 'category-settings':
            return selectedCategory ? (
                <CategorySettingsSection
                    gameSlug={game.name}
                    gameId={game.id}
                    category={selectedCategory}
                />
            ) : (
                <Placeholder title="Category settings">Pick a category.</Placeholder>
            );
        case 'groups':
        case 'categories-visibility':
        case 'identifiers':
            return (
                <GameTab
                    game={game}
                    initialSlug={props.initialSlug}
                    initialAbbreviation={props.initialAbbreviation}
                    rows={props.rows}
                    groups={props.groups}
                    onGroupsChange={props.onGroupsChange}
                    onRowChange={props.onRowChange}
                    onRowGroupChange={props.onRowGroupChange}
                    onEditCategory={props.onEditCategory}
                />
            );
        case 'game-details':
            return <Placeholder title="Details & metadata">Coming in a later phase.</Placeholder>;
        case 'moderators':
            return <Placeholder title="Moderators">Coming in a later phase.</Placeholder>;
        default:
            return <Placeholder title="Admin console">Select an item from the sidebar.</Placeholder>;
    }
}
```

> Note: `GameTab` is mounted whole for the three Game items in Phase 1 (it already contains groups, category list/visibility, and identifiers). Splitting it into separate panes is a later-phase refinement. Confirm `~src/components/link` is the correct Link import by matching `moderation-tabs.tsx` (it imports `Link from '~src/components/link'`).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If any imported component's prop names differ, fix the call site to match the component's actual `interface Props` (do not change the components).

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx"
git commit -m "feat(admin-console): content router mounting existing surfaces"
```

---

## Task 4: Console shell (state + layout + responsive)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx`

Owns UI state ported from the old `manage-page.tsx`: selected category, manage rows, manage groups, plus the active sidebar item and history-drawer open flag.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from '~src/components/link';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { ConsoleSidebar } from './console-sidebar';
import { ContentRouter } from './content-router';
import {
    buildNav,
    defaultItem,
    type NavFlags,
    type NavItemId,
} from './nav-model';

export interface ConsoleShellProps {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    flags: NavFlags;
    attentionItems: AttentionItem[];
    initialCategoryId: number | null;
    initialSlug: string | null;
    initialAbbreviation: string | null;
    initialRows: ManageCategoryRow[];
    initialGroups: ManageGroup[];
}

export function ConsoleShell({
    game,
    categories,
    flags,
    attentionItems,
    initialCategoryId,
    initialSlug,
    initialAbbreviation,
    initialRows,
    initialGroups,
}: ConsoleShellProps) {
    const groups = useMemo(() => buildNav(flags), [flags]);
    const [activeItem, setActiveItem] = useState<NavItemId | null>(() =>
        defaultItem(groups),
    );
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        initialCategoryId,
    );
    const [rows, setRows] = useState<ManageCategoryRow[]>(initialRows);
    const [manageGroups, setManageGroups] = useState<ManageGroup[]>(initialGroups);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false); // mobile offcanvas

    const selectedCategory = useMemo<ResolvedCategory | null>(
        () => categories.find((c) => c.id === selectedCategoryId) ?? null,
        [categories, selectedCategoryId],
    );

    const applyRowPatch = useCallback(
        (categoryId: number, patch: { isMain?: boolean; active?: boolean }) => {
            setRows((rs) =>
                rs.map((r) => (r.id === categoryId ? { ...r, ...patch } : r)),
            );
        },
        [],
    );

    const handleSelect = (id: NavItemId) => {
        setActiveItem(id);
        setSidebarOpen(false);
    };

    const categoryOptions = useMemo(
        () => categories.map((c) => ({ id: c.id, display: c.display })),
        [categories],
    );

    const sidebar = (
        <ConsoleSidebar
            groups={groups}
            activeItem={activeItem}
            onSelect={handleSelect}
            attentionCount={attentionItems.length}
            categories={categoryOptions}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
        />
    );

    return (
        <div className="container-fluid py-3">
            <header className="d-flex align-items-center gap-2 mb-3">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-md-none"
                    aria-label="Toggle navigation"
                    aria-expanded={sidebarOpen}
                    onClick={() => setSidebarOpen((v) => !v)}
                >
                    ☰
                </button>
                <div>
                    <small className="text-muted d-block">Admin</small>
                    <h1 className="h4 mb-0">{game.display}</h1>
                </div>
                <Link
                    href={`/games-v2/${game.name}`}
                    className="btn btn-sm btn-outline-secondary ms-auto"
                >
                    Back to leaderboards
                </Link>
            </header>

            <div className="row g-3">
                <aside
                    className={`col-12 col-md-4 col-lg-3 ${sidebarOpen ? '' : 'd-none d-md-block'}`}
                >
                    {sidebar}
                </aside>
                <section className="col-12 col-md-8 col-lg-9">
                    <ContentRouter
                        activeItem={activeItem}
                        game={game}
                        categories={categoryOptions}
                        selectedCategory={selectedCategory}
                        canEditStandards={flags.canEditStandards}
                        attentionItems={attentionItems}
                        initialSlug={initialSlug}
                        initialAbbreviation={initialAbbreviation}
                        rows={rows}
                        groups={manageGroups}
                        onGroupsChange={setManageGroups}
                        onRowChange={applyRowPatch}
                        onRowGroupChange={(categoryId, groupId, groupName) =>
                            setRows((rs) =>
                                rs.map((r) =>
                                    r.id === categoryId
                                        ? { ...r, groupId, groupName }
                                        : r,
                                ),
                            )
                        }
                        onEditCategory={(id) => {
                            setSelectedCategoryId(id);
                            setActiveItem('category-settings');
                        }}
                        historyOpen={historyOpen}
                        onHistoryClose={() => setHistoryOpen(false)}
                    />
                </section>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. If `ManageCategoryRow` lacks `groupId`/`groupName`, match the field names used in the old `manage-page.tsx` `onRowGroupChange` (read it and mirror exactly).

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx"
git commit -m "feat(admin-console): console shell with sidebar + content layout"
```

---

## Task 5: Wire the server page

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/page.tsx`

Gate on *either* audience, load config + attention data, render `ConsoleShell`.

- [ ] **Step 1: Replace the file contents**

```tsx
import { subject as caslSubject } from '@casl/ability';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import { listManageCategories, listManageGroups } from '~src/lib/category-mgmt';
import { getGameIdentifiers } from '~src/lib/game-mgmt';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import { listGameReports } from '~src/lib/moderation/reports';
import { listQueue } from '~src/lib/moderation/triage';
import { defineAbilityFor } from '~src/rbac/ability';
import { isLowActivityCategory } from '~src/utils/format-stats';
import { mergeAttention } from './moderation/attention/attention-model';
import { ConsoleShell } from './console/console-shell';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function GameAdminConsolePage({ params }: Props) {
    const { game: slug } = await params;
    const session = await getSession();
    if (!session?.username || !session.id) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();

    const ability = defineAbilityFor(session);
    const canModerate = canModerateGame(session, game.name);
    const canConfigure = ability.can(
        'edit',
        caslSubject('category-settings', { game: game.name }),
    );
    const canEditStandards = ability.can('edit', 'moderators');
    if (!canModerate && !canConfigure) notFound();

    const sessionId = session.id;
    const { categories } = await resolveCategory(game.id);
    const categoryById = new Map(categories.map((c) => [c.id, c.display]));
    const categoryName = (id: number) => categoryById.get(id) ?? `Category ${id}`;

    const initialCategory =
        categories.find((c) => c.active !== false) ?? categories[0] ?? null;

    const [identifiers, rawRows, groups, queueItems, reports, manualTimes] =
        await Promise.all([
            getGameIdentifiers(game.id).catch(() => ({
                slug: null,
                abbreviation: null,
            })),
            listManageCategories(game.id).catch(() => []),
            listManageGroups(game.id).catch(() => []),
            listQueue(sessionId, game.id, { limit: 200 }).catch(() => null),
            listGameReports(sessionId, game.id).catch(() => null),
            listManualTimes(sessionId, game.id).catch(() => null),
        ]);

    const statsById = new Map(categories.map((c) => [c.id, c]));
    const rows = rawRows
        .map((r) => {
            const stats = statsById.get(r.id);
            return {
                ...r,
                totalRunTime: stats?.totalRunTime ?? 0,
                totalFinishedAttemptCount:
                    stats?.totalFinishedAttemptCount ?? 0,
                uniqueRunners: stats?.uniqueRunners ?? 0,
            };
        })
        .filter((r) => !isLowActivityCategory(r));

    const pendingClaims = (manualTimes ?? []).filter(
        (m) => m.verificationStatus === 'pending',
    );
    const attentionItems = mergeAttention(
        queueItems ?? [],
        reports ?? [],
        pendingClaims,
        categoryName,
    );

    return (
        <Suspense fallback={null}>
            <ConsoleShell
                game={game}
                categories={categories}
                flags={{ canModerate, canEditStandards, canConfigure }}
                attentionItems={attentionItems}
                initialCategoryId={initialCategory?.id ?? null}
                initialSlug={identifiers.slug}
                initialAbbreviation={identifiers.abbreviation}
                initialRows={rows}
                initialGroups={groups}
            />
        </Suspense>
    );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS. The route `/games-v2/[game]/manage` compiles. Resolve any type mismatch by matching the actual exported signatures of `listManageCategories`, `getGameIdentifiers`, `listManualTimes`, `listGameReports`, `listQueue` (all already used by the two old pages).

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/page.tsx"
git commit -m "feat(admin-console): mount console shell at /manage"
```

---

## Task 6: Manual verification

No automated UI tests exist; verify behavior in the running app. Use the `run` skill (or `npm run dev`) and the `verify` skill to confirm.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify as a board-admin (or admin)** — open `/games-v2/supermario64/manage`:
    - Sidebar shows **Moderate**, **Game**, and **Per category** groups.
    - "Needs attention" is the default pane and shows the queue with a count badge.
    - Switching items swaps the content pane; "Bans" and "History" render the existing components.
    - The **Per category** picker changes the selected category; Timing/Rules/Variables/Combinations/Category settings reflect it.
    - "Standards" renders and is editable; "Details & metadata" / "Moderators" show the "soon" placeholder.
    - Narrow the viewport: the ☰ button toggles the sidebar; selecting an item closes it.

- [ ] **Step 3: Verify gating** — with a per-game moderator who is *not* a board-admin (or reason through `buildNav`): only **Moderate** + **Per category → Standards** appear; Game items and other per-category config are hidden. With a category-settings-only admin: Game + Per category config appear, but **Standards** does not.

- [ ] **Step 4: Confirm no regression** — `/games-v2/[game]/manage/moderation` still loads and works (untouched).

- [ ] **Step 5: Final gates**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all PASS.

- [ ] **Step 6: Clear stale build cache** (per project convention after significant changes)

Run: `rm -rf .next`

---

## Self-review checklist (completed during authoring)

- **Spec coverage:** route at `/manage` (Task 5) ✓; sidebar IA + groups (Tasks 1–2) ✓; per-item permission gating — Standards visible to any moderator but editable only by board-admin (Task 1 `itemVisible` uses `canModerate` for visibility; Task 5 passes `canEditStandards` to the component) ✓; category context picker (Tasks 2,4) ✓; consistent Bootstrap shell (Tasks 2,4) ✓; reserved metadata/moderators slots (Task 1 `reserved`, Task 3 placeholders) ✓. Deferred-by-design (flagged): redirect, restyle, minimums consolidation, legacy deletion.
- **Placeholders:** none — all code blocks are complete; `Placeholder` is a real component, not a TODO.
- **Type consistency:** `NavItemId`/`NavFlags` defined in Task 1 are used unchanged in Tasks 2–5; `ConsoleShell` props (Task 4) match the `page.tsx` call (Task 5); `ContentRouter` props (Task 3) match the shell call (Task 4). Two call sites carry explicit "match the real component signature" guards (Tasks 3,4) because they consume pre-existing components.
```
