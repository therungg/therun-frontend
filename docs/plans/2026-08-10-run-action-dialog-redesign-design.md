# Run-action dialog redesign (Remove flow + shared restyle)

Date: 2026-08-10 · Branch: `remove-flow-redesign` · Status: approved design

## Problem

The Remove dialog renders every one of the runner's other times as an unbounded
flat radio list (50+ rows for active runners), pushing the reason field and
Confirm button multiple screens down. All verbs share default Bootstrap
controls stacked with uniform weight — no hierarchy between the big decision
(scope), the optional refinement (cutoff), and the paperwork (reason).

## Decisions (agreed with Joey)

- **Adaptive two-step wizard for Remove, only when needed.** The Decide step
  exists only when the target is a single-runner selection AND the runner has
  ≥1 other time on this board. Otherwise the dialog is a single screen.
- **Zero other times / guest / bulk selection → single screen**, with scope
  cards inline on that screen (when a runner is known).
- **All verbs restyled** (Verify, Unverify, Reject, Restore, Ban) with the same
  zoned visual treatment; they stay single-screen.
- Rejected: one tall zoned screen (A), disclosure-collapsed cutoff (B).

## Flow

```
open dialog
  verb != remove, or no runner, or bulk ──────────────► single screen
  verb == remove + runner known:
      load other times (existing fetch, now blocks layout choice;
      brief skeleton while in flight)
        0 other times ──────────────────────────────► single screen
        ≥1 other time ──────────────────────────────► Step 1 → Step 2
```

### Step 1 — Decide (Remove only)

- **Scope** as two segmented cards (not radios): "This run — {time}" /
  "Every run by {name} on {category}".
- Scope = run → **cutoff picker**: pinned "None — just remove this one" row,
  then a dense scrollable table (mono time, muted status tag), max-height
  ≈ 6 rows. Below it, the "N faster runs go with it" consequence line when a
  cutoff is chosen.
- Scope = runner → existing consequence sentence replaces the picker.
- Footer: Cancel / **Continue**.

### Step 2 — Confirm (Remove, after step 1)

- Context line under the title restating the decision, e.g.
  "Removing 4 runs — everything faster than 1:37:00" or
  "Removing greensuigi from 120 Star entirely".
- **Reason zone**: category select + notify switch on one row, textarea below,
  helper copy under the select as today.
- Affected summary as one line above the footer; the sample-runs preview table
  renders only when it adds information (runner scope or multi-leaderboard).
- Footer: **Back** / Cancel / Confirm remove.

### Single screen (everything else, all verbs)

Today's short form with the zoned cleanup: scope cards where a scope choice
exists (ban category/game; remove run/runner when the runner is known but has
no other times), reason zone, one-line summary, footer. Manual-time notes and
skip/not-found notes keep their current placement.

## Visual system

All in `run-action-dialog.module.scss`, reusing `board.scss` mixins and
design tokens; no new global styles.

- **Segmented scope cards**: equal-width buttons in a bordered group; selected
  card gets accent border + subtle fill; secondary description line inside
  each card. Replaces `form-check` radios for remove scope AND ban scope.
- **Cutoff table**: bordered, `max-height` scroll container; rows are
  radio-behaviour but styled as table rows (click anywhere, selected row
  highlighted); mono times right-padded, status as a small muted tag; the
  "None" row pinned above the scroll area.
- **Zone labels**: existing `fieldLabel` treatment, consistently applied.
- **Reason row**: select + notify switch share one flex row.
- Dialog stays `size="lg"`; height becomes predictable (bounded scroll).

## Code shape

`run-action-dialog.tsx` keeps its public API (`RunActionForm` props unchanged
— the run inspector's inline host and `RunActionDialog` both keep working).
Internally:

- `useRunActionState` stays inline; add `step: 'decide' | 'confirm'` state,
  derived `needsDecideStep`.
- Extract presentational pieces: `ScopeCards`, `CutoffPicker`,
  `ReasonZone`, `AffectedSummary` (same file or siblings in `shared/`).
- The inline (inspector) host gets the same adaptive steps — Continue/Back
  swap the form body in place.
- Mutation/preview/undo logic unchanged.

## Copy

- Cutoff legend becomes the question it's really asking:
  "Fastest time you've verified as legit" (pinned row: "None — just remove
  this one").
- Reason textarea label shortens to "Reason" with the requirements as muted
  helper text below the field, not shouted in the label.

## Testing

Update `row-actions.test.tsx`, `board-curation.test.tsx`,
`board-curation-remove-integration.test.tsx` for the new step flow and
renamed legends. New cases: step gating (0 vs ≥1 other times), Continue/Back
state retention, cutoff selection still computes `fasterThanLegit`.
