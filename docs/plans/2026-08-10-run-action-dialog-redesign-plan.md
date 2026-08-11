# Run-Action Dialog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unbounded Remove dialog with an adaptive two-step wizard (Decide → Confirm) and give all run-action verbs a zoned visual restyle.

**Architecture:** All logic stays in `RunActionForm` (`run-action-dialog.tsx`); new presentational components (`ScopeCards`, `CutoffPicker`, `ReasonZone`, `AffectedSummary`) live in a sibling `run-action-parts.tsx` with styles in `run-action-dialog.module.scss`. A `step` state (`decide`/`confirm`) activates only for Remove targets whose runner has ≥1 other time on the board; every other case renders the single Confirm screen. Public props of `RunActionForm`/`RunActionDialog` are unchanged, so the run-inspector and manual-inspector inline hosts keep working.

**Tech Stack:** Next.js 16 / React 19, CSS modules (SCSS, `_board.scss` mixins + `design-tokens`), Vitest + Testing Library (jsdom).

**Design doc:** `docs/plans/2026-08-10-run-action-dialog-redesign-design.md`

## Global Constraints

- Branch: `remove-flow-redesign` (already created; never push fr `main`).
- 4-space indent, single quotes, trailing commas (Biome; husky pre-commit runs it).
- `npm run typecheck` and `npm run lint` are NOT clean on main (~356 pre-existing errors) — gate on "no NEW errors in touched files", not exit 0.
- Run tests with `npx vitest run <file>` from the repo root `/home/joey/therun/therun-fr`.
- No Bootstrap `form-check` radios in the redesigned zones — segmented cards / styled rows instead. `form-select` for the reason dropdown may stay (restyled via existing classes).
- Copy rules from the design doc: cutoff legend = "Fastest time you've verified as legit"; pinned row = "None — just remove this one"; reason label = "Reason" with requirements as muted helper text.
- Existing behavior that must not change: `fasterThanLegit` computation, all mutation/preview/undo paths, `PREVIEW_GATES_CONFIRM`, `REASON_REQUIRED`, `DEFAULT_REASON`.

## File Structure

- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.tsx` — presentational: `ScopeCards`, `CutoffPicker`, `ReasonZone`, `AffectedSummary`.
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.test.tsx` — step-flow tests for `RunActionForm`.
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.tsx` — step machine, swap zones to new parts.
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.module.scss` — styles for cards, cutoff table, reason row, summary, step footer.

Existing consumers (`run-inspector.tsx`, `manual-inspector.tsx`, `row-actions.tsx`, board-curation) are untouched; their tests mock `RunActionDialog` or exercise it end-to-end and are verified in the final task.

---

### Task 1: ScopeCards + AffectedSummary (presentational parts + styles)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.module.scss`

**Interfaces:**
- Produces:
  ```ts
  export interface ScopeCardOption<V extends string> {
      value: V;
      title: string;      // e.g. 'This run'
      detail?: string;    // e.g. 'Only the 1:35:14 you opened this on'
  }
  export function ScopeCards<V extends string>(props: {
      label: string;
      options: ScopeCardOption<V>[];
      value: V;
      onChange: (v: V) => void;
      disabled?: boolean;
  }): JSX.Element;

  export function AffectedSummary(props: {
      runCount: number;
      leaderboardCount: number;
  }): JSX.Element;  // renders "N runs affected across M leaderboards." with plurals
  ```

- [ ] **Step 1: Write failing tests**

```tsx
// run-action-parts.test.tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AffectedSummary, ScopeCards } from './run-action-parts';

afterEach(cleanup);

describe('ScopeCards', () => {
    const options = [
        { value: 'run', title: 'This run', detail: 'Only this one' },
        { value: 'runner', title: 'Every run by greensuigi' },
    ] as const;

    it('renders a radiogroup with one radio per option', () => {
        render(
            <ScopeCards
                label="What are you removing?"
                options={[...options]}
                value="run"
                onChange={vi.fn()}
            />,
        );
        expect(
            screen.getByRole('radiogroup', { name: 'What are you removing?' }),
        ).toBeTruthy();
        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(2);
        expect(radios[0].getAttribute('aria-checked')).toBe('true');
        expect(radios[1].getAttribute('aria-checked')).toBe('false');
    });

    it('fires onChange with the clicked value', () => {
        const onChange = vi.fn();
        render(
            <ScopeCards
                label="What are you removing?"
                options={[...options]}
                value="run"
                onChange={onChange}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: /Every run/ }));
        expect(onChange).toHaveBeenCalledWith('runner');
    });

    it('disables every card when disabled', () => {
        render(
            <ScopeCards
                label="Scope"
                options={[...options]}
                value="run"
                onChange={vi.fn()}
                disabled
            />,
        );
        for (const r of screen.getAllByRole('radio')) {
            expect((r as HTMLButtonElement).disabled).toBe(true);
        }
    });
});

describe('AffectedSummary', () => {
    it('pluralizes counts', () => {
        render(<AffectedSummary runCount={4} leaderboardCount={1} />);
        expect(
            screen.getByText(
                (_, el) =>
                    el?.textContent === '4 runs affected across 1 leaderboard.',
            ),
        ).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx"`
Expected: FAIL — module `./run-action-parts` not found.

- [ ] **Step 3: Implement ScopeCards + AffectedSummary**

```tsx
// run-action-parts.tsx
'use client';

import { useId } from 'react';
import styles from './run-action-dialog.module.scss';

export interface ScopeCardOption<V extends string> {
    value: V;
    title: string;
    detail?: string;
}

/**
 * Segmented cards standing in for scope radios (remove run/runner, ban
 * category/game): one card per option, title + optional detail line,
 * radiogroup semantics so arrow-key users aren't worse off than before.
 */
export function ScopeCards<V extends string>({
    label,
    options,
    value,
    onChange,
    disabled = false,
}: {
    label: string;
    options: ScopeCardOption<V>[];
    value: V;
    onChange: (v: V) => void;
    disabled?: boolean;
}) {
    const labelId = useId();
    return (
        <div className={styles.zone}>
            <span id={labelId} className={styles.fieldLabel}>
                {label}
            </span>
            <div
                className={styles.scopeCards}
                role="radiogroup"
                aria-labelledby={labelId}
            >
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={opt.value === value}
                        disabled={disabled}
                        className={
                            opt.value === value
                                ? `${styles.scopeCard} ${styles.scopeCardActive}`
                                : styles.scopeCard
                        }
                        onClick={() => onChange(opt.value)}
                    >
                        <span className={styles.scopeCardTitle}>
                            {opt.title}
                        </span>
                        {opt.detail && (
                            <span className={styles.scopeCardDetail}>
                                {opt.detail}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** One-line "N runs affected across M leaderboards." summary. */
export function AffectedSummary({
    runCount,
    leaderboardCount,
}: {
    runCount: number;
    leaderboardCount: number;
}) {
    return (
        <p className={styles.previewSummary}>
            <strong>{runCount}</strong> run{runCount === 1 ? '' : 's'} affected
            across <strong>{leaderboardCount}</strong> leaderboard
            {leaderboardCount === 1 ? '' : 's'}.
        </p>
    );
}
```

Append to `run-action-dialog.module.scss`:

```scss
// ---- Zones ---------------------------------------------------
.zone {
    margin-bottom: dt.$spacing-lg;
}

// ---- Scope cards (replaces form-check radios) ----------------
.scopeCards {
    display: flex;
    gap: dt.$spacing-sm;
}

.scopeCard {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
    padding: dt.$spacing-sm dt.$spacing-md;
    text-align: left;
    background: var(--bs-tertiary-bg);
    border: 1px solid var(--bs-border-color);
    border-radius: dt.$radius-md;
    color: var(--bs-body-color);
    cursor: pointer;

    &:hover:not(:disabled) {
        border-color: var(--bs-secondary-color);
    }

    &:disabled {
        opacity: 0.6;
        cursor: default;
    }
}

.scopeCardActive {
    border-color: var(--bs-primary);
    background: var(--bs-primary-bg-subtle);
}

.scopeCardTitle {
    font-size: dt.$font-size-sm;
    font-weight: 600;
}

.scopeCardDetail {
    font-size: dt.$font-size-2xs;
    color: var(--bs-secondary-color);
}
```

(If `dt.$radius-md` doesn't exist, check `design-tokens` for the radius token
the dialog already uses — `grep -n 'radius' app/(new-layout)/styles/_design-tokens.scss`
— and use that one.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.module.scss"
git commit -m "feat(games-v2): ScopeCards + AffectedSummary parts for run-action dialog"
```

---

### Task 2: CutoffPicker (bounded scrollable time table)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.module.scss`

**Interfaces:**
- Consumes: `UserEligibleRunRow` from `types/moderation.types.ts` (fields: `runId: number`, `time: number | null`, `gameTime: number | null`, `verificationStatus: string`), `DurationToFormatted` from `~src/components/util/datetime`.
- Produces:
  ```ts
  export function CutoffPicker(props: {
      runs: UserEligibleRunRow[];      // pre-sorted fastest-first by caller
      timing: 'rt' | 'gt';             // which clock to display
      value: number | null;            // selected legit runId, null = None
      onChange: (runId: number | null) => void;
      fasterCount: number;             // |fasterThanLegit|, for the consequence line
      disabled?: boolean;
  }): JSX.Element;
  ```

- [ ] **Step 1: Write failing tests** (append to `run-action-parts.test.tsx`)

```tsx
import type { UserEligibleRunRow } from '../../../../../../types/moderation.types';
import { CutoffPicker } from './run-action-parts';

const row = (runId: number, time: number): UserEligibleRunRow => ({
    runId,
    categoryId: 10,
    categoryName: 'any-percent',
    subcategoryKey: '',
    time,
    gameTime: null,
    primaryTiming: 'rt',
    verificationStatus: 'pending',
    vodUrl: null,
    endedAt: '2026-08-01T00:00:00Z',
    isLeaderboardEntry: true,
    isLeaderboardEntryGt: false,
    rank: null,
    totalRunners: null,
});

describe('CutoffPicker', () => {
    it('pins a None row and lists each run with its status', () => {
        render(
            <CutoffPicker
                runs={[row(1, 5_725_000), row(2, 5_728_000)]}
                timing="rt"
                value={null}
                onChange={vi.fn()}
                fasterCount={0}
            />,
        );
        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(3); // None + 2 runs
        expect(radios[0].textContent).toContain('None — just remove this one');
        expect(radios[0].getAttribute('aria-checked')).toBe('true');
        expect(screen.getAllByText('pending')).toHaveLength(2);
    });

    it('selects a run row and reports it', () => {
        const onChange = vi.fn();
        render(
            <CutoffPicker
                runs={[row(1, 5_725_000)]}
                timing="rt"
                value={null}
                onChange={onChange}
                fasterCount={0}
            />,
        );
        fireEvent.click(screen.getAllByRole('radio')[1]);
        expect(onChange).toHaveBeenCalledWith(1);
    });

    it('shows the faster-runs consequence line only when a cutoff catches runs', () => {
        const { rerender } = render(
            <CutoffPicker
                runs={[row(1, 5_725_000), row(2, 5_728_000)]}
                timing="rt"
                value={2}
                onChange={vi.fn()}
                fasterCount={1}
            />,
        );
        expect(screen.getByText(/1 faster run goes with it/)).toBeTruthy();
        rerender(
            <CutoffPicker
                runs={[row(1, 5_725_000), row(2, 5_728_000)]}
                timing="rt"
                value={1}
                onChange={vi.fn()}
                fasterCount={0}
            />,
        );
        expect(screen.queryByText(/goes with it/)).toBeNull();
    });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx"`
Expected: FAIL — `CutoffPicker` is not exported.

- [ ] **Step 3: Implement CutoffPicker** (append to `run-action-parts.tsx`)

```tsx
import { DurationToFormatted } from '~src/components/util/datetime';
import type { UserEligibleRunRow } from '../../../../../../types/moderation.types';

/**
 * "Fastest time you've verified as legit" — a pinned None row plus a
 * bounded, scrollable list of the runner's other times (fastest first).
 * Rows behave as radios but render as table rows: mono time left, muted
 * status tag right. Bounded height keeps a 50-run runner from turning the
 * dialog into a scroll marathon (the reason this redesign exists).
 */
export function CutoffPicker({
    runs,
    timing,
    value,
    onChange,
    fasterCount,
    disabled = false,
}: {
    runs: UserEligibleRunRow[];
    timing: 'rt' | 'gt';
    value: number | null;
    onChange: (runId: number | null) => void;
    fasterCount: number;
    disabled?: boolean;
}) {
    const labelId = useId();
    return (
        <div className={styles.zone}>
            <span id={labelId} className={styles.fieldLabel}>
                Fastest time you&apos;ve verified as legit
            </span>
            <div
                className={styles.cutoff}
                role="radiogroup"
                aria-labelledby={labelId}
            >
                <button
                    type="button"
                    role="radio"
                    aria-checked={value == null}
                    disabled={disabled}
                    className={
                        value == null
                            ? `${styles.cutoffRow} ${styles.cutoffNone} ${styles.cutoffRowActive}`
                            : `${styles.cutoffRow} ${styles.cutoffNone}`
                    }
                    onClick={() => onChange(null)}
                >
                    None — just remove this one
                </button>
                <div className={styles.cutoffScroll}>
                    {runs.map((r) => (
                        <button
                            key={r.runId}
                            type="button"
                            role="radio"
                            aria-checked={value === r.runId}
                            disabled={disabled}
                            className={
                                value === r.runId
                                    ? `${styles.cutoffRow} ${styles.cutoffRowActive}`
                                    : styles.cutoffRow
                            }
                            onClick={() => onChange(r.runId)}
                        >
                            <span className={styles.cutoffTime}>
                                <DurationToFormatted
                                    duration={
                                        (timing === 'gt'
                                            ? r.gameTime
                                            : r.time) ?? 0
                                    }
                                />
                            </span>
                            <span className={styles.cutoffStatus}>
                                {r.verificationStatus}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            {fasterCount > 0 && (
                <p className={styles.cutoffConsequence}>
                    {fasterCount} faster run{fasterCount === 1 ? ' goes' : 's go'}{' '}
                    with it — a board always shows a runner&apos;s best eligible
                    run, so leaving a faster one behind would just promote it.
                </p>
            )}
        </div>
    );
}
```

Append to `run-action-dialog.module.scss`:

```scss
// ---- Cutoff picker -------------------------------------------
.cutoff {
    border: 1px solid var(--bs-border-color);
    border-radius: dt.$radius-md;
    overflow: hidden;
}

.cutoffScroll {
    max-height: 13.5rem; // ~6 rows
    overflow-y: auto;
}

.cutoffRow {
    display: flex;
    align-items: baseline;
    gap: dt.$spacing-md;
    width: 100%;
    padding: dt.$spacing-xs dt.$spacing-md;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--bs-border-color-translucent);
    text-align: left;
    font-size: dt.$font-size-sm;
    color: var(--bs-body-color);
    cursor: pointer;

    &:last-child {
        border-bottom: 0;
    }

    &:hover:not(:disabled) {
        background: var(--bs-tertiary-bg);
    }

    &:disabled {
        opacity: 0.6;
        cursor: default;
    }
}

.cutoffRowActive {
    background: var(--bs-primary-bg-subtle);

    &:hover:not(:disabled) {
        background: var(--bs-primary-bg-subtle);
    }
}

.cutoffNone {
    border-bottom: 1px solid var(--bs-border-color);
    font-weight: 500;
}

.cutoffTime {
    @include board.mono-time;
    font-size: dt.$font-size-sm;
    min-width: 5.5rem;
}

.cutoffStatus {
    font-size: dt.$font-size-2xs;
    color: var(--bs-tertiary-color);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.cutoffConsequence {
    font-size: dt.$font-size-2xs;
    color: var(--bs-secondary-color);
    margin: dt.$spacing-xs 0 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx"`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.module.scss"
git commit -m "feat(games-v2): CutoffPicker — bounded scrollable legit-time table"
```

---

### Task 3: ReasonZone (select + notify row + calm textarea)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.module.scss`

**Interfaces:**
- Consumes: `REMOVE_REASONS`, `removeReasonMeta`, `RemoveReason` from `./action-model`; `RefObject` from react.
- Produces:
  ```ts
  export function ReasonZone(props: {
      // Category select + notify switch — Remove only; omit for other verbs.
      category?: {
          value: RemoveReason;
          onChange: (v: RemoveReason) => void;
          notify: boolean | null;          // null hides the switch (runner scope)
          onNotifyChange: (v: boolean) => void;
      };
      reason: string;
      onReasonChange: (v: string) => void;
      required: boolean;                    // REASON_REQUIRED[verb]
      minLength: number;                    // MIN_REASON
      fieldRef?: RefObject<HTMLTextAreaElement | null>;
      disabled?: boolean;
  }): JSX.Element;
  ```
  Labels: textarea label is `Reason` (required) / `Note` (optional); helper
  line below the field reads `Required — min {minLength} characters. Audit-logged.`
  or `Optional. Audit-logged.`; the shortfall error keeps today's copy
  (`{n} more needed.`) and only shows when `required && 0 < trimmed < min`.

- [ ] **Step 1: Write failing tests** (append)

```tsx
import { ReasonZone } from './run-action-parts';

describe('ReasonZone', () => {
    it('shows calm labels: "Reason" + helper text when required', () => {
        render(
            <ReasonZone
                reason=""
                onReasonChange={vi.fn()}
                required
                minLength={10}
            />,
        );
        expect(screen.getByLabelText('Reason')).toBeTruthy();
        expect(
            screen.getByText('Required — min 10 characters. Audit-logged.'),
        ).toBeTruthy();
    });

    it('labels the field "Note" when optional', () => {
        render(
            <ReasonZone
                reason=""
                onReasonChange={vi.fn()}
                required={false}
                minLength={10}
            />,
        );
        expect(screen.getByLabelText('Note')).toBeTruthy();
        expect(screen.getByText('Optional. Audit-logged.')).toBeTruthy();
    });

    it('shows the shortfall count for a too-short required reason', () => {
        render(
            <ReasonZone
                reason="short"
                onReasonChange={vi.fn()}
                required
                minLength={10}
            />,
        );
        expect(screen.getByText('5 more needed.')).toBeTruthy();
    });

    it('renders category select + notify switch when given', () => {
        const onNotifyChange = vi.fn();
        render(
            <ReasonZone
                category={{
                    value: 'cheating',
                    onChange: vi.fn(),
                    notify: true,
                    onNotifyChange,
                }}
                reason=""
                onReasonChange={vi.fn()}
                required
                minLength={10}
            />,
        );
        expect(
            screen.getByLabelText('Why are you removing this?'),
        ).toBeTruthy();
        const toggle = screen.getByLabelText('Notify the runner and allow an appeal');
        fireEvent.click(toggle);
        expect(onNotifyChange).toHaveBeenCalledWith(false);
    });

    it('hides the notify switch when notify is null', () => {
        render(
            <ReasonZone
                category={{
                    value: 'cheating',
                    onChange: vi.fn(),
                    notify: null,
                    onNotifyChange: vi.fn(),
                }}
                reason=""
                onReasonChange={vi.fn()}
                required
                minLength={10}
            />,
        );
        expect(screen.queryByLabelText(/Notify the runner/)).toBeNull();
    });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx"`
Expected: FAIL — `ReasonZone` is not exported.

- [ ] **Step 3: Implement ReasonZone** (append to `run-action-parts.tsx`)

```tsx
import type { RefObject } from 'react';
import {
    REMOVE_REASONS,
    type RemoveReason,
    removeReasonMeta,
} from './action-model';

/**
 * The paperwork zone: optional reason-category select + notify switch on
 * one row (Remove only), then the audit-logged free-text field with its
 * requirements as muted helper text instead of a shouted label.
 */
export function ReasonZone({
    category,
    reason,
    onReasonChange,
    required,
    minLength,
    fieldRef,
    disabled = false,
}: {
    category?: {
        value: RemoveReason;
        onChange: (v: RemoveReason) => void;
        notify: boolean | null;
        onNotifyChange: (v: boolean) => void;
    };
    reason: string;
    onReasonChange: (v: string) => void;
    required: boolean;
    minLength: number;
    fieldRef?: RefObject<HTMLTextAreaElement | null>;
    disabled?: boolean;
}) {
    const selectId = useId();
    const notifyId = useId();
    const textId = useId();
    const shortfall = minLength - reason.trim().length;
    return (
        <div className={styles.zone}>
            {category && (
                <>
                    <label htmlFor={selectId} className={styles.fieldLabel}>
                        Why are you removing this?
                    </label>
                    <div className={styles.reasonRow}>
                        <select
                            id={selectId}
                            className="form-select form-select-sm"
                            value={category.value}
                            onChange={(e) =>
                                category.onChange(
                                    e.target.value as RemoveReason,
                                )
                            }
                            disabled={disabled}
                        >
                            {REMOVE_REASONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        {category.notify != null && (
                            <div className="form-check form-switch mb-0">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    id={notifyId}
                                    checked={category.notify}
                                    onChange={(e) =>
                                        category.onNotifyChange(
                                            e.target.checked,
                                        )
                                    }
                                    disabled={disabled}
                                />
                                <label
                                    className="form-check-label small text-nowrap"
                                    htmlFor={notifyId}
                                >
                                    Notify the runner and allow an appeal
                                </label>
                            </div>
                        )}
                    </div>
                    <div className={styles.reasonBlurb}>
                        {removeReasonMeta(category.value).blurb}
                    </div>
                </>
            )}
            <label htmlFor={textId} className={styles.fieldLabel}>
                {required ? 'Reason' : 'Note'}
            </label>
            <textarea
                id={textId}
                ref={fieldRef}
                className={styles.reasonTextarea}
                rows={3}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                disabled={disabled}
            />
            <div className={styles.reasonHint}>
                {required
                    ? `Required — min ${minLength} characters. Audit-logged.`
                    : 'Optional. Audit-logged.'}
            </div>
            {required && shortfall > 0 && reason.length > 0 && (
                <div className={styles.reasonError}>{shortfall} more needed.</div>
            )}
        </div>
    );
}
```

Append to `run-action-dialog.module.scss`:

```scss
// ---- Reason zone ---------------------------------------------
.reasonRow {
    display: flex;
    align-items: center;
    gap: dt.$spacing-lg;

    select {
        max-width: 18rem;
    }
}

.reasonBlurb {
    font-size: dt.$font-size-2xs;
    color: var(--bs-secondary-color);
    margin: dt.$spacing-xs 0 dt.$spacing-md;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx"`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-parts.test.tsx" \
        "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.module.scss"
git commit -m "feat(games-v2): ReasonZone — one-row category+notify, calm reason field"
```

---

### Task 4: Step machine in RunActionForm (adaptive Decide → Confirm)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.test.tsx`

**Interfaces:**
- Consumes: `ScopeCards`, `CutoffPicker`, `ReasonZone`, `AffectedSummary` from `./run-action-parts` (signatures in Tasks 1–3); everything already in `run-action-dialog.tsx`.
- Produces: `RunActionForm` public props UNCHANGED. New internal behavior:
  - `needsDecideStep = verb === 'remove' && removeRunner != null && otherRuns != null && otherRuns.length > 0`
  - `const [pastDecide, setPastDecide] = useState(false)` — `showDecide = needsDecideStep && !pastDecide`.
  - While `verb === 'remove' && removeRunner != null && otherRuns == null` (fetch in flight): render `<p className={styles.previewLoading}>Loading their other times…</p>` and a disabled footer — the layout choice waits for the fetch.
  - Decide screen: `ScopeCards` (remove scope) + (`CutoffPicker` when scope run) or the `scopeNote` sentence (scope runner). Footer: Cancel / **Continue** (`btn-primary`-styled `board-dialog-btn`? use existing `btn btn-sm btn-primary`), Continue always enabled.
  - Confirm screen (Remove with decide step): context line `styles.stepContext` restating the decision (copy below), **Back** button on the footer's left, then Cancel / Confirm remove.
  - Context copy: scope runner → `Removing {name} from {categoryDisplay} entirely.`; cutoff selected → `Removing {runIds.length} runs — everything faster than the {time} you called legit.` (render time via `DurationToFormatted`); no cutoff → `Removing this run only.`
  - Preview loading: the existing `loadPreview` effect keeps running on both screens (state changes on Decide re-trigger it; by Confirm the preview is warm).

- [ ] **Step 1: Write failing step-flow tests**

Mock the three server actions the form imports (`./actions/eligible-runs.action`, `./actions/exclude.action`, `./actions/verdicts.action`, `./actions/restore.action`, `./actions/manual-times.action`, `../rules/actions/delete-rule.action`, `react-toastify`, `./undo-toast`) with `vi.hoisted` + `vi.mock` (copy the pattern at the top of `row-actions.test.tsx`). Key mocks:

```tsx
// run-action-dialog.test.tsx
// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserEligibleRunRow } from '../../../../../../types/moderation.types';

const mocks = vi.hoisted(() => ({
    loadUserEligibleRunsAction: vi.fn(),
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
    applyVerdictsAction: vi.fn(),
    previewVerdictsAction: vi.fn(),
    restoreRunsAction: vi.fn(),
    manualTimesBulkAction: vi.fn(),
    deleteRuleAction: vi.fn(),
    fireUndoToast: vi.fn(),
    toastSuccess: vi.fn(),
}));

vi.mock('./actions/eligible-runs.action', () => ({
    loadUserEligibleRunsAction: mocks.loadUserEligibleRunsAction,
}));
vi.mock('./actions/exclude.action', () => ({
    excludeAction: mocks.excludeAction,
    previewExcludeAction: mocks.previewExcludeAction,
}));
vi.mock('./actions/verdicts.action', () => ({
    applyVerdictsAction: mocks.applyVerdictsAction,
    previewVerdictsAction: mocks.previewVerdictsAction,
}));
vi.mock('./actions/restore.action', () => ({
    restoreRunsAction: mocks.restoreRunsAction,
}));
vi.mock('./actions/manual-times.action', () => ({
    manualTimesBulkAction: mocks.manualTimesBulkAction,
}));
vi.mock('../rules/actions/delete-rule.action', () => ({
    deleteRuleAction: mocks.deleteRuleAction,
}));
vi.mock('./undo-toast', () => ({ fireUndoToast: mocks.fireUndoToast }));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, error: vi.fn() },
}));

import { RunActionForm } from './run-action-dialog';

const eligible = (runId: number, time: number): UserEligibleRunRow => ({
    runId,
    categoryId: 10,
    categoryName: 'any-percent',
    subcategoryKey: '',
    time,
    gameTime: null,
    primaryTiming: 'rt',
    verificationStatus: 'pending',
    vodUrl: null,
    endedAt: '2026-08-01T00:00:00Z',
    isLeaderboardEntry: true,
    isLeaderboardEntryGt: false,
    rank: null,
    totalRunners: null,
});

const RUNNER_TARGET = {
    kind: 'runs' as const,
    runIds: [99],
    label: "greensuigi's run",
    runner: {
        id: 'u1',
        name: 'greensuigi',
        categoryId: 10,
        categoryDisplay: '120 Star',
        subcategoryKey: '',
        primaryTiming: 'rt' as const,
    },
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.previewVerdictsAction.mockResolvedValue({
        preview: {
            affectedRunCount: 1,
            affectedLeaderboards: [{}],
            sampleRuns: [],
        },
    });
    mocks.previewExcludeAction.mockResolvedValue({
        preview: {
            affectedRunCount: 1,
            affectedLeaderboards: [{}],
            sampleRuns: [],
        },
    });
});
afterEach(cleanup);

function renderRemove(rows: UserEligibleRunRow[]) {
    mocks.loadUserEligibleRunsAction.mockResolvedValue({
        ok: true,
        rows,
    });
    return render(
        <RunActionForm
            gameSlug="mario64"
            verb="remove"
            target={RUNNER_TARGET}
            onDone={vi.fn()}
            onClose={vi.fn()}
        />,
    );
}

describe('remove step flow', () => {
    it('two steps when the runner has other times: Decide then Confirm', async () => {
        renderRemove([eligible(1, 5_725_000), eligible(2, 5_728_000)]);
        // Decide screen: scope + cutoff, no reason field yet.
        await screen.findByRole('radiogroup', {
            name: 'What are you removing?',
        });
        expect(screen.queryByLabelText('Reason')).toBeNull();
        expect(
            screen.getByRole('radiogroup', {
                name: "Fastest time you've verified as legit",
            }),
        ).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        // Confirm screen: context line + reason, no cutoff.
        expect(screen.getByText('Removing this run only.')).toBeTruthy();
        expect(screen.getByLabelText('Reason')).toBeTruthy();
        expect(
            screen.queryByRole('radiogroup', {
                name: "Fastest time you've verified as legit",
            }),
        ).toBeNull();
        // Back returns to Decide with state intact.
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(
            screen.getByRole('radiogroup', { name: 'What are you removing?' }),
        ).toBeTruthy();
    });

    it('single screen when the runner has no other times', async () => {
        renderRemove([]);
        // Straight to the confirm form: reason present, no Continue.
        await screen.findByLabelText('Reason');
        expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
        expect(
            screen.getByText('They have no other times on this board.'),
        ).toBeTruthy();
        expect(
            screen.getByRole('radiogroup', { name: 'What are you removing?' }),
        ).toBeTruthy();
    });

    it('cutoff selection carries into the confirm payload', async () => {
        renderRemove([eligible(1, 5_725_000), eligible(2, 5_728_000)]);
        await screen.findByRole('radiogroup', {
            name: "Fastest time you've verified as legit",
        });
        // Call the SLOWER run legit → the faster one (1) goes too.
        fireEvent.click(screen.getAllByRole('radio')[4]); // None, run1, plus 2 scope radios before — adjust index to the cutoff group's last row
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        fireEvent.change(screen.getByLabelText('Reason'), {
            target: { value: 'spliced VOD, checked frames' },
        });
        mocks.excludeAction.mockResolvedValue({ result: { excluded: 2 } });
        mocks.applyVerdictsAction.mockResolvedValue({
            result: { affectedRunCount: 2 },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm remove' }),
        );
        await waitFor(() => {
            // notify defaults ON for cheating → verdict (reject) path.
            expect(mocks.applyVerdictsAction).toHaveBeenCalledWith(
                'mario64',
                'reject',
                [99, 1],
                'spliced VOD, checked frames',
            );
        });
    });
});
```

Note for the implementer: the radio-index in the third test is brittle by
design of the query — prefer
`screen.getByRole('radio', { name: /1:35:28/ })` if `DurationToFormatted`
renders an accessible name (check its output in the failing render; it
formats ms → `h:mm:ss`). Use whatever stable query works, the assertion that
matters is `applyVerdictsAction` receiving `[99, 1]`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.test.tsx"`
Expected: FAIL — no `Continue` button / `Reason` label yet (current UI renders everything at once with the old labels).

- [ ] **Step 3: Implement the step machine**

In `run-action-dialog.tsx`:

1. Import the parts: `import { AffectedSummary, CutoffPicker, ReasonZone, ScopeCards } from './run-action-parts';`
2. Add state + derivations inside `RunActionForm` (near `removeScope`):
   ```tsx
   const [pastDecide, setPastDecide] = useState(false);
   const otherTimesPending =
       verb === 'remove' && removeRunner != null && otherRuns == null;
   const needsDecideStep =
       verb === 'remove' &&
       removeRunner != null &&
       (otherRuns?.length ?? 0) > 0;
   const showDecide = needsDecideStep && !pastDecide;
   ```
   Also fix the eligible-runs load effect's guard: it currently skips while
   `removesRunner` — keep that, but the effect must still have run once
   before the layout is chosen, which it does (initial scope is `'run'`).
3. Replace the body's return with three branches:
   - `otherTimesPending` → loading body (`Loading their other times…`) + footer with Cancel only (Confirm/Continue disabled).
   - `showDecide` → Decide body:
     ```tsx
     <ScopeCards
         label="What are you removing?"
         options={[
             {
                 value: 'run',
                 title: 'This run',
                 detail: `Only ${target.kind === 'runs' ? target.label : 'this run'}`,
             },
             {
                 value: 'runner',
                 title: `Every run by ${removeRunner.name}`,
                 detail: `Their whole presence on ${removeRunner.categoryDisplay}`,
             },
         ]}
         value={removeScope}
         onChange={(v) => setRemoveScope(v)}
         disabled={isConfirming}
     />
     {removesRunner ? (
         <p className={styles.scopeNote}>…existing sentence…</p>
     ) : (
         <CutoffPicker
             runs={otherRuns ?? []}
             timing={removeRunner.primaryTiming}
             value={legitRunId}
             onChange={setLegitRunId}
             fasterCount={fasterThanLegit.length}
             disabled={isConfirming}
         />
     )}
     ```
     Footer: Cancel + `<button className="btn btn-sm btn-primary" onClick={() => setPastDecide(true)}>Continue</button>`.
   - otherwise → Confirm body (used by ALL verbs):
     - If `needsDecideStep` (came through Decide): context line
       ```tsx
       <p className={styles.stepContext}>
           {removesRunner
               ? `Removing ${removeRunner.name} from ${removeRunner.categoryDisplay} entirely.`
               : legitRunId != null
                 ? <>Removing {runIds.length} runs — everything faster than the legit time.</>
                 : 'Removing this run only.'}
       </p>
       ```
       (Exact copy: use `DurationToFormatted` for the legit time inside the middle branch: find the legit row in `otherRuns` and render its time.)
     - If Remove without decide step and runner known (zero other times): keep the inline `ScopeCards` + the muted sentence `They have no other times on this board.` (replaces the old fieldset paragraph).
     - Ban scope radios → `ScopeCards` with options `From this category` / `From the entire game` (no detail lines).
     - Reason section → `ReasonZone` (category prop only when `verb === 'remove'`; `notify: removesRunner ? null : notify`).
     - Preview summary → `AffectedSummary` fed from `preview.data`; keep the skipped/not-found note, manual-times note, sample tables/lists exactly as they are.
     - Footer: `needsDecideStep` prepends a Back button (`btn btn-sm btn-outline-secondary`, `onClick={() => setPastDecide(false)}`, disabled while confirming) before Cancel/Confirm.
4. Delete the now-dead JSX: old remove-scope fieldset, old legit-run fieldset, old reason `<select>` + notify switch + textarea block, old ban radios, old preview summary `<p>`.
5. Keep `handleConfirm`, `loadPreview`, and all hooks byte-identical except: nothing in them changes (state names are reused).
6. `RunActionDialog` wrapper: no API change; the header title is fine as-is.

- [ ] **Step 4: Run the new suite + the parts suite**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/moderation/shared/"`
Expected: PASS.

- [ ] **Step 5: Run the existing dependent suites**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/boards/" "app/(new-layout)/games-v2/[game]/leaderboard/"`
Expected: PASS — these either mock RunActionDialog (row-actions) or drive the real form (board-curation). If board-curation tests fail on the new flow (they exercise Remove with a runner who has other times → now two steps), update them to click `Continue` before filling the reason; if they fail on the renamed reason label, switch `getByLabelText(/Reason — required/i)`-style queries to `getByLabelText('Reason')`.

- [ ] **Step 6: Typecheck touched files**

Run: `npm run typecheck 2>&1 | grep "run-action"`
Expected: no output (no new errors in touched files).

- [ ] **Step 7: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/moderation/shared/" \
        "app/(new-layout)/games-v2/[game]/manage/boards/"
git commit -m "feat(games-v2): adaptive two-step Remove — Decide (scope+cutoff) then Confirm"
```

---

### Task 5: Single-screen restyle sweep + full verification

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.tsx` (only if Task 4 left any old-style zone)
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.module.scss`
- Modify: `docs/plans/2026-08-10-run-action-dialog-redesign-design.md` (mark implemented)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: final visual pass; no API changes.

- [ ] **Step 1: Audit every verb's rendered form against the design**

Render each verb in the existing test harness (or temporary test) and check:
- approve/unverify/restore: `ReasonZone` optional-note labels, `AffectedSummary`, no scope zone. Footer confirm colors unchanged (`btn-success` / `btn-secondary` / `btn-danger`).
- reject: required `ReasonZone`, no category select (Remove-only).
- ban (target kind `runner`): `ScopeCards` for category/game, scope mirrored to dialog header via `onScopeChange` still firing.
- remove single-screen (guest / bulk / zero-other-times): scope cards where runner known, sentence where not.
Fix any zone still using raw Bootstrap stacking.

- [ ] **Step 2: Add the step-context style and any missing polish styles**

```scss
// ---- Step context (Confirm screen restating Decide) ----------
.stepContext {
    font-size: dt.$font-size-sm;
    color: var(--bs-body-color);
    padding: dt.$spacing-sm dt.$spacing-md;
    background: var(--bs-tertiary-bg);
    border-left: 2px solid var(--bs-primary);
    border-radius: dt.$radius-sm;
    margin-bottom: dt.$spacing-lg;
}
```

(Skip if already added in Task 4; verify `dt.$radius-sm` exists, else reuse the dialog's radius token.)

- [ ] **Step 3: Run the full affected test surface**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/"`
Expected: PASS.

- [ ] **Step 4: Lint + typecheck delta**

Run: `npx @biomejs/biome check "app/(new-layout)/games-v2/[game]/manage/moderation/shared/"` and `npm run typecheck 2>&1 | grep -c "run-action"`
Expected: Biome clean on touched dir; grep count 0.

- [ ] **Step 5: Mark design doc implemented + commit**

Change the design doc's `Status:` line to `implemented 2026-08-10`.

```bash
git add -A
git commit -m "feat(games-v2): zoned restyle for all run-action verbs; design doc implemented"
```

- [ ] **Step 6: Push the branch**

```bash
git push -u origin remove-flow-redesign
```

(Never push fr `main`; Joey opens the PR himself.)
