# Game-level Show RTA / Show IGT — design

**Date:** 2026-07-30
**Status:** Approved (built autonomously on Joey's standing instruction: "set the show IGT / show RTA settings we have for categories for the whole game; adjust backend if needed")

## Goal

The per-category "Show real time" / "Show game time" display settings
(`hideRealTime` / `hideGameTime`) become settable for the whole game in one
place. Categories that set their own flag keep overriding the game — that
resolution already exists backend-side (`resolveHiddenTimings`: category
wins when it sets either flag) and is applied to every board, standings,
and query read path.

## What already exists (discovered, not built)

- `games_pg.hide_real_time` / `hide_game_time` columns (boolean NOT NULL
  default false) — **no migration needed**.
- `PUT /game-mgmt/:id` accepts `hideRealTime`/`hideGameTime`;
  `updateGame` rejects both-true ("hideRealTime and hideGameTime cannot
  both be true").
- Read paths resolve game+category flags via
  `src/leaderboards/resolve-timing.ts` at request time (not pageData), and
  the leaderboard API returns the *effective* flags, which the frontend
  board already consumes (`timing-columns.ts`). Hiding a clock also stops
  ranking by it (`resolveTiming`: hidden overrides `?timing=` and
  `primaryTiming`).

## Backend changes (repo `therun`, two edits, no migration)

1. `src/api/game-mgmt/handler.ts` — add `"hideRealTime"`, `"hideGameTime"`
   to `metadataOnlyFields` in the PUT branch, so game mods
   (`edit-category-settings`) can set them rather than only `edit-game`.
   Parity argument: the identical per-category flags are already
   mod-settable via `edit-category-settings` (updateCategory), and
   game-level `primaryTiming` — which also picks the ranking clock — is
   already in `metadataOnlyFields`.
2. `src/services/game-mgmt-service.ts` — include
   `hideRealTime: game.hideRealTime, hideGameTime: game.hideGameTime` in
   the mgmt GET response's `game` object (the payload
   `getGameMetadata` reads), so the frontend can seed its controls.

Deploy: `api` stack only; push to backend main allowed; 15-minute
post-deploy monitoring per cross-repo rules.

## Frontend changes (repo `therun-fr`, branch `setup-category-centric`)

1. `src/lib/game-mgmt.ts` — `GameMetadata` gains
   `hideRealTime: boolean; hideGameTime: boolean` (parse `?? false`);
   `UpdateGameBody` gains both as optional and `updateGame` forwards them.
2. `app/(new-layout)/games-v2/[game]/setup/actions/update-game-metadata.action.ts`
   — accept both optional booleans, forward them, and guard: if the update
   would set both true, return
   `{ error: 'Cannot hide both real time and game time.' }` (mirrors the
   backend service guard so the wizard gets a friendly message).
3. Wizard step 1, "Set the ground rules" timing card
   (`steps/step-details.tsx`) — a third block in the existing `pairRow`:
   **Time columns**, two checkboxes using the per-category copy verbatim —
   "Show real time", "Show game time" — bound to `!hideRealTime` /
   `!hideGameTime`. Unchecking one force-checks the other (mirrors
   `TimingSettingsSection`'s sibling-forcing), so both-hidden is
   unreachable from the UI. Muted note under the pair:
   "Applies to every board. Categories with their own display setting keep
   it. A hidden clock also stops ranking boards by it."
   Values save through the existing `handleDetailsSaved` →
   `updateGameMetadataAction` call (no new save path).

No console UI: the wizard's ground-rules zone is where every other
game-level board policy (timing, emulator, rules) currently lives; the
console has no game-level policy pane to extend.

## Testing

- Backend: extend existing hermetic tests if `game-mgmt-board-config`
  integration covers the PUT permission tiers; otherwise assert the two
  edits at unit level. Never run `npm run build` in the backend repo
  (leaves `.js` shadows that break `vi.mock`).
- Frontend: extend `steps/step-details.test.tsx` — toggles render checked
  by default; unchecking "Show real time" force-checks "Show game time";
  submit sends `hideRealTime: true, hideGameTime: false` through
  `updateGameMetadataAction`'s payload (assert on the mocked action).
- Browser pass (Joey): wizard step 1 shows the pair; a game with
  `hideGameTime` set shows RTA-only boards.
