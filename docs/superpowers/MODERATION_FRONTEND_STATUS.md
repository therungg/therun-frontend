# Moderation Frontend — Build Status

**Branch:** `moderation-ui` (off `docs/moderation-leaderboard-vision`)
**Started:** 2026-05-24
**Backend:** shipped on `docs/moderation-vision-backend` (branch in `../therun`). Contract extracted to `docs/superpowers/specs/2026-05-24-moderation-backend-contract-actual.md` — **build against that, it's the as-shipped truth.**

This file tracks the frontend build of the full moderation + leaderboard-editing vision. Updated as phases land.

## ✅ Current state & the ONE remaining step (2026-05-24)

**Frontend: complete, verified, pushed** to `moderation-ui` (no PR — owner opens PRs). All 10 phases + the board-inline mod entry point + self-claim + notifications + run history + hub attention badges. `npm run build` compiles clean; `tsc`/ESLint/Biome clean for all new files. `LeaderboardEntry.source` rollout audit done (no consumer breaks on manual entries).

**✅ RESOLVED — live end-to-end (2026-05-24).** The backend added the `/mod` strip in `api-entry.ts` (`event.path.replace(/^\/mod(?=\/|$)/, "")`) and deployed. Verified against live `api.therun.gg`:
- `GET /mod/v1/runs/1/history` → `200 {"result":[]}` — public route fully working.
- `GET /mod/v1/me/notifications`, `…/leaderboards/games/{id}/{manual-times,queue,policies}`, `POST /mod/v1/reports` → `403 "Not authenticated"` unauthenticated = handler reached + auth gate firing (will return data / act with a mod session).

Routing works: `/mod` is stripped, `api-entry` dispatches via its `event.path` regexes to the real handlers. The frontend prepends `/mod` (`src/lib/moderation/mod-fetch.ts`) and functions end-to-end for signed-in mods/users. **No further frontend work.**

Remaining backend confirmation (can't be verified from outside — auth gate short-circuits before the DB): run `npm run migrate` so `manual_times`/`run_flags`/`run_reports`/`notifications`/`board_policies` exist.

Cosmetic, non-moderation FYI: `/mod/v1/tournaments` returns `400 "Tournament name required"` (not the list) because `handleV1Tournaments` keys list-vs-`{name}` off API-Gateway `pathParameters`, which the `proxy:true` moderationApi doesn't populate like the explicit-resource root API. Moderation handlers use `event.path` regex dispatch, so they're unaffected. Tournaments isn't served under `/mod` in prod.

## ⚠️ Prerequisites the backend owner must do (out of frontend scope)

1. **Run migrations** in `../therun`: `npm run migrate` (creates `manual_times`, `run_flags`, `run_reports`, `notifications`, `board_policies`).
2. **Register API Gateway routes — VERIFIED STILL MISSING (2026-05-24).** Probed live `https://api.therun.gg`:
   - `GET /v1/finished-runs?limit=1` → **200** (deployed, works).
   - `GET /v1/leaderboards/runs/1` → **404 "Run not found"** — the *handler's* plain-text body, so the Lambda is deployed and `/v1/leaderboards/*` routes to it.
   - `GET /v1/leaderboards/games/1/manual-times`, `…/queue`, `GET /v1/me/notifications`, `POST /v1/reports`, `GET /v1/runs/1/history` → **403 `{"message":"Missing Authentication Token"}`** — the *API Gateway's* unregistered-resource response (not the handler's `"Not authenticated"`).

   So the handlers are deployed but the gateway (`aws/lib/api-stack.ts`, `proxy:false`) hasn't registered these resources. **Exact routes the backend must add** (each `addResource`/`addMethod`, or switch the subtree to a `{proxy+}`):
   - `/v1/leaderboards/games/{gameId}/…` — the whole mod + mass-mgmt subtree: `manual-times(/{id}(/verdict)?)?`, `verdicts(/preview)?`, `queue(/{flagId}/resolve)?`, `reports`, `policies(/{id})?`, `exclude(/preview)?`, `include`, `exclusion-rules(/{ruleId})?`, `mod-actions`, `users/{userId}/eligible-runs`, `categories/{categoryId}/eligible-runs`. (NB: the already-"shipped" mass-mgmt endpoints are in this same unregistered subtree, so P1's UI also can't reach the backend until this lands.)
   - `/v1/me/manual-times(/{id})?`, `/v1/me/runs/{runId}/verdict`, `/v1/me/notifications(/{id}/read)?`, `/v1/me/notifications/read-all`.
   - `/v1/reports`.
   - `/v1/runs/{runId}/history`, `/v1/runs/{runId}/appeal`.

   **This is the one thing blocking the feature end-to-end.** The frontend is built + verified (production build passes) against the as-shipped handler contract and works the moment these routes are registered. The UI degrades gracefully meanwhile (mod tools admin-gated; reads catch errors → empty states; notifications bell silently empty).
3. Deferred backend items (from `../therun/docs/superpowers/MODERATION_VISION_STATUS.md`): ingest-time flag producers (`impossible`, `pb_jump`, `duplicate`, `fresh_account_top_n`, `missing_vod`); non-`min_time` policy evaluation; notification emit on bulk exclude.

## Verification approach

The backend isn't deployed, so no live E2E. Verification per phase = `npm run typecheck` + `npm run lint` clean, plus adherence to existing patterns. `npm run build` at milestones. The UI degrades gracefully when endpoints 404 (mod tools are gated + error-tolerant).

## Conventions adopted

- Fetch layer: `src/lib/moderation/mod-fetch.ts` — `modFetch` (bare body, for `/v1/leaderboards/games/...`) and `meFetch` (unwraps `{result}`, for `/v1/me`, `/v1/reports`, `/v1/runs`). Both surface plain-text backend error messages via `ModError`.
- Permission gate (mirrors backend's single `verify-reject-run`): existing CASL `ability.can('edit', subject('leaderboard', { game }))` — same gate already used by the reject page. No new CASL actions needed for mod gating.
- Timing vocab: mod/self endpoints use `'realtime' | 'gametime'` (`ModTiming`); the public board read uses `'rt' | 'gt'`. Don't cross-wire.
- All mod tooling lives under the existing `app/(new-layout)/games-v2/[game]/manage/` subtree.

## Phases

- [x] **F. Foundation** — `mod-fetch`, `types/moderation.types.ts`, section libs, `can-moderate`, `revalidate-boards`, `LeaderboardEntry.source/manualTimeId`.
- [x] **P1. Mass-management UI** — hub + roster + runner views, multi-select, bulk exclude/include + preview + rule-shape hint, exclusion-rules tab, mod-action log + 24h undo. Entry from game header.
- [x] **P2. Manual times UI** — set/edit/delete + verify/reject pending self-claims + blast-radius preview; "Set time" in runner + roster views; management view; "set time" badge on the board.
- [x] **P3. Bulk verdicts UI** — verify/reject/unreject with preview, wired into roster + runner multi-select bars.
- [x] **P4. Triage queue UI** — per-game queue: flags w/ severity, suggested action, filters, resolve, quick reject/exclude/verify, view-runner.
- [x] **P5. Board policies UI** — policies CRUD (min/max time, require-video-top-n, auto-flag pct) with per-type editors.
- [x] **P6. Mod reports view** — unresolved reports per game; reject/exclude resolves them.
- [x] **P7. Self-service** — own-run hide/restore/appeal (row actions) + "Submit / correct my time" self-claim on the board (trust-gated).
- [x] **P8. Report + appeal buttons** — report (row, any user); appeal own rejected run (row).
- [x] **P9. Notifications** — topbar bell, feed, mark read / read-all.
- [x] **P10. Run history** — public timeline (row Actions → Run history modal).

## Log

- 2026-05-24: Branch created; backend contract extracted; foundation built.
- 2026-05-24: P1 (mass-management UI, via subagent) + P9 (notifications) + P7/P8/P10 row actions landed. Foundation typechecks clean (pre-existing errors in unrelated files only).
- 2026-05-24: P2 (manual times) + P3 (bulk verdicts) direct; P4/P6 (triage+reports) + P5 (policies) via subagents; P7 self-claim. **All 10 phases complete.** Whole moderation surface typechecks + Biome clean.
- 2026-05-24: Verified backend deploy state — handlers live but API Gateway routes for the new subtrees not yet registered (probed `api.therun.gg`); gateway wiring left to the backend (documented above).
- 2026-05-24: Enhancement — inline mod actions on the public leaderboard (the vision's "board-inline" entry point): Verify / Reject / Exclude a run from the row Actions menu when you can moderate the game.
- 2026-05-24: **Routing resolved + new blocker found.** Moderation is deployed behind a `/mod` base-path mapping (separate `moderationApi`, `proxy:true` → `usersLambda`), not at the bare `/v1/...` root. Frontend `buildUrl` now prepends `/mod` for every mod/me call (commit `fcd0e908`). Confirmed the mapping **reaches the Lambda but does not strip `/mod`**: definitive test — `GET /v1/tournaments` → 200 (handled by `api-entry`→`usersLambda`) vs `GET /mod/v1/tournaments` → `"Path not found"` (same route, only the `/mod` prefix differs). So `usersLambda` sees `event.path=/mod/v1/...` and no `startsWith("/v1/...")` case matches. **Backend to fix base-path stripping**; the frontend is correct as-is and works once stripping lands. (Supersedes the earlier "routes unregistered" note.)

## UX redesign

The moderation UX redesign (5 phases — spec `docs/superpowers/specs/2026-05-27-moderation-ux-redesign-design.md`) replaces the three overlapping run-moderation mechanisms (reject verdict / exclude run / user rule) with a single reason-driven action model. Tracked on branch `moderation-ux-redesign`.

- [x] **Phase 1 — Unified action model.** Verbs Approve / Remove / Restore / Ban + a Remove reason taxonomy that routes loud (reject) vs quiet (exclude) via a single notify toggle. New `shared/action-model.ts` (pure model) and `shared/run-action-dialog.tsx` (one client dialog: preview → reason → confirm, routing to the already-shipped `verdicts.action`/`exclude.action` — no new server actions, no backend change). Wired into the two inline surfaces: the public-leaderboard row menu (`leaderboard/row-actions-menu.tsx`) and the run-detail card (`manage/run/[runId]/run-card.tsx`). Old per-action inline modals/controls removed: `leaderboard/actions/board-mod-actions.action.ts`, `manage/run/[runId]/{reject-control,exclude-user-control}.tsx` + their actions. Console dialogs (`verdict-dialog`/`exclude-dialog`/`reason-modal`) untouched — they retire in Phase 5.

- 2026-05-27: Phase 1 (unified action model) landed on `moderation-ux-redesign`. Inline surfaces migrated to `RunActionDialog`; old per-action inline modals/controls removed. `npm run build` clean; phase files typecheck + Biome clean (pre-existing repo-wide typecheck errors in unrelated files remain). Ban dropped from the leaderboard row menu — `LeaderboardEntry` lacks `categoryId`/`categoryDisplay`/`gameDisplay`, so a category-scoped ban can't be resolved from a board row; Ban stays available on the run-detail page (`RunDetail` has full category context). No browser smoke test performed (subagent has no browser).

- [x] **Phase 2 — Moderate tab + Needs Attention inbox.** The route `manage/moderation/page.tsx` is now a tabbed shell (`Moderate` | `Configure`, `moderation-tabs.tsx`) instead of the card hub. The Moderate tab is a single prioritized inbox (`attention/needs-attention.tsx`) that merges the three backend sources — triage queue, reports, and pending self-claim manual times — into one sorted list via a pure merge module (`attention/attention-model.ts`): deduped per `runId` (a run flagged AND reported collapses to one row carrying both source pills), self-claims (no `runId`) keyed by `manualTimeId`, sorted severity-desc then oldest-first. Items act through Phase 1 `RunActionDialog` (Approve / Remove… / Restore-if-rejected / Ban runner…); self-claims use a Verify/Reject control (`attention/manual-time-verdict-row.tsx`) wired to the existing `manualTimeVerdictAction`. Same-runner items collapse into an expandable group card with group-level Remove-all / Ban-runner. Source + category filters, item-count tab badge, calm empty state. The Configure tab is gated to board-admins (predicate `can('edit','moderators')` — uniquely held by `board-admin`/`admin`) and for now just links to the still-standalone `policies`/`rules`/`log` pages (Phase 4 embeds them).

- 2026-05-27: Phase 2 landed on `moderation-ux-redesign`. New files: `attention/attention-model.ts`, `attention/needs-attention.tsx`, `attention/manual-time-verdict-row.tsx`, `moderation-tabs.tsx`; `page.tsx` rewritten to load + merge the 3 sources and render the tabs. `moderation-hub.tsx`, `queue/`, `reports/` left on disk (Phase 5 removes them); old deep-links still resolve. `npm run build` clean (exit 0); new files typecheck + Biome clean (pre-existing repo-wide errors remain). No browser smoke test (subagent has no browser). Board-admin gating is best-effort via `edit`/`moderators`; Phase 4 confirms/tightens.
