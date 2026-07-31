# Backend handoff: category-centric setup (3 items)

Frontend branch `setup-category-centric` builds against this contract.
Base path for items 2–3: `/v1/leaderboards/games/:gameId` (mod auth, same as
mass-mgmt endpoints).

## 1. Game-level board configuration columns

New nullable columns on `games`:
- `rules_template` TEXT — category rules template, seeds new featured categories
- `game_rules` TEXT — rules shown above category rules on every board
- `emulator_policy` TEXT CHECK IN ('allowed','banned')

Update endpoint (existing game update used by update-game-metadata.action):
accept `rulesTemplate`, `gameRules`, `emulatorPolicy`, and `primaryTiming`
('rt'|'gt', existing column). Read side: include all four in the mod game
payload consumed by getGameMetadata, and gameRules + emulatorPolicy in the
public game/pageData payload.

## 2. Mark-for-later run flag

- `PUT /v1/leaderboards/games/:gameId/runs/marks` body
  `{ "runIds": number[], "marked": boolean }` → `{ "updated": number }`.
  Shared across the game's mods (not per-mod). Audit-logged like verdicts.
- Roster rows (`GET .../categories/:categoryId/eligible-runs`) gain
  `markedForLater: boolean`.
- Roster filter gains optional `markedForLater=true` query param.

## 3. Board assignment override

- `PUT /v1/leaderboards/games/:gameId/runs/:runId/board-override` body
  `{ "categoryId": number, "subcategoryKey": string }` or `null` to clear
  → `{ "updated": boolean }`. Run data untouched; boards/rosters resolve the
  override when placing the run. Designed so a runner-suggested variant can
  layer on later (override row keeps an `origin` slot: 'mod' now).
- Roster rows gain `boardOverride: { categoryId, subcategoryKey } | null`.

## Implementation notes (2026-07-30)

- Schema for all three items landed on backend branch `category-centric-support`
  (schema+migration commit `675d4d9`, code commit `c790c76`, test commit
  `6e3c07a`): `games.rules_template`/`game_rules`/`emulator_policy`/`primary_timing`,
  `finished_runs.marked_for_later`, and a new `run_board_overrides` table.
- Item 1: `PUT /v1/games/:id` accepts `rulesTemplate`, `gameRules`,
  `emulatorPolicy`, and `primaryTiming` (`'rt'`/`'gt'` at the API boundary,
  mapped to `'realtime'`/`'gametime'` for storage — same vocabulary as
  `categories.primary_timing`). All four are metadata-tier, gated by
  `edit-category-settings` like `summaryOverride`. `pageData.game` now emits
  `rulesTemplate`, `gameRules`, `emulatorPolicy` verbatim and `primaryTiming`
  converted back to `'rt'`/`'gt'`. Note: `games.primaryTiming` is a wizard
  default only — `resolveTiming()` was deliberately NOT rewired to read it;
  categories still carry their own `primaryTiming` copy that drives resolution.
- Item 3 deviates from this doc's "boards/rosters resolve the override"
  read-time-resolution wording: the override is **move-backed**, not
  read-time-resolved. A mod's board move executes through the real move-run
  path (unchanged run data model, flags recomputed by proven code); the new
  `run_board_overrides` row only records the run's *original* placement so
  the move is reversible and a future runner-suggested flow can layer on.
  Practically: roster's `boardOverride` field reports
  `{ categoryId, subcategoryKey }` of the run's **current (target)**
  placement when an override row exists for that run, and `null` otherwise —
  same shape and same user-visible behavior as originally specced, radically
  smaller blast radius on the backend.
- Item 2 and item 3's endpoints/handlers are not yet built (B1 only covered
  schema + Feature A). `markedForLater` and `boardOverride` are not yet wired
  into the eligible-runs roster response.
