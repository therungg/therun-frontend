# Leaderboard Manage Page Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `/games-v2/[game]/manage` into two URL-synced tabs — "Game" (identifiers, cache, categories overview) and "Category" (left rail picker + per-category settings) — with the standalone `/manage/categories` sub-page absorbed into the Game tab and the per-category Visibility section collapsed into header-strip quick toggles.

**Architecture:** Server `page.tsx` reads `?tab` and `?categoryId`, preloads all data (categories list, identifiers, initial variables/minimums, manage-category rows). Client `manage-page.tsx` is a thin tab shell that mounts both `<GameTab>` and `<CategoryTab>` and toggles visibility via CSS (preserves form state). URL sync via `router.replace` with `scroll: false`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Bootstrap 5 utility classes, server actions, `react-toastify`. No test runner — verification is `npm run typecheck && npm run lint` plus manual UI checks. Spec: `docs/superpowers/specs/2026-05-19-leaderboard-manage-page-cleanup-design.md`.

---

## File Structure

**Created:**
- `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx` — Game-level container, stacks identifiers, cache, categories overview
- `app/(new-layout)/games-v2/[game]/manage/game-tab/categories-table.tsx` — table with search + filter chips + active/main toggles + "edit" link (absorbs `categories-page.tsx`)
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-tab.tsx` — Category-level container, two-column layout
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-rail.tsx` — left rail: search input + paginated category list
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-header-strip.tsx` — right-pane header: title + Active/Main quick toggles (replaces `VisibilitySection`)
- `app/(new-layout)/games-v2/[game]/manage/tab-strip.tsx` — small client component that renders the two `<Link>` pills and reflects the active tab from props

**Modified:**
- `app/(new-layout)/games-v2/[game]/manage/page.tsx` — read `searchParams`; preload `ManageCategoryRow[]`; pass `initialTab`, `initialCategoryIdFromUrl`, `initialRows`
- `app/(new-layout)/games-v2/[game]/manage/types.ts` — extend `ManagePageData` with new fields
- `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx` — convert into tab shell, URL sync, removes embedded button-row picker and `VisibilitySection`
- `app/(new-layout)/games-v2/[game]/header/game-header.tsx` — drop the `InvalidateCacheButton` (the Manage link stays)

**Deleted (last task, after verification):**
- `app/(new-layout)/games-v2/[game]/manage/categories/page.tsx`
- `app/(new-layout)/games-v2/[game]/manage/categories/categories-page.tsx`
- `app/(new-layout)/games-v2/[game]/manage/visibility/visibility-section.tsx`

**Kept untouched (reused as-is):**
- `IdentifiersSection`, `TimingSettingsSection`, `VariablesSection`, `CombinationsSection`, `MinimumsSection`
- `InvalidateCacheButton` (the component stays at its current path; the Game tab imports it directly so we don't churn move-then-edit)
- `updateVisibilityAction` (called from new `category-header-strip.tsx` and from `categories-table.tsx`)

---

## Task 1: Extend types and server-side preload

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/types.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/page.tsx`

- [ ] **Step 1: Extend `ManagePageData`**

In `app/(new-layout)/games-v2/[game]/manage/types.ts`, replace the file contents with:

```typescript
import type { MinimumTime } from '../../../../../types/leaderboard-minimums.types';
import type {
    ResolvedCategory,
    ResolvedGame,
    VariableDef,
} from '../../../../../types/leaderboards.types';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';

export type ManageTab = 'game' | 'category';

export interface ManagePageData {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    initialCategoryId: number;
    initialVariables: VariableDef[];
    initialMinimums: MinimumTime[];
    initialSlug: string | null;
    initialAbbreviation: string | null;
    initialRows: ManageCategoryRow[];
    initialTab: ManageTab;
}
```

- [ ] **Step 2: Update server `page.tsx` to read searchParams and preload rows**

Replace the contents of `app/(new-layout)/games-v2/[game]/manage/page.tsx` with:

```typescript
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { listManageCategories } from '~src/lib/category-mgmt';
import { getGameIdentifiers } from '~src/lib/game-mgmt';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listMinimumTimes } from '~src/lib/leaderboard-minimums';
import { getVariables } from '~src/lib/leaderboards-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ManagePage } from './manage-page';
import type { ManageTab } from './types';

interface Props {
    params: Promise<{ game: string }>;
    searchParams: Promise<{ tab?: string; categoryId?: string }>;
}

export default async function GameManagePage({ params, searchParams }: Props) {
    const { game: slug } = await params;
    const { tab, categoryId: categoryIdParam } = await searchParams;
    const user = await getSession();

    const game = await resolveGame(slug);
    if (!game) notFound();

    confirmPermission(user, 'edit', 'category-settings', { game: game.name });

    const { categories } = await resolveCategory(game.id);

    const requestedCategoryId = categoryIdParam
        ? Number.parseInt(categoryIdParam, 10)
        : Number.NaN;
    const requested = Number.isFinite(requestedCategoryId)
        ? categories.find((c) => c.id === requestedCategoryId)
        : undefined;
    const firstActive = categories.find((c) => c.active !== false);
    const initialCategory = requested ?? firstActive ?? categories[0] ?? null;

    const initialTab: ManageTab = tab === 'category' ? 'category' : 'game';

    const [
        initialIdentifiers,
        initialVariables,
        initialMinimums,
        initialRows,
    ] = await Promise.all([
        getGameIdentifiers(game.id).catch(() => ({
            slug: null,
            abbreviation: null,
        })),
        initialCategory
            ? getVariables(game.name, initialCategory.name)
                  .then((r) => r.variables)
                  .catch(() => [])
            : Promise.resolve([]),
        initialCategory
            ? listMinimumTimes(user.id, game.id, initialCategory.id).catch(
                  () => [],
              )
            : Promise.resolve([]),
        listManageCategories(game.id).catch(() => []),
    ]);

    return (
        <ManagePage
            data={{
                game,
                categories,
                initialCategoryId: initialCategory?.id ?? -1,
                initialVariables,
                initialMinimums,
                initialSlug: initialIdentifiers.slug,
                initialAbbreviation: initialIdentifiers.abbreviation,
                initialRows,
                initialTab,
            }}
        />
    );
}
```

Note: `ResolvedCategory` may or may not have an `active` field on this type; if `c.active !== false` doesn't compile, drop it to `firstActive = categories[0]` — the bulk-edit table on the Game tab gives admins archive control, this fallback only matters for first-visit default.

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors. If `c.active` is not a field on `ResolvedCategory`, drop the `firstActive` line and use `categories[0]` instead.

- [ ] **Step 4: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/types.ts \
       app/\(new-layout\)/games-v2/\[game\]/manage/page.tsx
git commit -m "feat(leaderboard-manage): preload tab/category-row state from URL"
```

---

## Task 2: Tab shell — convert `manage-page.tsx` into two-tab container

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/tab-strip.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`

This task replaces the entire body of `manage-page.tsx` with a shell that mounts placeholder content for both tabs. The actual Game-tab and Category-tab components come in Tasks 3 and 4 — we wire them in then. For now, render `<div>Game tab placeholder</div>` and `<div>Category tab placeholder</div>` so we can verify URL sync and tab switching in isolation.

- [ ] **Step 1: Create `tab-strip.tsx`**

Create `app/(new-layout)/games-v2/[game]/manage/tab-strip.tsx`:

```typescript
'use client';

import type { ManageTab } from './types';

interface Props {
    activeTab: ManageTab;
    onChange: (tab: ManageTab) => void;
}

export function TabStrip({ activeTab, onChange }: Props) {
    return (
        <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
                <button
                    type="button"
                    className={`nav-link ${activeTab === 'game' ? 'active' : ''}`}
                    onClick={() => onChange('game')}
                >
                    Game
                </button>
            </li>
            <li className="nav-item">
                <button
                    type="button"
                    className={`nav-link ${activeTab === 'category' ? 'active' : ''}`}
                    onClick={() => onChange('category')}
                >
                    Category
                </button>
            </li>
        </ul>
    );
}
```

- [ ] **Step 2: Replace `manage-page.tsx` with the tab shell**

Replace contents of `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { TabStrip } from './tab-strip';
import type { ManagePageData, ManageTab } from './types';

interface Props {
    data: ManagePageData;
}

export function ManagePage({ data }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<ManageTab>(data.initialTab);
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        data.initialCategoryId,
    );

    const updateUrl = useCallback(
        (nextTab: ManageTab, nextCategoryId: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', nextTab);
            if (nextTab === 'category' && nextCategoryId > 0) {
                params.set('categoryId', String(nextCategoryId));
            } else {
                params.delete('categoryId');
            }
            router.replace(`${pathname}?${params.toString()}`, {
                scroll: false,
            });
        },
        [pathname, router, searchParams],
    );

    const handleTabChange = (next: ManageTab) => {
        setActiveTab(next);
        updateUrl(next, selectedCategoryId);
    };

    const handleCategorySelect = (next: number) => {
        setSelectedCategoryId(next);
        updateUrl(activeTab, next);
    };

    return (
        <div>
            <header className="d-flex align-items-center gap-3 mb-3">
                {data.game.image && (
                    <img
                        src={data.game.image}
                        alt={data.game.display}
                        width={48}
                        height={64}
                        className="rounded"
                        style={{ aspectRatio: '3 / 4' }}
                        loading="eager"
                    />
                )}
                <div>
                    <small className="text-muted d-block">Management</small>
                    <h1 className="mb-0">{data.game.display}</h1>
                </div>
                <div className="ms-auto d-flex gap-2">
                    <Link
                        href={`/games-v2/${data.game.name}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        ← Back to leaderboards
                    </Link>
                </div>
            </header>

            <TabStrip activeTab={activeTab} onChange={handleTabChange} />

            <div hidden={activeTab !== 'game'}>
                <div>Game tab placeholder</div>
            </div>
            <div hidden={activeTab !== 'category'}>
                <div>Category tab placeholder</div>
            </div>
        </div>
    );
}
```

Note: Both panels are always mounted; the `hidden` attribute swaps visibility without unmounting, so in-progress edits in one tab survive a tab switch.

- [ ] **Step 3: Verify build and manual smoke**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

Then run `npm run dev` and load `/games-v2/<any-existing-game>/manage`:
- Verify the header still renders with image + display name
- Verify clicking "Game" / "Category" tab buttons switches the placeholder content and updates the URL to include `?tab=...`
- Verify reloading the page on `?tab=category` opens on the Category tab

- [ ] **Step 4: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/tab-strip.tsx \
       app/\(new-layout\)/games-v2/\[game\]/manage/manage-page.tsx
git commit -m "feat(leaderboard-manage): tab shell with URL sync"
```

---

## Task 3: Game tab — identifiers, cache, categories overview

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/game-tab/categories-table.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`

- [ ] **Step 1: Create `categories-table.tsx`**

Create `app/(new-layout)/games-v2/[game]/manage/game-tab/categories-table.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';

type Filter = 'all' | 'active' | 'archived';

interface Props {
    game: ResolvedGame;
    initialRows: ManageCategoryRow[];
    onEdit: (categoryId: number) => void;
}

export function CategoriesTable({ game, initialRows, onEdit }: Props) {
    const [rows, setRows] = useState<ManageCategoryRow[]>(initialRows);
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [_isPending, startTransition] = useTransition();

    const normalized = query.trim().toLowerCase();
    const visibleRows = rows.filter((r) => {
        if (filter === 'active' && !r.active) return false;
        if (filter === 'archived' && r.active) return false;
        if (!normalized) return true;
        return (
            r.display.toLowerCase().includes(normalized) ||
            (r.groupName?.toLowerCase().includes(normalized) ?? false)
        );
    });

    const setPending = (id: number, pending: boolean) => {
        setPendingIds((prev) => {
            const next = new Set(prev);
            if (pending) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const toggle = (
        row: ManageCategoryRow,
        field: 'isMain' | 'active',
        value: boolean,
    ) => {
        const prevValue = row[field];
        setPending(row.id, true);
        setRows((rs) =>
            rs.map((r) => (r.id === row.id ? { ...r, [field]: value } : r)),
        );
        startTransition(async () => {
            const res = await updateVisibilityAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: row.id,
                ...(field === 'isMain' ? { isMain: value } : {}),
                ...(field === 'active' ? { active: value } : {}),
            });
            setPending(row.id, false);
            if ('error' in res) {
                toast.error(res.error);
                setRows((rs) =>
                    rs.map((r) =>
                        r.id === row.id ? { ...r, [field]: prevValue } : r,
                    ),
                );
                return;
            }
            toast.success(
                field === 'isMain'
                    ? value
                        ? `${row.display}: marked main`
                        : `${row.display}: unmarked main`
                    : value
                      ? `${row.display}: activated`
                      : `${row.display}: archived`,
            );
        });
    };

    return (
        <section className="mb-4">
            <h2 className="h5 mb-2">Categories</h2>
            <p className="text-muted small mb-2">
                Bulk-manage which categories are visible and which are marked
                main. Use “Edit” to open a category for detailed settings.
            </p>

            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <input
                    type="search"
                    className="form-control form-control-sm"
                    placeholder="Search categories…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ maxWidth: 240 }}
                />
                <span className="text-muted small">Show:</span>
                {(['all', 'active', 'archived'] as Filter[]).map((f) => (
                    <button
                        key={f}
                        type="button"
                        className={`btn btn-sm ${
                            filter === f
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                        }`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
                <span className="ms-auto text-muted small">
                    {visibleRows.length} of {rows.length}
                </span>
            </div>

            {visibleRows.length === 0 ? (
                <p className="text-muted text-center my-4">
                    No categories match.
                </p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Group</th>
                                <th className="text-center">Main</th>
                                <th className="text-center">Active</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row) => {
                                const isPending = pendingIds.has(row.id);
                                return (
                                    <tr
                                        key={row.id}
                                        className={
                                            row.active ? '' : 'text-muted'
                                        }
                                    >
                                        <td>{row.display}</td>
                                        <td>
                                            {row.groupName ?? (
                                                <span className="text-muted">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={row.isMain}
                                                disabled={
                                                    isPending || !row.active
                                                }
                                                onChange={(e) =>
                                                    toggle(
                                                        row,
                                                        'isMain',
                                                        e.target.checked,
                                                    )
                                                }
                                                aria-label={`Main: ${row.display}`}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={row.active}
                                                disabled={isPending}
                                                onChange={(e) =>
                                                    toggle(
                                                        row,
                                                        'active',
                                                        e.target.checked,
                                                    )
                                                }
                                                aria-label={`Active: ${row.display}`}
                                            />
                                        </td>
                                        <td className="text-end">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-link"
                                                onClick={() => onEdit(row.id)}
                                            >
                                                Edit →
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="text-muted small mb-0">
                Tip: a “main” category shows by default on the game page. If no
                main categories are set, the first 5 categories show by default
                and the rest go behind a toggle.
            </p>
        </section>
    );
}
```

- [ ] **Step 2: Create `game-tab.tsx`**

Create `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx`:

```typescript
'use client';

import type { ManageCategoryRow } from '~src/lib/category-mgmt';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { InvalidateCacheButton } from '../../header/invalidate-cache-button';
import { IdentifiersSection } from '../identifiers/identifiers-section';
import { CategoriesTable } from './categories-table';

interface Props {
    game: ResolvedGame;
    initialSlug: string | null;
    initialAbbreviation: string | null;
    initialRows: ManageCategoryRow[];
    onEditCategory: (categoryId: number) => void;
}

export function GameTab({
    game,
    initialSlug,
    initialAbbreviation,
    initialRows,
    onEditCategory,
}: Props) {
    return (
        <div>
            <IdentifiersSection
                gameSlug={game.name}
                gameId={game.id}
                initialSlug={initialSlug}
                initialAbbreviation={initialAbbreviation}
            />

            <section className="mb-4">
                <h2 className="h5 mb-2">Cache</h2>
                <p className="text-muted small mb-2">
                    Clear the cached leaderboards for this game. Next read of
                    each board will re-warm from Postgres.
                </p>
                <InvalidateCacheButton gameSlug={game.name} gameId={game.id} />
            </section>

            <CategoriesTable
                game={game}
                initialRows={initialRows}
                onEdit={onEditCategory}
            />
        </div>
    );
}
```

- [ ] **Step 3: Wire `GameTab` into `manage-page.tsx`**

Edit `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`. Replace the import block at the top with:

```typescript
'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { GameTab } from './game-tab/game-tab';
import { TabStrip } from './tab-strip';
import type { ManagePageData, ManageTab } from './types';
```

Replace the Game-tab placeholder `<div hidden={activeTab !== 'game'}>` block with:

```typescript
            <div hidden={activeTab !== 'game'}>
                <GameTab
                    game={data.game}
                    initialSlug={data.initialSlug}
                    initialAbbreviation={data.initialAbbreviation}
                    initialRows={data.initialRows}
                    onEditCategory={(id) => {
                        setSelectedCategoryId(id);
                        setActiveTab('category');
                        updateUrl('category', id);
                    }}
                />
            </div>
```

- [ ] **Step 4: Verify typecheck, lint, and manual checks**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

Manual on `/games-v2/<game>/manage?tab=game`:
- Identifiers section renders and saves
- "Clear cache" button works (toast on success)
- Categories table renders with all rows, search filters by name/group, filter chips work
- Toggling Active/Main updates the row optimistically and surfaces a toast
- Clicking "Edit →" switches to the Category tab and updates URL to `?tab=category&categoryId=N`

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/game-tab/ \
       app/\(new-layout\)/games-v2/\[game\]/manage/manage-page.tsx
git commit -m "feat(leaderboard-manage): Game tab with identifiers, cache, and categories overview"
```

---

## Task 4: Category tab — rail, header strip, and existing sections

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/category-tab/category-rail.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/category-tab/category-header-strip.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/category-tab/category-tab.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`

- [ ] **Step 1: Create `category-rail.tsx`**

Create `app/(new-layout)/games-v2/[game]/manage/category-tab/category-rail.tsx`:

```typescript
'use client';

import { useMemo, useState } from 'react';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';

const PAGE_SIZE = 25;

interface Props {
    rows: ManageCategoryRow[];
    selectedCategoryId: number;
    onSelect: (categoryId: number) => void;
}

export function CategoryRail({ rows, selectedCategoryId, onSelect }: Props) {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            (r) =>
                r.display.toLowerCase().includes(q) ||
                (r.groupName?.toLowerCase().includes(q) ?? false),
        );
    }, [rows, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pageRows = filtered.slice(
        safePage * PAGE_SIZE,
        (safePage + 1) * PAGE_SIZE,
    );

    return (
        <aside
            className="border rounded p-2"
            style={{ position: 'sticky', top: '1rem', maxHeight: '80vh' }}
        >
            <input
                type="search"
                className="form-control form-control-sm mb-2"
                placeholder="Filter categories…"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                }}
            />
            <div
                className="d-flex flex-column gap-1 overflow-auto"
                style={{ maxHeight: 'calc(80vh - 7rem)' }}
            >
                {pageRows.length === 0 ? (
                    <p className="text-muted small text-center my-3 mb-0">
                        No matches.
                    </p>
                ) : (
                    pageRows.map((row) => {
                        const selected = row.id === selectedCategoryId;
                        return (
                            <button
                                key={row.id}
                                type="button"
                                className={`btn btn-sm text-start ${
                                    selected
                                        ? 'btn-primary'
                                        : 'btn-outline-secondary'
                                }`}
                                onClick={() => onSelect(row.id)}
                            >
                                <div className="d-flex justify-content-between align-items-center">
                                    <span
                                        className={
                                            row.active ? '' : 'text-muted'
                                        }
                                    >
                                        {row.display}
                                    </span>
                                    <span className="d-flex gap-1">
                                        {row.isMain && (
                                            <span className="badge bg-info">
                                                Main
                                            </span>
                                        )}
                                        {!row.active && (
                                            <span className="badge bg-secondary">
                                                Archived
                                            </span>
                                        )}
                                    </span>
                                </div>
                                {row.groupName && (
                                    <small className="d-block text-muted">
                                        {row.groupName}
                                    </small>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
            {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={safePage === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                        ← Prev
                    </button>
                    <small className="text-muted">
                        {safePage + 1} / {totalPages}
                    </small>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={safePage >= totalPages - 1}
                        onClick={() =>
                            setPage((p) => Math.min(totalPages - 1, p + 1))
                        }
                    >
                        Next →
                    </button>
                </div>
            )}
        </aside>
    );
}
```

- [ ] **Step 2: Create `category-header-strip.tsx`**

Create `app/(new-layout)/games-v2/[game]/manage/category-tab/category-header-strip.tsx`. This replaces `VisibilitySection`: it loads visibility for the selected category, renders Active/Main toggles inline with the heading, and writes via the existing actions.

```typescript
'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { loadVisibilityAction } from '../visibility/actions/load-visibility.action';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
    onVisibilityChange?: (categoryId: number, patch: {
        isMain?: boolean;
        active?: boolean;
    }) => void;
}

interface State {
    isMain: boolean;
    active: boolean;
}

const DEFAULT_STATE: State = { isMain: false, active: true };

export function CategoryHeaderStrip({
    gameSlug,
    gameId,
    category,
    onVisibilityChange,
}: Props) {
    const [state, setState] = useState<State>(DEFAULT_STATE);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, startLoad] = useTransition();
    const [isSaving, startSave] = useTransition();

    useEffect(() => {
        if (!category) return;
        startLoad(async () => {
            const res = await loadVisibilityAction({
                gameSlug,
                gameId,
                categoryId: category.id,
            });
            if ('error' in res) {
                setLoadError(res.error);
                setState(DEFAULT_STATE);
                return;
            }
            setLoadError(null);
            setState({
                isMain: res.result.isMain,
                active: res.result.active,
            });
        });
    }, [category, gameSlug, gameId]);

    if (!category) {
        return null;
    }

    const toggle = (field: 'isMain' | 'active', value: boolean) => {
        const prev = state;
        const next = { ...state, [field]: value };
        setState(next);
        startSave(async () => {
            const res = await updateVisibilityAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                ...(field === 'isMain' ? { isMain: value } : {}),
                ...(field === 'active' ? { active: value } : {}),
            });
            if ('error' in res) {
                toast.error(res.error);
                setState(prev);
                return;
            }
            toast.success(
                field === 'isMain'
                    ? value
                        ? 'Marked main'
                        : 'Unmarked main'
                    : value
                      ? 'Activated'
                      : 'Archived',
            );
            onVisibilityChange?.(category.id, { [field]: value });
        });
    };

    const disabled = isLoading || isSaving;

    return (
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3 pb-3 border-bottom">
            <div>
                <h2 className="h4 mb-1">
                    {category.display}
                    {state.isMain && (
                        <span className="badge bg-info ms-2">Main</span>
                    )}
                    {!state.active && (
                        <span className="badge bg-secondary ms-2">
                            Archived
                        </span>
                    )}
                </h2>
                {loadError && (
                    <small className="text-danger">{loadError}</small>
                )}
            </div>
            <div className="ms-auto d-flex gap-3">
                <div className="form-check">
                    <input
                        id="cat-active"
                        type="checkbox"
                        className="form-check-input"
                        checked={state.active}
                        disabled={disabled}
                        onChange={(e) => toggle('active', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="cat-active">
                        Active
                    </label>
                </div>
                <div className="form-check">
                    <input
                        id="cat-main"
                        type="checkbox"
                        className="form-check-input"
                        checked={state.isMain}
                        disabled={disabled || !state.active}
                        onChange={(e) => toggle('isMain', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="cat-main">
                        Main
                    </label>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Create `category-tab.tsx`**

Create `app/(new-layout)/games-v2/[game]/manage/category-tab/category-tab.tsx`:

```typescript
'use client';

import { useMemo } from 'react';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import { MinimumsSection } from '../minimums/minimums-section';
import { TimingSettingsSection } from '../timing/timing-settings-section';
import type { ManagePageData } from '../types';
import { CombinationsSection } from '../variables/combinations-section';
import { VariablesSection } from '../variables/variables-section';
import { CategoryHeaderStrip } from './category-header-strip';
import { CategoryRail } from './category-rail';

interface Props {
    data: ManagePageData;
    rows: ManageCategoryRow[];
    selectedCategoryId: number;
    onSelectCategory: (id: number) => void;
}

export function CategoryTab({
    data,
    rows,
    selectedCategoryId,
    onSelectCategory,
}: Props) {
    const selected: ResolvedCategory | null = useMemo(
        () => data.categories.find((c) => c.id === selectedCategoryId) ?? null,
        [data.categories, selectedCategoryId],
    );

    if (data.categories.length === 0) {
        return (
            <p className="text-center text-muted my-5">
                No categories to edit yet. Add one from the Game tab.
            </p>
        );
    }

    return (
        <div className="row g-3">
            <div className="col-12 col-md-4 col-lg-3">
                <CategoryRail
                    rows={rows}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={onSelectCategory}
                />
            </div>
            <div className="col-12 col-md-8 col-lg-9">
                {selected ? (
                    <>
                        <CategoryHeaderStrip
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            category={selected}
                        />
                        <TimingSettingsSection
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            category={selected}
                        />
                        <VariablesSection
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            selectedCategory={selected}
                        />
                        <CombinationsSection
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            selectedCategory={selected}
                        />
                        <MinimumsSection
                            data={data}
                            selectedCategory={selected}
                        />
                    </>
                ) : (
                    <p className="text-muted">
                        Pick a category from the list to edit.
                    </p>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Wire `CategoryTab` into `manage-page.tsx`**

Edit `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`:

Add to imports:

```typescript
import { CategoryTab } from './category-tab/category-tab';
```

Replace the Category-tab placeholder block with:

```typescript
            <div hidden={activeTab !== 'category'}>
                <CategoryTab
                    data={data}
                    rows={data.initialRows}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={(id) => {
                        setSelectedCategoryId(id);
                        updateUrl('category', id);
                    }}
                />
            </div>
```

- [ ] **Step 5: Verify typecheck, lint, and manual checks**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

Manual on `/games-v2/<game>/manage?tab=category`:
- Left rail shows all categories with badges, search filters them, pagination renders only when >25 rows
- Right pane shows category title + Active/Main toggles, badges reflect state
- Toggling Active or Main updates and toasts
- Selecting another category in the rail updates the right pane, URL gets `categoryId=N`
- Existing timing/variables/combinations/minimums sections still render and save
- Coming in via Edit from the Game tab opens that category preselected

- [ ] **Step 6: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/category-tab/ \
       app/\(new-layout\)/games-v2/\[game\]/manage/manage-page.tsx
git commit -m "feat(leaderboard-manage): Category tab with rail picker and quick-toggle header"
```

---

## Task 5: Remove invalidate-cache button from game header

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/game-header.tsx`

- [ ] **Step 1: Read the file to locate the button**

Open `app/(new-layout)/games-v2/[game]/header/game-header.tsx`. Identify the `<InvalidateCacheButton ... />` usage and its import.

- [ ] **Step 2: Remove the import and the button usage**

- Delete the line `import { InvalidateCacheButton } from './invalidate-cache-button';`
- Delete the JSX block that renders `<InvalidateCacheButton ... />`
- If the surrounding `{(canManage || canInvalidateCache) && ( ... )}` group renders only the button when `canManage` is false, simplify to `{canManage && ( ... Manage link only ... )}`. The `canInvalidateCache` prop becomes unused; remove it from the props interface and from the JSX.

Search for callers of `<GameHeader>` and remove the `canInvalidateCache` prop they pass:

```bash
grep -rn "canInvalidateCache" app src
```

Update each caller to stop passing it (and stop computing it if the variable becomes dead).

- [ ] **Step 3: Verify typecheck, lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual check**

Load any game page (not the manage page). Verify the header no longer shows a "Clear cache" button; "Manage" link still shows for admins.

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/header/game-header.tsx
# also any caller files modified
git commit -m "refactor(game-header): move cache invalidation to manage page"
```

---

## Task 6: Delete obsolete files and add redirect

**Files:**
- Delete: `app/(new-layout)/games-v2/[game]/manage/categories/page.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/manage/categories/categories-page.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/manage/visibility/visibility-section.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/categories/page.tsx` (replacement: redirect)

- [ ] **Step 1: Search for any remaining usages**

Run:

```bash
grep -rn "VisibilitySection\|CategoriesQuickManagePage\|manage/categories" app src
```

Confirm the only remaining references to `VisibilitySection` are the soon-to-be-deleted file itself and that no other file imports `CategoriesQuickManagePage`. If other files still import `VisibilitySection`, stop and remove those usages before continuing.

- [ ] **Step 2: Delete the obsolete files**

```bash
rm app/\(new-layout\)/games-v2/\[game\]/manage/visibility/visibility-section.tsx
rm app/\(new-layout\)/games-v2/\[game\]/manage/categories/categories-page.tsx
rm app/\(new-layout\)/games-v2/\[game\]/manage/categories/page.tsx
```

The `visibility/actions/*` files stay — they're still used by `category-header-strip.tsx` and `categories-table.tsx`.

- [ ] **Step 3: Add a redirect at the old sub-page path**

Create `app/(new-layout)/games-v2/[game]/manage/categories/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function RedirectToManageGameTab({ params }: Props) {
    const { game } = await params;
    redirect(`/games-v2/${game}/manage?tab=game`);
}
```

- [ ] **Step 4: Verify typecheck, lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual check**

- Visit `/games-v2/<game>/manage/categories` — verify it redirects to `/manage?tab=game`
- Verify nothing on the page errors about a missing `VisibilitySection`

- [ ] **Step 6: Clear Next build cache and re-verify**

```bash
rm -rf .next
npm run dev
```

Visit `/manage`, switch tabs, edit a category, ensure no console errors.

- [ ] **Step 7: Commit**

```bash
git add -A app/\(new-layout\)/games-v2/\[game\]/manage/
git commit -m "refactor(leaderboard-manage): drop obsolete sub-page and visibility section"
```

---

## Task 7: Mark spec implemented and final verification

**Files:**
- Modify: `docs/superpowers/specs/2026-05-19-leaderboard-manage-page-cleanup-design.md`

- [ ] **Step 1: Append implementation marker to the spec**

At the very bottom of `docs/superpowers/specs/2026-05-19-leaderboard-manage-page-cleanup-design.md`, append:

```markdown

---

## Implementation status

Implemented 2026-05-19 on branch `feat/leaderboard-run-management`. Game-tab "Game details" section deferred — backend `PUT /v1/games/:id` currently only accepts `slug`/`abbreviation`.
```

(Adjust the deferred-section note if the engineer ended up wiring "Game details" — see Open questions in spec.)

- [ ] **Step 2: Final verification pass**

```bash
npm run typecheck
npm run lint
```

Both should pass. Then manually walk through this checklist on a real game:

1. `/games-v2/<game>/manage` lands on Game tab by default
2. Identifiers save and persist after reload
3. "Clear cache" toasts on success
4. Categories table: search, filter chips, Active/Main toggles, "Edit →" all work
5. "Edit →" lands on Category tab with that category preselected and `?categoryId=N` in URL
6. Category tab: rail search/pagination, Active/Main header toggles, Timing/Variables/Combinations/Minimums sections all save
7. `/manage/categories` redirects to `/manage?tab=game`
8. Game header (non-manage page) no longer shows "Clear cache" button

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-leaderboard-manage-page-cleanup-design.md
git commit -m "docs(leaderboard-manage): mark spec implemented"
```
