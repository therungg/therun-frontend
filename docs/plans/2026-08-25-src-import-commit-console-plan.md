# SRC Import Commit Console + SRC-only Leaderboard — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the minimal commit console for the SRC import (apply-config → import-runs → undo, with per-phase progress), and layer the "Only use the speedrun.com leaderboard" checkbox + reconcile / reconcile-undo controls on top.

**Architecture:** Extend the existing dry-run pane (`app/(new-layout)/games-v2/[game]/manage/src-import/`). A new `CommitPanel` reads the job's `commitStatus`/`commitPhase`/`configAppliedAt`/`runsImportedAt`/`srcOnlyLeaderboard` and renders one primary action per state (state machine in the design doc). New server actions in `src-import-actions.ts` POST each commit action through `apiFetch` with the session bearer. The plan preview is read-only; conflict resolution stays on the API.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `apiFetch` (`src/lib/api-client.ts`), server actions, SCSS modules, Vitest + Testing Library.

**Spec:** `../../../therun/docs/plans/2026-08-25-src-only-leaderboard-design.md` (backend copy authoritative) and its copy in `docs/frontend-guide-src-import.md` after the backend lands.

## Global Constraints

- Backend must ship first (this plan consumes the new API routes + `commitStatus` values `reconciling`/`reconciled` + `srcOnlyLeaderboard`). Do not merge frontend before backend is deployed.
- NEVER push to main in therun-fr. Branch + PR only. Never create the PR (push branch; Joey opens it).
- Types are hand-mirrored — update `types/src-import.types.ts` to match the backend types; verify against the backend type, not the existing frontend copy.
- Caching: any read fetcher uses `'use cache'` + `cacheLife()`/`cacheTag()`; mutations are server actions. The job poll already exists (`useSrcImportJob`) — reuse it, don't add fetch `revalidate`.
- Biome formatting (4-space, single quotes, trailing commas); unused vars prefixed `_`.
- typecheck/lint not clean on main — gate on baseline diff.
- Copy rule: never write "speedrun.com" mockingly; the 3 existing functional SRC references are deliberate — match their tone.

---

### Task 1: Mirror the new API types

**Files:**
- Modify: `types/src-import.types.ts`
- Test: none (type-only; verified by typecheck)

**Interfaces:**
- Produces: `SrcImportJob.commitStatus` widened with `'reconciling' | 'reconciled'`; `SrcImportJob.srcOnlyLeaderboard: boolean`; plus the plan/commit response types the actions need.

- [ ] **Step 1:** Open the backend types (`../../../therun/src/db/schema.ts` `SrcImportCommitStatus` + `srcImportJobs`) and `../../../therun/src/src-import/commit/types.ts` (`SrcCommitPlan`). Mirror into `types/src-import.types.ts`:
  - widen `commitStatus`, add `commitPhase?: 'config'|'runs'|'reconcile'`, `configAppliedAt?: string|null`, `runsImportedAt?: string|null`, `srcOnlyLeaderboard: boolean` on `SrcImportJob`.
  - add `SrcCommitPlan` (categories/levels/variables summaries + `conflicts` + `runs`) — copy the shape from backend `commit/types.ts`.
- [ ] **Step 2:** Run `npm run typecheck` — baseline diff clean.
- [ ] **Step 3:** Commit: `git commit -m "types(src-import): mirror commit-plan + reconcile job fields"`

---

### Task 2: Commit server actions

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/src-import/src-import-actions.ts`
- Test: none directly (exercised by Task 4/5 component tests with mocked actions)

**Interfaces:**
- Consumes: `apiFetch` (see how `startSrcImportAction` builds URL + passes session).
- Produces server actions, each returning `{ jobId: number } | { error: string }` (or the plan for `getPlan`):
  - `getSrcImportPlanAction({ gameId, gameSlug, jobId }): Promise<SrcCommitPlan | { error }>`
  - `applyConfigAction({ gameId, gameSlug, jobId })`
  - `importRunsAction({ gameId, gameSlug, jobId })`
  - `undoRunsAction({ gameId, gameSlug, jobId })`
  - `undoConfigAction({ gameId, gameSlug, jobId })`
  - `setSrcOnlyAction({ gameId, gameSlug, jobId, enabled })`
  - `reconcileAction({ gameId, gameSlug, jobId })`
  - `reconcileUndoAction({ gameId, gameSlug, jobId })`

- [ ] **Step 1:** Read `startSrcImportAction` + `getSrcImportJobAction` to copy the exact `apiFetch` call shape (base path `/v1/games/${gameId}/src-import/...`, session bearer, error → `{ error }`).
- [ ] **Step 2:** Implement each action. POST bodies: all empty except `setSrcOnlyAction` → `{ enabled }`. Plan action = `GET .../plan`. Example:
```ts
export async function applyConfigAction(input: { gameId: number; gameSlug: string; jobId: number }) {
    try {
        const res = await apiFetch<{ jobId: number }>(
            `/v1/games/${input.gameId}/src-import/${input.jobId}/apply-config`,
            { method: 'POST', sessionId: await getSessionId() }, // match existing action's session pattern
        );
        return res;
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Request failed' };
    }
}
```
(Use whatever session-passing idiom the existing actions use — copy verbatim.)
- [ ] **Step 3:** `npm run typecheck` baseline clean.
- [ ] **Step 4:** Commit: `git commit -m "feat(src-import): commit-console server actions"`

---

### Task 3: CommitPanel state machine (read-only render)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/src-import/commit-panel.tsx`
- Create/extend: `src-import.module.scss` (reuse existing `callout`, `counter`, `progress*`, `saveBtn` classes)
- Test: `app/(new-layout)/games-v2/[game]/manage/src-import/commit-panel.test.tsx`

**Interfaces:**
- Consumes: `SrcImportJob` (Task 1), the actions (Task 2), the design's state→UI table.
- Produces: `<CommitPanel job gameId gameSlug onChanged />` where `onChanged` triggers the pane's `refresh()`.

- [ ] **Step 1: Write failing render tests** — one per state, asserting the right primary control shows:
```tsx
it("shows Apply config when done + no commitStatus", () => {
  render(<CommitPanel job={job({ status: 'done', commitStatus: null })} .../>);
  expect(screen.getByRole('button', { name: /apply config/i })).toBeEnabled();
});
it("shows Import runs + the SRC-only checkbox when applied", () => { /* commitStatus:'applied' */ });
it("shows Reverse SRC-only when reconciled", () => { /* commitStatus:'reconciled' */ });
it("blocks Undo runs while reconciled with the reverse-first hint", () => { /* ... */ });
```
- [ ] **Step 2:** Run `npx vitest run .../commit-panel.test.tsx` → FAIL.
- [ ] **Step 3: Implement the state machine** per the design doc table. Map `commitStatus` → `{ primaryAction, secondaryActions, progress?, blockedReason? }`. Reuse the `JobProgress` bar pattern from `src-import-pane.tsx` for `importing`/`reconciling` (drive off `requestsMade`/`estimatedRequests` if the backend populates them for those phases; else a plain spinner + phase label). Each button calls its action then `onChanged()`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(src-import): CommitPanel state machine"`

---

### Task 4: Plan preview (read-only) + conflict block

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/src-import/plan-preview.tsx`
- Test: `plan-preview.test.tsx`

**Interfaces:**
- Consumes: `SrcCommitPlan`, `getSrcImportPlanAction`.
- Produces: `<PlanPreview gameId gameSlug jobId />` — fetches the plan on mount (via the action + a small `useState`/`useEffect`, or accept it as a prop fetched by CommitPanel), renders create/reuse/skip counts + run summary, and a conflicts list.

- [ ] **Step 1: Failing test** — given a plan with 2 conflicts, renders both `{message}` lines and a "resolve on the API" note; given 0 conflicts, renders the counts and no note.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Counts from `plan.categories/levels/variables` grouped by `action`; `plan.runs` summary (total / verified / new / guests / matched / unmappable). Conflicts → list `{kind, srcId, message}`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(src-import): read-only plan preview with conflict list"`

---

### Task 5: Wire CommitPanel into the pane + auto-reconcile

**Files:**
- Modify: `src-import-pane.tsx` (render `<CommitPanel>` after `<ReviewTabs>` when `job.status === 'done'`)
- Modify: `commit-panel.tsx` (auto-enqueue reconcile after import when the flag is set)
- Test: `src-import-pane.test.tsx` (extend)

**Interfaces:**
- Consumes: Tasks 3-4.

- [ ] **Step 1: Failing test** — when `job.status==='done'`, the pane renders CommitPanel; when `commitStatus==='imported'` and `srcOnlyLeaderboard===true` and no reconcile yet, CommitPanel fires `reconcileAction` once.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** In `src-import-pane.tsx` add `{job?.status === 'done' && <CommitPanel job={job} gameId={gameId} gameSlug={gameSlug} onChanged={refresh} />}`. In CommitPanel, an effect: if `commitStatus==='imported' && job.srcOnlyLeaderboard && !hasReconciled`, call `reconcileAction` once (guard with a ref to avoid double-fire under the poll). Update the pane lede/callout so it no longer says commit is "a later step".
- [ ] **Step 4:** Run → PASS. Then `npm run build` (or `npm run dev` smoke) to confirm the route compiles; kill any dev server started.
- [ ] **Step 5:** Commit: `git commit -m "feat(src-import): mount CommitPanel + auto-reconcile on src-only imports"`

---

### Task 6: Browser pass + docs + push

- [ ] **Step 1:** `npm run dev`, open `/games-v2/<game>/manage` → SRC import pane, walk a staged job through Apply → (check the checkbox) → Import → confirm reconcile progress → Reverse. Confirm Undo-runs is blocked while reconciled. Kill the dev server.
- [ ] **Step 2:** Update `docs/frontend-guide-src-import.md` (frontend copy) to describe the console flow.
- [ ] **Step 3:** `rm -rf .next` (significant changes), baseline typecheck/lint diff clean.
- [ ] **Step 4:** Push the branch (do NOT open the PR): `git push -u origin src-import-commit-console`. Tell Joey to open the PR.

## Self-review notes (author)

- Spec coverage: state machine (Task 3), plan preview + conflict block (Task 4), checkbox + setSrcOnly (Tasks 2-3), auto-reconcile (Task 5), reverse control + undo-runs block (Task 3), types mirror (Task 1). Covered.
- Dependency on backend: Tasks 2-5 call routes that must exist deployed. If backend is not yet deployed to the stage `NEXT_PUBLIC_DATA_URL` points at, actions 404/403 — do the browser pass (Task 6) only after backend deploy.
- Open item for the executor: confirm whether `importing`/`reconciling` phases populate `requestsMade`/`estimatedRequests` (for a real progress bar) or need a plain spinner — check the backend commit workers; the design leaves either acceptable.
