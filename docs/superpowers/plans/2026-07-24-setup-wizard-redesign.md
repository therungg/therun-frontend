# Setup Wizard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the game setup wizard at `app/(new-layout)/games-v2/[game]/setup/` as a five-step full-focus flow (Game data → Category triage → Defaults → Exceptions → Mods & finish) and sharpen the console `SetupChecklistCard`, per `docs/superpowers/specs/2026-07-24-setup-wizard-redesign-design.md`.

**Architecture:** Pure step-model changes land first in `src/lib/setup/` (TDD, vitest), then the wizard UI is rebuilt step by step against the existing server actions — no backend changes, every write goes through actions that already exist. The shell loses the sidebar rail and welcome step; each step becomes a centered full-focus screen with a shared `StepHeader` (ghost numeral + title + lede).

**Tech Stack:** Next.js 16 App Router, React 19, SCSS modules with the `board.*` mixin system (`app/(new-layout)/styles/_board.scss`, `_design-tokens.scss`), vitest for `src/lib` units.

## Global Constraints

- **Branch:** all work on `setup-wizard-redesign`, branched from `game-links`. The working tree has unrelated uncommitted changes (game-links styling work) — NEVER `git add -A`; always add the exact files listed in each commit step.
- **No backend changes.** Only these existing server actions are called: `curateCategoryAction`, `createGroupAction`, `updateCategorySettingsAction`, `updateTimingSettingsAction`, `createPolicyAction`, `addGameModeratorAction`, `removeGameModeratorAction`, `setGameConfiguredAction`.
- **No gradient washes** (standing user rule). Visual weight comes from scale, type, spacing. All controls through `board.*` mixins; colors through design tokens (`accent-red`/`accent-amber`/`--bs-primary` only — no raw Bootstrap `text-danger`/`btn-success` classes in new code).
- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons. Unused vars prefixed `_`.
- Step ids are exactly: `details`, `categories`, `defaults`, `exceptions`, `finish` (this order).
- URL model unchanged: `?step=<id>` (+ `&cat=<id>` on exceptions), `router.replace` then `router.refresh()` on every step change.
- Commands run from `/home/joey/therun/therun-fr`. Verify with `npm run typecheck`, `npm run test`, `npm run lint`.

---

### Task 0: Branch

- [ ] **Step 1: Create the branch**

```bash
cd /home/joey/therun/therun-fr
git checkout -b setup-wizard-redesign
```

Expected: `Switched to a new branch 'setup-wizard-redesign'`. Unrelated modified files (game-page.module.scss etc.) stay in the working tree untouched — never commit them.

---

### Task 1: `suggestFeaturedIds` heuristic

**Files:**
- Modify: `src/lib/setup/suggestions.ts`
- Test: `src/lib/setup/__tests__/suggestions.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `suggestFeaturedIds(categories: FeaturedCandidate[]): Set<number>` with `interface FeaturedCandidate { id: number; totalFinishedAttemptCount: number; uniqueRunners: number }`. Task 4 (triage step) calls this to pre-check rows.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/setup/__tests__/suggestions.test.ts`:

```ts
import { suggestFeaturedIds } from '../suggestions';

describe('suggestFeaturedIds', () => {
    const cat = (
        id: number,
        runs: number,
        runners: number,
    ): { id: number; totalFinishedAttemptCount: number; uniqueRunners: number } => ({
        id,
        totalFinishedAttemptCount: runs,
        uniqueRunners: runners,
    });

    it('returns empty for no categories', () => {
        expect(suggestFeaturedIds([]).size).toBe(0);
    });

    it('always includes the most-run category, even below thresholds', () => {
        const picked = suggestFeaturedIds([cat(1, 1, 1), cat(2, 0, 0)]);
        expect(picked.has(1)).toBe(true);
        expect(picked.has(2)).toBe(false);
    });

    it('includes categories holding ≥5% of runs', () => {
        // total = 100; id 2 has exactly 5%
        const picked = suggestFeaturedIds([
            cat(1, 95, 1),
            cat(2, 5, 1),
        ]);
        expect(picked.has(2)).toBe(true);
    });

    it('includes low-share categories with ≥3 unique runners', () => {
        const picked = suggestFeaturedIds([
            cat(1, 1000, 5),
            cat(2, 2, 3),
            cat(3, 2, 2),
        ]);
        expect(picked.has(2)).toBe(true);
        expect(picked.has(3)).toBe(false);
    });

    it('caps suggestions at 10', () => {
        const cats = Array.from({ length: 20 }, (_, i) =>
            cat(i + 1, 100, 10),
        );
        expect(suggestFeaturedIds(cats).size).toBe(10);
    });
});
```

Note the existing file already imports `describe`/`expect`/`it` from vitest at the top — reuse that import; only add `suggestFeaturedIds` to the existing `../suggestions` import.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/setup/__tests__/suggestions.test.ts`
Expected: FAIL — `suggestFeaturedIds` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/setup/suggestions.ts`:

```ts
export interface FeaturedCandidate {
    id: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

const SUGGEST_CAP = 10;
const SUGGEST_MIN_SHARE = 0.05;
const SUGGEST_MIN_RUNNERS = 3;

/**
 * Which categories to pre-check on the triage step when a board has no
 * explicit featured flags yet. Always the most-run category, plus any
 * holding ≥5% of finished runs or with ≥3 unique runners, capped at 10.
 */
export function suggestFeaturedIds(
    categories: FeaturedCandidate[],
): Set<number> {
    if (categories.length === 0) return new Set();
    const total = categories.reduce(
        (sum, c) => sum + c.totalFinishedAttemptCount,
        0,
    );
    const sorted = [...categories].sort(
        (a, b) => b.totalFinishedAttemptCount - a.totalFinishedAttemptCount,
    );
    const picked = new Set<number>([sorted[0].id]);
    for (const c of sorted) {
        if (picked.size >= SUGGEST_CAP) break;
        const share = total > 0 ? c.totalFinishedAttemptCount / total : 0;
        if (share >= SUGGEST_MIN_SHARE || c.uniqueRunners >= SUGGEST_MIN_RUNNERS) {
            picked.add(c.id);
        }
    }
    return picked;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/setup/__tests__/suggestions.test.ts`
Expected: PASS (all existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/setup/suggestions.ts src/lib/setup/__tests__/suggestions.test.ts
git commit -m "feat(setup): suggestFeaturedIds heuristic for triage pre-check"
```

---

### Task 2: New five-step model in `completeness.ts` + `health.ts`, mechanical consumer updates

**Files:**
- Modify: `src/lib/setup/completeness.ts`
- Modify: `src/lib/setup/health.ts` (STEP_PANE map)
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (STEPS array + switch, mechanical only)
- Modify: `app/(new-layout)/games-v2/[game]/setup/page.tsx:141` (fallback step)
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-finish.tsx` (STEP_LABELS, reviewSteps filter, editLinkFor)
- Test: `src/lib/setup/__tests__/completeness.test.ts`, `src/lib/setup/__tests__/health.test.ts`

**Interfaces:**
- Produces: `SetupStepId = 'details' | 'categories' | 'defaults' | 'exceptions' | 'finish'`; `SETUP_STEP_ORDER` in that order. `computeCompleteness` signature unchanged (`CompletenessInput` → `BoardCompleteness`); it now emits exactly 5 steps. All later tasks rely on these ids.
- Consumes: nothing from Task 1.

The repo must compile after this task, so the wizard consumers get mechanical renames here; their visual rebuild comes later.

- [ ] **Step 1: Update the completeness tests to the new model**

In `src/lib/setup/__tests__/completeness.test.ts`, update every assertion that references step ids:
- `'welcome'` step assertions: delete (step no longer exists).
- `'category-config'` → `'exceptions'`.
- Any `totalCount` expectation of `6` → `5`.
- Step-order assertions → `['details', 'categories', 'defaults', 'exceptions', 'finish']`.

Add one new test pinning the order and the exceptions mapping:

```ts
it('emits the five steps in wizard order', () => {
    const c = computeCompleteness(input({}));
    expect(c.steps.map((s) => s.step)).toEqual([
        'details',
        'categories',
        'defaults',
        'exceptions',
        'finish',
    ]);
});

it('warns on exceptions when featured categories lack rules', () => {
    const c = computeCompleteness(
        input({
            categories: [
                {
                    id: 1,
                    display: 'Any%',
                    active: true,
                    isMain: true,
                    hasRules: false,
                },
            ],
        }),
    );
    const exceptions = c.steps.find((s) => s.step === 'exceptions');
    expect(exceptions?.status).toBe('warning');
});
```

In `src/lib/setup/__tests__/health.test.ts`, update any `'category-config'` references to `'exceptions'` (the STEP_PANE mapping test, if present — read the file and adjust assertions to the new ids; the pane values stay `'rules'` for exceptions and `'timing'` for defaults).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/setup/__tests__/completeness.test.ts src/lib/setup/__tests__/health.test.ts`
Expected: FAIL — old ids still emitted.

- [ ] **Step 3: Rewrite the step model in `completeness.ts`**

Replace the `SetupStepId` type, `SETUP_STEP_ORDER`, and the body of `computeCompleteness` (everything else — interfaces, `categoryFactsFromResolved` — stays):

```ts
export type SetupStepId =
    | 'details'
    | 'categories'
    | 'defaults'
    | 'exceptions'
    | 'finish';
```

```ts
export const SETUP_STEP_ORDER: SetupStepId[] = [
    'details',
    'categories',
    'defaults',
    'exceptions',
    'finish',
];
```

```ts
export function computeCompleteness(
    input: CompletenessInput,
): BoardCompleteness {
    // "main" everywhere = active && isMain — not-main is not shown on the
    // leaderboard, so mains are the categories that actually appear.
    const mains = input.categories.filter((c) => c.active && c.isMain);
    const emptyBoard = input.categories.length === 0;
    const steps: SetupStepState[] = [];

    steps.push(
        input.slug
            ? {
                  step: 'details',
                  status: 'done',
                  summary: `Slug ${input.slug}`,
              }
            : {
                  step: 'details',
                  status: 'todo',
                  summary: 'Slug missing',
              },
    );

    if (emptyBoard) {
        // Ingestion-empty board: categories appear when runs arrive; the
        // wizard is completable without them (spec: empty-board exception).
        steps.push({
            step: 'categories',
            status: 'done',
            summary: 'No ingested categories yet — they appear as runs arrive',
        });
    } else if (mains.length === 0) {
        steps.push({
            step: 'categories',
            status: 'blocker',
            summary: 'No categories are marked featured (shown on the board)',
        });
    } else {
        steps.push({
            step: 'categories',
            status: 'done',
            summary: `${mains.length} shown / ${
                input.categories.length - mains.length
            } hidden`,
        });
    }

    const hasDefaultsContent =
        input.policyCount > 0 || input.requireVideoAnywhere;
    steps.push({
        step: 'defaults',
        status: 'done',
        summary: hasDefaultsContent
            ? 'Standards set'
            : 'Optional — game-wide defaults',
    });

    if (emptyBoard || mains.length === 0) {
        steps.push({
            step: 'exceptions',
            status: 'todo',
            summary: 'Review exceptions after choosing featured categories',
        });
    } else {
        const mainsWithoutRules = mains.filter((c) => !c.hasRules);
        if (mainsWithoutRules.length === 0) {
            steps.push({
                step: 'exceptions',
                status: 'done',
                summary: `All ${mains.length} featured categories have rules`,
            });
        } else {
            steps.push({
                step: 'exceptions',
                status: 'warning',
                summary: `${mainsWithoutRules.length} of ${mains.length} featured categories missing rules`,
            });
        }
    }

    steps.push(
        input.configured
            ? { step: 'finish', status: 'done', summary: 'Setup complete' }
            : {
                  step: 'finish',
                  status: 'todo',
                  summary: 'Setup not marked complete',
              },
    );

    const firstIncomplete =
        steps.find((s) => s.status !== 'done')?.step ?? null;
    return {
        steps,
        firstIncomplete,
        doneCount: steps.filter((s) => s.status === 'done').length,
        totalCount: steps.length,
        blockers: steps
            .filter((s) => s.status === 'blocker')
            .map((s) => s.summary),
        warnings: steps
            .filter((s) => s.status === 'warning')
            .map((s) => s.summary),
    };
}
```

Note `variableCount` no longer feeds the defaults summary (variables left the wizard) but stays in `CompletenessInput` — `page.tsx` still passes it and health may use it; do not remove the field.

- [ ] **Step 4: Update `health.ts` STEP_PANE**

```ts
const STEP_PANE: Partial<Record<SetupStepId, string>> = {
    details: 'game-details',
    categories: 'categories-visibility',
    defaults: 'timing',
    exceptions: 'rules',
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS across the suite.

- [ ] **Step 6: Mechanical consumer updates so the app compiles**

`wizard-shell.tsx`:
- STEPS array becomes (StepCategoryConfig temporarily serves as the exceptions screen until Task 6):

```ts
const STEPS: { id: SetupStepId; label: string; skippable: boolean }[] = [
    { id: 'details', label: 'Game', skippable: true },
    { id: 'categories', label: 'Categories', skippable: true },
    { id: 'defaults', label: 'Defaults', skippable: true },
    { id: 'exceptions', label: 'Exceptions', skippable: true },
    { id: 'finish', label: 'Finish', skippable: false },
];
```

- In `CurrentStep`: delete the `'welcome'` case and its import; rename the `'category-config'` case to `'exceptions'` (still rendering `<StepCategoryConfig …/>` for now); keep `'defaults'` rendering `<StepDefaults …/>`.
- Delete the `StepWelcome` import. Do NOT delete `steps/step-welcome.tsx` yet (Task 3 does).

`page.tsx` line 141: `?? 'welcome'` → `?? 'details'`.

`steps/step-finish.tsx`:
- STEP_LABELS:

```ts
const STEP_LABELS: Record<SetupStepId, string> = {
    details: 'Game details',
    categories: 'Categories',
    defaults: 'Game-wide defaults',
    exceptions: 'Per-category exceptions',
    finish: 'Finish',
};
```

- `reviewSteps` filter: `(s) => s.step !== 'finish'` (no more welcome).
- `editLinkFor`: replace the `'category-config'` branch with `'exceptions'` (same `&cat=` deep-link shape):

```ts
const editLinkFor = (s: (typeof reviewSteps)[number]) => {
    if (s.step === 'exceptions' && s.status !== 'done') {
        return firstUnconfiguredMain
            ? `/games-v2/${data.game.name}/setup?step=exceptions&cat=${firstUnconfiguredMain.id}`
            : `/games-v2/${data.game.name}/setup?step=exceptions`;
    }
    return `/games-v2/${data.game.name}/setup?step=${s.step}`;
};
```

`steps/step-category-config.tsx`: in `urlFor` (line ~50), change `step=category-config` to `step=exceptions` so its internal category-switch links keep working during the transition.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: clean. (`step-welcome.tsx` no longer imported but still compiles standalone.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/setup/completeness.ts src/lib/setup/health.ts \
  src/lib/setup/__tests__/completeness.test.ts src/lib/setup/__tests__/health.test.ts \
  "app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx" \
  "app/(new-layout)/games-v2/[game]/setup/page.tsx" \
  "app/(new-layout)/games-v2/[game]/setup/steps/step-finish.tsx" \
  "app/(new-layout)/games-v2/[game]/setup/steps/step-category-config.tsx"
git commit -m "refactor(setup): five-step model (details/categories/defaults/exceptions/finish)"
```

---

### Task 3: Full-focus shell — identity strip, progress strip, StepHeader, SCSS rebuild

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (full rewrite)
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-header.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/setup.module.scss` (rewrite; keep shared classes)
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx` (reframed copy)
- Delete: `app/(new-layout)/games-v2/[game]/setup/steps/step-welcome.tsx`

**Interfaces:**
- Consumes: `SETUP_STEP_ORDER`, `SetupStepId` from Task 2.
- Produces: `StepHeader({ num, title, lede }: { num: number; title: ReactNode; lede?: ReactNode })` — every later step task renders this as its first child. SCSS classes later tasks rely on: `styles.section`, `styles.primaryAction`, `styles.secondaryAction`, `styles.table`, `styles.infoNote`, `styles.warnNote`, `styles.errorNote`, `styles.rows`, `styles.rowItem`, `styles.pendingPill`, `styles.heldPill`, `styles.textDanger`, `styles.textWarning`, `styles.textSuccess`, `styles.statTile`, `styles.statValue`, `styles.statLabel`, plus new `styles.meter`, `styles.meterFill`, `styles.activityBar`, `styles.activityFill`, `styles.rowDimmed`.

- [ ] **Step 1: Create `steps/step-header.tsx`**

```tsx
import type { ReactNode } from 'react';
import styles from '../setup.module.scss';

interface Props {
    num: number;
    title: ReactNode;
    lede?: ReactNode;
}

/** Shared full-focus step header: ghost numeral + job statement + context. */
export function StepHeader({ num, title, lede }: Props) {
    return (
        <header className={styles.stepHeader}>
            <span className={styles.ghostNum} aria-hidden>
                {String(num).padStart(2, '0')}
            </span>
            <div className={styles.stepHeaderText}>
                <h2 className={styles.stepTitle}>{title}</h2>
                {lede && <p className={styles.stepLede}>{lede}</p>}
            </div>
        </header>
    );
}
```

- [ ] **Step 2: Rewrite `wizard-shell.tsx`**

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
    SETUP_STEP_ORDER,
    type SetupStepId,
} from '~src/lib/setup/completeness';
import { BackLink } from '../shared/back-link';
import styles from './setup.module.scss';
import { StepCategories } from './steps/step-categories';
import { StepCategoryConfig } from './steps/step-category-config';
import { StepDefaults } from './steps/step-defaults';
import { StepDetails } from './steps/step-details';
import { StepFinish } from './steps/step-finish';
import type { WizardData } from './types';

const STEPS: { id: SetupStepId; label: string; skippable: boolean }[] = [
    { id: 'details', label: 'Game', skippable: true },
    { id: 'categories', label: 'Categories', skippable: true },
    { id: 'defaults', label: 'Defaults', skippable: true },
    { id: 'exceptions', label: 'Exceptions', skippable: true },
    { id: 'finish', label: 'Finish', skippable: false },
];

interface Props {
    data: WizardData;
    initialStep: SetupStepId;
}

export function WizardShell({ data, initialStep }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const stepParam = searchParams.get('step');
    const step: SetupStepId =
        stepParam && SETUP_STEP_ORDER.includes(stepParam as SetupStepId)
            ? (stepParam as SetupStepId)
            : initialStep;
    const stepIndex = STEPS.findIndex((s) => s.id === step);

    const goTo = (id: SetupStepId) => {
        // Keep the URL shareable/resumable and re-read server state so a step
        // always sees writes committed by previous steps (or by co-mods).
        router.replace(`/games-v2/${data.game.name}/setup?step=${id}`, {
            scroll: true,
        });
        router.refresh();
    };

    const onAdvance = () => {
        const next = STEPS[stepIndex + 1];
        if (next) goTo(next.id);
    };
    const onBack = () => {
        const prev = STEPS[stepIndex - 1];
        if (prev) goTo(prev.id);
    };

    const statusFor = (id: SetupStepId) =>
        data.completeness.steps.find((s) => s.step === id);

    return (
        <div className={styles.page}>
            <header className={styles.identityStrip}>
                {data.game.image && (
                    <img
                        src={data.game.image}
                        alt=""
                        width={36}
                        height={48}
                        className={styles.identityCover}
                    />
                )}
                <div>
                    <span className={styles.eyebrow}>Board setup</span>
                    <span className={styles.identityTitle}>
                        {data.game.display}
                    </span>
                </div>
                <BackLink
                    href={`/games-v2/${data.game.name}/manage`}
                    label="Back to console"
                    className={styles.identityBack}
                />
            </header>

            <nav className={styles.progressStrip} aria-label="Setup steps">
                <span className={styles.progressCount}>
                    {stepIndex + 1} / {STEPS.length}
                </span>
                {STEPS.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        title={s.label}
                        aria-label={`Step ${i + 1}: ${s.label}`}
                        aria-current={i === stepIndex ? 'step' : undefined}
                        className={`${styles.progressSegment} ${
                            i === stepIndex
                                ? styles.progressCurrent
                                : statusFor(s.id)?.status === 'done'
                                  ? styles.progressDone
                                  : ''
                        }`}
                        onClick={() => goTo(s.id)}
                    />
                ))}
                <span className={styles.progressLabel}>
                    {STEPS[stepIndex].label}
                </span>
            </nav>

            <main key={`${step}-${data.renderedAt}`} className={styles.stepBody}>
                <CurrentStep
                    step={step}
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
                <div className={styles.navBar}>
                    {stepIndex > 0 && (
                        <button
                            type="button"
                            className={styles.backAction}
                            onClick={onBack}
                        >
                            Back
                        </button>
                    )}
                    <span className={styles.spacer} />
                    {STEPS[stepIndex].skippable && (
                        <button
                            type="button"
                            className={styles.skipAction}
                            onClick={onAdvance}
                        >
                            Skip this step
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}

function CurrentStep({
    step,
    data,
    onAdvance,
    onBack,
}: {
    step: SetupStepId;
    data: WizardData;
    onAdvance: () => void;
    onBack: () => void;
}) {
    switch (step) {
        case 'details':
            return (
                <StepDetails
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'categories':
            return (
                <StepCategories
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'defaults':
            return (
                <StepDefaults
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'exceptions':
            return (
                <StepCategoryConfig
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'finish':
            return (
                <StepFinish data={data} onAdvance={onAdvance} onBack={onBack} />
            );
    }
}
```

(`StepCategoryConfig` in the exceptions slot is temporary — Task 6 swaps in `StepExceptions`.)

- [ ] **Step 3: Rewrite `setup.module.scss`**

Full new content. The second half (from `.navBar` down) carries over existing shared classes verbatim — keep them byte-identical to the current file so untouched steps keep rendering.

```scss
@use '../../../styles/design-tokens' as dt;
@use '../../../styles/board' as board;

// Full-focus wizard: one job per screen. A single centered column; the
// identity strip and progress strip are the only chrome.
.page {
    max-width: 46rem;
    margin: 0 auto;
    padding: dt.$spacing-2xl dt.$spacing-lg dt.$spacing-3xl;
}

// ---- Identity strip -----------------------------------------
.identityStrip {
    display: flex;
    align-items: center;
    gap: dt.$spacing-md;
    padding-bottom: dt.$spacing-lg;
    border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.4);
}

.identityCover {
    width: 36px;
    height: 48px;
    border-radius: dt.$radius-md;
    object-fit: cover;
    box-shadow: dt.$shadow-sm;
    flex-shrink: 0;
}

.eyebrow {
    @include board.board-eyebrow;
    display: block;
}

.identityTitle {
    font-size: dt.$font-size-md;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.2;
}

.identityBack {
    margin-left: auto;
    flex-shrink: 0;
}

// ---- Progress strip -----------------------------------------
.progressStrip {
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    margin: dt.$spacing-lg 0 dt.$spacing-3xl;
}

.progressCount {
    @include board.mono-time;
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
    margin-right: dt.$spacing-sm;
}

.progressSegment {
    flex: 1;
    height: 3px;
    border: 0;
    border-radius: 2px;
    padding: 0;
    background: rgba(var(--bs-border-color-rgb), 0.6);
    cursor: pointer;
    transition: background-color dt.$transition-fast;

    &:hover {
        background: rgba(var(--bs-primary-rgb), 0.5);
    }
}

.progressDone {
    background: rgba(var(--bs-primary-rgb), 0.55);
}

.progressCurrent {
    background: var(--bs-primary);
}

.progressLabel {
    font-size: dt.$font-size-xs;
    font-weight: 600;
    color: var(--bs-secondary-color);
    margin-left: dt.$spacing-sm;
    white-space: nowrap;
}

// ---- Step header (ghost numeral) ----------------------------
.stepHeader {
    display: flex;
    align-items: flex-start;
    gap: dt.$spacing-lg;
    margin-bottom: dt.$spacing-2xl;
}

.ghostNum {
    @include board.mono-time;
    font-size: 3.25rem;
    font-weight: 700;
    line-height: 0.9;
    color: rgba(var(--bs-border-color-rgb), 0.9);
    user-select: none;
    flex-shrink: 0;
}

.stepHeaderText {
    min-width: 0;
}

.stepTitle {
    font-size: dt.$font-size-2xl;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
    margin: 0;
}

.stepLede {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
    margin: dt.$spacing-sm 0 0;
    max-width: 38rem;
}

// ---- Step body ----------------------------------------------
.stepBody {
    animation: stepIn dt.$transition-base both;

    // unify raw Bootstrap inputs inside step content
    :global(.form-control),
    :global(.form-select) {
        @include board.board-input-rules;
    }

    :global(h3.h6) {
        @include board.board-eyebrow;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: dt.$spacing-sm;
        margin-bottom: dt.$spacing-md;
    }
}

@keyframes stepIn {
    from {
        opacity: 0;
        transform: translateY(6px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@media (prefers-reduced-motion: reduce) {
    .stepBody {
        animation: none;
    }
    .meterFill,
    .activityFill {
        transition: none;
    }
}

// ---- Coverage meter (triage step) ---------------------------
.meter {
    height: 4px;
    border-radius: 2px;
    background: rgba(var(--bs-border-color-rgb), 0.5);
    overflow: hidden;
    margin-top: dt.$spacing-xs;
}

.meterFill {
    height: 100%;
    border-radius: 2px;
    background: var(--bs-primary);
    transition: width dt.$transition-base;
}

// ---- Per-row activity bar (triage step) ---------------------
.activityBar {
    width: 4.5rem;
    height: 3px;
    border-radius: 2px;
    background: rgba(var(--bs-border-color-rgb), 0.4);
    overflow: hidden;
}

.activityFill {
    height: 100%;
    border-radius: 2px;
    background: rgba(var(--bs-primary-rgb), 0.7);
    transition: width dt.$transition-base;
}

.rowDimmed {
    color: var(--bs-tertiary-color);

    .activityFill {
        background: rgba(var(--bs-border-color-rgb), 0.9);
    }
}

// ---- Step nav -----------------------------------------------
.navBar {
    display: flex;
    align-items: center;
    gap: dt.$spacing-md;
    margin-top: dt.$spacing-2xl;
    padding-top: dt.$spacing-lg;
    border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.4);
}

.spacer {
    flex: 1;
}

// ---- Action hierarchy ---------------------------------------
// primary = board-btn-primary (step Continue/Save actions), secondary =
// control-pill (nav Back, finish step's "View your board"), tertiary =
// board-quiet-link (nav Skip). See system.md.
.primaryAction {
    @include board.board-btn-primary;
}

.backAction {
    @include board.control-pill;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    padding: dt.$spacing-xs dt.$spacing-lg;

    @media (pointer: coarse) {
        padding: dt.$spacing-lg;
    }
}

.skipAction {
    @include board.board-quiet-link;
}

.secondaryAction {
    @include board.control-pill;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    padding: dt.$spacing-xs dt.$spacing-lg;
    text-decoration: none;

    @media (pointer: coarse) {
        padding: dt.$spacing-lg;
    }
}

// ---- Step section anatomy -----------------------------------
.section {
    @include board.board-surface(dt.$spacing-xl);
    margin-bottom: dt.$spacing-lg;
}

.statTile {
    @include board.board-surface(dt.$spacing-lg);
    text-align: center;
    min-width: 9rem;
}

.statValue {
    @include board.mono-time;
    font-size: dt.$font-size-2xl;
    font-weight: 700;
    display: block;
}

.statLabel {
    font-size: dt.$font-size-xs;
    color: var(--bs-secondary-color);
}

.table {
    @include board.board-table;
}

// calm notices with a severity spine (replace Bootstrap alerts)
%note {
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    border-left-width: 3px;
    border-radius: dt.$radius-md;
    background: var(--bs-body-bg);
    padding: dt.$spacing-sm dt.$spacing-lg;
    font-size: dt.$font-size-sm;
    margin-bottom: dt.$spacing-md;
}

.infoNote {
    @extend %note;
    border-left-color: var(--bs-primary);
}

.warnNote {
    @extend %note;
    border-left-color: dt.$accent-amber;
}

.errorNote {
    @extend %note;
    border-left-color: dt.$accent-red;
    color: dt.$accent-red;
}

// list rows (mod team, review list) replacing .list-group
.rows {
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-xs;
    margin-bottom: dt.$spacing-md;
    padding: 0;
    list-style: none;
}

.rowItem {
    @include board.board-surface(dt.$spacing-sm dt.$spacing-lg);
    border-radius: dt.$radius-md;
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
    font-size: dt.$font-size-sm;
}

.heldPill {
    @include board.board-pill(dt.$accent-red);
}

.pendingPill {
    @include board.board-pill;
}

.heldRow td {
    opacity: 0.55;
}

// One red: severity/destructive text uses $accent-red, not Bootstrap's
// $danger (#dc3545) — replaces the raw `text-danger` utility class.
.textDanger {
    color: dt.$accent-red;
}

// One amber: warning text uses $accent-amber, not Bootstrap's $warning —
// replaces the raw `text-warning` utility class.
.textWarning {
    color: dt.$accent-amber;
}

// One green: "done" text uses --bs-primary (the design system's single
// success/accent color), not Bootstrap's $success — replaces the raw
// `text-success` utility class.
.textSuccess {
    color: var(--bs-primary);
}
```

Check `dt.$radius-md` exists in `_design-tokens.scss` (the old file used it); if the token is named differently, match the old file's usage exactly.

The old `.main :global(h2.h4)` override is gone — steps now use `StepHeader` instead of `h2.h4`. Old steps not yet rebuilt (categories/config/defaults) keep their `h2.h4` headings, which render as default Bootstrap headings until their tasks land — acceptable mid-branch state, fixed by Tasks 4–6.

- [ ] **Step 4: Reframe `step-details.tsx` and delete the welcome step**

`steps/step-details.tsx`:

```tsx
'use client';

import { GameDetailsForm } from '../game-details-form';
import { StepHeader } from './step-header';
import type { StepProps } from '../types';

export function StepDetails({ data, onAdvance }: StepProps) {
    return (
        <section>
            <StepHeader
                num={1}
                title="First, the game itself"
                lede={
                    data.categories.length > 0
                        ? 'Runners are already racing here — your job is to curate, not build from scratch. Everything below is pre-filled from IGDB where we have it: fix what’s wrong, skip what’s fine. Every step saves as you go.'
                        : 'No runs have been ingested yet — you’re setting this board up fresh. Everything below is pre-filled from IGDB where we have it: fix what’s wrong, skip what’s fine. Every step saves as you go.'
                }
            />
            <GameDetailsForm
                identifiers={data.identifiers}
                metadata={data.metadata}
                game={{
                    id: data.game.id,
                    name: data.game.name,
                    image: data.game.image ?? null,
                }}
                onSaved={onAdvance}
            />
        </section>
    );
}
```

Delete the welcome step:

```bash
git rm "app/(new-layout)/games-v2/[game]/setup/steps/step-welcome.tsx"
```

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean. If lint flags the unused `onBack` in step components, keep the prop (it's part of `StepProps`) — destructure only what's used.

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx" \
  "app/(new-layout)/games-v2/[game]/setup/setup.module.scss" \
  "app/(new-layout)/games-v2/[game]/setup/steps/step-header.tsx" \
  "app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx"
git commit -m "feat(setup): full-focus shell — identity strip, progress strip, ghost-numeral step headers"
```

(`git rm` already staged the welcome deletion.)

---

### Task 4: Category triage step rebuild

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-categories.tsx` (full rewrite)

**Interfaces:**
- Consumes: `StepHeader` (Task 3), `suggestFeaturedIds` + `activityShare` from `~src/lib/setup/suggestions`, SCSS classes `meter`/`meterFill`/`activityBar`/`activityFill`/`rowDimmed`/`statTile` (Task 3), existing `curateCategoryAction` and `createGroupAction`.
- Produces: nothing new for later tasks.

Save semantics unchanged from today: a checked row saves `active: true, isMain: true`; unchecked saves both false (hidden). Baseline: boards with any explicit featured flag keep current flags; otherwise `suggestFeaturedIds` pre-checks.

- [ ] **Step 1: Rewrite `step-categories.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import Link from '~src/components/link';
import {
    activityShare,
    suggestFeaturedIds,
} from '~src/lib/setup/suggestions';
import { createGroupAction } from '../actions/create-group.action';
import { curateCategoryAction } from '../actions/curate-category.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

interface RowState {
    id: number;
    display: string;
    main: boolean;
    groupId: number | null;
    uniqueRunners: number;
    totalFinishedAttemptCount: number;
    error: string | null;
}

export function StepCategories({ data, onAdvance }: StepProps) {
    // Baseline: boards that already curated keep their flags; fresh boards
    // get suggested picks (high-activity categories pre-checked).
    const hasExplicitMains = data.categories.some(
        (c) => !c.archived && (c.isMain ?? false),
    );
    const suggested = suggestFeaturedIds(
        data.categories.map((c) => ({
            id: c.id,
            totalFinishedAttemptCount: c.totalFinishedAttemptCount ?? 0,
            uniqueRunners: c.uniqueRunners ?? 0,
        })),
    );
    const [rows, setRows] = useState<RowState[]>(
        [...data.categories]
            .sort(
                (a, b) =>
                    (b.totalFinishedAttemptCount ?? 0) -
                    (a.totalFinishedAttemptCount ?? 0),
            )
            .map((c) => ({
                id: c.id,
                display: c.display,
                main: hasExplicitMains
                    ? !c.archived && (c.isMain ?? false)
                    : suggested.has(c.id),
                groupId: c.groupId ?? null,
                uniqueRunners: c.uniqueRunners ?? 0,
                totalFinishedAttemptCount: c.totalFinishedAttemptCount ?? 0,
                error: null,
            })),
    );
    const [groups, setGroups] = useState(data.groups);
    const [groupName, setGroupName] = useState('');
    const [showGroups, setShowGroups] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    if (data.categories.length === 0) {
        return (
            <section>
                <StepHeader
                    num={2}
                    title="No categories yet"
                    lede="Categories appear automatically when runs are submitted or ingested from timers — there’s nothing to curate yet. Once the first runs arrive, come back here (or use the console) to choose what shows on the board."
                />
                <Link href={`/games-v2/${data.game.name}/submit`}>
                    Point runners at the submission form →
                </Link>
                <div>
                    <button
                        type="button"
                        className={`${styles.primaryAction} mt-3`}
                        onClick={onAdvance}
                    >
                        Continue
                    </button>
                </div>
            </section>
        );
    }

    const legacyHiddenCount = rows.filter((r) => {
        const orig = data.categories.find((c) => c.id === r.id);
        return orig && !orig.archived && !(orig.isMain ?? false) && !r.main;
    }).length;

    const checkedCount = rows.filter((r) => r.main).length;
    const share = activityShare(
        rows.map((r) => ({
            totalFinishedAttemptCount: r.totalFinishedAttemptCount,
            active: r.main,
        })),
    );
    const maxRuns = Math.max(
        1,
        ...rows.map((r) => r.totalFinishedAttemptCount),
    );
    const mainOk = checkedCount > 0;

    const setMain = (id: number, main: boolean) =>
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, main } : r)));

    const setGroup = (id: number, groupId: number | null) =>
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, groupId } : r)));

    const addGroup = () => {
        startSaving(async () => {
            const res = await createGroupAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                name: groupName,
            });
            if ('error' in res) return;
            setGroups((gs) => [
                ...gs,
                { id: res.result.id, name: groupName.trim(), sortOrder: 99 },
            ]);
            setGroupName('');
        });
    };

    const save = () => {
        startSaving(async () => {
            // Sequential batch: report per-row failures, retry just those.
            const changed = rows.filter((r) => {
                const orig = data.categories.find((c) => c.id === r.id);
                return (
                    orig &&
                    (!orig.archived !== r.main ||
                        (orig.isMain ?? false) !== r.main ||
                        (orig.groupId ?? null) !== r.groupId)
                );
            });
            let failures = 0;
            for (let i = 0; i < changed.length; i++) {
                const r = changed[i];
                setProgress(`Saving ${i + 1} / ${changed.length}…`);
                const res = await curateCategoryAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: r.id,
                    active: r.main,
                    isMain: r.main,
                    groupId: r.groupId,
                });
                if ('error' in res) {
                    failures++;
                    setRows((rs) =>
                        rs.map((row) =>
                            row.id === r.id
                                ? { ...row, error: res.error }
                                : row,
                        ),
                    );
                }
            }
            setProgress(null);
            if (failures === 0) onAdvance();
        });
    };

    return (
        <section>
            <StepHeader
                num={2}
                title={`We found ${rows.length} categor${
                    rows.length === 1 ? 'y' : 'ies'
                } — probably too many`}
                lede="They come from ingested runs and submissions across the whole site. Pick the ones that belong on your board; the rest stay hidden, and you can bring any of them back later from the console."
            />

            <div className="d-flex gap-3 flex-wrap mb-4">
                <StatTile value={rows.length} label="categories discovered" />
                <StatTile
                    value={data.stats.uniqueRunners}
                    label="unique runners"
                />
                <StatTile
                    value={data.stats.totalFinishedAttemptCount}
                    label="finished runs"
                />
            </div>

            {legacyHiddenCount > 0 && (
                <div className={styles.warnNote}>
                    {legacyHiddenCount} previously shown categor
                    {legacyHiddenCount === 1 ? 'y' : 'ies'} will be hidden when
                    you save — check them to keep them on the board.
                </div>
            )}

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Show on board</th>
                        <th>Category</th>
                        <th>Activity</th>
                        <th className="text-end">Runners</th>
                        <th className="text-end">Runs</th>
                        {showGroups && <th>Group</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr
                            key={r.id}
                            className={r.main ? '' : styles.rowDimmed}
                        >
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    aria-label={`Show ${r.display} on the board`}
                                    checked={r.main}
                                    onChange={(e) =>
                                        setMain(r.id, e.target.checked)
                                    }
                                />
                            </td>
                            <td>
                                {r.display}
                                {r.error && (
                                    <div
                                        className={`${styles.textDanger} small`}
                                    >
                                        {r.error}
                                    </div>
                                )}
                            </td>
                            <td>
                                <div className={styles.activityBar}>
                                    <div
                                        className={styles.activityFill}
                                        style={{
                                            width: `${Math.max(
                                                2,
                                                Math.round(
                                                    (r.totalFinishedAttemptCount /
                                                        maxRuns) *
                                                        100,
                                                ),
                                            )}%`,
                                        }}
                                    />
                                </div>
                            </td>
                            <td className="text-end">
                                {r.uniqueRunners.toLocaleString()}
                            </td>
                            <td className="text-end">
                                {r.totalFinishedAttemptCount.toLocaleString()}
                            </td>
                            {showGroups && (
                                <td>
                                    <select
                                        className="form-select form-select-sm"
                                        aria-label={`Group for ${r.display}`}
                                        value={r.groupId ?? ''}
                                        onChange={(e) =>
                                            setGroup(
                                                r.id,
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : null,
                                            )
                                        }
                                    >
                                        <option value="">Ungrouped</option>
                                        {groups.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mb-3">
                <div className="text-muted small">
                    {checkedCount} shown · {rows.length - checkedCount} hidden ·{' '}
                    {share}% of runs covered
                </div>
                <div
                    className={styles.meter}
                    role="progressbar"
                    aria-label="Share of finished runs covered by shown categories"
                    aria-valuenow={share}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <div
                        className={styles.meterFill}
                        style={{ width: `${share}%` }}
                    />
                </div>
            </div>

            <button
                type="button"
                className="btn btn-link btn-sm px-0"
                onClick={() => setShowGroups((v) => !v)}
            >
                {showGroups ? 'Hide groups' : 'Organize into groups (optional)'}
            </button>
            {showGroups && (
                <div className="d-flex gap-2 my-2">
                    <input
                        className="form-control form-control-sm w-auto"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="New group name (e.g. Category Extensions)"
                    />
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={isSaving || !groupName.trim()}
                        onClick={addGroup}
                    >
                        Add group
                    </button>
                </div>
            )}

            {!mainOk && (
                <div className={`${styles.warnNote} mt-2`}>
                    Keep at least one category on the board — it’s what
                    visitors see.
                </div>
            )}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                disabled={isSaving || !mainOk}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}

function StatTile({ value, label }: { value: number; label: string }) {
    return (
        <div className={styles.statTile}>
            <span className={styles.statValue}>{value.toLocaleString()}</span>
            <span className={styles.statLabel}>{label}</span>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/steps/step-categories.tsx"
git commit -m "feat(setup): category triage step — suggested picks, activity bars, coverage meter"
```

---

### Task 5: Defaults step rebuild + shared rules template

**Files:**
- Create: `src/lib/setup/rules-template.ts`
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-defaults.tsx` (full rewrite, much smaller)
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-category-config.tsx` (import template from new module)

**Interfaces:**
- Consumes: `StepHeader`; actions `updateTimingSettingsAction`, `updateCategorySettingsAction`, `createPolicyAction`.
- Produces: `RULES_STARTER_TEMPLATE: string` exported from `src/lib/setup/rules-template.ts` — Task 6 (exceptions) also imports it.

Behavior decisions (from the spec): the screen is "set the rules once", not a per-row opt-in grid. Applying writes primary timing + RT/IGT/ms visibility + video requirement to **every** featured category; the board-rules template is written **only to categories with no rules yet** (non-destructive; the UI says so). The review-policy checkbox creates the game-wide `auto_flag_faster_than_wr_pct` 5% policy, idempotently (same as today). Game-wide variables are gone from the wizard.

- [ ] **Step 1: Create `src/lib/setup/rules-template.ts`**

```ts
/** Starter board rules — shown prefilled; mods replace the [brackets]. */
export const RULES_STARTER_TEMPLATE = `Timing starts on [first input / cutscene end].
Timing ends on [final hit / last input].

- Video proof is [required / recommended] for all submissions.
- Allowed platforms and versions: [list them].
- No cheating, game modifications, or macros. Emulator: [allowed / banned].
`;
```

In `steps/step-category-config.tsx`, delete the local `STARTER_TEMPLATE` const and replace its one usage (`RulesSection`) with `RULES_STARTER_TEMPLATE` imported from `~src/lib/setup/rules-template`. (The file is deleted in Task 6, but it must keep compiling until then.)

- [ ] **Step 2: Rewrite `step-defaults.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { RULES_STARTER_TEMPLATE } from '~src/lib/setup/rules-template';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import { createPolicyAction } from '../../manage/moderation/policies/actions/policies-actions.action';
import { updateTimingSettingsAction } from '../../manage/timing/actions/update-timing-settings.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

export function StepDefaults({ data, onAdvance }: StepProps) {
    const mains = data.categories.filter(
        (c) => !c.archived && (c.isMain ?? false),
    );

    const [primaryTiming, setPrimaryTiming] =
        useState<PrimaryTiming>('realtime');
    const [showRt, setShowRt] = useState(true);
    const [showIgt, setShowIgt] = useState(true);
    const [showMilliseconds, setShowMilliseconds] = useState(true);
    const [requireVideo, setRequireVideo] = useState(false);
    const [topNOnly, setTopNOnly] = useState(false);
    const [topN, setTopN] = useState('5');
    const [enablePolicy, setEnablePolicy] = useState(true);
    const [rulesEnabled, setRulesEnabled] = useState(true);
    const [rules, setRules] = useState(RULES_STARTER_TEMPLATE);

    const [guardError, setGuardError] = useState<string | null>(null);
    const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
    const [progress, setProgress] = useState<string | null>(null);
    const [isApplying, startApplying] = useTransition();
    const [policyCreated, setPolicyCreated] = useState(false);

    const mainsWithoutRules = mains.filter((c) => !(c.rules ?? '').trim());

    if (mains.length === 0) {
        return (
            <section>
                <StepHeader
                    num={3}
                    title="Set the rules once"
                    lede="Defaults apply to your featured categories — pick those first, then come back here."
                />
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={onAdvance}
                >
                    Continue
                </button>
            </section>
        );
    }

    const apply = () => {
        setGuardError(null);

        if (!showRt && !showIgt) {
            setGuardError(
                'A category can’t hide both real time and in-game time — turn at least one back on.',
            );
            return;
        }
        if (
            requireVideo &&
            topNOnly &&
            (!Number.isInteger(Number(topN)) || Number(topN) <= 0)
        ) {
            setGuardError('Top N must be a positive whole number.');
            return;
        }

        startApplying(async () => {
            const newErrors: Record<number, string> = {};

            for (let i = 0; i < mains.length; i++) {
                const cat = mains[i];
                setProgress(`Applying ${i + 1} / ${mains.length}…`);

                const timingRes = await updateTimingSettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: cat.id,
                    primaryTiming,
                    hideRealTime: !showRt,
                    hideGameTime: !showIgt,
                });
                if ('error' in timingRes) {
                    newErrors[cat.id] = timingRes.error;
                }

                const writeRules =
                    rulesEnabled && !(cat.rules ?? '').trim() && rules.trim();
                const settingsRes = await updateCategorySettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: cat.id,
                    showMilliseconds,
                    requireVideo,
                    requireVideoTopN:
                        requireVideo && topNOnly ? Number(topN) : null,
                    ...(writeRules ? { rules } : {}),
                });
                if ('error' in settingsRes) {
                    newErrors[cat.id] = newErrors[cat.id]
                        ? `${newErrors[cat.id]}; ${settingsRes.error}`
                        : settingsRes.error;
                }
            }
            setProgress(null);
            setRowErrors(newErrors);

            let policyFailed = false;
            if (enablePolicy) {
                const alreadyConfigured =
                    policyCreated ||
                    data.policies.some(
                        (p) =>
                            p.policyType === 'auto_flag_faster_than_wr_pct' &&
                            p.categoryId === null,
                    );
                if (!alreadyConfigured) {
                    const res = await createPolicyAction(data.game.name, {
                        policyType: 'auto_flag_faster_than_wr_pct',
                        value: { pct: 5 },
                        categoryId: null,
                    });
                    if ('error' in res) {
                        setGuardError(res.error);
                        policyFailed = true;
                    } else {
                        setPolicyCreated(true);
                    }
                }
            }

            if (Object.keys(newErrors).length === 0 && !policyFailed) {
                toast.success(
                    `Defaults applied to ${mains.length} featured categor${
                        mains.length === 1 ? 'y' : 'ies'
                    }`,
                );
                onAdvance();
            }
        });
    };

    return (
        <section>
            <StepHeader
                num={3}
                title="Set the rules once"
                lede={`These defaults apply to all ${mains.length} featured categor${
                    mains.length === 1 ? 'y' : 'ies'
                }. The next step handles any category that differs.`}
            />

            <div className={styles.section}>
                <h3 className="h6">Timing</h3>
                <div className="row g-3 align-items-end">
                    <div className="col-auto">
                        <label
                            className="form-label small mb-1"
                            htmlFor="defaults-primary"
                        >
                            Primary
                        </label>
                        <select
                            id="defaults-primary"
                            className="form-select form-select-sm"
                            value={primaryTiming}
                            onChange={(e) =>
                                setPrimaryTiming(
                                    e.target.value as PrimaryTiming,
                                )
                            }
                        >
                            <option value="realtime">RTA</option>
                            <option value="gametime">IGT</option>
                        </select>
                    </div>
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-showrt"
                            checked={showRt}
                            onChange={(e) => setShowRt(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-showrt"
                        >
                            Show RT
                        </label>
                    </div>
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-showigt"
                            checked={showIgt}
                            onChange={(e) => setShowIgt(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-showigt"
                        >
                            Show IGT
                        </label>
                    </div>
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-ms"
                            checked={showMilliseconds}
                            onChange={(e) =>
                                setShowMilliseconds(e.target.checked)
                            }
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-ms"
                        >
                            Milliseconds
                        </label>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className="h6">Proof & review</h3>
                <div className="form-check">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id="defaults-video"
                        checked={requireVideo}
                        onChange={(e) => setRequireVideo(e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="defaults-video"
                    >
                        <strong>Require video proof</strong>
                    </label>
                </div>
                {requireVideo && (
                    <div className="mt-2 ms-4">
                        <label className="form-check-label">
                            <input
                                type="checkbox"
                                className="form-check-input me-2"
                                checked={topNOnly}
                                onChange={(e) => setTopNOnly(e.target.checked)}
                            />
                            Only for top
                        </label>{' '}
                        <input
                            className="form-control form-control-sm d-inline-block"
                            style={{ width: '4rem' }}
                            inputMode="numeric"
                            value={topN}
                            disabled={!topNOnly}
                            onChange={(e) => setTopN(e.target.value)}
                        />{' '}
                        places
                    </div>
                )}
                <div className="form-check mt-2">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id="defaults-policy"
                        checked={enablePolicy}
                        onChange={(e) => setEnablePolicy(e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="defaults-policy"
                    >
                        <strong>Hold suspicious runs for review</strong>{' '}
                        <span className="text-muted small">
                            anything beating the world record by 5%+ waits for
                            a mod
                        </span>
                    </label>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className="h6">Board rules</h3>
                <div className="form-check mb-2">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id="defaults-rules"
                        checked={rulesEnabled}
                        onChange={(e) => setRulesEnabled(e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="defaults-rules"
                    >
                        <strong>Start every category from this template</strong>
                    </label>
                </div>
                {rulesEnabled && (
                    <>
                        <p className="text-muted small mb-2">
                            Replace the [bracketed] parts.{' '}
                            {mains.length - mainsWithoutRules.length > 0 &&
                                `${
                                    mains.length - mainsWithoutRules.length
                                } categor${
                                    mains.length - mainsWithoutRules.length ===
                                    1
                                        ? 'y'
                                        : 'ies'
                                } already ${
                                    mains.length -
                                        mainsWithoutRules.length ===
                                    1
                                        ? 'has'
                                        : 'have'
                                } rules — they keep theirs.`}
                        </p>
                        <textarea
                            className="form-control font-monospace"
                            rows={7}
                            value={rules}
                            onChange={(e) => setRules(e.target.value)}
                        />
                    </>
                )}
            </div>

            {guardError && <div className={styles.errorNote}>{guardError}</div>}
            {Object.entries(rowErrors).map(([id, msg]) => (
                <div key={id} className={styles.errorNote}>
                    {mains.find((c) => c.id === Number(id))?.display}: {msg}
                </div>
            ))}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                disabled={isApplying}
                onClick={apply}
            >
                {isApplying
                    ? 'Applying…'
                    : `Apply to all ${mains.length} & continue`}
            </button>
        </section>
    );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean. The old file's imports (`VariableRow`, `ConfirmDialog`, variable actions) disappear with the rewrite.

- [ ] **Step 4: Commit**

```bash
git add src/lib/setup/rules-template.ts \
  "app/(new-layout)/games-v2/[game]/setup/steps/step-defaults.tsx" \
  "app/(new-layout)/games-v2/[game]/setup/steps/step-category-config.tsx"
git commit -m "feat(setup): defaults step — set timing, proof, review policy and rules template once"
```

---

### Task 6: Exceptions step (replaces category-config), page/type cleanup

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-exceptions.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/setup/steps/step-category-config.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (swap component)
- Modify: `app/(new-layout)/games-v2/[game]/setup/page.tsx` (drop WR-time fetch)
- Modify: `app/(new-layout)/games-v2/[game]/setup/types.ts` (drop `wrTimes`)

**Interfaces:**
- Consumes: `StepHeader`, `RULES_STARTER_TEMPLATE`, `CategoryLeaderboardPreview` + `PreviewDraft` from `../category-leaderboard-preview`, actions `updateTimingSettingsAction` + `updateCategorySettingsAction`.
- Produces: `StepExceptions(props: StepProps)`. URL contract: `?step=exceptions&cat=<id>` expands that category's override (used by step-finish's edit links).

Min-time standards and variables leave the wizard entirely, so `page.tsx`'s WR-time fetch (its `WR_FETCH_CAP` block) and `WizardData.wrTimes` go away.

- [ ] **Step 1: Create `steps/step-exceptions.tsx`**

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check2 } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { RULES_STARTER_TEMPLATE } from '~src/lib/setup/rules-template';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import { updateTimingSettingsAction } from '../../manage/timing/actions/update-timing-settings.action';
import {
    CategoryLeaderboardPreview,
    type PreviewDraft,
} from '../category-leaderboard-preview';
import styles from '../setup.module.scss';
import type { StepProps, WizardData } from '../types';
import { StepHeader } from './step-header';

function toPrimaryTiming(short: 'rt' | 'gt'): PrimaryTiming {
    return short === 'gt' ? 'gametime' : 'realtime';
}

export function StepExceptions({ data, onAdvance }: StepProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const mains = data.categories
        .filter((c) => !c.archived && (c.isMain ?? false))
        .sort(
            (a, b) =>
                (b.totalFinishedAttemptCount ?? 0) -
                (a.totalFinishedAttemptCount ?? 0),
        );

    const catParam = searchParams.get('cat');
    const [openId, setOpenId] = useState<number | null>(
        catParam ? Number(catParam) : null,
    );

    if (mains.length === 0) {
        return (
            <section>
                <StepHeader
                    num={4}
                    title="Per-category exceptions"
                    lede="Pick your featured categories first — then any category that differs from the defaults gets its override here."
                />
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={() => {
                        router.replace(
                            `/games-v2/${data.game.name}/setup?step=categories`,
                            { scroll: true },
                        );
                        router.refresh();
                    }}
                >
                    Choose categories
                </button>
            </section>
        );
    }

    return (
        <section>
            <StepHeader
                num={4}
                title={`${mains.length} categor${
                    mains.length === 1 ? 'y uses' : 'ies use'
                } your defaults — any different?`}
                lede="Open a category only if its timing or rules differ from the rest. Deeper settings — variables, minimum times — live in the console."
            />
            <ul className={styles.rows}>
                {mains.map((c) => (
                    <li key={c.id} className={styles.rowItem}>
                        <strong>{c.display}</strong>
                        <span className="text-muted small">
                            {c.primaryTiming === 'gt' ? 'IGT' : 'RTA'}
                            {(c.showMilliseconds ?? true) ? ' · ms' : ''}
                            {(c.requireVideo ?? false) ? ' · video' : ''}
                        </span>
                        {(c.rules ?? '').trim() ? (
                            <span className={styles.textSuccess}>
                                <Check2 size={14} aria-hidden /> rules
                            </span>
                        ) : (
                            <span className={styles.textWarning}>
                                no rules
                            </span>
                        )}
                        <button
                            type="button"
                            className="btn btn-link btn-sm ms-auto"
                            onClick={() =>
                                setOpenId((id) =>
                                    id === c.id ? null : c.id,
                                )
                            }
                        >
                            {openId === c.id ? 'Close' : 'Adjust'}
                        </button>
                    </li>
                ))}
            </ul>
            {openId !== null &&
                (() => {
                    const cat = mains.find((c) => c.id === openId);
                    return cat ? (
                        <CategoryOverride
                            key={cat.id}
                            data={data}
                            category={cat}
                        />
                    ) : null;
                })()}
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                onClick={onAdvance}
            >
                {openId === null
                    ? 'They’re all the same — continue'
                    : 'Continue'}
            </button>
        </section>
    );
}

function CategoryOverride({
    data,
    category,
}: {
    data: WizardData;
    category: ResolvedCategory;
}) {
    const [primaryTiming, setPrimaryTiming] = useState<PrimaryTiming>(
        toPrimaryTiming(category.primaryTiming),
    );
    const [hideRealTime, setHideRealTime] = useState(
        category.hideRealTime ?? false,
    );
    const [hideGameTime, setHideGameTime] = useState(
        category.hideGameTime ?? false,
    );
    const [showMilliseconds, setShowMilliseconds] = useState(
        category.showMilliseconds ?? true,
    );
    const [rules, setRules] = useState(
        category.rules?.trim() ? category.rules : RULES_STARTER_TEMPLATE,
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const bothHidden = hideRealTime && hideGameTime;

    const draft: PreviewDraft = {
        primaryTiming,
        hideRealTime,
        hideGameTime,
        showMilliseconds,
        minTimeMs: null,
        minGameTimeMs: null,
        requireVideo: category.requireVideo ?? false,
    };

    const save = () => {
        startSaving(async () => {
            setError(null);
            const timingRes = await updateTimingSettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: category.id,
                primaryTiming,
                hideRealTime,
                hideGameTime,
            });
            const settingsRes = await updateCategorySettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: category.id,
                showMilliseconds,
                rules,
            });
            if ('error' in timingRes || 'error' in settingsRes) {
                setError(
                    ('error' in timingRes && timingRes.error) ||
                        ('error' in settingsRes && settingsRes.error) ||
                        'Save failed',
                );
                return;
            }
            toast.success(`${category.display} saved`);
        });
    };

    return (
        <div className={styles.section}>
            <h3 className="h6">{category.display} override</h3>
            <div className="row">
                <div className="col-lg-7">
                    <div className="row g-3 align-items-end mb-3">
                        <div className="col-auto">
                            <label
                                className="form-label small mb-1"
                                htmlFor={`ex-primary-${category.id}`}
                            >
                                Primary
                            </label>
                            <select
                                id={`ex-primary-${category.id}`}
                                className="form-select form-select-sm"
                                value={primaryTiming}
                                onChange={(e) =>
                                    setPrimaryTiming(
                                        e.target.value as PrimaryTiming,
                                    )
                                }
                            >
                                <option value="realtime">RTA</option>
                                <option value="gametime">IGT</option>
                            </select>
                        </div>
                        <div className="col-auto form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`ex-showrt-${category.id}`}
                                checked={!hideRealTime}
                                onChange={(e) =>
                                    setHideRealTime(!e.target.checked)
                                }
                            />
                            <label
                                className="form-check-label"
                                htmlFor={`ex-showrt-${category.id}`}
                            >
                                Show RT
                            </label>
                        </div>
                        <div className="col-auto form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`ex-showigt-${category.id}`}
                                checked={!hideGameTime}
                                onChange={(e) =>
                                    setHideGameTime(!e.target.checked)
                                }
                            />
                            <label
                                className="form-check-label"
                                htmlFor={`ex-showigt-${category.id}`}
                            >
                                Show IGT
                            </label>
                        </div>
                        <div className="col-auto form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`ex-ms-${category.id}`}
                                checked={showMilliseconds}
                                onChange={(e) =>
                                    setShowMilliseconds(e.target.checked)
                                }
                            />
                            <label
                                className="form-check-label"
                                htmlFor={`ex-ms-${category.id}`}
                            >
                                Milliseconds
                            </label>
                        </div>
                    </div>
                    <label
                        className="form-label small mb-1"
                        htmlFor={`ex-rules-${category.id}`}
                    >
                        Rules
                    </label>
                    <textarea
                        id={`ex-rules-${category.id}`}
                        className="form-control font-monospace"
                        rows={7}
                        value={rules}
                        onChange={(e) => setRules(e.target.value)}
                    />
                    {bothHidden && (
                        <div className={`${styles.errorNote} mt-2 mb-0`}>
                            A category can’t hide both RT and IGT.
                        </div>
                    )}
                    {error && (
                        <div className={`${styles.errorNote} mt-2 mb-0`}>
                            {error}
                        </div>
                    )}
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary mt-2"
                        disabled={isSaving || bothHidden}
                        onClick={save}
                    >
                        {isSaving ? 'Saving…' : 'Save override'}
                    </button>
                </div>
                <div className="col-lg-5">
                    <CategoryLeaderboardPreview
                        gameSlug={data.game.name}
                        categorySlug={category.name}
                        draft={draft}
                    />
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Swap the shell, delete the old step**

In `wizard-shell.tsx`: replace the `StepCategoryConfig` import with `import { StepExceptions } from './steps/step-exceptions';` and the `'exceptions'` case body with `<StepExceptions data={data} onAdvance={onAdvance} onBack={onBack} />`.

```bash
git rm "app/(new-layout)/games-v2/[game]/setup/steps/step-category-config.tsx"
```

- [ ] **Step 3: Drop the WR-time fetch**

`page.tsx`: delete the `WR_FETCH_CAP` const, the `activeCats`/`wrTimes` block (lines ~78–109), the `getLeaderboard` import, and the `wrTimes` property from the `data` object literal.

`types.ts`: delete the `wrTimes` field and its doc comment from `WizardData`.

Then grep for stragglers: `grep -rn "wrTimes\|suggestMinTimeMs" "app/(new-layout)/games-v2/[game]/setup"` — expect zero hits (`suggestMinTimeMs` stays exported from `suggestions.ts` for its tests; nothing in the wizard uses it now).

- [ ] **Step 4: Typecheck + lint + tests**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/steps/step-exceptions.tsx" \
  "app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx" \
  "app/(new-layout)/games-v2/[game]/setup/page.tsx" \
  "app/(new-layout)/games-v2/[game]/setup/types.ts"
git commit -m "feat(setup): exceptions step replaces per-category config loop"
```

---

### Task 7: Finish step restyle

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-finish.tsx`

**Interfaces:**
- Consumes: `StepHeader` (Task 3). Logic (mod add/remove, blockers gate, `setGameConfiguredAction`) unchanged.

- [ ] **Step 1: Restyle**

Three edits, logic untouched:

1. Replace the two `h2 className="h4"` headings: the top of the non-done return becomes

```tsx
<StepHeader
    num={5}
    title="Mod team, then go live"
    lede="Don’t moderate alone — a second pair of eyes keeps the queue moving. Review the checklist, then put the board live."
/>
```

and the "Review & finish" heading becomes `<h3 className="h6">Review & finish</h3>`. (Add the `StepHeader` import from `./step-header`.)

2. Replace raw Bootstrap buttons with system classes:
   - Finish button: `className="btn btn-success"` → `className={styles.primaryAction}`.
   - Add-mod button: `className="btn btn-outline-primary"` → keep (secondary in-form action, matches other steps).

3. In the `done` return, the copy stays; buttons already use `styles.primaryAction`/`styles.secondaryAction`.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/steps/step-finish.tsx"
git commit -m "feat(setup): finish step on the full-focus shell"
```

---

### Task 8: Sharpen the console SetupChecklistCard

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/setup-checklist-card.tsx` (full rewrite)
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console.module.scss` (add classes)

**Interfaces:**
- Consumes: `BoardCompleteness` (same props as today: `{ gameSlug, completeness }`); `SetupStepId` labels defined locally.
- Produces: nothing new. The post-configured "what's left" surface already exists: `console-shell.tsx:441` swaps this card for `BoardHealthCard` once the finish step is done, and Task 2's `health.ts` STEP_PANE update keeps its deep links correct — no further work there.

- [ ] **Step 1: Rewrite the card**

```tsx
import { Check2, Dot } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type {
    BoardCompleteness,
    SetupStepId,
} from '~src/lib/setup/completeness';
import styles from './console.module.scss';

const STEP_LABELS: Record<SetupStepId, string> = {
    details: 'Game details',
    categories: 'Categories',
    defaults: 'Defaults',
    exceptions: 'Exceptions',
    finish: 'Go live',
};

interface Props {
    gameSlug: string;
    completeness: BoardCompleteness;
}

export function SetupChecklistCard({ gameSlug, completeness }: Props) {
    const open = completeness.steps.filter((s) => s.status !== 'done');
    if (open.length === 0) return null;
    const pct = Math.round(
        (completeness.doneCount / completeness.totalCount) * 100,
    );

    return (
        <div className={styles.inlineCard}>
            <div className={styles.setupCardBody}>
                <div className={styles.setupCardHead}>
                    <div>
                        <span
                            className={styles.eyebrow}
                            style={{ display: 'block' }}
                        >
                            Setup
                        </span>
                        <strong>
                            {completeness.doneCount} of{' '}
                            {completeness.totalCount} steps done
                        </strong>
                    </div>
                    <Link
                        href={`/games-v2/${gameSlug}/setup${
                            completeness.firstIncomplete
                                ? `?step=${completeness.firstIncomplete}`
                                : ''
                        }`}
                        className={styles.setupCardAction}
                    >
                        {completeness.doneCount <= 1
                            ? 'Set up this board'
                            : 'Continue setup'}
                    </Link>
                </div>
                <div
                    className={styles.setupMeter}
                    role="progressbar"
                    aria-label="Setup progress"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <div
                        className={styles.setupMeterFill}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <ul className={styles.setupSteps}>
                    {completeness.steps.map((s) => (
                        <li key={s.step} className={styles.setupStep}>
                            {s.status === 'done' ? (
                                <Check2
                                    size={12}
                                    className={styles.setupStepDone}
                                    aria-label="done"
                                />
                            ) : (
                                <Dot
                                    size={12}
                                    className={
                                        s.status === 'blocker'
                                            ? styles.setupStepBlocker
                                            : styles.setupStepTodo
                                    }
                                    aria-hidden
                                />
                            )}
                            <span className={styles.setupStepLabel}>
                                {STEP_LABELS[s.step]}
                            </span>
                            <span className={styles.setupStepSummary}>
                                {s.summary}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Add classes to `console.module.scss`**

Append (reusing the file's existing `dt`/`board` `@use` aliases — check the top of the file and match):

```scss
// ---- Setup checklist card ----------------------------------
.setupCardBody {
    width: 100%;
}

.setupCardHead {
    display: flex;
    align-items: center;
    gap: dt.$spacing-md;
    justify-content: space-between;
    flex-wrap: wrap;
}

.setupCardAction {
    @include board.board-btn-primary;
    text-decoration: none;
}

.setupMeter {
    height: 4px;
    border-radius: 2px;
    background: rgba(var(--bs-border-color-rgb), 0.5);
    overflow: hidden;
    margin: dt.$spacing-sm 0 dt.$spacing-md;
}

.setupMeterFill {
    height: 100%;
    border-radius: 2px;
    background: var(--bs-primary);
    transition: width dt.$transition-base;
}

.setupSteps {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.setupStep {
    display: flex;
    align-items: baseline;
    gap: dt.$spacing-sm;
    font-size: dt.$font-size-xs;
}

.setupStepDone {
    color: var(--bs-primary);
    flex-shrink: 0;
    position: relative;
    top: 1px;
}

.setupStepTodo {
    color: var(--bs-tertiary-color);
    flex-shrink: 0;
    position: relative;
    top: 1px;
}

.setupStepBlocker {
    color: dt.$accent-red;
    flex-shrink: 0;
    position: relative;
    top: 1px;
}

.setupStepLabel {
    font-weight: 600;
    white-space: nowrap;
}

.setupStepSummary {
    color: var(--bs-secondary-color);
}
```

If `console.module.scss` uses different `@use` aliases than `dt`/`board`, adapt the prefixes to the file's existing ones.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/setup-checklist-card.tsx" \
  "app/(new-layout)/games-v2/[game]/manage/console/console.module.scss"
git commit -m "feat(console): setup checklist card — progress meter, per-step status, one action"
```

---

### Task 9: Verification & handoff

**Files:** none new.

- [ ] **Step 1: Full verification**

```bash
npm run typecheck && npm run lint && npm run test
```

Expected: all pass.

- [ ] **Step 2: Residual-reference sweep**

```bash
grep -rn "category-config\|step-welcome\|'welcome'" src app --include='*.ts' --include='*.tsx' | grep -v node_modules
```

Expected: zero hits inside `src/lib/setup` and the setup wizard. (Hits in unrelated features — e.g. other flows with their own 'welcome' — are fine; check each.) Note `health.ts` and `reassignments` have their own steppers — leave them alone.

- [ ] **Step 3: Clear build cache and build**

```bash
rm -rf .next && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Push the branch**

```bash
git push -u origin setup-wizard-redesign
```

Do NOT open a PR (user opens PRs themselves).

- [ ] **Step 5: Manual browser pass (hand back to Joey)**

Report done and list the browser pass for Joey (dev server points at deployed backend):
1. Unconfigured board with many ingested categories → lands on `details`, five-segment progress strip, triage shows suggested pre-checks + coverage meter.
2. Board with explicit featured flags → triage baseline keeps the flags.
3. Empty board (no ingested categories) → triage empty state, wizard completable.
4. Defaults apply → per-category values written; categories with existing rules keep them.
5. Exceptions: `?step=exceptions&cat=<id>` deep-link from finish step opens that override; preview renders.
6. Finish → go live → console shows BoardHealthCard instead of checklist.
7. Console on a half-done board → sharpened checklist card, Continue setup jumps to first incomplete step.
8. Reduced-motion preference disables step/meter animation.
