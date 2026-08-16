# Paired run times — entering both clocks on a manual submission

Date: 2026-08-16
Status: approved, in implementation

## The problem

A manual time asserts one clock. On a category timed by IGT (or LRT) that also
shows real time next to it, that is half an entry: the board has a column it can
never fill from a manual submission, and the runner has no way to give the value
even when they have it.

## The rule

Per category:

| Primary timing | "Also show the other clock" | Primary | Secondary |
|---|---|---|---|
| IGT / LRT | on | required | **required** |
| IGT / LRT | off | required | optional |
| Real time | on or off | required | **not asked for at all** |

Only a game-timed board can demand its real time. A real-time board does not
even show a game-time field: an RTA runner usually does not have one, so the
box would be permanently empty on every submission. (Joey, 2026-08-16: "if RTA,
don't even ask for IGT".)

## Data model — no migration

`manual_times` is unique on
`(user/guest, game_id, category_id, subcategory_key, timing)`. Two clocks is two
rows that already coexist. Nothing in the schema changes; what changes is that
one request can write both.

## Contract

Both create routes take one new optional field:

```
POST /v1/me/manual-times           (self-submit)
POST /leaderboards/manual-times    (mod)

{ …existing fields…, secondary?: { timing: 'realtime'|'gametime', timeMs: number } }
```

- `secondary.timing` must be the *other* clock than the request's `timing`;
  same-clock is a 400, as is a non-positive `timeMs`.
- Both rows run the existing pipeline — upsert, trust evaluation, pending flag,
  mod log, combo-flag rebuild, cache invalidation — inside the one request.
- Trust is evaluated per row, because each clock ranks its own board. The
  response's `applied` is the stricter of the two: one provisional half makes
  the submission read provisional.
- Response gains `secondaryManualTimeId` (null when no secondary was sent).
- No new API Gateway resources — that stack has one slot left, and this rides
  the existing routes.

Backward compatible: a request without `secondary` behaves exactly as today, so
the deployed frontend keeps working between the two deploys.

## Frontend

Two new shared pieces, used by every surface that takes a manual time:

**`src/lib/run-times.ts`** — pure validation. `secondaryVisible` decides
whether the second field exists at all (game-timed boards only),
`secondaryRequired` whether it is demanded, and
`validateRunTimes({ primaryTiming, showSecondary, primaryMs, secondaryMs })`
returns errors and warnings per the table above, plus the transposition warning:
real time below game time is almost always the two fields swapped, since real
time counts the loads that game time removes. It stays a warning rather than an
error — a board can label its second clock something that does not obey that
rule, and blocking a correct submission is worse than a note next to it.

**`src/components/time-input/run-times-field.tsx`** — both `DurationField`s in
one group, each labeled with the clock's real name (IGT / LRT / Real time), the
secondary tagged Required or Optional, with a derived `Loads: 1:12` line
(real − game) once both are filled.

### What this removes

The submit dialog's timing radio. Today, on a both-clocks board, the runner
picks which clock their single time is. With two labeled fields there is nothing
to pick: you fill the clocks you have. The radio only ever existed because there
was one field.

## Surfaces, in order

1. Submit dialog — `submit-dialog/step-time.tsx` (drops the radio)
2. Mod manual-time dialog — create path only; editing an existing row still
   edits that one clock, because a row *is* one clock
3. Board adjust dialog — the "set a time" branch
4. Owner-remove form — "replace my run with a time I enter"

The mod dialog and the owner form do not receive the category, only its id, so
they read the clocks through `loadBoardClocksAction(gameSlug, categoryId)`
rather than making every call site thread the flags down. The submit and adjust
dialogs already hold the category and pass them directly.

## Testing

- Validation matrix as unit tests (the table above, both directions).
- `RunTimesField` component tests: required tagging, loads line, warning.
- Updated tests for the four dialogs — a paired submission sends `secondary`.
- Backend handler tests: paired body writes two rows; mismatched secondary
  timing 400s; absent secondary unchanged.

## Rollout

Backend first (push to main deploys and migrates), frontend after.
