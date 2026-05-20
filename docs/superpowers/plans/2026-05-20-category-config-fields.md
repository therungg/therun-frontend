# Category Config Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manage-page editing for five category-config fields (`rules`, `sortAscending`, `showMilliseconds`, `requireVideo`, `requireVideoTopN`) and render `rules` as a collapsible Markdown panel on the public game page.

**Architecture:** One new server action (`update-category-settings.action.ts`) that PUTs the changed subset to `/v1/games/:gameId/categories/:catId`, mirroring the existing `update-timing-settings.action.ts` pattern. Two new manage-tab sections (`RulesSection`, `CategorySettingsSection`). One new public component (`RulesPanel`) using `react-markdown` + `remark-gfm`. `ResolvedCategory` gains the four new fields; `games-v1.ts` reads them from the API row.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, react-bootstrap utility classes, `react-toastify`, CASL via `confirmPermission`. New runtime deps: `react-markdown`, `remark-gfm`.

**Project conventions:**
- No test framework. Per-task verification = `npm run typecheck` + `npm run lint`. Final task adds a `npm run build` + manual smoke test.
- Per `CLAUDE.md`: **do not commit unless the user explicitly asks.** Commit commands appear in steps as a record of intended grouping; confirm before running.
- Branch: stack on the current branch (`feat/leaderboard-run-management`) per the user's branches-not-worktrees preference.

---

## File Structure

**Create:**

- `app/(new-layout)/games-v2/[game]/manage/category-tab/rules-section.tsx` — Markdown editor card (Edit/Preview tabs + Save/Reset).
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-settings-section.tsx` — Card for sortAscending + showMilliseconds + requireVideo/requireVideoTopN.
- `app/(new-layout)/games-v2/[game]/manage/category-tab/actions/update-category-settings.action.ts` — Single server action.
- `app/(new-layout)/games-v2/[game]/rules/rules-panel.tsx` — Public collapsible Markdown panel.

**Modify:**

- `types/leaderboards.types.ts` — Extend `ResolvedCategory` with four new optional fields.
- `src/lib/games-v1.ts` — Extend `CategoriesEndpointRow` and the `.map()` to read the new fields.
- `src/lib/category-mgmt.ts` — Extend `UpdateCategoryBody` with the four new fields.
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-tab.tsx` — Mount `RulesSection` + `CategorySettingsSection`.
- `app/(new-layout)/games-v2/[game]/game-page.tsx` — Mount `RulesPanel` above the leaderboard table.
- `package.json` / `package-lock.json` — Add `react-markdown` and `remark-gfm`.

---

## Task 1: Add Markdown dependencies

**Files:**
- Modify: `package.json` / `package-lock.json`

- [ ] **Step 1: Install runtime deps**

Run: `npm install react-markdown remark-gfm`

Expected: `package.json` adds both under `dependencies`. `package-lock.json` updates.

- [ ] **Step 2: Sanity check the install**

Run: `npm run typecheck`
Expected: no errors. (Nothing imports them yet; this just confirms the install doesn't break the project's existing types.)

- [ ] **Step 3: Commit (ask user first)**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add react-markdown and remark-gfm"
```

---

## Task 2: Extend `ResolvedCategory` type

**Files:**
- Modify: `types/leaderboards.types.ts`

- [ ] **Step 1: Add the four fields to the interface**

In `types/leaderboards.types.ts`, locate `ResolvedCategory` (around line 16) and extend it:

```typescript
export interface ResolvedCategory {
    id: number;
    name: string;
    display: string;
    primaryTiming: 'rt' | 'gt';
    sortAscending?: boolean;
    isMain?: boolean;
    active?: boolean;
    groupId?: number | null;
    groupName?: string | null;
    totalRunTime?: number;
    totalAttemptCount?: number;
    totalFinishedAttemptCount?: number;
    uniqueRunners?: number;
    rules?: string | null;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
}
```

`sortAscending?` is already present; do not duplicate.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: no errors. The new optional fields don't break any consumer.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add types/leaderboards.types.ts
git commit -m "feat(types): add rules and per-category config fields to ResolvedCategory"
```

---

## Task 3: Read the new fields in `games-v1.ts`

**Files:**
- Modify: `src/lib/games-v1.ts`

- [ ] **Step 1: Extend `CategoriesEndpointRow`**

In `src/lib/games-v1.ts`, locate the `CategoriesEndpointRow` interface (around line 25) and add four fields:

```typescript
interface CategoriesEndpointRow {
    game_id: number;
    category_id: number;
    game_display: string;
    category_display: string;
    game_image?: string | null;
    total_run_time: number;
    total_attempt_count: number;
    total_finished_attempt_count: number;
    unique_runners: number;
    primary_timing?: string;
    hide_real_time?: boolean;
    hide_game_time?: boolean;
    sort_ascending?: boolean;
    default_verified?: boolean;
    rules?: string | null;
    show_milliseconds?: boolean;
    require_video?: boolean;
    require_video_top_n?: number | null;
}
```

- [ ] **Step 2: Map the new fields onto `ResolvedCategory` rows**

Locate the `.map(...)` call inside `resolveCategory` (around line 175). Extend the returned object:

```typescript
const categories: ResolvedCategory[] = rows.map((r) => {
    const flags = flagsById.get(r.category_id);
    const grp = groupByCatId.get(r.category_id) ?? null;
    return {
        id: r.category_id,
        name: normalizeSlug(r.category_display),
        display: r.category_display,
        primaryTiming:
            r.primary_timing === 'gt' || r.primary_timing === 'gametime'
                ? ('gt' as const)
                : ('rt' as const),
        sortAscending: r.sort_ascending ?? true,
        isMain: flags?.isMain ?? false,
        active: flags?.active ?? true,
        groupId: grp?.id ?? null,
        groupName: grp?.name ?? null,
        totalRunTime: r.total_run_time,
        totalAttemptCount: r.total_attempt_count,
        totalFinishedAttemptCount: r.total_finished_attempt_count,
        uniqueRunners: r.unique_runners,
        rules: r.rules ?? null,
        showMilliseconds: r.show_milliseconds ?? true,
        requireVideo: r.require_video ?? false,
        requireVideoTopN: r.require_video_top_n ?? null,
    };
});
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` and `npm run lint`
Expected: both pass.

- [ ] **Step 4: Commit (ask user first)**

```bash
git add src/lib/games-v1.ts
git commit -m "feat(games): map rules and per-category config fields from API row"
```

---

## Task 4: Extend `UpdateCategoryBody`

**Files:**
- Modify: `src/lib/category-mgmt.ts`

- [ ] **Step 1: Add the four fields to the body interface**

In `src/lib/category-mgmt.ts`, locate `UpdateCategoryBody` (around line 144) and extend:

```typescript
export interface UpdateCategoryBody {
    primaryTiming?: PrimaryTiming;
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    isMain?: boolean;
    active?: boolean;
    groupId?: number | null;
    rules?: string | null;
    sortAscending?: boolean;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
}
```

`updateCategory()` itself does not need changes — it forwards the body as-is to `PUT /v1/games/:gameId/categories/:categoryId`.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add src/lib/category-mgmt.ts
git commit -m "feat(category-mgmt): allow PUT body to carry rules and per-category config fields"
```

---

## Task 5: Add `update-category-settings.action.ts`

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/category-tab/actions/update-category-settings.action.ts`

- [ ] **Step 1: Create the action file**

Mirror the existing `update-timing-settings.action.ts` pattern. Full file content:

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type UpdateCategoryBody,
    updateCategory,
} from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    rules?: string | null;
    sortAscending?: boolean;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
}

export async function updateCategorySettingsAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    if (
        input.requireVideo === true &&
        input.requireVideoTopN !== undefined &&
        input.requireVideoTopN !== null &&
        (!Number.isInteger(input.requireVideoTopN) ||
            input.requireVideoTopN < 1)
    ) {
        return {
            error: 'Top-N value must be a positive integer.',
        };
    }

    const body: UpdateCategoryBody = {};
    if (input.rules !== undefined) body.rules = input.rules;
    if (input.sortAscending !== undefined)
        body.sortAscending = input.sortAscending;
    if (input.showMilliseconds !== undefined)
        body.showMilliseconds = input.showMilliseconds;
    if (input.requireVideo !== undefined) body.requireVideo = input.requireVideo;
    if (input.requireVideoTopN !== undefined)
        body.requireVideoTopN = input.requireVideoTopN;

    if (Object.keys(body).length === 0) {
        return { result: { updated: false } };
    }

    try {
        const result = await updateCategory(
            user.id,
            input.gameId,
            input.categoryId,
            body,
        );
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update category settings.' };
    }
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck` and `npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/category-tab/actions/update-category-settings.action.ts
git commit -m "feat(manage): add updateCategorySettings server action"
```

---

## Task 6: Add `RulesSection`

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/category-tab/rules-section.tsx`

- [ ] **Step 1: Create the component**

Full file content:

```typescript
'use client';

import { type FormEvent, useEffect, useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import remarkGfm from 'remark-gfm';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { updateCategorySettingsAction } from './actions/update-category-settings.action';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
}

type Tab = 'edit' | 'preview';

export function RulesSection({ gameSlug, gameId, category }: Props) {
    const initial = category?.rules ?? '';
    const [text, setText] = useState(initial);
    const [original, setOriginal] = useState(initial);
    const [tab, setTab] = useState<Tab>('edit');
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, startSave] = useTransition();

    useEffect(() => {
        const next = category?.rules ?? '';
        setText(next);
        setOriginal(next);
        setTab('edit');
        setFormError(null);
    }, [category?.id, category?.rules]);

    if (!category) return null;

    const dirty = text !== original;
    const busy = isSaving;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

        startSave(async () => {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                rules: text.length > 0 ? text : null,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success('Rules saved');
            setOriginal(text);
        });
    };

    return (
        <section className="border rounded p-3 mb-4">
            <h2 className="h5 mb-1">Rules</h2>
            <p className="text-muted small mb-3">
                Markdown is supported. Shown to runners on the public leaderboard
                page above the table.
            </p>

            <ul className="nav nav-tabs mb-2" role="tablist">
                <li className="nav-item" role="presentation">
                    <button
                        type="button"
                        className={`nav-link${tab === 'edit' ? ' active' : ''}`}
                        onClick={() => setTab('edit')}
                    >
                        Edit
                    </button>
                </li>
                <li className="nav-item" role="presentation">
                    <button
                        type="button"
                        className={`nav-link${tab === 'preview' ? ' active' : ''}`}
                        onClick={() => setTab('preview')}
                    >
                        Preview
                    </button>
                </li>
            </ul>

            <form onSubmit={handleSubmit}>
                {tab === 'edit' ? (
                    <textarea
                        className="form-control"
                        rows={10}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={busy}
                        placeholder="Write the category rules in Markdown..."
                    />
                ) : (
                    <div
                        className="border rounded p-3"
                        style={{ minHeight: '12rem' }}
                    >
                        {text.length > 0 ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {text}
                            </ReactMarkdown>
                        ) : (
                            <p className="text-muted small mb-0">
                                Nothing to preview yet.
                            </p>
                        )}
                    </div>
                )}

                <div className="d-flex gap-2 mt-3">
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={busy || !dirty}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                            setText(original);
                            setFormError(null);
                        }}
                        disabled={busy || !dirty}
                    >
                        Reset
                    </button>
                </div>

                {formError && (
                    <div className="alert alert-danger mt-2 mb-0 py-2">
                        {formError}
                    </div>
                )}
            </form>
        </section>
    );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck` and `npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/category-tab/rules-section.tsx
git commit -m "feat(manage): add RulesSection markdown editor for category rules"
```

---

## Task 7: Add `CategorySettingsSection`

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/category-tab/category-settings-section.tsx`

- [ ] **Step 1: Create the component**

Full file content:

```typescript
'use client';

import { type FormEvent, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { updateCategorySettingsAction } from './actions/update-category-settings.action';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
}

type VideoPolicy = 'none' | 'top-n' | 'all';

interface State {
    sortAscending: boolean;
    showMilliseconds: boolean;
    videoPolicy: VideoPolicy;
    topN: string;
}

function readState(category: ResolvedCategory | null): State {
    if (!category) {
        return {
            sortAscending: true,
            showMilliseconds: true,
            videoPolicy: 'none',
            topN: '',
        };
    }
    const requireVideo = category.requireVideo ?? false;
    const topNValue = category.requireVideoTopN;
    let videoPolicy: VideoPolicy;
    if (!requireVideo) videoPolicy = 'none';
    else if (topNValue != null) videoPolicy = 'top-n';
    else videoPolicy = 'all';
    return {
        sortAscending: category.sortAscending ?? true,
        showMilliseconds: category.showMilliseconds ?? true,
        videoPolicy,
        topN: topNValue != null ? String(topNValue) : '',
    };
}

export function CategorySettingsSection({ gameSlug, gameId, category }: Props) {
    const [state, setState] = useState<State>(() => readState(category));
    const [original, setOriginal] = useState<State>(() => readState(category));
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, startSave] = useTransition();

    useEffect(() => {
        const next = readState(category);
        setState(next);
        setOriginal(next);
        setFormError(null);
    }, [
        category?.id,
        category?.sortAscending,
        category?.showMilliseconds,
        category?.requireVideo,
        category?.requireVideoTopN,
    ]);

    if (!category) return null;

    const dirty =
        state.sortAscending !== original.sortAscending ||
        state.showMilliseconds !== original.showMilliseconds ||
        state.videoPolicy !== original.videoPolicy ||
        (state.videoPolicy === 'top-n' && state.topN !== original.topN);
    const busy = isSaving;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

        let requireVideo: boolean;
        let requireVideoTopN: number | null;
        if (state.videoPolicy === 'none') {
            requireVideo = false;
            requireVideoTopN = null;
        } else if (state.videoPolicy === 'all') {
            requireVideo = true;
            requireVideoTopN = null;
        } else {
            const parsed = Number.parseInt(state.topN, 10);
            if (!Number.isInteger(parsed) || parsed < 1) {
                setFormError(
                    'Enter a positive integer for "Require video for top N".',
                );
                return;
            }
            requireVideo = true;
            requireVideoTopN = parsed;
        }

        startSave(async () => {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                sortAscending:
                    state.sortAscending !== original.sortAscending
                        ? state.sortAscending
                        : undefined,
                showMilliseconds:
                    state.showMilliseconds !== original.showMilliseconds
                        ? state.showMilliseconds
                        : undefined,
                requireVideo:
                    state.videoPolicy !== original.videoPolicy
                        ? requireVideo
                        : undefined,
                requireVideoTopN:
                    state.videoPolicy !== original.videoPolicy ||
                    state.topN !== original.topN
                        ? requireVideoTopN
                        : undefined,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success('Category settings saved');
            setOriginal(state);
        });
    };

    return (
        <section className="border rounded p-3 mb-4">
            <h2 className="h5 mb-1">Category Settings</h2>
            <p className="text-muted small mb-3">
                Ranking direction, display precision, and video requirement for{' '}
                <strong>{category.display}</strong>.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label className="form-label small">
                            Ranking direction
                        </label>
                        <div className="form-check">
                            <input
                                type="radio"
                                className="form-check-input"
                                id="sortAsc"
                                checked={state.sortAscending}
                                onChange={() =>
                                    setState((s) => ({
                                        ...s,
                                        sortAscending: true,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="sortAsc"
                                className="form-check-label small"
                            >
                                Lower time = better (default)
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                type="radio"
                                className="form-check-input"
                                id="sortDesc"
                                checked={!state.sortAscending}
                                onChange={() =>
                                    setState((s) => ({
                                        ...s,
                                        sortAscending: false,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="sortDesc"
                                className="form-check-label small"
                            >
                                Higher value = better
                            </label>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label small">Display</label>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="showMs"
                                checked={state.showMilliseconds}
                                onChange={(e) =>
                                    setState((s) => ({
                                        ...s,
                                        showMilliseconds: e.target.checked,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="showMs"
                                className="form-check-label small"
                            >
                                Show milliseconds
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mb-3">
                    <label className="form-label small">Video requirement</label>
                    <div className="form-check">
                        <input
                            type="radio"
                            className="form-check-input"
                            id="vidNone"
                            checked={state.videoPolicy === 'none'}
                            onChange={() =>
                                setState((s) => ({
                                    ...s,
                                    videoPolicy: 'none',
                                }))
                            }
                            disabled={busy}
                        />
                        <label
                            htmlFor="vidNone"
                            className="form-check-label small"
                        >
                            No video required
                        </label>
                    </div>
                    <div className="form-check d-flex align-items-center gap-2">
                        <input
                            type="radio"
                            className="form-check-input"
                            id="vidTopN"
                            checked={state.videoPolicy === 'top-n'}
                            onChange={() =>
                                setState((s) => ({
                                    ...s,
                                    videoPolicy: 'top-n',
                                }))
                            }
                            disabled={busy}
                        />
                        <label
                            htmlFor="vidTopN"
                            className="form-check-label small mb-0"
                        >
                            Require video for top
                        </label>
                        <input
                            type="number"
                            min={1}
                            step={1}
                            className="form-control form-control-sm"
                            style={{ width: '5rem' }}
                            value={state.topN}
                            onChange={(e) =>
                                setState((s) => ({
                                    ...s,
                                    topN: e.target.value,
                                }))
                            }
                            disabled={busy || state.videoPolicy !== 'top-n'}
                        />
                        <span className="form-check-label small mb-0">runs</span>
                    </div>
                    <div className="form-check">
                        <input
                            type="radio"
                            className="form-check-input"
                            id="vidAll"
                            checked={state.videoPolicy === 'all'}
                            onChange={() =>
                                setState((s) => ({ ...s, videoPolicy: 'all' }))
                            }
                            disabled={busy}
                        />
                        <label
                            htmlFor="vidAll"
                            className="form-check-label small"
                        >
                            Require video for all runs
                        </label>
                    </div>
                </div>

                <div className="d-flex gap-2">
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={busy || !dirty}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                            setState(original);
                            setFormError(null);
                        }}
                        disabled={busy || !dirty}
                    >
                        Reset
                    </button>
                </div>

                {formError && (
                    <div className="alert alert-danger mt-2 mb-0 py-2">
                        {formError}
                    </div>
                )}
            </form>
        </section>
    );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck` and `npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/category-tab/category-settings-section.tsx
git commit -m "feat(manage): add CategorySettingsSection for sort/precision/video fields"
```

---

## Task 8: Mount the new sections in `category-tab.tsx`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/category-tab/category-tab.tsx`

- [ ] **Step 1: Import and mount**

In `app/(new-layout)/games-v2/[game]/manage/category-tab/category-tab.tsx`, add imports next to the existing manage-tab imports:

```typescript
import { CategorySettingsSection } from './category-settings-section';
import { RulesSection } from './rules-section';
```

Then, inside the `{selected ? (` block, insert the two sections between `<TimingSettingsSection />` and `<VariablesSection />`:

```typescript
<TimingSettingsSection
    gameSlug={data.game.name}
    gameId={data.game.id}
    category={selected}
/>
<RulesSection
    gameSlug={data.game.name}
    gameId={data.game.id}
    category={selected}
/>
<CategorySettingsSection
    gameSlug={data.game.name}
    gameId={data.game.id}
    category={selected}
/>
<VariablesSection
    gameSlug={data.game.name}
    gameId={data.game.id}
    selectedCategory={selected}
/>
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck` and `npm run lint`
Expected: both pass.

- [ ] **Step 3: Manual smoke test (dev)**

Run: `npm run dev`
Then visit `/games-v2/<some-game>/manage`, switch to the Category tab, pick a category.
Expected: the two new cards render between Timing Settings and Variables. Save + Reset buttons enabled only when fields change. Save triggers a toast.

- [ ] **Step 4: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/category-tab/category-tab.tsx
git commit -m "feat(manage): mount RulesSection and CategorySettingsSection on category tab"
```

---

## Task 9: Add `RulesPanel` public component

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/rules/rules-panel.tsx`

- [ ] **Step 1: Create the directory and component**

Full file content:

```typescript
'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
    rules: string | null | undefined;
    categoryId: number;
}

const EXCERPT_LIMIT = 80;

function buildExcerpt(text: string): string {
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > EXCERPT_LIMIT
        ? `${oneLine.slice(0, EXCERPT_LIMIT - 1)}…`
        : oneLine;
}

export function RulesPanel({ rules, categoryId }: Props) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [categoryId]);

    if (!rules || rules.trim().length === 0) return null;

    return (
        <section className="border rounded mb-3">
            <button
                type="button"
                className="btn btn-link w-100 text-decoration-none d-flex align-items-center gap-2 px-3 py-2 text-start"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                <strong>Rules</strong>
                {!open && (
                    <span className="text-muted small flex-grow-1 text-truncate">
                        {buildExcerpt(rules)}
                    </span>
                )}
            </button>
            {open && (
                <div className="px-3 pb-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {rules}
                    </ReactMarkdown>
                </div>
            )}
        </section>
    );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck` and `npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/rules/rules-panel.tsx
git commit -m "feat(game-page): add collapsible RulesPanel public component"
```

---

## Task 10: Mount `RulesPanel` on the game page

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`

- [ ] **Step 1: Add the import**

In `app/(new-layout)/games-v2/[game]/game-page.tsx`, add the import alongside the existing component imports:

```typescript
import { RulesPanel } from './rules/rules-panel';
```

- [ ] **Step 2: Mount above the leaderboard table**

Inside the `<div className="col-lg-8">` block, place `RulesPanel` after `<FilterBar />` and before the `data.invalidCombination ? ... : ...` ternary. The relevant block becomes:

```typescript
<div className="col-lg-8">
    <FilterBar
        defs={data.variables}
        selectedSubcategoryValues={
            data.activeFilters.subcategoryValues
        }
        selectedVarFilters={data.activeFilters.varFilters}
        verified={data.activeFilters.verified}
    />
    <RulesPanel
        rules={data.selectedCategory.rules}
        categoryId={data.selectedCategory.id}
    />
    {data.invalidCombination ? (
        <InvalidCombinationNotice
            gameSlug={data.game.name}
            categorySlug={data.selectedCategory.name}
            suggestions={
                data.invalidCombination.validCombinations
            }
        />
    ) : (
        <>
            <LeaderboardTable
                leaderboard={data.leaderboard}
                sessionUsername={data.sessionUsername}
                canManage={canManageRuns}
                gameSlug={data.game.name}
                variableKeys={variableKeys}
            />
            <PaginationBar
                page={data.leaderboard.page}
                totalPages={data.leaderboard.totalPages}
            />
        </>
    )}
</div>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` and `npm run lint`
Expected: both pass.

- [ ] **Step 4: Manual smoke test (dev)**

Run: `npm run dev`
- Visit `/games-v2/<a-game>` for a category whose `rules` is null. Expected: no panel renders.
- In the manage UI, save some Markdown into the rules of one category (use `**bold**`, a list, a `[link](https://example.com)`, and `~~strikethrough~~`).
- Refresh the public page (or wait for the `game-cats:` revalidation). Expected: collapsed *Rules* panel appears above the table with the excerpt visible. Click to expand — Markdown renders correctly.
- Switch categories. Expected: panel collapses back to closed state when the new category is selected.

- [ ] **Step 5: Commit (ask user first)**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/game-page.tsx
git commit -m "feat(game-page): render RulesPanel above the leaderboard table"
```

---

## Task 11: Final verification + cleanup

**Files:**
- None (verification only)

- [ ] **Step 1: Full typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 2: Production build**

Run: `rm -rf .next && npm run build`
Expected: build succeeds without errors. Confirms the new deps work in Turbopack production builds and the new server action serializes correctly.

- [ ] **Step 3: End-to-end manual checks (dev)**

Run: `npm run dev` and confirm:

- Rules edit: write Markdown with bold, italic, list, link, code fence, table, strikethrough. Save. Reload manage page. Confirm round-trip.
- Rules public render: confirm the panel appears collapsed by default, expands on click, renders Markdown correctly.
- Rules empty: clear the rules textarea, save. Confirm the public panel disappears and the database row is null/empty after reload.
- Ranking direction: toggle `Higher value = better`. Save. Reload. Confirm the radio reflects the saved value.
- Show milliseconds: toggle off. Save. Reload. Confirm checkbox reflects the saved value.
- Video requirement, all three options:
    - Switch to "Require video for top N", enter `3`, save. Reload. Confirm radio and N reflect the saved value.
    - Switch to "Require video for all runs", save. Reload. Confirm radio and the N input is disabled.
    - Switch to "No video required", save. Reload. Confirm radio.
- Dirty-tracking: confirm Save and Reset are disabled until a change is made, and Reset returns the form to the last-saved state.
- Validation: select "top N", clear the N input, click Save. Expect an inline error and no network call.
- Existing sections (Timing / Variables / Combinations / Minimums) still load and save.
- Mobile layout: open dev tools, switch to a narrow viewport. Confirm both manage sections and the public `RulesPanel` are still usable.

- [ ] **Step 4: Confirm no leftover stubs**

Run: `grep -rn "TODO\|FIXME" app/\(new-layout\)/games-v2/\[game\]/manage/category-tab app/\(new-layout\)/games-v2/\[game\]/rules 2>/dev/null`
Expected: no matches.

- [ ] **Step 5: Final commit if anything was tweaked (ask user first)**

```bash
git status
# If anything changed during verification:
git add -A
git commit -m "chore: verification cleanup for category config fields"
```
