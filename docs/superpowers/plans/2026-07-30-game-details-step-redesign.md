# Game Details Step Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the setup wizard's Game details step into two labeled zones (IGDB facts vs. board policy decisions) with a single Save & continue action at the bottom of the step.

**Architecture:** `GameDetailsForm` (shared with the console's game-details pane) becomes a real `<form>` that can suppress its internal button and be submitted from outside via the native `form=` attribute. The wizard step wraps it in a "Check the facts" zone, regroups the five policy sections into a "Set the ground rules" zone (timing + minimum paired, emulator policy as a segmented control), and renders the one primary action at the end of the step body.

**Tech Stack:** Next.js 16 App Router, React 19 (React Compiler on), SCSS modules, Bootstrap utility classes, Vitest 4 + @testing-library/react (jsdom via per-file docblock).

**Spec:** `docs/superpowers/specs/2026-07-30-game-details-step-redesign-design.md`

## Global Constraints

- Work on the current branch `setup-category-centric`. Never push to main in this repo; never open PRs (Joey opens them).
- Biome formats on commit (husky pre-commit): 4-space indent, single quotes, trailing commas, semicolons. Unused vars prefixed `_`.
- `npm run typecheck` is NOT clean on main (~356 pre-existing errors). Gate on "no NEW errors in the files you touched", not exit 0.
- Never `git stash` in this repo (stale lint-staged backup stashes pop as conflicts).
- Component tests need `// @vitest-environment jsdom` as the first line of the file — vitest.config has no environment matching.
- Run single test files with `npx vitest run <path>`.
- The console pane `manage/console/game-details-pane.tsx` consumes `GameDetailsForm` with its inline "Save details" button and NO new props — its behavior must be unchanged.
- Do not start a dev server; if one is started for any reason it must be killed before ending the turn.

---

### Task 1: GameDetailsForm becomes a submittable `<form>`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/game-details-form.tsx`
- Test (create): `app/(new-layout)/games-v2/[game]/setup/game-details-form.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GameDetailsForm` accepts three new optional props, all defaulting to today's behavior:
  - `formId?: string` — id put on the rendered `<form>` element (for external `<button form={formId}>` association).
  - `hideAction?: boolean` — when true, the internal submit button is not rendered.
  - `onBusyChange?: (busy: boolean) => void` — reports `isSaving || isUploading` whenever it changes, so an external button can disable/relabel itself.
  - The component's root becomes `<form id={formId} noValidate onSubmit={…}>`; the internal button becomes `type="submit"` with no onClick. `noValidate` is required: the links row uses `<input type="url">`, and without it native validation would start blocking submits that today go through (client code does its own validation).
  - The IGDB provenance paragraph ("Prefilled data comes from this IGDB entry…") moves from the bottom of the left column to the top of the form, above the `row g-4` grid.
  - `save()` gains a re-entrancy guard: returns early if `isSaving || isUploading` (the external button can't see the identity-save phase synchronously).

- [ ] **Step 1: Write the failing test**

Create `app/(new-layout)/games-v2/[game]/setup/game-details-form.test.tsx`:

```tsx
// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';

vi.mock('../manage/identifiers/actions/update-identifiers.action', () => ({
    updateIdentifiersAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('./actions/update-game-metadata.action', () => ({
    updateGameMetadataAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('./actions/get-cover-upload-url.action', () => ({
    getCoverUploadUrlAction: vi.fn(),
}));
vi.mock('~src/components/link', () => ({
    default: ({ children, ...props }: Record<string, unknown>) => (
        <a {...props}>{children as never}</a>
    ),
}));

import { updateIdentifiersAction } from '../manage/identifiers/actions/update-identifiers.action';
import { GameDetailsForm } from './game-details-form';

const identifiers = { slug: '' } as unknown as GameIdentifiers;
const metadata = {
    coverUrl: null,
    platforms: [],
    igdbPlatforms: [],
    releaseYear: null,
    firstReleaseDate: null,
    discordUrl: null,
    summary: null,
    summaryOverride: null,
    links: [],
    igdbUrl: 'https://www.igdb.com/games/example',
} as unknown as GameMetadata;
const game = { id: 1, name: 'example-game', image: null };

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('GameDetailsForm', () => {
    it('renders a <form> with the given id and hides the internal button when hideAction', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                formId="game-details-form"
                hideAction
                onSaved={vi.fn()}
            />,
        );
        const form = document.getElementById('game-details-form');
        expect(form?.tagName).toBe('FORM');
        expect(
            screen.queryByRole('button', { name: 'Save & continue' }),
        ).toBeNull();
    });

    it('keeps the internal submit button by default (console pane contract)', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                saveLabel="Save details"
                onSaved={vi.fn()}
            />,
        );
        const button = screen.getByRole('button', { name: 'Save details' });
        expect(button.getAttribute('type')).toBe('submit');
    });

    it('runs the save chain and calls onSaved on form submit', async () => {
        const onSaved = vi.fn();
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                formId="game-details-form"
                hideAction
                onSaved={onSaved}
            />,
        );
        fireEvent.submit(document.getElementById('game-details-form')!);
        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        expect(updateIdentifiersAction).toHaveBeenCalledTimes(1);
    });

    it('blocks submit and shows an error for a slug with no alphanumerics', async () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                formId="game-details-form"
                hideAction
                onSaved={vi.fn()}
            />,
        );
        fireEvent.change(screen.getByLabelText(/URL slug/), {
            target: { value: '!!!' },
        });
        fireEvent.submit(document.getElementById('game-details-form')!);
        await screen.findByText(
            'URL slug must contain at least one alphanumeric character.',
        );
        expect(updateIdentifiersAction).not.toHaveBeenCalled();
    });

    it('shows the IGDB provenance line before the field grid', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                onSaved={vi.fn()}
            />,
        );
        const provenance = screen.getByText(/this IGDB entry/).closest('p')!;
        const grid = document.querySelector('.row.g-4')!;
        // Provenance must precede the grid in document order.
        expect(
            provenance.compareDocumentPosition(grid) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });
});
```

Note on `getByLabelText(/URL slug/)`: the `FieldLabel` component (see `field-hint.tsx`) must associate label and input via `htmlFor` — it already receives `htmlFor="slug"`. If the query fails because `FieldLabel` renders a `<span>` rather than a `<label>`, fall back to `screen.getByPlaceholderText('e.g. super-mario-64')` — do NOT restructure `FieldLabel` in this task.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/setup/game-details-form.test.tsx"`
Expected: FAIL — the first test fails (no `<form>` element / internal button still renders), the provenance-order test fails (provenance is after the grid today). The default-button and save-chain tests may already pass; that's fine — they pin the console-pane contract.

- [ ] **Step 3: Implement the form conversion**

In `game-details-form.tsx`:

1. Extend the props (keep the existing ones untouched):

```tsx
export function GameDetailsForm({
    identifiers,
    metadata,
    game,
    onSaved,
    saveLabel = 'Save & continue',
    savingExternally = false,
    formId,
    hideAction = false,
    onBusyChange,
}: {
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    game: { id: number; name: string; image: string | null };
    onSaved: () => void;
    saveLabel?: string;
    // Set while a caller's own post-onSaved work is still in flight, so the
    // button stays disabled through that gap instead of re-enabling between
    // this form's save and the caller's (see step-details.tsx).
    savingExternally?: boolean;
    /** id on the <form>, so an external `<button form=…>` can submit it. */
    formId?: string;
    /** Suppress the internal submit button (caller renders its own). */
    hideAction?: boolean;
    /** Reports isSaving/isUploading to a caller-rendered external button. */
    onBusyChange?: (busy: boolean) => void;
}) {
```

2. Report busy state (add `useEffect` to the existing react import):

```tsx
const busy = isSaving || isUploading;
useEffect(() => {
    onBusyChange?.(busy);
}, [busy, onBusyChange]);
```

3. Guard `save()` at its top (before `setError(null)`):

```tsx
const save = () => {
    if (isSaving || isUploading) return;
    setError(null);
    ...
```

4. Replace the fragment root with a form. The opening `<>` becomes:

```tsx
return (
    <form
        id={formId}
        noValidate
        onSubmit={(e) => {
            e.preventDefault();
            save();
        }}
    >
```

and the closing `</>` becomes `</form>`.

5. Move the provenance paragraph. Delete this block from the bottom of the left column (`col-md-6`):

```tsx
{metadata.igdbUrl && (
    <p className="text-muted small mt-2 mb-0">
        Prefilled data comes from{' '}
        ...
    </p>
)}
```

and insert it (same content, classes changed to `text-muted small mb-3`) directly after the `<form …>` opening tag, before `<div className="row g-4">`.

6. Convert the internal button — `onClick` removed, `type` changed, wrapped in the `hideAction` condition:

```tsx
{!hideAction && (
    <button
        type="submit"
        className={`${styles.primaryAction} mt-3`}
        disabled={isSaving || isUploading || savingExternally}
    >
        {isSaving || savingExternally ? 'Saving…' : saveLabel}
    </button>
)}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/setup/game-details-form.test.tsx"`
Expected: PASS (5 tests).

- [ ] **Step 5: Check the two consumers still typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "game-details|step-details" ; echo "exit: $?"`
Expected: no lines for the touched files (grep exit 1). Pre-existing errors elsewhere are out of scope.

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/game-details-form.tsx" "app/(new-layout)/games-v2/[game]/setup/game-details-form.test.tsx"
git commit -m "refactor(setup): make GameDetailsForm an external-submittable form"
```

---

### Task 2: Restructure the step into two zones with a bottom action

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/setup.module.scss`
- Test (create): `app/(new-layout)/games-v2/[game]/setup/steps/step-details.test.tsx`

**Interfaces:**
- Consumes: `GameDetailsForm` with `formId` / `hideAction` / `onBusyChange` from Task 1.
- Produces: nothing consumed by later tasks (this is the last task). The step keeps its `StepProps` contract (`data`, `onAdvance`, `onBack`) unchanged.

**Structure being built** (all existing state/handlers — `timing`, `selectTiming`, `minText`, `emulatorPolicy`, `rulesTemplate`, `gameRules`, `handleDetailsSaved`, the policy save chain — stay exactly as they are; this task only adds `formBusy` state and rearranges JSX):

```text
StepHeader (unchanged)
h3.zoneTitle  "Check the facts"
  .section card
    GameDetailsForm (formId, hideAction, onBusyChange)
h3.zoneTitle  "Set the ground rules"
  .section card ── flex row: [Timing segmented] [Minimum time input]
  .section card ── Emulator policy (segmented: Not specified/Allowed/Banned)
  .section card ── Game rules textarea
  .section card ── Category rules template textarea (monospace)
errorNote (if any)
primaryAction: <button type="submit" form="game-details-form">
```

- [ ] **Step 1: Write the failing test**

Create `app/(new-layout)/games-v2/[game]/setup/steps/step-details.test.tsx`:

```tsx
// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WizardData } from '../types';

vi.mock(
    '../../manage/identifiers/actions/update-identifiers.action',
    () => ({
        updateIdentifiersAction: vi.fn(async () => ({ ok: true })),
    }),
);
vi.mock('../actions/update-game-metadata.action', () => ({
    updateGameMetadataAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../actions/get-cover-upload-url.action', () => ({
    getCoverUploadUrlAction: vi.fn(),
}));
vi.mock(
    '../../manage/moderation/policies/actions/policies-actions.action',
    () => ({
        createPolicyAction: vi.fn(async () => ({ policy: { id: 5 } })),
        updatePolicyAction: vi.fn(async () => ({ policy: { id: 5 } })),
        deletePolicyAction: vi.fn(async () => ({ ok: true })),
    }),
);
vi.mock('~src/components/link', () => ({
    default: ({ children, ...props }: Record<string, unknown>) => (
        <a {...props}>{children as never}</a>
    ),
}));

import { createPolicyAction } from '../../manage/moderation/policies/actions/policies-actions.action';
import { updateGameMetadataAction } from '../actions/update-game-metadata.action';
import { StepDetails } from './step-details';

const data = {
    game: { id: 1, name: 'example-game', display: 'Example Game', image: null },
    categories: [],
    policies: [],
    identifiers: { slug: '' },
    metadata: {
        coverUrl: null,
        platforms: [],
        igdbPlatforms: [],
        releaseYear: null,
        firstReleaseDate: null,
        discordUrl: null,
        summary: null,
        summaryOverride: null,
        links: [],
        igdbUrl: null,
        primaryTiming: null,
        rulesTemplate: null,
        gameRules: null,
        emulatorPolicy: null,
    },
} as unknown as WizardData;

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('StepDetails', () => {
    it('renders the two zone headings in order', () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        const facts = screen.getByRole('heading', { name: 'Check the facts' });
        const rules = screen.getByRole('heading', {
            name: 'Set the ground rules',
        });
        expect(
            facts.compareDocumentPosition(rules) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('renders exactly one Save & continue button, associated with the details form', () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        const buttons = screen.getAllByRole('button', {
            name: 'Save & continue',
        });
        expect(buttons).toHaveLength(1);
        expect(buttons[0].getAttribute('form')).toBe('game-details-form');
        expect(document.getElementById('game-details-form')?.tagName).toBe(
            'FORM',
        );
    });

    it('renders emulator policy as a segmented radiogroup and toggles it', () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        const group = screen.getByRole('radiogroup', {
            name: 'Emulator policy',
        });
        const banned = screen.getByRole('radio', { name: 'Banned' });
        expect(group).toContainElement(banned);
        fireEvent.click(banned);
        expect(banned.getAttribute('aria-checked')).toBe('true');
    });

    it('relabels the minimum-time field when timing flips to IGT', () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        expect(screen.getByLabelText('Minimum real time')).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: 'IGT' }));
        expect(screen.getByLabelText('Minimum in-game time')).toBeTruthy();
    });

    it('saves details, defaults, and the min-time policy in one submit, then advances', async () => {
        const onAdvance = vi.fn();
        render(
            <StepDetails data={data} onAdvance={onAdvance} onBack={vi.fn()} />,
        );
        fireEvent.change(screen.getByLabelText('Minimum real time'), {
            target: { value: '10:00' },
        });
        fireEvent.submit(document.getElementById('game-details-form')!);
        await waitFor(() => expect(onAdvance).toHaveBeenCalledTimes(1));
        expect(updateGameMetadataAction).toHaveBeenCalledWith(
            expect.objectContaining({ primaryTiming: 'rt' }),
        );
        expect(createPolicyAction).toHaveBeenCalledWith('example-game', {
            policyType: 'min_time',
            value: { minTimeMs: 600000 },
            categoryId: null,
        });
    });
});
```

Notes:
- `toContainElement` needs `@testing-library/jest-dom`; if it is not wired up in this repo (check whether any existing `.test.tsx` imports it), replace that assertion with `expect(group.contains(banned)).toBe(true)`.
- The min-time value key `{ minTimeMs: 600000 }` comes from `minValueForTiming('rt', …)` in `~src/lib/setup/game-minimum` — `minTimeMs`/`minGameTimeMs` are the only valid keys (backend 400s on anything else). If the assertion fails on shape, check that helper rather than changing the expectation to match the code under test blindly.
- `updateGameMetadataAction` is called twice per submit (once by the form for identity fields, once by the step for timing/rules) — hence `toHaveBeenCalledWith(expect.objectContaining(...))`, not `toHaveBeenCalledTimes(1)`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/setup/steps/step-details.test.tsx"`
Expected: FAIL — no "Check the facts"/"Set the ground rules" headings; the only "Save & continue" button is the form's internal one, which has no `form` attribute, so the association test fails; the emulator radiogroup test fails (it's `form-check` radios today, no radiogroup with that name). The timing-flip and save-chain tests may already pass — they pin behavior that must survive the restructure.

- [ ] **Step 3: Add the zone styles**

In `setup.module.scss`, extend the `h3.h6` global inside `.stepBody` to cover the demoted card headings (the step's inner card titles become `h4` under the new `h3` zone titles):

```scss
    :global(h3.h6),
    :global(h4.h6) {
        @include board.board-eyebrow;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: dt.$spacing-sm;
        margin-bottom: dt.$spacing-md;
    }
```

Add after the `.section` block (in the "Step section anatomy" area):

```scss
// Zone titles on the details step: a level between the step title and the
// card eyebrows, so "confirm facts" and "decide rules" read as two jobs.
.zoneTitle {
    font-size: dt.$font-size-lg;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: dt.$spacing-2xl 0 dt.$spacing-md;
}

// Timing + minimum share a card: the minimum's label follows the selected
// timing, and splitting them into separate cards hides that coupling.
.pairRow {
    display: flex;
    flex-wrap: wrap;
    gap: dt.$spacing-2xl;
}
```

(The step header already provides top spacing for the first zone title; if the first `.zoneTitle` doubles up visually, browser pass will catch it — do not add `:first-of-type` rules speculatively.)

- [ ] **Step 4: Restructure the step JSX**

In `step-details.tsx`:

1. Add form-busy state next to the existing state declarations:

```tsx
const [formBusy, setFormBusy] = useState(false);
```

2. Replace the whole `return (…)` block with:

```tsx
return (
    <section>
        <StepHeader
            step="details"
            title="Game details"
            lede={
                data.categories.length > 0
                    ? 'Runners are already on this board. The details below are pre-filled from IGDB, so fix anything that’s wrong and move on. Everything saves as you go.'
                    : 'This board has no runs yet. The details below are pre-filled from IGDB, so fix anything that’s wrong and move on. Everything saves as you go.'
            }
        />

        <h3 className={styles.zoneTitle}>Check the facts</h3>
        <div className={styles.section}>
            <GameDetailsForm
                identifiers={data.identifiers}
                metadata={data.metadata}
                game={{
                    id: data.game.id,
                    name: data.game.name,
                    image: data.game.image ?? null,
                }}
                formId="game-details-form"
                hideAction
                onBusyChange={setFormBusy}
                onSaved={handleDetailsSaved}
            />
        </div>

        <h3 className={styles.zoneTitle}>Set the ground rules</h3>
        <div className={styles.section}>
            <div className={styles.pairRow}>
                <div>
                    <h4 className="h6">Timing</h4>
                    <div
                        className={styles.segmented}
                        role="radiogroup"
                        aria-label="Primary timing"
                    >
                        <button
                            type="button"
                            role="radio"
                            aria-checked={timing === 'rt'}
                            className={
                                timing === 'rt'
                                    ? styles.segmentActive
                                    : undefined
                            }
                            onClick={() => selectTiming('rt')}
                        >
                            RTA
                        </button>
                        <button
                            type="button"
                            role="radio"
                            aria-checked={timing === 'gt'}
                            className={
                                timing === 'gt'
                                    ? styles.segmentActive
                                    : undefined
                            }
                            onClick={() => selectTiming('gt')}
                        >
                            IGT
                        </button>
                    </div>
                    <p className="text-muted small mb-0">
                        The default timing method for this board’s categories.
                    </p>
                </div>
                <div>
                    <h4 className="h6">Minimum time</h4>
                    <label
                        className="form-label small mb-1"
                        htmlFor="board-min-time"
                    >
                        {timing === 'rt'
                            ? 'Minimum real time'
                            : 'Minimum in-game time'}
                    </label>
                    <input
                        id="board-min-time"
                        className="form-control form-control-sm"
                        style={{ width: '7rem' }}
                        value={minText}
                        onChange={(e) => setMinText(e.target.value)}
                        placeholder="e.g. 10:00"
                    />
                    <p className="text-muted small mt-2 mb-0">
                        Runs under this minimum wait for a mod. Clear the
                        field to remove the limit.
                    </p>
                </div>
            </div>
        </div>

        <div className={styles.section}>
            <h4 className="h6">Emulator policy</h4>
            <div
                className={styles.segmented}
                role="radiogroup"
                aria-label="Emulator policy"
            >
                <button
                    type="button"
                    role="radio"
                    aria-checked={emulatorPolicy === null}
                    className={
                        emulatorPolicy === null
                            ? styles.segmentActive
                            : undefined
                    }
                    onClick={() => setEmulatorPolicy(null)}
                >
                    Not specified
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={emulatorPolicy === 'allowed'}
                    className={
                        emulatorPolicy === 'allowed'
                            ? styles.segmentActive
                            : undefined
                    }
                    onClick={() => setEmulatorPolicy('allowed')}
                >
                    Allowed
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={emulatorPolicy === 'banned'}
                    className={
                        emulatorPolicy === 'banned'
                            ? styles.segmentActive
                            : undefined
                    }
                    onClick={() => setEmulatorPolicy('banned')}
                >
                    Banned
                </button>
            </div>
            <p className="text-muted small mb-0">
                Shown with the rules on every board.
            </p>
        </div>

        <div className={styles.section}>
            <h4 className="h6">Game rules</h4>
            <p className="text-muted small mb-2">
                Shown above category rules on every board.
            </p>
            <textarea
                className="form-control"
                rows={4}
                value={gameRules}
                onChange={(e) => setGameRules(e.target.value)}
            />
        </div>

        <div className={styles.section}>
            <h4 className="h6">Category rules template</h4>
            <p className="text-muted small mb-2">
                Seeds the rules of every category you feature. Fill in the
                [brackets].
            </p>
            <textarea
                className="form-control font-monospace"
                rows={7}
                value={rulesTemplate}
                onChange={(e) => setRulesTemplate(e.target.value)}
            />
        </div>

        {defaultsError && (
            <div className={styles.errorNote}>{defaultsError}</div>
        )}
        <button
            type="submit"
            form="game-details-form"
            className={styles.primaryAction}
            disabled={formBusy || isSavingDefaults}
        >
            {formBusy || isSavingDefaults ? 'Saving…' : 'Save & continue'}
        </button>
    </section>
);
```

Everything above the return (state, `selectTiming`, `handleDetailsSaved`) is untouched except the added `formBusy` state. The old `savingExternally` pass-through and the trailing "Saving board defaults…" paragraph are gone — the bottom button's `formBusy || isSavingDefaults` covers the entire chain. Update the `useState` import line only if `useState` is somehow not already imported (it is).

3. Delete nothing else — `styles.segmented`/`styles.segmentActive` already exist and are reused for emulator policy.

- [ ] **Step 5: Run both test files**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/setup/steps/step-details.test.tsx" "app/(new-layout)/games-v2/[game]/setup/game-details-form.test.tsx"`
Expected: PASS (10 tests total).

- [ ] **Step 6: Run the full unit suite and typecheck diff**

Run: `npm test`
Expected: no new failures vs. before this task (the suite has its own baseline — compare failures, not exit code, if any pre-exist).

Run: `npx tsc --noEmit 2>&1 | grep -E "step-details|game-details|setup.module" ; echo "exit: $?"`
Expected: no lines for touched files.

- [ ] **Step 7: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx" "app/(new-layout)/games-v2/[game]/setup/steps/step-details.test.tsx" "app/(new-layout)/games-v2/[game]/setup/setup.module.scss"
git commit -m "feat(setup): restructure game details step into facts + ground-rules zones"
```

---

### Post-plan verification (manual, Joey or a browser pass)

Not tasks — recorded from the spec's testing section so they aren't lost:

- Wizard step 1: save happy path; bad minimum time and bad slug error paths; timing flip re-reads the minimum bound to that timing; Enter inside a text field submits the form (new, intended).
- Console `?pane=game-details`: renders and saves exactly as before with its inline "Save details" button; provenance line now sits at the top of that form (accepted cosmetic change).
- Zone titles vs. step header spacing on the details step (the speculative `:first-of-type` question from Task 2 Step 3).
