# Hide Streaks Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users hide their streak card from the frontpage and public profiles via an inline toggle.

**Architecture:** New `getUserPreferences()` cached fetch + `toggleStreakVisibility` server action. The `StreakCard` component gains `hideStreaks` and `isOwner` props to conditionally render a hide button or a "Streaks hidden" placeholder. The server component fetches preferences alongside dashboards and passes them down.

**Tech Stack:** Next.js server actions, `'use cache'`, `apiFetch`, lucide-react icons

---

### Task 1: Add UserPreferences type

**Files:**
- Modify: `types/session.types.ts:17`

**Step 1: Add the interface and update the `preferences` field**

In `types/session.types.ts`, add a `UserPreferences` interface and update the `User.preferences` field:

```typescript
export interface UserPreferences {
    hideStreaks?: boolean;
}
```

Change line 17 from `preferences: unknown;` to `preferences: UserPreferences;`.

**Step 2: Commit**

```bash
git add types/session.types.ts
git commit -m "feat: add UserPreferences type with hideStreaks"
```

---

### Task 2: Create getUserPreferences fetch function

**Files:**
- Create: `src/lib/user-preferences.ts`

**Step 1: Write the cached fetch function**

Reference `src/lib/api-client.ts` for the `apiFetch` pattern. Reference caching docs in CLAUDE.md — use `'use cache'` with `cacheLife('minutes')` and `cacheTag`.

```typescript
import { cacheLife, cacheTag } from 'next/cache';
import type { UserPreferences } from '../../types/session.types';
import { apiFetch } from './api-client';

export async function getUserPreferences(
    username: string,
): Promise<UserPreferences> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-preferences-${username}`);

    try {
        const result = await apiFetch<UserPreferences>(
            `/users/${encodeURIComponent(username)}/preferences`,
        );
        return result ?? {};
    } catch {
        return {};
    }
}
```

**Step 2: Commit**

```bash
git add src/lib/user-preferences.ts
git commit -m "feat: add getUserPreferences cached fetch"
```

---

### Task 3: Create toggleStreakVisibility server action

**Files:**
- Create: `src/actions/user-preferences.action.ts`

**Step 1: Write the server action**

Reference `src/actions/session.action.ts` for session/cookie patterns. Reference `src/lib/api-client.ts` for `apiFetch`. The action needs to:
1. Get the session (for sessionId and username)
2. PUT to `/users/:user/preferences` with `{ hideStreaks: boolean }`
3. Revalidate the cached preferences tag

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from './session.action';
import { apiFetch } from '~src/lib/api-client';

export async function toggleStreakVisibility(hideStreaks: boolean) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error('Not authenticated');
    }

    await apiFetch(`/users/${encodeURIComponent(session.user)}/preferences`, {
        method: 'PUT',
        sessionId: session.id,
        body: JSON.stringify({ hideStreaks }),
    });

    revalidateTag(`user-preferences-${session.user}`, 'minutes');
}
```

**Step 2: Commit**

```bash
git add src/actions/user-preferences.action.ts
git commit -m "feat: add toggleStreakVisibility server action"
```

---

### Task 4: Update StreakCard to support hide/show toggle

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-client.tsx`
- Modify: `app/(new-layout)/frontpage/sections/your-stats.module.scss`

**Step 1: Update StreakCard props and add hide button + placeholder**

In `your-stats-client.tsx`:

1. Add imports at top:
```typescript
import { EyeOff } from 'lucide-react';
import { toggleStreakVisibility } from '~src/actions/user-preferences.action';
```

2. Update `StreakCard` signature to accept new props:
```typescript
function StreakCard({
    streak,
    streakMilestone,
    hideStreaks = false,
    isOwner = false,
}: {
    streak: DashboardStreak | null;
    streakMilestone: DashboardStreakMilestone | null;
    hideStreaks?: boolean;
    isOwner?: boolean;
}) {
```

3. Add hide/show logic at the start of the component body, after the existing early return for `current === 0`. When `hideStreaks` is true and the user is the owner, show a placeholder. When `hideStreaks` is true and not the owner, return null:

```typescript
    if (hideStreaks) {
        if (!isOwner) return null;

        return (
            <div className={styles.streakHiddenPlaceholder}>
                <span className={styles.streakHiddenText}>Streaks hidden</span>
                <button
                    type="button"
                    className={styles.streakShowButton}
                    onClick={() => toggleStreakVisibility(false)}
                >
                    Show
                </button>
            </div>
        );
    }
```

4. Add the hide button inside the streak card title row. Replace the existing title div:
```tsx
{/* Title */}
<div className={styles.streakTitle}>
    Your Daily Streak
    {isOwner && (
        <button
            type="button"
            className={styles.streakHideButton}
            onClick={() => toggleStreakVisibility(true)}
            title="Hide streaks"
        >
            <EyeOff size={14} />
        </button>
    )}
</div>
```

5. Update `YourStatsClientProps` to include new fields:
```typescript
interface YourStatsClientProps {
    dashboards: Record<string, DashboardResponse | null>;
    username: string;
    picture?: string;
    hideStreaks?: boolean;
    isOwner?: boolean;
}
```

6. Destructure `hideStreaks` and `isOwner` from props in `YourStatsClient`.

7. Pass `hideStreaks` and `isOwner` to all 4 `<StreakCard>` usages (lines 626-629, 647-650, 663-666, and 710 inside `DashboardContent`). For the `DashboardContent` one, also pass the props through `DashboardContent`:

Update `DashboardContent` props interface and function signature to accept and forward `hideStreaks` and `isOwner`.

In `YourStatsClient`, pass to `DashboardContent`:
```tsx
<DashboardContent
    dashboard={dashboard}
    username={username}
    periodToggle={periodToggle}
    hideStreaks={hideStreaks}
    isOwner={isOwner}
/>
```

**Step 2: Add SCSS styles**

In `your-stats.module.scss`, add these styles (after the existing streak styles, around line 411):

```scss
.streakHideButton {
    all: unset;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease;
    color: var(--color-text-tertiary, rgba(255, 255, 255, 0.4));
    display: flex;
    align-items: center;
    padding: 2px;
    border-radius: 4px;

    &:hover {
        color: var(--color-text-secondary, rgba(255, 255, 255, 0.6));
    }
}

.streakCard:hover .streakHideButton {
    opacity: 1;
}

.streakHiddenPlaceholder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed rgba(255, 255, 255, 0.08);
}

.streakHiddenText {
    font-size: 0.8rem;
    color: var(--color-text-tertiary, rgba(255, 255, 255, 0.35));
}

.streakShowButton {
    all: unset;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--color-link, #60a5fa);
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
        color: var(--color-link-hover, #93bbfd);
    }
}
```

Also update `.streakTitle` (around line 202) to add `display: flex` and spacing so the hide button sits inline:

```scss
.streakTitle {
    // ... existing styles ...
    display: flex;
    align-items: center;
    justify-content: space-between;
}
```

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats-client.tsx app/(new-layout)/frontpage/sections/your-stats.module.scss
git commit -m "feat: add hide/show toggle to StreakCard"
```

---

### Task 5: Wire up preferences in the server component

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-section.tsx`

**Step 1: Fetch preferences and pass down**

1. Add import:
```typescript
import { getUserPreferences } from '~src/lib/user-preferences';
```

2. Add `getUserPreferences(user)` to the existing `Promise.all` on line 56-62:
```typescript
const [dashboard7d, dashboard30d, dashboardYear, weekSummary, preferences] =
    await Promise.all([
        getUserDashboard(user, '7d'),
        getUserDashboard(user, '30d'),
        getUserDashboard(user, 'year'),
        getUserSummary(user, 'week', 0),
        getUserPreferences(user),
    ]);
```

3. Pass `hideStreaks` and `isOwner` to `YourStatsClient`:
```tsx
<YourStatsClient
    dashboards={dashboards}
    username={user}
    picture={session.picture}
    hideStreaks={preferences.hideStreaks ?? false}
    isOwner={!impersonating}
/>
```

**Step 2: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats-section.tsx
git commit -m "feat: fetch preferences and pass hideStreaks to YourStatsClient"
```

---

### Task 6: Verify build

**Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

**Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors.

**Step 3: Run build**

```bash
rm -rf .next && npm run build
```

Expected: Successful build.

**Step 4: Fix any issues found, then commit fixes if needed.**
