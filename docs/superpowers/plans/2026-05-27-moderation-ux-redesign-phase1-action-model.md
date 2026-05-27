# Moderation UX Redesign — Phase 1: The Unified Action Model

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three overlapping run-moderation mechanisms (reject verdict / exclude run / user rule) with a single reason-driven action model — five verbs (Approve, Remove, Restore, Ban; Add time stays on its own existing flow), where a plain-language reason routes Remove to the correct backend path — and wire it into the two *inline* surfaces (the public-leaderboard row menu and the run-detail page).

**Architecture:** A pure model module (`action-model.ts`) defines the verbs and the Remove reason taxonomy. One client component (`RunActionDialog`) presents preview → reason → confirm for all four preview-shaped verbs, routing each to the **already-shipped** server actions: Approve→`verify`, Restore→`unreject`, Remove(loud)→`reject`, Remove(quiet)→`exclude(runIds)`, Ban→`exclude(rule)`. No new server actions and no backend change. The console views (queue/roster/runner/reports) keep their existing dialogs until their own phases rebuild them; this phase proves the model on the inline surfaces and ships the shared component the rest of the redesign reuses.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript. Existing server actions (`shared/actions/verdicts.action.ts`, `shared/actions/exclude.action.ts`). Bootstrap modal markup matching the existing dialogs. `react-toastify` for toasts. CASL gate via the existing `canModerateGame`.

**Spec:** `docs/superpowers/specs/2026-05-27-moderation-ux-redesign-design.md` (§3 verbs, §4 Remove routing).

**Project conventions:**
- **No test framework installed.** Verification = `npm run typecheck` + `npm run lint` + `npm run build` at milestones + a manual dev-server smoke test on a real board. Do not invent a test harness.
- Unused vars must be prefixed `_`. Biome formats on pre-commit (4-space indent, single quotes, trailing commas, semicolons).
- Per `CLAUDE.md`: **do not commit unless the user explicitly asks.** Commit commands below record the intended grouping; confirm with the user before running them. Never add a co-author line.
- Branch already created for this work: `moderation-ux-redesign` (main repo, no worktree).

---

## Scope of this phase

**This redesign = 5 phases.** Each ships working software on its own:

1. **The unified action model (THIS PLAN).** Verbs + reason routing + `RunActionDialog`, wired into the row menu and run-detail.
2. **Moderate tab + Needs Attention.** One-page shell with Moderate/Configure tabs; merged inbox (queue + reports + appeals + pending self-claims).
3. **Board mod-mode + filter bar + runner mass-action.** Replaces roster/runner views; proactive sweep filters; "Remove all / Ban" per runner.
4. **Configure tab: Standards + Active bans + History slide-over.** Replaces policies/rules/log; plain-language standards with live preview; board-admin set / mod preview.
5. **Migration & cleanup.** Route redirects, delete dead pages and the old per-action dialogs, final inline unification.

Phases 2–5 are sketched in **§Phase Roadmap** below and each gets its own spec→plan before code.

---

## File Structure (Phase 1)

**Create:**
- `app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model.ts` — pure verb + Remove-reason model. One responsibility: name the verbs and map a Remove reason to loud/quiet (reject/exclude). No React, no fetch.
- `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.tsx` — the one client dialog for Approve/Remove/Restore/Ban: preview → reason → confirm, routing to existing server actions.

**Modify:**
- `app/(new-layout)/games-v2/[game]/leaderboard/row-actions-menu.tsx` — replace the bespoke Verify/Reject/Exclude modal with `RunActionDialog` (Approve / Remove… / Restore / Ban runner…).
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/run-card.tsx` — replace `RejectControl` + `ExcludeUserControl` with `RunActionDialog` (Remove this run / Ban runner).

**Delete (after their callers are migrated, within this phase):**
- `app/(new-layout)/games-v2/[game]/leaderboard/actions/board-mod-actions.action.ts` — superseded; row menu now uses the shared actions through `RunActionDialog`.
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/reject-control.tsx`
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/exclude-user-control.tsx`
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/reject-run.action.ts`
- `app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/exclude-user.action.ts`

**Do NOT touch this phase:** `shared/verdict-dialog.tsx`, `shared/exclude-dialog.tsx`, `shared/reason-modal.tsx` (still used by queue/roster/runner/reports — deleted in Phase 5).

---

## Task 1: The verb + reason model module

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model.ts`

- [ ] **Step 1: Write the module**

Create `action-model.ts` with this exact content:

```typescript
// The vocabulary of run moderation. One Remove verb replaces the old
// reject-verdict / exclude-run split; the chosen reason decides whether the
// removal is "loud" (a reject verdict — runner notified, appealable) or "quiet"
// (a silent exclusion). See spec §3–§4.

export type ModVerb = 'approve' | 'remove' | 'restore' | 'ban';

export type RemoveReason = 'cheating' | 'breaks_rules' | 'doesnt_belong';

export interface RemoveReasonMeta {
    value: RemoveReason;
    label: string;
    /** Shown under the picker so the consequence is legible. */
    blurb: string;
    /** Default for the "Notify runner" toggle; notify ⟺ loud ⟺ reject path. */
    defaultNotify: boolean;
}

export const REMOVE_REASONS: RemoveReasonMeta[] = [
    {
        value: 'cheating',
        label: 'Cheating / falsified',
        blurb: 'Spliced VOD, TAS, manipulated timer. The runner is notified and can appeal.',
        defaultNotify: true,
    },
    {
        value: 'breaks_rules',
        label: 'Breaks the rules',
        blurb: 'Wrong version, illegal strat, or a missed category requirement. The runner is notified and can appeal.',
        defaultNotify: true,
    },
    {
        value: 'doesnt_belong',
        label: "Doesn't belong",
        blurb: 'Duplicate, test/joke run, or superseded by a better time. Removed quietly — no notification, no appeal.',
        defaultNotify: false,
    },
];

export function removeReasonMeta(reason: RemoveReason): RemoveReasonMeta {
    // Non-null: REMOVE_REASONS covers every RemoveReason member.
    return REMOVE_REASONS.find((r) => r.value === reason) as RemoveReasonMeta;
}

/**
 * A loud removal is a `reject` verdict (status change, notification, appeal);
 * a quiet removal is a silent `exclude`. The notify toggle is the single switch.
 */
export function resolveRemoveMechanism(notify: boolean): 'reject' | 'exclude' {
    return notify ? 'reject' : 'exclude';
}

export type BanScope = 'category' | 'game';

/** What a dialog instance acts on. `ban` requires a `runner` target; the rest require `runs`. */
export type RunActionTarget =
    | { kind: 'runs'; runIds: number[]; label: string }
    | {
          kind: 'runner';
          runnerId: number;
          runnerName: string;
          categoryId: number;
          categoryDisplay: string;
          gameDisplay: string;
      };
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors referencing `action-model.ts`).

- [ ] **Step 3: Commit (confirm with user first)**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model.ts"
git commit -m "feat(moderation): verb + remove-reason model"
```

---

## Task 2: The unified `RunActionDialog`

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.tsx`

This component is the keystone reused by every later phase. It loads a preview (routing per verb), collects the reason (plus a reason-category + notify toggle for Remove, a scope picker for Ban), and confirms — calling only the **existing** server actions.

- [ ] **Step 1: Write the component**

Create `run-action-dialog.tsx` with this exact content:

```tsx
'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    PreviewExcludeResult,
    UserExclusionRuleInput,
    VerdictAction,
    VerdictPreviewResult,
} from '../../../../../../../types/moderation.types';
import {
    type BanScope,
    type ModVerb,
    REMOVE_REASONS,
    type RemoveReason,
    type RunActionTarget,
    removeReasonMeta,
    resolveRemoveMechanism,
} from './action-model';
import { excludeAction, previewExcludeAction } from './actions/exclude.action';
import {
    applyVerdictsAction,
    previewVerdictsAction,
} from './actions/verdicts.action';

interface Props {
    gameSlug: string;
    verb: ModVerb;
    target: RunActionTarget;
    onDone: () => void;
    onClose: () => void;
}

const MIN_REASON = 10;

type PreviewState =
    | { kind: 'verdict'; data: VerdictPreviewResult }
    | { kind: 'exclude'; data: PreviewExcludeResult };

const VERB_TITLE: Record<ModVerb, string> = {
    approve: 'Approve',
    remove: 'Remove',
    restore: 'Restore',
    ban: 'Ban runner',
};

export function RunActionDialog({
    gameSlug,
    verb,
    target,
    onDone,
    onClose,
}: Props) {
    const [reasonCat, setReasonCat] = useState<RemoveReason>('cheating');
    const [notify, setNotify] = useState<boolean>(
        removeReasonMeta('cheating').defaultNotify,
    );
    const [scope, setScope] = useState<BanScope>('category');
    const [reason, setReason] = useState('');
    const [preview, setPreview] = useState<PreviewState | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
    const [isConfirming, startConfirm] = useTransition();

    const runIds = target.kind === 'runs' ? target.runIds : [];
    const banRule: UserExclusionRuleInput | null =
        target.kind === 'runner'
            ? {
                  type: 'user',
                  targetId: target.runnerId,
                  categoryId: scope === 'category' ? target.categoryId : null,
              }
            : null;

    // Map the verb (+ notify for Remove) to a verdict action, or null when the
    // route is an exclude instead.
    const verdictAction: VerdictAction | null =
        verb === 'approve'
            ? 'verify'
            : verb === 'restore'
              ? 'unreject'
              : verb === 'remove' && resolveRemoveMechanism(notify) === 'reject'
                ? 'reject'
                : null;

    const loadPreview = useCallback(() => {
        startPreview(async () => {
            setPreviewError(null);
            if (verb === 'ban' && banRule) {
                const res = await previewExcludeAction(gameSlug, {
                    rule: banRule,
                });
                if ('error' in res) return setPreviewError(res.error);
                return setPreview({ kind: 'exclude', data: res.preview });
            }
            if (verdictAction) {
                const res = await previewVerdictsAction(
                    gameSlug,
                    verdictAction,
                    runIds,
                );
                if ('error' in res) return setPreviewError(res.error);
                return setPreview({ kind: 'verdict', data: res.preview });
            }
            // Remove + quiet → exclude these runIds.
            const res = await previewExcludeAction(gameSlug, { runIds });
            if ('error' in res) return setPreviewError(res.error);
            setPreview({ kind: 'exclude', data: res.preview });
        });
        // banRule/verdictAction are derived from the deps below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameSlug, verb, notify, scope]);

    // Reload whenever routing-relevant inputs change (notify flips reject↔exclude;
    // scope flips category↔game rule — each yields a different preview).
    useEffect(() => {
        loadPreview();
    }, [loadPreview]);

    const onReasonCatChange = (next: RemoveReason) => {
        setReasonCat(next);
        setNotify(removeReasonMeta(next).defaultNotify);
    };

    const reasonOk = reason.trim().length >= MIN_REASON;
    const busy = isPreviewing || isConfirming;

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        startConfirm(async () => {
            const trimmed = reason.trim();
            if (verb === 'ban' && banRule) {
                const res = await excludeAction(gameSlug, {
                    rule: banRule,
                    reason: trimmed,
                });
                if ('error' in res) return setError(res.error);
                toast.success(
                    target.kind === 'runner'
                        ? `${target.runnerName} banned from ${scope === 'category' ? target.categoryDisplay : target.gameDisplay}.`
                        : 'Runner banned.',
                );
                return onDone();
            }
            if (verdictAction) {
                const res = await applyVerdictsAction(
                    gameSlug,
                    verdictAction,
                    runIds,
                    trimmed,
                );
                if ('error' in res) return setError(res.error);
                toast.success(`${VERB_TITLE[verb]} — done.`);
                return onDone();
            }
            const res = await excludeAction(gameSlug, {
                runIds,
                reason: trimmed,
            });
            if ('error' in res) return setError(res.error);
            toast.success('Removed.');
            onDone();
        });
    };

    const headerTarget =
        target.kind === 'runs'
            ? target.label
            : `${target.runnerName} · ${scope === 'category' ? target.categoryDisplay : `${target.gameDisplay} (entire game)`}`;

    return (
        <div
            className="modal d-block"
            tabIndex={-1}
            role="dialog"
            style={{ background: 'rgba(0,0,0,0.5)' }}
        >
            <div
                className="modal-dialog modal-lg modal-dialog-scrollable"
                role="document"
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {VERB_TITLE[verb]} — {headerTarget}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={onClose}
                            disabled={isConfirming}
                        />
                    </div>
                    <div className="modal-body">
                        {verb === 'remove' && (
                            <div className="mb-3">
                                <label
                                    htmlFor="remove-reason-cat"
                                    className="form-label small text-muted mb-1"
                                >
                                    Why are you removing this?
                                </label>
                                <select
                                    id="remove-reason-cat"
                                    className="form-select form-select-sm"
                                    value={reasonCat}
                                    onChange={(e) =>
                                        onReasonCatChange(
                                            e.target.value as RemoveReason,
                                        )
                                    }
                                    disabled={isConfirming}
                                >
                                    {REMOVE_REASONS.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="form-text">
                                    {removeReasonMeta(reasonCat).blurb}
                                </div>
                                <div className="form-check form-switch mt-2">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="remove-notify"
                                        checked={notify}
                                        onChange={(e) =>
                                            setNotify(e.target.checked)
                                        }
                                        disabled={isConfirming}
                                    />
                                    <label
                                        className="form-check-label small"
                                        htmlFor="remove-notify"
                                    >
                                        Notify the runner and allow an appeal
                                    </label>
                                </div>
                            </div>
                        )}

                        {verb === 'ban' && target.kind === 'runner' && (
                            <div className="mb-3 d-flex gap-3">
                                <div className="form-check">
                                    <input
                                        type="radio"
                                        className="form-check-input"
                                        id="ban-scope-category"
                                        name="ban-scope"
                                        checked={scope === 'category'}
                                        onChange={() => setScope('category')}
                                        disabled={isConfirming}
                                    />
                                    <label
                                        htmlFor="ban-scope-category"
                                        className="form-check-label small"
                                    >
                                        From this category
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input
                                        type="radio"
                                        className="form-check-input"
                                        id="ban-scope-game"
                                        name="ban-scope"
                                        checked={scope === 'game'}
                                        onChange={() => setScope('game')}
                                        disabled={isConfirming}
                                    />
                                    <label
                                        htmlFor="ban-scope-game"
                                        className="form-check-label small"
                                    >
                                        From the entire game
                                    </label>
                                </div>
                            </div>
                        )}

                        {isPreviewing && (
                            <p className="text-muted">Loading preview…</p>
                        )}
                        {previewError && (
                            <div
                                className="alert alert-danger py-2"
                                role="alert"
                            >
                                {previewError}
                            </div>
                        )}

                        {preview && (
                            <p className="mb-2">
                                <strong>{preview.data.affectedRunCount}</strong>{' '}
                                run
                                {preview.data.affectedRunCount === 1
                                    ? ''
                                    : 's'}{' '}
                                affected across{' '}
                                <strong>
                                    {preview.data.affectedLeaderboards.length}
                                </strong>{' '}
                                leaderboard
                                {preview.data.affectedLeaderboards.length === 1
                                    ? ''
                                    : 's'}
                                .
                            </p>
                        )}

                        {preview?.kind === 'verdict' &&
                            preview.data.sampleRuns.length > 0 && (
                                <div className="table-responsive">
                                    <table className="table table-sm align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>Runner</th>
                                                <th className="text-end">
                                                    Time
                                                </th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.data.sampleRuns.map((s) => (
                                                <tr key={s.runId}>
                                                    <td>{s.runnerName}</td>
                                                    <td className="text-end">
                                                        <DurationToFormatted
                                                            duration={s.timeMs}
                                                        />
                                                    </td>
                                                    <td className="small text-muted">
                                                        {s.currentStatus}
                                                        {' → '}
                                                        {s.newStatus}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        {preview?.kind === 'exclude' &&
                            preview.data.sampleRuns.length > 0 && (
                                <ul className="small mb-0">
                                    {preview.data.sampleRuns.map((s) => (
                                        <li key={s.runId}>
                                            {s.runnerName} — {s.categoryName}
                                            {s.subcategoryKey
                                                ? ` (${s.subcategoryKey})`
                                                : ''}{' '}
                                            {s.time != null && (
                                                <DurationToFormatted
                                                    duration={s.time}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                        <div className="mt-3">
                            <label
                                htmlFor="run-action-reason"
                                className="form-label small text-muted mb-1"
                            >
                                Reason — required, min {MIN_REASON} characters,
                                audit-logged
                            </label>
                            <textarea
                                id="run-action-reason"
                                className="form-control form-control-sm"
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isConfirming}
                            />
                            {!reasonOk && reason.length > 0 && (
                                <small className="text-danger">
                                    {MIN_REASON - reason.trim().length} more
                                    needed.
                                </small>
                            )}
                        </div>

                        {error && (
                            <div
                                className="alert alert-danger py-2 mt-2 mb-0"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={onClose}
                            disabled={isConfirming}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${verb === 'approve' ? 'btn-success' : 'btn-danger'}`}
                            onClick={handleConfirm}
                            disabled={busy || !reasonOk || !!previewError}
                        >
                            {isConfirming
                                ? 'Working…'
                                : `Confirm ${VERB_TITLE[verb].toLowerCase()}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If it reports that `previewVerdictsAction`/`previewExcludeAction` return shapes differ from `{ ok; preview } | { error }`, open `shared/actions/verdicts.action.ts` and `shared/actions/exclude.action.ts` and match the actual property names (the existing `verdict-dialog.tsx`/`exclude-dialog.tsx` read `res.preview` and `res.result`, so those names are correct).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (the one `eslint-disable-next-line react-hooks/exhaustive-deps` mirrors the existing dialogs' pattern).

- [ ] **Step 4: Commit (confirm with user first)**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.tsx"
git commit -m "feat(moderation): unified RunActionDialog (approve/remove/restore/ban)"
```

---

## Task 3: Rewire the leaderboard row menu

Replace the bespoke verify/reject/exclude modal in `row-actions-menu.tsx` with `RunActionDialog`. Keep all runner-facing items (Run history, Report, Hide/Restore my run, Appeal) untouched.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/row-actions-menu.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/leaderboard/actions/board-mod-actions.action.ts`

- [ ] **Step 1: Swap the moderator section + dialog state**

In `row-actions-menu.tsx`:

1. Replace the import block that pulls in `board-mod-actions.action`:

```tsx
import {
    boardExcludeRunAction,
    boardRunVerdictAction,
} from './actions/board-mod-actions.action';
```

with:

```tsx
import { RunActionDialog } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog';
import type { ModVerb } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model';
```

2. Replace the mod-action state and handlers. Remove these:

```tsx
    const [modAction, setModAction] = useState<
        'verify' | 'reject' | 'exclude' | null
    >(null);
```

and the `openMod` and `submitModAction` functions, and the `<Modal show={modAction !== null} …>` block entirely.

Add a single verb-dialog state near the other `useState` calls:

```tsx
    const [modVerb, setModVerb] = useState<ModVerb | null>(null);
```

3. Replace the `{canManage && ( … )}` moderator dropdown section with:

```tsx
                    {canManage && (
                        <>
                            <Dropdown.Divider />
                            <Dropdown.Header>Moderator</Dropdown.Header>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                onClick={() => setModVerb('approve')}
                            >
                                Approve run
                            </Dropdown.Item>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className="text-danger"
                                onClick={() => setModVerb('remove')}
                            >
                                Remove run…
                            </Dropdown.Item>
                            {isRejected && (
                                <Dropdown.Item
                                    as="button"
                                    type="button"
                                    onClick={() => setModVerb('restore')}
                                >
                                    Restore run
                                </Dropdown.Item>
                            )}
                            {entry.userId != null && (
                                <Dropdown.Item
                                    as="button"
                                    type="button"
                                    className="text-danger"
                                    onClick={() => setModVerb('ban')}
                                >
                                    Ban runner…
                                </Dropdown.Item>
                            )}
                        </>
                    )}
```

4. Render the dialog once, after the closing `</Dropdown>` and before the other `<Modal>`s:

```tsx
            {modVerb && runId != null && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={modVerb}
                    target={
                        modVerb === 'ban'
                            ? {
                                  kind: 'runner',
                                  runnerId: entry.userId as number,
                                  runnerName: entry.runnerName,
                                  categoryId: entry.categoryId,
                                  categoryDisplay: entry.categoryDisplay,
                                  gameDisplay: entry.gameDisplay,
                              }
                            : {
                                  kind: 'runs',
                                  runIds: [runId],
                                  label: `${entry.runnerName}'s run`,
                              }
                    }
                    onDone={() => {
                        setModVerb(null);
                        router.refresh();
                    }}
                    onClose={() => setModVerb(null)}
                />
            )}
```

- [ ] **Step 2: Confirm the `LeaderboardEntry` fields used by Ban exist**

Run: search the entry type to confirm `userId`, `categoryId`, `categoryDisplay`, `gameDisplay` exist on `LeaderboardEntry`.

Run: `grep -nE "userId|categoryId|categoryDisplay|gameDisplay|runnerName" types/leaderboards.types.ts`
Expected: each field is present. If a field is named differently (e.g. `category`/`game` instead of `categoryDisplay`/`gameDisplay`), use the actual name in the `target` object above and note it. If `categoryId` is absent on the board entry, Ban cannot resolve a category scope from the row — in that case drop the `Ban runner…` item from the row menu (Ban remains available from the run-detail page in Task 4, which has full category context) and remove the `entry.userId != null` block.

- [ ] **Step 3: Delete the dead server action**

Run: `git rm "app/(new-layout)/games-v2/[game]/leaderboard/actions/board-mod-actions.action.ts"`
Expected: file removed. (It was only imported by `row-actions-menu.tsx`.)

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Resolve any unused-import warnings (e.g. a now-unused `Form` import if the removed modal was its only user — check before deleting, the report/appeal/history modals still use `Form.Control`).

- [ ] **Step 5: Commit (confirm with user first)**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/row-actions-menu.tsx"
git commit -m "feat(moderation): row menu uses unified action dialog; drop board-mod-actions"
```

---

## Task 4: Rewire the run-detail page

Replace `RejectControl` + `ExcludeUserControl` on the run-detail card with `RunActionDialog` (Remove this run; Ban this runner).

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/run-card.tsx`
- Delete: `reject-control.tsx`, `exclude-user-control.tsx`, `actions/reject-run.action.ts`, `actions/exclude-user.action.ts` (all under `manage/run/[runId]/`)

- [ ] **Step 1: Read the current card to find the control mount points**

Run: read `app/(new-layout)/games-v2/[game]/manage/run/[runId]/run-card.tsx` and note where `<RejectControl …>` and `<ExcludeUserControl …>` are rendered and which props (runId, userId, categoryId, runnerName, gameDisplay, categoryDisplay, gameSlug) are in scope.

- [ ] **Step 2: Replace the two controls with verb buttons + the dialog**

In `run-card.tsx`, remove the imports of `RejectControl` and `ExcludeUserControl`. Add (the card is already a client component — confirm `'use client'` at top; if it is a server component, create a small `run-card-mod-controls.tsx` client child instead and mount it where the controls were):

```tsx
import { useState } from 'react';
import { RunActionDialog } from '../../moderation/shared/run-action-dialog';
import type { ModVerb } from '../../moderation/shared/action-model';
```

Add state near the top of the component body:

```tsx
    const [modVerb, setModVerb] = useState<ModVerb | null>(null);
    const isRejected = run.verificationStatus === 'rejected';
```

Replace the JSX that rendered `<RejectControl/>` and `<ExcludeUserControl/>` with a button row:

```tsx
            <div className="d-flex gap-2 justify-content-end">
                {!isRejected && (
                    <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => setModVerb('remove')}
                    >
                        Remove run…
                    </button>
                )}
                {isRejected && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setModVerb('restore')}
                    >
                        Restore run
                    </button>
                )}
                {run.userId != null && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setModVerb('ban')}
                    >
                        Ban runner…
                    </button>
                )}
            </div>

            {modVerb && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={modVerb}
                    target={
                        modVerb === 'ban'
                            ? {
                                  kind: 'runner',
                                  runnerId: run.userId as number,
                                  runnerName: run.runnerName,
                                  categoryId: run.categoryId,
                                  categoryDisplay: run.categoryDisplay,
                                  gameDisplay: run.gameDisplay,
                              }
                            : {
                                  kind: 'runs',
                                  runIds: [run.runId],
                                  label: `${run.runnerName}'s run`,
                              }
                    }
                    onDone={() => {
                        setModVerb(null);
                        router.refresh();
                    }}
                    onClose={() => setModVerb(null)}
                />
            )}
```

Adjust the exact prop names (`run.userId`, `run.categoryId`, `run.categoryDisplay`, `run.gameDisplay`, `run.runnerName`, `run.verificationStatus`) to the fields actually present on the card's run object (from Step 1; the type is in `manage/run/[runId]/types.ts`). Ensure a `router` is available (`useRouter()` from `next/navigation`) — add it if the card didn't already use it.

- [ ] **Step 3: Delete the now-dead controls and their actions**

```bash
git rm \
  "app/(new-layout)/games-v2/[game]/manage/run/[runId]/reject-control.tsx" \
  "app/(new-layout)/games-v2/[game]/manage/run/[runId]/exclude-user-control.tsx" \
  "app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/reject-run.action.ts" \
  "app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/exclude-user.action.ts"
```

First confirm nothing else imports them:

Run: `grep -rnE "reject-control|exclude-user-control|reject-run.action|exclude-user.action" "app/(new-layout)/games-v2/[game]/manage/run"`
Expected: only `run-card.tsx` referenced them (now updated). If anything else imports them, update that caller before deleting.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit (confirm with user first)**

```bash
git add -A "app/(new-layout)/games-v2/[game]/manage/run/[runId]"
git commit -m "feat(moderation): run-detail uses unified action dialog; drop reject/exclude controls"
```

---

## Task 5: Full-phase verification

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: compiles clean. If `'use cache'`/route errors surface, they are unrelated to these client-only changes — confirm by checking the error path is outside the files this phase touched.

- [ ] **Step 2: Manual smoke test (dev server)**

Run: `npm run dev`, sign in as a moderator, open a game's leaderboard, and verify on a real board:
- Row **Actions → Approve run** → dialog shows preview + reason → confirm → toast, run shows verified.
- Row **Actions → Remove run…** → reason dropdown defaults to "Cheating" with notify ON; switching to "Doesn't belong" flips notify OFF and the preview reloads (the list/sample changes shape) → confirm → run leaves the board.
- A rejected run shows **Restore run** → confirm → run returns.
- Row **Actions → Ban runner…** (if present) → scope picker; switching category↔game reloads the preview → confirm → runner's runs disappear.
- Run-detail page (`/manage/run/{runId}`): **Remove run… / Restore run / Ban runner…** behave the same.
- Confirm the runner-facing items (Report, Hide my run, Appeal, Run history) still work unchanged.

Record the result (pass/fail per item) in the commit message or session notes. Do not claim the phase complete without this smoke test (no automated tests exist to substitute for it).

- [ ] **Step 3: Update the build-status doc**

Append a dated line to `docs/superpowers/MODERATION_FRONTEND_STATUS.md` under a new "## UX redesign" heading noting Phase 1 (unified action model) landed on `moderation-ux-redesign`, inline surfaces migrated, old per-action inline modals removed.

- [ ] **Step 4: Commit (confirm with user first)**

```bash
git add docs/superpowers/MODERATION_FRONTEND_STATUS.md
git commit -m "docs(moderation): record Phase 1 (unified action model) landed"
```

---

## Phase Roadmap (planned separately, not part of this plan)

Each becomes its own `docs/superpowers/specs/` + `docs/superpowers/plans/` pair before code.

- **Phase 2 — Moderate tab + Needs Attention.** New page shell at the `manage/moderation` route with `Moderate`/`Configure` tabs (Configure gated to board-admin per spec §12). Build the merged inbox by client-side combining `getQueue`, `getReports`, appeal queue items, and pending self-claim manual times into one prioritized list with source tags; collapse multi-source and multi-runner rows; act via `RunActionDialog`. Retire `moderation-hub.tsx`, `queue-view.tsx`, `reports-view.tsx` as the entry (keep their data libs).
- **Phase 3 — Board mod-mode + runner mass-action.** Add mod-mode (select + bulk action bar using `RunActionDialog`) and a filter bar to the real category board; filters map to `RosterFilter` params, with account-age/faster-than-WR applied client-side (spec §7, §11). Runner slide-over with "Remove all / Ban" primaries and the ban-not-remove nudge (spec §8). Retire `roster-view.tsx`, `runner-view.tsx`.
- **Phase 4 — Configure tab.** Standards UI over `.../policies` with plain-language fields, Off/Normal/Strict sensitivity mapping, and a live "catches N runs" preview; board-admin set / mod read-only (spec §9). Active bans list over `exclusion-rules` (delete = Restore). History slide-over over `mod-actions` with 24h undo. Retire `policies-view.tsx`, `rules-view.tsx`, `log-view.tsx`.
- **Phase 5 — Migration & cleanup.** Redirect old `/manage/moderation/*` routes into the new page; delete `verdict-dialog.tsx`, `exclude-dialog.tsx`, `include-dialog.tsx`, `reason-modal.tsx` and any now-dead libs/actions; final pass for the cross-cutting requirements that need backend coordination (spec §13: batched notifications, policy-write gating) — verify the frontend degrades gracefully until those land.

---

## Self-Review

**Spec coverage (Phase 1 scope only):** §3 verbs Approve/Remove/Restore/Ban → Tasks 1–4 (Add time deferred, noted §Goal). §4 loud/quiet routing → Task 1 `resolveRemoveMechanism` + Task 2 dialog. §5 inline surface → Tasks 3–4. Console surfaces, Needs Attention, Standards, History, migration → explicitly Phases 2–5.

**Placeholder scan:** No "TBD"/"handle errors"/"similar to". Code is complete; the two "adjust field names to actual" notes (Tasks 3 Step 2, Task 4 Step 2) are guarded verification steps with a concrete fallback, not placeholders — they exist because the `LeaderboardEntry`/run-card field names weren't read in this planning pass and must be confirmed against the real types.

**Type consistency:** `ModVerb`, `RemoveReason`, `RunActionTarget`, `resolveRemoveMechanism`, `removeReasonMeta`, `REMOVE_REASONS` are defined in Task 1 and consumed verbatim in Tasks 2–4. `RunActionDialog` props (`gameSlug`, `verb`, `target`, `onDone`, `onClose`) match every call site. Preview union (`'verdict'|'exclude'`) matches the existing `VerdictPreviewResult`/`PreviewExcludeResult` shapes read from `types/moderation.types.ts`.

**Open verification (carried into execution):** exact `LeaderboardEntry` and run-card field names for the Ban target; the precise return-property names of `previewVerdictsAction`/`previewExcludeAction` (asserted from the existing dialogs but to be confirmed at typecheck).
