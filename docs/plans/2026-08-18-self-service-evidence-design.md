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

## Backend contract (no new API route)

The `api` CFN stack is at its resource cap (one slot left, reserved), so this
adds **no new route** — it extends existing `/v1/me/...` endpoints with the
evidence/description fields and enforces the rule inside them.

> The exact existing endpoints/handlers are being confirmed against the code;
> this section states the intended shape. The three moving parts are fixed:

### Finished runs — owner sets vod/description on own run

- Ride a `/v1/me/runs/{runId}` self endpoint (extend the existing self-run
  path used for restore/verdict, or its handler) to accept
  `{ vodUrl?: string | null, description?: string | null }`.
- Server enforces: `run.userId === callerId` AND `verificationStatus !==
  'verified'`; a mod uses the existing `editRun` (unchanged). Description also
  checks the per-category revoke. `vodUrl` normalized/validated (reuse the
  submission URL validation, http(s), ≤ 500 chars). Writes a self-edit audit
  row.
- 403 (not owner / verified / revoked-for-description) with a clear message
  the UI can show.

### Set times — owner sets evidence/description on own manual time

- Ride `/v1/me/manual-times` (or a `/v1/me/manual-times/{id}` self edit) to
  accept an **evidence-and-description-only** edit that does NOT require
  re-entering the time. Same ownership + not-verified + revoke enforcement.
- This supersedes the "re-submit the whole time to change the link" workaround.

### Reads

`RunDetail` and the manual-time detail already return `vodUrl`/`evidenceUrl`,
`description`, `verificationStatus`, and `userId` — enough for the UI to
compute `canEdit*` and render current values. No read change expected beyond
confirming `userId` + `description` are present on both detail types.

## Frontend

- **`useCanEditEvidence(detail, session)`** — one hook returning
  `{ canEditVod, canEditDescription, reason }` from the rule above (owner =
  `detail.userId === session.userId`; verified = `verificationStatus ===
  'verified'`; mod = existing `canModerateGame`; revoke flag from the detail
  or a lightweight check). The server is the source of truth; this only
  decides what to render.
- **`EvidenceEditor`** — a shared owner/mod control: shows the VOD (embed or
  link) + description, with inline add/edit when `canEdit*`, a lock note when
  verified ("Verified — locked. Ask a moderator to change evidence."), and a
  revoke note for description when revoked. Wraps the existing `Vod` embed and
  the markdown description renderer.
- **Wiring:** drawer owner mode (`RunInspector`/`ManualInspector`) mounts it;
  the run page + set-time page mount it in place of today's read-only VOD/desc
  blocks. Mutations go through new owner server actions (`self-attach-vod`,
  `self-set-description`) that call the me/ endpoints; mod mutations keep using
  `attachVodAction`/`editRun` (now branched on run type — see the runId/set-time
  fix already shipped).

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
