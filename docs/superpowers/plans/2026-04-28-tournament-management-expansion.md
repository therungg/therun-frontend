# Tournament Management Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the frontend tournament feature to the new `/v1/tournaments/...` API and ship full per-tournament management UI: create, edit, delete, staff (capability-scoped), admins, participants/bans, runs, and lifecycle controls.

**Architecture:** Centralize all tournament HTTP calls in a new `src/lib/api/tournaments.ts` typed client built on the existing `apiFetch()` helper. Keep server actions thin (FormData → client function → `revalidateTag`). Add a permission helper module that mirrors the server's capability model. UI is added under `app/(new-layout)/tournaments/` as a "Manage" panel rendered alongside the existing tournament page, gated by capability helpers. Existing pages keep working unchanged until each task migrates them.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, react-bootstrap, server actions, `'use cache'` + `revalidateTag()` for data caching, CASL for RBAC.

**Reference doc:** `docs/frontend-guide-tournament-management.md`

---

## File structure

**Created:**
- `types/tournament.types.ts` — new `Tournament`, `StaffEntry`, `Capability`, `Social` types matching the v1 API
- `src/lib/api/tournaments.ts` — typed API client (one function per endpoint)
- `src/lib/tournament-permissions.ts` — `isTournamentAdmin`, `hasCapability`, `canCreateTournament`, etc.
- `app/(new-layout)/tournaments/actions/create-tournament.action.ts`
- `app/(new-layout)/tournaments/actions/update-tournament.action.ts`
- `app/(new-layout)/tournaments/actions/delete-tournament.action.ts`
- `app/(new-layout)/tournaments/actions/staff.actions.ts` (add/update/remove)
- `app/(new-layout)/tournaments/actions/admins.actions.ts` (add/remove)
- `app/(new-layout)/tournaments/actions/participants.actions.ts` (set status, remove)
- `app/(new-layout)/tournaments/actions/lifecycle.action.ts`
- `app/(new-layout)/tournaments/create/page.tsx` — create-tournament page
- `app/(new-layout)/tournaments/[tournament]/manage/page.tsx` — manage-tournament page (server component, fetches + checks perms)
- `app/(new-layout)/tournaments/[tournament]/manage/manage-panel.tsx` — client root with tabs
- `app/(new-layout)/tournaments/[tournament]/manage/settings-panel.tsx`
- `app/(new-layout)/tournaments/[tournament]/manage/staff-panel.tsx`
- `app/(new-layout)/tournaments/[tournament]/manage/admins-panel.tsx`
- `app/(new-layout)/tournaments/[tournament]/manage/participants-panel.tsx`
- `app/(new-layout)/tournaments/[tournament]/manage/lifecycle-panel.tsx`
- `app/(new-layout)/tournaments/[tournament]/manage/lifecycle-status-badge.tsx`

**Modified:**
- `types/session.types.ts` — add `tournament-creator` to `Role` union
- `src/rbac/ability.ts` — add `tournament-creator` role definition
- `src/lib/api-client.ts` — extend `apiFetch` to accept method/body and propagate `ApiError`
- `src/components/tournament/getTournaments.ts` — switch to `/v1/tournaments/...`, drop `banUserFromTournament`
- `src/components/tournament/tournament-info.tsx` — replace `moderators`/`admin` reads with new `admins`/`staff` shape; replace inline lifecycle form with link to manage page
- `src/components/tournament/tournament-runs.tsx` — use new permission helper instead of `moderators.includes(...)`
- `app/(new-layout)/tournaments/actions/add-time.action.ts` — point at new `/v1/.../runs` endpoint
- `app/(new-layout)/tournaments/actions/exclude-run.action.ts` — point at new `/v1/.../runs` (DELETE)
- `app/(new-layout)/tournaments/actions/increase-end-time-by-an-hour.ts` — point at new `/v1/.../runs/end-time`

**Deleted (final cleanup task):**
- Inline `banUserFromTournament` in `getTournaments.ts` (replaced by participants action)

---

## Task 1: Add new tournament types

**Files:**
- Create: `types/tournament.types.ts`

- [ ] **Step 1: Write the type module**

```ts
// types/tournament.types.ts
export type Capability =
    | 'manage_runs'
    | 'manage_participants'
    | 'edit_settings'
    | 'manage_staff'
    | 'lifecycle';

export const CAPABILITIES: Capability[] = [
    'manage_runs',
    'manage_participants',
    'edit_settings',
    'manage_staff',
    'lifecycle',
];

export interface Social {
    display: string;
    urlDisplay: string;
    url: string;
}

export interface StaffEntry {
    user: string;
    capabilities: Capability[];
}

export interface DateRange {
    startDate: string;
    endDate: string;
}

export interface GameCategory {
    game: string;
    category: string;
}

export interface ExcludedRun {
    user: string;
    startedAt: string;
}

export interface CustomRun {
    user: string;
    date: string;
    time: string;
}

export interface TournamentSocials {
    twitch?: Social;
    twitter?: Social;
    youtube?: Social;
    discord?: Social;
    facebook?: Social;
    matcherino?: Social;
}

export interface Tournament {
    id?: number;
    name: string;
    description?: string;
    rules?: string[];
    socials?: TournamentSocials;
    startDate: string;
    endDate: string;
    admins: string[];
    staff: StaffEntry[];
    eligiblePeriods: DateRange[];
    eligibleUsers: string[] | null;
    eligibleRuns: GameCategory[];
    ineligibleUsers: string[] | null;
    url?: string;
    pointDistribution?: number[] | null;
    customRuns?: CustomRun[] | null;
    excludedRuns: ExcludedRun[];
    gameTime?: boolean;
    logoUrl?: string;
    minimumTimeSeconds?: number;
    shortName?: string;
    forceStream?: string;
    hide: boolean;
    qualifier?: string;
    parentTournamentName?: string;
    parentTournamentSequence?: number;
    raceId?: string;
    gameImage?: string;
    organizer?: string;
    lockedAt?: string | null;
    finalizedAt?: string | null;
    leaderboards?: unknown;
}

export type ParticipantStatus = 'eligible' | 'banned';

export interface Participants {
    eligibleUsers: string[] | null;
    ineligibleUsers: string[] | null;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add types/tournament.types.ts
git commit -m "feat(tournaments): add v1 tournament types"
```

---

## Task 2: Extend api-client with method/body and ApiError

**Files:**
- Modify: `src/lib/api-client.ts`

- [ ] **Step 1: Replace api-client with extended version**

```ts
// src/lib/api-client.ts
const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

export class ApiError extends Error {
    status: number;
    errors?: string[];
    constructor(status: number, message: string, errors?: string[]) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    sessionId?: string;
    body?: unknown;
}

export async function apiFetch<T>(
    path: string,
    options?: ApiFetchOptions,
): Promise<T> {
    const { sessionId, body, headers: extraHeaders, ...rest } = options || {};
    const headers: Record<string, string> = {
        ...(extraHeaders as Record<string, string>),
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (sessionId) headers['Authorization'] = `Bearer ${sessionId}`;

    const res = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        let message = `${res.status} ${path}`;
        let errors: string[] | undefined;
        try {
            const j = await res.json();
            if (j?.error) message = j.error;
            if (Array.isArray(j?.errors)) errors = j.errors;
        } catch {
            // non-JSON body — keep default message
        }
        throw new ApiError(res.status, message, errors);
    }

    if (res.status === 204) return undefined as T;
    const json = await res.json();
    return json.result as T;
}
```

- [ ] **Step 2: Verify existing callers still compile**

Run: `npm run typecheck`
Expected: PASS (existing callers pass `sessionId` only; the new optional `body`/`method` are additive).

- [ ] **Step 3: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat(api-client): support body/method and typed ApiError"
```

---

## Task 3: Build the typed v1 tournaments API client

**Files:**
- Create: `src/lib/api/tournaments.ts`

- [ ] **Step 1: Write the client module**

```ts
// src/lib/api/tournaments.ts
import { apiFetch } from '~src/lib/api-client';
import type {
    Capability,
    Participants,
    ParticipantStatus,
    StaffEntry,
    Tournament,
} from '../../../types/tournament.types';

const enc = encodeURIComponent;
const base = (name?: string) =>
    name ? `/v1/tournaments/${enc(name)}` : `/v1/tournaments`;

export const listTournaments = () => apiFetch<Tournament[]>(base());

export const getTournament = (name: string) =>
    apiFetch<Tournament>(base(name));

export const createTournament = (body: Partial<Tournament>, sessionId: string) =>
    apiFetch<Tournament>(base(), { method: 'POST', body, sessionId });

export const updateTournament = (
    name: string,
    patch: Partial<Tournament>,
    sessionId: string,
) =>
    apiFetch<Tournament>(base(name), {
        method: 'PATCH',
        body: patch,
        sessionId,
    });

export const deleteTournament = (name: string, sessionId: string) =>
    apiFetch<{ ok: true }>(base(name), { method: 'DELETE', sessionId });

// Staff
export const listStaff = (name: string, sessionId: string) =>
    apiFetch<StaffEntry[]>(`${base(name)}/staff`, { sessionId });

export const addStaff = (
    name: string,
    user: string,
    capabilities: Capability[],
    sessionId: string,
) =>
    apiFetch<Tournament>(`${base(name)}/staff`, {
        method: 'POST',
        body: { user, capabilities },
        sessionId,
    });

export const updateStaff = (
    name: string,
    user: string,
    capabilities: Capability[],
    sessionId: string,
) =>
    apiFetch<Tournament>(`${base(name)}/staff/${enc(user)}`, {
        method: 'PATCH',
        body: { capabilities },
        sessionId,
    });

export const removeStaff = (name: string, user: string, sessionId: string) =>
    apiFetch<Tournament>(`${base(name)}/staff/${enc(user)}`, {
        method: 'DELETE',
        sessionId,
    });

// Admins
export const listAdmins = (name: string, sessionId: string) =>
    apiFetch<string[]>(`${base(name)}/admins`, { sessionId });

export const addAdmin = (name: string, user: string, sessionId: string) =>
    apiFetch<Tournament>(`${base(name)}/admins`, {
        method: 'POST',
        body: { user },
        sessionId,
    });

export const removeAdmin = (name: string, user: string, sessionId: string) =>
    apiFetch<Tournament>(`${base(name)}/admins/${enc(user)}`, {
        method: 'DELETE',
        sessionId,
    });

// Participants
export const listParticipants = (name: string) =>
    apiFetch<Participants>(`${base(name)}/participants`);

export const setParticipantStatus = (
    name: string,
    user: string,
    status: ParticipantStatus,
    sessionId: string,
) =>
    apiFetch<Tournament>(`${base(name)}/participants`, {
        method: 'POST',
        body: { user, status },
        sessionId,
    });

export const removeParticipant = (
    name: string,
    user: string,
    sessionId: string,
) =>
    apiFetch<Tournament>(`${base(name)}/participants/${enc(user)}`, {
        method: 'DELETE',
        sessionId,
    });

// Runs
export const addCustomRun = (
    name: string,
    user: string,
    time: string,
    date: string,
    sessionId: string,
) =>
    apiFetch<{ ok: true }>(`${base(name)}/runs`, {
        method: 'POST',
        body: { user, time, date },
        sessionId,
    });

export const excludeRun = (
    name: string,
    user: string,
    startedAt: string,
    sessionId: string,
) =>
    apiFetch<{ ok: true }>(`${base(name)}/runs`, {
        method: 'DELETE',
        body: { user, startedAt },
        sessionId,
    });

export const setRunsEndTime = (
    name: string,
    date: string,
    heat: number | undefined,
    sessionId: string,
) =>
    apiFetch<{ ok: true }>(`${base(name)}/runs/end-time`, {
        method: 'POST',
        body: heat !== undefined ? { date, heat } : { date },
        sessionId,
    });

// Lifecycle
export type LifecycleAction =
    | 'lock'
    | 'unlock'
    | 'finalize'
    | 'archive'
    | 'recalculate';

export const lifecycleAction = (
    name: string,
    action: LifecycleAction,
    sessionId: string,
) =>
    apiFetch<Tournament | { ok: true }>(`${base(name)}/lifecycle`, {
        method: 'POST',
        body: { action },
        sessionId,
    });

// Stats
export const getTournamentStats = (name: string) =>
    apiFetch<unknown>(`${base(name)}/stats`);
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/tournaments.ts
git commit -m "feat(tournaments): add v1 typed API client"
```

---

## Task 4: Add `tournament-creator` role to RBAC

**Files:**
- Modify: `types/session.types.ts`
- Modify: `src/rbac/ability.ts`

- [ ] **Step 1: Add role to the union**

In `types/session.types.ts`, add `'tournament-creator'` to the `Role` union (place it next to `'event-creator'`):

```ts
export type Role =
    | 'admin'
    | 'role-admin'
    | 'patreon3'
    | 'moderator'
    | 'story-beta-user'
    | 'board-admin'
    | 'board-moderator'
    | 'race-admin'
    | 'event-admin'
    | 'event-creator'
    | 'tournament-creator'
    | 'patreon1'
    | 'patreon2';
```

- [ ] **Step 2: Add the role permission entry**

In `src/rbac/ability.ts`, inside `rolePermissions`, add a no-op entry. Backend is the source of truth for tournament permissions; this entry exists so CASL doesn't crash on the role string.

```ts
'tournament-creator': function (_user, _builder) {
    // Tournament creation permission is enforced server-side; intentionally no CASL ability mapped.
},
```

Also extend `'role-admin'` so role-admins can grant `tournament-creator`:

```ts
'role-admin': function (_user, { can }) {
    can('moderate', 'roles', {
        role: { $in: ['event-admin', 'race-admin', 'event-creator', 'tournament-creator'] },
    });
},
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add types/session.types.ts src/rbac/ability.ts
git commit -m "feat(rbac): add tournament-creator role"
```

---

## Task 5: Tournament permission helpers

**Files:**
- Create: `src/lib/tournament-permissions.ts`

- [ ] **Step 1: Write helpers**

```ts
// src/lib/tournament-permissions.ts
import type { User } from '../../types/session.types';
import type { Capability, Tournament } from '../../types/tournament.types';

export function isGlobalAdmin(user?: User | null): boolean {
    return !!user?.roles?.includes('admin');
}

export function isTournamentAdmin(
    user: User | null | undefined,
    t: Pick<Tournament, 'admins'>,
): boolean {
    if (!user?.username) return false;
    if (isGlobalAdmin(user)) return true;
    return (t.admins ?? []).includes(user.username);
}

export function hasCapability(
    user: User | null | undefined,
    t: Pick<Tournament, 'admins' | 'staff'>,
    cap: Capability,
): boolean {
    if (!user?.username) return false;
    if (isTournamentAdmin(user, t)) return true;
    return (t.staff ?? []).some(
        (s) => s.user === user.username && s.capabilities.includes(cap),
    );
}

export function canCreateTournament(user?: User | null): boolean {
    if (!user?.roles) return false;
    return (
        user.roles.includes('admin') || user.roles.includes('tournament-creator')
    );
}

export function canDeleteTournament(user?: User | null): boolean {
    return isGlobalAdmin(user);
}

export function canManageAdmins(user?: User | null): boolean {
    return isGlobalAdmin(user);
}

export type LifecycleStatus = 'finalized' | 'locked' | 'archived' | 'active';

export function lifecycleStatus(
    t: Pick<Tournament, 'lockedAt' | 'finalizedAt' | 'hide'>,
): LifecycleStatus {
    if (t.finalizedAt) return 'finalized';
    if (t.lockedAt) return 'locked';
    if (t.hide) return 'archived';
    return 'active';
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/tournament-permissions.ts
git commit -m "feat(tournaments): add permission helpers"
```

---

## Task 6: Migrate read functions to v1 and replace `Tournament` interface usage

**Files:**
- Modify: `src/components/tournament/getTournaments.ts`
- Modify: `src/components/tournament/tournament-info.tsx`
- Modify: `src/components/tournament/tournament-runs.tsx`
- Modify: `src/components/tournament/tournament-standings.tsx` (only if it imports the local `Tournament`)
- Modify: `src/components/tournament/tournament-stats.tsx` (only if it imports the local `Tournament`)

- [ ] **Step 1: Rewrite `getTournaments.ts`**

```ts
// src/components/tournament/getTournaments.ts
import { cacheLife, cacheTag } from 'next/cache';
import { listTournaments, getTournament, getTournamentStats } from '~src/lib/api/tournaments';

export const getTournaments = async () => {
    'use cache';
    cacheLife('minutes');
    cacheTag('tournaments');
    return listTournaments();
};

export const getTournamentByName = async (name: string) => {
    'use cache';
    cacheLife('seconds');
    cacheTag('tournaments');
    return getTournament(name);
};

export const getTournamentStatsByName = async (name: string) => {
    'use cache';
    cacheLife('minutes');
    cacheTag('tournaments');
    return getTournamentStats(name);
};
```

(Removes the old `banUserFromTournament` — replaced by the participants action in Task 11.)

- [ ] **Step 2: Update `tournament-info.tsx`**

Replace the local `Tournament` interface with an import:

```ts
import type { Tournament } from '../../../types/tournament.types';
import { hasCapability } from '~src/lib/tournament-permissions';
```

Delete the in-file `interface Tournament`, `interface CustomRun`, `interface Social`, `interface DateRange`, `interface GameCategory`, `interface ExcludedRun` declarations (they now live in `types/tournament.types.ts`). Re-export `Tournament` for back-compat:

```ts
export type { Tournament } from '../../../types/tournament.types';
```

Replace the `isAdmin` check (currently `tournament.moderators?.includes(user.username)`) with:

```ts
const canManageRuns = hasCapability(user, tournament, 'manage_runs');
const canEditSettings = hasCapability(user, tournament, 'edit_settings');
```

Replace every usage of `isAdmin` for the "Increase End Time" form with `canManageRuns`. Replace the moderators column rendering (`tournament.moderators.map(...)`) with:

```tsx
{tournament.admins && tournament.admins.length > 0 && (
    <Col xl={3}>
        <h3>Admins</h3>
        <ul>
            {tournament.admins.map((admin) => (
                <li key={admin}>
                    <a target="_blank" rel="noreferrer" href={`/${admin}`}>
                        {admin}
                    </a>
                </li>
            ))}
        </ul>
    </Col>
)}
```

If `canEditSettings` is true, render a "Manage tournament" link at the top of the component:

```tsx
{canEditSettings && (
    <div className="text-end mb-2">
        <a href={`/tournaments/${encodeURIComponent(tournament.name)}/manage`}>
            Manage tournament →
        </a>
    </div>
)}
```

- [ ] **Step 3: Update `tournament-runs.tsx`**

Replace:
```ts
const isAdmin =
    user && user.username && tournament.moderators?.includes(user.username);
```
with:
```ts
import { hasCapability } from '~src/lib/tournament-permissions';
const isAdmin = hasCapability(user, tournament, 'manage_runs');
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS. If `tournament-standings.tsx` or `tournament-stats.tsx` errors due to the removed local fields (`moderators`, `ineligibleUsersForPoints`), update them to use `admins`/`ineligibleUsers` or remove the rendering of those sections.

- [ ] **Step 5: Smoke-test in dev server**

Run: `npm run dev` and visit `/tournaments` and a tournament detail page. Confirm pages still render.

- [ ] **Step 6: Commit**

```bash
git add src/components/tournament types/tournament.types.ts
git commit -m "refactor(tournaments): migrate reads to /v1 and unify Tournament type"
```

---

## Task 7: Migrate run-management server actions to v1

**Files:**
- Modify: `app/(new-layout)/tournaments/actions/add-time.action.ts`
- Modify: `app/(new-layout)/tournaments/actions/exclude-run.action.ts`
- Modify: `app/(new-layout)/tournaments/actions/increase-end-time-by-an-hour.ts`

- [ ] **Step 1: Rewrite `add-time.action.ts`**

```ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { addCustomRun } from '~src/lib/api/tournaments';

export async function addTime(form: FormData) {
    const tournamentName = form.get('tournament') as string;
    const time = form.get('time') as string;
    const user = form.get('user') as string;
    const date = form.get('date') as string;
    const session = await getSession();
    if (!session.id) return;

    await addCustomRun(tournamentName, user, time, date, session.id);
    revalidateTag('tournaments', 'minutes');
}
```

- [ ] **Step 2: Rewrite `exclude-run.action.ts`**

```ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { excludeRun as excludeRunApi } from '~src/lib/api/tournaments';

export async function excludeRun(form: FormData) {
    const tournamentName = form.get('tournament') as string;
    const user = form.get('user') as string;
    const date = form.get('date') as string;
    const session = await getSession();
    if (!session.id) return;

    await excludeRunApi(tournamentName, user, date, session.id);
    revalidateTag('tournaments', 'minutes');
}
```

- [ ] **Step 3: Rewrite `increase-end-time-by-an-hour.ts`**

```ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { setRunsEndTime } from '~src/lib/api/tournaments';

export async function increaseEndTimeByAnHour(form: FormData) {
    const tournamentName = form.get('tournament') as string;
    const date = form.get('date') as string;
    const heatRaw = form.get('heat') as string | null;
    const heat = heatRaw === null || heatRaw === '' ? undefined : Number(heatRaw);
    const session = await getSession();
    if (!session.id) return;

    await setRunsEndTime(tournamentName, date, heat, session.id);
    revalidateTag('tournaments', 'minutes');
}
```

- [ ] **Step 4: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/tournaments/actions
git commit -m "refactor(tournaments): point run actions at /v1 endpoints"
```

---

## Task 8: Create-tournament action and page

**Files:**
- Create: `app/(new-layout)/tournaments/actions/create-tournament.action.ts`
- Create: `app/(new-layout)/tournaments/create/page.tsx`
- Create: `app/(new-layout)/tournaments/create/create-tournament-form.tsx`

- [ ] **Step 1: Action**

```ts
// create-tournament.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { createTournament } from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';

export async function createTournamentAction(form: FormData) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' };

    const name = (form.get('name') as string).trim();
    const startDate = form.get('startDate') as string;
    const endDate = form.get('endDate') as string;
    const description = (form.get('description') as string) || undefined;
    const shortName = (form.get('shortName') as string) || undefined;
    const game = (form.get('game') as string) || undefined;
    const category = (form.get('category') as string) || undefined;

    const eligibleRuns = game && category ? [{ game, category }] : [];

    try {
        await createTournament(
            {
                name,
                startDate,
                endDate,
                description,
                shortName,
                eligibleRuns,
                eligiblePeriods: [{ startDate, endDate }],
                hide: false,
            },
            session.id,
        );
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message, errors: e.errors };
        throw e;
    }

    revalidateTag('tournaments', 'minutes');
    redirect(`/tournaments/${encodeURIComponent(name)}`);
}
```

- [ ] **Step 2: Page (server component, gated)**

```tsx
// app/(new-layout)/tournaments/create/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { canCreateTournament } from '~src/lib/tournament-permissions';
import { CreateTournamentForm } from './create-tournament-form';

export default async function CreateTournamentPage() {
    const session = await getSession();
    if (!canCreateTournament(session.user)) redirect('/tournaments');
    return (
        <div className="container py-4">
            <h1>Create Tournament</h1>
            <CreateTournamentForm />
        </div>
    );
}
```

- [ ] **Step 3: Form (client component)**

```tsx
// app/(new-layout)/tournaments/create/create-tournament-form.tsx
'use client';

import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { SubmitButton } from '~src/components/Button/SubmitButton';
import { createTournamentAction } from '../actions/create-tournament.action';

export function CreateTournamentForm() {
    const [error, setError] = useState<string | null>(null);

    async function action(formData: FormData) {
        const res = await createTournamentAction(formData);
        if (res?.error) setError(res.errors?.join(', ') || res.error);
    }

    return (
        <Form action={action}>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form.Group className="mb-3">
                <Form.Label>Name (used in URL)</Form.Label>
                <Form.Control name="name" required />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Short name</Form.Label>
                <Form.Control name="shortName" />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control name="description" as="textarea" rows={3} />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Start date (ISO)</Form.Label>
                <Form.Control name="startDate" type="datetime-local" required />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>End date (ISO)</Form.Label>
                <Form.Control name="endDate" type="datetime-local" required />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Eligible game</Form.Label>
                <Form.Control name="game" />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Eligible category</Form.Label>
                <Form.Control name="category" />
            </Form.Group>
            <SubmitButton innerText="Create tournament" pendingText="Creating…" />
        </Form>
    );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/tournaments/create app/\(new-layout\)/tournaments/actions/create-tournament.action.ts
git commit -m "feat(tournaments): add create tournament page"
```

---

## Task 9: Manage page scaffolding + permission gate

**Files:**
- Create: `app/(new-layout)/tournaments/[tournament]/manage/page.tsx`
- Create: `app/(new-layout)/tournaments/[tournament]/manage/manage-panel.tsx`

- [ ] **Step 1: Server-side page**

```tsx
// page.tsx
import { notFound, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getTournamentByName } from '~src/components/tournament/getTournaments';
import { hasCapability, isTournamentAdmin } from '~src/lib/tournament-permissions';
import { ManagePanel } from './manage-panel';

export default async function ManageTournamentPage({
    params,
}: {
    params: Promise<{ tournament: string }>;
}) {
    const { tournament: nameRaw } = await params;
    const name = decodeURIComponent(nameRaw);
    const session = await getSession();
    if (!session.user) redirect(`/tournaments/${encodeURIComponent(name)}`);

    const tournament = await getTournamentByName(name);
    if (!tournament) notFound();

    const anyCapability =
        isTournamentAdmin(session.user, tournament) ||
        hasCapability(session.user, tournament, 'edit_settings') ||
        hasCapability(session.user, tournament, 'manage_staff') ||
        hasCapability(session.user, tournament, 'manage_participants') ||
        hasCapability(session.user, tournament, 'manage_runs') ||
        hasCapability(session.user, tournament, 'lifecycle');

    if (!anyCapability) redirect(`/tournaments/${encodeURIComponent(name)}`);

    return (
        <div className="container py-4">
            <h1>Manage: {tournament.shortName ?? tournament.name}</h1>
            <ManagePanel tournament={tournament} user={session.user} />
        </div>
    );
}
```

- [ ] **Step 2: Client tab container**

```tsx
// manage-panel.tsx
'use client';

import { useState } from 'react';
import { Nav, Tab } from 'react-bootstrap';
import type { User } from '../../../../../types/session.types';
import type { Tournament } from '../../../../../types/tournament.types';
import {
    canManageAdmins,
    hasCapability,
} from '~src/lib/tournament-permissions';

type Tab =
    | 'settings'
    | 'staff'
    | 'admins'
    | 'participants'
    | 'lifecycle';

export function ManagePanel({
    tournament,
    user,
}: {
    tournament: Tournament;
    user: User;
}) {
    const tabs: { key: Tab; label: string; visible: boolean }[] = [
        {
            key: 'settings',
            label: 'Settings',
            visible: hasCapability(user, tournament, 'edit_settings'),
        },
        {
            key: 'staff',
            label: 'Staff',
            visible: hasCapability(user, tournament, 'manage_staff'),
        },
        { key: 'admins', label: 'Admins', visible: canManageAdmins(user) },
        {
            key: 'participants',
            label: 'Participants',
            visible: hasCapability(user, tournament, 'manage_participants'),
        },
        {
            key: 'lifecycle',
            label: 'Lifecycle',
            visible: hasCapability(user, tournament, 'lifecycle'),
        },
    ].filter((t) => t.visible) as typeof tabs;

    const [active, setActive] = useState<Tab>(tabs[0]?.key ?? 'settings');

    return (
        <Tab.Container activeKey={active} onSelect={(k) => k && setActive(k as Tab)}>
            <Nav variant="tabs" className="mb-3">
                {tabs.map((t) => (
                    <Nav.Item key={t.key}>
                        <Nav.Link eventKey={t.key}>{t.label}</Nav.Link>
                    </Nav.Item>
                ))}
            </Nav>
            <Tab.Content>
                {/* panels are wired up in subsequent tasks */}
                <Tab.Pane eventKey="settings">Settings (TODO Task 10)</Tab.Pane>
                <Tab.Pane eventKey="staff">Staff (TODO Task 11)</Tab.Pane>
                <Tab.Pane eventKey="admins">Admins (TODO Task 12)</Tab.Pane>
                <Tab.Pane eventKey="participants">
                    Participants (TODO Task 13)
                </Tab.Pane>
                <Tab.Pane eventKey="lifecycle">
                    Lifecycle (TODO Task 14)
                </Tab.Pane>
            </Tab.Content>
        </Tab.Container>
    );
}
```

(The `TODO Task N` placeholders are intentional and replaced by real panels in the next tasks. Each subsequent task explicitly removes the matching placeholder line.)

- [ ] **Step 3: Verify typecheck and dev render**

Run: `npm run typecheck`
Run: `npm run dev` and visit `/tournaments/<name>/manage` as a tournament admin.
Expected: PASS / page renders with empty tabs.

- [ ] **Step 4: Commit**

```bash
git add app/\(new-layout\)/tournaments/\[tournament\]/manage
git commit -m "feat(tournaments): scaffold manage page with tab gating"
```

---

## Task 10: Settings panel (edit_settings)

**Files:**
- Create: `app/(new-layout)/tournaments/actions/update-tournament.action.ts`
- Create: `app/(new-layout)/tournaments/actions/delete-tournament.action.ts`
- Create: `app/(new-layout)/tournaments/[tournament]/manage/settings-panel.tsx`
- Modify: `app/(new-layout)/tournaments/[tournament]/manage/manage-panel.tsx`

- [ ] **Step 1: Update action**

```ts
// update-tournament.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateTournament } from '~src/lib/api/tournaments';
import type { Tournament } from '../../../../types/tournament.types';

export async function updateTournamentAction(
    name: string,
    patch: Partial<Tournament>,
) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' };
    try {
        await updateTournament(name, patch, session.id);
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message, errors: e.errors };
        throw e;
    }
    revalidateTag('tournaments', 'minutes');
    return { ok: true as const };
}
```

- [ ] **Step 2: Delete action**

```ts
// delete-tournament.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { deleteTournament } from '~src/lib/api/tournaments';

export async function deleteTournamentAction(name: string) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' };
    try {
        await deleteTournament(name, session.id);
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    }
    revalidateTag('tournaments', 'minutes');
    redirect('/tournaments');
}
```

- [ ] **Step 3: Settings panel**

```tsx
// settings-panel.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button, Form } from 'react-bootstrap';
import type { User } from '../../../../../types/session.types';
import type { Tournament } from '../../../../../types/tournament.types';
import { canDeleteTournament } from '~src/lib/tournament-permissions';
import { updateTournamentAction } from '../../../actions/update-tournament.action';
import { deleteTournamentAction } from '../../../actions/delete-tournament.action';

export function SettingsPanel({
    tournament,
    user,
}: {
    tournament: Tournament;
    user: User;
}) {
    const [error, setError] = useState<string | null>(null);
    const [okMsg, setOkMsg] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    async function onSubmit(form: FormData) {
        setError(null);
        setOkMsg(null);
        const patch: Partial<Tournament> = {
            description: (form.get('description') as string) || undefined,
            shortName: (form.get('shortName') as string) || undefined,
            startDate: form.get('startDate') as string,
            endDate: form.get('endDate') as string,
            url: (form.get('url') as string) || undefined,
            logoUrl: (form.get('logoUrl') as string) || undefined,
            organizer: (form.get('organizer') as string) || undefined,
            gameTime: form.get('gameTime') === 'on',
        };
        startTransition(async () => {
            const res = await updateTournamentAction(tournament.name, patch);
            if (res && 'error' in res)
                setError(res.errors?.join(', ') || res.error);
            else setOkMsg('Saved.');
        });
    }

    async function onDelete() {
        if (!confirm(`Delete tournament "${tournament.name}"? This is irreversible.`))
            return;
        startTransition(async () => {
            const res = await deleteTournamentAction(tournament.name);
            if (res && 'error' in res) setError(res.error);
        });
    }

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            {okMsg && <div className="alert alert-success">{okMsg}</div>}
            <Form action={onSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Short name</Form.Label>
                    <Form.Control name="shortName" defaultValue={tournament.shortName ?? ''} />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control as="textarea" rows={4} name="description" defaultValue={tournament.description ?? ''} />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Start date</Form.Label>
                    <Form.Control name="startDate" defaultValue={tournament.startDate} />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>End date</Form.Label>
                    <Form.Control name="endDate" defaultValue={tournament.endDate} />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>URL</Form.Label>
                    <Form.Control name="url" defaultValue={tournament.url ?? ''} />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Logo URL</Form.Label>
                    <Form.Control name="logoUrl" defaultValue={tournament.logoUrl ?? ''} />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Organizer</Form.Label>
                    <Form.Control name="organizer" defaultValue={tournament.organizer ?? ''} />
                </Form.Group>
                <Form.Check type="checkbox" name="gameTime" label="Use game time" defaultChecked={!!tournament.gameTime} className="mb-3" />
                <Button type="submit" disabled={isPending}>Save</Button>
            </Form>

            {canDeleteTournament(user) && (
                <div className="mt-4 border-top pt-3">
                    <h4>Danger zone</h4>
                    <Button variant="danger" onClick={onDelete} disabled={isPending}>
                        Delete tournament
                    </Button>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Wire panel into manage-panel.tsx**

Replace the `Tab.Pane eventKey="settings"` line with:

```tsx
<Tab.Pane eventKey="settings">
    <SettingsPanel tournament={tournament} user={user} />
</Tab.Pane>
```

Add the import:
```ts
import { SettingsPanel } from './settings-panel';
```

- [ ] **Step 5: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/\(new-layout\)/tournaments
git commit -m "feat(tournaments): settings + delete in manage panel"
```

---

## Task 11: Staff panel (manage_staff)

**Files:**
- Create: `app/(new-layout)/tournaments/actions/staff.actions.ts`
- Create: `app/(new-layout)/tournaments/[tournament]/manage/staff-panel.tsx`
- Modify: `app/(new-layout)/tournaments/[tournament]/manage/manage-panel.tsx`

- [ ] **Step 1: Actions**

```ts
// staff.actions.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { addStaff, removeStaff, updateStaff } from '~src/lib/api/tournaments';
import type { Capability } from '../../../../types/tournament.types';

async function withSession<T>(fn: (sessionId: string) => Promise<T>) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };
    try {
        return { ok: await fn(session.id) };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message, errors: e.errors };
        throw e;
    } finally {
        revalidateTag('tournaments', 'minutes');
    }
}

export const addStaffAction = (
    name: string,
    user: string,
    capabilities: Capability[],
) => withSession((s) => addStaff(name, user, capabilities, s));

export const updateStaffAction = (
    name: string,
    user: string,
    capabilities: Capability[],
) => withSession((s) => updateStaff(name, user, capabilities, s));

export const removeStaffAction = (name: string, user: string) =>
    withSession((s) => removeStaff(name, user, s));
```

- [ ] **Step 2: Staff panel (capability matrix)**

```tsx
// staff-panel.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import type {
    Capability,
    StaffEntry,
    Tournament,
} from '../../../../../types/tournament.types';
import { CAPABILITIES } from '../../../../../types/tournament.types';
import {
    addStaffAction,
    removeStaffAction,
    updateStaffAction,
} from '../../../actions/staff.actions';

const LABELS: Record<Capability, string> = {
    manage_runs: 'Runs',
    manage_participants: 'Participants',
    edit_settings: 'Settings',
    manage_staff: 'Staff',
    lifecycle: 'Lifecycle',
};

export function StaffPanel({ tournament }: { tournament: Tournament }) {
    const [staff, setStaff] = useState<StaffEntry[]>(tournament.staff ?? []);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function applyResult(res: Awaited<ReturnType<typeof addStaffAction>>) {
        if ('error' in res) {
            setError(res.errors?.join(', ') || res.error);
            return;
        }
        if (res.ok && typeof res.ok === 'object' && 'staff' in res.ok) {
            setStaff(((res.ok as Tournament).staff) ?? []);
        }
    }

    async function onAdd(form: FormData) {
        setError(null);
        const user = (form.get('user') as string).trim();
        if (!user) return;
        startTransition(async () => {
            const res = await addStaffAction(tournament.name, user, []);
            applyResult(res);
        });
    }

    async function toggle(entry: StaffEntry, cap: Capability) {
        setError(null);
        const next = entry.capabilities.includes(cap)
            ? entry.capabilities.filter((c) => c !== cap)
            : [...entry.capabilities, cap];
        startTransition(async () => {
            const res = await updateStaffAction(tournament.name, entry.user, next);
            applyResult(res);
        });
    }

    async function onRemove(entry: StaffEntry) {
        if (!confirm(`Remove ${entry.user} from staff?`)) return;
        startTransition(async () => {
            const res = await removeStaffAction(tournament.name, entry.user);
            applyResult(res);
        });
    }

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form action={onAdd} className="mb-3 d-flex gap-2">
                <Form.Control name="user" placeholder="twitch username" />
                <Button type="submit" disabled={isPending}>Add staff</Button>
            </Form>
            <Table responsive striped bordered hover>
                <thead>
                    <tr>
                        <th>User</th>
                        {CAPABILITIES.map((c) => <th key={c}>{LABELS[c]}</th>)}
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {staff.map((s) => (
                        <tr key={s.user}>
                            <td>{s.user}</td>
                            {CAPABILITIES.map((c) => (
                                <td key={c}>
                                    <Form.Check
                                        type="checkbox"
                                        checked={s.capabilities.includes(c)}
                                        disabled={isPending}
                                        onChange={() => toggle(s, c)}
                                    />
                                </td>
                            ))}
                            <td>
                                <Button size="sm" variant="outline-danger" onClick={() => onRemove(s)} disabled={isPending}>
                                    Remove
                                </Button>
                            </td>
                        </tr>
                    ))}
                    {staff.length === 0 && (
                        <tr><td colSpan={CAPABILITIES.length + 2} className="text-center text-muted">No staff yet.</td></tr>
                    )}
                </tbody>
            </Table>
        </div>
    );
}
```

- [ ] **Step 3: Wire into manage-panel.tsx**

Replace the staff `Tab.Pane` placeholder with:

```tsx
<Tab.Pane eventKey="staff">
    <StaffPanel tournament={tournament} />
</Tab.Pane>
```

Add `import { StaffPanel } from './staff-panel';`.

- [ ] **Step 4: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/tournaments
git commit -m "feat(tournaments): staff capability management panel"
```

---

## Task 12: Admins panel (global admin only)

**Files:**
- Create: `app/(new-layout)/tournaments/actions/admins.actions.ts`
- Create: `app/(new-layout)/tournaments/[tournament]/manage/admins-panel.tsx`
- Modify: `app/(new-layout)/tournaments/[tournament]/manage/manage-panel.tsx`

- [ ] **Step 1: Actions**

```ts
// admins.actions.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { addAdmin, removeAdmin } from '~src/lib/api/tournaments';

async function run<T>(fn: (s: string) => Promise<T>) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };
    try {
        const ok = await fn(session.id);
        return { ok };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    } finally {
        revalidateTag('tournaments', 'minutes');
    }
}

export const addAdminAction = (name: string, user: string) =>
    run((s) => addAdmin(name, user, s));

export const removeAdminAction = (name: string, user: string) =>
    run((s) => removeAdmin(name, user, s));
```

- [ ] **Step 2: Admins panel**

```tsx
// admins-panel.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import type { Tournament } from '../../../../../types/tournament.types';
import {
    addAdminAction,
    removeAdminAction,
} from '../../../actions/admins.actions';

export function AdminsPanel({ tournament }: { tournament: Tournament }) {
    const [admins, setAdmins] = useState<string[]>(tournament.admins ?? []);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    async function onAdd(form: FormData) {
        setError(null);
        const user = (form.get('user') as string).trim();
        if (!user) return;
        startTransition(async () => {
            const res = await addAdminAction(tournament.name, user);
            if ('error' in res) setError(res.error);
            else setAdmins(((res.ok as Tournament).admins) ?? admins);
        });
    }

    async function onRemove(user: string) {
        if (!confirm(`Remove ${user} as admin?`)) return;
        startTransition(async () => {
            const res = await removeAdminAction(tournament.name, user);
            if ('error' in res) setError(res.error);
            else setAdmins(((res.ok as Tournament).admins) ?? admins);
        });
    }

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form action={onAdd} className="mb-3 d-flex gap-2">
                <Form.Control name="user" placeholder="twitch username" />
                <Button type="submit" disabled={isPending}>Add admin</Button>
            </Form>
            <Table responsive striped bordered hover>
                <thead><tr><th>User</th><th></th></tr></thead>
                <tbody>
                    {admins.map((a) => (
                        <tr key={a}>
                            <td>{a}</td>
                            <td>
                                <Button size="sm" variant="outline-danger" onClick={() => onRemove(a)} disabled={isPending}>
                                    Remove
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}
```

- [ ] **Step 3: Wire into manage-panel.tsx**

Replace `<Tab.Pane eventKey="admins">Admins (TODO Task 12)</Tab.Pane>` with:

```tsx
<Tab.Pane eventKey="admins">
    <AdminsPanel tournament={tournament} />
</Tab.Pane>
```

Add `import { AdminsPanel } from './admins-panel';`.

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/tournaments
git commit -m "feat(tournaments): admins management panel"
```

---

## Task 13: Participants panel (manage_participants)

**Files:**
- Create: `app/(new-layout)/tournaments/actions/participants.actions.ts`
- Create: `app/(new-layout)/tournaments/[tournament]/manage/participants-panel.tsx`
- Modify: `app/(new-layout)/tournaments/[tournament]/manage/manage-panel.tsx`

- [ ] **Step 1: Actions**

```ts
// participants.actions.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    removeParticipant,
    setParticipantStatus,
} from '~src/lib/api/tournaments';
import type { ParticipantStatus } from '../../../../types/tournament.types';

async function run<T>(fn: (s: string) => Promise<T>) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };
    try {
        return { ok: await fn(session.id) };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    } finally {
        revalidateTag('tournaments', 'minutes');
    }
}

export const setParticipantStatusAction = (
    name: string,
    user: string,
    status: ParticipantStatus,
) => run((s) => setParticipantStatus(name, user, status, s));

export const removeParticipantAction = (name: string, user: string) =>
    run((s) => removeParticipant(name, user, s));
```

- [ ] **Step 2: Panel**

```tsx
// participants-panel.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import type {
    ParticipantStatus,
    Tournament,
} from '../../../../../types/tournament.types';
import {
    removeParticipantAction,
    setParticipantStatusAction,
} from '../../../actions/participants.actions';

export function ParticipantsPanel({ tournament }: { tournament: Tournament }) {
    const [eligible, setEligible] = useState<string[]>(tournament.eligibleUsers ?? []);
    const [banned, setBanned] = useState<string[]>(tournament.ineligibleUsers ?? []);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function applyTournament(t: Tournament) {
        setEligible(t.eligibleUsers ?? []);
        setBanned(t.ineligibleUsers ?? []);
    }

    async function setStatus(user: string, status: ParticipantStatus) {
        setError(null);
        startTransition(async () => {
            const res = await setParticipantStatusAction(tournament.name, user, status);
            if ('error' in res) setError(res.error);
            else applyTournament(res.ok as Tournament);
        });
    }

    async function onAdd(form: FormData) {
        const user = (form.get('user') as string).trim();
        const status = form.get('status') as ParticipantStatus;
        if (!user) return;
        await setStatus(user, status);
    }

    async function onRemove(user: string) {
        if (!confirm(`Remove ${user} from this tournament's lists?`)) return;
        startTransition(async () => {
            const res = await removeParticipantAction(tournament.name, user);
            if ('error' in res) setError(res.error);
            else applyTournament(res.ok as Tournament);
        });
    }

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form action={onAdd} className="mb-3 d-flex gap-2 align-items-end">
                <Form.Group>
                    <Form.Label>User</Form.Label>
                    <Form.Control name="user" />
                </Form.Group>
                <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select name="status" defaultValue="eligible">
                        <option value="eligible">Eligible</option>
                        <option value="banned">Banned</option>
                    </Form.Select>
                </Form.Group>
                <Button type="submit" disabled={isPending}>Apply</Button>
            </Form>

            <h4>Eligible ({eligible.length})</h4>
            <Table responsive striped bordered hover className="mb-4">
                <thead><tr><th>User</th><th></th></tr></thead>
                <tbody>
                    {eligible.map((u) => (
                        <tr key={u}>
                            <td>{u}</td>
                            <td className="d-flex gap-2">
                                <Button size="sm" variant="outline-warning" onClick={() => setStatus(u, 'banned')} disabled={isPending}>Ban</Button>
                                <Button size="sm" variant="outline-danger" onClick={() => onRemove(u)} disabled={isPending}>Remove</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <h4>Banned ({banned.length})</h4>
            <Table responsive striped bordered hover>
                <thead><tr><th>User</th><th></th></tr></thead>
                <tbody>
                    {banned.map((u) => (
                        <tr key={u}>
                            <td>{u}</td>
                            <td className="d-flex gap-2">
                                <Button size="sm" variant="outline-success" onClick={() => setStatus(u, 'eligible')} disabled={isPending}>Unban</Button>
                                <Button size="sm" variant="outline-danger" onClick={() => onRemove(u)} disabled={isPending}>Remove</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}
```

- [ ] **Step 3: Wire into manage-panel.tsx**

Replace `<Tab.Pane eventKey="participants">Participants (TODO Task 13)</Tab.Pane>` with:

```tsx
<Tab.Pane eventKey="participants">
    <ParticipantsPanel tournament={tournament} />
</Tab.Pane>
```

Add `import { ParticipantsPanel } from './participants-panel';`.

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/tournaments
git commit -m "feat(tournaments): participants management panel"
```

---

## Task 14: Lifecycle panel (lock/unlock/finalize/archive/recalculate)

**Files:**
- Create: `app/(new-layout)/tournaments/actions/lifecycle.action.ts`
- Create: `app/(new-layout)/tournaments/[tournament]/manage/lifecycle-status-badge.tsx`
- Create: `app/(new-layout)/tournaments/[tournament]/manage/lifecycle-panel.tsx`
- Modify: `app/(new-layout)/tournaments/[tournament]/manage/manage-panel.tsx`

- [ ] **Step 1: Action**

```ts
// lifecycle.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    LifecycleAction,
    lifecycleAction,
} from '~src/lib/api/tournaments';

export async function lifecycleActionServer(name: string, action: LifecycleAction) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' };
    try {
        const ok = await lifecycleAction(name, action, session.id);
        revalidateTag('tournaments', 'minutes');
        return { ok };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    }
}
```

- [ ] **Step 2: Status badge**

```tsx
// lifecycle-status-badge.tsx
import { Badge } from 'react-bootstrap';
import type { LifecycleStatus } from '~src/lib/tournament-permissions';

const VARIANT: Record<LifecycleStatus, string> = {
    active: 'success',
    locked: 'warning',
    finalized: 'secondary',
    archived: 'dark',
};

export function LifecycleStatusBadge({ status }: { status: LifecycleStatus }) {
    return <Badge bg={VARIANT[status]}>{status}</Badge>;
}
```

- [ ] **Step 3: Panel**

```tsx
// lifecycle-panel.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from 'react-bootstrap';
import type { Tournament } from '../../../../../types/tournament.types';
import { lifecycleStatus } from '~src/lib/tournament-permissions';
import { lifecycleActionServer } from '../../../actions/lifecycle.action';
import { LifecycleStatusBadge } from './lifecycle-status-badge';

export function LifecyclePanel({ tournament }: { tournament: Tournament }) {
    const [t, setT] = useState<Tournament>(tournament);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const status = lifecycleStatus(t);

    function dispatch(action: 'lock' | 'unlock' | 'finalize' | 'archive' | 'recalculate', confirmText?: string) {
        if (confirmText && !confirm(confirmText)) return;
        setError(null);
        startTransition(async () => {
            const res = await lifecycleActionServer(t.name, action);
            if ('error' in res) setError(res.error);
            else if (res.ok && typeof res.ok === 'object' && 'name' in res.ok) {
                setT(res.ok as Tournament);
            }
        });
    }

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <p>
                Status: <LifecycleStatusBadge status={status} />
            </p>
            <div className="d-flex gap-2 flex-wrap">
                {!t.lockedAt && (
                    <Button variant="warning" onClick={() => dispatch('lock')} disabled={isPending}>Lock</Button>
                )}
                {t.lockedAt && !t.finalizedAt && (
                    <Button variant="success" onClick={() => dispatch('unlock')} disabled={isPending}>Unlock</Button>
                )}
                {!t.finalizedAt && (
                    <Button
                        variant="secondary"
                        onClick={() => dispatch('finalize', 'Finalize this tournament? This locks runs and closes it.')}
                        disabled={isPending}
                    >
                        Finalize
                    </Button>
                )}
                <Button variant="dark" onClick={() => dispatch('archive')} disabled={isPending}>
                    {t.hide ? 'Unarchive' : 'Archive'}
                </Button>
                <Button variant="outline-primary" onClick={() => dispatch('recalculate')} disabled={isPending}>
                    Recalculate
                </Button>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Wire into manage-panel.tsx**

Replace `<Tab.Pane eventKey="lifecycle">Lifecycle (TODO Task 14)</Tab.Pane>` with:

```tsx
<Tab.Pane eventKey="lifecycle">
    <LifecyclePanel tournament={tournament} />
</Tab.Pane>
```

Add `import { LifecyclePanel } from './lifecycle-panel';`.

- [ ] **Step 5: Show locked banner on the public tournament page**

In `src/components/tournament/tournament-info.tsx`, near the top of the rendered output, add:

```tsx
{tournament.lockedAt && !tournament.finalizedAt && (
    <div className="alert alert-warning">
        This tournament is locked — new runs will not be matched.
    </div>
)}
{tournament.finalizedAt && (
    <div className="alert alert-secondary">This tournament is finalized.</div>
)}
```

- [ ] **Step 6: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/\(new-layout\)/tournaments src/components/tournament/tournament-info.tsx
git commit -m "feat(tournaments): lifecycle panel and locked/finalized banners"
```

---

## Task 15: Surface "Create tournament" entry point

**Files:**
- Modify: `app/(new-layout)/tournaments/page.tsx` (or `all-tournaments.tsx`, whichever renders the page header — pick the one that already has access to the session)

- [ ] **Step 1: Add gated link in the tournaments list page**

Determine the right entry by reading `app/(new-layout)/tournaments/page.tsx`. Where the header `<h1>` is rendered, add (server-side):

```tsx
import { getSession } from '~src/actions/session.action';
import { canCreateTournament } from '~src/lib/tournament-permissions';
// ...
const session = await getSession();
// ...
{canCreateTournament(session.user) && (
    <a href="/tournaments/create" className="btn btn-primary">
        Create tournament
    </a>
)}
```

- [ ] **Step 2: Verify in dev**

Run: `npm run dev` and confirm the button only appears when logged in as `admin` or `tournament-creator`.

- [ ] **Step 3: Commit**

```bash
git add app/\(new-layout\)/tournaments/page.tsx
git commit -m "feat(tournaments): expose create-tournament entry point"
```

---

## Task 16: Migrate API route handlers (if still used by client code)

**Files:**
- Modify: `app/api/tournaments/route.ts`
- Modify: `app/api/tournaments/[tournament]/route.ts`

- [ ] **Step 1: Inspect both files**

Read each file. If they proxy to `/tournaments/...`, change them to `/v1/tournaments/...`. If they aren't called by client code anymore, delete them.

- [ ] **Step 2: Repoint or delete**

If keeping: replace `/tournaments` with `/v1/tournaments` in the upstream URL. Preserve auth header forwarding.

If deleting: also remove any client-side fetch callers that hit these routes (search for `/api/tournaments` first).

Run: `grep -rn "/api/tournaments" app src --include="*.ts" --include="*.tsx"` to confirm zero references after deletion.

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/tournaments
git commit -m "refactor(tournaments): point internal API routes at /v1"
```

---

## Task 17: Final cleanup and validation

**Files:**
- Validate the whole tree

- [ ] **Step 1: Hunt remaining legacy paths**

Run: `grep -rn "/tournaments/" src app --include="*.ts" --include="*.tsx" | grep -v "/v1/tournaments" | grep -v "node_modules" | grep -E "DATA_URL|api-client"`
Expected: zero hits in the codebase that build a backend URL with `/tournaments/` (the public app path `/tournaments/...` is fine — only backend URLs matter).

If any backend URL still uses the legacy path, switch it to `/v1/tournaments/...` via the new client.

- [ ] **Step 2: Hunt remaining `tournament.moderators` reads**

Run: `grep -rn "\.moderators" src app --include="*.ts" --include="*.tsx" | grep -i tournament`
Expected: zero hits.

- [ ] **Step 3: Clear build cache and rebuild**

```bash
rm -rf .next
npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Smoke test the manage flow in dev**

```bash
npm run dev
```
Walk: create tournament → edit settings → add staff with `manage_runs` only → confirm staff user sees runs forms but not settings → ban a participant → lock → unlock → archive → delete (as global admin).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(tournaments): cleanup pass post-v1 migration"
```

---

## Self-review notes

- Spec coverage: list/read (Task 6), create (Task 8), update (Task 10), delete (Task 10), staff (Task 11), admins (Task 12), participants (Task 13), runs add/exclude/end-time (Task 7), lifecycle (Task 14), stats (Task 6), permissions (Tasks 4 + 5), error UX (per-panel `ApiError` surfacing throughout), banner for locked/finalized (Task 14 step 5), `tournament-creator` role (Task 4), legacy migration (Tasks 6, 7, 16, 17).
- Type consistency: `Tournament` is single-source-of-truth (Task 1), re-exported from `tournament-info.tsx` (Task 6 step 2) so existing imports keep compiling. `Capability` set is fixed (5 strings). `LifecycleAction` is reused from the API client.
- Caching: All cached reads use `cacheTag('tournaments')`; all mutations call `revalidateTag('tournaments', 'minutes')` per the project's Next.js 16 convention.
- Out of scope: audit log UI (no read endpoint), legacy `/tournaments` route deletion (backend concern), tournament icon/logo upload (use `logoUrl` text input for now).
