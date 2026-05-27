# Moderation UX Redesign — Phase 3: Board Mod-Mode + Runner Mass-Action

> Execute task-by-task. No test framework — verify with `npm run typecheck` + `npm run lint` + `npm run build` + static data-flow tracing. Commits authorized; never add a Co-Authored-By line. Branch `moderation-ux-redesign`. Work autonomously; do not ask questions.

**Goal:** Convert the two bulk moderation surfaces — the category roster and the per-runner view — from the old five-button jargon bar (Verify/Reject/Unreject/Include/Exclude) to the **two-verb model** (Approve / Remove… / Restore / Add time, plus prominent **Ban runner** + **Remove all** on the runner view), all routed through the Phase 1 `RunActionDialog`. Add the ban-not-remove nudge and integrate drill-down from the Moderate tab.

**Architecture:** Add one idempotent `restoreRunsAction` (include + unreject) and a `defaultBanScope` prop to `RunActionDialog`, then rewrite `roster-view.tsx` and `runner-view.tsx` to use `RunActionDialog` for all destructive/positive actions (keeping `ManualTimeDialog` for "Add time"). This retires `VerdictDialog`/`ExcludeDialog`/`IncludeDialog` from these surfaces (Phase 5 deletes them).

**Spec:** §7 (board mod-mode + sweep filters), §8 (runner mass-action + ban-not-remove nudge).

**Prerequisite:** Phases 1–2 merged. `RunActionDialog`, `action-model.ts`, the tabbed page exist.

---

## Context the implementer needs

**The existing views are your templates — read them fully and preserve their structure, just swap the action layer + elevate the polish:**
- `app/(new-layout)/games-v2/[game]/manage/moderation/roster/roster-view.tsx` — category roster: filter bar (category, subcategoryKey, verification, VOD, runnerName) + Load, a table with per-row checkbox, a sticky bulk bar, per-row "Set time" + "View runner". Backed by `loadRosterAction` → `LeaderboardRosterRow[]`.
- `app/(new-layout)/games-v2/[game]/manage/moderation/runner/[userId]/runner-view.tsx` — runner's runs grouped by category/subcategory; category filter; sticky bulk bar; per-group "Set time"; header ban buttons. Backed by `UserEligibleRunRow[]` (NB: this type has **no `runnerName`** — the view shows `#userId`).

**The verb mapping (old → new):**
- Verify → **Approve** (`RunActionDialog` verb `approve`, `{kind:'runs', runIds}`)
- Reject / Exclude (the two old "remove" buttons) → **Remove…** (verb `remove`, `{kind:'runs', runIds}`) — the reason picker now decides loud(reject)/quiet(exclude). One button replaces two.
- Unreject + Include → **Restore** (verb `restore`, `{kind:'runs', runIds}`) — now routes through the new `restoreRunsAction` so it undoes BOTH a rejection and an exclusion in one idempotent call.
- The runner-view header "Exclude this user…" buttons → **Ban runner** (verb `ban`, `{kind:'runner', …}`).
- "Set time" → unchanged (`ManualTimeDialog` — this is the "Add time" verb; do not retire it).

**`RunActionDialog` interface (Phase 1):** props `{ gameSlug, verb, target, onDone, onClose }`; `target` is `{kind:'runs', runIds, label}` or `{kind:'runner', runnerId, runnerName, categoryId, categoryDisplay, gameDisplay}`. You will ADD an optional `defaultBanScope?: 'category' | 'game'` prop (Task 1).

---

## Task 1: `restoreRunsAction` + `RunActionDialog` extensions

**Files:** Create `shared/actions/restore.action.ts`; modify `shared/run-action-dialog.tsx`.

- [ ] **Step 1:** Create `restore.action.ts` following the gate pattern in `shared/actions/exclude.action.ts` (getSession → resolveGame → canModerateGame → try/catch ModError → revalidateAffectedBoards). It calls BOTH `include(sessionId, gameId, {runIds, reason})` and `applyVerdicts(sessionId, gameId, {action:'unreject', runIds, reason})` (import from `~src/lib/moderation/mass-mgmt` and `~src/lib/moderation/verdicts`). Both are idempotent (include on a non-excluded run / unreject on a non-rejected run are no-ops backend-side). Revalidate the union of affected leaderboards from both results. Signature:
```typescript
export async function restoreRunsAction(
    gameSlug: string,
    runIds: number[],
    reason: string,
): Promise<{ ok: true } | { error: string }>
```
If one call throws a ModError and the other would still be valid, prefer to surface the error (don't silently swallow) — return `{ error }` with the message.

- [ ] **Step 2:** In `run-action-dialog.tsx`:
  - Add optional prop `defaultBanScope?: 'category' | 'game'`; initialize the existing `scope` state from it (`useState<BanScope>(defaultBanScope ?? 'category')`).
  - Route the `restore` CONFIRM through `restoreRunsAction(gameSlug, runIds, trimmed)` instead of `applyVerdictsAction(gameSlug, 'unreject', …)`. Keep the restore PREVIEW as `previewVerdictsAction(gameSlug, 'unreject', runIds)` (shows which runs come back; the include effect is analogous). Update `verdictAction` derivation so `restore` no longer maps to a verdict apply — only its preview uses `'unreject'`. Concretely: keep a separate `previewVerdictAction` for preview routing, but in `handleConfirm`, branch `verb === 'restore'` → `restoreRunsAction`. On success toast "Restored.".
  - This makes single-run restore (Phase 1 public board) also go through include+unreject — harmless and strictly more correct.

- [ ] **Step 3:** `npm run typecheck && npm run lint`. Commit: `feat(moderation): restoreRunsAction (include+unreject) + dialog restore/ban-scope`.

---

## Task 2: Rewrite the runner view (mass-action by person)

**Files:** modify `runner/[userId]/runner-view.tsx`; check `runner/[userId]/page.tsx` for a `runnerName`.

- [ ] **Step 1:** If `page.tsx` can resolve the runner's display name cheaply (e.g. it already has it, or a `resolveUser`/username lookup exists — search `src/lib/` for a user-by-id resolver), pass `runnerName` into the view; otherwise pass `runnerName={`Runner #${userId}`}` (the ban still works — `targetId` is the userId; the name is cosmetic). Add a `runnerName: string` prop.
- [ ] **Step 2:** Header: show the runner name. Add two **primary** buttons (spec §8):
  - **Ban runner** → `RunActionDialog` verb `ban`, `target={kind:'runner', runnerId:userId, runnerName, categoryId:<first visible group's categoryId>, categoryDisplay:<that group's categoryName>, gameDisplay}`, **`defaultBanScope="game"`** (banning a bad actor across the whole game is the common case here).
  - **Remove all N runs** → `RunActionDialog` verb `remove`, `target={kind:'runs', runIds:<all visible rows' runIds>, label:`all of ${runnerName}'s ${N} runs`}`.
- [ ] **Step 3:** Replace the sticky bulk bar's five buttons with: **Approve**, **Remove…**, **Restore** (all `RunActionDialog`, `kind:'runs'`, `runIds=selectedRunIds`). Keep per-group "Set time" (`ManualTimeDialog`). Remove the `VerdictDialog`/`ExcludeDialog`/`IncludeDialog` imports and usages.
- [ ] **Step 4: Ban-not-remove nudge.** Since every run here belongs to one runner, when the user opens **Remove…** on a multi-run selection (≥3 runIds), show an inline hint inside the flow steering them to Ban: simplest is a one-line `alert alert-info` above the bulk bar when `selected.size >= 3`: "Removing many of one runner's runs? **Ban {runner}** also covers their future uploads." with a button that opens the Ban dialog. (Don't block Remove — just nudge.)
- [ ] **Step 5:** `afterMutation`: replace the `window.location.reload()` with `router.refresh()` (`useRouter` from `next/navigation`) for a smoother update. `npm run typecheck && npm run lint`. Commit: `feat(moderation): runner view → two-verb model + ban/remove-all primaries`.

---

## Task 3: Rewrite the roster view (category board mod-mode)

**Files:** modify `roster/roster-view.tsx`.

- [ ] **Step 1:** Keep the filter bar and table as-is structurally. Replace the sticky bulk bar's five buttons (Verify/Reject/Unreject/Include/Exclude) with: **Approve**, **Remove…**, **Restore** — all `RunActionDialog`, `kind:'runs'`, `runIds=selectedRunIds`, `label=`${selected.size} runs``. Keep per-row "Set time" (`ManualTimeDialog`) and "View runner". Remove `VerdictDialog`/`ExcludeDialog`/`IncludeDialog` imports/usages.
- [ ] **Step 2:** Preserve the existing `ruleHint` insight but surface it as a **Ban runner** affordance: when all selected runs belong to one registered user, show a "Ban {runner} instead?" button in the bulk bar that opens `RunActionDialog` verb `ban` with that runner (categoryId = the loaded `categoryId`, categoryDisplay = the selected category's display, `defaultBanScope="category"` since the roster is one category). This realizes spec §8's nudge on the roster too.
- [ ] **Step 3: Sweep filters (spec §7).** The existing filters (subcategory, verification, VOD, runnerName) already support sweeps. ADD an "On board" filter (any / on board / off board) computed client-side from `isLeaderboardEntry || isLeaderboardEntryGt`. **Do NOT** add account-age or faster-than-WR% filters — `LeaderboardRosterRow` carries neither field; note in the commit body that those remain a backend ask (spec §13 item 3) rather than fabricating them.
- [ ] **Step 4:** `afterMutation` stays (reload roster via `handleLoad`). `npm run typecheck && npm run lint && npm run build`. Commit: `feat(moderation): roster view → two-verb model + on-board filter + ban nudge`.

---

## Task 4: Drill-down from the Moderate tab + verify

**Files:** modify `attention/needs-attention.tsx` (add per-item "View runner" link if not already present) and `moderation-tabs.tsx` (add a category drill-down: a small "Browse a category board" selector that links to `…/manage/moderation/roster?categoryId={id}`).

- [ ] **Step 1:** In the Moderate tab, add an unobtrusive category selector (reuse the `categories` prop) that navigates to the roster route on change — mirrors the old hub's roster picker but lives in-tab. Ensure each inbox item with a `userId` has a "View runner" link to `…/runner/{userId}`.
- [ ] **Step 2:** `npm run build` clean. Update `MODERATION_FRONTEND_STATUS.md` with a Phase 3 line. Commit: `docs(moderation): record Phase 3 (board mod-mode + runner) landed`.

---

## Self-Review checklist
- Bulk bars no longer show Verify/Reject/Unreject/Include/Exclude — only Approve/Remove/Restore (+ Set time, + Ban nudge). §7/§8.
- Restore undoes both exclusion and rejection (restoreRunsAction). Ban defaults to game scope on runner view, category scope on roster.
- Ban-not-remove nudge present on both surfaces.
- `VerdictDialog`/`ExcludeDialog`/`IncludeDialog` no longer imported by roster/runner (Phase 5 can delete them — but DON'T delete them this phase; `queue-view.tsx`/`reports-view.tsx` may still import them until Phase 5).
- No account-age/faster-than-WR filters fabricated; on-board filter added from real fields.
- Types confirmed against `types/moderation.types.ts`; runnerName sourced or cosmetic-fallback.
