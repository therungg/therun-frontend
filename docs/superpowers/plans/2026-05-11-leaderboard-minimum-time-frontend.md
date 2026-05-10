# Leaderboard Minimum Time — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend for the already-implemented backend at `/v1/games/:gameId/categories/:categoryId/minimums` — moderators can list, add, edit, and delete per-`(game, category, subcategoryHash)` minimum times from a dedicated `/games-v2/[game]/manage` page.

**Architecture:** A server-rendered page resolves the game, performs a CASL permission check, and loads the active category's variables + minimums. A client section renders the category picker, table, inline add/edit form, and toasts. Three thin `apiFetch` wrappers and two `'use server'` actions sit between the UI and the backend. No new caching — these reads need to reflect writes immediately.

**Tech Stack:** Next.js 16 App Router, React 19, CASL (RBAC), react-toastify, react-bootstrap (already in repo for table styling), `apiFetch` helper, existing `DurationToFormatted` / `timeToMillis` from `src/components/util/datetime.tsx`.

**Spec:** `docs/superpowers/specs/2026-05-11-leaderboard-minimum-time-frontend-design.md`.

**Conventions:**
- Frontend has no test framework; manual verification via `npm run dev`. Each task includes the smoke test if applicable.
- All data goes through `apiFetch` (`src/lib/api-client.ts`), which unwraps `json.result` automatically. Lib functions return the unwrapped value.
- Server actions: `'use server'` directive, get session via `getSession()` from `src/actions/session.action.ts`, gate with `confirmPermission`, then call the lib.
- Path aliases: `~src/*` → `src/*`, `~app/*` → `app/*`. Type imports for files outside `src/`/`app/` use relative paths (`../../../../types/...`) — match existing pattern.
- Commit messages mirror existing style (`feat(scope): …`, `fix(scope): …`). Do not add Claude as co-author.

---

## Task 1: Types and lib wrappers

**Files:**
- Create: `types/leaderboard-minimums.types.ts`
- Create: `src/lib/leaderboard-minimums.ts`

### - [ ] Step 1.1: Create the type file

Create `types/leaderboard-minimums.types.ts`:

```ts
export interface MinimumTime {
    subcategoryHash: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
    setBy: number | null;
    updatedAt: string;
}

export interface UpsertMinimumTimeInput {
    subcategoryHash: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
}

export interface UpsertMinimumTimeResult {
    updated: boolean;
    flagged: number;
    unflagged: number;
}

export interface DeleteMinimumTimeResult {
    deleted: boolean;
    unflagged: number;
}
```

### - [ ] Step 1.2: Create the lib

Create `src/lib/leaderboard-minimums.ts`:

```ts
import { apiFetch } from '~src/lib/api-client';
import type {
    DeleteMinimumTimeResult,
    MinimumTime,
    UpsertMinimumTimeInput,
    UpsertMinimumTimeResult,
} from '../../types/leaderboard-minimums.types';

function basePath(gameId: number, categoryId: number) {
    return `/v1/games/${gameId}/categories/${categoryId}/minimums`;
}

export async function listMinimumTimes(
    sessionId: string,
    gameId: number,
    categoryId: number,
): Promise<MinimumTime[]> {
    return apiFetch<MinimumTime[]>(basePath(gameId, categoryId), {
        sessionId,
    });
}

export async function upsertMinimumTime(
    sessionId: string,
    gameId: number,
    categoryId: number,
    body: UpsertMinimumTimeInput,
): Promise<UpsertMinimumTimeResult> {
    return apiFetch<UpsertMinimumTimeResult>(basePath(gameId, categoryId), {
        sessionId,
        method: 'PUT',
        body,
    });
}

export async function deleteMinimumTime(
    sessionId: string,
    gameId: number,
    categoryId: number,
    subcategoryHash: string,
): Promise<DeleteMinimumTimeResult> {
    return apiFetch<DeleteMinimumTimeResult>(basePath(gameId, categoryId), {
        sessionId,
        method: 'DELETE',
        body: { subcategoryHash },
    });
}
```

Note: `apiFetch` already handles `Content-Type` and `JSON.stringify` for non-`BodyInit` bodies; pass the raw object.

### - [ ] Step 1.3: Verify typecheck passes

Run: `npm run typecheck`
Expected: no errors related to these new files.

### - [ ] Step 1.4: Commit

```bash
git add types/leaderboard-minimums.types.ts src/lib/leaderboard-minimums.ts
git commit -m "feat(minimums): add types and lib wrappers for leaderboard minimum times"
```

---

## Task 2: CASL — new `category-settings` subject + grants

**Files:**
- Modify: `src/rbac/ability.ts`

### - [ ] Step 2.1: Add the new subject

In `src/rbac/ability.ts`, extend the `subjects` array. The existing array (around line 21–32) currently ends with `'roles'`:

```ts
export const subjects = [
    'user',
    'run',
    'race',
    'game',
    'event',
    'leaderboard',
    'moderators',
    'admins',
    'stories',
    'roles',
    'category-settings',
] as const;
```

### - [ ] Step 2.2: Grant `edit` on `category-settings` to global board roles

In the same file, inside `rolePermissions`, find `'board-admin'` (around line 86–89). Update its body to include the new grant:

```ts
'board-admin': function (_user, { can }) {
    can('edit', 'leaderboard');
    can('edit', 'moderators');
    can('edit', 'category-settings');
},
```

And `'board-moderator'` (around line 90–92):

```ts
'board-moderator': function (_user, { can }) {
    can('edit', 'leaderboard');
    can('edit', 'category-settings');
},
```

### - [ ] Step 2.3: Grant `edit` on `category-settings` to per-game moderators

In the same file, inside `defaultPermissions` (around line 126–153), find the `moderatedGames.forEach((game) => { ... })` block. It currently grants `can(action, 'leaderboard', { game })`. Add a sibling grant right after that line:

```ts
moderatedGames.forEach((game) => {
    can(action, 'leaderboard', { game });
    can('edit', 'category-settings', { game });
});
```

Note: the surrounding `actions.forEach` outer loop runs once per action, but `can('edit', 'category-settings', { game })` is idempotent — the same grant gets re-registered with each iteration; that matches the existing pattern (the line above does the same with `action`, but we want strictly `'edit'` here).

To avoid the redundant re-registration, hoist it out of the outer `actions.forEach`:

```ts
const defaultPermissions: DefinePermissions = (user, { can }) => {
    const moderatedGames = user.moderatedGames || [];
    actions.forEach((action) => {
        moderatedGames.forEach((game) => {
            can(action, 'leaderboard', { game });
        });

        // ...existing user/run/race/event grants unchanged...
    });

    // Per-game moderators can edit category settings (minimum times etc.)
    moderatedGames.forEach((game) => {
        can('edit', 'category-settings', { game });
    });
};
```

### - [ ] Step 2.4: Verify typecheck passes

Run: `npm run typecheck`
Expected: no errors. CASL is loosely typed by string so this should compile cleanly.

### - [ ] Step 2.5: Commit

```bash
git add src/rbac/ability.ts
git commit -m "feat(rbac): add edit/category-settings permission for board and game moderators"
```

---

## Task 3: Server actions for upsert and delete

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/minimums/actions/upsert-minimum.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/minimums/actions/delete-minimum.action.ts`

### - [ ] Step 3.1: Create the directories

Run: `mkdir -p "app/(new-layout)/games-v2/[game]/manage/minimums/actions"`

### - [ ] Step 3.2: Create the upsert action

Create `app/(new-layout)/games-v2/[game]/manage/minimums/actions/upsert-minimum.action.ts`:

```ts
'use server';

import { getSession } from '~src/actions/session.action';
import { upsertMinimumTime } from '~src/lib/leaderboard-minimums';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ApiError } from '~src/lib/api-client';
import type { UpsertMinimumTimeResult } from '../../../../../../../types/leaderboard-minimums.types';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    subcategoryHash: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
}

export async function upsertMinimumAction(
    input: Input,
): Promise<{ result: UpsertMinimumTimeResult } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    if (input.minTimeMs === null && input.minGameTimeMs === null) {
        return { error: 'At least one of RT or GT minimum must be set.' };
    }
    for (const v of [input.minTimeMs, input.minGameTimeMs]) {
        if (v !== null && (!Number.isFinite(v) || v < 0)) {
            return { error: 'Minimum times must be non-negative numbers.' };
        }
    }

    try {
        const result = await upsertMinimumTime(
            user.id,
            input.gameId,
            input.categoryId,
            {
                subcategoryHash: input.subcategoryHash,
                minTimeMs: input.minTimeMs,
                minGameTimeMs: input.minGameTimeMs,
            },
        );
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to save minimum time.' };
    }
}
```

### - [ ] Step 3.3: Create the delete action

Create `app/(new-layout)/games-v2/[game]/manage/minimums/actions/delete-minimum.action.ts`:

```ts
'use server';

import { getSession } from '~src/actions/session.action';
import { deleteMinimumTime } from '~src/lib/leaderboard-minimums';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ApiError } from '~src/lib/api-client';
import type { DeleteMinimumTimeResult } from '../../../../../../../types/leaderboard-minimums.types';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    subcategoryHash: string;
}

export async function deleteMinimumAction(
    input: Input,
): Promise<{ result: DeleteMinimumTimeResult } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        const result = await deleteMinimumTime(
            user.id,
            input.gameId,
            input.categoryId,
            input.subcategoryHash,
        );
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to delete minimum time.' };
    }
}
```

### - [ ] Step 3.4: Verify typecheck passes

Run: `npm run typecheck`
Expected: no errors.

### - [ ] Step 3.5: Commit

```bash
git add "app/(new-layout)/games-v2/[game]/manage/minimums/actions"
git commit -m "feat(minimums): add upsert and delete server actions"
```

---

## Task 4: Manage page shell + auth gate

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/page.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/types.ts`

### - [ ] Step 4.1: Create the shared types file

Create `app/(new-layout)/games-v2/[game]/manage/types.ts`:

```ts
import type {
    ResolvedCategory,
    ResolvedGame,
    VariableDef,
} from '../../../../../types/leaderboards.types';
import type { MinimumTime } from '../../../../../types/leaderboard-minimums.types';

export interface ManagePageData {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    initialCategoryId: number;
    initialVariables: VariableDef[];
    initialMinimums: MinimumTime[];
}
```

### - [ ] Step 4.2: Create the server page

Create `app/(new-layout)/games-v2/[game]/manage/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listMinimumTimes } from '~src/lib/leaderboard-minimums';
import { getVariables } from '~src/lib/leaderboards-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ManagePage } from './manage-page';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function GameManagePage({ params }: Props) {
    const { game: slug } = await params;
    const user = await getSession();

    const game = await resolveGame(slug);
    if (!game) notFound();

    confirmPermission(user, 'edit', 'category-settings', { game: game.name });

    const { categories } = await resolveCategory(game.id);
    const initialCategory = categories[0] ?? null;

    if (!initialCategory) {
        return (
            <ManagePage
                data={{
                    game,
                    categories: [],
                    initialCategoryId: -1,
                    initialVariables: [],
                    initialMinimums: [],
                }}
            />
        );
    }

    const [initialVariables, initialMinimums] = await Promise.all([
        getVariables(game.name, initialCategory.name).catch(() => []),
        listMinimumTimes(user.id, game.id, initialCategory.id).catch(() => []),
    ]);

    return (
        <ManagePage
            data={{
                game,
                categories,
                initialCategoryId: initialCategory.id,
                initialVariables,
                initialMinimums,
            }}
        />
    );
}
```

### - [ ] Step 4.3: Create the client wrapper (no minimums section yet)

Create `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`. Leave the minimums area as a placeholder — Task 5 will replace it:

```tsx
'use client';

import Link from 'next/link';
import type { ManagePageData } from './types';

interface Props {
    data: ManagePageData;
}

export function ManagePage({ data }: Props) {
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
                <div className="ms-auto">
                    <Link
                        href={`/games-v2/${data.game.name}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        ← Back to leaderboards
                    </Link>
                </div>
            </header>

            <section>
                <h2 className="h5 mb-3">Minimum Times</h2>
                <p className="text-muted">Section coming online…</p>
            </section>
        </div>
    );
}
```

### - [ ] Step 4.4: Smoke test

Run `npm run dev`. As an admin or moderator, visit `/games-v2/<a-real-game-slug>/manage`. Confirm:
- Page renders with header (game image, "Management" label, display name, back link).
- "Section coming online…" placeholder is visible.

As a non-permitted (or anonymous) user, confirm the request errors (CASL throws → Next.js error boundary). The error page is the framework default — that's acceptable; styling the 403 page is out of scope.

### - [ ] Step 4.5: Commit

```bash
git add "app/(new-layout)/games-v2/[game]/manage/page.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/manage-page.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/types.ts"
git commit -m "feat(manage): scaffold game-management page with auth gate"
```

---

## Task 5: Minimums section + table (read-only)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/minimums/minimum-row.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/minimums/subcategory-label.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/minimums/load-category-data.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx` (import the new section)

### - [ ] Step 5.1: Create the subcategory-decoding helper

Create `app/(new-layout)/games-v2/[game]/manage/minimums/subcategory-label.ts`:

```ts
import type { VariableDef } from '../../../../../../types/leaderboards.types';

// Decode a subcategoryHash into a human-readable label using the category's
// subcategory variables. Hash format is opaque to the frontend; if we can't
// match it against the variable values, fall back to the raw hash so users
// can still see and delete the row.
export function describeSubcategory(
    hash: string,
    variables: VariableDef[],
): string {
    if (!hash) return 'Default';

    const subcatVars = variables.filter((v) => v.kind === 'subcategory');
    if (subcatVars.length === 0) return hash;

    // Heuristic: the backend's hash is constructed from sorted variable
    // values. We don't have access to the exact algorithm here, so we display
    // the raw hash with a hint when we can't decode confidently. A future
    // improvement is to ask the backend to return a `subcategoryLabel` field.
    return hash;
}
```

Note: full decoding requires knowing the backend's hash algorithm or a backend-provided label field. The spec acknowledges this and accepts the raw-hash fallback for v1.

### - [ ] Step 5.2: Create the category-data loader action

Create `app/(new-layout)/games-v2/[game]/manage/minimums/load-category-data.action.ts`:

```ts
'use server';

import { getSession } from '~src/actions/session.action';
import { listMinimumTimes } from '~src/lib/leaderboard-minimums';
import { getVariables } from '~src/lib/leaderboards-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type { VariableDef } from '../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    categorySlug: string;
    categoryId: number;
}

export async function loadCategoryDataAction(input: Input): Promise<
    | {
          result: { variables: VariableDef[]; minimums: MinimumTime[] };
      }
    | { error: string }
> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized.' };
    }

    try {
        const [variables, minimums] = await Promise.all([
            getVariables(input.gameSlug, input.categorySlug),
            listMinimumTimes(user.id, input.gameId, input.categoryId),
        ]);
        return { result: { variables, minimums } };
    } catch {
        return { error: 'Failed to load category data.' };
    }
}
```

### - [ ] Step 5.3: Create the minimum-row component

Create `app/(new-layout)/games-v2/[game]/manage/minimums/minimum-row.tsx`:

```tsx
'use client';

import { DurationToFormatted } from '~src/components/util/datetime';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type { VariableDef } from '../../../../../../types/leaderboards.types';
import { describeSubcategory } from './subcategory-label';

interface Props {
    row: MinimumTime;
    variables: VariableDef[];
    onEdit: (row: MinimumTime) => void;
    onDelete: (row: MinimumTime) => void;
    isBusy: boolean;
}

export function MinimumRow({ row, variables, onEdit, onDelete, isBusy }: Props) {
    return (
        <tr>
            <td>{describeSubcategory(row.subcategoryHash, variables)}</td>
            <td>
                {row.minTimeMs === null ? (
                    <span className="text-muted">—</span>
                ) : (
                    <DurationToFormatted
                        duration={row.minTimeMs / 1000}
                        withMillis
                    />
                )}
            </td>
            <td>
                {row.minGameTimeMs === null ? (
                    <span className="text-muted">—</span>
                ) : (
                    <DurationToFormatted
                        duration={row.minGameTimeMs / 1000}
                        withMillis
                    />
                )}
            </td>
            <td>
                {row.setBy === null ? (
                    <span className="text-muted">—</span>
                ) : (
                    <span title="user id">#{row.setBy}</span>
                )}
            </td>
            <td>
                <small className="text-muted">
                    {new Date(row.updatedAt).toLocaleString()}
                </small>
            </td>
            <td>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => onEdit(row)}
                    disabled={isBusy}
                >
                    Edit
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDelete(row)}
                    disabled={isBusy}
                >
                    Delete
                </button>
            </td>
        </tr>
    );
}
```

### - [ ] Step 5.4: Create the section component (read-only first)

Create `app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type {
    ResolvedCategory,
    VariableDef,
} from '../../../../../../types/leaderboards.types';
import type { ManagePageData } from '../types';
import { loadCategoryDataAction } from './load-category-data.action';
import { MinimumRow } from './minimum-row';

interface Props {
    data: ManagePageData;
}

export function MinimumsSection({ data }: Props) {
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        data.initialCategoryId,
    );
    const [variables, setVariables] = useState<VariableDef[]>(
        data.initialVariables,
    );
    const [minimums, setMinimums] = useState<MinimumTime[]>(
        data.initialMinimums,
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();

    const selectedCategory: ResolvedCategory | undefined = data.categories.find(
        (c) => c.id === selectedCategoryId,
    );

    const switchCategory = (cat: ResolvedCategory) => {
        if (cat.id === selectedCategoryId) return;
        setSelectedCategoryId(cat.id);
        setLoadError(null);
        startLoadTransition(async () => {
            const res = await loadCategoryDataAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categorySlug: cat.name,
                categoryId: cat.id,
            });
            if ('error' in res) {
                setLoadError(res.error);
                setVariables([]);
                setMinimums([]);
            } else {
                setVariables(res.result.variables);
                setMinimums(res.result.minimums);
            }
        });
    };

    return (
        <section>
            <h2 className="h5 mb-3">Minimum Times</h2>

            <div className="d-flex flex-wrap gap-2 mb-3">
                {data.categories.map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        className={`btn btn-sm ${
                            cat.id === selectedCategoryId
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                        }`}
                        onClick={() => switchCategory(cat)}
                        disabled={isLoading}
                    >
                        {cat.display}
                    </button>
                ))}
            </div>

            {loadError && (
                <div className="alert alert-danger" role="alert">
                    {loadError}
                </div>
            )}

            {selectedCategory && (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>Subcategory</th>
                                <th>Min RT</th>
                                <th>Min GT</th>
                                <th>Set by</th>
                                <th>Updated</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {minimums.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-muted">
                                        No minimums set for this category yet.
                                    </td>
                                </tr>
                            ) : (
                                minimums.map((row) => (
                                    <MinimumRow
                                        key={row.subcategoryHash}
                                        row={row}
                                        variables={variables}
                                        onEdit={() => {
                                            /* wired up in Task 6 */
                                        }}
                                        onDelete={() => {
                                            /* wired up in Task 7 */
                                        }}
                                        isBusy={isLoading}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
```

### - [ ] Step 5.5: Wire the section into the manage page

Modify `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`. Replace the placeholder `<section>…</section>` block with a render of the new component:

```tsx
import { MinimumsSection } from './minimums/minimums-section';

// ...inside ManagePage, replace the placeholder section with:
{data.categories.length === 0 ? (
    <p className="text-center text-muted my-5">
        This game has no categories yet.
    </p>
) : (
    <MinimumsSection data={data} />
)}
```

The final file should have the import at the top alongside `Link`, and the placeholder paragraph removed.

### - [ ] Step 5.6: Smoke test

Run `npm run dev` and visit `/games-v2/<game-slug>/manage` as a permitted user. Confirm:
- Page renders with category buttons.
- Initial category's table renders (empty state if no rows).
- Clicking a different category triggers the loader and the table updates.

### - [ ] Step 5.7: Commit

```bash
git add "app/(new-layout)/games-v2/[game]/manage"
git commit -m "feat(manage): add minimums section with category picker and read-only table"
```

---

## Task 6: Add/edit form with inline panel

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/minimums/minimum-form.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx`

### - [ ] Step 6.1: Create the form component

Create `app/(new-layout)/games-v2/[game]/manage/minimums/minimum-form.tsx`:

```tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { timeToMillis } from '~src/components/util/datetime';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';

export type FormSubmitValues = {
    subcategoryHash: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
};

interface Props {
    mode: 'create' | 'edit';
    editing: MinimumTime | null;
    onSubmit: (values: FormSubmitValues) => void;
    onCancel: () => void;
    isBusy: boolean;
    error: string | null;
}

function msToInput(ms: number | null): string {
    if (ms === null) return '';
    const totalMs = Math.max(0, Math.round(ms));
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    const pad = (n: number, w: number) => String(n).padStart(w, '0');
    return millis === 0
        ? `${pad(minutes, 2)}:${pad(seconds, 2)}`
        : `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(millis, 3)}`;
}

export function MinimumForm({
    mode,
    editing,
    onSubmit,
    onCancel,
    isBusy,
    error,
}: Props) {
    const [subcategoryHash, setSubcategoryHash] = useState('');
    const [rtInput, setRtInput] = useState('');
    const [gtInput, setGtInput] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (mode === 'edit' && editing) {
            setSubcategoryHash(editing.subcategoryHash);
            setRtInput(msToInput(editing.minTimeMs));
            setGtInput(msToInput(editing.minGameTimeMs));
        } else {
            setSubcategoryHash('');
            setRtInput('');
            setGtInput('');
        }
        setLocalError(null);
    }, [mode, editing]);

    const parse = (s: string): number | null => {
        const trimmed = s.trim();
        if (trimmed === '') return null;
        const ms = timeToMillis(trimmed);
        if (!Number.isFinite(ms) || ms <= 0) return Number.NaN;
        return ms;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        const rt = parse(rtInput);
        const gt = parse(gtInput);

        if (Number.isNaN(rt) || Number.isNaN(gt)) {
            setLocalError(
                'Times must be in m:ss or m:ss.SSS format and greater than zero.',
            );
            return;
        }
        if (rt === null && gt === null) {
            setLocalError('At least one of RT or GT minimum is required.');
            return;
        }

        onSubmit({ subcategoryHash, minTimeMs: rt, minGameTimeMs: gt });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="border rounded p-3 mb-3 bg-light-subtle"
        >
            <h3 className="h6 mb-3">
                {mode === 'create' ? 'Add minimum' : 'Edit minimum'}
            </h3>

            <div className="row g-2">
                <div className="col-md-4">
                    <label className="form-label small">Subcategory hash</label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={subcategoryHash}
                        onChange={(e) => setSubcategoryHash(e.target.value)}
                        placeholder="(empty = default)"
                        disabled={mode === 'edit' || isBusy}
                    />
                </div>
                <div className="col-md-3">
                    <label className="form-label small">Min RT (m:ss.SSS)</label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={rtInput}
                        onChange={(e) => setRtInput(e.target.value)}
                        placeholder="e.g. 0:30"
                        disabled={isBusy}
                    />
                </div>
                <div className="col-md-3">
                    <label className="form-label small">Min GT (m:ss.SSS)</label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={gtInput}
                        onChange={(e) => setGtInput(e.target.value)}
                        placeholder="(optional)"
                        disabled={isBusy}
                    />
                </div>
                <div className="col-md-2 d-flex align-items-end gap-2">
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={isBusy}
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onCancel}
                        disabled={isBusy}
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {(localError || error) && (
                <div className="alert alert-danger mt-2 mb-0 py-2">
                    {localError ?? error}
                </div>
            )}
        </form>
    );
}
```

Note on subcategory input: v1 takes a raw hash string. The spec acknowledges decoding/labeling is a follow-up. Empty string = "default leaderboard for the category" (matches backend default).

### - [ ] Step 6.2: Wire the form into the section

Modify `app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx`. Replace its entire contents with:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type {
    ResolvedCategory,
    VariableDef,
} from '../../../../../../types/leaderboards.types';
import type { ManagePageData } from '../types';
import { upsertMinimumAction } from './actions/upsert-minimum.action';
import { loadCategoryDataAction } from './load-category-data.action';
import { MinimumForm, type FormSubmitValues } from './minimum-form';
import { MinimumRow } from './minimum-row';

type FormState =
    | { open: false }
    | { open: true; mode: 'create' }
    | { open: true; mode: 'edit'; editing: MinimumTime };

interface Props {
    data: ManagePageData;
}

function flagSummary(flagged: number, unflagged: number): string {
    const parts: string[] = [];
    if (flagged > 0) parts.push(`${flagged} run(s) newly hidden`);
    if (unflagged > 0) parts.push(`${unflagged} run(s) restored`);
    return parts.length === 0 ? '' : ` — ${parts.join(', ')}.`;
}

export function MinimumsSection({ data }: Props) {
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        data.initialCategoryId,
    );
    const [variables, setVariables] = useState<VariableDef[]>(
        data.initialVariables,
    );
    const [minimums, setMinimums] = useState<MinimumTime[]>(
        data.initialMinimums,
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formState, setFormState] = useState<FormState>({ open: false });
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();

    const selectedCategory: ResolvedCategory | undefined = data.categories.find(
        (c) => c.id === selectedCategoryId,
    );
    const busy = isLoading || isSaving;

    const refresh = async (categoryId: number, categorySlug: string) => {
        const res = await loadCategoryDataAction({
            gameSlug: data.game.name,
            gameId: data.game.id,
            categorySlug,
            categoryId,
        });
        if ('error' in res) {
            setLoadError(res.error);
            setVariables([]);
            setMinimums([]);
        } else {
            setLoadError(null);
            setVariables(res.result.variables);
            setMinimums(res.result.minimums);
        }
    };

    const switchCategory = (cat: ResolvedCategory) => {
        if (cat.id === selectedCategoryId) return;
        setSelectedCategoryId(cat.id);
        setFormState({ open: false });
        setFormError(null);
        startLoadTransition(() => refresh(cat.id, cat.name));
    };

    const handleSubmit = (values: FormSubmitValues) => {
        if (!selectedCategory) return;
        setFormError(null);

        startSaveTransition(async () => {
            const res = await upsertMinimumAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: selectedCategory.id,
                subcategoryHash: values.subcategoryHash,
                minTimeMs: values.minTimeMs,
                minGameTimeMs: values.minGameTimeMs,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success(
                `Saved${flagSummary(res.result.flagged, res.result.unflagged)}`,
            );
            setFormState({ open: false });
            await refresh(selectedCategory.id, selectedCategory.name);
        });
    };

    return (
        <section>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="h5 mb-0">Minimum Times</h2>
                {selectedCategory && !formState.open && (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() =>
                            setFormState({ open: true, mode: 'create' })
                        }
                        disabled={busy}
                    >
                        + Add minimum
                    </button>
                )}
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
                {data.categories.map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        className={`btn btn-sm ${
                            cat.id === selectedCategoryId
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                        }`}
                        onClick={() => switchCategory(cat)}
                        disabled={busy}
                    >
                        {cat.display}
                    </button>
                ))}
            </div>

            {loadError && (
                <div className="alert alert-danger" role="alert">
                    {loadError}
                </div>
            )}

            {formState.open && (
                <MinimumForm
                    mode={formState.mode}
                    editing={
                        formState.mode === 'edit' ? formState.editing : null
                    }
                    onSubmit={handleSubmit}
                    onCancel={() => {
                        setFormState({ open: false });
                        setFormError(null);
                    }}
                    isBusy={isSaving}
                    error={formError}
                />
            )}

            {selectedCategory && (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>Subcategory</th>
                                <th>Min RT</th>
                                <th>Min GT</th>
                                <th>Set by</th>
                                <th>Updated</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {minimums.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-muted">
                                        No minimums set for this category yet.
                                    </td>
                                </tr>
                            ) : (
                                minimums.map((row) => (
                                    <MinimumRow
                                        key={row.subcategoryHash}
                                        row={row}
                                        variables={variables}
                                        onEdit={(r) =>
                                            setFormState({
                                                open: true,
                                                mode: 'edit',
                                                editing: r,
                                            })
                                        }
                                        onDelete={() => {
                                            /* wired up in Task 7 */
                                        }}
                                        isBusy={busy}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
```

### - [ ] Step 6.3: Smoke test

Run `npm run dev` and visit the manage page as a permitted user. Confirm:
- "+ Add minimum" button opens the inline form above the table.
- Typing `0:30` in Min RT and clicking Save creates a row and shows a success toast.
- Existing rows can be edited via the Edit button — the subcategory field is disabled in edit mode.
- Submitting with both fields empty shows the inline validation error.
- Switching categories closes the form and refreshes the table.

### - [ ] Step 6.4: Commit

```bash
git add "app/(new-layout)/games-v2/[game]/manage/minimums/minimum-form.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx"
git commit -m "feat(manage): add inline form for creating and editing minimum times"
```

---

## Task 7: Delete with confirm

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx`

### - [ ] Step 7.1: Wire up delete handler

In `app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx`:

Add an import at the top alongside the other action import:

```tsx
import { deleteMinimumAction } from './actions/delete-minimum.action';
```

Inside the `MinimumsSection` component, just below the `handleSubmit` declaration, add:

```tsx
const handleDelete = (row: MinimumTime) => {
    if (!selectedCategory) return;
    if (
        !confirm(
            'Delete this minimum time? Below-threshold runs will be restored to the leaderboard.',
        )
    ) {
        return;
    }

    startSaveTransition(async () => {
        const res = await deleteMinimumAction({
            gameSlug: data.game.name,
            gameId: data.game.id,
            categoryId: selectedCategory.id,
            subcategoryHash: row.subcategoryHash,
        });
        if ('error' in res) {
            toast.error(res.error);
            return;
        }
        const note =
            res.result.unflagged > 0
                ? ` — ${res.result.unflagged} run(s) restored.`
                : '';
        toast.success(`Removed${note}`);
        await refresh(selectedCategory.id, selectedCategory.name);
    });
};
```

Replace the `onDelete={() => { /* wired up in Task 7 */ }}` line with:

```tsx
onDelete={handleDelete}
```

### - [ ] Step 7.2: Smoke test

Run `npm run dev` and on the manage page:
- Click Delete on a row → confirm dialog appears.
- Confirm → row disappears from the table and a toast shows the restored-run count (or just "Removed" if zero).
- Cancel → row stays.

### - [ ] Step 7.3: Commit

```bash
git add "app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx"
git commit -m "feat(manage): add delete with confirm for minimum times"
```

---

## Task 8: "Manage" link in the game header

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/game-header.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/page.tsx` (to pass session data through)

### - [ ] Step 8.1: Add `canManage` to `GamePageData`

Modify `app/(new-layout)/games-v2/[game]/types.ts`. Add `canManage: boolean;` to the `GamePageData` interface, alongside `sessionUsername`:

```ts
export interface GamePageData {
    game: ResolvedGame;
    // ...existing fields...
    sessionUsername: string | null;
    canManage: boolean;
    activeFilters: {
        // ...
    };
}
```

### - [ ] Step 8.2: Compute `canManage` in `page.tsx`

Modify `app/(new-layout)/games-v2/[game]/page.tsx`. Add to the existing imports:

```tsx
import { subject as caslSubject } from '@casl/ability';
import { defineAbilityFor } from '~src/rbac/ability';
```

After the existing `const data = await loadGamePageData(...)` line, insert:

```tsx
const canManage = defineAbilityFor(session).can(
    'edit',
    caslSubject('category-settings', { game: data.game.name }),
);
data.canManage = canManage;
```

Note: `loadGamePageData` returns a fresh object each call, so mutating `data` here is safe and avoids changing the loader signature.

### - [ ] Step 8.3: Pass `canManage` from `GamePage` to `GameHeader`

Modify `app/(new-layout)/games-v2/[game]/game-page.tsx`. Find both `<GameHeader game={data.game} stats={data.quickStats} />` instances (one in the no-categories branch, one in the main branch) and update each to:

```tsx
<GameHeader
    game={data.game}
    stats={data.quickStats}
    canManage={data.canManage}
/>
```

### - [ ] Step 8.4: Add the link to the header

Modify `app/(new-layout)/games-v2/[game]/header/game-header.tsx` to accept an optional `canManage` prop and render the link:

```tsx
import Link from 'next/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    QuickStats,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';

interface Props {
    game: ResolvedGame;
    stats: QuickStats;
    canManage?: boolean;
}

export function GameHeader({ game, stats, canManage }: Props) {
    return (
        <header className="d-flex align-items-center gap-3 mb-3">
            {game.image && (
                <img
                    src={game.image}
                    alt={game.display}
                    width={48}
                    height={64}
                    className="rounded"
                    style={{ aspectRatio: '3 / 4' }}
                    loading="eager"
                />
            )}
            <div>
                <h1 className="mb-0">{game.display}</h1>
                <small className="text-muted">
                    {stats.uniqueRunners.toLocaleString()} runners ·{' '}
                    <DurationToFormatted duration={stats.totalRunTime} /> total
                </small>
            </div>
            {canManage && (
                <div className="ms-auto">
                    <Link
                        href={`/games-v2/${game.name}/manage`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        Manage
                    </Link>
                </div>
            )}
        </header>
    );
}
```

### - [ ] Step 8.5: Smoke test

Run `npm run dev` and confirm:
- As an admin / board-admin / per-game moderator, the "Manage" button appears in the game header on `/games-v2/<slug>`.
- As an anonymous or non-permitted user, the button does not appear.
- Clicking the button navigates to the manage page.

### - [ ] Step 8.6: Commit

```bash
git add "app/(new-layout)/games-v2/[game]/header/game-header.tsx" \
        "app/(new-layout)/games-v2/[game]/page.tsx" \
        "app/(new-layout)/games-v2/[game]/game-page.tsx" \
        "app/(new-layout)/games-v2/[game]/types.ts"
git commit -m "feat(manage): show Manage link in game header for permitted users"
```

---

## Task 9: End-to-end verification

**Files:** none

### - [ ] Step 9.1: Clear build cache

```bash
rm -rf .next
```

### - [ ] Step 9.2: Run typecheck

```bash
npm run typecheck
```

Expected: no errors.

### - [ ] Step 9.3: Run lint

```bash
npm run lint
```

Expected: no new errors. If the existing repo has pre-existing warnings, ignore those.

### - [ ] Step 9.4: Run dev server and walk the flow

```bash
npm run dev
```

As a permitted user (admin or per-game moderator on a real game), walk through:

1. Visit `/games-v2/<slug>` → confirm "Manage" link in header.
2. Click → land on `/games-v2/<slug>/manage` with category buttons.
3. Switch categories → table refreshes.
4. Add a minimum (e.g. RT 0:30) → toast appears with flagged-run count; row appears in table.
5. Edit the row → form opens with values pre-filled; subcategory field disabled; save updates the row.
6. Delete → confirm dialog → row removed; toast shows restored-run count.
7. Back to `/games-v2/<slug>` → leaderboard reflects ineligibility (if any runs were below threshold).
8. Log out / use a non-permitted account → confirm `/games-v2/<slug>/manage` errors and "Manage" link does not appear in the header.

### - [ ] Step 9.5: Final commit / no-op

No code changes expected. If the walk-through found issues, they're separate bugs — fix them in their own task.

---

## Out of scope (deferred follow-ups)

These are intentionally not in this plan; the spec calls them out as future work:

1. Public-facing min-time chip on the leaderboard view.
2. Bulk "apply this minimum to all subcategories of this category" action.
3. Decoded subcategory labels (currently shows raw hash) — needs backend label or shared decoding algorithm.
4. Username resolution for the `Set by` column.
5. Additional management sections (run moderation, exclusions, moderator assignment).
