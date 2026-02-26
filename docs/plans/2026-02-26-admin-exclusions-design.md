# Admin Exclusions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin page at `/admin/exclusions` for managing exclusion rules (user, game, category, run) via the backend API.

**Architecture:** Server component page with auth gate, client component panel for CRUD interactions, server actions for mutations, data fetching lib function for API calls. Follows existing `/admin/roles` patterns exactly.

**Tech Stack:** Next.js App Router, React, TypeScript, react-bootstrap, CASL RBAC

---

### Task 1: Types and data fetching

**Files:**
- Create: `types/exclusions.types.ts`
- Create: `src/lib/exclusions.ts`

**Step 1: Create exclusion types**

```typescript
// types/exclusions.types.ts
export type ExclusionType = 'user' | 'game' | 'category' | 'run';

export interface ExclusionRule {
    id: number;
    type: ExclusionType;
    targetId: number;
    reason: string | null;
    excludedBy: number;
    createdAt: string;
}
```

**Step 2: Create data fetching function**

```typescript
// src/lib/exclusions.ts
import { apiFetch } from '~src/lib/api-client';
import { ExclusionRule, ExclusionType } from '../../types/exclusions.types';

export async function getExclusions(
    sessionId: string,
    type?: ExclusionType,
): Promise<ExclusionRule[]> {
    const query = type ? `?type=${type}` : '';
    return apiFetch<ExclusionRule[]>(`/admin/exclusions${query}`, { sessionId });
}
```

**Step 3: Commit**

```bash
git add types/exclusions.types.ts src/lib/exclusions.ts
git commit -m "feat: add exclusion types and data fetching"
```

---

### Task 2: Server actions

**Files:**
- Create: `app/(old-layout)/admin/exclusions/actions/create-exclusion.action.ts`
- Create: `app/(old-layout)/admin/exclusions/actions/delete-exclusion.action.ts`

**Step 1: Create the create-exclusion server action**

```typescript
// app/(old-layout)/admin/exclusions/actions/create-exclusion.action.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { apiFetch } from '~src/lib/api-client';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ExclusionType } from '../../../../../types/exclusions.types';

export async function createExclusionAction(
    type: ExclusionType,
    targetId: number,
    reason?: string,
) {
    const user = await getSession();
    confirmPermission(user, 'edit', 'user');

    await apiFetch('/admin/exclusions', {
        sessionId: user.id,
        method: 'POST',
        body: JSON.stringify({ type, targetId, reason }),
    });

    revalidatePath('/admin/exclusions');
}
```

**Step 2: Create the delete-exclusion server action**

```typescript
// app/(old-layout)/admin/exclusions/actions/delete-exclusion.action.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { apiFetch } from '~src/lib/api-client';
import { confirmPermission } from '~src/rbac/confirm-permission';

export async function deleteExclusionAction(ruleId: number) {
    const user = await getSession();
    confirmPermission(user, 'edit', 'user');

    await apiFetch(`/admin/exclusions/${ruleId}`, {
        sessionId: user.id,
        method: 'DELETE',
    });

    revalidatePath('/admin/exclusions');
}
```

**Step 3: Commit**

```bash
git add app/\(old-layout\)/admin/exclusions/actions/
git commit -m "feat: add create and delete exclusion server actions"
```

---

### Task 3: Client component — ExclusionsPanel

**Files:**
- Create: `app/(old-layout)/admin/exclusions/exclusions-panel.tsx`

**Step 1: Build the client component**

This component receives the list of exclusion rules from the server and renders:
- A create form (type dropdown, target ID number input, optional reason, submit button)
- Tab filter buttons (All, User, Game, Category, Run) using client-side filtering
- A table of current exclusion rules with delete buttons

Reference patterns from `app/(old-layout)/admin/roles/users-table.tsx` for styling:
- Card with `shadow-sm border-0`
- Card header with `bg-primary text-white`
- `table table-hover mb-0` with `table-light` thead
- Bootstrap form controls

Use `useTransition` for pending states on create/delete. Use `confirm()` for delete confirmation. Use `Badge` components with color per type (user=danger, game=success, category=warning, run=info).

**Step 2: Commit**

```bash
git add app/\(old-layout\)/admin/exclusions/exclusions-panel.tsx
git commit -m "feat: add ExclusionsPanel client component"
```

---

### Task 4: Server component page

**Files:**
- Create: `app/(old-layout)/admin/exclusions/page.tsx`

**Step 1: Create the page**

```typescript
// app/(old-layout)/admin/exclusions/page.tsx
'use server';

import { getSession } from '~src/actions/session.action';
import { getExclusions } from '~src/lib/exclusions';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ExclusionsPanel } from './exclusions-panel';

export default async function ExclusionsPage() {
    const user = await getSession();
    confirmPermission(user, 'edit', 'user');

    const exclusions = await getExclusions(user.id);

    return <ExclusionsPanel exclusions={exclusions} />;
}
```

**Step 2: Commit**

```bash
git add app/\(old-layout\)/admin/exclusions/page.tsx
git commit -m "feat: add exclusions admin page"
```

---

### Task 5: Add navigation link in Topbar

**Files:**
- Modify: `src/components/Topbar/Topbar.tsx`

**Step 1: Add Exclusions link**

Inside the `<Can I="moderate" a="roles">` block in the Topbar (line 162-169), add a new `NavDropdown.Item` for exclusions. Since exclusions require `edit` on `user` (admin-only), and the existing admin links use `moderate` on `roles`, wrap the exclusions link in its own `<Can I="edit" a="user">` block:

```tsx
<Can I="edit" a="user">
    <NavDropdown.Item href="/admin/exclusions">
        Exclusions
    </NavDropdown.Item>
</Can>
```

Add this after the existing `Move User` link (line 167) but inside the dropdown.

**Step 2: Commit**

```bash
git add src/components/Topbar/Topbar.tsx
git commit -m "feat: add exclusions link to admin nav"
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

**Step 3: Fix any issues found, commit if needed**
