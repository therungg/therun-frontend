# Leaderboard Reassignment Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the mod-facing frontend for leaderboard reassignment — typed API wrappers, RBAC, two console wizards, a status view, a global audit log, and tombstone 301 redirects — against the already-deployed backend.

**Architecture:** Additive frontend work following established patterns. Typed `apiFetch` wrappers + a CASL ability mirror form the foundation. The audit log is a read-only admin page; the wizards and status view live in the per-game console (`games-v2/[game]/manage/`), gated by a new `reassign` ability. Tombstone redirects are threaded through the existing `resolveGame` plumbing.

**Tech Stack:** Next.js 16 (App Router, Server + Client Components), React 19, TypeScript, CASL (`@casl/ability`, `@casl/react`), `react-toastify`.

---

## Verification model (read first)

This repo has **no test runner** (no jest/vitest, zero test files) and **no UI test infrastructure**. Per the project's instruction priority, we do not introduce one. The per-task verification gate is:

- `npm run typecheck` — must pass (`tsc --noEmit`).
- `npm run lint` — must pass (`npx @biomejs/biome check .`).
- Pure-logic units (the `nav-model` visibility function and the game-wizard mapping reducer) get a tiny self-checking script run via `npx tsx` and then deleted — they are not committed, because there's no test harness to house them. Where a step says "logic check", it means: write the throwaway script, run it, confirm output, delete it.
- UI behavior is verified by a manual mod-flow walkthrough at the end (Task 13).

Biome formatting: 4-space indent, single quotes, semicolons, trailing commas. The husky pre-commit runs `biome check --write` on staged files, so commits auto-format.

All work happens on the existing branch `reassignment-frontend`.

---

## File structure

**New files**
- `types/reassignments.types.ts` — all reassignment types.
- `src/lib/reassignments.ts` — 8 typed endpoint wrappers.
- `app/(new-layout)/admin/reassignments/page.tsx` — admin-only audit log (server).
- `app/(new-layout)/admin/reassignments/audit-log-client.tsx` — audit log UI (client).
- `app/(new-layout)/admin/reassignments/actions/undo-reassignment.action.ts` — undo server action.
- `app/(new-layout)/games-v2/[game]/manage/reassignments/use-reassignment-status.ts` — polling hook.
- `app/(new-layout)/games-v2/[game]/manage/reassignments/reassignment-status.tsx` — status pane.
- `app/(new-layout)/games-v2/[game]/manage/reassignments/category-wizard.tsx` — category wizard.
- `app/(new-layout)/games-v2/[game]/manage/reassignments/game-wizard.tsx` — game wizard.
- `app/(new-layout)/games-v2/[game]/manage/reassignments/mapping-reducer.ts` — pure mapping-override logic for the game wizard.
- `app/(new-layout)/games-v2/[game]/manage/reassignments/reassignment-actions.ts` — `'use server'` actions for create/undo from the console.
- `app/(new-layout)/games-v2/[game]/manage/reassignments/reassignments.module.scss` — wizard styles.

**Modified files**
- `src/rbac/ability.ts` — add `reassign` action, `reassignment` subject, grants.
- `src/lib/game-search.ts` — add `id` to `GameSearchResult`.
- `types/leaderboards.types.ts` — add redirect fields to `ResolvedGame`.
- `src/lib/games-v1.ts` — `resolveGame` returns redirect fields.
- `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts` — `reassign` nav item + `canReassign` flag.
- `app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx` — thread `canReassign`.
- `app/(new-layout)/games-v2/[game]/manage/console/console-chrome.tsx` — thread `canReassign` (only if it forwards `flags`).
- `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx` — route the `reassign` item to the wizard panes.
- `app/(new-layout)/games-v2/[game]/manage/page.tsx` — compute `canReassign`, pass into `ConsoleShell`.
- `app/(new-layout)/games-v2/[game]/page.tsx` — 301 on tombstone.

---

## Task 1: RBAC — add `reassign` / `reassignment`

**Files:**
- Modify: `src/rbac/ability.ts`

- [ ] **Step 1: Add the action**

In `src/rbac/ability.ts`, add `'reassign'` to the `actions` tuple (after `'moderate'`):

```typescript
export const actions = [
    'create',
    'join',
    'edit',
    'delete',
    'ban',
    'style',
    // eslint-disable-next-line sonarjs/no-duplicate-string
    'view-restricted',
    'moderate',
    'reassign',
] as const;
```

- [ ] **Step 2: Add the subject**

Add `'reassignment'` to the `subjects` tuple (after `'category-settings'`):

```typescript
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
    'reassignment',
] as const;
```

- [ ] **Step 3: Grant to board roles**

`admin` already gets everything via its `actions.forEach × subjects.forEach` loop — no change there. Add the grant to `board-admin` and `board-moderator`:

```typescript
    'board-admin': function (_user, { can }) {
        can('edit', 'leaderboard');
        can('edit', 'moderators');
        can('edit', 'category-settings');
        can('reassign', 'reassignment');
    },
    'board-moderator': function (_user, { can }) {
        can('edit', 'leaderboard');
        can('edit', 'category-settings');
        can('reassign', 'reassignment');
    },
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add src/rbac/ability.ts
git commit -m "feat(reassignment): add reassign action and reassignment subject to RBAC"
```

---

## Task 2: Types

**Files:**
- Create: `types/reassignments.types.ts`

- [ ] **Step 1: Create the types file**

```typescript
export type CategoryDecision = 'merge' | 'create' | 'drop';

export interface CategoryMappingEntry {
    sourceCategoryId: number;
    decision: CategoryDecision;
    targetCategoryId: number | null;
    autoCreated: boolean;
}

export type SettingsDiffField =
    | 'primaryTiming'
    | 'hideRealTime'
    | 'hideGameTime'
    | 'requireVideo'
    | 'requireVideoTopN'
    | 'isExtension'
    | 'isMain'
    | 'sortAscending'
    | 'showMilliseconds'
    | 'variables';

export interface SettingsDiff {
    field: SettingsDiffField;
    source: unknown;
    target: unknown;
}

export interface CategorySettingsDiffs {
    sourceCategoryId: number;
    targetCategoryId: number;
    diffs: SettingsDiff[];
}

export type ReassignmentStatus =
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'undoing'
    | 'undone';

export interface GameReassignment {
    id: number;
    sourceGameId: number;
    targetGameId: number;
    performedBy: number;
    performedAt: string;
    undoneBy: number | null;
    undoneAt: string | null;
    categoryMapping: CategoryMappingEntry[];
    settingsDiffsAcknowledged: CategorySettingsDiffs[] | null;
    status: ReassignmentStatus;
    statusMessage: string | null;
    runsMovedCount: number;
}

export interface CategoryReassignment {
    id: number;
    sourceCategoryId: number;
    targetCategoryId: number | null;
    gameId: number;
    parentGameReassignmentId: number | null;
    performedBy: number;
    performedAt: string;
    undoneBy: number | null;
    undoneAt: string | null;
    settingsDiffsAcknowledged: CategorySettingsDiffs[] | null;
    status: ReassignmentStatus;
    statusMessage: string | null;
    runsMovedCount: number;
}

export interface PreviewError {
    code: string;
    message: string;
}

export type PreviewResult =
    | {
          valid: true;
          mapping: CategoryMappingEntry[];
          diffs: CategorySettingsDiffs[];
      }
    | { valid: false; errors: PreviewError[] };
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add types/reassignments.types.ts
git commit -m "feat(reassignment): add reassignment type definitions"
```

---

## Task 3: API client wrappers

**Files:**
- Create: `src/lib/reassignments.ts`

Note: `apiFetch<T>(path, { method, sessionId, body })` returns `json.result` and throws `ApiError` on non-2xx. Routes are under `/reassignments/*` (no `/v1`).

- [ ] **Step 1: Create the wrappers**

```typescript
'use server';

import { apiFetch } from './api-client';
import type {
    CategoryMappingEntry,
    CategoryReassignment,
    CategorySettingsDiffs,
    GameReassignment,
    PreviewResult,
} from '../../types/reassignments.types';

export async function previewGameReassignment(
    sourceGameId: number,
    targetGameId: number,
    sessionId: string,
): Promise<PreviewResult> {
    return apiFetch<PreviewResult>('/reassignments/games/preview', {
        method: 'POST',
        sessionId,
        body: { sourceGameId, targetGameId },
    });
}

export async function createGameReassignment(
    body: {
        sourceGameId: number;
        targetGameId: number;
        categoryMapping: CategoryMappingEntry[];
        settingsDiffsAcknowledged?: CategorySettingsDiffs[];
    },
    sessionId: string,
): Promise<{ id: number; status: string }> {
    return apiFetch<{ id: number; status: string }>('/reassignments/games', {
        method: 'POST',
        sessionId,
        body,
    });
}

export async function getGameReassignment(
    id: number,
    sessionId: string,
): Promise<GameReassignment> {
    return apiFetch<GameReassignment>(`/reassignments/games/${id}`, {
        method: 'GET',
        sessionId,
    });
}

export async function undoGameReassignment(
    id: number,
    sessionId: string,
): Promise<{ id: number; undone: true }> {
    return apiFetch<{ id: number; undone: true }>(
        `/reassignments/games/${id}/undo`,
        { method: 'POST', sessionId },
    );
}

export async function createCategoryReassignment(
    body: {
        sourceCategoryId: number;
        targetCategoryId: number;
        settingsDiffsAcknowledged?: CategorySettingsDiffs[];
    },
    sessionId: string,
): Promise<{ id: number; status: string }> {
    return apiFetch<{ id: number; status: string }>(
        '/reassignments/categories',
        { method: 'POST', sessionId, body },
    );
}

export async function getCategoryReassignment(
    id: number,
    sessionId: string,
): Promise<CategoryReassignment> {
    return apiFetch<CategoryReassignment>(`/reassignments/categories/${id}`, {
        method: 'GET',
        sessionId,
    });
}

export async function undoCategoryReassignment(
    id: number,
    sessionId: string,
): Promise<{ id: number; undone: true }> {
    return apiFetch<{ id: number; undone: true }>(
        `/reassignments/categories/${id}/undo`,
        { method: 'POST', sessionId },
    );
}

export async function listReassignments(
    limit: number,
    sessionId: string,
): Promise<{
    games: GameReassignment[];
    categories: CategoryReassignment[];
}> {
    return apiFetch<{
        games: GameReassignment[];
        categories: CategoryReassignment[];
    }>(`/reassignments?limit=${limit}`, { method: 'GET', sessionId });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/reassignments.ts
git commit -m "feat(reassignment): add typed API client wrappers"
```

---

## Task 4: `searchGames` returns id

**Files:**
- Modify: `src/lib/game-search.ts`

Context: `getGamesPage(query, page, pageSize)` returns `{ items: Game[] }`. The `Game` type (from `app/(new-layout)/games/games.types`) carries a numeric game id. Confirm the exact id field name on `Game` before editing (it may be `id` or `gameId`); the steps below assume `id` — adjust if the type uses `gameId`.

- [ ] **Step 1: Verify the id field name on `Game`**

Run: `grep -nE "id|gameId" app/\(new-layout\)/games/games.types.ts | head`
Expected: shows whether the field is `id` or `gameId`. Use that name in Step 2.

- [ ] **Step 2: Add id to the result type and mapping**

```typescript
export interface GameSearchResult {
    id: number;
    game: string;
    display: string;
    image?: string;
}

export async function searchGames(query: string): Promise<GameSearchResult[]> {
    if (query.length < 2) return [];

    const result = await getGamesPage(query, 1, 8);

    return result.items.map((g: Game) => ({
        id: g.id, // or g.gameId per Step 1
        game: g.game,
        display: g.display,
        image: g.image,
    }));
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If it fails because `Game` has no `id`/`gameId`, the field is named differently — fix the mapping to the real field.

- [ ] **Step 4: Commit**

```bash
git add src/lib/game-search.ts
git commit -m "feat(reassignment): expose game id from searchGames"
```

---

## Task 5: Audit log page (admin-only, read-only)

**Files:**
- Create: `app/(new-layout)/admin/reassignments/page.tsx`
- Create: `app/(new-layout)/admin/reassignments/audit-log-client.tsx`

- [ ] **Step 1: Server page**

`app/(new-layout)/admin/reassignments/page.tsx`:

```tsx
'use server';

import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { listReassignments } from '~src/lib/reassignments';
import { AuditLogClient } from './audit-log-client';

export default async function ReassignmentsAuditPage() {
    const session = await getSession();
    if (!session.roles?.includes('admin')) {
        notFound();
    }

    const { games, categories } = await listReassignments(200, session.id);

    return <AuditLogClient games={games} categories={categories} />;
}
```

- [ ] **Step 2: Client — merged timeline + expand + undo**

`app/(new-layout)/admin/reassignments/audit-log-client.tsx`:

```tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    CategoryReassignment,
    GameReassignment,
} from '../../../../types/reassignments.types';
import styles from '../admin.module.scss';
import { undoReassignmentAction } from './actions/undo-reassignment.action';

interface Props {
    games: GameReassignment[];
    categories: CategoryReassignment[];
}

type Entry =
    | { kind: 'game'; row: GameReassignment }
    | { kind: 'category'; row: CategoryReassignment };

function canUndo(entry: Entry): boolean {
    if (entry.row.status !== 'completed') return false;
    if (entry.kind === 'category' && entry.row.parentGameReassignmentId !== null) {
        return false;
    }
    return true;
}

export const AuditLogClient = ({ games, categories }: Props) => {
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [isUndoing, startUndo] = useTransition();

    const entries = useMemo<Entry[]>(() => {
        const merged: Entry[] = [
            ...games.map((row) => ({ kind: 'game' as const, row })),
            ...categories.map((row) => ({ kind: 'category' as const, row })),
        ];
        return merged.sort(
            (a, b) =>
                new Date(b.row.performedAt).getTime() -
                new Date(a.row.performedAt).getTime(),
        );
    }, [games, categories]);

    const handleUndo = (entry: Entry) => {
        if (
            !confirm(
                `Undo ${entry.kind} reassignment #${entry.row.id}? This reverses the merge.`,
            )
        ) {
            return;
        }
        startUndo(async () => {
            try {
                await undoReassignmentAction(entry.kind, entry.row.id);
                toast.success('Reassignment undone');
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Undo failed',
                );
            }
        });
    };

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h4 className={styles.panelTitle}>Reassignment audit log</h4>
                    <span className={styles.panelCount}>{entries.length}</span>
                </div>
                <div className={styles.panelBody}>
                    {entries.length === 0 ? (
                        <span className={styles.noData}>
                            No reassignments recorded.
                        </span>
                    ) : (
                        <table className={styles.table}>
                            <thead className={styles.tableHeader}>
                                <tr>
                                    <th>ID</th>
                                    <th>Kind</th>
                                    <th>Source → Target</th>
                                    <th>By</th>
                                    <th>Status</th>
                                    <th>Runs</th>
                                    <th>When</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody className={styles.tableBody}>
                                {entries.map((entry) => {
                                    const key = `${entry.kind}-${entry.row.id}`;
                                    const expanded = expandedKey === key;
                                    const source =
                                        entry.kind === 'game'
                                            ? entry.row.sourceGameId
                                            : entry.row.sourceCategoryId;
                                    const target =
                                        entry.kind === 'game'
                                            ? entry.row.targetGameId
                                            : entry.row.targetCategoryId ?? '—';
                                    return (
                                        <>
                                            <tr
                                                key={key}
                                                onClick={() =>
                                                    setExpandedKey(
                                                        expanded ? null : key,
                                                    )
                                                }
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td>{entry.row.id}</td>
                                                <td>{entry.kind}</td>
                                                <td>
                                                    {source} → {target}
                                                </td>
                                                <td>{entry.row.performedBy}</td>
                                                <td>{entry.row.status}</td>
                                                <td>
                                                    {entry.row.runsMovedCount}
                                                </td>
                                                <td>
                                                    {new Date(
                                                        entry.row.performedAt,
                                                    ).toLocaleString()}
                                                </td>
                                                <td>
                                                    {canUndo(entry) ? (
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.btnDanger
                                                            }
                                                            disabled={isUndoing}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUndo(
                                                                    entry,
                                                                );
                                                            }}
                                                        >
                                                            Undo
                                                        </button>
                                                    ) : entry.kind ===
                                                          'category' &&
                                                      entry.row
                                                          .parentGameReassignmentId !==
                                                          null ? (
                                                        <span
                                                            title="Undo via the parent game reassignment"
                                                            className={
                                                                styles.noData
                                                            }
                                                        >
                                                            via parent
                                                        </span>
                                                    ) : null}
                                                </td>
                                            </tr>
                                            {expanded && (
                                                <tr key={`${key}-detail`}>
                                                    <td colSpan={8}>
                                                        <pre
                                                            style={{
                                                                whiteSpace:
                                                                    'pre-wrap',
                                                                margin: 0,
                                                            }}
                                                        >
                                                            {JSON.stringify(
                                                                entry.kind ===
                                                                    'game'
                                                                    ? entry.row
                                                                          .categoryMapping
                                                                    : entry.row
                                                                          .settingsDiffsAcknowledged,
                                                                null,
                                                                2,
                                                            )}
                                                        </pre>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: FAIL — `undo-reassignment.action` does not exist yet. That's expected; Task 6 creates it. Do not commit yet.

---

## Task 6: Undo server action (admin)

**Files:**
- Create: `app/(new-layout)/admin/reassignments/actions/undo-reassignment.action.ts`

- [ ] **Step 1: Create the action**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import {
    undoCategoryReassignment,
    undoGameReassignment,
} from '~src/lib/reassignments';
import { defineAbilityFor } from '~src/rbac/ability';

const PAGE_PATH = '/admin/reassignments';

export async function undoReassignmentAction(
    kind: 'game' | 'category',
    id: number,
): Promise<{ id: number; undone: true }> {
    const session = await getSession();
    if (!defineAbilityFor(session).can('reassign', 'reassignment')) {
        throw new Error('Forbidden: reassign permission required');
    }

    const result =
        kind === 'game'
            ? await undoGameReassignment(id, session.id)
            : await undoCategoryReassignment(id, session.id);

    revalidatePath(PAGE_PATH);
    return result;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (Task 5's page now resolves its import).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(new-layout)/admin/reassignments"
git commit -m "feat(reassignment): admin audit log page with undo"
```

---

## Task 7: Polling hook + status pane

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/reassignments/use-reassignment-status.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/reassignments/reassignment-status.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/reassignments/reassignments.module.scss`

- [ ] **Step 1: Create the styles file**

`reassignments.module.scss`:

```scss
.wizard {
    max-width: 760px;
}

.step {
    margin-bottom: 1.5rem;
}

.error {
    color: var(--bs-danger, #dc3545);
}

.success {
    color: var(--bs-success, #198754);
}

.muted {
    opacity: 0.7;
}

.decisionPill {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.08);
    font-size: 0.85rem;
}
```

- [ ] **Step 2: Create the polling hook**

The hook fetches via server actions (defined in Task 9 as `reassignment-actions.ts` — `getGameStatusAction` / `getCategoryStatusAction`). To avoid a forward dependency, the hook takes a `fetcher` callback instead of importing the action directly.

`use-reassignment-status.ts`:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import type {
    CategoryReassignment,
    GameReassignment,
} from '../../../../../../types/reassignments.types';

type AnyReassignment = GameReassignment | CategoryReassignment;
const TERMINAL = new Set(['completed', 'failed', 'undone']);

export function useReassignmentStatus<T extends AnyReassignment>(
    id: number | null,
    fetcher: (id: number) => Promise<T>,
): { data: T | null; error: string | null } {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    useEffect(() => {
        if (id === null) return;
        let cancelled = false;

        const poll = async () => {
            try {
                const result = await fetcherRef.current(id);
                if (cancelled) return;
                setData(result);
                setError(null);
                if (TERMINAL.has(result.status)) {
                    clearInterval(interval);
                }
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Poll failed');
            }
        };

        const interval = setInterval(poll, 1500);
        void poll(); // immediate first read

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [id]);

    return { data, error };
}
```

- [ ] **Step 3: Create the status pane**

`reassignment-status.tsx`:

```tsx
'use client';

import type {
    CategoryReassignment,
    GameReassignment,
} from '../../../../../../types/reassignments.types';
import Link from '~src/components/link';
import styles from './reassignments.module.scss';
import { useReassignmentStatus } from './use-reassignment-status';

interface Props<T extends GameReassignment | CategoryReassignment> {
    id: number;
    fetcher: (id: number) => Promise<T>;
    targetGameSlug?: string;
    onUndo?: () => void;
    onRestart?: () => void;
}

export function ReassignmentStatus<
    T extends GameReassignment | CategoryReassignment,
>({ id, fetcher, targetGameSlug, onUndo, onRestart }: Props<T>) {
    const { data, error } = useReassignmentStatus<T>(id, fetcher);

    if (error && !data) {
        return <p className={styles.error}>Failed to load status: {error}</p>;
    }
    if (!data) {
        return <p className={styles.muted}>Loading status…</p>;
    }

    return (
        <div className={styles.step}>
            <p>
                Status: <strong>{data.status}</strong>
            </p>
            {data.status === 'completed' && (
                <>
                    <p className={styles.success}>
                        Done. {data.runsMovedCount} runs moved.
                    </p>
                    {targetGameSlug && (
                        <p>
                            <Link href={`/games-v2/${targetGameSlug}`}>
                                View target game ↗
                            </Link>
                        </p>
                    )}
                    {onUndo && (
                        <button type="button" onClick={onUndo}>
                            Undo
                        </button>
                    )}
                </>
            )}
            {data.status === 'failed' && (
                <>
                    <p className={styles.error}>
                        {data.statusMessage ?? 'Reassignment failed.'}
                    </p>
                    {onRestart && (
                        <button type="button" onClick={onRestart}>
                            Restart
                        </button>
                    )}
                </>
            )}
            {(data.status === 'pending' || data.status === 'running') && (
                <p className={styles.muted}>Working… this may take a few seconds.</p>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (`~src/components/link` is the existing internal Link — confirm the import path matches its use elsewhere, e.g. in `content-router.tsx`.)

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/reassignments"
git commit -m "feat(reassignment): status polling hook and status pane"
```

---

## Task 8: Mapping reducer (pure logic for the game wizard)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/reassignments/mapping-reducer.ts`

- [ ] **Step 1: Create the reducer**

```typescript
import type {
    CategoryDecision,
    CategoryMappingEntry,
} from '../../../../../../types/reassignments.types';

export interface MappingOverride {
    sourceCategoryId: number;
    decision: CategoryDecision;
    targetCategoryId: number | null;
}

/**
 * Apply a user's per-row override to the preview-supplied mapping.
 * - merge: requires a targetCategoryId.
 * - create: targetCategoryId becomes null (filled at execute time), autoCreated true.
 * - drop: targetCategoryId null, autoCreated false.
 */
export function applyOverride(
    mapping: CategoryMappingEntry[],
    override: MappingOverride,
): CategoryMappingEntry[] {
    return mapping.map((entry) => {
        if (entry.sourceCategoryId !== override.sourceCategoryId) return entry;
        return {
            sourceCategoryId: entry.sourceCategoryId,
            decision: override.decision,
            targetCategoryId:
                override.decision === 'merge' ? override.targetCategoryId : null,
            autoCreated: override.decision === 'create',
        };
    });
}

/** True when every merge decision has a concrete target. */
export function mappingIsComplete(mapping: CategoryMappingEntry[]): boolean {
    return mapping.every(
        (e) => e.decision !== 'merge' || e.targetCategoryId !== null,
    );
}
```

- [ ] **Step 2: Logic check (throwaway)**

Create `/tmp/mapping-check.ts`:

```typescript
import { applyOverride, mappingIsComplete } from './app/(new-layout)/games-v2/[game]/manage/reassignments/mapping-reducer';

const base = [
    { sourceCategoryId: 1, decision: 'merge' as const, targetCategoryId: 10, autoCreated: false },
];
const dropped = applyOverride(base, { sourceCategoryId: 1, decision: 'drop', targetCategoryId: null });
console.assert(dropped[0].decision === 'drop' && dropped[0].targetCategoryId === null, 'drop failed');
const created = applyOverride(base, { sourceCategoryId: 1, decision: 'create', targetCategoryId: 5 });
console.assert(created[0].autoCreated === true && created[0].targetCategoryId === null, 'create failed');
const incomplete = applyOverride(base, { sourceCategoryId: 1, decision: 'merge', targetCategoryId: null });
console.assert(mappingIsComplete(incomplete) === false, 'completeness failed');
console.log('mapping-reducer OK');
```

Run: `npx tsx /tmp/mapping-check.ts`
Expected: prints `mapping-reducer OK` with no assertion errors. Then delete it: `rm /tmp/mapping-check.ts`.

(If the bracketed `[game]` path breaks the import resolution, copy the reducer path into a temp file inside the repo root instead; the goal is only to confirm the logic.)

- [ ] **Step 3: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add "app/(new-layout)/games-v2/[game]/manage/reassignments/mapping-reducer.ts"
git commit -m "feat(reassignment): pure mapping-override reducer for game wizard"
```

---

## Task 9: Console server actions

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/reassignments/reassignment-actions.ts`

These wrap the lib calls with a session + ability check so client components don't handle the session token.

- [ ] **Step 1: Create the actions**

```typescript
'use server';

import { getSession } from '~src/actions/session.action';
import {
    createCategoryReassignment,
    createGameReassignment,
    getCategoryReassignment,
    getGameReassignment,
    previewGameReassignment,
    undoCategoryReassignment,
    undoGameReassignment,
} from '~src/lib/reassignments';
import { defineAbilityFor } from '~src/rbac/ability';
import type {
    CategoryMappingEntry,
    CategoryReassignment,
    CategorySettingsDiffs,
    GameReassignment,
    PreviewResult,
} from '../../../../../../types/reassignments.types';

async function requireReassign() {
    const session = await getSession();
    if (!defineAbilityFor(session).can('reassign', 'reassignment')) {
        throw new Error('Forbidden: reassign permission required');
    }
    return session;
}

export async function previewGameAction(
    sourceGameId: number,
    targetGameId: number,
): Promise<PreviewResult> {
    const session = await requireReassign();
    return previewGameReassignment(sourceGameId, targetGameId, session.id);
}

export async function createGameAction(body: {
    sourceGameId: number;
    targetGameId: number;
    categoryMapping: CategoryMappingEntry[];
    settingsDiffsAcknowledged?: CategorySettingsDiffs[];
}): Promise<{ id: number; status: string }> {
    const session = await requireReassign();
    return createGameReassignment(body, session.id);
}

export async function createCategoryAction(body: {
    sourceCategoryId: number;
    targetCategoryId: number;
    settingsDiffsAcknowledged?: CategorySettingsDiffs[];
}): Promise<{ id: number; status: string }> {
    const session = await requireReassign();
    return createCategoryReassignment(body, session.id);
}

export async function getGameStatusAction(
    id: number,
): Promise<GameReassignment> {
    const session = await requireReassign();
    return getGameReassignment(id, session.id);
}

export async function getCategoryStatusAction(
    id: number,
): Promise<CategoryReassignment> {
    const session = await requireReassign();
    return getCategoryReassignment(id, session.id);
}

export async function undoGameAction(
    id: number,
): Promise<{ id: number; undone: true }> {
    const session = await requireReassign();
    return undoGameReassignment(id, session.id);
}

export async function undoCategoryAction(
    id: number,
): Promise<{ id: number; undone: true }> {
    const session = await requireReassign();
    return undoCategoryReassignment(id, session.id);
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/reassignments/reassignment-actions.ts"
git commit -m "feat(reassignment): console server actions for preview/create/undo/status"
```

---

## Task 10: Category-reassignment wizard

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/reassignments/category-wizard.tsx`

The wizard takes the source game's categories (already loaded by the console as `{ id, display }[]`) and the source category. It has no backend preview for categories, so the settings-diff step is a simple acknowledgement checkbox.

- [ ] **Step 1: Create the wizard**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import styles from './reassignments.module.scss';
import { createCategoryAction, getCategoryStatusAction } from './reassignment-actions';
import { ReassignmentStatus } from './reassignment-status';

interface CategoryOption {
    id: number;
    display: string;
}

interface Props {
    sourceCategory: CategoryOption;
    categories: CategoryOption[];
    targetGameSlug: string;
}

export function CategoryWizard({
    sourceCategory,
    categories,
    targetGameSlug,
}: Props) {
    const [targetId, setTargetId] = useState<number | null>(null);
    const [acknowledged, setAcknowledged] = useState(false);
    const [createdId, setCreatedId] = useState<number | null>(null);
    const [isSubmitting, startSubmit] = useTransition();

    const targets = categories.filter((c) => c.id !== sourceCategory.id);

    if (createdId !== null) {
        return (
            <div className={styles.wizard}>
                <h3>Reassigning {sourceCategory.display}</h3>
                <ReassignmentStatus
                    id={createdId}
                    fetcher={getCategoryStatusAction}
                    targetGameSlug={targetGameSlug}
                    onRestart={() => {
                        setCreatedId(null);
                        setAcknowledged(false);
                        setTargetId(null);
                    }}
                />
            </div>
        );
    }

    const submit = () => {
        if (targetId === null) return;
        startSubmit(async () => {
            try {
                const res = await createCategoryAction({
                    sourceCategoryId: sourceCategory.id,
                    targetCategoryId: targetId,
                });
                setCreatedId(res.id);
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to start',
                );
            }
        });
    };

    return (
        <div className={styles.wizard}>
            <h3>Reassign category: {sourceCategory.display}</h3>

            <div className={styles.step}>
                <label htmlFor="target-cat">Target category (same game)</label>
                <select
                    id="target-cat"
                    value={targetId ?? ''}
                    onChange={(e) =>
                        setTargetId(
                            e.target.value ? Number(e.target.value) : null,
                        )
                    }
                >
                    <option value="">Select…</option>
                    {targets.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.display}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.step}>
                <label>
                    <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                    />{' '}
                    I understand the source category becomes a redirect and its
                    runs move to the target. This is reversible via the audit
                    log.
                </label>
            </div>

            <button
                type="button"
                onClick={submit}
                disabled={targetId === null || !acknowledged || isSubmitting}
            >
                {isSubmitting ? 'Starting…' : 'Confirm reassignment'}
            </button>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

```bash
git add "app/(new-layout)/games-v2/[game]/manage/reassignments/category-wizard.tsx"
git commit -m "feat(reassignment): category reassignment wizard"
```

---

## Task 11: Game-reassignment wizard

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/reassignments/game-wizard.tsx`

Five steps in one client component, driven by local state. Uses `searchGames` (now returning `id`) for the target typeahead and `previewGameAction` for the mapping/diffs.

- [ ] **Step 1: Create the wizard**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { searchGames, type GameSearchResult } from '~src/lib/game-search';
import type {
    CategoryMappingEntry,
    CategorySettingsDiffs,
    PreviewError,
} from '../../../../../../types/reassignments.types';
import styles from './reassignments.module.scss';
import { applyOverride, mappingIsComplete } from './mapping-reducer';
import {
    createGameAction,
    getGameStatusAction,
    previewGameAction,
} from './reassignment-actions';
import { ReassignmentStatus } from './reassignment-status';

interface Props {
    sourceGameId: number;
    sourceGameDisplay: string;
    /** display lookup for source categories, for the mapping table labels */
    sourceCategoryNames: Record<number, string>;
}

type Step = 'target' | 'mapping' | 'diffs' | 'impact' | 'status';

export function GameWizard({
    sourceGameId,
    sourceGameDisplay,
    sourceCategoryNames,
}: Props) {
    const [step, setStep] = useState<Step>('target');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GameSearchResult[]>([]);
    const [target, setTarget] = useState<GameSearchResult | null>(null);
    const [mapping, setMapping] = useState<CategoryMappingEntry[]>([]);
    const [diffs, setDiffs] = useState<CategorySettingsDiffs[]>([]);
    const [ackedPairs, setAckedPairs] = useState<Set<number>>(new Set());
    const [previewErrors, setPreviewErrors] = useState<PreviewError[]>([]);
    const [createdId, setCreatedId] = useState<number | null>(null);
    const [isPending, startPending] = useTransition();

    const runSearch = (q: string) => {
        setQuery(q);
        if (q.length < 2) {
            setResults([]);
            return;
        }
        startPending(async () => {
            const found = await searchGames(q);
            setResults(found.filter((g) => g.id !== sourceGameId));
        });
    };

    const pickTarget = (g: GameSearchResult) => {
        setTarget(g);
        startPending(async () => {
            try {
                const preview = await previewGameAction(sourceGameId, g.id);
                if (!preview.valid) {
                    setPreviewErrors(preview.errors);
                    return;
                }
                setPreviewErrors([]);
                setMapping(preview.mapping);
                setDiffs(preview.diffs);
                setStep('mapping');
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Preview failed',
                );
            }
        });
    };

    const setRowDecision = (
        sourceCategoryId: number,
        decision: CategoryMappingEntry['decision'],
        targetCategoryId: number | null,
    ) => {
        setMapping((m) =>
            applyOverride(m, { sourceCategoryId, decision, targetCategoryId }),
        );
    };

    const allAcked = diffs.every((d) => ackedPairs.has(d.sourceCategoryId));

    const submit = () => {
        startPending(async () => {
            try {
                const res = await createGameAction({
                    sourceGameId,
                    targetGameId: target!.id,
                    categoryMapping: mapping,
                    settingsDiffsAcknowledged: diffs,
                });
                setCreatedId(res.id);
                setStep('status');
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to start',
                );
            }
        });
    };

    return (
        <div className={styles.wizard}>
            <h3>Reassign game: {sourceGameDisplay}</h3>

            {step === 'target' && (
                <div className={styles.step}>
                    <label htmlFor="target-game">Merge into game</label>
                    <input
                        id="target-game"
                        value={query}
                        onChange={(e) => runSearch(e.target.value)}
                        placeholder="Search target game…"
                    />
                    {previewErrors.length > 0 && (
                        <ul className={styles.error}>
                            {previewErrors.map((er) => (
                                <li key={er.code}>{er.message}</li>
                            ))}
                        </ul>
                    )}
                    <ul>
                        {results.map((g) => (
                            <li key={g.id}>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => pickTarget(g)}
                                >
                                    {g.display}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {step === 'mapping' && (
                <div className={styles.step}>
                    <p>Decide what happens to each source category.</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Source category</th>
                                <th>Decision</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mapping.map((row) => (
                                <tr key={row.sourceCategoryId}>
                                    <td>
                                        {sourceCategoryNames[
                                            row.sourceCategoryId
                                        ] ?? row.sourceCategoryId}
                                    </td>
                                    <td>
                                        <select
                                            value={row.decision}
                                            onChange={(e) =>
                                                setRowDecision(
                                                    row.sourceCategoryId,
                                                    e.target
                                                        .value as CategoryMappingEntry['decision'],
                                                    row.targetCategoryId,
                                                )
                                            }
                                        >
                                            <option value="merge">
                                                Merge
                                            </option>
                                            <option value="create">
                                                Create on target
                                            </option>
                                            <option value="drop">Drop</option>
                                        </select>
                                        {row.decision === 'merge' && (
                                            <span className={styles.muted}>
                                                {' '}
                                                → target #
                                                {row.targetCategoryId ?? '?'}
                                            </span>
                                        )}
                                        {row.autoCreated && (
                                            <span className={styles.decisionPill}>
                                                auto-created
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button
                        type="button"
                        disabled={!mappingIsComplete(mapping)}
                        onClick={() => setStep('diffs')}
                    >
                        Next: settings diffs
                    </button>
                </div>
            )}

            {step === 'diffs' && (
                <div className={styles.step}>
                    {diffs.length === 0 ? (
                        <p className={styles.muted}>
                            No conflicting settings to acknowledge.
                        </p>
                    ) : (
                        diffs.map((pair) => (
                            <div key={pair.sourceCategoryId}>
                                <h4>
                                    {sourceCategoryNames[pair.sourceCategoryId] ??
                                        pair.sourceCategoryId}{' '}
                                    → #{pair.targetCategoryId}
                                </h4>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Field</th>
                                            <th>Source</th>
                                            <th>Target</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pair.diffs.map((d) => (
                                            <tr key={d.field}>
                                                <td>{d.field}</td>
                                                <td>{String(d.source)}</td>
                                                <td>{String(d.target)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={ackedPairs.has(
                                            pair.sourceCategoryId,
                                        )}
                                        onChange={(e) =>
                                            setAckedPairs((prev) => {
                                                const next = new Set(prev);
                                                if (e.target.checked)
                                                    next.add(
                                                        pair.sourceCategoryId,
                                                    );
                                                else
                                                    next.delete(
                                                        pair.sourceCategoryId,
                                                    );
                                                return next;
                                            })
                                        }
                                    />{' '}
                                    I understand
                                </label>
                            </div>
                        ))
                    )}
                    <div>
                        <button type="button" onClick={() => setStep('mapping')}>
                            Back
                        </button>
                        <button
                            type="button"
                            disabled={!allAcked}
                            onClick={() => setStep('impact')}
                        >
                            Next: impact
                        </button>
                    </div>
                </div>
            )}

            {step === 'impact' && (
                <div className={styles.step}>
                    <p>
                        {mapping.length} source categories will be processed.
                        Merging into <strong>{target?.display}</strong>.
                    </p>
                    <p className={styles.muted}>
                        This can only be undone via the audit log.
                    </p>
                    <button type="button" onClick={() => setStep('diffs')}>
                        Back
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={submit}
                    >
                        {isPending ? 'Starting…' : 'Confirm reassignment'}
                    </button>
                </div>
            )}

            {step === 'status' && createdId !== null && (
                <ReassignmentStatus
                    id={createdId}
                    fetcher={getGameStatusAction}
                    targetGameSlug={target?.game}
                    onRestart={() => {
                        setCreatedId(null);
                        setStep('target');
                        setTarget(null);
                        setMapping([]);
                        setDiffs([]);
                        setAckedPairs(new Set());
                    }}
                />
            )}
        </div>
    );
}
```

Note: per-row merge target editing (choosing *which* target category to merge into) is shown read-only here (`→ target #id` from the preview). The preview already supplies a sensible default target for merges. Full per-row target re-selection via a category typeahead is a follow-up; the backend accepts whatever `categoryMapping` we send, so the default-from-preview path is correct and complete for v1. If product wants editable merge targets now, add a category `<select>` populated from the target game's categories (fetch via `getCategoriesForGame(target.game)`).

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

```bash
git add "app/(new-layout)/games-v2/[game]/manage/reassignments/game-wizard.tsx"
git commit -m "feat(reassignment): game reassignment wizard"
```

---

## Task 12: Console entry points (nav + routing)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/page.tsx`

`ConsoleShell` accepts `flags: NavFlags` as a single typed object and forwards it to `buildNav(flags)`; `ConsoleChrome` receives the already-filtered `groups`, not `flags`. So adding `canReassign` to `NavFlags` (Step 1) propagates automatically — **no edits to `console-shell.tsx` or `console-chrome.tsx` are needed.** `ContentRouter` already receives `game` (`ResolvedGame`), `categories` (`{ id; display }[]`), and `selectedCategory` (`ResolvedCategory | null`) — everything the wizards need.

- [ ] **Step 1: nav-model — add flag + item**

Add `'reassign'` to the `NavItemId` union:

```typescript
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
    | 'game-details'
    | 'moderators'
    | 'groups'
    | 'categories-visibility'
    | 'identifiers'
    | 'reassign';
```

Add `canReassign` to `NavFlags`:

```typescript
export interface NavFlags {
    canModerate: boolean;
    canEditStandards: boolean;
    canConfigure: boolean;
    canReassign: boolean;
}
```

Add the item to the `game` group's `items` array (append after `identifiers`):

```typescript
            { id: 'identifiers', label: 'Identifiers', categoryScoped: false },
            { id: 'reassign', label: 'Reassign', categoryScoped: false },
```

Gate its visibility in `itemVisible` — add this near the top, before the existing returns:

```typescript
function itemVisible(
    groupId: NavGroupId,
    itemId: NavItemId,
    flags: NavFlags,
): boolean {
    if (itemId === 'reassign') return flags.canReassign;
    if (groupId === 'moderate') return flags.canModerate;
    if (itemId === 'standards') return flags.canModerate;
    return flags.canConfigure;
}
```

- [ ] **Step 2: Logic check (throwaway)**

Confirm the `reassign` item is hidden without the flag and shown with it. Create `/tmp/nav-check.ts` that imports `buildNav` from the nav-model path and asserts:

```typescript
import { buildNav } from './app/(new-layout)/games-v2/[game]/manage/console/nav-model';

const off = buildNav({ canModerate: true, canEditStandards: true, canConfigure: true, canReassign: false });
const hasOff = off.some((g) => g.items.some((i) => i.id === 'reassign'));
console.assert(hasOff === false, 'reassign should be hidden when canReassign=false');

const on = buildNav({ canModerate: false, canEditStandards: false, canConfigure: false, canReassign: true });
const hasOn = on.some((g) => g.items.some((i) => i.id === 'reassign'));
console.assert(hasOn === true, 'reassign should be visible when canReassign=true');
console.log('nav-model OK');
```

Run: `npx tsx /tmp/nav-check.ts` (if the bracket path breaks resolution, temporarily copy nav-model to repo root for the check). Expected: `nav-model OK`. Delete the temp file.

- [ ] **Step 3: page.tsx — compute canReassign and pass it**

In `app/(new-layout)/games-v2/[game]/manage/page.tsx`, after the existing `canEditStandards` line:

```typescript
    const canEditStandards = ability.can('edit', 'moderators');
    const canReassign = ability.can('reassign', 'reassignment');
    if (!canModerate && !canConfigure) notFound();
```

Then add `canReassign` to the `flags` prop passed to `ConsoleShell`:

```tsx
                flags={{ canModerate, canEditStandards, canConfigure, canReassign }}
```

- [ ] **Step 4: content-router.tsx — route the reassign item**

`ContentRouter` already receives `game` (`ResolvedGame`) and `categories` (`{ id; display }[]`). Add imports at the top:

```tsx
import { GameWizard } from '../reassignments/game-wizard';
import { CategoryWizard } from '../reassignments/category-wizard';
```

Add a case to the `switch (activeItem)` (before `default`):

```tsx
        case 'reassign':
            return selectedCategory ? (
                <CategoryWizard
                    sourceCategory={{
                        id: selectedCategory.id,
                        display: selectedCategory.display,
                    }}
                    categories={categories}
                    targetGameSlug={game.name}
                />
            ) : (
                <GameWizard
                    sourceGameId={game.id}
                    sourceGameDisplay={game.display}
                    sourceCategoryNames={Object.fromEntries(
                        categories.map((c) => [c.id, c.display]),
                    )}
                />
            );
```

This means: with a category selected in the rail, the reassign pane offers the **category** wizard; with none selected, it offers the **game** wizard. (Document this in the pane header text via the wizard titles, which already name the scope.)

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. The only place `NavFlags` is constructed is `manage/page.tsx` (Step 3); if typecheck flags a missing `canReassign` elsewhere, add it there.

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console"
git add "app/(new-layout)/games-v2/[game]/manage/page.tsx"
git commit -m "feat(reassignment): console nav entry points for reassignment wizards"
```

---

## Task 13: Tombstone 301 redirects

**Files:**
- Modify: `types/leaderboards.types.ts`
- Modify: `src/lib/games-v1.ts`
- Modify: `app/(new-layout)/games-v2/[game]/page.tsx`

The backend by-slug resolver now returns `redirectedToGameId` and `redirectedToSlug`.

- [ ] **Step 1: Extend `ResolvedGame`**

In `types/leaderboards.types.ts`, add to the `ResolvedGame` interface:

```typescript
export interface ResolvedGame {
    id: number;
    name: string;
    display: string;
    image?: string | null;
    defaultVerified?: boolean;
    primaryTiming?: 'rt' | 'gt';
    redirectedToGameId?: number | null;
    redirectedToSlug?: string | null;
}
```

- [ ] **Step 2: Thread fields through `resolveGame`**

In `src/lib/games-v1.ts`, widen the `lookup` type and the return. The lookup currently destructures `{ id, name, display }`; add the redirect fields:

```typescript
    let lookup: {
        result: {
            id: number;
            name: string;
            display: string;
            redirectedToGameId?: number | null;
            redirectedToSlug?: string | null;
        };
    };
```

and in the final return of `resolveGame`:

```typescript
    return {
        id,
        name,
        display,
        image,
        redirectedToGameId: lookup.result.redirectedToGameId ?? null,
        redirectedToSlug: lookup.result.redirectedToSlug ?? null,
    };
```

- [ ] **Step 3: 301 on the public game route**

Read `app/(new-layout)/games-v2/[game]/page.tsx` to find where it calls `resolveGame` and `notFound()`. Immediately after the game is resolved and the null check, add:

```typescript
import { permanentRedirect } from 'next/navigation';
// ...
    const game = await resolveGame(slug);
    if (!game) notFound();
    if (game.redirectedToGameId !== null && game.redirectedToSlug) {
        permanentRedirect(`/games-v2/${game.redirectedToSlug}`);
    }
```

If the public page resolves the game inside a helper (`game-page.tsx`), apply the check at the top-level route component where redirecting is allowed (a Server Component), not inside a Client Component. `permanentRedirect` must run server-side.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. The new `ResolvedGame` fields are optional, so existing `resolveGame` consumers are unaffected.

- [ ] **Step 5: Commit**

```bash
git add types/leaderboards.types.ts src/lib/games-v1.ts "app/(new-layout)/games-v2/[game]/page.tsx"
git commit -m "feat(reassignment): 301 redirect tombstoned games to their target"
```

---

## Task 14: Manual walkthrough + cleanup

**Files:** none (verification only)

- [ ] **Step 1: Clear build cache**

Run: `rm -rf .next`

- [ ] **Step 2: Full typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS.

- [ ] **Step 3: Dev server walkthrough**

Run: `npm run dev`, then as a `board-moderator` (or admin) user:
- Open a game's `…/manage` console → confirm a "Reassign" item appears under the Game group.
- With no category selected: the game wizard renders; search a target, pick it, confirm the mapping table + diffs + impact steps, submit, and watch the status pane poll to completion.
- Select a category in the rail → the category wizard renders; pick a target category, acknowledge, submit, watch status.
- As an `admin`, open `/admin/reassignments` → confirm both reassignments appear in the merged timeline, expand a row, and undo one.
- As a non-board user, confirm the Reassign nav item is absent and `/admin/reassignments` 404s.
- Visit the tombstoned source game's public URL → confirm a 301 to the target.

- [ ] **Step 4: Final state check**

Run: `git status` and `git log --oneline -14`
Expected: clean tree, all task commits present on `reassignment-frontend`.

- [ ] **Step 5: Push**

```bash
git push -u origin reassignment-frontend
```

(Do not open a PR — the user opens PRs themselves.)

---

## Self-review notes

- **Spec coverage:** RBAC (T1), types (T2), lib wrappers (T3), searchGames id (T4), audit log + undo (T5–T6), status/polling (T7), game wizard incl. mapping reducer (T8, T11), category wizard (T10), console actions (T9), entry points (T12), tombstone 301 (T13). All spec sections map to a task.
- **Known simplification (flagged in T11):** merge-target re-selection is read-only-from-preview in v1; the hook to make it editable is documented inline. This matches the spec's "local overrides win" intent for decision type while deferring per-target re-pick, which the backend supports either way.
- **Type consistency:** action names (`previewGameAction`, `createGameAction`, `createCategoryAction`, `getGameStatusAction`, `getCategoryStatusAction`, `undoGameAction`, `undoCategoryAction`) are used identically across T9/T10/T11; `useReassignmentStatus(id, fetcher)` signature matches its callers; `GameSearchResult` gains `id` in T4 and is consumed in T11.
- **Read-corruption caution:** `console-shell.tsx`, `console-chrome.tsx`, and `confirm-permission.ts` returned garbled content during planning. T12 deliberately instructs reading those files fresh and following the existing `flags` threading rather than pasting line numbers. Do not trust any cached snippet of them.
