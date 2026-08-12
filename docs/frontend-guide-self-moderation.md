# Frontend guide: owner self-moderation

Backend repo is authoritative for this document; it is copied verbatim to
`therun-fr/docs/frontend-guide-self-moderation.md`. Written 2026-08-12 from
the code as built on branch `owner-self-moderation`, not from the original
spec — several things (error text, field names, the mod-placed-override
guard) changed across review rounds.

All routes below are dispatched from `src/api/me/handler.ts` and require
authentication (`Authorization: Bearer {sessionId}`). The caller is resolved
by looking up `users` by lowercased username from the session — there is no
separate "am I banned" pre-check surfaced to the frontend beyond the 403
described per-route.

**Raw path prefix:** `/v1/me/*` is reachable at
`api.therun.gg/mod/v1/me/...` — it rides the moderation stack's `mod` base
path. `meFetch` (`src/lib/moderation/mod-fetch.ts`) prepends `/mod` for you,
so callers using `meFetch` pass the unprefixed path (e.g.
`meFetch('/v1/me/anonymize', ...)`), not the full `/mod/v1/me/...` path.

## 0. The one thing every caller must know

**Every `/v1/me/*` response body is `{ "result": <data> }`.** This is
different from the mod routes, which return bare JSON — that distinction is
about which *handler family* produces the body (`src/api/me/*` vs.
`src/api/leaderboards/*`/`src/api/admin/*`), not about the raw HTTP path:
every route in this document, self-service and mod alike, sits under the
same `/mod` base path on the custom domain (see the raw-path note above).
Frontend fetchers that call `/v1/me/*` must unwrap `.result` (this is what
`meFetch` in `src/lib/moderation/mod-fetch.ts` already does — reuse it,
don't write a new fetcher that expects a bare body).

Errors are plain-text bodies (not JSON) with the status code carrying the
category:
- `400` — bad request body/query (`yourFault`)
- `403` — not authenticated, banned, not the run's owner, or a
  moderator-owned resource the caller can't touch
- `404` — not found
- `500` — unexpected server error

---

## 1. GET /v1/me/eligible-runs?gameId=N

Owner counterpart of the mod route
`GET /v1/leaderboards/games/{gameId}/users/{userId}/eligible-runs` — same
row shape, but scoped to the caller instead of an admin-supplied userId.

**Auth:** required.

**Query:**
- `gameId` (required) — positive integer.

**Which runs come back:** `getUserEligibleRunsInGame`
(`src/leaderboards/mass-mgmt/get-user-eligible-runs.ts`) filters to
`leaderboardEligible = true AND excluded = false AND verificationStatus !=
'rejected'`. **A rejected run never appears in this list.** Consequence for
the consumer: an owner-facing "restore/unreject my run" flow cannot be
sourced from this endpoint — that path has to go through
`POST /v1/me/runs/{runId}/verdict` with `action: "unreject"` against a
`runId` already known to the UI by some other means (e.g. run history),
not one discovered via eligible-runs.

**Success (200)** — the row shape is `UserEligibleRunRow`
(`get-user-eligible-runs.ts:16-31`), inlined here in full since this is the
one endpoint whose frontend type must be written from this document:
```
{
  "result": [
    {
      "runId": number,
      "categoryId": number,
      "categoryName": string,
      "subcategoryKey": string,
      "time": number | null,
      "gameTime": number | null,
      "primaryTiming": "realtime" | "gametime",
      "verificationStatus": string,
      "vodUrl": string | null,
      "endedAt": string,          // Date server-side; arrives as an ISO 8601 string over JSON
      "isLeaderboardEntry": boolean,
      "isLeaderboardEntryGt": boolean,
      "rank": number | null,       // 1-based; null if not ranked (e.g. no leaderboard entry yet)
      "totalRunners": number | null
    }
  ]
}
```

**Errors:**
- `400` `"gameId: positive integer required"` — missing/non-positive/non-integer gameId
- `403` `"Not authenticated"`
- `403` `"user not found"` — session's username has no matching `users` row
- `403` `"banned"` — caller is banned (`isBanned`)

---

## 2. POST /v1/me/runs/{runId}/move

Move **your own** run to a different category/subcategory board within the
same game. Rides `setBoardOverride` (the same mass-mgmt primitive the mod
board-move route uses), with `origin: "self"`.

**Auth:** required.

**Body:**
```
{
  "categoryId": number,        // required, positive integer
  "subcategoryKey": string,    // required (may be "")
  "reason": string              // optional; defaults to "Moved by the runner"; truncated to 1000 chars
}
```

`reason` handling, exactly: the string is trimmed; if the trimmed value is
non-empty, that trimmed value is sliced to 1000 characters and used as-is.
If the trimmed value is empty (including a whitespace-only string), it
falls back to the default `"Moved by the runner"` instead — the default
itself is not passed through `.slice()`.

**Behavior — read carefully:**

- **Owner move ALWAYS re-verifies.** `setBoardOverride` is called with
  `demoteVerifiedToPending: true`. If the run was `verified` on its old
  board, moving it clears `verifiedBy`/`verifiedAt` and drops it to
  `pending` on the target board. This exists so a runner can't verify on an
  easy board and self-move the run to a harder one while keeping the
  verified status. The response's `reverify` boolean tells you whether a
  demotion actually happened — it's `false` for runs that were already
  `pending` or `rejected` (nothing to demote).
- **Refused if the run sits under a moderator-placed board override.**
  Before calling `setBoardOverride`, the handler checks
  `run_board_overrides.origin` for this run. If a row exists with
  `origin === "mod"`, the move is rejected with 403 — the runner must use
  the appeal flow instead of being able to silently revert a moderator's
  placement. If the existing override has `origin === "self"` (a prior
  self-move) or no override row exists at all, the move proceeds normally
  — an owner can freely re-move a run they placed themselves.

**Success (200):**
```
{ "result": { "moved": true, "reverify": boolean } }
```

**Errors:**
- `400` `"invalid JSON"`
- `400` `"categoryId: positive integer required"`
- `400` `"subcategoryKey: string required"`
- `403` `"Not authenticated"`
- `403` `"user not found"`
- `403` `"banned"`
- `403` `"not your run"` — run exists but `run.userId !== callerId`
- `403` `"this run was placed by a moderator — appeal instead of moving it"`
- `404` `"run not found"` — no such runId
- `400` `"Run is already on the target category/subcategory"` (`TargetNotChangedError`)
- `400` `"Target category not found or does not belong to this game"` (`CategoryNotInGameError`)
- `404` `"Run not found"` (`RunNotFoundError`, raised inside `setBoardOverride` — distinct from the earlier "run not found" 404, but same status/effect)

---

## 3. GET / POST / DELETE /v1/me/anonymize

The owner's board-level privacy toggle: **"don't show who I am in this
game"** — game-wide, covering current **and future** runs. This is **not**
a per-run anonymize. It creates/reads/lifts one `type: "user"`,
`categoryId: null` anonymize rule scoped to `(callerId, gameId)`.

**Auth:** required for all three methods.

### GET /v1/me/anonymize?gameId=N

**Query:** `gameId` (required, positive integer).

Reports whether the caller is hidden by **any** rule that covers them in
this game — resolved with the same broadest-wins logic
(`scopeCovers`/`getUserAnonymizeScopes`) the public board renderer uses.
A covering rule can be:
1. the caller's own game-scope rule (self-applied),
2. a moderator-applied game-scope rule,
3. a moderator-applied category-scope rule inside that game, or
4. a global rule.

`selfApplied` is `true` **only** for case 1 — a game-scope (not global, not
category-scoped) `user` rule where `createdBy === targetId === callerId`.

**Success (200):**
```
{
  "result": {
    "hidden": boolean,
    "selfApplied": boolean,
    "ruleId": number | null,
    "displayName": string | null   // e.g. formatted anon name, only set when hidden
  }
}
```

**Three UI states this drives:**
- `hidden: false` → offer "hide my identity"
- `hidden: true, selfApplied: true` → offer "unhide" (caller can lift it)
- `hidden: true, selfApplied: false` → identity is hidden by a moderator;
  explain that only an admin can lift it, no action available to the owner

**A fourth case a UI must handle: POST `alreadyExists: true` does not mean
the caller owns the rule.** `createAnonymizeRule`'s idempotency check
matches on `type + targetId + gameId + categoryId + liftedAt IS NULL` and
does **not** check `createdBy` (`anonymize-service.ts:596-627`). If a
moderator already placed a game-scope rule on this user+game before the
runner ever calls POST, the runner's `POST /v1/me/anonymize` still returns
`{ hidden: true, alreadyExists: true, displayName }` — which reads like
"you just did this" — while a subsequent `GET` correctly reports
`selfApplied: false`, and a subsequent `DELETE` 403s with "identity was
hidden by a moderator — contact an admin to lift it". **A UI must re-GET
after POST to learn whether the resulting rule is actually self-applied**,
and only offer "Unhide" if that follow-up GET says `selfApplied: true`. Do
not infer ownership from the POST response alone.

**POST/GET asymmetry:** POST's response has no `ruleId` or `selfApplied`
field (see the POST section below) — this is the same reason a UI needing
either of those must re-GET after a successful POST.

**Errors:**
- `400` `"gameId: positive integer required"`
- `403` `"Not authenticated"`
- `403` `"user not found"`

(GET does not check `isBanned` — read access isn't gated.)

### POST /v1/me/anonymize

**Body:** `{ "gameId": number }` (required, positive integer).

**Precondition:** the caller must have at least one `finished_runs` row in
that game — **any status counts, including rejected/excluded**. This is a
presence check ("you were here"), not an eligibility check. Exists to stop
an arbitrary caller from churning an arbitrary game's leaderboard/identity
cache for a game they have no runs in.

**Success (200):**
```
{
  "result": {
    "hidden": true,
    "displayName": string,
    "alreadyExists": boolean   // true if a covering game-scope rule already existed; NOT necessarily the caller's own — see the note above
  }
}
```

**Errors:**
- `400` `"invalid JSON"`
- `400` `"gameId: positive integer required"`
- `403` `"Not authenticated"`
- `403` `"user not found"`
- `403` `"banned"`
- `403` `"you have no runs in this game — nothing to hide"`
- `400` scope errors from `createAnonymizeRule` (`AnonymizeScopeError`), e.g. `"type must be 'run' or 'user'"` (not reachable via this route in practice, but is the same error class)
- `404` `"user {id} not found"` (`AnonymizeRuleNotFoundError`, not normally reachable here since the caller row was just resolved)

### DELETE /v1/me/anonymize

**Body:** `{ "gameId": number }` (required, positive integer).

Lifts the caller's own self-applied rule for that game, if one exists.

**Behavior — read carefully:** the response reports the **same four
fields** as GET, describing the **actual resulting state after the lift**,
not simply "unhidden". Rules can overlap — e.g. the caller's own game rule
coexists with a moderator-applied category rule inside the same game
(`createAnonymizeRule`'s idempotency check only rejects an *exact* scope
duplicate, not an overlapping one). If a moderator's category rule still
covers the caller after the caller's own rule is lifted, the response
reports `hidden: true` (with `selfApplied: false`) even though the DELETE
succeeded — the caller's own rule really was removed, but they're still
hidden by the surviving moderator rule.

If no covering rule exists at all when DELETE is called, it's a no-op
returning `{ hidden: false, selfApplied: false, ruleId: null, displayName: null }`.

**Success (200):**
```
{
  "result": {
    "hidden": boolean,
    "selfApplied": boolean,
    "ruleId": number | null,
    "displayName": string | null
  }
}
```

If a covering rule exists but is **not** the caller's own game rule (i.e.
`selfApplied` would be false), the DELETE is refused — the caller cannot
lift a moderator's rule:

**Errors:**
- `400` `"invalid JSON"`
- `400` `"gameId: positive integer required"`
- `403` `"Not authenticated"`
- `403` `"user not found"`
- `403` `"banned"`
- `403` `"identity was hidden by a moderator — contact an admin to lift it"`

### Known gap — cache invalidation has no success signal

There is **no `cachePending` field** anywhere in these responses.
`runAnonymizeInvalidation` (called after both apply and lift) swallows its
own internal failures and returns no success/failure signal to the caller
(`src/services/anonymize-cache-invalidation.ts:167-169`). A partial
cache-invalidation failure (e.g. the leaderboard cache drops the name but
a `pageData` rebuild throws) can leave this endpoint reporting
`hidden: true` while some derived cache still carries the runner's name
briefly. **Frontend copy should not promise instant, total effect** — phrase
it as "hiding your identity" rather than guaranteeing it is hidden
everywhere the instant the request returns.

---

## 4. GET /v1/leaderboards/runs/{runId} — the owner exemption

Not a `/v1/me/*` route, but the self-service flow depends on it: this is the
public run-detail payload, and every owner control on the run page is gated on
"is this run mine", decided from its `runnerName`/`userId`.

The endpoint stays **public and unauthenticated by default**. It now also
accepts an *optional* `Authorization: Bearer {sessionId}`, and when the caller
resolves to the run's own `userId` the anonymize redaction is **skipped for
that caller only** — they see their real `runnerName` and their `userId`
instead of `Anonymous runner #N` / `null`.

- The exemption applies whoever placed the rule (the runner themself, a game
  moderator, or a site admin). The mask exists to keep the identity away from
  the public; the subject is not that public, and they need their own controls
  either way.
- Anonymous callers, third parties, and callers whose session fails to resolve
  are unaffected — they get the placeholder exactly as before. A guest /
  unsynced run (`userId: null`) can never match a caller.
- Run-scoped rules (`type: "run"`) follow the same exemption.

**Caching consequence for the frontend — read this before wiring it up.** The
response body now varies by caller, so it carries `Vary: Authorization`, plus
`Cache-Control: private, no-store` on the exempted view. A frontend fetcher
that sends the bearer token **must not** be a shared-cache read (`'use cache'`
in Next terms) — caching an owner's un-redacted payload under a public key
would serve their real name to everyone. Keep the cached public fetch as-is and
make the authenticated read a separate, uncached one, taken only when the
public copy came back redacted.

---

## Already existed (composed by the owner remove wizard)

These routes predate this task and are documented elsewhere in full; listed
here only because the owner-facing "remove my run" wizard composes them
alongside the three routes above:

- `POST /v1/me/runs/{runId}/verdict` (`src/api/me/run-verdict.ts`) — body
  `{ "action": "reject" | "unreject", "reason"?: string }`. Reject is always
  instant. Unreject re-evaluates trust tier (`evaluateTrust`) and may land
  `pending` instead of `verified` — response `{ result: { applied: "instant" | "provisional", noop?: true } }`.
- `POST /v1/me/manual-times` and `DELETE /v1/me/manual-times/{id}`
  (`src/api/me/manual-time.ts`) — create/delete a self-asserted manual time.
  Create response: `{ result: { applied: "instant" | "provisional", manualTimeId: number } }`.
  Delete response: `{ result: { deleted: true } }`.

---

## Unified mod log — actor vs subject

Every owner action lands in the same `logs` table the moderator verbs use
(single feed, single run-history read path), with the **runner as actor**
(`actorUserId = callerId`) and also as **subject**
(`data.subject.userId = callerId`). Actions:

| Action | Constant |
|---|---|
| `self_reject_run` | `MOD_LOG_ACTIONS.selfRejectRun` |
| `self_unreject_run` | `MOD_LOG_ACTIONS.selfUnrejectRun` |
| `self_create_manual_time` | `MOD_LOG_ACTIONS.selfCreateManualTime` |
| `self_delete_manual_time` | `MOD_LOG_ACTIONS.selfDeleteManualTime` |
| `self_move_run` | `MOD_LOG_ACTIONS.selfMoveRun` |

**Hide-identity actions are the exception:** apply/lift via
`/v1/me/anonymize` log as the ordinary `anonymize_apply` / `anonymize_lift`
actions — **there is no `self_anonymize_apply`/`self_anonymize_lift`
variant.** (Those two constants existed briefly during development and were
removed as dead code — `createAnonymizeRule`/`liftAnonymizeRule` always log
the plain `anonymize_apply`/`anonymize_lift` action regardless of who
called them, by design: one log row per event, with the runner as actor
when it's a self-service call.)

Because of this, a frontend rendering the unified log **cannot** tell
owner-initiated apart from moderator-initiated hide/unhide from the action
name alone. Distinguish them by comparing the log row's actor
(`logs.userId`) to its subject (`data.subject.userId`): if they're equal,
the runner did it to themselves; if different, a moderator acted on the
runner.
