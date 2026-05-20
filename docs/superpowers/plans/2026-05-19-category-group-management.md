# Category Group Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add group management UI to the game manage page (create/rename/delete/reorder + assign categories) and render the public game-page category pills split into labeled sections by group when more than one group exists.

**Architecture:** All backend endpoints already exist (`/v1/games/:gameId/groups` CRUD + `/groups/reorder`; assignment via `PUT /categories/:catId { groupId }`). Frontend adds a `category-group-mgmt` data lib, one server action per mutation (gated through the existing `confirmPermission(user, 'edit', 'category-settings', { game })` pattern — backend enforces the more specific `create-edit-group` permission), a new `GroupsSection` UI on the Game tab, and inline + bulk assignment in the Categories table. `resolveCategory` and `ResolvedCategory` are extended to surface `groupId`/`groupName` + a `groups` list, consumed by `CategoryPills`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Bootstrap (`btn`, `form-control`, table classes), `react-toastify`, native HTML5 drag events.

**Verification model:** This codebase has no unit-test framework for UI/server actions. Every code task ends with `npm run typecheck && npm run lint` and a short manual smoke test described inline. The final task lists the full smoke pass.

**Reference spec:** `docs/superpowers/specs/2026-05-19-category-group-management-design.md`

---

## Task 1: Extend types and `resolveCategory` to carry group info

**Files:**
- Modify: `types/leaderboards.types.ts`
- Modify: `src/lib/games-v1.ts`

- [ ] **Step 1: Extend `ResolvedCategory` and add `ResolvedGroup`**

In `types/leaderboards.types.ts`, add `groupId`/`groupName` to `ResolvedCategory` and a new `ResolvedGroup` interface:

```typescript
export interface ResolvedGroup {
    id: number;
    name: string;
    sortOrder: number;
}

export interface ResolvedCategory {
    id: number;
    name: string;
    display: string;
    primaryTiming: 'rt' | 'gt';
    sortAscending?: boolean;
    isMain?: boolean;
    active?: boolean;
    groupId?: number | null;
    groupName?: string | null;
    totalRunTime?: number;
    totalAttemptCount?: number;
    totalFinishedAttemptCount?: number;
    uniqueRunners?: number;
}
```

- [ ] **Step 2: Plumb group data through `resolveCategory`**

In `src/lib/games-v1.ts`:

1. Widen `PageDataCategoryFlags` to include `groupId` and the parent `groups` block:

```typescript
interface PageDataCategoryFlags {
    id: number;
    isMain?: boolean;
    active?: boolean;
}

interface PageDataGroup {
    id: number;
    name: string;
    sortOrder?: number;
    categories?: PageDataCategoryFlags[];
}

interface PageDataForCats {
    ungroupedCategories?: PageDataCategoryFlags[];
    groups?: PageDataGroup[];
}
```

2. Build a `groupByCategoryId: Map<number, { id: number; name: string }>` alongside the existing `flagsById`. Don't set entries for ungrouped categories.

3. Change the return type to `{ categories: ResolvedCategory[]; selected: ResolvedCategory | null; groups: ResolvedGroup[] }` and populate `groups` from `pageDataResp.result?.groups` sorted by `sortOrder ?? 0` ascending.

4. When building each `ResolvedCategory`, populate `groupId` / `groupName` from the new map (default `null`).

Replace the existing `flagsById`/`collect` block with:

```typescript
const flagsById = new Map<number, { isMain: boolean; active: boolean }>();
const groupByCatId = new Map<number, { id: number; name: string }>();
for (const c of pageDataResp.result?.ungroupedCategories ?? []) {
    flagsById.set(c.id, {
        isMain: c.isMain ?? false,
        active: c.active ?? true,
    });
}
for (const g of pageDataResp.result?.groups ?? []) {
    for (const c of g.categories ?? []) {
        flagsById.set(c.id, {
            isMain: c.isMain ?? false,
            active: c.active ?? true,
        });
        groupByCatId.set(c.id, { id: g.id, name: g.name });
    }
}

const groups: ResolvedGroup[] = (pageDataResp.result?.groups ?? [])
    .map((g) => ({ id: g.id, name: g.name, sortOrder: g.sortOrder ?? 0 }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
```

And in the `categories.map((r) => ...)` block, add:

```typescript
const grp = groupByCatId.get(r.category_id) ?? null;
return {
    // ...existing fields...
    groupId: grp?.id ?? null,
    groupName: grp?.name ?? null,
    // ...
};
```

Update the return:

```typescript
return { categories, selected, groups };
```

- [ ] **Step 3: Update all `resolveCategory` callers**

Search and patch destructuring to keep ignoring `groups` where it isn't needed:

Files (from `grep -rn "resolveCategory(" --include="*.ts" --include="*.tsx"`):
- `app/(new-layout)/games-v2/[game]/data.ts`
- `app/(new-layout)/games-v2/[game]/actions/invalidate-cache.action.ts`
- `app/(new-layout)/games-v2/[game]/manage/page.tsx`
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/reject-run.action.ts`
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/exclude-user.action.ts`
- `app/(new-layout)/games-v2/[game]/manage/variables/actions/save-combinations.action.ts`
- `app/(new-layout)/games-v2/[game]/manage/variables/actions/update-variable.action.ts`
- `app/(new-layout)/games-v2/[game]/manage/variables/actions/create-variable.action.ts`

Each currently destructures `{ categories, selected? }`. They stay valid — `groups` is just an additional property. No changes required unless TypeScript flags the return shape mismatch.

In `app/(new-layout)/games-v2/[game]/data.ts`, where the function returns the resolved value, **also expose `groups`** so the public page can pass it to `CategoryPills`:

```typescript
// In whatever the resolver returns from data.ts, include `groups: resolved.groups`.
```

Open `app/(new-layout)/games-v2/[game]/data.ts` and verify the field is propagated through whatever type `data` uses (likely typed inline). If a `GamePageData` interface exists in that file, add `groups: ResolvedGroup[]` to it and to the returned object.

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Fix any signature mismatches surfaced.

- [ ] **Step 5: Commit**

```bash
git add types/leaderboards.types.ts src/lib/games-v1.ts \
        "app/(new-layout)/games-v2/[game]/data.ts"
git commit -m "feat(category-groups): surface group info on ResolvedCategory and resolveCategory"
```

---

## Task 2: Add `listManageGroups` data helper

**Files:**
- Modify: `src/lib/category-mgmt.ts` (extend) — or new file: `src/lib/category-group-mgmt.ts`

We'll keep it in `src/lib/category-mgmt.ts` to avoid a new file just for one function (the existing `loadPageData` is already private there and we want to reuse it).

- [ ] **Step 1: Add `ManageGroup` type and `listManageGroups`**

Append to `src/lib/category-mgmt.ts`:

```typescript
export interface ManageGroup {
    id: number;
    name: string;
    sortOrder: number;
}

export async function listManageGroups(
    gameId: number,
): Promise<ManageGroup[]> {
    const data = await loadPageData(gameId);
    return (data.groups ?? [])
        .map((g) => ({
            id: g.id,
            name: g.name,
            sortOrder: (g as { sortOrder?: number }).sortOrder ?? 0,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
}
```

And widen the existing `GamePageData` interface in the same file:

```typescript
interface GamePageData {
    game?: { id: number };
    ungroupedCategories?: GameCategoryRow[];
    groups?: {
        id: number;
        name: string;
        sortOrder?: number;
        categories?: GameCategoryRow[];
    }[];
}
```

- [ ] **Step 2: Add CRUD wrappers (used by actions in Task 3)**

Still in `src/lib/category-mgmt.ts`, append:

```typescript
export interface CreateGroupBody {
    name: string;
    sortOrder?: number;
    hiddenByDefault?: boolean;
}

export interface UpdateGroupBody {
    name?: string;
    sortOrder?: number;
    hiddenByDefault?: boolean;
}

export async function createGroup(
    sessionId: string,
    gameId: number,
    body: CreateGroupBody,
): Promise<{ id: number }> {
    return apiFetch<{ id: number }>(`/v1/games/${gameId}/groups`, {
        method: 'POST',
        sessionId,
        body,
    });
}

export async function updateGroup(
    sessionId: string,
    gameId: number,
    groupId: number,
    body: UpdateGroupBody,
): Promise<{ updated: boolean }> {
    return apiFetch<{ updated: boolean }>(
        `/v1/games/${gameId}/groups/${groupId}`,
        { method: 'PUT', sessionId, body },
    );
}

export async function deleteGroup(
    sessionId: string,
    gameId: number,
    groupId: number,
): Promise<{ deleted: boolean }> {
    return apiFetch<{ deleted: boolean }>(
        `/v1/games/${gameId}/groups/${groupId}`,
        { method: 'DELETE', sessionId },
    );
}

export async function reorderGroups(
    sessionId: string,
    gameId: number,
    groupIds: number[],
): Promise<{ reordered: boolean }> {
    return apiFetch<{ reordered: boolean }>(
        `/v1/games/${gameId}/groups/reorder`,
        { method: 'PUT', sessionId, body: { groupIds } },
    );
}
```

Update `UpdateCategoryBody` to allow `groupId`:

```typescript
export interface UpdateCategoryBody {
    primaryTiming?: PrimaryTiming;
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    isMain?: boolean;
    active?: boolean;
    groupId?: number | null;
}
```

(`updateCategory` already serializes the body verbatim — nothing else to change.)

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/category-mgmt.ts
git commit -m "feat(category-groups): data helpers and CRUD wrappers"
```

---

## Task 3: Server actions

**Files:**
- Create: `src/actions/category-group/create-group.action.ts`
- Create: `src/actions/category-group/rename-group.action.ts`
- Create: `src/actions/category-group/delete-group.action.ts`
- Create: `src/actions/category-group/reorder-groups.action.ts`
- Create: `src/actions/category-group/assign-category-group.action.ts`

All actions follow the exact pattern used in `app/(new-layout)/games-v2/[game]/manage/visibility/actions/update-visibility.action.ts`. Backend invalidation tag is `game-cats:${gameId}` plus the manage-rows tag if any (matching what `updateVisibilityAction` does — it only revalidates `game-cats:${gameId}`).

- [ ] **Step 1: `create-group.action.ts`**

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createGroup } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    name: string;
}

export async function createGroupAction(
    input: Input,
): Promise<{ result: { id: number } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    const name = input.name.trim();
    if (!name) return { error: 'Group name is required.' };

    try {
        const result = await createGroup(user.id, input.gameId, { name });
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create group.' };
    }
}
```

- [ ] **Step 2: `rename-group.action.ts`**

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateGroup } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    groupId: number;
    name: string;
}

export async function renameGroupAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    const name = input.name.trim();
    if (!name) return { error: 'Group name is required.' };

    try {
        const result = await updateGroup(
            user.id,
            input.gameId,
            input.groupId,
            { name },
        );
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to rename group.' };
    }
}
```

- [ ] **Step 3: `delete-group.action.ts`**

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { deleteGroup } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    groupId: number;
}

export async function deleteGroupAction(
    input: Input,
): Promise<{ result: { deleted: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    try {
        const result = await deleteGroup(user.id, input.gameId, input.groupId);
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to delete group.' };
    }
}
```

- [ ] **Step 4: `reorder-groups.action.ts`**

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { reorderGroups } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    groupIds: number[];
}

export async function reorderGroupsAction(
    input: Input,
): Promise<{ result: { reordered: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    try {
        const result = await reorderGroups(
            user.id,
            input.gameId,
            input.groupIds,
        );
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to reorder groups.' };
    }
}
```

- [ ] **Step 5: `assign-category-group.action.ts`**

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateCategory } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    groupId: number | null;
}

export async function assignCategoryGroupAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        const result = await updateCategory(
            user.id,
            input.gameId,
            input.categoryId,
            { groupId: input.groupId },
        );
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to assign group.' };
    }
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/actions/category-group/
git commit -m "feat(category-groups): server actions for create/rename/delete/reorder/assign"
```

---

## Task 4: Plumb groups through the manage page

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/types.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/page.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx`

- [ ] **Step 1: Add `initialGroups` to `ManagePageData`**

In `app/(new-layout)/games-v2/[game]/manage/types.ts`:

```typescript
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
// ...
export interface ManagePageData {
    // ...existing fields...
    initialGroups: ManageGroup[];
}
```

- [ ] **Step 2: Fetch groups in `page.tsx`**

In `app/(new-layout)/games-v2/[game]/manage/page.tsx`, import `listManageGroups`:

```typescript
import { listManageCategories, listManageGroups } from '~src/lib/category-mgmt';
```

Extend the `Promise.all` block to include groups and add it to the `data` passed to `<ManagePage>`:

```typescript
const [
    initialIdentifiers,
    initialVariables,
    initialMinimums,
    initialRows,
    initialGroups,
] = await Promise.all([
    // ...existing entries...
    listManageCategories(game.id).catch(() => []),
    listManageGroups(game.id).catch(() => []),
]);
```

```typescript
<ManagePage
    data={{
        // ...existing fields...
        initialRows: enrichedRows,
        initialGroups,
        initialTab,
    }}
/>
```

- [ ] **Step 3: Hold groups in `ManagePage` state and pass down to `GameTab`**

In `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`:

```typescript
import type {
    ManageCategoryRow,
    ManageGroup,
} from '~src/lib/category-mgmt';
// ...
const [groups, setGroups] = useState<ManageGroup[]>(data.initialGroups);
```

Pass into `GameTab`:

```typescript
<GameTab
    game={data.game}
    initialSlug={data.initialSlug}
    initialAbbreviation={data.initialAbbreviation}
    rows={rows}
    groups={groups}
    onGroupsChange={setGroups}
    onRowChange={applyRowPatch}
    onRowGroupChange={(categoryId, groupId, groupName) => {
        setRows((rs) =>
            rs.map((r) =>
                r.id === categoryId
                    ? { ...r, groupId, groupName }
                    : r,
            ),
        );
    }}
    onEditCategory={(id) => {
        setSelectedCategoryId(id);
        setActiveTab('category');
        updateUrl('category', id);
    }}
/>
```

- [ ] **Step 4: Extend `GameTab` props (consumed by Tasks 5 & 6)**

In `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx`:

```typescript
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';

interface Props {
    game: ResolvedGame;
    initialSlug: string | null;
    initialAbbreviation: string | null;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    onGroupsChange: (groups: ManageGroup[]) => void;
    onRowChange: (
        categoryId: number,
        patch: { isMain?: boolean; active?: boolean },
    ) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
    onEditCategory: (categoryId: number) => void;
}

export function GameTab({
    game,
    initialSlug,
    initialAbbreviation,
    rows,
    groups,
    onGroupsChange,
    onRowChange,
    onRowGroupChange,
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

            {/* GroupsSection inserted in Task 5 */}

            <CategoriesTable
                game={game}
                rows={rows}
                groups={groups}
                onRowChange={onRowChange}
                onRowGroupChange={onRowGroupChange}
                onEdit={onEditCategory}
            />
        </div>
    );
}
```

Note: `CategoriesTable` gains `groups`/`onRowGroupChange` props in Task 6. Until then this file will fail typecheck — that's fine for an intermediate state, but for clean commits, **defer the `<CategoriesTable>` prop additions to Task 6** and stage them there. For now, leave the existing `<CategoriesTable game rows onRowChange onEdit />` call untouched.

So actually in this task, the `<CategoriesTable>` JSX stays unchanged. The new `groups`/`onGroupsChange`/`onRowGroupChange` props on `GameTab` are accepted but unused in this commit (TypeScript will accept an unused prop, but ESLint may warn — prefix with `_` if so):

```typescript
export function GameTab({
    game,
    initialSlug,
    initialAbbreviation,
    rows,
    groups: _groups,
    onGroupsChange: _onGroupsChange,
    onRowChange,
    onRowGroupChange: _onRowGroupChange,
    onEditCategory,
}: Props) {
    // ...existing JSX, CategoriesTable unchanged...
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Smoke test**

Run: `npm run dev`. Visit `/games-v2/<some-game>/manage` as a mod. The Game tab should render identically to before (no visible change yet).

- [ ] **Step 7: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/types.ts \
        app/\(new-layout\)/games-v2/\[game\]/manage/page.tsx \
        app/\(new-layout\)/games-v2/\[game\]/manage/manage-page.tsx \
        app/\(new-layout\)/games-v2/\[game\]/manage/game-tab/game-tab.tsx
git commit -m "feat(category-groups): plumb groups through manage page"
```

---

## Task 5: `GroupsSection` UI

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/game-tab/groups-section.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx` (render the section)

- [ ] **Step 1: Create the component**

Write `app/(new-layout)/games-v2/[game]/manage/game-tab/groups-section.tsx`:

```typescript
'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { createGroupAction } from '~src/actions/category-group/create-group.action';
import { deleteGroupAction } from '~src/actions/category-group/delete-group.action';
import { renameGroupAction } from '~src/actions/category-group/rename-group.action';
import { reorderGroupsAction } from '~src/actions/category-group/reorder-groups.action';

interface Props {
    game: ResolvedGame;
    groups: ManageGroup[];
    rows: ManageCategoryRow[];
    onGroupsChange: (groups: ManageGroup[]) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
}

export function GroupsSection({
    game,
    groups,
    rows,
    onGroupsChange,
    onRowGroupChange,
}: Props) {
    const [createName, setCreateName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [pending, setPending] = useState(false);
    const [dragId, setDragId] = useState<number | null>(null);
    const [_isPending, startTransition] = useTransition();

    const countByGroupId = useMemo(() => {
        const m = new Map<number, number>();
        for (const r of rows) {
            if (r.groupId != null)
                m.set(r.groupId, (m.get(r.groupId) ?? 0) + 1);
        }
        return m;
    }, [rows]);

    const submitCreate = () => {
        const name = createName.trim();
        if (!name) return;
        setPending(true);
        startTransition(async () => {
            const res = await createGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                name,
            });
            setPending(false);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const next: ManageGroup[] = [
                ...groups,
                {
                    id: res.result.id,
                    name,
                    sortOrder:
                        (groups[groups.length - 1]?.sortOrder ?? 0) + 1,
                },
            ];
            onGroupsChange(next);
            setCreateName('');
            toast.success(`Created group "${name}"`);
        });
    };

    const beginEdit = (g: ManageGroup) => {
        setEditingId(g.id);
        setEditName(g.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const submitEdit = (g: ManageGroup) => {
        const name = editName.trim();
        if (!name || name === g.name) {
            cancelEdit();
            return;
        }
        setPending(true);
        startTransition(async () => {
            const res = await renameGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                groupId: g.id,
                name,
            });
            setPending(false);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            onGroupsChange(
                groups.map((x) => (x.id === g.id ? { ...x, name } : x)),
            );
            // Reflect the new name on rows that belong to this group.
            for (const r of rows) {
                if (r.groupId === g.id) {
                    onRowGroupChange(r.id, g.id, name);
                }
            }
            cancelEdit();
            toast.success('Renamed group');
        });
    };

    const submitDelete = (g: ManageGroup) => {
        const count = countByGroupId.get(g.id) ?? 0;
        const msg =
            count > 0
                ? `Delete "${g.name}"? Its ${count} ${count === 1 ? 'category' : 'categories'} will become ungrouped.`
                : `Delete "${g.name}"?`;
        if (!window.confirm(msg)) return;
        setPending(true);
        startTransition(async () => {
            const res = await deleteGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                groupId: g.id,
            });
            setPending(false);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            onGroupsChange(groups.filter((x) => x.id !== g.id));
            for (const r of rows) {
                if (r.groupId === g.id) {
                    onRowGroupChange(r.id, null, null);
                }
            }
            toast.success(`Deleted "${g.name}"`);
        });
    };

    const commitReorder = (next: ManageGroup[]) => {
        const prev = groups;
        onGroupsChange(next);
        setPending(true);
        startTransition(async () => {
            const res = await reorderGroupsAction({
                gameSlug: game.name,
                gameId: game.id,
                groupIds: next.map((g) => g.id),
            });
            setPending(false);
            if ('error' in res) {
                toast.error(res.error);
                onGroupsChange(prev);
            }
        });
    };

    const moveBy = (id: number, delta: -1 | 1) => {
        const idx = groups.findIndex((g) => g.id === id);
        const target = idx + delta;
        if (idx < 0 || target < 0 || target >= groups.length) return;
        const next = groups.slice();
        const [g] = next.splice(idx, 1);
        next.splice(target, 0, g);
        commitReorder(next);
    };

    const onDragStart = (id: number) => setDragId(id);
    const onDragOver = (e: React.DragEvent, overId: number) => {
        e.preventDefault();
        if (dragId === null || dragId === overId) return;
    };
    const onDrop = (overId: number) => {
        if (dragId === null || dragId === overId) {
            setDragId(null);
            return;
        }
        const from = groups.findIndex((g) => g.id === dragId);
        const to = groups.findIndex((g) => g.id === overId);
        setDragId(null);
        if (from < 0 || to < 0) return;
        const next = groups.slice();
        const [g] = next.splice(from, 1);
        next.splice(to, 0, g);
        commitReorder(next);
    };

    return (
        <section className="mb-4">
            <h2 className="h5 mb-2">Category groups</h2>
            <p className="text-muted small mb-2">
                Organize categories on the public game page. When more than one
                group exists, the category pills are split into labeled
                sections.
            </p>

            <div className="d-flex gap-2 align-items-center mb-3">
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="New group name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCreate();
                    }}
                    disabled={pending}
                    style={{ maxWidth: 280 }}
                />
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={submitCreate}
                    disabled={pending || !createName.trim()}
                >
                    Create
                </button>
            </div>

            {groups.length === 0 ? (
                <p className="text-muted small">
                    No groups yet — create one to organize categories on the
                    public page.
                </p>
            ) : (
                <ul
                    className="list-group"
                    style={{ maxWidth: 560 }}
                >
                    {groups.map((g, i) => {
                        const count = countByGroupId.get(g.id) ?? 0;
                        const isEditing = editingId === g.id;
                        return (
                            <li
                                key={g.id}
                                className={`list-group-item d-flex align-items-center gap-2 ${
                                    dragId === g.id ? 'opacity-50' : ''
                                }`}
                                draggable={!isEditing && !pending}
                                onDragStart={() => onDragStart(g.id)}
                                onDragOver={(e) => onDragOver(e, g.id)}
                                onDrop={() => onDrop(g.id)}
                                onDragEnd={() => setDragId(null)}
                            >
                                <span
                                    aria-hidden="true"
                                    title="Drag to reorder"
                                    style={{ cursor: 'grab' }}
                                >
                                    ⠿
                                </span>
                                <div
                                    className="btn-group btn-group-sm"
                                    role="group"
                                    aria-label="Reorder"
                                >
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => moveBy(g.id, -1)}
                                        disabled={pending || i === 0}
                                        aria-label="Move up"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => moveBy(g.id, 1)}
                                        disabled={
                                            pending || i === groups.length - 1
                                        }
                                        aria-label="Move down"
                                    >
                                        ▼
                                    </button>
                                </div>

                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="form-control form-control-sm flex-grow-1"
                                        value={editName}
                                        autoFocus
                                        onChange={(e) =>
                                            setEditName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter')
                                                submitEdit(g);
                                            else if (e.key === 'Escape')
                                                cancelEdit();
                                        }}
                                        onBlur={() => submitEdit(g)}
                                        disabled={pending}
                                    />
                                ) : (
                                    <span className="flex-grow-1">
                                        {g.name}
                                    </span>
                                )}

                                <span className="text-muted small">
                                    {count}{' '}
                                    {count === 1
                                        ? 'category'
                                        : 'categories'}
                                </span>

                                {!isEditing && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-link"
                                        onClick={() => beginEdit(g)}
                                        disabled={pending}
                                        aria-label="Rename"
                                    >
                                        ✎
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger"
                                    onClick={() => submitDelete(g)}
                                    disabled={pending}
                                    aria-label="Delete"
                                >
                                    🗑
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
```

- [ ] **Step 2: Render `GroupsSection` in `GameTab`**

In `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx`, drop the underscore prefixes (props are now consumed), import the section, and place it between the Cache section and the CategoriesTable:

```typescript
import { GroupsSection } from './groups-section';
// ...
export function GameTab({
    game,
    initialSlug,
    initialAbbreviation,
    rows,
    groups,
    onGroupsChange,
    onRowChange,
    onRowGroupChange,
    onEditCategory,
}: Props) {
    return (
        <div>
            <IdentifiersSection /* ... */ />
            <section className="mb-4">{/* Cache */}</section>

            <GroupsSection
                game={game}
                groups={groups}
                rows={rows}
                onGroupsChange={onGroupsChange}
                onRowGroupChange={onRowGroupChange}
            />

            <CategoriesTable
                game={game}
                rows={rows}
                onRowChange={onRowChange}
                onEdit={onEditCategory}
            />
        </div>
    );
}
```

Note: `onRowGroupChange` is still unused by `<CategoriesTable>` until Task 6 wires it. Keep prefix-free here because `GroupsSection` consumes it.

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Smoke test**

Run: `npm run dev`. Visit `/games-v2/<game>/manage` as a mod. Verify:
- "Category groups" section renders between Cache and Categories.
- Create a group → toast success, group appears in the list with `0 categories`.
- Rename via pencil → Enter commits; Escape cancels.
- Up/Down arrows move groups; refresh the page to confirm persistence.
- Drag a group onto another → reorders; confirm persistence on refresh.
- Delete a group → confirm dialog → group disappears.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/game-tab/groups-section.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx"
git commit -m "feat(category-groups): groups section on manage page"
```

---

## Task 6: Categories table — inline group select + bulk-assign

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/game-tab/categories-table.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx` (pass new props)

- [ ] **Step 1: Extend `CategoriesTable` props and signature**

Replace the top of `categories-table.tsx`:

```typescript
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { formatCount, formatHours } from '~src/utils/format-stats';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';
import { assignCategoryGroupAction } from '~src/actions/category-group/assign-category-group.action';

type Filter = 'all' | 'active' | 'archived';

interface Props {
    game: ResolvedGame;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    onRowChange: (
        categoryId: number,
        patch: { isMain?: boolean; active?: boolean },
    ) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
    onEdit: (categoryId: number) => void;
}

export function CategoriesTable({
    game,
    rows,
    groups,
    onRowChange,
    onRowGroupChange,
    onEdit,
}: Props) {
```

- [ ] **Step 2: Add selection state + reset on filter/search change**

After the existing `pendingIds`/`filter`/`query` state:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
const [bulkPending, setBulkPending] = useState(false);

// Clear selection whenever the visible row set changes via filter/search.
useEffect(() => {
    setSelectedIds(new Set());
}, [filter, query]);
```

- [ ] **Step 3: Inline group `<select>` handler**

Inside the component, above the `return`:

```typescript
const onChangeGroup = (row: ManageCategoryRow, raw: string) => {
    if (raw === '__create__') {
        const name = window.prompt('New group name')?.trim();
        if (!name) return;
        setPending(row.id, true);
        startTransition(async () => {
            // Create the group, then assign.
            const create = await (
                await import(
                    '~src/actions/category-group/create-group.action'
                )
            ).createGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                name,
            });
            if ('error' in create) {
                setPending(row.id, false);
                toast.error(create.error);
                return;
            }
            const newGroupId = create.result.id;
            const assign = await assignCategoryGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: row.id,
                groupId: newGroupId,
            });
            setPending(row.id, false);
            if ('error' in assign) {
                toast.error(assign.error);
                return;
            }
            onRowGroupChange(row.id, newGroupId, name);
            toast.success(`Created "${name}" and moved ${row.display}`);
        });
        return;
    }

    const nextGroupId = raw === '' ? null : Number.parseInt(raw, 10);
    const nextGroup = nextGroupId
        ? groups.find((g) => g.id === nextGroupId) ?? null
        : null;
    const prevGroupId = row.groupId ?? null;
    const prevGroupName = row.groupName ?? null;

    onRowGroupChange(row.id, nextGroupId, nextGroup?.name ?? null);
    setPending(row.id, true);
    startTransition(async () => {
        const res = await assignCategoryGroupAction({
            gameSlug: game.name,
            gameId: game.id,
            categoryId: row.id,
            groupId: nextGroupId,
        });
        setPending(row.id, false);
        if ('error' in res) {
            toast.error(res.error);
            onRowGroupChange(row.id, prevGroupId, prevGroupName);
            return;
        }
        toast.success(
            nextGroup
                ? `${row.display} → ${nextGroup.name}`
                : `${row.display} → Ungrouped`,
        );
    });
};
```

Replace the static eager import to keep top-level imports clean:

```typescript
import { createGroupAction } from '~src/actions/category-group/create-group.action';
```

…and replace the inline dynamic import block with a direct call:

```typescript
const create = await createGroupAction({
    gameSlug: game.name,
    gameId: game.id,
    name,
});
```

- [ ] **Step 4: Bulk-assign handler**

```typescript
const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
    });
};

const toggleSelectAllVisible = (checked: boolean) => {
    if (!checked) {
        setSelectedIds(new Set());
        return;
    }
    setSelectedIds(new Set(visibleRows.map((r) => r.id)));
};

const bulkAssign = async (raw: string) => {
    if (selectedIds.size === 0) return;
    let groupId: number | null;
    let groupName: string | null;
    if (raw === '__create__') {
        const name = window.prompt('New group name')?.trim();
        if (!name) return;
        const create = await createGroupAction({
            gameSlug: game.name,
            gameId: game.id,
            name,
        });
        if ('error' in create) {
            toast.error(create.error);
            return;
        }
        groupId = create.result.id;
        groupName = name;
    } else if (raw === '') {
        groupId = null;
        groupName = null;
    } else {
        groupId = Number.parseInt(raw, 10);
        groupName = groups.find((g) => g.id === groupId)?.name ?? null;
    }

    const targets = rows.filter((r) => selectedIds.has(r.id));
    const before = targets.map((r) => ({
        id: r.id,
        groupId: r.groupId ?? null,
        groupName: r.groupName ?? null,
    }));
    for (const t of targets) onRowGroupChange(t.id, groupId, groupName);
    setBulkPending(true);
    const results = await Promise.all(
        targets.map((t) =>
            assignCategoryGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: t.id,
                groupId,
            }),
        ),
    );
    setBulkPending(false);
    const failed: number[] = [];
    results.forEach((res, idx) => {
        if ('error' in res) failed.push(targets[idx].id);
    });
    if (failed.length > 0) {
        // Roll back failed only.
        const lookup = new Map(before.map((b) => [b.id, b]));
        for (const id of failed) {
            const b = lookup.get(id);
            if (b) onRowGroupChange(b.id, b.groupId, b.groupName);
        }
        toast.error(
            `${failed.length} of ${targets.length} could not be moved.`,
        );
    } else {
        toast.success(`Moved ${targets.length} categories.`);
    }
    setSelectedIds(new Set());
};
```

- [ ] **Step 5: Render checkbox column, bulk bar, and group `<select>`**

Wrap the existing `<table>` block so a sticky bar can render above when there's a selection. Patch the JSX as follows:

Add a bulk bar just before the `<div className="table-responsive">`:

```typescript
{selectedIds.size > 0 && (
    <div
        className="d-flex align-items-center gap-2 p-2 mb-2 border rounded bg-body-tertiary"
        style={{ position: 'sticky', top: '0.5rem', zIndex: 1 }}
    >
        <strong>{selectedIds.size} selected</strong>
        <label className="text-muted small mb-0 ms-2">Move to:</label>
        <select
            className="form-select form-select-sm"
            defaultValue=""
            disabled={bulkPending}
            onChange={(e) => {
                const v = e.target.value;
                e.currentTarget.value = '';
                if (v === '__noop__') return;
                bulkAssign(v);
            }}
            style={{ maxWidth: 240 }}
        >
            <option value="__noop__">Choose…</option>
            <option value="">Ungrouped</option>
            {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                    {g.name}
                </option>
            ))}
            <option value="__create__">+ Create group…</option>
        </select>
        <button
            type="button"
            className="btn btn-sm btn-outline-secondary ms-auto"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkPending}
        >
            Clear
        </button>
    </div>
)}
```

Update the table header to add a leading checkbox column:

```typescript
<thead>
    <tr>
        <th style={{ width: 32 }}>
            <input
                type="checkbox"
                className="form-check-input"
                checked={
                    visibleRows.length > 0 &&
                    visibleRows.every((r) => selectedIds.has(r.id))
                }
                ref={(el) => {
                    if (!el) return;
                    const any = visibleRows.some((r) =>
                        selectedIds.has(r.id),
                    );
                    const all = visibleRows.every((r) =>
                        selectedIds.has(r.id),
                    );
                    el.indeterminate = any && !all;
                }}
                onChange={(e) =>
                    toggleSelectAllVisible(e.target.checked)
                }
                aria-label="Select all visible"
            />
        </th>
        <th>Category</th>
        <th>Group</th>
        <th className="text-end">Runs</th>
        <th className="text-end">Runners</th>
        <th className="text-end">Playtime</th>
        <th className="text-center">Main</th>
        <th className="text-center">Active</th>
        <th />
    </tr>
</thead>
```

In each row, prepend a checkbox cell and replace the `<td>{row.groupName ?? ...}</td>` cell with a `<select>`:

```typescript
<tr key={row.id} className={row.active ? '' : 'text-muted'}>
    <td>
        <input
            type="checkbox"
            className="form-check-input"
            checked={selectedIds.has(row.id)}
            onChange={(e) => toggleSelect(row.id, e.target.checked)}
            aria-label={`Select ${row.display}`}
        />
    </td>
    <td>{row.display}</td>
    <td>
        <select
            className="form-select form-select-sm"
            value={row.groupId == null ? '' : String(row.groupId)}
            disabled={pendingIds.has(row.id) || bulkPending}
            onChange={(e) => onChangeGroup(row, e.target.value)}
            style={{ minWidth: 160 }}
            aria-label={`Group: ${row.display}`}
        >
            <option value="">Ungrouped</option>
            {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                    {g.name}
                </option>
            ))}
            <option value="__create__">+ Create group…</option>
        </select>
    </td>
    {/* ...existing runs/runners/playtime/main/active/edit cells unchanged... */}
</tr>
```

- [ ] **Step 6: Pass new props from `GameTab`**

In `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx`, the `<CategoriesTable>` call becomes:

```typescript
<CategoriesTable
    game={game}
    rows={rows}
    groups={groups}
    onRowChange={onRowChange}
    onRowGroupChange={onRowGroupChange}
    onEdit={onEditCategory}
/>
```

- [ ] **Step 7: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 8: Smoke test**

Run: `npm run dev` and visit a game's manage page. Verify:
- Each row shows a checkbox + a Group `<select>` populated with current groups + Ungrouped + `+ Create group…`.
- Changing a row's group calls the server and persists across refresh; failure rolls back.
- `+ Create group…` from a row prompts for a name, creates the group, and assigns the row in one go. Verify the new group also appears in the `GroupsSection` (would require also calling `onGroupsChange` — see step 9).
- Header checkbox selects/deselects all visible rows. Filter change clears selection.
- Bulk-assign 3+ rows to a group → all rows update. Bulk-assign to Ungrouped → all rows clear group. Bulk `+ Create group…` works.

- [ ] **Step 9: Sync newly-created groups back to `GroupsSection`**

The row-level and bulk `+ Create group…` paths currently create a group but don't notify `GameTab` so `GroupsSection` doesn't re-render with the new entry. Fix this by passing `onGroupCreated` from `GameTab`:

In `categories-table.tsx`:

```typescript
interface Props {
    // ...
    onGroupCreated: (group: ManageGroup) => void;
}
```

After every successful `createGroupAction` inside this file, call:

```typescript
onGroupCreated({
    id: create.result.id,
    name,
    sortOrder:
        (groups[groups.length - 1]?.sortOrder ?? 0) + 1,
});
```

In `game-tab.tsx`, pass:

```typescript
<CategoriesTable
    // ...
    onGroupCreated={(g) => onGroupsChange([...groups, g])}
/>
```

Re-run smoke step 8: `+ Create group…` should now also show the new group in `GroupsSection`.

- [ ] **Step 10: Typecheck, lint, smoke**

Run: `npm run typecheck && npm run lint`. Re-smoke.

- [ ] **Step 11: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/game-tab/categories-table.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx"
git commit -m "feat(category-groups): inline assignment + bulk-assign in categories table"
```

---

## Task 7: Public game-page pill grouping

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/category-pills.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx` (pass `groups`)
- Modify: `app/(new-layout)/games-v2/[game]/data.ts` (already updated in Task 1 — confirm `groups` is on `data`)

- [ ] **Step 1: Pass `groups` into `CategoryPills`**

In `app/(new-layout)/games-v2/[game]/game-page.tsx`:

```typescript
<CategoryPills
    categories={data.categories}
    groups={data.groups}
    selectedCategoryName={data.selectedCategory.name}
    variableKeys={variableKeys}
/>
```

- [ ] **Step 2: Rewrite `CategoryPills`**

Replace the body of `app/(new-layout)/games-v2/[game]/header/category-pills.tsx` with the grouped renderer:

```typescript
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useTransition } from 'react';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';

interface Props {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    selectedCategoryName: string;
    variableKeys: string[];
}

const FALLBACK_VISIBLE_COUNT = 5;

function byPlaytimeDesc(a: ResolvedCategory, b: ResolvedCategory): number {
    return (b.totalRunTime ?? 0) - (a.totalRunTime ?? 0);
}

export function CategoryPills({
    categories,
    groups,
    selectedCategoryName,
    variableKeys,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('category', name);
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    const renderPill = (c: ResolvedCategory) => {
        const active = c.name === selectedCategoryName;
        return (
            <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.name)}
                disabled={isPending}
                aria-pressed={active}
                className={`btn btn-sm ${
                    active ? 'btn-primary' : 'btn-outline-secondary'
                }`}
            >
                {c.display}
            </button>
        );
    };

    const sections = useMemo(() => {
        const mains = categories.filter((c) => c.isMain);
        const usingFallback = mains.length === 0;
        const base = usingFallback
            ? [...categories]
                  .sort(byPlaytimeDesc)
                  .slice(0, FALLBACK_VISIBLE_COUNT)
            : [...mains].sort(byPlaytimeDesc);

        // Append selected-but-not-in-base, so the active pill is always visible.
        const baseIds = new Set(base.map((c) => c.id));
        const selected = categories.find(
            (c) => c.name === selectedCategoryName,
        );
        const visible =
            selected && !baseIds.has(selected.id)
                ? [...base, selected]
                : base;

        // Trivial case: no group structure to show.
        const usedGroupIds = new Set(
            visible.map((c) => c.groupId ?? null).filter((id) => id != null),
        );
        const trivial =
            usingFallback ||
            groups.length === 0 ||
            (groups.length <= 1 && usedGroupIds.size <= 1);

        if (trivial) {
            return [{ id: null, name: null, pills: visible }];
        }

        // Build labeled sections for each group in sortOrder, then trailing ungrouped.
        const byGroup = new Map<number, ResolvedCategory[]>();
        const ungrouped: ResolvedCategory[] = [];
        for (const c of visible) {
            if (c.groupId == null) ungrouped.push(c);
            else {
                const arr = byGroup.get(c.groupId) ?? [];
                arr.push(c);
                byGroup.set(c.groupId, arr);
            }
        }
        const result: {
            id: number | null;
            name: string | null;
            pills: ResolvedCategory[];
        }[] = groups.map((g) => ({
            id: g.id,
            name: g.name,
            pills: (byGroup.get(g.id) ?? []).sort(byPlaytimeDesc),
        }));
        if (ungrouped.length > 0) {
            result.push({
                id: null,
                name: null,
                pills: ungrouped.sort(byPlaytimeDesc),
            });
        }
        return result;
    }, [categories, groups, selectedCategoryName]);

    if (sections.length === 0) return null;
    if (sections.length === 1 && sections[0].pills.length <= 1) return null;

    return (
        <div aria-label="Category">
            {sections.map((section, idx) => (
                <div
                    key={section.id ?? `ungrouped-${idx}`}
                    className="mb-2"
                >
                    {section.name && (
                        <small className="text-muted text-uppercase fw-bold d-block mb-1">
                            {section.name}
                        </small>
                    )}
                    {section.pills.length === 0 ? (
                        <small className="text-muted">
                            No categories enabled for this group.
                        </small>
                    ) : (
                        <nav className="d-flex gap-2 flex-wrap">
                            {section.pills.map(renderPill)}
                        </nav>
                    )}
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Smoke test on the public page**

Run: `npm run dev`. On the manage page of a test game:
1. Create 2 groups (e.g. "Full Game", "Individual Levels").
2. Assign at least one main category to each group.
3. Leave one main category ungrouped.
4. Visit the public game page (`/games-v2/<game>`). Verify:
   - Two labeled sections render in `sortOrder`, then an unlabeled trailing row with the ungrouped main.
   - Pills sort by playtime desc within each section.
   - Navigating to a non-main category appends its pill to the right section.
5. Delete one group → the public page should render flat again (single-group trivial case).
6. Create a third group with **no** main categories → its label still shows with `No categories enabled for this group.` on the public page.
7. Test the no-mains fallback: temporarily uncheck all mains on a game → public page shows top-5-by-playtime as a single flat row (no group headings).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/header/category-pills.tsx" \
        "app/(new-layout)/games-v2/[game]/game-page.tsx"
git commit -m "feat(category-groups): grouped category pills on public game page"
```

---

## Task 8: Final pass

- [ ] **Step 1: Clear Next.js build cache** (per CLAUDE.md after significant changes)

```bash
rm -rf .next
```

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Full smoke pass on a single test game**

1. Manage page → create groups A, B, C; reorder via arrows and drag.
2. Rename group → server persists; row labels in `CategoryPills` update next refresh.
3. Inline-assign one category each into A and B; leave one ungrouped; bulk-assign 3 categories into C.
4. Public page shows 3 labeled sections in correct sortOrder plus an unlabeled ungrouped section. Empty group case: clear all mains in C → "No categories enabled for this group." appears under "C".
5. Delete group B → its categories become ungrouped (verified in manage Group column and public page).
6. Permission gate: log in as a non-mod user — manage page should be inaccessible (existing `confirmPermission`). For a mod of a different game, the actions return "Not authorized" when invoked against this game.

- [ ] **Step 4: Mark the design doc as implemented**

In `docs/superpowers/specs/2026-05-19-category-group-management-design.md`, change the `Status:` line to `Implemented`.

```bash
git add docs/superpowers/specs/2026-05-19-category-group-management-design.md
git commit -m "docs(specs): mark category group management as implemented"
```

---

## Notes / Known limitations

- Drag-and-drop uses native HTML5 events; touch devices may need a polyfill (out of scope).
- `window.prompt` / `window.confirm` are used for create/delete flows for simplicity, matching the project's existing patterns. If the codebase later adopts a modal component, those calls become single-point replacements.
- `assignCategoryGroupAction` and `updateVisibilityAction` both revalidate `game-cats:${gameId}`. The `loadPageData` cache in `category-mgmt.ts` is request-level (no `'use cache'`); manage-page reads hit the backend fresh per request, so manage-side staleness is bounded to within a single render.
