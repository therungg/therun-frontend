# Duration field — one way to type a time

**Date:** 2026-08-13
**Status:** Designed, not implemented
**Repo:** therun-frontend (frontend-only; no API or schema change)

## Problem

Ten places in `games-v2` take a typed time. Every one of them is a bare
`<input type="text">` with the format hidden in a placeholder, and each owns its
own `timeText` state, parse call, and error string.

Behind them sit **four parsers that disagree**:

| Parser | Used by | Bare `95` means |
|---|---|---|
| `src/lib/run-time-input.ts` | submit dialog | 95 seconds |
| `src/lib/time-input.ts` | setup matrix ×2 | 95 **minutes** |
| `manage/moderation/shared/time-format.ts` | 7 mod surfaces | 95 seconds |
| `manage/moderation/configure/time-input.ts` | standards | 95 seconds |

Two boxes that look identical differ by 57× in what they mean, and nothing on
screen tells the user which one they are typing into.

Two of those parsers wrap `timeToMillis` in `src/components/util/datetime.tsx`,
which parses the fraction with `parseInt` and does not pad: `35:48.5` becomes
5ms, not 500ms. The minimum-time standards panel has been mis-reading tenths
since it shipped.

## Goal

One shared component, one parser, across every leaderboard surface that takes a
typed time — and an interaction that reads like a timer rather than a text box.

## Interaction model

Digits fill the `h:mm:ss` stack right-to-left. `.` or `,` starts the fraction.
Milliseconds are always enterable, and never in the way of the common `mm:ss`
case.

| Typed | Shows | Means |
|---|---|---|
| `4` | `0:04` | 4s |
| `3548` | `35:48` | 35m 48s |
| `12345` | `1:23:45` | 1h 23m 45s |
| `3548.6` | `35:48.6` | tenths (readout says `0:35:48.600`) |
| `3548.678` | `35:48.678` | full ms |
| paste `1:23:45.678` | `1:23:45.678` | parsed as-is |

Rejected alternative: filling right-to-left *through* the fraction, so `3548`
reads as `35.48s`. The overwhelming majority of entries are `mm:ss`; that
reading makes the common case wrong to serve the rare one.

Rules that follow from the model:

- The fraction pads **right**: `.6` is 600ms. This is how a timer reads, and it
  is the `timeToMillis` bug stated as a rule.
- Backspace pops one digit off the right, crossing back out of the fraction into
  the seconds.
- `↑`/`↓` nudge by ±1 second; with `Shift`, ±1 minute. There is no per-segment
  focus — the caret is pinned to the end because fill is right-to-left, so a
  focused segment cannot exist. ±1s covers the case that motivated it: a
  moderator correcting a time by a second without retyping it.
- Nothing invalid is representable while typing, so the `is-invalid` state and
  the "Enter a valid time (h:mm:ss, m:ss, or m:ss.SSS)" message disappear from
  these fields. Paste is the only path that can fail, and a failed paste is
  ignored rather than shown as an error.
- Empty renders a dimmed `0:00.000` scaffold as the placeholder. The format is
  never communicated by a hint line that disappears on first keystroke.
- **Segments display as typed and normalize on blur.** Typing `95` shows `0:95`
  while the field has focus, then settles to `1:35` when it loses focus. Digits
  are never rearranged under the caret mid-typing — each keystroke only ever
  affects the right edge, which is what makes the fill predictable. The emitted
  value is always normalized regardless: `0:95` emits 95 000ms, so no caller
  ever sees an over-60 segment.

### The readout

The field never leaves the user guessing what their keystrokes mean. Under it
sits a live readout of the parsed value: **the field shows what was typed, the
readout shows what it parses as**, always at full canonical precision, so the
two are never redundant duplicates of each other.

| Field shows | Readout |
|---|---|
| `0:95` | `= 0:01:35.000` |
| `35:48` | `= 0:35:48.000` |
| `35:48.6` | `= 0:35:48.600` |
| empty | `—` |

This promotes an idiom the submit dialog already has (`formatRunTimeEcho`
rendered under the input) into the shared component, rather than inventing one.

`size="lg"` shows the readout always. `size="sm"` lives in table cells with no
second line to spend, so there the readout appears only while the cell has
focus; on blur the cell normalizes to the canonical value and becomes its own
readout.

## Components

### `src/components/time-input/duration-field.tsx`

```tsx
<DurationField
    value={ms}              // number | null — milliseconds, never a string
    onChange={setMs}        // (ms: number | null) => void
    size="lg" | "sm"        // dialog hero | inline table cell
    clearable               // empty is meaningful (minimums: "no minimum")
    id label disabled autoFocus
/>
```

A single `<input inputMode="decimal">` whose value **is** the formatted string,
so select-all/copy yields `35:48.678` and paste round-trips.

- `size="lg"`: ~2rem monospace, tabular numerals — the submit dialog and the
  mod manual-time dialog.
- `size="sm"`: matches `form-control-sm` metrics — board rows, setup matrix
  cells.

**State ownership.** The digit buffer is the source of truth while the field has
focus; `value` re-seeds it on mount and whenever it changes externally while the
field is unfocused. This is what lets `0:04` and `4` be distinct typing states
that both mean 4000ms.

**Empty semantics.** `clearable` fields emit `null` for an empty buffer, which
minimums use to mean "no minimum". Non-clearable fields (submit, manual time)
emit `null` too; the caller keeps its own Next/Submit disabled while the value
is null. The component never invents a zero.

**Accessibility.** A labelled text input. Screen readers read the formatted
value. Keyboard-complete by construction — there is only one tab stop, unlike
the segmented-boxes alternative.

### `src/components/time-input/keystrokes.ts`

A pure reducer over `{ digits: string; frac: string }`, exported separately from
the component so the keystroke table above is directly executable as its test
spec.

### `src/lib/duration.ts`

One parser, one formatter, promoted from `run-time-input.ts` — already lossless,
already pads fractions right, already rejects out-of-range components like
`1:75:00` when a higher unit is present. It accepts the superset of every shape
the old parsers took, including the courtesy forms (`1h23m45s`).

Deleted once the call sites move:

| Deleted | Was used by |
|---|---|
| `src/lib/time-input.ts` | setup matrix ×2 |
| `manage/moderation/configure/time-input.ts` | standards |
| `parseTimeInput` in `manage/moderation/shared/time-format.ts` | 7 mod surfaces |

`msToTimeInput` (format-only) in `time-format.ts` survives — it has display
callers outside these fields. `timeToMillis` in `datetime.tsx` stays: it has
non-leaderboard callers, and widening into them is out of scope.

## Call sites (one pass, all ten)

1. `submit-dialog/step-time.tsx` — submit a run (`lg`)
2. `manage/moderation/shared/manual-time-dialog.tsx` — mod sets a time (`lg`)
3. `manage/boards/add-runner-row.tsx` (`sm`)
4. `manage/boards/adjust-dialog.tsx` (`sm`)
5. `manage/boards/board-controls.tsx` — category minimum (`sm`, clearable)
6. `manage/moderation/configure/standards.tsx` — minimum policy (`sm`, clearable)
7. `setup/steps/matrix/defaults-row.tsx` — minimum (`sm`, clearable)
8. `setup/steps/matrix/category-matrix.tsx` — minimum (`sm`, clearable)
9. `shared/owner-remove-form.tsx` (`sm`)
10. `manage/moderation/shared/run-action-dialog.tsx` — replace a time (`sm`)

Each loses its local `timeText` state, its parse call, and its error string, and
gains a `number | null`.

## Behaviour changes to expect

- **Setup-matrix minimums reinterpret bare numbers.** A mod typing `95` into a
  minimums cell used to get 95 minutes; in the new field the same keystrokes
  read as `1:35`. The ambiguity is gone rather than resolved differently — the
  field shows what it understood as you type — but it is a change on a
  moderation-facing number.
- **Tenths in minimums start working.** Stored rows are not corrected: any
  minimum entered with tenths since the standards panel shipped was written 100×
  too small (`1:30.5` → 90 005ms instead of 90 500ms). Small blast radius; no
  migration proposed, flagged so it is not rediscovered as a new bug.

## Testing

- `keystrokes.test.ts` — the keystroke table as executable spec, plus backspace
  across the decimal, the 3-digit fraction cap, and the arrow-key nudges.
- `duration.test.ts` — the three existing parser suites merged; their cases
  become regression coverage that the superset parser still accepts every shape
  the old ones did.
- `duration-field.test.tsx` — one test per size: type, paste, clear, and the
  external-value re-seed while unfocused. Plus the readout: that `0:95` in the
  field reads `= 0:01:35.000` beneath it, and that `sm` only renders the readout
  while focused.

## Out of scope

- The races time forms (`set-time-for-user-form.tsx`,
  `confirm-final-time-form.tsx`) — same shape of problem, different surface.
- `timeToMillis` and its non-leaderboard callers.
- Any backfill of mis-stored minimums.
