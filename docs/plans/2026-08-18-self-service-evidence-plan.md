# Self-service Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Let a runner add/edit VOD + description on their own run (set time or finished run) while it is unverified; verified locks the owner out; mods always edit; per-category description-revoke overrides for the owner. Available in the inspector drawer and on the run page.

**Architecture:** A new server-side guard `assertOwnerMayEditEvidence` (owner ∧ not-verified [∧ not-revoked for description]) enforced by new `/v1/me/...` self endpoints on the moderation greedy-proxy (zero CFN cost). Frontend: one `EvidenceEditor` + `useEvidencePermissions` hook mounted on all four surfaces; `ManualInspector` gains an owner mode.

**Tech Stack:** Node Lambda + Drizzle (backend, no zod, vitest unit = pure only), Next.js 16 / React 19 / vitest + jsdom (frontend), Biome.

**Spec:** `docs/plans/2026-08-18-self-service-evidence-design.md` (read first).

## Global Constraints

- `/v1/me/*` is a greedy `{proxy+}` (`moderation-stack.ts:40`) → new subpaths cost NO CloudFormation; add via a `handleMe` regex branch (`src/api/me/handler.ts`) only. Do NOT touch `aws/lib/api-stack.ts` (at 496/500).
- Path ids on `/mod`/`/v1/me` routes MUST be parsed from `event.path`, never `event.pathParameters` (the proxy binds only `pathParameters.proxy`) — use `pathIdStr`/`idFromPath` from `src/api/leaderboards/path-id.ts` (shipped commit 20d3dce).
- Backend: manual `typeof` validation (no zod). Unit tests are pure-function only (`test/unit/**`, `npm test`); extract pure logic to test it.
- Permission rule (server-authoritative): `canEditVod = isMod OR (isOwner AND status!=='verified')`; `canEditDescription = canEditVod AND (isMod OR NOT descriptionRevoked(owner, categoryId))`. Guests: mod-only.
- Reuse existing helpers: URL validation `src/leaderboards/submissions/validate-submission.ts` (http(s), ≤500 chars); `normalizeDescription`; `getDescriptionRestriction` (`src/services/run-description.ts:71`); caller resolution `resolveCaller` (`src/api/me/manual-time.ts:26`).
- Frontend: Biome (4-space, single quotes, trailing commas, semicolons); `_`-prefix unused. typecheck/lint NOT clean repo-wide — gate on "no NEW errors in touched files". Root `types/` import depth: files under `leaderboard/vod-review/`-depth use 6 `../`; `actions/` & `leaderboard/` direct = 5; `src/lib/` = 2. Verify by typecheck.
- Never push frontend main. Branches: backend + frontend `self-service-evidence` (already created; design docs committed). Backend merge to main = deploy (Joey's call at the end).
- Kill any dev server you start. Do not run real-AWS/deploy commands.

---

# Part A — Backend (`/home/joey/therun/therun`, branch `self-service-evidence`)

### Task A1: shared owner-evidence guard (pure) + verified-lock on existing owner paths

**Files:**
- Create: `src/services/evidence-permissions.ts`
- Test: `test/unit/services/evidence-permissions.test.ts`
- Modify: `src/api/leaderboards/run-mgmt-handler.ts` (`applyOwnerDescription` ~:500 / `isOwnerDescriptionOnlyEdit` ~:485 — add verified-lock)
- Modify: `src/api/me/manual-time.ts` (`updateOwnManualTimeDescription` ~:91 — add verified-lock)

**Interfaces:**
- Produces: `type EvidenceActor = { callerId: number; isMod: boolean }`; `type EvidenceRun = { userId: number | null; verificationStatus: string }`; `evidenceEditDecision(run, actor, opts: { field: 'vod' | 'description'; descriptionRevoked?: boolean }): { ok: true } | { ok: false; reason: string; code: 'not_owner' | 'verified' | 'revoked' }`.

- [ ] **Step 1: failing tests**

```ts
// test/unit/services/evidence-permissions.test.ts
import { describe, expect, it } from "vitest";
import { evidenceEditDecision } from "../../../src/services/evidence-permissions";
const run = (over = {}) => ({ userId: 7, verificationStatus: "pending", ...over });
const owner = { callerId: 7, isMod: false };
const other = { callerId: 9, isMod: false };
const mod = { callerId: 9, isMod: true };

describe("evidenceEditDecision", () => {
    it("owner may edit vod on an unverified own run", () => {
        expect(evidenceEditDecision(run(), owner, { field: "vod" })).toEqual({ ok: true });
    });
    it("owner is locked out of a verified run (vod and description)", () => {
        expect(evidenceEditDecision(run({ verificationStatus: "verified" }), owner, { field: "vod" }))
            .toEqual({ ok: false, code: "verified", reason: expect.any(String) });
        expect(evidenceEditDecision(run({ verificationStatus: "verified" }), owner, { field: "description" }).ok).toBe(false);
    });
    it("mod may always edit, even a verified run", () => {
        expect(evidenceEditDecision(run({ verificationStatus: "verified" }), mod, { field: "vod" })).toEqual({ ok: true });
        expect(evidenceEditDecision(run({ verificationStatus: "verified" }), mod, { field: "description", descriptionRevoked: true })).toEqual({ ok: true });
    });
    it("non-owner non-mod is rejected", () => {
        expect(evidenceEditDecision(run(), other, { field: "vod" })).toEqual({ ok: false, code: "not_owner", reason: expect.any(String) });
    });
    it("revoked owner cannot edit description but can edit vod", () => {
        expect(evidenceEditDecision(run(), owner, { field: "description", descriptionRevoked: true }))
            .toEqual({ ok: false, code: "revoked", reason: expect.any(String) });
        expect(evidenceEditDecision(run(), owner, { field: "vod", descriptionRevoked: true })).toEqual({ ok: true });
    });
    it("guest run (userId null) is never owner-editable", () => {
        expect(evidenceEditDecision(run({ userId: null }), owner, { field: "vod" }).ok).toBe(false);
    });
});
```

- [ ] **Step 2:** `npx vitest run --project unit test/unit/services/evidence-permissions.test.ts` → FAIL (module missing).

- [ ] **Step 3: implement**

```ts
// src/services/evidence-permissions.ts
export type EvidenceActor = { callerId: number; isMod: boolean };
export type EvidenceRun = { userId: number | null; verificationStatus: string };
export type EvidenceField = "vod" | "description";
export type EvidenceDecision =
    | { ok: true }
    | { ok: false; code: "not_owner" | "verified" | "revoked"; reason: string };

/** The one rule. Mods always pass. Owners pass iff not verified (and, for
 *  description, not revoked). See the design doc. */
export function evidenceEditDecision(
    run: EvidenceRun,
    actor: EvidenceActor,
    opts: { field: EvidenceField; descriptionRevoked?: boolean },
): EvidenceDecision {
    if (actor.isMod) return { ok: true };
    if (run.userId == null || run.userId !== actor.callerId) {
        return { ok: false, code: "not_owner", reason: "This isn't your run." };
    }
    if (run.verificationStatus === "verified") {
        return { ok: false, code: "verified", reason: "This run is verified — ask a moderator to change its evidence." };
    }
    if (opts.field === "description" && opts.descriptionRevoked) {
        return { ok: false, code: "revoked", reason: "You can't add a description on this category." };
    }
    return { ok: true };
}
```

- [ ] **Step 4:** tests pass.

- [ ] **Step 5: add verified-lock to the two existing owner paths.** In `run-mgmt-handler.ts` `applyOwnerDescription` (and/or the `isOwnerDescriptionOnlyEdit` gate), before writing, call `evidenceEditDecision(run, { callerId: actorUserId, isMod: false }, { field: 'description', descriptionRevoked: <existing revoke check result> })` and return `forbidden(reason)` when `!ok`. Keep the existing revoke check (it already blocks adding); route it through the decision so verified is now also blocked. In `manual-time.ts` `updateOwnManualTimeDescription`, likewise gate on the decision (load `existing.verificationStatus`, `existing.userId`).

- [ ] **Step 6:** `npm test` green; `npx tsc --noEmit` no new errors in touched files. Commit `feat(self-service): owner-evidence permission guard + verified-lock on existing owner-description paths`.

---

### Task A2: `POST /v1/me/runs/{runId}/evidence` (finished-run owner vod+description)

**Files:**
- Create: `src/api/me/run-evidence.ts`
- Modify: `src/api/me/handler.ts` (dispatch branch)
- Test: `test/unit/api/me/run-evidence-validate.test.ts` (pure body-validation helper only)

**Interfaces:**
- Consumes: `evidenceEditDecision` (A1), `path-id` `pathIdStr`, `resolveCaller`, `getDescriptionRestriction`, `validateSubmissionUrl` (from `validate-submission.ts` — confirm export name), `normalizeDescription`.
- Produces: `handleSelfRunEvidence(event)`; request `{ vodUrl?: string | null; description?: string | null }`; response `{ ok: true }`. Route: `POST /v1/me/runs/{runId}/evidence`.

- [ ] **Step 1:** In `handler.ts`, add a branch mirroring the verdict one (`:15`): `if (/\/me\/runs\/\d+\/evidence$/.test(path) && method === "POST") return handleSelfRunEvidence(event);`.

- [ ] **Step 2: implement `run-evidence.ts`** — resolve caller (`resolveCaller`), parse runId via `pathIdStr(undefined, event.path, "runs")` (proxy!), load the finished run (userId, verificationStatus, categoryId), then for EACH field present in the body: compute `descriptionRevoked = await getDescriptionRestriction(db, callerId, run.categoryId)` (only needed when description present), call `evidenceEditDecision(run, { callerId, isMod: false }, { field, descriptionRevoked })`, `return forbidden(reason)` on `!ok`. Validate `vodUrl` (http(s), ≤500; explicit `null` clears) and `normalizeDescription(description)`. Update `finished_runs` (only sent fields). Write audit log `edit-own-evidence`/`finished_run`. Return `ok({ ok: true })`. Extract the pure body-shape validation (url + description length, field presence) into a helper for the unit test.

- [ ] **Step 3: pure validation test** — assert: rejects a non-http(s) vodUrl, rejects >500-char vodUrl, accepts `null` (clear), accepts description ≤ limit, rejects over-limit; presence detection (`'vodUrl' in body`).

- [ ] **Step 4:** `npm test` + tsc clean. Commit `feat(self-service): POST /v1/me/runs/{runId}/evidence — owner sets vod+description, verified-locked`.

---

### Task A3: set-time owner evidence/description edit on an existing manual time

**Files:**
- Modify: `src/api/me/manual-time.ts` (`handleSelfManualTime` — add an existing-time evidence/description edit branch), `src/repositories/manual-times.ts` if a targeted update helper is cleaner.
- Test: extend `test/unit/...` with the pure branch-selection / validation if extracted.

**Interfaces:**
- New behavior on `POST /v1/me/manual-times` (or `POST /v1/me/manual-times/{id}/evidence`): body `{ manualTimeId, evidenceUrl?, description? }` with `timeMs === undefined` and at least one of evidenceUrl/description present → owner evidence edit (today only `description` is handled on the existing-time branch; add `evidenceUrl`). Enforce `evidenceEditDecision` (load existing userId + verificationStatus + categoryId). `null` clears.

- [ ] **Step 1:** Extend the existing `updateOwnManualTimeDescription` dispatch (`manual-time.ts:150`) OR add a sibling `updateOwnManualTimeEvidence` that accepts evidenceUrl+description, both gated on `evidenceEditDecision`. Preserve the description-only behavior; add evidenceUrl handling + verified-lock (A1 already added the verified-lock to description; keep consistent).

- [ ] **Step 2:** `npm test` + tsc clean. Commit `feat(self-service): owner can edit evidenceUrl+description on an existing set time, verified-locked`.

---

### Task A4: reads — `description` on both details + caller's description-revoked flag

**Files:**
- Modify: run-detail (`src/api/leaderboards/handler.ts` handleRunDetail select+result) and manual-time-detail (`manual-time-detail-handler.ts`) — ensure `description` is returned; add `descriptionRevoked` (per-caller, per-category) when the request is authenticated as the owner (else omit/false).

- [ ] **Step 1:** Add `description` to both select+result if missing. For `descriptionRevoked`: when the detail read carries a bearer token whose user owns the run, compute `getDescriptionRestriction(db, ownerId, categoryId)` and return a boolean; unauthenticated/other → `false`/absent. Keep the public cached read unchanged (only the authed viewer path computes it, like `getRunByIdAsViewer`).

- [ ] **Step 2:** tsc + `npm test`. Commit `feat(self-service): detail reads expose description + caller description-revoked flag`.

---

### Task A5: frontend guide + (later) merge

- [ ] Write `docs/frontend-guide-self-service-evidence.md`: the rule, the two new endpoints + bodies, the reason strings, the read fields. Commit. Do NOT push/merge (controller handles at the end).

---

# Part B — Frontend (`/home/joey/therun/therun-fr`, branch `self-service-evidence`)

### Task B1: types + `useEvidencePermissions` hook (pure) + tests

**Files:**
- Modify: `types/moderation.types.ts` (`SelfManualTimeInput.description?: string`), `types/leaderboards.types.ts` (`RunDetail.description?`, `ManualTimeDetail.description?`, both `descriptionRevoked?: boolean` — mirror A4).
- Create: `app/(new-layout)/games-v2/[game]/shared/use-evidence-permissions.ts` + `.test.ts`.

**Interfaces:**
- Produces: `evidencePermissions(input: { ownerUserId: number | null; verificationStatus: string; isGuest: boolean; descriptionRevoked?: boolean; sessionUserId: number | null; isMod: boolean }): { canEditVod: boolean; canEditDescription: boolean; lockedReason: string | null }` (pure; the hook is a thin wrapper). Mirror the backend rule EXACTLY (owner = sessionUserId===ownerUserId && !isGuest; verified locks owner; revoke blocks description for owner; mod always).

- [ ] **Step 1:** failing test — the same truth table as A1 (owner/other/mod × verified/pending × field × revoked), asserting `canEditVod`/`canEditDescription`/`lockedReason`.
- [ ] **Step 2–4:** implement the pure fn + hook; tests pass; tsc clean. Commit.

---

### Task B2: `EvidenceEditor` component + tests

**Files:** create `app/(new-layout)/games-v2/[game]/shared/evidence-editor.tsx` (+ `.module.scss`, `.test.tsx`).

**Interfaces:**
```tsx
interface EvidenceEditorProps {
    vodUrl: string | null;
    description: string | null;
    perms: { canEditVod: boolean; canEditDescription: boolean; lockedReason: string | null };
    onSaveVod: (url: string | null) => Promise<{ ok: true } | { error: string }>;
    onSaveDescription: (text: string | null) => Promise<{ ok: true } | { error: string }>;
}
```
- Renders the `Vod` embed/link + markdown description; when `canEditVod`, an edit/paste affordance (reuse the EvidenceSection form idiom); when `canEditDescription`, a description editor; when `!canEdit*` shows read-only + `lockedReason` note if present. Optimistic local state, error surfacing (toast/inline).

- [ ] Tests (jsdom): edit affordances appear only when `canEdit*`; lockedReason renders when present; save callbacks fire with the typed values; verified state hides edit and shows the lock note. Commit.

---

### Task B3: owner server actions

**Files:** create `src/actions/self-evidence.action.ts` (or under leaderboard `actions/`): `selfSetEvidenceAction(runId, { vodUrl?, description? })` → `meFetch POST /v1/me/runs/{runId}/evidence`; `selfSetManualEvidenceAction(manualTimeId, { evidenceUrl?, description? })` → me/manual-times evidence edit. Add `description` to `self-service.ts` `selfCreateManualTime` input plumbing. Mock-based `.test.ts` asserting exact bodies + `ModError → {error}`.

- [ ] TDD, commit.

---

### Task B4: run view + set-time page wiring

**Files:** modify `run-view/run-actions.tsx` (or the run-view container) and `manual/[manualTimeId]/page.tsx`.
- Compute `evidencePermissions` from the detail + session (+ `canModerateGame` for isMod), mount `EvidenceEditor` wired to the owner actions (owner) — mod edits still go through the existing mod path branched on run type. Replace the read-only vod/description blocks.

- [ ] Add/extend tests for the owner-visible editor on an unverified own run; locked on verified; absent for a stranger. Commit.

---

### Task B5: RunInspector owner-mode editor + mod branch-on-type

**Files:** modify `leaderboard/run-inspector.tsx` (`EvidenceSection` / owner mode), and the mod attach path to branch on `source`.
- Owner mode: render `EvidenceEditor` (via permissions) instead of the stripped read-only block. Mod mode: keep `attachVodAction` but branch — set time → `manualTimeId`/`updateManualTime`, run → `runId`/`editRun` (kills the `entry.runId as number` fragility flagged in the bug trace).

- [ ] Extend owner tests; commit.

---

### Task B6: ManualInspector owner mode + pager wiring

**Files:** modify `leaderboard/manual-inspector.tsx` (add `mode: 'mod' | 'owner'`), `leaderboard-pager.tsx` (open an owner ManualInspector for an owner's own set-time row, mirroring how RunInspector owner mode is opened).
- Owner mode shows `EvidenceEditor` + the owner verbs it already supports (restore/remove parity with RunInspector owner mode); hides mod verbs.

- [ ] Tests: owner opening own set time sees the editor, not mod verbs; a mod still sees mod verbs. Commit.

---

### Task B7: browser pass + push

- [ ] Kill any stray dev server first (`ps -eo pid,args | grep "next dev"`). Start `npm run dev`. Verify against the deployed backend branch (if merged) OR note persistence is unverifiable until backend deploys.
- [ ] Check (dark/light): owner adds a vod + description to own unverified timer run (drawer + run page) and own set time; verified run shows the lock note and no editor; a mod still edits a verified run; a description-revoked runner can add a vod but not a description. Kill dev server.
- [ ] Update the design doc status; push both branches. Do NOT open PRs / merge (Joey).

---

## Self-review notes

- Spec coverage: guard+verified-lock (A1), finished-run owner vod+desc (A2), set-time owner evidence-on-edit (A3), reads+revoke flag (A4), FE permissions (B1), editor (B2), actions (B3), run/set-time pages (B4), RunInspector (B5), ManualInspector owner mode (B6). Revoke-overrides-description encoded once in `evidenceEditDecision` and mirrored in `evidencePermissions`.
- Backend/frontend rule parity is the top risk — A1 and B1 share the identical truth-table test on purpose.
- Reuses shipped `path-id` helper (proxy runId), existing URL/description validators, existing `Vod` embed + markdown renderer.
