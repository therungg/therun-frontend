# Run Page Downloads Tab — Design

## Summary

Add a new **Downloads** tab to the per-run page at `/[username]/[game]/[run]`. The tab is the single canonical place on the run page to download the run's current `.lss` splits file and its cloud backups. Every viewer sees the tab. Backup metadata is public. Backup downloads are supporter-gated.

This spec covers the run-page integration only. A dedicated global `/backups` page (and its grace-window banner) is out of scope and planned as a follow-up.

## Goals

- Make backups discoverable from the context where users already think about a run.
- Preserve today's public ability to download another runner's current `.lss` splits.
- Surface the supporter paywall clearly, with a reason (storage costs), so non-supporters understand why downloads are gated.
- Keep cost-sensitive calls (presigned URL generation) lazy — nothing fires until a viewer opens the tab.

## Non-goals

- Global Backups page with cross-run browsing, grace-window banner, and per-user tier display.
- Orphaned `originalKey` handling (user re-uploaded under a new filename; old key still has backups). The run page surfaces backups only for `run.splitsFile`.
- Owner tier display on the run page ("this user is T3 — backups kept forever").
- Pagination.

## Backend contract

The backend guide lives at `docs/frontend-guide-backups.md`. The endpoint this spec consumes:

```
GET /backups/user/{username}/versions?key={originalKey}
```

Public metadata listing. `Authorization: Bearer <sessionId>` is optional; pass it if the viewer is logged in so the backend can embed presigned `downloadUrl` values for eligible callers.

Response shape:

```ts
interface BackupVersionsResponse {
  recent: { uploadedAt: string; downloadUrl: string | null }[];
  daily: { date: string; downloadUrl: string | null; expiresAt: string | null }[];
  canDownload: boolean;
}
```

Gating is entirely backend-driven. Frontend trusts `downloadUrl` and `canDownload` on every row — no client-side patron/role checks.

## Surface

- Location: `app/(new-layout)/[username]/[game]/[run]/run.tsx`
- New `<Tab eventKey="downloads" title="Downloads">` appended to the existing tab strip.
- Visible to every viewer (anonymous, non-supporter, supporter, run owner).
- The small download icon currently next to the "Splits" heading on the Dashboard tab (`src/components/run/dashboard/splits.tsx`) is removed. One canonical download surface.

## Tab structure

```
Downloads
├── Current splits           (always, every viewer)
│   └── one row: the live .lss from the public CDN
└── Backups                  (always, every viewer, even if empty)
    ├── Supporter paywall card   (only when canDownload === false)
    ├── Recent (rolling, up to 5)    list of rows with uploadedAt
    └── Daily (one per UTC date)     list of rows with date + expiresAt
```

## Components

All new files live under `src/components/run/downloads/`.

### `downloads-tab.tsx` (client)

Top-level container for the tab content.

- Props: `{ run, username, viewerIsOwner }`.
- Renders `<CurrentSplits run={run} />` synchronously.
- Renders `<Backups .../>` with a state machine for the versions fetch: `idle | loading | loaded | error`.
- On mount, fires the `getBackupVersions` server action. Caches the result with a timestamp. Re-fires on explicit retry or when the cached result is older than 13 minutes and the user clicks a download row (presigned URLs expire at 15 min; 2 min safety margin).
- Passes `{ data, canDownload }` down. Grace-window handling is out of scope (see bottom of spec).

### `current-splits.tsx` (client)

- Props: `{ run }`.
- Renders a single-row panel with the game/category name, the file label, and a download button.
- Reuses today's download code from `splits.tsx`: same CloudFront URL construction (`NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL`), same fallback URL encoding dance, same blob-based download trigger, same toast about "Clear History" firing on click.
- Download filename: `${run.user}_${run.game}_${run.run}.lss` (unchanged from today).

### `backups.tsx` (client)

- Props: `{ data: BackupVersionsResponse | null, state: 'idle' | 'loading' | 'loaded' | 'error', canDownload: boolean, onRetry: () => void }`.
- Renders heading "Backups".
- Loading → skeleton.
- Error → "Couldn't load backups. [Retry]".
- Loaded + `canDownload === false` → renders the supporter paywall card above the lists.
- Always renders `<RecentList />` and `<DailyList />` (with their own empty states).

### `recent-list.tsx` (client)

- Props: `{ entries: BackupRecentEntry[] }`.
- Table, newest-first. Columns: `Uploaded` (relative + absolute timestamp), download action.
- Empty state: "No recent snapshots yet."

### `daily-list.tsx` (client)

- Props: `{ entries: BackupDailyEntry[] }`.
- Table, newest-first. Columns: `Date`, `Expires` (shows "never" if `expiresAt === null`, else a relative countdown + absolute date), download action.
- Empty state: "No daily snapshots yet."

### `download-button.tsx` (client, shared)

- Props: `{ downloadUrl: string | null, filename: string }`.
- `downloadUrl` present → anchor tag with `href={downloadUrl}` and `download={filename}`.
- `downloadUrl === null` → disabled button with tooltip: "Supporter-only — cloud backups have storage costs."
- Used by `RecentList`, `DailyList`, and `CurrentSplits`.

### Filenames on download

- Current splits: `${run.user}_${run.game}_${run.run}.lss`.
- Recent backup: `${run.game}_${run.run}_${uploadedAt-formatted-as-YYYY-MM-DD-HHmm}.lss`.
- Daily backup: `${run.game}_${run.run}_${date}.lss`.

All applied via the `download="..."` attribute on the anchor.

## Server action

New file `src/actions/backup-versions.action.ts`:

```ts
'use server';
export async function getBackupVersions(
  username: string,
  originalKey: string,
): Promise<BackupVersionsResponse | { error: 'not-found' } | { error: 'fetch-failed' }>
```

- Reads the session via `getSession()` from `src/actions/session.action.ts`.
- Calls `${NEXT_PUBLIC_DATA_URL}/backups/user/${username}/versions?key=${encodeURIComponent(originalKey)}`.
- If the viewer is logged in, sends `Authorization: Bearer ${session.id}`.
- Does **not** use `'use cache'` — downloadUrls are time-sensitive and viewer-sensitive.
- Normalizes backend responses:
  - `200` → returns the payload.
  - `404` → returns `{ error: 'not-found' }`. Caller surfaces the empty state.
  - anything else → returns `{ error: 'fetch-failed' }`.

## Types

New file `types/backups.types.ts`:

```ts
export interface BackupRecentEntry {
  uploadedAt: string;
  downloadUrl: string | null;
}

export interface BackupDailyEntry {
  date: string;
  downloadUrl: string | null;
  expiresAt: string | null;
}

export interface BackupVersionsResponse {
  recent: BackupRecentEntry[];
  daily: BackupDailyEntry[];
  canDownload: boolean;
}
```

## Data flow

**Tab opened (first click):**

1. `DownloadsTab` mounts.
2. `<CurrentSplits />` renders immediately from `run.splitsFile`.
3. `<Backups />` renders in `loading` state.
4. `DownloadsTab` fires `getBackupVersions(username, run.splitsFile)`.
5. Result:
   - `200` → state becomes `loaded`, `<Backups />` renders lists.
   - `{ error: 'not-found' }` → state becomes `loaded` with `recent: []`, `daily: []`, and `canDownload: false` (frontend default). A 404 means no metadata exists for this key, so there's nothing downloadable regardless of viewer tier — the flag is used only to suppress per-row buttons that wouldn't render anyway. Rendered as the generic empty state.
   - `{ error: 'fetch-failed' }` → state becomes `error`.

**Download click:**

- `downloadUrl` is a string and cached fetch is less than 13 min old → use it directly.
- Cached fetch is 13+ min old → refetch, then use the fresh URL.
- `downloadUrl === null` → button is disabled; no click handler.

**Tab never opened:** no API call. Zero cost for visitors browsing other tabs.

**Tab reopened within the session:** cached state persists; only the 13-min freshness rule triggers new calls.

## Copy

### Supporter paywall card (shown above the lists when `canDownload === false`)

> **Downloads are a supporter feature**
>
> Cloud backups cost therun.gg money to keep around. Becoming a supporter on Patreon unlocks downloads — yours and everyone else's.
>
> [Support therun.gg]

Button links to the existing patron/support page.

### Disabled per-row download tooltip

> Supporter-only — cloud backups have storage costs.

### Empty states

- Whole versions fetch returned 404 (no metadata for this key) → single generic empty state inside the Backups section: "No backups for this run yet. Supporters get automatic cloud backups on every upload." + Support CTA.
- Fetch returned 200 but `recent` is empty → `<RecentList />` shows "No recent snapshots yet."
- Fetch returned 200 but `daily` is empty → `<DailyList />` shows "No daily snapshots yet."

The frontend does not attempt to distinguish "owner isn't a supporter" from "owner is a supporter but hasn't uploaded" — the backend collapses both into 404, and the generic copy fits both cases.

### Clear-history toast

Retained on current-splits download only. Not shown on backup downloads.

## Edits to existing files

- `app/(new-layout)/[username]/[game]/[run]/run.tsx`: add the new `<Tab>`, pass `run`, `username`, and `viewerIsOwner` into `<DownloadsTab />`.
- `src/components/run/dashboard/splits.tsx`: remove the inline download icon, its `handleDownload`, the URL construction, the toast, and the `<DownloadIcon>` JSX. Keep the `<h2>Splits</h2>` heading.

## Assumption to verify during implementation

`run.splitsFile` is identical to the backend's `originalKey` for this run — both are the S3 upload key in the form `username/game/category.lss`. The backups versions endpoint expects the exact `originalKey` as a URL-encoded query param.

If this assumption breaks (case, encoding, leading slashes, rename history), the fallback is to first call `GET /backups/user/{username}` and match the returned `files[]` entries against `run.splitsFile`. This adds one round-trip per tab open and is not implemented up front — add only if the direct lookup misbehaves.

## Out of scope

- Global `/backups` page with table of all originalKeys, grace-window banner, and owner-tier display.
- Extending `/versions` response with `graceUntil` to enable a run-page grace banner.
- Handling orphaned `originalKey`s on the run page.
- Pagination.
