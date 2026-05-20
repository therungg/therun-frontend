# Leaderboard Run Management — Design

**Date:** 2026-05-13
**Status:** Design — awaiting implementation plan

## Overview

A new moderation page that lets users with leaderboard moderation permission
reject individual leaderboard runs. From any row of a game's leaderboard, a
mod clicks a **Manage** button on the row and lands on a page that shows
that runner's current leaderboard run for the slice. The mod can reject the
run with an optional reason via the existing
`POST /v1/leaderboards/reject/{runId}` endpoint.

After a successful reject, the page automatically transitions to that same
runner's next-best run in the slice (if any) so the mod can keep moderating
without bouncing back to the leaderboard. The reject endpoint's response
tells the client what was promoted, so a single round-trip handles both the
mutation and the next-step navigation.

The page lives under the existing `manage/` subtree as
`app/(new-layout)/games-v2/[game]/manage/run/[runId]/`.

## Goals

- Surface a per-row **Manage** affordance on the leaderboard for users with
  the right permission, hidden from everyone else.
- Render a single page that shows the target run with full details.
- Reject the run with an optional free-text reason.
- After reject, navigate the mod to the same runner's new top run in the
  same `(game, category, subcategory)` slice without leaving the page
  type — or back to the leaderboard when no qualifying runs remain.
- Invalidate the relevant caches on success so the leaderboard reflects the
  change immediately.

## Non-goals

- A public per-run page. This page is moderation-only.
- Editing run metadata (time, VOD, variables). Reject is the only mutation.
- Un-rejecting / restoring rejected runs.
- Bulk reject. One run at a time.
- Showing a runner's other runs as a list on the page (the post-reject
  navigation handles "see the next one" implicitly).
- Cold-loading a `/manage/run/[rejectedRunId]` URL and auto-forwarding to
  the runner's current top — this case shows a simple "Already rejected"
  message with a back link, so no extra lookup is needed.

## Backend dependencies

The frontend assumes one new read endpoint and one small extension to the
existing reject endpoint. The implementation plan must coordinate these
with backend before shipping.

### 1. `GET /v1/leaderboards/runs/{runId}` — single run detail (new)

Returns the full record for one run.

```typescript
// Response
{
  result: {
    runId: number;
    gameId: number;
    gameDisplay: string;
    categoryId: number;
    categoryDisplay: string;
    subcategoryHash: string;   // "" for default subcategory
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    time: number;              // primary-timing ms (RT/GT precedence resolved
                               // server-side; falls back to realTime when primary
                               // is gametime and gameTime is null)
    realTime: number | null;
    gameTime: number | null;
    runDate: string;           // ISO, from ended_at
    vodUrl: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables: Record<string, string>;
  }
}
```

- 404 if `runId` does not exist.
- Auth: none (matches the rest of `/v1/leaderboards/*` read endpoints).
- The response does **not** include game/category searchable slugs. The
  frontend resolves the category slug via `resolveCategory(gameId)` and
  filters by `categoryId` when it needs the slug (e.g. for cache
  invalidation tags).

### 2. `POST /v1/leaderboards/reject/{runId}` — extended response

Existing endpoint, called with the existing optional `{ reason }` body. The
response is extended to include the next runId for the same runner in the
same slice — the backend already computes this when it promotes the
next-best run, so the cost is just adding the field to the response.

```typescript
// Response
{
  result: {
    rejected: true;
    nextRunIdForUser: number | null;
  }
}
```

Per the backend docs: `nextRunIdForUser` is "the ID of the same runner's
promoted entry on the standard (RT) leaderboard, falling back to GT if
the runner has no remaining RT-eligible run. `null` if the runner has no
other non-rejected run in this subcategory."

## Frontend permission

Mirrors the existing manage pages. Server-side `page.tsx`:

```typescript
const session = await getSession();
const game = await resolveGame(slug);
if (!game) notFound();

const ability = defineAbilityFor(session);
const canReject =
    ability.can('edit', caslSubject('leaderboard', { game: game.name })) ||
    session.roles?.includes('moderator');
if (!canReject) notFound();
```

`notFound()` over throw matches the codebase preference (404 over 403 for
unauthorized resources).

The same predicate is used to decide whether to render the **Manage**
button on each leaderboard row.

## Route & URL

`/games-v2/[game]/manage/run/[runId]`

`[game]` is the same slug the leaderboard page uses (server-side normalized
to the canonical form by `resolveGame()`). `[runId]` is the numeric run id
from the leaderboard entry.

## Data flow

### `src/lib/leaderboards-v1.ts` — one new fetcher

```typescript
export async function getRunById(runId: number): Promise<RunDetail | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`run:${runId}`);
    // GET /v1/leaderboards/runs/{runId}
    // return null on 404
}
```

### `types/leaderboards.types.ts` — one new interface

`RunDetail`, shape matching the response body above.

### Page-level loader

`app/(new-layout)/games-v2/[game]/manage/run/[runId]/data.ts`:

```typescript
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

The page server component doesn't redirect on rejected runs — it just
hands the rejected status to the client, which renders the "Already
rejected" state.

### Reject action

`app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/reject-run.action.ts`:

```typescript
'use server';

interface RejectSuccess {
    ok: true;
    nextRunIdForUser: number | null;
}

export async function rejectRunAction(args: {
    gameSlug: string;
    runId: number;
    reason?: string;
}): Promise<RejectSuccess | { error: string }> {
    const session = await getSession();
    // Re-check permission server-side (defense-in-depth)

    // POST /v1/leaderboards/reject/{runId}
    // with Authorization: Bearer {session.id} and { reason } body
    // Read `result.nextRunIdForUser` from the response.

    // To build the leaderboard cache tags we need categorySlug (searchable
    // form). The run-detail endpoint doesn't return it, so resolve it
    // from gameId + categoryId via resolveCategory:
    //   const { categories } = await resolveCategory(gameId);
    //   const categorySlug = categories.find(c => c.id === categoryId)?.name;
    //
    // On success, invalidate (via revalidateTag(tag, 'minutes')):
    //   - lb:{gameSlug}:{categorySlug}:{subcategoryHash}:rt:{v|a}
    //   - lb:{gameSlug}:{categorySlug}:{subcategoryHash}:gt:{v|a}
    //   - run:{runId}

    return { ok: true, nextRunIdForUser };
}
```

On `{ ok: true }`, the client uses `nextRunIdForUser`:

- If a runId is returned: `router.push('/games-v2/{gameSlug}/manage/run/{nextRunIdForUser}')`.
- If `null`: `router.push('/games-v2/{gameSlug}')` (back to leaderboard).

## Components

All under `app/(new-layout)/games-v2/[game]/manage/run/[runId]/`.

### `page.tsx` — server

- Resolves `[game]` and `[runId]`.
- Calls `getSession()`, checks permission predicate above, `notFound()` on
  failure.
- Calls `loadManageRunData(slug, runId)`. `notFound()` if null.
- Returns `<ManageRunPage data={data} />` — no redirect logic for rejected
  runs; the page component renders the rejected state inline.

### `manage-run-page.tsx` — client

- Header: game image + display name, subtitle "Manage run", breadcrumb
  back to leaderboard.
- Runner summary line: `<UserLink username={run.runnerName} />` (or the
  plain name with a "guest" badge if `run.isGuest`), plus a small text
  line with the category display + subcategory hash being moderated.
- A single `<RunCard run={run} gameSlug={...} />` block.

### `run-card.tsx` — client

A self-contained card showing the run's details:

- Time (RT) and Time (GT) on a single line, each via `DurationToFormatted`.
- Run date.
- VOD link (or "—").
- Verification status badge (✓ verified, ⌛ pending, faded "Rejected" pill
  for rejected).
- Variables: comma-joined list `platform=N64, region=JP`, truncated with
  ellipsis if overflowing.
- If `verificationStatus === 'rejected'`: inline notice "This run has
  already been rejected." with a "Back to leaderboard" link. No
  `RejectControl`.
- Otherwise: a `<RejectControl runId={...} gameSlug={...} />` inline at
  the bottom of the card.

### `reject-control.tsx` — client

- Collapsed state: a `Reject` button (`btn btn-sm btn-outline-danger`).
- Expanded state: a textarea for optional reason ("Reason — optional,
  shown to runner"), `Confirm reject` button (`btn btn-sm btn-danger`),
  and a `Cancel` button.
- `Confirm` calls `rejectRunAction({ gameSlug, runId, reason })` via
  `useTransition`. Buttons disabled while in flight; Confirm label flips
  to "Rejecting...".
- On `{ ok: true, nextRunIdForUser }`:
  - If `nextRunIdForUser != null`:
    `router.push('/games-v2/{gameSlug}/manage/run/{nextRunIdForUser}')`.
  - Else: `router.push('/games-v2/{gameSlug}')`.
- On `{ error }`: inline `<div className="alert alert-danger py-2">`,
  form stays open, reason text preserved.

### `<ManageRunButton>` — addition to `leaderboard-row.tsx`

- New trailing cell on the leaderboard table.
- Renders only when `canManage === true && entry.runId != null &&
  !entry.isGuest`.
- A `btn btn-sm btn-outline-secondary` linking to
  `/games-v2/{gameSlug}/manage/run/{entry.runId}` with label "Manage".

### Threading updates

- `leaderboard-table.tsx`: add `canManage: boolean` and `gameSlug: string`
  props. Add the new `<th>` (empty header). Pass both props to each
  `<LeaderboardRow>`.
- `leaderboard-row.tsx`: accept the new props and render the new cell.
- `game-page.tsx`: `canManage` is already in scope; pass
  `gameSlug={data.game.name}` alongside it to `<LeaderboardTable>`.

## File layout

```
app/(new-layout)/games-v2/[game]/manage/run/[runId]/
├── page.tsx
├── data.ts
├── types.ts                    (ManageRunData, RunDetail re-export)
├── manage-run-page.tsx
├── run-card.tsx
├── reject-control.tsx
└── actions/
    └── reject-run.action.ts
```

Edits to existing files:

- `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx`
- `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx`
- `app/(new-layout)/games-v2/[game]/game-page.tsx` (pass `gameSlug` through)
- `src/lib/leaderboards-v1.ts` (one new fetcher)
- `types/leaderboards.types.ts` (one new interface)

## Error handling & edge cases

| Case | Behavior |
|------|----------|
| Permission denied | `notFound()` server-side. |
| `runId` not found | `loadManageRunData` returns null → `notFound()`. |
| Run belongs to a different game (URL mismatch) | `data.ts` guards `run.gameId !== game.id` → `notFound()`. |
| Guest run (`userId == null` or `isGuest`) | Page renders, reject works. Backend returns `nextRunIdForUser: null`, so client redirects back to leaderboard. |
| Reject API error | `RejectControl` shows the error inline, keeps form open, preserves reason. |
| Already-rejected run accessed directly via URL (cold load) | Page renders the run with an "Already rejected" notice and a back-to-leaderboard link. No reject control. |
| Concurrent reject (race) | Second call is idempotent or returns a benign error — surfaced verbatim. |
| Runner has no more qualifying runs after reject | `nextRunIdForUser: null` → client redirects to leaderboard. |

## Cache invalidation on successful reject

`rejectRunAction` invalidates all of the following with `revalidateTag(tag,
'minutes')`:

- `lb:{gameSlug}:{categorySlug}:{subcategoryHash}:rt:v`
- `lb:{gameSlug}:{categorySlug}:{subcategoryHash}:rt:a`
- `lb:{gameSlug}:{categorySlug}:{subcategoryHash}:gt:v`
- `lb:{gameSlug}:{categorySlug}:{subcategoryHash}:gt:a`
- `run:{runId}`

These run before the client navigates to the next page, so the next
`/manage/run/{nextRunIdForUser}` (or the leaderboard) loads fresh data.

## Open questions

1. **Reject on verified runs:** the backend doc heading still says "Reject
   a **pending** run." During implementation, verify behavior on a
   `verificationStatus === 'verified'` run before relying on the same
   endpoint for it.
