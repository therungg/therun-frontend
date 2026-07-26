# Setup wizard step navigation — design

Date: 2026-07-26
Area: `app/(new-layout)/games-v2/[game]/setup/`, `app/(new-layout)/games-v2/[game]/manage/console/`, `src/lib/setup/`

## Problem

The board setup wizard's step navigation is hard to use and hard to read.

1. **Click targets are 3px tall.** `wizard-shell.tsx:90-106` renders each of the five
   steps as a bare `<button>` with `height: 3px; flex: 1` and no text content
   (`setup.module.scss:62-75`). The step name exists only as a `title` tooltip and an
   `aria-label`.
2. **The steps don't explain themselves.** `computeCompleteness`
   (`src/lib/setup/completeness.ts`) produces a `status` *and* a plain-English `summary`
   per step ("2 of 4 featured categories missing rules", "No categories are marked
   featured"). The wizard renders neither: it uses only `status === 'done'` to tint a bar,
   and shows one label — the current step's — beside the strip. A blocker on step 4 is
   invisible while you're on step 1.
3. **A finished board has no door back in.** `SetupChecklistCard` returns `null` when every
   step is done (`setup-checklist-card.tsx:24`), so the console's only link into the wizard
   disappears exactly when a moderator wants to revisit a setting.
4. **Labels drift.** The same five steps carry three different label sets:

   | id | `wizard-shell.tsx` | `setup-checklist-card.tsx` | `step-finish.tsx` |
   |---|---|---|---|
   | `details` | Game | Game details | Game details |
   | `categories` | Categories | Categories | Categories |
   | `defaults` | Defaults | Defaults | Game-wide defaults |
   | `exceptions` | Exceptions | Exceptions | Per-category exceptions |
   | `finish` | Finish | Go live | Finish |

## Approach

Replace the progress strip with a persistent sidebar step rail that renders the
completeness data the wizard already receives, and unify the step metadata behind one
shared model.

### 1. Shared step model — `src/lib/setup/steps.ts` (new)

Single source of truth for step presentation, sitting alongside the existing
`completeness.ts` (which stays responsible for *status*, not *labels*):

```ts
export interface SetupStepMeta {
    id: SetupStepId;
    num: number;        // 1-5, matches the StepHeader ghost numeral
    label: string;
    skippable: boolean;
}

export const SETUP_STEPS: SetupStepMeta[] = [...];
```

Canonical labels: **Game details · Categories · Defaults · Exceptions · Go live**.

`wizard-shell.tsx`, `setup-checklist-card.tsx`, and `step-finish.tsx` all drop their local
`STEPS` / `STEP_LABELS` constants and read from here. `SETUP_STEP_ORDER` in
`completeness.ts` stays as-is (it is the status-computation order); `SETUP_STEPS` must
declare the same ids in the same order — a unit test asserts that.

### 2. `SetupRail` — `setup/setup-rail.tsx` (new)

```
Props: { steps: SetupStepState[]; active: SetupStepId;
         doneCount: number; totalCount: number;
         onSelect: (id: SetupStepId) => void }
```

Renders, top to bottom:

- eyebrow `SETUP`, `{doneCount} of {totalCount} done`, and a progress meter
  (`role="progressbar"`, same shape as `console.module.scss`'s `.setupMeter`)
- five step rows, each a full-width `<button>`:

  ```
  ┌──────────────────────┐
  │ ●1  Game details     │   ← status glyph, number, label
  │     Slug celeste     │   ← summary from computeCompleteness
  └──────────────────────┘
  ```

Row anatomy and behaviour:

- **Hit area**: `min-height: 52px`, full rail width, padding `0.5rem 0.75rem`. (Was 3px.)
- **Status glyph**: `Check2` for `done`; `Dot` tinted per status for
  `todo` / `warning` / `blocker`. Reuses the tone treatment already established by
  `.setupStepDone / .setupStepWarning / .setupStepBlocker / .setupStepTodo` in
  `console.module.scss`.
- **Summary**: `SetupStepState.summary`, two-line clamp, secondary color. Always visible —
  this is what makes open blockers legible from any step.
- **Active row**: the console sidebar's vocabulary — `rgba(primary, 0.1)` background plus
  the 3px left accent rail from `console.module.scss:112-123` — and `aria-current="step"`.
- **Hover / focus**: `rgba(primary, 0.06)` tint; `:focus-visible` outline matching
  `.navItem`.

Adopting the console's sidebar vocabulary (16rem width, sticky, right border, 3px active
accent) is deliberate: the wizard and the console are the same moderator surface and should
not look like two different products. The rail's own styles live in `setup.module.scss`;
the shared values are duplicated rather than imported across module boundaries, consistent
with how the codebase already handles cross-view styling.

**Narrow screens (`max-width: 900px`)**: the rail collapses to a disclosure.

```
collapsed                       expanded
┌──────────────────────────┐   ┌──────────────────────────┐
│ SETUP  3/5 ▸ Defaults  ▾ │   │ SETUP  3/5 ▸ Defaults  ▴ │
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░ │   │ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░ │
└──────────────────────────┘   │ ●1 Game details          │
                                │    Slug celeste          │
                                │ ...                      │
                                └──────────────────────────┘
```

The trigger is a full-width button (`aria-expanded`, `aria-controls`) showing progress plus
the active step's label; expanding reveals the same rows. Selecting a step collapses it
again. Collapse state is component-local `useState` — not persisted, and not reflected in
the URL.

### 3. Wizard shell layout — `wizard-shell.tsx`, `setup.module.scss`

- `.page` becomes `display: grid; grid-template-columns: 16rem minmax(0, 1fr)` with
  `align-items: start`, mirroring `console.module.scss`'s `.body`. The identity strip spans
  both columns.
- `max-width` goes `62rem` → `76rem`, so the content column keeps roughly its current
  reading measure beside a 16rem rail.
- Below 900px the grid collapses to a single column, rail (as disclosure) above content.
- `.progressStrip`, `.progressCount`, `.progressSegment`, `.progressDone`,
  `.progressCurrent`, `.progressLabel` are deleted along with the markup at
  `wizard-shell.tsx:86-110`.
- `goTo` / `onAdvance` / `onBack` are unchanged — the rail calls the existing `goTo`, so
  URL-shareable `?step=` navigation and the `router.refresh()` re-read still behave exactly
  as they do now.
- The `01` ghost numeral in `StepHeader` stays. It duplicates the rail's number, but it is
  the visual anchor of the full-focus design and it confirms which step you landed on.

### 4. Console entry point — `setup-checklist-card.tsx`

Remove the `if (open.length === 0) return null` early return. When everything is done the
card renders a complete state: eyebrow `SETUP`, "Setup complete", a full meter, the same
step list, and a quiet "Revisit setup" link to `/games-v2/{slug}/setup`. When steps are
open, behaviour is unchanged apart from reading labels from `SETUP_STEPS`.

## Out of scope

The **forward** action is inconsistent: each step component renders its own primary
continue button inside its body, while Back and "Skip this step" live in the shared
`navBar` (`wizard-shell.tsx:122-142`). Unifying that means editing all five step
components. Raised with the user and explicitly deferred; this change does not touch the
nav bar or the step bodies.

## Testing

- `src/lib/setup/steps.test.ts` — `SETUP_STEPS` ids match `SETUP_STEP_ORDER` in order;
  numbers are 1..5 contiguous.
- Existing `completeness` tests are untouched — no status logic changes.
- Manual pass: a board with an open blocker (no featured categories) shows the blocker tone
  and its summary on the rail from step 1; a fully configured board still shows a
  "Revisit setup" door in the console; keyboard tab order walks the rail rows; the
  disclosure opens, navigates, and re-collapses under 900px.

Rendering is verified in the browser rather than by test — the change is presentational and
the repo has no component-render harness for this area.
