# Moderation Frontend — Build Status

**Branch:** `moderation-ui` (off `docs/moderation-leaderboard-vision`)
**Started:** 2026-05-24
**Backend:** shipped on `docs/moderation-vision-backend` (branch in `../therun`). Contract extracted to `docs/superpowers/specs/2026-05-24-moderation-backend-contract-actual.md` — **build against that, it's the as-shipped truth.**

This file tracks the frontend build of the full moderation + leaderboard-editing vision. Updated as phases land.

## ⚠️ Prerequisites the backend owner must do (out of frontend scope)

1. **Run migrations** in `../therun`: `npm run migrate` (creates `manual_times`, `run_flags`, `run_reports`, `notifications`, `board_policies`).
2. **Register API Gateway routes.** `aws/lib/api-stack.ts` uses `proxy: false` and does **not** yet register the `/v1/leaderboards/games/{gameId}/…`, `/v1/me/*`, `/v1/reports`, `/v1/runs/{id}/{history,appeal}` resources. Until added, these paths 403/404 at the gateway. The frontend is built against the handler contract and will work once routing lands. **This is the single thing blocking the feature end-to-end.**
3. Deferred backend items (from `../therun/docs/superpowers/MODERATION_VISION_STATUS.md`): ingest-time flag producers (`impossible`, `pb_jump`, `duplicate`, `fresh_account_top_n`, `missing_vod`); non-`min_time` policy evaluation; notification emit on bulk exclude.

## Verification approach

The backend isn't deployed, so no live E2E. Verification per phase = `npm run typecheck` + `npm run lint` clean, plus adherence to existing patterns. `npm run build` at milestones. The UI degrades gracefully when endpoints 404 (mod tools are gated + error-tolerant).

## Conventions adopted

- Fetch layer: `src/lib/moderation/mod-fetch.ts` — `modFetch` (bare body, for `/v1/leaderboards/games/...`) and `meFetch` (unwraps `{result}`, for `/v1/me`, `/v1/reports`, `/v1/runs`). Both surface plain-text backend error messages via `ModError`.
- Permission gate (mirrors backend's single `verify-reject-run`): existing CASL `ability.can('edit', subject('leaderboard', { game }))` — same gate already used by the reject page. No new CASL actions needed for mod gating.
- Timing vocab: mod/self endpoints use `'realtime' | 'gametime'` (`ModTiming`); the public board read uses `'rt' | 'gt'`. Don't cross-wire.
- All mod tooling lives under the existing `app/(new-layout)/games-v2/[game]/manage/` subtree.

## Phases

- [ ] **F. Foundation** — `mod-fetch`, `types/moderation.types.ts`, section libs, extend `LeaderboardEntry` with `source`/`manualTimeId`.
- [ ] **P1. Mass-management UI** — roster + runner views, multi-select, bulk exclude/include + preview + rule-shape detection, exclusion-rules tab, mod-actions audit feed + 24h undo.
- [ ] **P2. Manual times UI** — set/edit/delete/verify-reject + preview; integrate into runner view, leaderboard row ("set time"), manual badge on board.
- [ ] **P3. Bulk verdicts UI** — verify/reject/unreject with preview, wired into roster/runner multi-select.
- [ ] **P4. Triage queue UI** — per-game queue + global; flag list, severity, suggested actions, resolve, one-tap actions.
- [ ] **P5. Board policies UI** — generalize the minimums section into policies (min/max time, require-video-top-n, auto-flag thresholds).
- [ ] **P6. Mod reports view** — unresolved reports per game (queue tab), resolve via verdict/exclude.
- [ ] **P7. Self-service UI** — run page: reject/unreject own run; claim own time; trust feedback (instant vs provisional).
- [ ] **P8. Report + appeal buttons** — report a run (leaderboard row / run page); appeal own rejected run.
- [ ] **P9. Notifications** — topbar bell, feed, mark read / read-all.
- [ ] **P10. Run history** — public verdict/manual-time timeline on run pages.

## Log

- 2026-05-24: Branch created; backend contract extracted; foundation started.
