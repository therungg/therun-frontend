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
