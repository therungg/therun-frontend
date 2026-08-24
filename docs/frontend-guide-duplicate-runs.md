# Frontend guide: duplicate run detection (admin review)

Backend source of truth: `src/api/duplicate-runs/handler.ts` (dispatched from `api-entry.ts` on
`path.startsWith("/duplicate-runs")`, no `/v1` prefix). Types: `src/db/schema.ts`
(`DuplicateSideSignals`, `DuplicateFindingSignals`, `DuplicateFindingState`).

All routes are exposed on the moderation sibling API under the `/mod` base-path mapping
(`api.therun.gg/mod/duplicate-runs...`). All require `Authorization: Bearer <sessionId>` and
`moderate`/`admins` (site-admin) permission — a failed `confirmPermission` check returns `403`
(plain-text body).

Every success response is enveloped `{ "result": <data> }` — use `meFetch`, not `modFetch`, from
`src/lib/moderation/mod-fetch.ts` (that module's `modFetch` is for handlers that return bare JSON;
this handler always wraps in `{ result }`).

Every `Date` field serializes as an ISO-8601 UTC string via `JSON.stringify` (e.g.
`"2026-05-01T00:00:00.000Z"`) — on the frontend, every backend `Date` becomes `string`.

## Endpoints

| Method | Path (full, under `/mod`) | Request | Response (`result` payload) | Errors |
|---|---|---|---|---|
| GET | `/mod/duplicate-runs?state=open\|dismissed\|actioned&gameId=&page=&pageSize=` | query params, all optional (`state` defaults `open`; `page` defaults `1`; `pageSize` defaults `25`, capped `100`) | `DuplicateRunListResponse` | `400` if `state` invalid or `gameId` not a positive integer; `403` no permission |
| GET | `/mod/duplicate-runs/scans/latest` | — | `DuplicateScanInfo \| null` | `403` no permission |
| GET | `/mod/duplicate-runs/{findingId}` | — | `DuplicateRunDetail` | `404` unknown id; `403` no permission |
| POST | `/mod/duplicate-runs/{findingId}/verdict` | `DuplicateVerdictInput` (JSON body) | `{ id: number; state: 'dismissed' }` (dismiss) or `{ id: number; state: 'actioned'; affectedRunCount: number }` (exclude) | `404` unknown id; `409` finding is not `open` (both the pre-check and the "claim lost to a concurrent verdict" race land here, body `{ "error": "Finding {id} is already {state}" }`); `400` invalid JSON / missing-or-blank `note` / bad `action` / bad `side`; `403` no permission |
| POST | `/mod/duplicate-runs/scan` | body ignored | `{ enqueued: true }` (HTTP `202`) | `403` no permission |

## Types (verbatim — mirror standalone, no ORM imports)

```typescript
export interface DuplicateSideSignals {
    userId: number;
    /** ISO strings; null when every row predates created_at stamping. */
    minCreatedAt: string | null;
    maxCreatedAt: string | null;
    /** max-min created_at across the side's duplicated rows, in ms. */
    blockArrivalSpanMs: number | null;
    /** Non-duplicated attempts on this game within +/-30d of the duplicated block. */
    organicNearCount: number;
    lastOrganicEndedAt: string | null;
}

export interface DuplicateFindingSignals {
    a: DuplicateSideSignals;
    b: DuplicateSideSignals;
}

export type DuplicateFindingState = 'open' | 'dismissed' | 'actioned';

/** One list-item / finding row, as returned by GET /duplicate-runs and embedded in DuplicateRunDetail. */
export interface DuplicateRunFinding {
    id: number;
    gameId: number;
    gameName: string;
    userAId: number;
    userBId: number;
    userA: { id: number; username: string | null };
    userB: { id: number; username: string | null };
    duplicateCount: number;
    firstDupEndedAt: string;
    lastDupEndedAt: string;
    categoryIds: number[];
    involvesPb: boolean;
    /** Capped at 20 per side; not necessarily current — see behavioral notes. */
    sampleRunIds: number[];
    signals: DuplicateFindingSignals;
    state: DuplicateFindingState;
    verdictNote: string | null;
    actedBy: number | null;
    actedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DuplicateRunListResponse {
    items: DuplicateRunFinding[];
    page: number;
    pageSize: number;
    total: number;
}

/** One duplicated or organic run row, as returned inside DuplicateRunDetailSide. */
export interface DuplicateRunDetailRow {
    id: number;
    categoryId: number;
    time: number;
    gameTime: number | null;
    endedAt: string;
    startedAt: string | null;
    createdAt: string | null;
    isPb: boolean;
    excluded: boolean;
}

export interface DuplicateRunDetailSide {
    user: { id: number; username: string | null };
    dupRows: DuplicateRunDetailRow[];
    /** Capped at 200, newest endedAt first. */
    organicRows: DuplicateRunDetailRow[];
}

/**
 * The finding embedded in GET /duplicate-runs/{id} does NOT include
 * gameName/userA/userB (unlike the list-item shape) — only the raw finding
 * columns. Use `sides.a.user` / `sides.b.user` for display names.
 */
export type DuplicateRunDetailFinding = Omit<
    DuplicateRunFinding,
    'gameName' | 'userA' | 'userB'
>;

export interface DuplicateRunDetail {
    finding: DuplicateRunDetailFinding;
    sides: {
        a: DuplicateRunDetailSide;
        b: DuplicateRunDetailSide;
    };
}

export type DuplicateVerdictInput =
    | { action: 'dismiss'; note: string }
    | { action: 'exclude'; side: 'a' | 'b' | 'both'; note: string };

export interface DuplicateScanInfo {
    id: number;
    mode: string;
    status: string;
    rowsExamined: number;
    findingsTouched: number;
    startedAt: string;
    /** null while the scan is still running. */
    finishedAt: string | null;
}
```

## Behavioral notes

- **Verdicts only apply to `state='open'`.** Both `dismiss` and `exclude` are guarded by an atomic
  `WHERE state = 'open'` update, not just a pre-check read — a second concurrent verdict attempt on
  the same finding gets `409`, same as attempting a verdict on an already-`dismissed`/`actioned`
  finding. Disable the verdict UI once a finding's `state !== 'open'`, but still expect a `409` from
  the API and handle it (e.g. refetch + show "someone else already actioned this") rather than
  assuming the disabled state fully prevents it.
- **`exclude` uses the standard exclusion machinery** (`bulkExcludeRuns`) — it is fully reversible
  from the existing exclusions admin screen (`/admin/exclusions`), the same as any other bulk
  exclude. Excluding via a duplicate-run verdict does not create a separate, harder-to-undo kind of
  exclusion.
- **A `'both'` exclude that fails partway is safe to retry.** The finding is claimed (`state` flips
  to `actioned`) *before* either side's `bulkExcludeRuns` call runs. If the exclude work itself then
  throws (e.g. one side's call fails after the other succeeded), the backend reopens the finding
  (`state` back to `'open'`, and — for *this* failure-triggered reopen specifically —
  `verdictNote`/`actedBy`/`actedAt` are cleared back to `null`) and returns `500`. Any
  already-excluded runs from the side that succeeded stay excluded — the retry (submitting the
  verdict again) will simply skip rows that are already `excluded` and only act on the rest.
- **Reopened findings retain the prior `actedBy`/`actedAt` — except the failure-retry case above.**
  There are two distinct "reopen" paths and they behave differently:
  - *Nightly-rescan reopen*: when the scanner sees new duplicate activity on a previously
    `dismissed` finding (higher `duplicateCount` than before), it flips `state` back to `'open'`
    and prefixes `verdictNote` with `[reopened: count X→Y] `, but leaves `actedBy`/`actedAt` as-is
    — they still show who dismissed it and when, which is useful history even though the finding
    is open again. Don't read a non-null `actedBy`/`actedAt` as proof the finding was *just*
    verdicted; check `state` first.
  - *Exclude-failure retry reopen* (previous bullet): clears `verdictNote`/`actedBy`/`actedAt` to
    `null`, since no verdict actually completed.
- **`updatedAt` is bumped by the nightly rescan even when nothing about the finding changed** — the
  scan re-touches every row it examines. Don't render `updatedAt` as "new activity" or use it to
  imply the finding got worse/changed; use `duplicateCount`, `lastDupEndedAt`, or `state` for that
  instead.
