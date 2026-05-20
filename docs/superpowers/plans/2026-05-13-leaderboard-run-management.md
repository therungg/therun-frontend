# Leaderboard Run Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a moderation page at `/games-v2/[game]/manage/run/[runId]` that lets users with leaderboard-edit permission reject leaderboard runs, with the page auto-navigating to the same runner's promoted next-best run after each reject.

**Architecture:** New nested route under the existing `manage/` tree. Server component handles permission gating and data loading via the new `GET /v1/leaderboards/runs/{runId}` endpoint. Client components render the run card and the inline reject form. A server action calls `POST /v1/leaderboards/reject/{runId}` and reads `nextRunIdForUser` from the response; the client navigates to `/manage/run/{nextRunIdForUser}` (or back to the leaderboard if null). The leaderboard table gains a per-row **Manage** button visible only to moderators.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript. Server actions for mutations. `next/cache` `'use cache'` + `revalidateTag(tag, profile)` for cache management. Bootstrap classes for styling. `react-toastify` for notifications. CASL for permissions.

**Project conventions:**
- No test framework installed. Verification = `npm run typecheck` + `npm run lint` + manual dev-server smoke test.
- Per `CLAUDE.md`: **do not commit unless the user explicitly asks.** Commit commands appear in steps as a record of the intended grouping, but the executing agent must confirm with the user before running them.
- Worktree cleanup: not applicable — this plan runs in the main repo per the user's stored preference (`Use branches, not worktrees`).

---

## File Structure

**Files to create:**

- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/page.tsx` — server component; permission gate + data load.
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/data.ts` — `loadManageRunData` loader.
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/types.ts` — `ManageRunData` shape.
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/manage-run-page.tsx` — client wrapper rendering header, runner line, and `RunCard`.
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/run-card.tsx` — run-detail card; embeds `RejectControl` (or "already rejected" notice).
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/reject-control.tsx` — inline expandable reject form.
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/reject-run.action.ts` — server action calling POST reject.

**Files to modify:**

- `types/leaderboards.types.ts` — add `RunDetail` interface.
- `src/lib/leaderboards-v1.ts` — add `getRunById` fetcher.
- `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx` — add Manage cell.
- `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx` — add column, thread `canManage` + `gameSlug` props.
- `app/(new-layout)/games-v2/[game]/game-page.tsx` — pass `gameSlug` to the table.

---

## Task 1: Add `RunDetail` type

**Files:**
- Modify: `types/leaderboards.types.ts`

- [ ] **Step 1: Add the interface**

Append the following at the end of `types/leaderboards.types.ts`:

```typescript
// Backend: GET /v1/leaderboards/runs/{runId}
// Note: response does NOT include game/category searchable slugs;
// resolve via resolveCategory(gameId) when slugs are needed.
export interface RunDetail {
    runId: number;
    gameId: number;
    gameDisplay: string;
    categoryId: number;
    categoryDisplay: string;
    subcategoryHash: string;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    time: number;
    realTime: number | null;
    gameTime: number | null;
    runDate: string;
    vodUrl: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables: Record<string, string>;
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: no errors (the type is unused so far, but the file must still typecheck).

- [ ] **Step 3: Commit (ask user first)**

```bash
git add types/leaderboards.types.ts
git commit -m "feat(leaderboards): add RunDetail type for single-run fetch"
```

---

## Task 2: Add `getRunById` fetcher

**Files:**
- Modify: `src/lib/leaderboards-v1.ts`

- [ ] **Step 1: Add the import**

In `src/lib/leaderboards-v1.ts`, extend the existing `import type { ... }` block to include `RunDetail`:

```typescript
import type {
    LeaderboardResponse,
    RunDetail,
    UserRanking,
    VariableDef,
    VariablesResponse,
    WrHistoryEntry,
} from '../../types/leaderboards.types';
```

Also add the `V1FetchError` import:

```typescript
import { V1FetchError, v1Fetch } from './v1-fetch';
```

- [ ] **Step 2: Append `getRunById` to the file**

Append at the end of `src/lib/leaderboards-v1.ts`:

```typescript
export async function getRunById(runId: number): Promise<RunDetail | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`run:${runId}`);

    try {
        const body = await v1Fetch<{ result: RunDetail }>(
            `/v1/leaderboards/runs/${runId}`,
        );
        return body.result;
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit (ask user first)**

```bash
git add src/lib/leaderboards-v1.ts
git commit -m "feat(leaderboards): add getRunById fetcher"
```

---

## Task 3: Add page loader and local types

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/types.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/data.ts`

- [ ] **Step 1: Create `types.ts`**

```typescript
import type {
    ResolvedGame,
    RunDetail,
} from '../../../../../../../types/leaderboards.types';

export interface ManageRunData {
    game: ResolvedGame;
    run: RunDetail;
}
```

- [ ] **Step 2: Create `data.ts`**

```typescript
import { resolveGame } from '~src/lib/games-v1';
import { getRunById } from '~src/lib/leaderboards-v1';
import type { ManageRunData } from './types';

export async function loadManageRunData(
    gameSlug: string,
    runId: number,
): Promise<ManageRunData | null> {
    const game = await resolveGame(gameSlug);
    if (!game) return null;

    const run = await getRunById(runId);
    if (!run || run.gameId !== game.id) return null;

    return { game, run };
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/run/\[runId\]/types.ts \
        app/\(new-layout\)/games-v2/\[game\]/manage/run/\[runId\]/data.ts
git commit -m "feat(manage-run): add loader and local types"
```

---

## Task 4: Add the page server component with permission gate

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/page.tsx`

- [ ] **Step 1: Create `page.tsx`**

```typescript
import { subject as caslSubject } from '@casl/ability';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { defineAbilityFor } from '~src/rbac/ability';
import { loadManageRunData } from './data';
import { ManageRunPage } from './manage-run-page';

interface Props {
    params: Promise<{ game: string; runId: string }>;
}

export default async function GameRunManagePage({ params }: Props) {
    const { game: slug, runId: runIdRaw } = await params;
    const runId = Number.parseInt(runIdRaw, 10);
    if (!slug || !Number.isFinite(runId)) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const data = await loadManageRunData(slug, runId);
    if (!data) notFound();

    const ability = defineAbilityFor(session);
    if (
        !ability.can(
            'edit',
            caslSubject('leaderboard', { game: data.game.name }),
        )
    ) {
        notFound();
    }

    return <ManageRunPage data={data} />;
}
```

**Note:** This relies on `src/rbac/ability.ts` granting `can('edit', 'leaderboard')` to the `moderator` role (alongside the existing rules). If that's not yet in place, add it as part of this task:

```typescript
    // Moderators can ban users, remove runs, and edit runs and leaderboards
    moderator(_user, { can }) {
        can('ban', 'user');
        can('ban', 'run');
        can('edit', 'run');
        can('edit', 'leaderboard');
    },
```

- [ ] **Step 2: Verify the import path for `defineAbilityFor`**

Run: `grep -n "export.*defineAbilityFor" src/rbac/ability.ts`
Expected: a line showing `export function defineAbilityFor` (or `export const`). If the name differs, adjust the import accordingly.

- [ ] **Step 3: Verify TypeScript**

Run: `npm run typecheck`
Expected: an unresolved import error for `./manage-run-page` (added in Task 5). All other types must check out.

- [ ] **Step 4: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/run/\[runId\]/page.tsx
git commit -m "feat(manage-run): add server page with permission gate"
```

---

## Task 5: Add the client page wrapper (no reject control yet)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/manage-run-page.tsx`

- [ ] **Step 1: Create `manage-run-page.tsx`**

```typescript
'use client';

import Link from 'next/link';
import { UserLink } from '~src/components/links/links';
import { RunCard } from './run-card';
import type { ManageRunData } from './types';

interface Props {
    data: ManageRunData;
}

export function ManageRunPage({ data }: Props) {
    const { game, run } = data;

    return (
        <div>
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
                    <small className="text-muted d-block">Manage run</small>
                    <h1 className="mb-0">{game.display}</h1>
                </div>
                <div className="ms-auto">
                    <Link
                        href={`/games-v2/${game.name}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        ← Back to leaderboards
                    </Link>
                </div>
            </header>

            <div className="mb-3">
                <div className="d-flex align-items-center gap-2">
                    {run.isGuest ? (
                        <>
                            <strong>{run.runnerName}</strong>
                            <span className="badge text-bg-secondary">
                                guest
                            </span>
                        </>
                    ) : (
                        <UserLink username={run.runnerName} url={undefined} />
                    )}
                </div>
                <small className="text-muted">
                    {run.categoryDisplay}
                    {run.subcategoryHash
                        ? ` · subcategory ${run.subcategoryHash}`
                        : ''}
                </small>
            </div>

            <RunCard run={run} gameSlug={game.name} />
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npm run typecheck`
Expected: an unresolved import error for `./run-card` (added in Task 6). Other types must check.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/run/\[runId\]/manage-run-page.tsx
git commit -m "feat(manage-run): add client page wrapper"
```

---

## Task 6: Add the run-card component (rejected-state aware, no reject form yet)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/run-card.tsx`

This task adds the visual card. Task 8 adds the inline reject form; this task leaves the action area empty for non-rejected runs.

- [ ] **Step 1: Create `run-card.tsx`**

```typescript
'use client';

import Link from 'next/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { RunDetail } from '../../../../../../../types/leaderboards.types';

interface Props {
    run: RunDetail;
    gameSlug: string;
}

function VerificationBadge({
    status,
}: {
    status: RunDetail['verificationStatus'];
}) {
    if (status === 'verified') {
        return (
            <span className="badge text-bg-success" aria-label="verified">
                ✓ Verified
            </span>
        );
    }
    if (status === 'pending') {
        return (
            <span className="badge text-bg-warning" aria-label="pending">
                ⌛ Pending
            </span>
        );
    }
    return (
        <span
            className="badge text-bg-secondary opacity-75"
            aria-label="rejected"
        >
            Rejected
        </span>
    );
}

function VariablesLine({ vars }: { vars: Record<string, string> }) {
    const entries = Object.entries(vars);
    if (entries.length === 0) return null;
    const text = entries.map(([k, v]) => `${k}=${v}`).join(', ');
    return (
        <div
            className="text-muted small text-truncate"
            title={text}
            style={{ maxWidth: '100%' }}
        >
            {text}
        </div>
    );
}

export function RunCard({ run, gameSlug }: Props) {
    const isRejected = run.verificationStatus === 'rejected';

    return (
        <section className="border rounded p-3">
            <div className="d-flex flex-wrap align-items-baseline gap-3 mb-2">
                <div>
                    <small className="text-muted d-block">Real Time</small>
                    <strong className="fs-5">
                        {run.realTime != null ? (
                            <DurationToFormatted duration={run.realTime} />
                        ) : (
                            '—'
                        )}
                    </strong>
                </div>
                <div>
                    <small className="text-muted d-block">Game Time</small>
                    <strong className="fs-5">
                        {run.gameTime != null ? (
                            <DurationToFormatted duration={run.gameTime} />
                        ) : (
                            '—'
                        )}
                    </strong>
                </div>
                <div>
                    <small className="text-muted d-block">Run date</small>
                    <span>
                        {run.runDate
                            ? new Date(run.runDate).toLocaleDateString()
                            : '—'}
                    </span>
                </div>
                <div>
                    <small className="text-muted d-block">VOD</small>
                    {run.vodUrl ? (
                        <a
                            href={run.vodUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Link
                        </a>
                    ) : (
                        '—'
                    )}
                </div>
                <div className="ms-auto">
                    <VerificationBadge status={run.verificationStatus} />
                </div>
            </div>

            <VariablesLine vars={run.variables} />

            <hr className="my-3" />

            {isRejected ? (
                <div className="d-flex align-items-center gap-3">
                    <span className="text-muted small">
                        This run has already been rejected.
                    </span>
                    <Link
                        href={`/games-v2/${gameSlug}`}
                        className="btn btn-sm btn-outline-secondary ms-auto"
                    >
                        Back to leaderboard
                    </Link>
                </div>
            ) : (
                <div className="text-muted small">
                    {/* RejectControl is wired in Task 9 */}
                </div>
            )}
        </section>
    );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Verify the page renders**

Start the dev server:

```bash
npm run dev
```

Then navigate to a known-good game + runId in a browser (e.g. open a leaderboard, copy a runId from the URL/API, hit `/games-v2/<slug>/manage/run/<runId>`).

Expected behavior on the page:
- Permission required — if you're not signed in as a board-admin/board-moderator/moderator/admin, you get a 404.
- If permitted, the page shows: game header, runner line, run card with RT/GT/date/VOD/verification badge, variables line if any.
- Rejected runs show the "already been rejected" notice; otherwise the action area is currently empty.

Stop the dev server before continuing.

- [ ] **Step 4: Lint and commit (ask user first)**

```bash
npm run lint
git add app/\(new-layout\)/games-v2/\[game\]/manage/run/\[runId\]/run-card.tsx
git commit -m "feat(manage-run): add run-card with verification badges"
```

---

## Task 7: Add the reject server action

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/reject-run.action.ts`

- [ ] **Step 1: Create the action**

```typescript
'use server';

import { subject as caslSubject } from '@casl/ability';
import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { defineAbilityFor } from '~src/rbac/ability';

interface Input {
    gameSlug: string;
    runId: number;
    categoryId: number;
    subcategoryHash: string;
    reason?: string;
}

interface RejectApiResult {
    rejected: true;
    nextRunIdForUser: number | null;
}

export async function rejectRunAction(
    input: Input,
): Promise<
    | { ok: true; nextRunIdForUser: number | null }
    | { error: string }
> {
    const session = await getSession();
    if (!session?.username || !session.id) {
        return { error: 'Not signed in.' };
    }

    const game = await resolveGame(input.gameSlug);
    if (!game) return { error: 'Game not found.' };

    const ability = defineAbilityFor(session);
    if (
        !ability.can(
            'edit',
            caslSubject('leaderboard', { game: game.name }),
        )
    ) {
        return { error: 'Not authorized to reject runs for this game.' };
    }

    const body: { reason?: string } = {};
    const trimmed = input.reason?.trim();
    if (trimmed) body.reason = trimmed;

    let result: RejectApiResult;
    try {
        result = await apiFetch<RejectApiResult>(
            `/v1/leaderboards/reject/${input.runId}`,
            {
                method: 'POST',
                sessionId: session.id,
                body,
            },
        );
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to reject run.' };
    }

    // Resolve the category's searchable slug for cache-tag invalidation.
    // We have the categoryId from the client; look up its slug by id.
    try {
        const { categories } = await resolveCategory(game.id);
        const category = categories.find((c) => c.id === input.categoryId);
        if (category) {
            const sub = input.subcategoryHash;
            for (const timing of ['rt', 'gt'] as const) {
                for (const v of ['v', 'a'] as const) {
                    revalidateTag(
                        `lb:${game.name}:${category.name}:${sub}:${timing}:${v}`,
                        'minutes',
                    );
                }
            }
        }
    } catch {
        // resolveCategory is best-effort for invalidation; ignore failure.
    }

    revalidateTag(`run:${input.runId}`, 'minutes');

    return { ok: true, nextRunIdForUser: result.nextRunIdForUser };
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/run/\[runId\]/actions/reject-run.action.ts
git commit -m "feat(manage-run): add reject server action"
```

---

## Task 8: Add the reject-control client component

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/reject-control.tsx`

- [ ] **Step 1: Create `reject-control.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { rejectRunAction } from './actions/reject-run.action';

interface Props {
    runId: number;
    gameSlug: string;
    categoryId: number;
    subcategoryHash: string;
}

export function RejectControl({
    runId,
    gameSlug,
    categoryId,
    subcategoryHash,
}: Props) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    if (!expanded) {
        return (
            <div className="d-flex justify-content-end">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                        setExpanded(true);
                        setError(null);
                    }}
                >
                    Reject run
                </button>
            </div>
        );
    }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const res = await rejectRunAction({
                gameSlug,
                runId,
                categoryId,
                subcategoryHash,
                reason: reason.trim() || undefined,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Run rejected');
            if (res.nextRunIdForUser != null) {
                router.push(
                    `/games-v2/${gameSlug}/manage/run/${res.nextRunIdForUser}`,
                );
            } else {
                router.push(`/games-v2/${gameSlug}`);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <label
                htmlFor="reject-reason"
                className="form-label small text-muted mb-1"
            >
                Reason — optional, shown to runner
            </label>
            <textarea
                id="reject-reason"
                className="form-control form-control-sm mb-2"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPending}
            />
            {error && (
                <div className="alert alert-danger py-2 mb-2" role="alert">
                    {error}
                </div>
            )}
            <div className="d-flex gap-2 justify-content-end">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                        setExpanded(false);
                        setReason('');
                        setError(null);
                    }}
                    disabled={isPending}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-sm btn-danger"
                    disabled={isPending}
                >
                    {isPending ? 'Rejecting...' : 'Confirm reject'}
                </button>
            </div>
        </form>
    );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/run/\[runId\]/reject-control.tsx
git commit -m "feat(manage-run): add inline reject form component"
```

---

## Task 9: Wire `RejectControl` into `RunCard`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/run-card.tsx`

- [ ] **Step 1: Add the import**

At the top of `run-card.tsx`, after the existing imports, add:

```typescript
import { RejectControl } from './reject-control';
```

- [ ] **Step 2: Replace the placeholder block**

Find this block:

```typescript
            ) : (
                <div className="text-muted small">
                    {/* RejectControl is wired in Task 9 */}
                </div>
            )}
```

Replace it with:

```typescript
            ) : (
                <RejectControl
                    runId={run.runId}
                    gameSlug={gameSlug}
                    categoryId={run.categoryId}
                    subcategoryHash={run.subcategoryHash}
                />
            )}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manually test the reject flow**

Start the dev server:

```bash
npm run dev
```

Open a leaderboard for a game you have moderation permission on (e.g. as `admin`/`board-admin`/`board-moderator`/`moderator`). Navigate manually to `/games-v2/<slug>/manage/run/<runId>` for a valid, non-rejected run. Verify:

1. Page renders with the run card.
2. Clicking **Reject run** expands the form.
3. **Cancel** collapses the form and clears the reason.
4. **Confirm reject** with an optional reason fires the action.
5. On success, the URL navigates to `/manage/run/{nextRunIdForUser}` if the runner has another run in the slice, or back to `/games-v2/<slug>` if not.
6. The leaderboard, when revisited, no longer shows the rejected run.

If the backend rejects the request (e.g., for verified runs if not yet supported), the inline alert displays the error and the form stays open with the reason text preserved.

Stop the dev server before continuing.

- [ ] **Step 5: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/run/\[runId\]/run-card.tsx
git commit -m "feat(manage-run): wire RejectControl into RunCard"
```

---

## Task 10: Add the Manage button to leaderboard rows

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`

- [ ] **Step 1: Update `leaderboard-row.tsx`**

Replace the entire file with:

```typescript
import Link from 'next/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';

interface Props {
    entry: LeaderboardEntry;
    isCurrentUser: boolean;
    canManage: boolean;
    gameSlug: string;
}

export function LeaderboardRow({
    entry,
    isCurrentUser,
    canManage,
    gameSlug,
}: Props) {
    const showManageButton =
        canManage && entry.runId != null && !entry.isGuest;

    return (
        <tr className={isCurrentUser ? 'table-active' : undefined}>
            <td>{entry.rank}</td>
            <td>
                <UserLink username={entry.runnerName} url={undefined} />
            </td>
            <td>
                {entry.realTime != null ? (
                    <DurationToFormatted duration={entry.realTime} />
                ) : (
                    '—'
                )}
            </td>
            <td>
                {entry.gameTime != null ? (
                    <DurationToFormatted duration={entry.gameTime} />
                ) : (
                    '—'
                )}
            </td>
            <td>
                {entry.runDate
                    ? new Date(entry.runDate).toLocaleDateString()
                    : ''}
            </td>
            <td>
                {entry.vodUrl ? (
                    <a href={entry.vodUrl} target="_blank" rel="noreferrer">
                        VOD
                    </a>
                ) : null}
            </td>
            <td>{entry.verificationStatus === 'verified' ? '✓' : ''}</td>
            <td>
                {showManageButton ? (
                    <Link
                        href={`/games-v2/${gameSlug}/manage/run/${entry.runId}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        Manage
                    </Link>
                ) : null}
            </td>
        </tr>
    );
}
```

- [ ] **Step 2: Update `leaderboard-table.tsx`**

Replace the entire file with:

```typescript
import type { LeaderboardResponse } from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import { LeaderboardRow } from './leaderboard-row';

interface Props {
    leaderboard: LeaderboardResponse;
    sessionUsername: string | null;
    canManage: boolean;
    gameSlug: string;
}

export function LeaderboardTable({
    leaderboard,
    sessionUsername,
    canManage,
    gameSlug,
}: Props) {
    if (leaderboard.entries.length === 0) {
        return (
            <div className="text-center my-4">
                <p className="text-muted">No runs match these filters.</p>
                <ClearFiltersButton />
            </div>
        );
    }

    return (
        <table className="table table-hover">
            <thead>
                <tr>
                    <th style={{ width: '6%' }}>#</th>
                    <th>Runner</th>
                    <th>Real Time</th>
                    <th>Game Time</th>
                    <th>Date</th>
                    <th>VOD</th>
                    <th>Verified</th>
                    <th />
                </tr>
            </thead>
            <tbody>
                {leaderboard.entries.map((entry) => (
                    <LeaderboardRow
                        key={
                            entry.runId ?? `${entry.runnerName}-${entry.rank}`
                        }
                        entry={entry}
                        isCurrentUser={
                            sessionUsername !== null &&
                            entry.runnerName === sessionUsername
                        }
                        canManage={canManage}
                        gameSlug={gameSlug}
                    />
                ))}
            </tbody>
        </table>
    );
}
```

- [ ] **Step 3: Update `game-page.tsx`**

Find the `<LeaderboardTable>` usage:

```typescript
                    <LeaderboardTable
                        leaderboard={data.leaderboard}
                        sessionUsername={data.sessionUsername}
                    />
```

Replace with:

```typescript
                    <LeaderboardTable
                        leaderboard={data.leaderboard}
                        sessionUsername={data.sessionUsername}
                        canManage={canManage}
                        gameSlug={data.game.name}
                    />
```

- [ ] **Step 4: Verify TypeScript**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Smoke test in dev**

Run: `npm run dev`

1. Open `/games-v2/<slug>` as a privileged user (admin/board-admin/board-moderator/moderator).
2. Verify each leaderboard row shows a **Manage** button (except for guest rows or rows missing `runId`).
3. Click **Manage** on a row → land on the manage page for that run.
4. Reject it → the page redirects either to the runner's next-best run's manage page, or back to the leaderboard.
5. Open `/games-v2/<slug>` as a non-privileged user (or logged out) → the **Manage** column header is empty and rows show no Manage button. The page still renders normally.

Stop the dev server when done.

- [ ] **Step 6: Lint and commit (ask user first)**

```bash
npm run lint
git add app/\(new-layout\)/games-v2/\[game\]/leaderboard/leaderboard-row.tsx \
        app/\(new-layout\)/games-v2/\[game\]/leaderboard/leaderboard-table.tsx \
        app/\(new-layout\)/games-v2/\[game\]/game-page.tsx
git commit -m "feat(leaderboard): add per-row Manage button for moderators"
```

---

## Task 11: Production build verification + cleanup

**Files:**
- (None — verification only)

- [ ] **Step 1: Clear the Next.js build cache**

Per `CLAUDE.md` workflow guidelines, after significant changes:

```bash
rm -rf .next
```

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: build succeeds with no errors or warnings related to the new files. Any pre-existing warnings unrelated to this feature are fine.

- [ ] **Step 3: Run full lint**

Run: `npm run lint`
Expected: pass.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 5: Final smoke test in dev**

Run: `npm run dev`

End-to-end check covering:

| Case | Expected |
|------|----------|
| Logged-out user visits `/games-v2/<slug>/manage/run/<id>` | 404. |
| User without leaderboard moderation permission | 404. |
| User with permission, valid runId | Page renders. Manage button visible on leaderboard rows. |
| Manage button on leaderboard → click | Lands on `/manage/run/<id>` for that run. |
| Reject with no reason | Action succeeds. Redirect navigates to next runId or back to leaderboard. |
| Reject with a reason | Same as above; reason is sent in request body. |
| Reject a run for a guest entry (visited via direct URL — no Manage button is shown for guests) | Action succeeds. `nextRunIdForUser` is `null`, redirect goes back to leaderboard. |
| Cold-load `/manage/run/<id>` for an already-rejected run | Page shows the "Already rejected" notice with a Back link; no reject form. |
| Backend returns an error from POST reject (e.g., insufficient permission) | Inline error alert displays in the form; form stays open with reason preserved. |

Stop the dev server when satisfied.

- [ ] **Step 6: Final commit (ask user first)**

If any small adjustments were needed during smoke testing, commit them with a clarifying message:

```bash
git add -A
git commit -m "chore(manage-run): final smoke-test adjustments"
```

If nothing changed, skip this step.
