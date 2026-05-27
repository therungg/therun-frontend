# Moderation UX Redesign — Phase 5: Migration & Cleanup

> Execute task-by-task. No test framework — verify with `npm run typecheck` + `npm run lint` + `npm run build` + static tracing. Commits authorized; never add a Co-Authored-By line. Branch `moderation-ux-redesign`. Work autonomously; do not ask questions. Husky runs Biome on staged files.

**Goal:** Retire the dead moderation surfaces now that the tabbed page (Moderate + Configure) replaces them: redirect the old deep-link routes into the new page, delete the orphaned view components and the old per-action dialogs, apply the small deferred polish nits from earlier phases, and document the two backend coordination asks (do NOT make unsupervised production backend changes).

**Architecture:** Each obsolete route's `page.tsx` becomes a server-side `redirect()` to the tabbed page (preserves bookmarks); its `*-view.tsx` is deleted. The **action files** under those routes' `actions/` dirs are KEPT where the new Configure/inbox surfaces still import them — verify importers before deleting anything. The old dialogs (`verdict-dialog`, `exclude-dialog`, `include-dialog`, `reason-modal`) are deleted once grep confirms no importers remain.

**Spec:** §13 (backend asks), §14 (migration). Plus the deferred polish: Phase 1 review nits (RunActionDialog a11y + Approve/Restore toast counts) and the Phase 3 nudge-threshold consistency note.

**Prerequisite:** Phases 1–4 merged.

---

## Important: what stays vs goes

**STAYS (live surfaces / reused code):**
- `manage/moderation/page.tsx`, `moderation-tabs.tsx`, `attention/*`, `configure/*`, `shared/run-action-dialog.tsx`, `shared/action-model.ts`, `shared/manual-time-dialog.tsx` (the "Add time" verb), `shared/time-format.ts`.
- `roster/roster-view.tsx` + `roster/page.tsx` + `roster/actions/load-roster.action.ts` — the live board mod-mode (drill-down target). KEEP.
- `runner/[userId]/runner-view.tsx` + `page.tsx` — the live runner view. KEEP.
- All `actions/*.action.ts` still imported by the new surfaces: `policies/actions/policies-actions.action.ts` (Standards), `rules/actions/delete-rule.action.ts` (Active bans), `log/actions/undo.action.ts` (History), `shared/actions/{exclude,verdicts,manual-times,restore}.action.ts` (RunActionDialog + Add time), `roster/actions/load-roster.action.ts`. **Verify each with grep before assuming dead.**

**GOES (orphaned views + routes the tabs replaced):**
- `moderation-hub.tsx` (page.tsx renders tabs now — confirm nothing imports `ModerationHub`).
- View components: `queue/queue-view.tsx`, `reports/reports-view.tsx`, `manual-times/manual-times-view.tsx`, `rules/rules-view.tsx`, `policies/policies-view.tsx`, `log/log-view.tsx`.
- Old dialogs: `shared/verdict-dialog.tsx`, `shared/exclude-dialog.tsx`, `shared/include-dialog.tsx`, `shared/reason-modal.tsx` — **only after grep shows zero importers.**

---

## Task 1: Redirect obsolete routes + delete orphaned views

**Files:** modify the `page.tsx` of `queue/`, `reports/`, `manual-times/`, `rules/`, `policies/`, `log/`; delete their `*-view.tsx`.

- [ ] **Step 1:** For each of those six routes, replace the body of `page.tsx` with a redirect to the tabbed page. Keep it a server component:
```tsx
import { redirect } from 'next/navigation';

export default async function Page({
    params,
}: { params: Promise<{ game: string }> }) {
    const { game } = await params;
    redirect(`/games-v2/${game}/manage/moderation`);
}
```
(Use the exact `params` shape the existing page used.) This preserves any bookmarked deep links by sending them to the new home.

- [ ] **Step 2:** Delete the six orphaned `*-view.tsx` files. Before each deletion, `grep -rn "QueueView\|ReportsView\|ManualTimesView\|RulesView\|PoliciesView\|LogView" "app/(new-layout)/games-v2/[game]/manage/moderation"` and confirm the only references are the (now-redirecting) page.tsx you just rewrote. Remove the import from each page.tsx.
- [ ] **Step 3:** KEEP each route's `actions/` dir. Verify they're still imported by the new surfaces (`grep -rn "policies-actions\|delete-rule\|undo.action\|load-roster\|queue-actions"`); if any `actions/*.action.ts` has NO importer (e.g. `queue/actions/queue-actions.action.ts`, `reports/...`, `manual-times/...` management-only actions), delete those specific dead action files too. Report which you deleted vs kept.
- [ ] **Step 4:** `npm run typecheck && npm run lint && npm run build`. Commit: `refactor(moderation): redirect obsolete routes into tabbed page; drop orphaned views`.

---

## Task 2: Delete the moderation hub + old dialogs

**Files:** delete `moderation-hub.tsx`, `shared/verdict-dialog.tsx`, `shared/exclude-dialog.tsx`, `shared/include-dialog.tsx`, `shared/reason-modal.tsx`.

- [ ] **Step 1:** `grep -rn "moderation-hub\|ModerationHub\|verdict-dialog\|VerdictDialog\|exclude-dialog\|ExcludeDialog\|include-dialog\|IncludeDialog\|reason-modal\|ReasonModal" app src` — confirm ZERO importers for each (the queue/reports/roster/runner consumers were removed in Phases 2–4 / Task 1). If any importer remains, STOP and report it (don't force-delete a live dependency).
- [ ] **Step 2:** Delete the confirmed-orphan files. `npm run typecheck && npm run lint && npm run build`. Commit: `refactor(moderation): delete moderation hub + superseded per-action dialogs`.

---

## Task 3: Apply deferred polish nits

**Files:** `shared/run-action-dialog.tsx`.

- [ ] **Step 1 (a11y):** Add `aria-modal="true"` and `aria-labelledby="run-action-title"` to the modal `div`, give the title `<h5>` `id="run-action-title"`, and add an `onKeyDown` Escape-to-close handler on the modal root (call `onClose` when not `isConfirming`). (The other dialogs are being deleted, so only this one needs it.)
- [ ] **Step 2 (toast counts):** For `approve` and `restore`, include the affected-run count in the success toast when available. Approve uses `applyVerdictsAction` whose result has `affectedRunCount` — surface it (e.g. "Approved — 3 runs updated."). Restore goes through `restoreRunsAction` which currently returns `{ ok: true }`; if extending it to return a count is more than a couple lines, leave Restore's toast as "Restored." (acceptable) — do NOT expand the backend contract for this.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm run build`. Commit: `polish(moderation): RunActionDialog a11y + approve toast count`.

---

## Task 4: Backend coordination asks — document, do NOT deploy

The two backend asks (spec §13: batched notifications on bulk loud-Remove; policy-write gating to board-admin) are intentionally NOT implemented as unsupervised production changes while the owner is away. The frontend already degrades gracefully (notifications are backend-emitted; the Standards editing gate is enforced client-side).

- [ ] **Step 1:** Append a clear "Backend handoff (not yet done)" section to `docs/superpowers/MODERATION_FRONTEND_STATUS.md` restating the two asks from spec §13 with the exact endpoints/behavior, and noting they are ready for the owner to implement+deploy in `../therun`. Do not edit `../therun`.
- [ ] **Step 2:** Commit: `docs(moderation): record Phase 5 cleanup + backend handoff asks`.

---

## Self-Review checklist
- Every obsolete route redirects to the tabbed page (no 404 for old bookmarks); orphaned views deleted; reused action files preserved (verified by grep), dead ones removed.
- Hub + four old dialogs deleted only after zero-importer confirmation.
- `npm run build` clean; no new typecheck/lint errors vs baseline.
- A11y + toast polish applied to the one surviving dialog.
- Backend asks documented as handoff, NOT deployed.
- The whole moderation experience now = one button → Moderate (inbox + drill to board/runner) + Configure (Standards/bans/History). Nine pages gone.
