# Run Page Downloads Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Downloads" tab on the per-run page that shows the current `.lss` file and the run's cloud backup history (Recent + Daily), with supporter-gated download buttons and a clear paywall card for non-supporters.

**Architecture:** A new client-side tab container lazily fetches backup metadata via a server action when first activated. The action proxies the viewer's session to the backend's public `/backups/user/{username}/versions` endpoint. Each row's download URL comes straight from the backend (`string` → enabled, `null` → locked). Once loaded, results are cached in component state until the user clicks a download and the cache is older than 13 minutes (presigned URL TTL is 15 min).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, react-bootstrap (for `Tab` / `Tabs`), react-toastify (global `ToastContainer` already lives in `app/(new-layout)/content.tsx`), `moment` for time formatting.

**Reference spec:** `docs/superpowers/specs/2026-04-20-run-page-downloads-tab-design.md`
**Backend contract:** `docs/frontend-guide-backups.md`

---

## File Map

**Create:**
- `types/backups.types.ts` — shared TypeScript types for the backup API response.
- `src/actions/backup-versions.action.ts` — server action that proxies the versions endpoint with session auth.
- `src/components/run/downloads/download-button.tsx` — shared anchor/button primitive that renders enabled download links or a locked tooltip.
- `src/components/run/downloads/current-splits.tsx` — the current `.lss` row (extracted from today's inline download icon).
- `src/components/run/downloads/recent-list.tsx` — Recent backup table.
- `src/components/run/downloads/daily-list.tsx` — Daily backup table.
- `src/components/run/downloads/backups.tsx` — Backups section with paywall card + list handling.
- `src/components/run/downloads/downloads-tab.tsx` — top-level tab container with lazy fetch.

**Modify:**
- `app/(new-layout)/[username]/[game]/[run]/page.tsx` — read the viewer's session and pass `viewerUsername` to `RunDetail`.
- `app/(new-layout)/[username]/[game]/[run]/run.tsx` — accept `viewerUsername`, control `activeTab`, add the Downloads tab.
- `src/components/run/dashboard/splits.tsx` — remove the inline download icon, `handleDownload`, local `ToastContainer`, URL construction, and the `DownloadIcon` JSX.

---

## Task 1: Shared types

**Files:**
- Create: `types/backups.types.ts`

- [ ] **Step 1: Create the types file**

```ts
// types/backups.types.ts
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

export type BackupVersionsResult =
    | { status: 'ok'; data: BackupVersionsResponse }
    | { status: 'not-found' }
    | { status: 'fetch-failed' };
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add types/backups.types.ts
git commit -m "feat(backups): add shared types for versions response"
```

---

## Task 2: Server action — getBackupVersions

**Files:**
- Create: `src/actions/backup-versions.action.ts`

- [ ] **Step 1: Create the server action**

```ts
// src/actions/backup-versions.action.ts
'use server';

import { getSession } from '~src/actions/session.action';
import type { BackupVersionsResult } from 'types/backups.types';

const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

export async function getBackupVersions(
    username: string,
    originalKey: string,
): Promise<BackupVersionsResult> {
    if (!BASE_URL) return { status: 'fetch-failed' };

    const session = await getSession();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (session.id) {
        headers['Authorization'] = `Bearer ${session.id}`;
    }

    const url = `${BASE_URL}/backups/user/${encodeURIComponent(
        username,
    )}/versions?key=${encodeURIComponent(originalKey)}`;

    let res: Response;
    try {
        res = await fetch(url, { headers, cache: 'no-store' });
    } catch {
        return { status: 'fetch-failed' };
    }

    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'fetch-failed' };

    try {
        const data = await res.json();
        return { status: 'ok', data };
    } catch {
        return { status: 'fetch-failed' };
    }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/actions/backup-versions.action.ts
git commit -m "feat(backups): add getBackupVersions server action"
```

---

## Task 3: DownloadButton primitive

**Files:**
- Create: `src/components/run/downloads/download-button.tsx`

- [ ] **Step 1: Create the primitive**

```tsx
// src/components/run/downloads/download-button.tsx
'use client';

import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Download, Lock } from 'react-bootstrap-icons';

interface DownloadButtonProps {
    downloadUrl: string | null;
    filename: string;
    onClick?: () => void;
}

export function DownloadButton({
    downloadUrl,
    filename,
    onClick,
}: DownloadButtonProps) {
    if (downloadUrl) {
        return (
            <a
                href={downloadUrl}
                download={filename}
                onClick={onClick}
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                aria-label={`Download ${filename}`}
            >
                <Download aria-hidden="true" />
                <span>Download</span>
            </a>
        );
    }

    return (
        <OverlayTrigger
            placement="top"
            overlay={
                <Tooltip>
                    Supporter-only — cloud backups have storage costs.
                </Tooltip>
            }
        >
            <button
                type="button"
                disabled
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                aria-label="Locked download — supporter-only"
            >
                <Lock aria-hidden="true" />
                <span>Locked</span>
            </button>
        </OverlayTrigger>
    );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/run/downloads/download-button.tsx
git commit -m "feat(backups): add DownloadButton primitive"
```

---

## Task 4: CurrentSplits component

**Files:**
- Create: `src/components/run/downloads/current-splits.tsx`

This extracts the existing download logic from `src/components/run/dashboard/splits.tsx:40-74` into its own component. The logic stays identical — same encoding dance, same fallback URL, same blob-based download, same "Clear History" toast. Toast will render through the global `<ToastContainer />` in `app/(new-layout)/content.tsx`.

- [ ] **Step 1: Create the component**

```tsx
// src/components/run/downloads/current-splits.tsx
'use client';

import { toast } from 'react-toastify';
import type { Run } from '~src/common/types';

interface CurrentSplitsProps {
    run: Run;
}

export function CurrentSplits({ run }: CurrentSplitsProps) {
    if (!run.splitsFile) {
        return (
            <div>
                <h3 className="fs-5 mb-2">Current splits</h3>
                <p className="text-muted mb-0">
                    No splits file uploaded for this run.
                </p>
            </div>
        );
    }

    const splitsFile = decodeURIComponent(run.splitsFile)
        .replaceAll('%', '%25')
        .replaceAll('+++', '+%2B+')
        .replaceAll('++', '%2B+')
        .replaceAll('NG+', 'NG%2B');

    const url = `${process.env.NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL}/${splitsFile}`;
    const fallbackUrl = `${process.env.NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL}/${splitsFile.replaceAll('+', '%2B')}`;
    const downloadFilename = `${run.user}_${run.game}_${run.run}.lss`;

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        toast.info(
            `If you want to remove the run history on these splits, use 'Edit Splits' -> 'Other...' -> 'Clear History' from within LiveSplit.`,
        );

        let response = await fetch(url);
        if (!response.ok) {
            response = await fetch(fallbackUrl);
        }
        if (!response.ok) {
            toast.error('Failed to download splits file.');
            return;
        }

        const blob = new Blob([await response.blob()], {
            type: 'application/octet-stream',
        });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = downloadFilename;
        a.click();
        URL.revokeObjectURL(blobUrl);
    };

    return (
        <div>
            <h3 className="fs-5 mb-2">Current splits</h3>
            <div className="d-flex align-items-center justify-content-between border rounded p-3">
                <div>
                    <div className="fw-semibold">{downloadFilename}</div>
                    <small className="text-muted">
                        The live splits file currently on this run.
                    </small>
                </div>
                <a
                    href={url}
                    download={downloadFilename}
                    onClick={handleDownload}
                    className="btn btn-sm btn-outline-primary"
                >
                    Download
                </a>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/run/downloads/current-splits.tsx
git commit -m "feat(backups): add CurrentSplits component"
```

---

## Task 5: RecentList + DailyList

**Files:**
- Create: `src/components/run/downloads/recent-list.tsx`
- Create: `src/components/run/downloads/daily-list.tsx`

- [ ] **Step 1: Create RecentList**

```tsx
// src/components/run/downloads/recent-list.tsx
'use client';

import moment from 'moment';
import { Table } from 'react-bootstrap';
import type { BackupRecentEntry } from 'types/backups.types';
import { DownloadButton } from './download-button';

interface RecentListProps {
    entries: BackupRecentEntry[];
    filenameBase: string;
}

export function RecentList({ entries, filenameBase }: RecentListProps) {
    if (entries.length === 0) {
        return (
            <div className="mb-3">
                <h4 className="fs-6 mb-2">Recent (last 5 uploads)</h4>
                <p className="text-muted small mb-0">
                    No recent snapshots yet.
                </p>
            </div>
        );
    }

    return (
        <div className="mb-3">
            <h4 className="fs-6 mb-2">Recent (last 5 uploads)</h4>
            <Table striped bordered hover responsive size="sm">
                <thead>
                    <tr>
                        <th style={{ width: '70%' }}>Uploaded</th>
                        <th style={{ width: '30%' }}>Download</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry) => {
                        const ts = moment(entry.uploadedAt);
                        const filename = `${filenameBase}_${ts.format(
                            'YYYY-MM-DD-HHmm',
                        )}.lss`;
                        return (
                            <tr key={entry.uploadedAt}>
                                <td>
                                    <div>{ts.format('L LT')}</div>
                                    <small className="text-muted">
                                        {ts.fromNow()}
                                    </small>
                                </td>
                                <td>
                                    <DownloadButton
                                        downloadUrl={entry.downloadUrl}
                                        filename={filename}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
}
```

- [ ] **Step 2: Create DailyList**

```tsx
// src/components/run/downloads/daily-list.tsx
'use client';

import moment from 'moment';
import { Table } from 'react-bootstrap';
import type { BackupDailyEntry } from 'types/backups.types';
import { DownloadButton } from './download-button';

interface DailyListProps {
    entries: BackupDailyEntry[];
    filenameBase: string;
}

export function DailyList({ entries, filenameBase }: DailyListProps) {
    if (entries.length === 0) {
        return (
            <div className="mb-3">
                <h4 className="fs-6 mb-2">Daily snapshots</h4>
                <p className="text-muted small mb-0">
                    No daily snapshots yet.
                </p>
            </div>
        );
    }

    return (
        <div className="mb-3">
            <h4 className="fs-6 mb-2">Daily snapshots</h4>
            <Table striped bordered hover responsive size="sm">
                <thead>
                    <tr>
                        <th style={{ width: '40%' }}>Date</th>
                        <th style={{ width: '30%' }}>Expires</th>
                        <th style={{ width: '30%' }}>Download</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry) => {
                        const filename = `${filenameBase}_${entry.date}.lss`;
                        return (
                            <tr key={entry.date}>
                                <td>{entry.date}</td>
                                <td>
                                    {entry.expiresAt === null ? (
                                        <span className="text-muted">
                                            never
                                        </span>
                                    ) : (
                                        <>
                                            <div>
                                                {moment(entry.expiresAt).format(
                                                    'L',
                                                )}
                                            </div>
                                            <small className="text-muted">
                                                {moment(
                                                    entry.expiresAt,
                                                ).fromNow()}
                                            </small>
                                        </>
                                    )}
                                </td>
                                <td>
                                    <DownloadButton
                                        downloadUrl={entry.downloadUrl}
                                        filename={filename}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/run/downloads/recent-list.tsx src/components/run/downloads/daily-list.tsx
git commit -m "feat(backups): add RecentList and DailyList"
```

---

## Task 6: Backups section wrapper

**Files:**
- Create: `src/components/run/downloads/backups.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/run/downloads/backups.tsx
'use client';

import Link from '~src/components/link';
import type { BackupVersionsResponse } from 'types/backups.types';
import { DailyList } from './daily-list';
import { RecentList } from './recent-list';

type BackupsState =
    | { status: 'loading' }
    | { status: 'loaded'; data: BackupVersionsResponse }
    | { status: 'empty' } // 404 — no metadata for this key
    | { status: 'error' };

interface BackupsProps {
    state: BackupsState;
    filenameBase: string;
    onRetry: () => void;
}

function PaywallCard() {
    return (
        <div className="border rounded p-3 mb-3 bg-body-tertiary">
            <h4 className="fs-6 mb-2">Downloads are a supporter feature</h4>
            <p className="mb-2 small">
                Cloud backups cost therun.gg money to keep around. Becoming a
                supporter on Patreon unlocks downloads — yours and everyone
                else's.
            </p>
            <Link href="/support" className="btn btn-sm btn-primary">
                Support therun.gg
            </Link>
        </div>
    );
}

export function Backups({ state, filenameBase, onRetry }: BackupsProps) {
    return (
        <div className="mt-4">
            <h3 className="fs-5 mb-2">Backups</h3>

            {state.status === 'loading' && (
                <p className="text-muted mb-0">Loading backups…</p>
            )}

            {state.status === 'error' && (
                <div>
                    <p className="text-danger mb-2">
                        Couldn't load backups.
                    </p>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onRetry}
                    >
                        Retry
                    </button>
                </div>
            )}

            {state.status === 'empty' && (
                <div className="border rounded p-3 bg-body-tertiary">
                    <p className="mb-2">
                        No backups for this run yet. Supporters get automatic
                        cloud backups on every upload.
                    </p>
                    <Link href="/support" className="btn btn-sm btn-primary">
                        Support therun.gg
                    </Link>
                </div>
            )}

            {state.status === 'loaded' && (
                <>
                    {!state.data.canDownload && <PaywallCard />}
                    <RecentList
                        entries={state.data.recent}
                        filenameBase={filenameBase}
                    />
                    <DailyList
                        entries={state.data.daily}
                        filenameBase={filenameBase}
                    />
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/run/downloads/backups.tsx
git commit -m "feat(backups): add Backups section wrapper with paywall"
```

---

## Task 7: DownloadsTab container

**Files:**
- Create: `src/components/run/downloads/downloads-tab.tsx`

The container owns the versions fetch, 13-min freshness check, and triggers a refetch before every download click whose cached data is stale. It accepts an `isActive` prop — the fetch fires only once `isActive` becomes `true` (lazy load).

- [ ] **Step 1: Create the container**

```tsx
// src/components/run/downloads/downloads-tab.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBackupVersions } from '~src/actions/backup-versions.action';
import type { Run } from '~src/common/types';
import type { BackupVersionsResponse } from 'types/backups.types';
import { Backups } from './backups';
import { CurrentSplits } from './current-splits';

interface DownloadsTabProps {
    run: Run;
    username: string;
    isActive: boolean;
}

type FetchState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'loaded'; data: BackupVersionsResponse; fetchedAt: number }
    | { status: 'empty'; fetchedAt: number }
    | { status: 'error' };

const FRESHNESS_MS = 13 * 60 * 1000; // refetch if older than 13 min

export function DownloadsTab({ run, username, isActive }: DownloadsTabProps) {
    const [state, setState] = useState<FetchState>({ status: 'idle' });
    const hasLoadedOnce = useRef(false);

    const load = useCallback(async () => {
        if (!run.splitsFile) {
            setState({ status: 'empty', fetchedAt: Date.now() });
            return;
        }
        setState({ status: 'loading' });
        const result = await getBackupVersions(username, run.splitsFile);
        if (result.status === 'ok') {
            setState({
                status: 'loaded',
                data: result.data,
                fetchedAt: Date.now(),
            });
        } else if (result.status === 'not-found') {
            setState({ status: 'empty', fetchedAt: Date.now() });
        } else {
            setState({ status: 'error' });
        }
    }, [username, run.splitsFile]);

    useEffect(() => {
        if (!isActive) return;
        if (hasLoadedOnce.current) return;
        hasLoadedOnce.current = true;
        void load();
    }, [isActive, load]);

    // Refetch on every tab activation if the cached data is stale.
    useEffect(() => {
        if (!isActive) return;
        if (state.status !== 'loaded' && state.status !== 'empty') return;
        if (Date.now() - state.fetchedAt < FRESHNESS_MS) return;
        void load();
    }, [isActive, state, load]);

    const filenameBase = `${run.game}_${run.run}`;

    return (
        <div>
            <CurrentSplits run={run} />
            <Backups
                state={
                    state.status === 'loaded'
                        ? { status: 'loaded', data: state.data }
                        : state.status === 'empty'
                          ? { status: 'empty' }
                          : state.status === 'error'
                            ? { status: 'error' }
                            : { status: 'loading' }
                }
                filenameBase={filenameBase}
                onRetry={load}
            />
        </div>
    );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/run/downloads/downloads-tab.tsx
git commit -m "feat(backups): add DownloadsTab container with lazy fetch"
```

---

## Task 8: Wire DownloadsTab into the run page

**Files:**
- Modify: `app/(new-layout)/[username]/[game]/[run]/page.tsx`
- Modify: `app/(new-layout)/[username]/[game]/[run]/run.tsx`

The run page is a server component; it fetches the viewer's session and passes the viewer's username down. `RunDetail` becomes controlled over `activeTab` so we can pass `isActive` into `DownloadsTab`.

- [ ] **Step 1: Read viewer session in the page**

In `app/(new-layout)/[username]/[game]/[run]/page.tsx`, at the top:

```tsx
import { getSession } from '~src/actions/session.action';
```

Inside `RunPage`, after `const liveData = await getLiveRunForUser(username);`, add:

```tsx
const viewerSession = await getSession();
```

Update the `<RunDetail />` invocation to pass the viewer's username:

```tsx
<RunDetail
    run={run}
    username={username}
    game={game}
    runName={runName}
    globalGameData={globalGameData}
    liveData={liveData}
    tab={searchParams.tab}
    viewerUsername={viewerSession.username}
/>
```

- [ ] **Step 2: Accept viewerUsername in run.tsx and wire the tab**

In `app/(new-layout)/[username]/[game]/[run]/run.tsx`:

Add the import near the other imports:

```tsx
import { DownloadsTab } from '~src/components/run/downloads/downloads-tab';
```

Update the `RunPageProps` interface:

```tsx
interface RunPageProps {
    run: Run;
    username: string;
    game: string;
    runName: string;
    globalGameData: GlobalGameData;
    liveData: LiveRun;
    tab?: string;
    viewerUsername?: string;
}
```

Update the component signature and add controlled `activeTab` state. Replace the current `export default function RunDetail({ ... tab = 'dashboard' }: ...)` destructure and body to include `viewerUsername` and `activeTab`:

```tsx
export default function RunDetail({
    run,
    username,
    runName,
    globalGameData,
    liveData,
    tab = 'dashboard',
    viewerUsername,
}: RunPageProps) {
    const { baseUrl } = React.useContext(AppContext);
    const forceRealTime = !!globalGameData.forceRealTime;
    const [activeTab, setActiveTab] = useState<string>(tab);
    // ...rest of existing body stays the same
```

(`viewerUsername` is currently accepted for future use but the Downloads tab itself does not need it — gating comes from the backend. Keeping it on the prop surface avoids having to re-touch the interface when owner-only UI lands later.)

Change the `<Tabs>` element to controlled mode and keep the existing `onSelect` behavior for `compare`:

```tsx
<Tabs
    activeKey={activeTab}
    className="mb-3"
    onSelect={async (e) => {
        if (!e) return;
        setActiveTab(e);
        if (e === 'compare' && !gameData) {
            await loadCompare();
        }
    }}
>
```

Add the Downloads tab at the end of the tab list, after the `compare` tab and before the `vod` tab:

```tsx
<Tab eventKey="downloads" title="Downloads">
    <DownloadsTab
        run={run}
        username={username}
        isActive={activeTab === 'downloads'}
    />
</Tab>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: PASS (no new errors). Fix any that surface.

- [ ] **Step 5: Manually verify tab is reachable**

Start the dev server: `npm run dev`.
Open any `/[user]/[game]/[run]` URL. Confirm a "Downloads" tab appears at the end of the tab strip, that clicking it shows the current splits row, and that the Backups section renders in loading → then either loaded/empty/error.

- [ ] **Step 6: Commit**

```bash
git add app/\(new-layout\)/\[username\]/\[game\]/\[run\]/page.tsx \
        app/\(new-layout\)/\[username\]/\[game\]/\[run\]/run.tsx
git commit -m "feat(backups): wire Downloads tab into run page"
```

---

## Task 9: Remove the inline download icon from splits.tsx

**Files:**
- Modify: `src/components/run/dashboard/splits.tsx`

With the Downloads tab live, the small cloud-download icon next to "Splits" becomes redundant. Remove it along with its handler, URL-encoding block, and the local `ToastContainer` (the global one in `app/(new-layout)/content.tsx` picks up any residual toasts).

- [ ] **Step 1: Remove unused imports**

At the top of `src/components/run/dashboard/splits.tsx`, change:

```tsx
import { Bounce, ToastContainer, toast } from 'react-toastify';
```

to remove that import line entirely. Also remove:

```tsx
import { useTheme } from 'next-themes';
```

- [ ] **Step 2: Remove the URL construction + handler inside the component**

In the `Splits` component body, remove:

```tsx
const splitsFile = decodeURIComponent(run.splitsFile as string)
    .replaceAll('%', '%25')
    .replaceAll('+++', '+%2B+')
    .replaceAll('++', '%2B+')
    .replaceAll('NG+', 'NG%2B');

const url = `${process.env.NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL}/${splitsFile}`;
const fallbackUrl = `${process.env.NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL}/${splitsFile.replaceAll('+', '%2B')}`;
const downloadFilename = `${run.user}_${run.game}_${run.run}.lss`;

const handleDownload = async () => {
    toast.info(
        `If you want to remove the run history on these splits, use 'Edit Splits' -> 'Other...' -> 'Clear History' from within LiveSplit.`,
    );

    let response = await fetch(url);
    if (!response.ok) {
        response = await fetch(fallbackUrl);
    }

    if (!response.ok) {
        toast.error('Failed to download splits file.');
        return;
    }

    const blob = new Blob([await response.blob()], {
        type: 'application/octet-stream',
    });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadFilename;
    a.click();
    URL.revokeObjectURL(blobUrl);
};

const theme = useTheme();
```

- [ ] **Step 3: Remove the `<ToastContainer>` JSX**

Delete the block starting with `<ToastContainer` and ending with `/>` near the top of the returned `<div>`.

- [ ] **Step 4: Remove the `<a>` link with the download icon**

In the heading row, replace:

```tsx
<Col xl={9} style={{ whiteSpace: 'nowrap', display: 'flex' }}>
    <h2>Splits {gameTime && '(IGT)'}</h2>
    {run.splitsFile && (
        <a
            rel="noreferrer"
            style={{ marginLeft: '0.5rem' }}
            href={url}
            download={downloadFilename}
            onClick={(e) => {
                e.preventDefault();
                handleDownload();
            }}
        >
            <DownloadIcon />
        </a>
    )}
</Col>
```

with:

```tsx
<Col xl={9} style={{ whiteSpace: 'nowrap', display: 'flex' }}>
    <h2>Splits {gameTime && '(IGT)'}</h2>
</Col>
```

- [ ] **Step 5: Remove the now-unused `DownloadIcon` component at the bottom of the file**

Delete the entire `DownloadIcon` functional component (the `// TODO: Move this to icons directory` comment + SVG definition).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: PASS (no new errors). Fix any that surface — expected: unused-var warnings disappear after removing the imports above.

- [ ] **Step 8: Commit**

```bash
git add src/components/run/dashboard/splits.tsx
git commit -m "refactor(run): remove inline splits download icon (moved to Downloads tab)"
```

---

## Task 10: End-to-end browser verification

No code changes. Manual verification across viewer states to confirm the feature works in practice.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`. Wait for "Ready".

- [ ] **Step 2: Verify anonymous viewer path**

Log out (or open an incognito window). Visit `/[some-patron]/[their-game]/[their-run]`. Confirm:
- Downloads tab is visible.
- Clicking it shows "Current splits" with a working download.
- Backups section shows Recent + Daily lists populated with the owner's snapshots.
- Every row shows a locked button with the "Supporter-only — cloud backups have storage costs." tooltip on hover.
- A paywall card with the cost-driven copy appears above the lists.

- [ ] **Step 3: Verify non-supporter logged-in viewer path**

Log in with a non-supporter account. Visit the same run. Confirm the UX matches the anonymous path (no download links, paywall card present, lists still render).

- [ ] **Step 4: Verify supporter viewer path (any tier ≥ 1)**

Log in with a supporter account. Visit the same run. Confirm:
- Every list row shows a clickable Download button.
- Clicking a backup row downloads the `.lss` with a filename like `<game>_<run>_<date>.lss` (daily) or `<game>_<run>_<timestamp>.lss` (recent).
- No paywall card shows above the lists.

- [ ] **Step 5: Verify empty state**

Visit a run for a user who has never had backups (or a non-supporter's run). Confirm the Backups section shows "No backups for this run yet. Supporters get automatic cloud backups on every upload." with the Support CTA.

- [ ] **Step 6: Verify that the inline splits download icon is gone**

On the Dashboard tab, confirm there is no cloud-download icon next to the "Splits" heading.

- [ ] **Step 7: Verify that other tabs still work**

Click through Dashboard → Splits Stats → Sessions → Runs → Golds → Timesaves → Compare → Video → Downloads → back to Dashboard. Confirm no tab rendering regresses.

- [ ] **Step 8: Verify no network call on initial load**

Open DevTools → Network. Load a run page. Confirm there is **no** request to `/backups/user/...` until the Downloads tab is first clicked.

- [ ] **Step 9: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 10: Clear build cache and rebuild**

Per project CLAUDE.md: after significant changes, clear `.next`:
```bash
rm -rf .next
npm run build
```
Expected: PASS.

- [ ] **Step 11: Commit any fixes made during verification**

If any issues surfaced during steps 2–10 and were fixed inline:
```bash
git add -p
git commit -m "fix(backups): <describe fix>"
```

---

## Out of scope (do not implement in this plan)

- Global `/[username]/backups` page with cross-run listing and grace-window banner.
- Extending `/versions` with `graceUntil` to enable a run-page grace banner.
- Owner-tier display ("this user is T3 — backups kept forever").
- Orphaned `originalKey` fallback (first call `/backups/user/{username}`, match against `files[]`). Only implement if `run.splitsFile` turns out not to match the backend's `originalKey`.
