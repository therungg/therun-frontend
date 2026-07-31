# Mod Console Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the games-v2 mod console as a contained app shell and give every pane and form one shared visual language (spec: `docs/plans/2026-07-30-mod-console-redesign-design.md`).

**Architecture:** All mod pages render through `ConsoleChrome` (console panes via `ConsoleShell`, sub-routes via `SubrouteChrome`), so the frame lands in one component + one SCSS module. Pane/form cleanup is then a sweep: flatten the console `.surface`, standardize `.paneHeader`, and replace raw Bootstrap form markup with a small shared form kit (section, segmented control, switch, footer) built from `_board.scss` tokens.

**Tech Stack:** Next.js 16 App Router, React 19, SCSS modules (Biome formatting: 4-space indent, single quotes), vitest + @testing-library/react.

## Global Constraints

- Branch: `mod-console-redesign` in `therun-fr` (already created, spec committed). **Never push to main**; Joey opens PRs.
- Frontend repo only. No route/IA changes, no behavior changes to forms (fields, validation, server actions untouched).
- Depth = borders + surface tint only. **No gradient washes, no shadow-as-depth** (Joey's standing rule).
- `npm run typecheck` has ~356 pre-existing errors on main — gate on *no new errors*, not exit 0. Capture baseline first: `npm run typecheck 2>&1 | grep -c "error TS"` before your first change.
- `variables-section.test.tsx` has two pre-existing failures (from the variables merge) — not yours to fix; every other touched test file must pass.
- `_board.scss` changes must be **additive only** (new mixins); existing mixins are shared with the public leaderboard.
- Commit after every task. No co-author line in commits.
- All paths below are relative to `therun-fr/app/(new-layout)/games-v2/` unless rooted.

---

### Task 1: The frame (console chrome)

**Files:**
- Modify: `[game]/manage/console/console.module.scss` (shell/header/sidebar/body sections, lines 13–77 + mobile block 497–546)
- Modify: `[game]/manage/console/console-chrome.tsx:80-160`

**Interfaces:**
- Produces: new class names `styles.frame`, `styles.sidebarInner` consumed only inside `console-chrome.tsx`. `.header`, `.sidebar`, `.body`, `.content` keep their names (all other consumers untouched).

- [ ] **Step 1: Restructure the shell SCSS**

In `console.module.scss` replace the `.shell`/`.header`/`.body`/`.sidebar` layout rules (keep `$sidebar-width`, `$rail`, and everything from `.navGroup` down unchanged):

```scss
// ---- Shell layout ------------------------------------------
.shell {
    padding: dt.$spacing-2xl;
    max-width: 1600px;
    margin-inline: auto;
}

// The console is one contained panel — the frame IS the surface.
// Panes inside sit flat on it (see .surface below).
.frame {
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    border-radius: dt.$radius-lg;
    background: var(--bs-body-bg);
    overflow: hidden; // clips the tinted sidebar column to the radius
}

.header {
    display: flex;
    align-items: center;
    gap: dt.$spacing-lg;
    padding: dt.$spacing-lg dt.$spacing-xl;
    border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
}

.body {
    display: grid;
    grid-template-columns: $sidebar-width minmax(0, 1fr);
    align-items: stretch;
}

// ---- Sidebar (tinted column, full frame height) ------------
.sidebar {
    background: color-mix(
        in srgb,
        var(--bs-body-bg) 92%,
        var(--bs-secondary-bg) 8%
    );
    border-right: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    padding: dt.$spacing-xl dt.$spacing-lg;
}

.sidebarInner {
    position: sticky;
    top: dt.$spacing-lg;
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-2xl;
}

.content {
    padding: dt.$spacing-2xl;
    min-width: 0;
}
```

Keep the existing `:global(...)` override rules that currently live under `.content` — move them inside the new `.content` block unchanged (they die later, in Task 8).

- [ ] **Step 2: Update the mobile block**

In the `@media (max-width: 768px)` block: `.shell` padding becomes `0` (full-bleed); add `.frame { border: 0; border-radius: 0; }`; `.content { padding: dt.$spacing-lg; }`; in the `.sidebar` drawer rules add `padding: dt.$spacing-lg;` is already there — but the new desktop `background` tint must not leak: the drawer already sets `background: var(--bs-body-bg)`, keep that. Add `.sidebarInner { position: static; }` inside the media block so the drawer scrolls as one unit.

- [ ] **Step 3: Update `console-chrome.tsx` markup**

Wrap header + body in the frame and add the sticky inner wrapper:

```tsx
return (
    <div className={styles.shell}>
        <div className={styles.frame}>
            <header className={styles.header}>{/* unchanged children */}</header>
            <div className={styles.body}>
                {sidebarOpen && ( /* scrim, unchanged */ )}
                <aside ref={sidebarRef} className={clsx(styles.sidebar, !sidebarOpen && styles.sidebarHidden)}>
                    <div className={styles.sidebarInner}>
                        <ConsoleSidebar ... />
                    </div>
                </aside>
                <section className={styles.content}>{children}</section>
            </div>
        </div>
    </div>
);
```

- [ ] **Step 4: Update the manage loading skeleton**

`[game]/manage/loading.tsx` + `loading.module.scss` mirror the console geometry. Wrap its header/body skeleton in one bordered frame block matching Step 1's `.frame` (border, radius-lg, header row with bottom hairline, tinted left column `$sidebar-width` wide). Match geometry, not internals — a `.frame`-equivalent local class is fine.

- [ ] **Step 5: Verify**

Run: `npm run typecheck 2>&1 | grep -c "error TS"` → count ≤ baseline.
Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage"` → only the two known `variables-section` failures.

- [ ] **Step 6: Commit** — `feat(console): frame the mod console as a contained app shell`

---

### Task 2: Flatten surfaces + shared pane header

**Files:**
- Modify: `[game]/manage/console/console.module.scss` (`.surface`, `.paneHeader`, add `.paneActions`, `.paneLede`)
- Modify: `[game]/manage/console/game-details-pane.tsx:26-31`
- Modify: `[game]/manage/console/moderators-pane.tsx:105-110`
- Modify: `[game]/manage/moderation/attention/mod-applications-card.tsx:45-48`

**Interfaces:**
- Produces: `.paneHeader` (now with bottom hairline), `.paneActions` (right-aligned slot inside `.paneHeader`), `.paneLede` (muted intro line under the header). All panes in later tasks use exactly these three class names.

- [ ] **Step 1: Redefine `.surface` and `.paneHeader` in `console.module.scss`**

```scss
// Flat: the frame (Task 1) is the surface. Class kept so panes need no
// structural edits; it now only guards against nested-card regression.
.surface {
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 0;
}

.paneHeader {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: dt.$spacing-md;
    padding-bottom: dt.$spacing-md;
    border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    margin-bottom: dt.$spacing-xl;
}

.paneActions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
}

.paneLede {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
    margin: calc(#{dt.$spacing-xl} * -1 + #{dt.$spacing-sm}) 0 dt.$spacing-xl;
    max-width: 60ch;
}
```

- [ ] **Step 2: Sweep the three direct consumers**

- `game-details-pane.tsx`: replace `<p className="text-muted small mb-3">…</p>` with `<p className={styles.paneLede}>…</p>`.
- `moderators-pane.tsx`: markup already uses `.surface`/`.paneHeader` — no change needed beyond confirming render.
- `mod-applications-card.tsx`: change the wrapper from `` `${styles.surface} mb-3` `` to a flat section: `<section className="mb-4">` keeping its internal `.paneHeader` — as a *secondary* block above NeedsAttention its header should not repeat the full-rule treatment; instead give it a lighter variant: keep `.paneHeader` (rule included) — acceptable; both blocks reading as ruled sections is the intended rhythm.
- `content-router.tsx` `Placeholder` — no change (uses `.surface` + `.paneHeader`, now renders flat).

- [ ] **Step 3: Verify** — typecheck count ≤ baseline; `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console" "app/(new-layout)/games-v2/[game]/manage/moderation/attention"` passes.

- [ ] **Step 4: Commit** — `feat(console): flatten pane surfaces onto the frame, ruled pane headers`

---

### Task 3: Form kit (shared components + mixins)

**Files:**
- Modify: `styles/_board.scss` (additive mixins at end of file)
- Create: `[game]/manage/shared/form-kit.tsx`
- Create: `[game]/manage/shared/form-kit.module.scss`
- Test: `[game]/manage/shared/form-kit.test.tsx`

**Interfaces:**
- Produces (consumed by Tasks 4–7):
  - `FormSection({ title, lede?, children }): JSX` — flat section: eyebrow title + hairline rule.
  - `SegmentedControl({ label, value, options, onChange, disabled? })` with `options: Array<{ value: string; label: string }>` — `role="radiogroup"` of `role="radio"` buttons.
  - `SwitchField({ id, label, hint?, checked, onChange, disabled? })` — styled checkbox row (`role="switch"`).
  - `SectionFooter({ children })` — right-aligned footer row for save buttons.
  - `InlineError({ children })` — renders `null` when children falsy; else the red-rail note.
  - SCSS mixins in `_board.scss`: `board-segmented`, `board-segment`, `board-segment-active`, `board-switch`.

- [ ] **Step 1: Write failing tests**

`form-kit.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InlineError, SegmentedControl, SwitchField } from './form-kit';

describe('SegmentedControl', () => {
    const options = [
        { value: 'asc', label: 'Lower is better' },
        { value: 'desc', label: 'Higher is better' },
    ];

    it('marks the current value checked and fires onChange for the other', () => {
        const onChange = vi.fn();
        render(
            <SegmentedControl
                label="Ranking direction"
                value="asc"
                options={options}
                onChange={onChange}
            />,
        );
        const group = screen.getByRole('radiogroup', {
            name: 'Ranking direction',
        });
        expect(group).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Lower is better' }),
        ).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(screen.getByRole('radio', { name: 'Higher is better' }));
        expect(onChange).toHaveBeenCalledWith('desc');
    });

    it('does not fire onChange when disabled', () => {
        const onChange = vi.fn();
        render(
            <SegmentedControl
                label="Ranking direction"
                value="asc"
                options={options}
                onChange={onChange}
                disabled
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'Higher is better' }));
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('SwitchField', () => {
    it('toggles', () => {
        const onChange = vi.fn();
        render(
            <SwitchField
                id="show-ms"
                label="Show milliseconds"
                checked={false}
                onChange={onChange}
            />,
        );
        fireEvent.click(screen.getByRole('switch', { name: /milliseconds/i }));
        expect(onChange).toHaveBeenCalledWith(true);
    });
});

describe('InlineError', () => {
    it('renders nothing when empty', () => {
        const { container } = render(<InlineError>{null}</InlineError>);
        expect(container).toBeEmptyDOMElement();
    });
    it('renders the message with role alert', () => {
        render(<InlineError>Nope.</InlineError>);
        expect(screen.getByRole('alert')).toHaveTextContent('Nope.');
    });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run "app/(new-layout)/games-v2/[game]/manage/shared/form-kit.test.tsx"` → FAIL (module not found).

- [ ] **Step 3: Add `_board.scss` mixins (append at end)**

Promote the setup wizard's segmented pattern (`setup.module.scss` `.segmented`/`.segmentActive`, lines ~468–500) into shared mixins — copy its visual rules into `board-segmented`/`board-segment`/`board-segment-active` (container: inline-flex, 1px border, radius-md, tint background; segment: control-pill-like button, no border; active: primary 10% fill + primary text + 600 weight). Add `board-switch`:

```scss
// ---- Form switch ---------------------------------------------------
// role="switch" button: a 32×18 track + 14px thumb, primary when on.
@mixin board-switch {
    position: relative;
    width: 32px;
    height: 18px;
    flex-shrink: 0;
    border-radius: 999px;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.8);
    background: rgba(var(--bs-secondary-rgb), 0.2);
    cursor: pointer;
    transition: background-color dt.$transition-fast,
        border-color dt.$transition-fast;

    &::after {
        content: '';
        position: absolute;
        top: 1px;
        left: 1px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--bs-body-bg);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        transition: transform dt.$transition-fast;
    }

    &[aria-checked='true'] {
        background: var(--bs-primary);
        border-color: var(--bs-primary);

        &::after {
            transform: translateX(14px);
        }
    }

    &:focus-visible {
        outline: 2px solid rgba(var(--bs-primary-rgb), 0.5);
        outline-offset: 1px;
    }

    &:disabled {
        opacity: 0.6;
        cursor: default;
    }
}
```

Then make `setup.module.scss`'s `.segmented`/`.segmentActive` consume the new mixins (delete the duplicated rules) so the wizard and console can't drift.

- [ ] **Step 4: Implement `form-kit.tsx` + `form-kit.module.scss`**

```tsx
'use client';

import type { ReactNode } from 'react';
import styles from './form-kit.module.scss';

export function FormSection({
    title,
    lede,
    children,
}: {
    title: string;
    lede?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{title}</h3>
            {lede && <p className={styles.sectionLede}>{lede}</p>}
            {children}
        </section>
    );
}

export function SegmentedControl({
    label,
    value,
    options,
    onChange,
    disabled = false,
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    return (
        <div className={styles.segmented} role="radiogroup" aria-label={label}>
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={opt.value === value}
                    disabled={disabled}
                    className={
                        opt.value === value
                            ? `${styles.segment} ${styles.segmentActive}`
                            : styles.segment
                    }
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

export function SwitchField({
    id,
    label,
    hint,
    checked,
    onChange,
    disabled = false,
}: {
    id: string;
    label: string;
    hint?: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className={styles.switchRow}>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                className={styles.switch}
                onClick={() => onChange(!checked)}
            />
            <label htmlFor={id} className={styles.switchLabel}>
                {label}
                {hint && <span className={styles.switchHint}>{hint}</span>}
            </label>
        </div>
    );
}

export function SectionFooter({ children }: { children: ReactNode }) {
    return <div className={styles.footer}>{children}</div>;
}

export function InlineError({ children }: { children: ReactNode }) {
    if (!children) return null;
    return (
        <div role="alert" className={styles.error}>
            {children}
        </div>
    );
}
```

`form-kit.module.scss`:

```scss
@use '../../../../styles/design-tokens' as dt;
@use '../../../../styles/board' as board;

.section {
    padding-block: dt.$spacing-xl;
    border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.3);

    &:last-child {
        border-bottom: 0;
    }
}

.sectionTitle {
    @include board.board-eyebrow;
    font-weight: 700;
    margin: 0 0 dt.$spacing-md;
}

.sectionLede {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
    margin: calc(#{dt.$spacing-md} * -1 + #{dt.$spacing-xs}) 0 dt.$spacing-lg;
    max-width: 60ch;
}

.segmented {
    @include board.board-segmented;
}

.segment {
    @include board.board-segment;
}

.segmentActive {
    @include board.board-segment-active;
}

.switchRow {
    display: flex;
    align-items: flex-start;
    gap: dt.$spacing-md;
    padding-block: dt.$spacing-xs;
}

.switch {
    @include board.board-switch;
    margin-top: 2px;
}

.switchLabel {
    font-size: dt.$font-size-sm;
    cursor: pointer;
}

.switchHint {
    display: block;
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
}

.footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: dt.$spacing-md;
    padding-top: dt.$spacing-lg;
}

.error {
    @include board.board-error-alert;
    margin-bottom: dt.$spacing-md;
}

.saveBtn {
    @include board.board-btn-primary;
}
```

- [ ] **Step 5: Run tests** — same vitest command → PASS.

- [ ] **Step 6: Commit** — `feat(console): shared form kit (sections, segmented, switch, inline error)`

---

### Task 4: Details & metadata pane

**Files:**
- Modify: `[game]/setup/game-details-form.tsx:220-485` (layout only; state/save logic untouched)
- Modify: `[game]/manage/console/game-details-pane.tsx`
- Modify: `[game]/manage/console/igdb-match-section.tsx` (wrapper only)
- Test: `[game]/setup/game-details-form.test.tsx` (extend)

**Interfaces:**
- Consumes: `FormSection`, `SectionFooter`, `InlineError` from Task 3.
- Produces: new optional prop `sectioned?: boolean` (default `false`) on `GameDetailsForm`. Default rendering (wizard) is UNCHANGED; `sectioned` switches to single-column grouped sections. Console passes `sectioned`, `formId="game-details-form"`, `hideAction`, and renders the save button in `.paneActions`.

- [ ] **Step 1: Write failing test**

Add to `game-details-form.test.tsx` (reuse the file's existing props fixture):

```tsx
it('sectioned layout groups fields under Identity / About / Web & community', () => {
    render(<GameDetailsForm {...baseProps} sectioned />);
    expect(
        screen.getByRole('heading', { name: 'Identity' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(
        screen.getByRole('heading', { name: 'Web & community' }),
    ).toBeInTheDocument();
});

it('default layout has no section headings (wizard unchanged)', () => {
    render(<GameDetailsForm {...baseProps} />);
    expect(screen.queryByRole('heading', { name: 'Identity' })).toBeNull();
});
```

(`baseProps` = whatever the existing tests pass; match their fixture names.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run "app/(new-layout)/games-v2/[game]/setup/game-details-form.test.tsx"` → new tests FAIL.

- [ ] **Step 3: Implement the `sectioned` layout**

In `game-details-form.tsx`: extract the existing field JSX into local constants (`coverField`, `yearField`, `platformsField`, `aboutField`, `slugField`, `discordField`, `linksField` — cut/paste, zero logic change), then:

```tsx
{sectioned ? (
    <div className={styles.sectionedCol}>
        <FormSection title="Identity">
            {coverField}
            {yearField}
            {platformsField}
        </FormSection>
        <FormSection title="About">{aboutField}</FormSection>
        <FormSection title="Web & community">
            {slugField}
            {discordField}
            {linksField}
        </FormSection>
    </div>
) : (
    <div className="row g-4">
        <div className="col-md-6">{coverField}{yearField}{platformsField}{aboutField}</div>
        <div className="col-md-6">{slugField}{discordField}{linksField}</div>
    </div>
)}
```

Import `FormSection` from `../manage/shared/form-kit`. Add to `setup.module.scss`: `.sectionedCol { max-width: 40rem; }`. Replace the form's `alert alert-danger` error block with `InlineError` in BOTH layouts (visual-only swap, same message source).

- [ ] **Step 4: Console pane uses external save + Data source section**

`game-details-pane.tsx`:

```tsx
<div className={styles.surface}>
    <div className={styles.paneHeader}>
        <h2 className={styles.paneTitle}>Details &amp; metadata</h2>
        <div className={styles.paneActions}>
            <button
                type="submit"
                form="game-details-form"
                className={kit.saveBtn}
                disabled={busy}
            >
                {busy ? 'Saving…' : 'Save details'}
            </button>
        </div>
    </div>
    <p className={styles.paneLede}>
        Shown on the public game page and in the setup wizard.
    </p>
    <GameDetailsForm
        sectioned
        formId="game-details-form"
        hideAction
        onBusyChange={setBusy}
        ...existing props
    />
    <IgdbMatchSection ... />
</div>
```

`busy` is local `useState(false)` wired to `onBusyChange`. `kit` = `import kit from '../shared/form-kit.module.scss'` (`.saveBtn` is defined there in Task 3). Wrap `IgdbMatchSection`'s content in `<FormSection title="Data source">` (inside `igdb-match-section.tsx`, replacing its own card/border wrapper if it has one — check its render and strip `border rounded p-3`-style classes).

- [ ] **Step 5: Run tests** — form tests PASS (including the pre-existing ones — the default layout must not regress); typecheck ≤ baseline.

- [ ] **Step 6: Commit** — `feat(console): sectioned Details & metadata pane with header save`

---

### Task 5: Config forms adopt the kit — category editor family

**Files:**
- Modify: `[game]/manage/category-tab/category-settings-section.tsx:151-260`
- Modify: `[game]/manage/category-tab/proof-section.tsx:99-…`
- Modify: `[game]/manage/category-tab/rules-section.tsx:59-…`
- Modify: `[game]/manage/timing/timing-settings-section.tsx:106-…`

**Interfaces:**
- Consumes: `FormSection`, `SegmentedControl`, `SwitchField`, `SectionFooter`, `InlineError` from Task 3.

Pattern for every file (shown on `timing-settings-section.tsx`; apply the same transform to all four):

- [ ] **Step 1: Replace wrappers and controls**

```tsx
return (
    <FormSection
        title="Timing"
        lede={<>Defaults for <strong>{category.display}</strong>. …</>}
    >
        <InlineError>{loadError}</InlineError>
        <form onSubmit={handleSubmit}>
            <SegmentedControl
                label="Primary timing"
                value={state.primaryTiming}
                options={[
                    { value: 'realtime', label: 'Real time' },
                    { value: 'ingame', label: 'In-game time' },
                ]}
                disabled={busy}
                onChange={(v) =>
                    setState((s) => ({ ...s, primaryTiming: v as PrimaryTiming }))
                }
            />
            <SwitchField
                id="hide-rta"
                label="Hide real time column"
                checked={state.hideRealTime}
                disabled={busy}
                onChange={(v) => setState((s) => ({ ...s, hideRealTime: v }))}
            />
            <SwitchField
                id="hide-igt"
                label="Hide game time column"
                checked={state.hideGameTime}
                disabled={busy}
                onChange={(v) => setState((s) => ({ ...s, hideGameTime: v }))}
            />
            <InlineError>{formError}</InlineError>
            <SectionFooter>
                <button
                    type="submit"
                    className={kit.saveBtn}
                    disabled={busy || !dirty}
                >
                    {isSaving ? 'Saving…' : 'Save timing'}
                </button>
            </SectionFooter>
        </form>
    </FormSection>
);
```

Concretely, per file:
- **All four**: `<section className="border rounded p-3 mb-4">` → `FormSection`; `h2.h5` heading text becomes the `title`; the `text-muted small` intro becomes `lede`; `alert alert-danger` → `InlineError`; save `<button className="btn btn-primary…">` → `SectionFooter` + `kit.saveBtn` (defined in `form-kit.module.scss` in Task 3; `import kit from '../shared/form-kit.module.scss'`) — keep every `disabled` condition exactly as-is.
- **category-settings-section**: ranking-direction radios → `SegmentedControl` (`asc` = "Lower time = better", `desc` = "Higher value = better", mapped onto the existing boolean `sortAscending`); "Show milliseconds" checkbox → `SwitchField`; drop `row g-3 / col-md-6` (fields stack).
- **timing-settings-section**: as the code block above. Check the real `PrimaryTiming` values in `~src/lib/category-mgmt` before writing the options; the segmented values must be the enum values, and if the enum has a third member, render three segments.
- **proof-section**: its requireVideo choice (radios or checkbox — see its lines 99+) → `SwitchField` (if boolean) or `SegmentedControl` (if 3-state). Judge from the state variable's type, not the markup.
- **rules-section**: keep the markdown textarea + preview as-is; only the wrapper/heading/error/save move to the kit. Add `board-input-rules` via a local class if the textarea isn't already covered by the `.content` shim.

- [ ] **Step 2: Verify** — `npx vitest run "app/(new-layout)/games-v2/[game]/manage"` (only known failures); typecheck ≤ baseline. Manually confirm `category-editor.tsx` still finds its section anchors — it observes `data-section` attributes on wrapper elements; `FormSection` must not swallow them: where a section wrapper carried `data-section`/`ref`, keep an outer `<div data-section=… ref=…>` around the `FormSection`.

- [ ] **Step 3: Commit** — `feat(console): category editor forms on the shared form kit`

---

### Task 6: Config forms adopt the kit — standards, variables, moderators

**Files:**
- Modify: `[game]/manage/moderation/configure/standards.tsx` (wrapper at ~221, inner `border rounded p-3 bg-light-subtle` blocks at ~230, ~269)
- Modify: `[game]/manage/variables/variables-section.tsx:405-412` + `[game]/manage/variables/variable-form.tsx`
- Modify: `[game]/manage/console/moderators-pane.tsx:147-170`

- [ ] **Step 1: Standards** — outer `h2.h5` + intro → `FormSection title="Minimum time"`; the two inner `border rounded p-3` boxes become plain stacked field groups (the section rule already separates them — delete the box classes, keep contents); `col-md-4` grid → stacked fields with a `max-width: 40rem` column (reuse `sectionedCol` pattern via a local class); errors → `InlineError`; save button → `SectionFooter` + `kit.saveBtn`.

- [ ] **Step 2: Variables** — `variables-section.tsx` wrapper `border rounded p-3 mb-4` → `FormSection title="Leaderboard variables"` with its existing intro as `lede`; its header-row "add variable" button moves into the `FormSection` title row — extend `FormSection` with an optional `actions?: ReactNode` prop rendered right-aligned in the title row (update `form-kit.tsx` + a `.sectionHead { display: flex; justify-content: space-between; align-items: center; }` wrapper; keep Task 3's tests green). `variable-form.tsx`: swap `form-check` booleans → `SwitchField`, `alert-danger` → `InlineError`, keep the table/rows untouched. **Do not touch `variables-section.test.tsx`'s two pre-existing failures; if your change grows the failure count, fix yours only.**

- [ ] **Step 3: Moderators invite row** — the `d-flex gap-2` input+select+button row keeps Bootstrap inputs (the `.content` shim styles them) but the submit button becomes `kit.saveBtn`, and the row gets `flex-wrap: wrap` via a local class if not present.

- [ ] **Step 4: Verify** — vitest sweep as before; typecheck ≤ baseline.

- [ ] **Step 5: Commit** — `feat(console): standards, variables, moderators forms on the shared form kit`

---

### Task 7: Bare panes + sub-route pages

**Files:**
- Modify: `[game]/manage/game-tab/game-tab.tsx:31-33`
- Modify: `[game]/manage/console/categories-pane.tsx:49-50`
- Modify: `[game]/manage/reassignments/reassign-pane.tsx:45-52` + `reassignments.module.scss`
- Modify: `[game]/manage/category/[categoryId]/category-detail.tsx:36-58` + `category-detail.module.scss`
- Modify: `[game]/manage/moderation/runner/[userId]/runner-view.tsx:165-172`
- Modify: `[game]/manage/run/[runId]/run-card.tsx:27-28` + `run-card.module.scss`

- [ ] **Step 1: Console panes get the standard header**

- `game-tab.tsx`: wrap in `<section className={styles.surface}>` (console styles) with `<div className={styles.paneHeader}><h2 className={styles.paneTitle}>Groups</h2></div>` above `GroupsSection`/children. Import `styles from '../console/console.module.scss'`.
- `categories-pane.tsx`: same wrapper with title `Categories` around `CategoriesTable`. (Check `CategoriesTable` doesn't already render an h2 title bar — if it does, hoist that text into the pane header instead of doubling.)
- `reassign-pane.tsx`: give it the pane header (`Reassign runs`); convert `.modeToggle`/`.modeButton`/`.modeActive` in `reassignments.module.scss` to the `board-segmented`/`board-segment`/`board-segment-active` mixins (delete local duplicates).
- Boards pane (`BoardCuration`) and NeedsAttention keep their own internal headers — only verify visually (Task 8) that their top spacing sits well on the flat surface; adjust their module's top margin if the first element now double-spaces.

- [ ] **Step 2: Sub-route pages**

- `category-detail.tsx`: restyle `.header` in `category-detail.module.scss` to the pane-header recipe (baseline flex row, bottom hairline `rgba(var(--bs-border-color-rgb), 0.5)`, `margin-bottom: dt.$spacing-xl`); title uses the `.paneTitle` sizes (`font-size: dt.$font-size-lg; font-weight: 700`). Keep back-link + prev/next markup as-is.
- `runner-view.tsx`: drop `container py-3` (the frame's `.content` now pads); header `h1.h4` row becomes the same ruled pane-header pattern via a local module class (create `runner-view.module.scss` additions if the file has one, else a minimal new one).
- `run-card.tsx` / `run-card.module.scss`: `.card` currently `board-surface` — inside the frame keep it as an item card (it's a single focal object, not a pane wrapper): reduce to `border + radius-lg + padding`, drop the tinted background (`background: transparent`) so it doesn't read as card-on-card against the frame.

- [ ] **Step 3: Verify** — vitest sweep; typecheck ≤ baseline. Click-through paths that must still render: `/manage` (grid), `?pane=categories|groups|boards|attention|game-details|moderators|reassign|bans`, `/manage/category/[id]`, `/manage/run/[id]`, `/manage/moderation/roster`, runner page.

- [ ] **Step 4: Commit** — `feat(console): pane headers for bare panes, sub-route pages on the shared pattern`

---

### Task 8: Shim removal + visual pass

**Files:**
- Modify: `[game]/manage/console/console.module.scss` (`.content :global(...)` block)
- Verify-only: every route above, light + dark theme

- [ ] **Step 1: Shrink the Bootstrap shims** — in `.content`, delete the `:global(.bg-light-subtle)` and `:global(h2.h5)` overrides **only if** `grep -rn "bg-light-subtle\|h2 className=\"h5" app/(new-layout)/games-v2/[game]/manage` comes back empty after Tasks 5–7; keep `:global(.form-control), :global(.form-select) { board-input-rules }` (dialogs and the invite row still use Bootstrap inputs).

- [ ] **Step 2: Screenshot pass** — games-v2 manage pages are admin-gated. Use the established recipe: temp-comment the gate in `[game]/manage/page.tsx` (the session/permission check near the top), `npm run dev` (check first: `ps -eo pid,args | grep "next dev" | grep -v grep`), `curl` the HTML of `/games-v2/<game>/manage` + `?pane=game-details` + `?pane=categories` + a category detail page, revert the gate, **kill the dev server by exact pid**. Render saved HTML via the scratchpad playwright-core setup (strip external `<script src>`, keep inline `$RC`). Check both themes. Judge against the spec: one frame, tinted sidebar, no card-in-card, ruled headers, segmented/switch controls.

- [ ] **Step 3: Full verification** — `npm run typecheck` count ≤ baseline; `npx vitest run "app/(new-layout)/games-v2"` (only the two known failures); `npm run lint` on touched files clean.

- [ ] **Step 4: Commit + push** — `chore(console): drop dead Bootstrap shims after form-kit migration`; push branch `mod-console-redesign` (never to main). Update the spec doc status line to "Implemented". Do NOT open a PR (Joey does).
