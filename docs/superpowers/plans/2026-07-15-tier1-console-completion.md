# Tier 1 Console Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Board health card, console Moderators + Details panes, Standards GT-minimum, and deletion of the dead legacy tab shell — per `docs/superpowers/specs/2026-07-15-tier1-console-completion-design.md`.

**Architecture:** Everything builds on already-reviewed pieces: the health module mirrors `setup/completeness.ts` (pure + vitest), both panes reuse existing server actions (no new write paths), the details form is extracted from the wizard's StepDetails, and cleanup removes an import-verified-dead subtree.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, vitest, Biome (4-space, single quotes, trailing commas, semicolons).

## Global Constraints

- Branch `tier1-console-completion` (exists, stacked on `game-setup-wizard`). Never create PRs; push only at the end.
- No NEW server actions — every write goes through: `addGameModeratorAction`/`removeGameModeratorAction` (`setup/actions/manage-moderators.action.ts`), `updateIdentifiersAction`, `updateGameMetadataAction`, and the Standards pane's existing policy actions.
- Gates per task: `npm run typecheck 2>&1 | grep -E '<task files>'` empty; `npm run lint` clean for touched files; `npx vitest run` green where tests exist. Repo has pre-existing typecheck errors in unrelated files (victory charts, userform, confirm-permission) — gate is no NEW errors.
- Biome style; unused vars `_`-prefixed; no co-author lines in commits.
- Path shorthand: `A/ = app/(new-layout)/games-v2/[game]/`.
- min_time policy values use `{ minTimeMs, minGameTimeMs }` keys.
- Console deep-links use `?pane=<NavItemId>` (`console-shell.tsx` reads it).

---

### Task 1: Board health module (TDD)

**Files:**
- Create: `src/lib/setup/health.ts`
- Test: `src/lib/setup/__tests__/health.test.ts`

**Interfaces:**
- Consumes: `BoardCompleteness`, `SetupStepState` from `~src/lib/setup/completeness`.
- Produces:
  - `HealthGrade = 'healthy' | 'needs-attention' | 'at-risk'`
  - `HealthItem { severity: 'blocker' | 'warning' | 'info'; label: string; pane: string | null }`
  - `BoardHealth { grade: HealthGrade; items: HealthItem[] }`
  - `computeBoardHealth(input: { completeness: BoardCompleteness; attentionCreatedAts: string[]; now: number }): BoardHealth`
  - `STALE_TRIAGE_MS = 7 * 24 * 60 * 60 * 1000`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/setup/__tests__/health.test.ts
import { describe, expect, it } from 'vitest';
import type { BoardCompleteness } from '../completeness';
import { computeBoardHealth, STALE_TRIAGE_MS } from '../health';

const NOW = 1_800_000_000_000;

function completeness(over: Partial<BoardCompleteness>): BoardCompleteness {
    return {
        steps: [],
        firstIncomplete: null,
        doneCount: 8,
        totalCount: 8,
        blockers: [],
        warnings: [],
        ...over,
    };
}

function isoAgo(ms: number): string {
    return new Date(NOW - ms).toISOString();
}

describe('computeBoardHealth', () => {
    it('grades a clean board healthy with a confirmation line', () => {
        const h = computeBoardHealth({
            completeness: completeness({}),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.grade).toBe('healthy');
        expect(h.items).toEqual([
            { severity: 'info', label: 'All checks pass', pane: null },
        ]);
    });

    it('grades any completeness blocker at-risk', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                blockers: ['No main category selected'],
                steps: [
                    {
                        step: 'categories',
                        status: 'blocker',
                        summary: 'No main category selected',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.grade).toBe('at-risk');
        expect(h.items[0]).toEqual({
            severity: 'blocker',
            label: 'No main category selected',
            pane: 'categories-visibility',
        });
    });

    it('maps rules/standards warnings to their panes', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                warnings: ['2 categories have no rules'],
                steps: [
                    {
                        step: 'rules',
                        status: 'warning',
                        summary: '2 categories have no rules',
                    },
                    {
                        step: 'standards',
                        status: 'warning',
                        summary: 'No video requirement or minimum time',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.grade).toBe('needs-attention');
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: '2 categories have no rules',
            pane: 'rules',
        });
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: 'No video requirement or minimum time',
            pane: 'standards',
        });
    });

    it('buckets triage items older than 7 days (info ≤2, warning >2)', () => {
        const two = computeBoardHealth({
            completeness: completeness({}),
            attentionCreatedAts: [
                isoAgo(STALE_TRIAGE_MS + 1000),
                isoAgo(STALE_TRIAGE_MS + 2000),
                isoAgo(1000), // fresh — not counted
            ],
            now: NOW,
        });
        expect(two.items).toContainEqual({
            severity: 'info',
            label: '2 triage items waiting more than a week',
            pane: 'attention',
        });
        expect(two.grade).toBe('healthy');

        const many = computeBoardHealth({
            completeness: completeness({}),
            attentionCreatedAts: [
                isoAgo(STALE_TRIAGE_MS + 1000),
                isoAgo(STALE_TRIAGE_MS + 2000),
                isoAgo(STALE_TRIAGE_MS + 3000),
            ],
            now: NOW,
        });
        expect(many.items).toContainEqual({
            severity: 'warning',
            label: '3 triage items waiting more than a week',
            pane: 'attention',
        });
        expect(many.grade).toBe('needs-attention');
    });

    it('uses singular copy for one stale item', () => {
        const h = computeBoardHealth({
            completeness: completeness({}),
            attentionCreatedAts: [isoAgo(STALE_TRIAGE_MS + 1000)],
            now: NOW,
        });
        expect(h.items).toContainEqual({
            severity: 'info',
            label: '1 triage item waiting more than a week',
            pane: 'attention',
        });
    });
});
```

- [ ] **Step 2: Run to confirm failure** — `npx vitest run src/lib/setup/__tests__/health.test.ts` (cannot resolve `../health`).

- [ ] **Step 3: Implement**

```typescript
// src/lib/setup/health.ts
// Ongoing board quality signal — the post-setup sibling of completeness.ts.
// Pure module: consumed by the console health card and, later, discovery ranking.
import type { BoardCompleteness, SetupStepId } from './completeness';

export type HealthGrade = 'healthy' | 'needs-attention' | 'at-risk';

export interface HealthItem {
    severity: 'blocker' | 'warning' | 'info';
    label: string;
    /** Console pane to deep-link (?pane=…), or null for purely informational lines. */
    pane: string | null;
}

export interface BoardHealth {
    grade: HealthGrade;
    items: HealthItem[];
}

export const STALE_TRIAGE_MS = 7 * 24 * 60 * 60 * 1000;

const STEP_PANE: Partial<Record<SetupStepId, string>> = {
    details: 'game-details',
    categories: 'categories-visibility',
    rules: 'rules',
    standards: 'standards',
    variables: 'variables',
    timing: 'timing',
};

export function computeBoardHealth(input: {
    completeness: BoardCompleteness;
    attentionCreatedAts: string[];
    now: number;
}): BoardHealth {
    const items: HealthItem[] = [];

    for (const step of input.completeness.steps) {
        if (step.status === 'blocker') {
            items.push({
                severity: 'blocker',
                label: step.summary,
                pane: STEP_PANE[step.step] ?? null,
            });
        } else if (step.status === 'warning') {
            items.push({
                severity: 'warning',
                label: step.summary,
                pane: STEP_PANE[step.step] ?? null,
            });
        }
    }

    const stale = input.attentionCreatedAts.filter((iso) => {
        const t = new Date(iso).getTime();
        return Number.isFinite(t) && input.now - t > STALE_TRIAGE_MS;
    }).length;
    if (stale > 0) {
        items.push({
            severity: stale > 2 ? 'warning' : 'info',
            label: `${stale} triage item${stale === 1 ? '' : 's'} waiting more than a week`,
            pane: 'attention',
        });
    }

    const grade: HealthGrade = items.some((i) => i.severity === 'blocker')
        ? 'at-risk'
        : items.some((i) => i.severity === 'warning')
          ? 'needs-attention'
          : 'healthy';

    if (items.length === 0) {
        items.push({ severity: 'info', label: 'All checks pass', pane: null });
    }

    return { grade, items };
}
```

- [ ] **Step 4: Run to confirm 5/5 pass**, then full setup suite: `npx vitest run src/lib/setup` (26/26 including prior tests).

- [ ] **Step 5: Typecheck + lint + commit**

```bash
npm run typecheck 2>&1 | grep 'src/lib/setup' ; npm run lint 2>&1 | grep 'src/lib/setup'
git add src/lib/setup/health.ts src/lib/setup/__tests__/health.test.ts
git commit -m "feat(console): board health module"
```

---

### Task 2: BoardHealthCard in the console

**Files:**
- Create: `A/manage/console/board-health-card.tsx`
- Modify: `A/manage/page.tsx` (compute health, thread prop)
- Modify: `A/manage/console/console-shell.tsx` (slot logic: checklist when incomplete, health when configured)

**Interfaces:**
- Consumes: `computeBoardHealth`, `BoardHealth` (Task 1); the page's existing `attentionItems` (each has `createdAt: string`) and `setupCompleteness`.
- Produces: `BoardHealthCard({ gameSlug, health }: { gameSlug: string; health: BoardHealth })`; `ConsoleShell` gains optional `boardHealth?: BoardHealth | null`.

- [ ] **Step 1: Write the card**

```tsx
// A/manage/console/board-health-card.tsx
import Link from '~src/components/link';
import type { BoardHealth } from '~src/lib/setup/health';

const GRADE_LABEL = {
    healthy: 'Healthy',
    'needs-attention': 'Needs attention',
    'at-risk': 'At risk',
} as const;

const GRADE_CLASS = {
    healthy: 'bg-success',
    'needs-attention': 'bg-warning text-dark',
    'at-risk': 'bg-danger',
} as const;

interface Props {
    gameSlug: string;
    health: BoardHealth;
}

export function BoardHealthCard({ gameSlug, health }: Props) {
    return (
        <div className="card mb-3">
            <div className="card-body d-flex align-items-start gap-3 flex-wrap">
                <span className={`badge ${GRADE_CLASS[health.grade]}`}>
                    Board health: {GRADE_LABEL[health.grade]}
                </span>
                <ul className="list-unstyled mb-0 small">
                    {health.items.map((item) => (
                        <li key={item.label}>
                            {item.severity === 'blocker'
                                ? '✕ '
                                : item.severity === 'warning'
                                  ? '! '
                                  : '· '}
                            {item.pane ? (
                                <Link
                                    href={`/games-v2/${gameSlug}/manage?pane=${item.pane}`}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                item.label
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Compute in manage/page.tsx** — where `setupCompleteness` is computed (inside the `canConfigure` + metadata gate), add:

```typescript
import { computeBoardHealth } from '~src/lib/setup/health';
// after setupCompleteness assignment, same gate:
boardHealth = computeBoardHealth({
    completeness: setupCompleteness,
    attentionCreatedAts: attentionItems.map((a) => a.createdAt),
    now: Date.now(),
});
```

(`let boardHealth: BoardHealth | null = null;` alongside the existing `setupCompleteness` declaration; bind to the page's actual local names.) Pass `boardHealth={boardHealth}` to `<ConsoleShell>`.

- [ ] **Step 3: Slot logic in console-shell.tsx** — replace the current unconditional checklist render with:

```tsx
{setupCompleteness && setupCompleteness.doneCount < setupCompleteness.totalCount ? (
    <SetupChecklistCard
        gameSlug={game.name}
        completeness={setupCompleteness}
    />
) : boardHealth ? (
    <BoardHealthCard gameSlug={game.name} health={boardHealth} />
) : null}
```

(Match the shell's actual game-slug binding; add the prop to its interface.) Note `SetupChecklistCard` already self-hides when complete — the explicit `doneCount` condition here makes the handoff to the health card deterministic rather than relying on that.

- [ ] **Step 4: Gates + commit**

```bash
npm run typecheck 2>&1 | grep -E 'board-health|manage/page|console-shell'
git add "app/(new-layout)/games-v2/[game]/manage"
git commit -m "feat(console): board health card replaces checklist once setup completes"
```

---

### Task 3: Extract GameDetailsForm (refactor, no behavior change)

**Files:**
- Create: `A/setup/game-details-form.tsx`
- Modify: `A/setup/steps/step-details.tsx` (becomes a thin wrapper)

**Interfaces:**
- Produces: `GameDetailsForm({ identifiers, metadata, game, onSaved }: { identifiers: GameIdentifiers; metadata: GameMetadata; game: { id: number; name: string; image: string | null }; onSaved: () => void })` — the exact form fields, state, validation, and save sequence (updateIdentifiersAction → updateGameMetadataAction, stop-on-error, inline error) currently inside `StepDetails`, moved verbatim. The save button label: accept an optional `saveLabel?: string` prop (default `'Save & continue'`) so the console pane can say `'Save details'`.
- `StepDetails` keeps its heading + intro copy and renders `<GameDetailsForm identifiers={data.identifiers} metadata={data.metadata} game={{ id: data.game.id, name: data.game.name, image: data.game.image }} onSaved={onAdvance} />`.

- [ ] **Step 1: Move the form.** Read `step-details.tsx`; move everything below the heading/copy into the new component (imports move with it; the actions' relative import depth changes — from `A/setup/` it is `./actions/update-game-metadata.action` and `../manage/identifiers/actions/update-identifiers.action`). No logic edits beyond the `saveLabel` prop.

- [ ] **Step 2: Verify no behavior change** — `npm run typecheck 2>&1 | grep -E 'step-details|game-details-form'` empty; `npx vitest run` still green.

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "refactor(setup): extract GameDetailsForm from StepDetails"
```

---

### Task 4: Details & metadata console pane

**Files:**
- Create: `A/manage/console/game-details-pane.tsx`
- Modify: `A/manage/console/nav-model.ts` (un-reserve `game-details`)
- Modify: `A/manage/page.tsx` (thread `identifiers` + `metadata` + a `game` slice — already loaded)
- Modify: `A/manage/console/console-shell.tsx` + `content-router.tsx` (thread props; replace the `game-details` Placeholder case)

**Interfaces:**
- Consumes: `GameDetailsForm` (Task 3); `GameIdentifiers`, `GameMetadata` from `~src/lib/game-mgmt`.
- Produces: `GameDetailsPane({ identifiers, metadata, game }: { identifiers: GameIdentifiers; metadata: GameMetadata; game: { id: number; name: string; image: string | null } })` — client component: heading "Details & metadata", the copy "These details feed the setup wizard; showing them on the public game page is a follow-up.", `<GameDetailsForm … saveLabel="Save details" onSaved={…toast.success('Details saved') + router.refresh()} />`.

- [ ] **Step 1: Write the pane** (client; `useRouter` + `react-toastify` toast, matching sibling panes' imports).

- [ ] **Step 2: nav-model.ts** — remove `reserved: true` from the `game-details` item (visibility already follows `canConfigure` via `itemVisible`; verify and leave gating as-is).

- [ ] **Step 3: Thread data** — `manage/page.tsx` already holds `identifiers` and `metadata` (loaded for completeness; metadata may be null on load failure — pass only when both non-null, else keep the pane reserved-like by passing nothing and having content-router fall back to the Placeholder when props are absent). ConsoleShell → ContentRouter: optional `gameDetails?: { identifiers: GameIdentifiers; metadata: GameMetadata; game: {...} } | null`. In content-router's `game-details` case: render the pane when the prop is present, else keep the existing Placeholder (defensive fallback).

- [ ] **Step 4: Gates + commit**

```bash
npm run typecheck 2>&1 | grep -E 'game-details|nav-model|content-router|console-shell|manage/page'
git add "app/(new-layout)/games-v2/[game]/manage"
git commit -m "feat(console): details & metadata pane (un-stubbed)"
```

---

### Task 5: Moderators console pane

**Files:**
- Create: `A/manage/console/moderators-pane.tsx`
- Modify: `A/manage/console/nav-model.ts` (`NavFlags.canEditMods`; `moderators` item un-reserved, visible iff `canEditMods`)
- Modify: `A/manage/page.tsx` (thread `canEditMods` into flags; pass `moderators`)
- Modify: `A/manage/console/console-shell.tsx` + `content-router.tsx` (thread `moderators`; replace the `moderators` Placeholder case)

**Interfaces:**
- Consumes: `GameModerator`, `BoardModRole` types; `addGameModeratorAction`, `removeGameModeratorAction` from `../../setup/actions/manage-moderators.action` (relative from `manage/console/`: `../../setup/actions/manage-moderators.action`); `modApplications` count already threaded to the router.
- Produces: `ModeratorsPane({ gameSlug, gameId, moderators, pendingApplications }: { gameSlug: string; gameId: number; moderators: GameModerator[]; pendingApplications: number })`.

- [ ] **Step 1: Write the pane** — model directly on `step-finish.tsx`'s mod-team block (list + role badges + add row + remove with last-game-admin guard), with these console adaptations:

```tsx
// A/manage/console/moderators-pane.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import type {
    BoardModRole,
    GameModerator,
} from '../../../../../../types/board-claims.types';
import {
    addGameModeratorAction,
    removeGameModeratorAction,
} from '../../setup/actions/manage-moderators.action';

interface Props {
    gameSlug: string;
    gameId: number;
    moderators: GameModerator[];
    pendingApplications: number;
}

export function ModeratorsPane({
    gameSlug,
    gameId,
    moderators,
    pendingApplications,
}: Props) {
    const router = useRouter();
    const [mods, setMods] = useState<GameModerator[]>(moderators);
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<BoardModRole>('game-mod');
    const [isPending, startPending] = useTransition();

    const addMod = () => {
        startPending(async () => {
            const res = await addGameModeratorAction({
                gameSlug,
                gameId,
                username,
                role,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setMods((ms) => [
                ...ms,
                {
                    assignmentId: res.result.assignmentId,
                    // Local placeholder; the server list refreshes on navigation.
                    userId: -1,
                    username: res.result.username,
                    role,
                    createdAt: new Date().toISOString(),
                },
            ]);
            setUsername('');
            toast.success(`Added ${res.result.username}`);
            router.refresh();
        });
    };

    const removeMod = (m: GameModerator) => {
        const admins = mods.filter((x) => x.role === 'game-admin');
        if (m.role === 'game-admin' && admins.length <= 1) {
            toast.error('A board needs at least one board admin.');
            return;
        }
        if (!window.confirm(`Remove ${m.username} from the mod team?`)) return;
        startPending(async () => {
            const res = await removeGameModeratorAction({
                gameSlug,
                gameId,
                assignmentId: m.assignmentId,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setMods((ms) =>
                ms.filter((x) => x.assignmentId !== m.assignmentId),
            );
            router.refresh();
        });
    };

    return (
        <section>
            <h2 className="h5">Moderators</h2>
            {pendingApplications > 0 && (
                <div className="alert alert-info py-2">
                    {pendingApplications} pending application
                    {pendingApplications === 1 ? '' : 's'} —{' '}
                    <Link href={`/games-v2/${gameSlug}/manage?pane=attention`}>
                        review in Needs attention
                    </Link>
                </div>
            )}
            <ul className="list-group mb-3">
                {mods.map((m) => (
                    <li
                        key={m.assignmentId}
                        className="list-group-item d-flex align-items-center gap-2"
                    >
                        <strong>{m.username}</strong>
                        <span className="badge bg-secondary">
                            {m.role === 'game-admin'
                                ? 'board admin'
                                : 'moderator'}
                        </span>
                        <span className="text-muted small">
                            since {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger ms-auto"
                            disabled={isPending}
                            onClick={() => removeMod(m)}
                        >
                            Remove
                        </button>
                    </li>
                ))}
                {mods.length === 0 && (
                    <li className="list-group-item text-muted">
                        No moderators on record yet.
                    </li>
                )}
            </ul>
            <div className="d-flex gap-2">
                <input
                    className="form-control w-auto"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Twitch username"
                />
                <select
                    className="form-select w-auto"
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                >
                    <option value="game-mod">Moderator</option>
                    <option value="game-admin">Board admin</option>
                </select>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={isPending || !username.trim()}
                    onClick={addMod}
                >
                    Add
                </button>
            </div>
        </section>
    );
}
```

- [ ] **Step 2: nav-model.ts** — add `canEditMods: boolean` to `NavFlags`; the `moderators` item drops `reserved: true`; extend `itemVisible` so `moderators` requires `flags.canEditMods` (read the function; add a specific case like the `reassign`/`standards` ones).

- [ ] **Step 3: Thread** — `manage/page.tsx` already computes `canEditMods` and loads `moderators` — put `canEditMods` into the flags object it builds and pass `moderators={moderators}` to ConsoleShell. ContentRouter `moderators` case: render `<ModeratorsPane gameSlug={…} gameId={…} moderators={moderators ?? []} pendingApplications={modApplications?.length ?? 0} />` (gameId — check what the router already receives; thread if absent).

- [ ] **Step 4: Gates + commit**

```bash
npm run typecheck 2>&1 | grep -E 'moderators-pane|nav-model|content-router|console-shell|manage/page'
git add "app/(new-layout)/games-v2/[game]/manage"
git commit -m "feat(console): moderators pane (un-stubbed) with add/remove and applications link"
```

---

### Task 6: Standards GT minimum

**Files:**
- Modify: `A/manage/moderation/configure/standards.tsx`

**Interfaces:**
- Consumes: the pane's existing `findPolicy(policies, 'min_time', categoryId)` read and create/update policy actions; `MinTimePolicyValue { minTimeMs?, minGameTimeMs? }`.
- Produces: a second optional time input "In-game time minimum" in the min-time card. Save writes `value: { minTimeMs?, minGameTimeMs? }` — include each key only when its input is set; require at least one when the minimum is enabled. Display renders both when present.

- [ ] **Step 1: Read the pane and extend.** Read `standards.tsx` fully first (it self-manages category selection and policy state). Mirror the existing RT input's parse/validation (it uses the pane's existing time parsing — reuse identically) for a GT input. Keep the existing single-input behavior untouched when GT is empty: a save with only RT set writes `{ minTimeMs }` exactly as today.

- [ ] **Step 2: Gates + commit**

```bash
npm run typecheck 2>&1 | grep 'standards'
git add "app/(new-layout)/games-v2/[game]/manage/moderation/configure/standards.tsx"
git commit -m "feat(console): in-game-time minimum on standards (preserves GT-min capability)"
```

---

### Task 7: Delete the dead legacy tab shell

**Files:**
- Delete: `A/manage/manage-page.tsx`, `A/manage/tab-strip.tsx`, `A/manage/category-tab/category-tab.tsx`, `A/manage/category-tab/category-header-strip.tsx`, `A/manage/category-tab/category-rail.tsx`, entire `A/manage/minimums/` directory
- Modify: `A/manage/types.ts` (prune to referenced exports; delete the file if nothing remains referenced), `A/manage/categories/page.tsx` (redirect target → `/games-v2/${game}/manage?pane=groups`)
- Keep untouched: `A/manage/category-tab/category-settings-section.tsx`, `A/manage/category-tab/rules-section.tsx`, all of `A/manage/game-tab/`, the two moderation redirect stubs.

- [ ] **Step 1: Pre-verify deadness.** For EACH file to delete, run a repo-wide grep for its module name (e.g. `grep -rn "manage-page\|ManagePage\b" app/ src/ --include='*.ts*' | grep -v 'GameRunManagePage\|ManagePageData'` and similarly `TabStrip`, `CategoryTab\b`, `category-header-strip`, `category-rail`, `minimums-section`, `upsert-minimum`, `delete-minimum`, `load-category-data`). Every hit must be within the dead set itself. If ANY hit is outside it, STOP and report BLOCKED with the hit.

- [ ] **Step 2: Delete + prune.** `git rm` the files/dir. Open `A/manage/types.ts`: grep each remaining export for external references; keep referenced ones, delete the rest (delete the file if empty; update any lingering type imports). Fix the categories redirect.

- [ ] **Step 3: Prove it.** `npm run typecheck 2>&1 | grep -v node_modules | head -30` — no NEW errors (pre-existing unrelated ones remain); `npx vitest run` green; `rm -rf .next && npm run build 2>&1 | tail -5` — build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A "app/(new-layout)/games-v2/[game]/manage"
git commit -m "chore(console): delete dead legacy tab shell and orphaned minimums section"
```

---

### Task 8: Final gates + docs

- [ ] **Step 1:** `npm run typecheck` (no new), `npm run lint`, `npx vitest run` (all green), `rm -rf .next && npm run build` (green).
- [ ] **Step 2:** Update the spec status line to `**Status:** Implemented` in `docs/superpowers/specs/2026-07-15-tier1-console-completion-design.md`.
- [ ] **Step 3:** Commit docs; the controller runs the final whole-branch review, fix wave if needed, then pushes `tier1-console-completion`.

```bash
git add docs/superpowers/specs/2026-07-15-tier1-console-completion-design.md
git commit -m "docs: mark tier 1 console completion spec implemented"
```

---

## Plan Self-Review (completed)

- **Spec coverage:** health module + card (T1/T2), details form extraction + pane (T3/T4), moderators pane + nav flag (T5), GT minimum (T6), cleanup + redirect fix (T7), gates/docs (T8). All spec decisions traced.
- **Placeholder scan:** T6 instructs "read the pane and mirror its existing parse" — deliberate: standards.tsx internals are the one unread file; the mandate (second input, both value keys, RT-only unchanged) is exact. T7's grep-gated deletion is fully specified.
- **Type consistency:** `BoardHealth`/`HealthItem` (T1) consumed in T2; `GameDetailsForm` props (T3) consumed in T4; `NavFlags.canEditMods` (T5) matches the page's existing `canEditMods` binding; `pane` strings in T1's STEP_PANE match `NavItemId` values from nav-model.ts.
