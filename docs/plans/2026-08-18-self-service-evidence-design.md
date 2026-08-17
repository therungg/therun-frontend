# Self-service VOD + description — owner edits until verified

Date: 2026-08-18
Repos: therun-backend (self endpoints + verified-lock), therun-frontend (owner controls on drawer + run page)
Status: DESIGN — requirements confirmed in conversation 2026-08-18.

## Problem

Today a runner cannot attach a video or write a description on their **own**
finished (timer) run — `editRun` (`PUT /v1/leaderboards/runs/{runId}`) is
moderator-gated, and the run inspector strips the attach control in owner mode
("a moderator has to add the link for you"). Set-time evidence is only
self-editable via a clunky full re-submit. Descriptions already have a
self-authoring path, but it isn't surfaced consistently. Runners should be
able to manage their own evidence — until the run is verified, at which point
the evidence is locked (only mods can touch a verified run).

## The one rule

A single permission predicate governs both fields, enforced **server-side**
and mirrored in the UI:

```
canEditVod(run, actor)         = isMod(actor, game)
                               OR (actor.id === run.ownerUserId AND run.verificationStatus !== 'verified')

canEditDescription(run, actor) = canEditVod(run, actor)
                               AND (isMod(actor, game) OR NOT descriptionRevoked(actor, run.categoryId))
```

- **Add (field empty) and edit (field set)** use the same rule — there is no
  separate "add" permission.
- **Verified locks the owner out** of both fields. Mods are never locked.
- **Description-revoke overrides** for the owner: a runner whose description
  privilege was revoked for that category cannot add/edit a description even
  on an unverified run. Revoke never blocks a mod, and never blocks VOD.
- Applies uniformly to **set times** and **finished runs**.

Guests (no account) have no owner path — mod-only, as today.

## Surfaces

Every interface that moderates a run gains the owner-or-mod editor:

1. **Inspector drawer (the sidebar)** — `RunInspector` (finished runs) and
   `ManualInspector` (set times). Owner mode currently shows evidence
   read-only; it gains add/edit for VOD + description when `canEdit*` holds.
2. **Run page** — the finished-run page and the set-time page (`/manual/{id}`)
   have **no** VOD/description editor today; both gain one, owner or mod.

The control is the same component in all four places (two inspectors × two
run types is really one "evidence editor" keyed on run type + a `canEdit`
decision), so the UI can't drift between surfaces.

## Backend contract (zero new CloudFormation cost)

`/v1/me/*` is served by the moderation `LambdaRestApi` (`aws/lib/moderation-stack.ts:40`),
a greedy `{proxy+}` — the **api-stack 500-resource cap does not apply here**.
New `/v1/me/...` subpaths cost **no** CloudFormation resources: they're added
by (1) a regex branch in `handleMe` (`src/api/me/handler.ts`) and (2) api-entry
already routing `/v1/me` there. So we add clean, purpose-built self endpoints
rather than overloading mod routes.

### The shared guard (new — does not exist today)

Add `assertOwnerMayEditEvidence(run, callerId)` used by every owner path:
`run.userId === callerId` (403 "not your run") AND
`run.verificationStatus !== 'verified'` (403 "verified — locked"). Description
adds `NOT descriptionRevoked(callerId, run.categoryId)`
(`getDescriptionRestriction`, `src/services/run-description.ts:71`). Mods never
hit this guard — they use the existing mod routes.

There is **no verified-lock anywhere today**; owner self-edit paths key only on
ownership. This guard is the feature's spine.

### Finished runs — new `POST /v1/me/runs/{runId}/evidence`

- Body `{ vodUrl?: string | null, description?: string | null }`; presence-based
  (only sent fields change; explicit `null` clears).
- Enforces the shared guard. `vodUrl` validated (reuse
  `validate-submission.ts` URL check: http(s), ≤ 500 chars). `description`
  normalized (`normalizeDescription`) + revoke-checked. Writes an
  `edit-own-evidence` audit row on `finished_runs`.
- Fixes the gap: today an owner can self-edit **description** only (via a narrow
  owner branch inside the mod `PUT .../runs/{runId}` — `handleEditRun:485/500`,
  which also **lacks the verified check**), and **cannot** set `vodUrl` at all.
  This endpoint gives owners `vodUrl` and adds the verified-lock. The old
  owner-description branch in `handleEditRun` gets the same verified-lock (or is
  routed through the shared guard) so descriptions can't be edited on a verified
  run either.

### Set times — extend `/v1/me/manual-times` with an evidence/description edit

- Today: owner sets `evidenceUrl`+`description` on **create** (upsert), and
  `description`-only on an **existing** time (`updateOwnManualTimeDescription`,
  `manual-time.ts:91`, ownership-checked, **no verified check**). There is **no**
  owner path to edit `evidenceUrl` on an existing time.
- Add an existing-time edit that accepts `{ evidenceUrl?, description? }` (no
  time re-entry), enforcing the shared guard. Give `updateOwnManualTimeDescription`
  the verified-lock too. Dispatched on `handleSelfManualTime` by body shape, or
  a `/v1/me/manual-times/{id}/evidence` subpath — both free on the proxy.

### Reads

`RunDetail` (has `userId`, `vodUrl`, `verificationStatus`) and `ManualTimeDetail`
(has `userId`, `evidenceUrl`, `verificationStatus`) already carry what the UI
needs. Confirm/add `description` on both detail responses, and expose the
per-category **description-revoked** flag for the caller (so the UI can show the
revoke note without a second call) — either on the detail payload or via the
existing eligibility read.

## Frontend

Everything is greenfield — there is **no** owner-facing VOD or description
editor on the run view (`run-actions.tsx`), the run inspector
(`EvidenceSection` is `editable={!ownerMode}`), or the manual inspector
(mod-only, no `mode` prop). Insertion points are clean.

- **`useEvidencePermissions(detail, session, isMod)`** — one hook returning
  `{ canEditVod, canEditDescription, lockedReason }`. owner =
  `detail.userId === session.userId && !isGuest`; verified =
  `verificationStatus === 'verified'`; mod = `canModerateGame`; revoke from the
  detail's revoked flag. `lockedReason` is the message to show when an owner is
  blocked (verified vs description-revoked). Server is the source of truth;
  this only decides what to render.
- **`EvidenceEditor`** — one shared control used in all four surfaces: renders
  the VOD (existing `Vod` embed / link) + description (existing markdown
  renderer), with inline add/edit when `canEdit*`; a lock note when verified
  ("Verified — locked. Ask a moderator to change evidence."); a revoke note on
  description when revoked. Reused so the surfaces can't drift.
- **New owner server actions** (`src/actions/` or the leaderboard `actions/`):
  `selfSetEvidenceAction` (finished run → `POST /v1/me/runs/{runId}/evidence`)
  and `selfSetManualEvidenceAction` (set time → me/manual-times evidence edit),
  via `meFetch`. Add `description` to `SelfManualTimeInput`
  (`types/moderation.types.ts:596`, currently missing it).
- **Wiring:**
  - **Run view** (`run-actions.tsx` / run-view): mount `EvidenceEditor` for
    finished runs (owner or mod). **Set-time page** (`/manual/{id}`): mount it
    for set times — both have no editor today.
  - **RunInspector**: owner mode swaps the display-only `EvidenceSection` for
    `EvidenceEditor` when `canEdit*` (keeps mod behavior as-is).
  - **ManualInspector**: gains a `mode: 'mod' | 'owner'` prop (it's mod-only
    today) so an owner opening their own set time gets the `EvidenceEditor`.
    This is the one structural change on the frontend — the pager must open an
    owner ManualInspector for an owner's own set-time row.
- **Mod attach still branches on run type** (the fix begun with the shipped
  `/mod` runId hotfix): the mod evidence control uses `manualTimeId` for set
  times, `runId` for finished runs — never the `entry.runId as number` cast.

## Interactions with existing behavior

- The just-shipped `/mod`-proxy `runId` fix (commit `20d3dce`) makes the mod
  attach path work again; this feature adds the **owner** path beside it.
- The mod attach control must branch on `source === 'manual'` (set time →
  `manualTimeId`, run → `runId`) rather than the `entry.runId as number` cast —
  folded in here so both roles use the correct endpoint per run type.
- Verified runs: the owner editor renders read-only with the lock note; the
  mod editor stays editable.
- A pending → verified transition (mod verifies) immediately locks the owner
  editor on next load (server enforces regardless of a stale client).

## Out of scope

- No change to who can *verify*.
- No change to the VOD-review frame-stepping workbench (mods only, verified or
  not — verification tooling, not evidence authoring).
- No bulk/self-verify.

## Testing

- Backend: unit tests for the permission predicate (owner+unverified allow,
  owner+verified deny, mod always allow, revoked-description deny for owner but
  vod still allowed, guest deny); handler enforcement covered by the predicate
  + integration smoke.
- Frontend: `useCanEditEvidence` truth table; `EvidenceEditor` renders
  edit vs lock vs revoke states; owner action wiring.
- Browser pass (post-deploy): owner adds a vod to own unverified timer run and
  own set time; verified run shows locked; mod still edits a verified run;
  revoked runner can add vod but not description.
