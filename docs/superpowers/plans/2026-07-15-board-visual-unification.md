# Board Visual Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One visual language across the public leaderboard (flagship), setup wizard, console panes, and claim surfaces — clean, tight, overzichtelijk — per `docs/superpowers/specs/2026-07-15-board-visual-unification-design.md`.

**Architecture:** A shared SCSS mixin partial `_board.scss` (built on `_design-tokens.scss`) supplies board-surface, board-table, mono-time, eyebrow, rank accents, control-band pills, and input treatments. Per-surface `*.module.scss` files compose the mixins. No behavior, data-flow, copy, URL, or action changes anywhere — className/markup-level restyling plus the layout moves the spec lists (self-claim into header actions, pills+filters into one control band).

**Tech Stack:** Next.js 16 App Router, SCSS modules, Bootstrap CSS variables (`--bs-*`), `react-bootstrap-icons` (already a dependency).

## Global Constraints

- No behavior, data-flow, copy, URL, or action changes. Restyle + the specific layout moves in the spec only.
- Tokens, not magic numbers: use `dt.$spacing-*`, `dt.$radius-*`, `dt.$font-size-*`, `dt.$transition-*`, `dt.$font-mono`, accent tokens.
- No emoji/text glyphs (`✓ ✕ ! · ▾ ▸`) in touched files — `react-bootstrap-icons` only, `aria-hidden` when decorative.
- Dark mode must work: color via `--bs-*` CSS vars and `color-mix` with them, never hardcoded grays (accent hexes from tokens are fine).
- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons. Pre-commit hook auto-fixes staged files.
- Verification per task: `npm run typecheck` (expect exit 0, no output) and `npx @biomejs/biome check <changed files>`. Full `npm run build` only in the final task.
- Commit after every task. No Claude co-author line in commit messages.
- The repo path contains parentheses/brackets — always quote paths in shell: `"app/(new-layout)/games-v2/[game]/..."`.

---

### Task 1: Shared foundation — tokens, `_board.scss`, system.md

**Files:**
- Modify: `app/(new-layout)/styles/_design-tokens.scss` (accent tokens, after line 25 `$accent-red-light`)
- Create: `app/(new-layout)/styles/_board.scss`
- Modify: `.interface-design/system.md`

**Interfaces:**
- Produces (used by every later task): mixins `board-surface($padding)`, `board-eyebrow`, `mono-time`, `board-table`, `board-rank`, `control-pill`, `control-pill-active`, `board-input-rules`, `board-pill`; tokens `dt.$accent-silver`, `dt.$accent-bronze`.
- Import pattern from a games-v2 module file: `@use '../../../styles/board' as board;` (count `../` per depth; from `games-v2/[game]/leaderboard/` it is `../../../styles/board`).

- [ ] **Step 1: Add silver/bronze tokens**

In `app/(new-layout)/styles/_design-tokens.scss`, after `$accent-red-light: #f87171;`:

```scss
$accent-silver: #9ca3af;
$accent-bronze: #b87333;
```

- [ ] **Step 2: Create `app/(new-layout)/styles/_board.scss`**

```scss
@use 'design-tokens' as dt;

// ============================================================
// Board vocabulary — shared visual language for games-v2:
// public leaderboard (flagship), setup wizard, admin console,
// claim surfaces. See .interface-design/system.md.
// Depth = borders + subtle surface tint. Times are mono tabular.
// ============================================================

// ---- Surfaces ----------------------------------------------
@mixin board-surface($padding: dt.$spacing-2xl) {
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    border-radius: dt.$radius-lg;
    background: color-mix(
        in srgb,
        var(--bs-body-bg) 92%,
        var(--bs-secondary-bg) 8%
    );
    padding: $padding;
}

// ---- Typography --------------------------------------------
@mixin board-eyebrow {
    font-size: dt.$font-size-2xs;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    color: var(--bs-secondary-color);
}

@mixin mono-time {
    font-family: dt.$font-mono;
    font-variant-numeric: tabular-nums;
    color: var(--bs-emphasis-color);
}

// ---- Dense data table (apply to <table>) -------------------
@mixin board-table {
    width: 100%;
    border-collapse: collapse;
    font-size: dt.$font-size-sm;

    thead th {
        @include board-eyebrow;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-align: left;
        padding: dt.$spacing-sm dt.$spacing-md;
        border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
        white-space: nowrap;
    }

    tbody td {
        padding: dt.$spacing-xs dt.$spacing-md;
        border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.2);
        vertical-align: middle;
    }

    tbody tr {
        transition: background-color dt.$transition-fast;

        &:hover {
            background: var(--bs-tertiary-bg);
        }
    }
}

// Rank cell: mono, right-aligned, narrow. Top-3 modifiers are
// consumer classes setting `color` via dt.$accent-gold/silver/bronze.
@mixin board-rank {
    @include mono-time;
    color: var(--bs-secondary-color);
    text-align: right;
    width: 2.5rem;
    font-weight: 600;
}

// ---- Control band pills ------------------------------------
@mixin control-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 0;
    background: transparent;
    color: var(--bs-secondary-color);
    font-size: dt.$font-size-sm;
    font-weight: 500;
    padding: dt.$badge-padding;
    border-radius: dt.$badge-radius;
    cursor: pointer;
    transition: background-color dt.$transition-fast,
        color dt.$transition-fast;

    &:hover {
        background: rgba(var(--bs-primary-rgb), 0.06);
        color: var(--bs-emphasis-color);
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

@mixin control-pill-active {
    background: rgba(var(--bs-primary-rgb), 0.1);
    color: var(--bs-primary);
    font-weight: 600;

    &:hover {
        background: rgba(var(--bs-primary-rgb), 0.12);
        color: var(--bs-primary);
    }
}

// ---- Status pill (severity language) ------------------------
// $color: dt.$accent-red / dt.$accent-amber / null (neutral)
@mixin board-pill($color: null) {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: dt.$font-size-2xs;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    border: 1px solid transparent;

    @if $color {
        background: color-mix(in srgb, $color 16%, transparent);
        color: $color;
    } @else {
        background: rgba(var(--bs-secondary-rgb), 0.12);
        color: var(--bs-secondary-color);
        border-color: rgba(var(--bs-border-color-rgb), 0.5);
    }
}

// ---- Inputs -------------------------------------------------
// Inner rules only; consumers wrap in a local class:
//   .main { :global(.form-control), :global(.form-select) { @include board-input-rules; } }
@mixin board-input-rules {
    border-color: rgba(var(--bs-border-color-rgb), 0.6);
    border-radius: dt.$radius-md;
    transition: border-color dt.$transition-fast,
        box-shadow dt.$transition-fast;

    &:focus {
        border-color: var(--bs-primary);
        box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.15);
    }
}
```

- [ ] **Step 3: Update `.interface-design/system.md`**

Apply these edits:
- Line 1 title → `# Interface Design System — therun.gg games-v2`.
- Scope line → `Scope: all games-v2 surfaces — the public leaderboard, the setup wizard, the unified admin console at /games-v2/[game]/manage, and claim surfaces. Extends the app's existing system; does not replace it.`
- In **Intent**, add a second human/verb pair after the moderator one: `- **Human (public):** a speedrunner or viewer scanning a leaderboard. Wants the board to be overzichtelijk — instantly legible, calm, competitive. **Verb:** *scan* ranks and times.`
- In **Signature**, add: `3. **Rank accents** — ranks 1/2/3 colored gold/silver/bronze ($accent-gold/$accent-silver/$accent-bronze) in the mono rank column. The public board's defining element; the wizard's live preview shares it.`
- In **Components**, add: `- styles/_board.scss — shared board vocabulary (board-surface, board-table, board-rank, mono-time, board-eyebrow, control-pill, board-pill, board-input-rules). All games-v2 module.scss files compose these.`

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → exit 0. Run: `npx @biomejs/biome check "app/(new-layout)/styles/_board.scss" "app/(new-layout)/styles/_design-tokens.scss"` → no errors (biome may skip scss; that's fine).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/styles/_board.scss" "app/(new-layout)/styles/_design-tokens.scss" .interface-design/system.md
git commit -m "feat(styles): shared board vocabulary partial + rank accent tokens"
```

---

### Task 2: Migrate console.module.scss onto the shared mixins (zero visual change)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console.module.scss`

**Interfaces:**
- Consumes: `_board.scss` mixins from Task 1.
- Produces: unchanged class names (`.surface`, `.eyebrow`, `.time`, `.pill*`, `.item`, `.content`) — consumers untouched. Intent: byte-identical rendering.

- [ ] **Step 1: Swap duplicated rules for mixins**

At top of `console.module.scss`, after the existing `@use` lines, add:

```scss
@use '../../../../styles/board' as board;
```

Then replace rule bodies (keep selectors and any extra properties not covered):

- `.eyebrow { ... }` → `.eyebrow { @include board.board-eyebrow; }`
- `.surface { ... }` → `.surface { @include board.board-surface; }`
- `.time { @include mx.monospace-value; color: var(--bs-emphasis-color); }` → `.time { @include board.mono-time; }`
- `.pill { ... }` → `.pill { @include board.board-pill; background: none; border-color: transparent; }` — careful: `.pill` is the base composed with `.pillNeutral`/`.sevPill*`; simplest faithful mapping is `.pill` keeps layout props only. Replace `.pill` body with:
  ```scss
  .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: dt.$font-size-2xs;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      border: 1px solid transparent;
      text-transform: uppercase;
  }
  ```
  (i.e. leave `.pill`/`.pillNeutral`/`.sevPill*` exactly as they are — do NOT migrate them; they already match `board-pill` output. Only migrate `.eyebrow`, `.surface`, `.time`.)
- Inside `.content`, replace the `:global(.form-control), :global(.form-select)` body with `@include board.board-input-rules;` (drop the now-duplicated border/transition/focus lines; keep the `.bg-light-subtle` and `h2.h5` blocks as-is).

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck` → exit 0.

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/console.module.scss"
git commit -m "refactor(console): compose shared board mixins, no visual change"
```

---

### Task 3: Public leaderboard table, rows, pagination

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/pagination-bar.tsx`

**Interfaces:**
- Consumes: `_board.scss` mixins (`@use '../../../../styles/board' as board;` — this dir is 4 levels below `app/(new-layout)`).
- Produces: `leaderboard.module.scss` classes `.wrapper .table .rank .rank1 .rank2 .rank3 .runner .time .meta .youRow .iconLink .setPill .pager .pageBtn .pageBtnActive` — Task 8 imports this file for the wizard preview.

- [ ] **Step 1: Create `leaderboard.module.scss`**

```scss
@use '../../../../styles/design-tokens' as dt;
@use '../../../../styles/board' as board;

.wrapper {
    @include board.board-surface(0);
    overflow: hidden;
    overflow-x: auto;
}

.table {
    @include board.board-table;

    tbody tr:last-child td {
        border-bottom: 0;
    }
}

.rank {
    @include board.board-rank;
}

.rank1 {
    color: dt.$accent-gold;
}
.rank2 {
    color: dt.$accent-silver;
}
.rank3 {
    color: dt.$accent-bronze;
}

.runner {
    font-weight: 600;
    color: var(--bs-emphasis-color);
}

.time {
    @include board.mono-time;
    white-space: nowrap;

    a {
        color: inherit;
        text-decoration: none;

        &:hover {
            color: var(--bs-primary);
        }
    }
}

.meta {
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
    white-space: nowrap;
}

// "you" row: primary tint + 3px spine (the console's severity-spine
// vocabulary reused as identity)
.youRow td {
    background: rgba(var(--bs-primary-rgb), 0.06);

    &:first-child {
        box-shadow: inset 3px 0 0 var(--bs-primary);
    }
}

.iconLink {
    display: inline-flex;
    align-items: center;
    color: var(--bs-secondary-color);
    transition: color dt.$transition-fast;

    &:hover {
        color: var(--bs-primary);
    }
}

.verified {
    color: var(--bs-primary);
}

.setPill {
    @include board.board-pill;
    text-transform: none;
}

// ---- Pagination --------------------------------------------
.pager {
    display: flex;
    gap: dt.$spacing-xs;
    justify-content: center;
    margin-top: dt.$spacing-lg;
}

.pageBtn {
    @include board.control-pill;
    @include board.mono-time;
    color: var(--bs-secondary-color);
    padding: 0.25rem 0.6rem;
}

.pageBtnActive {
    @include board.control-pill-active;
}
```

- [ ] **Step 2: Rewrite `leaderboard-table.tsx` render**

Keep props/logic identical; replace the returned JSX:

```tsx
import styles from './leaderboard.module.scss';
```

Empty state: wrap existing content in `<div className={`${styles.wrapper} text-center py-4`}>` (keep copy + ClearFiltersButton).

Table:

```tsx
return (
    <div className={styles.wrapper}>
        <table className={styles.table}>
            <thead>
                <tr>
                    <th className={styles.rank}>#</th>
                    <th>Runner</th>
                    {!hideRealTime && <th>Real time</th>}
                    {!hideGameTime && <th>Game time</th>}
                    <th>Date</th>
                    <th aria-label="Video" />
                    <th aria-label="Verified" />
                    <th />
                </tr>
            </thead>
            <tbody>{/* rows unchanged */}</tbody>
        </table>
    </div>
);
```

- [ ] **Step 3: Rewrite `leaderboard-row.tsx` cells**

Imports to add:

```tsx
import { CheckCircleFill, PlayBtn } from 'react-bootstrap-icons';
import styles from './leaderboard.module.scss';
```

Row element: `<tr className={isCurrentUser ? styles.youRow : undefined}>`.

Cells (same order/logic, new classes):
- rank: `<td className={`${styles.rank} ${entry.rank === 1 ? styles.rank1 : entry.rank === 2 ? styles.rank2 : entry.rank === 3 ? styles.rank3 : ''}`}>{entry.rank}</td>`
- runner: `<td className={styles.runner}><UserLink … /></td>`
- both time cells: `<td className={styles.time}>…existing link/DurationToFormatted logic unchanged…</td>` (drop `className="text-decoration-none"` from the inner Links — the module styles them)
- date: `<td className={styles.meta}>…unchanged…</td>`
- VOD: `<td>{entry.vodUrl ? (<a href={entry.vodUrl} target="_blank" rel="noreferrer" className={styles.iconLink} aria-label="Watch VOD" title="Watch VOD"><PlayBtn size={16} /></a>) : null}</td>`
- verified: `<td>{entry.source === 'manual' ? (<span className={styles.setPill} title="A moderator-set leaderboard time">set time</span>) : entry.verificationStatus === 'verified' ? (<CheckCircleFill size={13} className={styles.verified} aria-label="Verified" />) : null}</td>` (removes the `✓` glyph)
- actions cell: unchanged.

- [ ] **Step 4: Restyle `pagination-bar.tsx`**

`import styles from './leaderboard.module.scss';`. Nav: `className={styles.pager}`. Prev/Next buttons: `className={styles.pageBtn}`. Page buttons: `className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}`. Logic unchanged.

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck` → exit 0. Grep: `grep -rn "table table-hover" "app/(new-layout)/games-v2/[game]/leaderboard"` → no matches.

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard"
git commit -m "feat(leaderboard): dense board-table with rank accents, icon meta, mono pager"
```

---

### Task 4: Game page header, control band, rules, self-claim move

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/game-page.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/header/game-header.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/header/category-pills.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/filter-bar.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/subcategory-pills.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/variable-pill.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/verified-toggle.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/rules/rules-panel.tsx`

**Interfaces:**
- Consumes: `_board.scss` (from `[game]/` dir: `@use '../../../styles/board' as board;`); Task 3's module is NOT used here.
- Produces: `game-page.module.scss` classes `.header .cover .titleBlock .metaLine .actions .band .bandRow .bandRowSub .groupLabel .pill .pillActive .checkPill .rulesToggle .rulesBody .dropdownPanel .notice`; `GameHeader` gains optional prop `selfClaim?: React.ReactNode`.

- [ ] **Step 1: Create `game-page.module.scss`**

```scss
@use '../../../styles/design-tokens' as dt;
@use '../../../styles/board' as board;

// ---- Header -------------------------------------------------
.header {
    display: flex;
    align-items: center;
    gap: dt.$spacing-lg;
    margin-bottom: dt.$spacing-xl;
}

.cover {
    width: 48px;
    height: 64px;
    border-radius: dt.$radius-md;
    object-fit: cover;
    box-shadow: dt.$shadow-sm;
    flex-shrink: 0;
}

.title {
    font-size: dt.$font-size-2xl;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0;
    line-height: 1.15;
}

.metaLine {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);

    span {
        @include board.mono-time;
        color: var(--bs-secondary-color);
    }
}

.actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
    justify-content: flex-end;
}

// ---- Control band ------------------------------------------
.band {
    @include board.board-surface(dt.$spacing-sm dt.$spacing-lg);
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-xs;
    margin-bottom: dt.$spacing-lg;
}

.bandRow {
    display: flex;
    align-items: center;
    gap: dt.$spacing-xs;
    flex-wrap: wrap;
}

// subordinate second row: hairline above, smaller quieter pills
.bandRowSub {
    border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.3);
    padding-top: dt.$spacing-xs;

    .pill {
        font-size: dt.$font-size-xs;
        padding: 0.2rem 0.6rem;
    }
}

.groupLabel {
    @include board.board-eyebrow;
    margin-right: dt.$spacing-xs;
}

.pill {
    @include board.control-pill;
}

.pillActive {
    @include board.control-pill-active;
}

// verified-toggle: label pill wrapping a native checkbox
.checkPill {
    @include board.control-pill;
    gap: 0.45rem;
    margin: 0;

    input {
        accent-color: var(--bs-primary);
        margin: 0;
    }
}

.rulesToggle {
    @include board.control-pill;
    margin-left: auto;
    font-size: dt.$font-size-xs;
}

.rulesBody {
    @include board.board-surface(dt.$spacing-lg dt.$spacing-xl);
    margin-bottom: dt.$spacing-lg;
    font-size: dt.$font-size-sm;

    > :last-child {
        margin-bottom: 0;
    }
}

// variable-pill dropdown panel
.dropdownPanel {
    @include board.board-surface(dt.$spacing-sm dt.$spacing-md);
    position: absolute;
    z-index: 10;
    margin-top: dt.$spacing-xs;
    box-shadow: dt.$shadow-md;
    background: var(--bs-body-bg);
    min-width: 10rem;
}

// invalid-combination / empty notices
.notice {
    @include board.board-surface;
    text-align: center;
    margin-block: dt.$spacing-lg;
}
```

- [ ] **Step 2: `game-header.tsx` — actions group + self-claim slot**

Add `import type { ReactNode } from 'react';` and prop `selfClaim?: ReactNode` to `Props`; destructure it. Replace the raw Bootstrap layout with module classes:

```tsx
import styles from '../game-page.module.scss';
```

```tsx
<header className={styles.header}>
    {game.image && (
        <img
            src={game.image}
            alt={game.display}
            width={48}
            height={64}
            className={styles.cover}
            loading="eager"
        />
    )}
    <div>
        <h1 className={styles.title}>{game.display}</h1>
        <div className={styles.metaLine}>
            <span>{stats.uniqueRunners.toLocaleString()}</span> runners ·{' '}
            <span>
                <DurationToFormatted duration={stats.totalRunTime} />
            </span>{' '}
            total
        </div>
    </div>
    {(sessionUsername || canManage || canModerate) && (
        <div className={styles.actions}>
            {claim && sessionUsername && (
                <ClaimCta claim={claim} gameDisplay={game.display} />
            )}
            {selfClaim}
            {sessionUsername && (
                <Link
                    href={`/games-v2/${game.name}/submit`}
                    className="btn btn-sm btn-primary"
                >
                    Submit a run
                </Link>
            )}
            {(canManage || canModerate) && (
                <Link
                    href={`/games-v2/${game.name}/manage`}
                    className="btn btn-sm btn-outline-secondary"
                >
                    {canModerate ? 'Moderate' : 'Manage'}
                </Link>
            )}
        </div>
    )}
</header>
```

(Keep the existing comment about the single console entry point above the Manage link.)

- [ ] **Step 3: `game-page.tsx` — band composition + self-claim move**

- Import `styles from './game-page.module.scss'`.
- Pass the self-claim into the header and delete the old floating block (the `d-flex justify-content-end mb-2` div):

```tsx
<GameHeader
    game={data.game}
    stats={data.quickStats}
    canManage={canManage}
    canModerate={canManageRuns}
    sessionUsername={data.sessionUsername}
    claim={claim}
    selfClaim={
        data.sessionUsername ? (
            <SelfClaimButton
                gameId={data.game.id}
                categories={data.categories.map((c) => ({
                    id: c.id,
                    display: c.display,
                }))}
                defaultCategoryId={data.selectedCategory.id}
            />
        ) : null
    }
/>
```

- Wrap CategoryPills + FilterBar + rules toggle in one band. Replace the current `<CategoryPills …/>` + `<FilterBar …/>` + `<RulesPanel …/>` block with:

```tsx
<div className={styles.band}>
    <CategoryPills … unchanged props … />
    <FilterBar … unchanged props … />
</div>
<RulesPanel
    rules={data.selectedCategory.rules}
    categoryId={data.selectedCategory.id}
/>
```

(RulesPanel sits directly under the band; its toggle is restyled in Step 7 to read as part of the band's bottom row — structurally simpler than lifting its state.)

- `InvalidCombinationNotice`: outer div → `className={styles.notice}`; suggestion links → `className={styles.pill}` instead of `btn btn-sm btn-outline-secondary`.
- The no-categories early return `<p className="text-center text-muted my-5">` → wrap in `<div className={styles.notice}><p className="text-muted mb-0">…</p></div>`.

- [ ] **Step 4: `category-pills.tsx` — band row 1**

Import `styles from '../game-page.module.scss'`. In `renderPill`, replace the button className with:

```tsx
className={`${styles.pill} ${active ? styles.pillActive : ''}`}
```

Replace the section wrappers: outer `<div aria-label="Category">` stays; each section div `className="mb-2"` → `className={styles.bandRow}`; the `<small className="text-muted text-uppercase fw-bold d-block mb-1">` group label → `<span className={styles.groupLabel}>`; the inner `<nav className="d-flex gap-2 flex-wrap">` → `<nav className={styles.bandRow}>`.

- [ ] **Step 5: `filter-bar.tsx` + `subcategory-pills.tsx` + `verified-toggle.tsx` — band row 2**

`filter-bar.tsx`: import styles; render nothing-extra wrapper → `<div className={`${styles.bandRow} ${styles.bandRowSub}`}>` replacing `className="mb-3"`. Note: FilterBar renders three children that each have their own margins — remove those:
- `subcategory-pills.tsx`: outer `d-flex flex-column gap-2 mb-3` → `d-flex flex-column gap-1` (keep utility classes; they're layout-only); per-def row stays; label `<span className="small text-muted">{def.name}:</span>` → `<span className={styles.groupLabel}>{def.name}</span>` (import styles from `'../game-page.module.scss'`); buttons → `${styles.pill} ${isActive ? styles.pillActive : ''}` keeping the `title` attr.
- `variable-pill.tsx`: trigger button className → `${styles.pill} ${selectedValues.length > 0 ? styles.pillActive : ''}`; dropdown div `position-absolute mt-1 p-2 border rounded bg-body shadow-sm` → `styles.dropdownPanel`. (Read the file first; keep all logic.)
- `verified-toggle.tsx`: `<label className="d-flex align-items-center gap-2 mb-3">` → `<label className={styles.checkPill}>`; the span text stays.
- `variable-pills.tsx` wrapper `d-flex gap-2 flex-wrap mb-2` → `d-flex gap-1 flex-wrap` (drop margin).

- [ ] **Step 6: `rules-panel.tsx` — quiet toggle + surface body, icons**

```tsx
import { ChevronDown, ChevronRight } from 'react-bootstrap-icons';
import styles from '../game-page.module.scss';
```

Replace the section/button markup (logic + copy unchanged):

```tsx
<section className="mb-3">
    <button
        type="button"
        className={styles.rulesToggle}
        style={{ marginLeft: 0 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
    >
        {open ? (
            <ChevronDown size={12} aria-hidden />
        ) : (
            <ChevronRight size={12} aria-hidden />
        )}
        <strong>Rules</strong>
        {!open && (
            <span className="text-muted small text-truncate">
                {buildExcerpt(rules)}
            </span>
        )}
    </button>
    {open && (
        <div className={styles.rulesBody}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rules}</ReactMarkdown>
        </div>
    )}
</section>
```

(Removes the `▾`/`▸` glyphs.)

- [ ] **Step 7: Verify + commit**

Run: `npm run typecheck` → exit 0. Grep: `grep -rn '▾\|▸' "app/(new-layout)/games-v2/[game]/rules"` → no matches.

```bash
git add "app/(new-layout)/games-v2/[game]"
git commit -m "feat(game-page): unified header action group, control band, quiet rules toggle"
```

---

### Task 5: Sidebar panels

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/sidebar/sidebar.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/wr-card.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/quick-stats-panel.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/recent-pbs-panel.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/live-panel.tsx`

**Interfaces:**
- Consumes: `_board.scss` (`@use '../../../../styles/board' as board;`).
- Produces: `sidebar.module.scss` classes `.panel .panelHead .eyebrow .quietLink .wrTime .row .rowMeta .statLabel .statValue`.

- [ ] **Step 1: Create `sidebar.module.scss`**

```scss
@use '../../../styles/design-tokens' as dt;
@use '../../../styles/board' as board;

.panel {
    @include board.board-surface(dt.$spacing-lg);
    margin-bottom: dt.$spacing-lg;
}

.panelHead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: dt.$spacing-sm;
}

.eyebrow {
    @include board.board-eyebrow;
}

.quietLink {
    background: none;
    border: 0;
    padding: 0;
    font-size: dt.$font-size-xs;
    color: var(--bs-secondary-color);
    cursor: pointer;
    transition: color dt.$transition-fast;

    &:hover {
        color: var(--bs-primary);
    }
}

// the sidebar's one loud element
.wrTime {
    @include board.mono-time;
    font-size: dt.$font-size-2xl;
    font-weight: 700;
    color: dt.$accent-gold;
    line-height: 1.2;

    a {
        color: inherit;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
}

.row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: dt.$spacing-sm;
    padding-block: 2px;
    font-size: dt.$font-size-sm;
}

.rowMeta {
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
}

.statLabel {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
}

.statValue {
    @include board.mono-time;
    font-size: dt.$font-size-sm;
}
```

- [ ] **Step 2: Apply per panel (logic/copy unchanged)**

All four import `styles from './sidebar.module.scss'`.

- `wr-card.tsx`: `<section className="border rounded p-3 mb-3">` → `styles.panel`; the head div → `styles.panelHead` with `<span className={styles.eyebrow}>World Record</span>` and the History button → `styles.quietLink`; `<div className="fs-4 fw-bold">` → `styles.wrTime`; runner line unchanged; "Set {date}" small → `<div className={styles.rowMeta}>`; Watch VOD link → wrap div `className="mt-2"` stays, link gets `className={styles.quietLink}` semantics — keep as plain `<a>` with `className="small"`.
- `quick-stats-panel.tsx`: section → `styles.panel`; heading small → `<span className={`${styles.eyebrow} d-block mb-2`}>Quick stats</span>`; replace the `<dl className="row mb-0 small">` with four `.row` divs: `<div className={styles.row}><span className={styles.statLabel}>Runners</span><span className={styles.statValue}>{stats.uniqueRunners.toLocaleString()}</span></div>` etc. for all four stats (Total run time keeps `<DurationToFormatted …/>` inside the value span).
- `recent-pbs-panel.tsx`: sections → `styles.panel`; heading → eyebrow as above; each `<li>` → keep `<ul className="list-unstyled mb-0">` but li content: `<li key={p.id} className={styles.row}><UserLink …/><span className={styles.statValue}><DurationToFormatted duration={p.time} /> <span className={styles.rowMeta}>{p.category}</span></span></li>`.
- `live-panel.tsx`: section → `styles.panel`; head div → `styles.panelHead`; "Live now" → eyebrow span; View-all button → `styles.quietLink`; list li → `styles.row`; category small → `styles.rowMeta`.

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck` → exit 0. Grep: `grep -rn "border rounded p-3" "app/(new-layout)/games-v2/[game]/sidebar"` → no matches.

```bash
git add "app/(new-layout)/games-v2/[game]/sidebar"
git commit -m "feat(game-page): sidebar panels on board surfaces, gold mono WR"
```

---

### Task 6: Wizard shell — header, progress rail, board-so-far, notes

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/setup.module.scss` (full rewrite)
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx`

**Interfaces:**
- Consumes: `_board.scss` (`@use '../../../styles/board' as board;` — setup/ is 3 levels below).
- Produces (Tasks 7–8 depend on these class names): `.page .header .cover .eyebrow .title .subtitle .stepper .stepNode .stepNum .stepConnector .stepCurrent .stepDone .layout .main .rail .railCard .railRow .railIcon .navBar .spacer .section .sectionTitle .sectionHint .statTile .statValue .statLabel .table .infoNote .warnNote .errorNote .rows .rowItem`.

- [ ] **Step 1: Rewrite `setup.module.scss`**

```scss
@use '../../../styles/design-tokens' as dt;
@use '../../../styles/board' as board;

.page {
    max-width: 72rem;
    margin: 0 auto;
    padding: dt.$spacing-2xl dt.$spacing-lg dt.$spacing-3xl;
}

// ---- Header (console pattern) ------------------------------
.header {
    display: flex;
    align-items: center;
    gap: dt.$spacing-lg;
}

.cover {
    width: 44px;
    height: 59px;
    border-radius: dt.$radius-md;
    object-fit: cover;
    box-shadow: dt.$shadow-sm;
    flex-shrink: 0;
}

.eyebrow {
    @include board.board-eyebrow;
}

.title {
    font-size: dt.$font-size-xl;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0;
    line-height: 1.1;
}

.subtitle {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
}

// ---- Progress rail -----------------------------------------
.stepper {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    margin: dt.$spacing-xl 0 dt.$spacing-2xl;
}

.stepNode {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: dt.$font-size-xs;
    font-weight: 500;
    color: var(--bs-tertiary-color);
    background: none;
    border: 0;
    padding: 0.25rem 0.5rem;
    border-radius: dt.$radius-md;
    cursor: pointer;
    transition: color dt.$transition-fast, background-color dt.$transition-fast;

    &:hover {
        color: var(--bs-body-color);
        background: rgba(var(--bs-primary-rgb), 0.06);
    }
}

.stepNum {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 50%;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.8);
    font-size: dt.$font-size-2xs;
    font-weight: 600;
    flex-shrink: 0;
    transition: background-color dt.$transition-fast,
        border-color dt.$transition-fast, color dt.$transition-fast;
}

.stepConnector {
    width: 1.25rem;
    height: 1px;
    background: rgba(var(--bs-border-color-rgb), 0.6);
    flex-shrink: 0;
}

.stepCurrent {
    color: var(--bs-emphasis-color);
    font-weight: 600;

    .stepNum {
        background: var(--bs-primary);
        border-color: var(--bs-primary);
        color: #fff;
    }
}

.stepDone {
    color: var(--bs-secondary-color);

    .stepNum {
        border-color: var(--bs-primary);
        color: var(--bs-primary);
    }
}

// ---- Layout -------------------------------------------------
.layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 17rem;
    gap: dt.$spacing-3xl;
    align-items: start;
}

@media (max-width: 900px) {
    .layout {
        grid-template-columns: minmax(0, 1fr);
    }
}

// wraps step content: unify raw Bootstrap inputs inside
.main {
    :global(.form-control),
    :global(.form-select) {
        @include board.board-input-rules;
    }

    :global(h2.h4) {
        font-size: dt.$font-size-lg;
        font-weight: 700;
        letter-spacing: -0.01em;
        margin-bottom: dt.$spacing-sm;
    }

    :global(h3.h6) {
        @include board.board-eyebrow;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-bottom: dt.$spacing-md;
    }
}

// ---- Right rail ---------------------------------------------
.rail {
    font-size: dt.$font-size-sm;
}

.railCard {
    @include board.board-surface(dt.$spacing-lg);
    position: sticky;
    top: dt.$spacing-lg;
}

.railTitle {
    @include board.board-eyebrow;
    display: block;
    margin-bottom: dt.$spacing-sm;
}

.railRow {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    padding-block: 2px;
    color: var(--bs-secondary-color);
    font-size: dt.$font-size-xs;
}

.railIcon {
    flex-shrink: 0;
    position: relative;
    top: 1px;
    color: var(--bs-tertiary-color);
}

.railIconDone {
    color: var(--bs-primary);
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

// ---- Step section anatomy (Tasks 7–8) ----------------------
.section {
    @include board.board-surface(dt.$spacing-xl);
    margin-bottom: dt.$spacing-lg;
}

.sectionHint {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
    margin-bottom: dt.$spacing-md;
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
```

- [ ] **Step 2: Update `wizard-shell.tsx`**

Imports to add: `import { Check2, Dot } from 'react-bootstrap-icons';`

Header block →

```tsx
<header className={styles.header}>
    {data.game.image && (
        <img
            src={data.game.image}
            alt={data.game.display}
            width={44}
            height={59}
            className={styles.cover}
        />
    )}
    <div>
        <div className={styles.eyebrow}>Game setup</div>
        <h1 className={styles.title}>Set up {data.game.display}</h1>
        <div className={styles.subtitle}>
            Every step saves as you go — you can leave and come back anytime.
        </div>
    </div>
</header>
```

Stepper → nodes joined by connectors:

```tsx
<nav className={styles.stepper} aria-label="Setup steps">
    {STEPS.map((s, i) => (
        <Fragment key={s.id}>
            {i > 0 && <span className={styles.stepConnector} aria-hidden />}
            <button
                type="button"
                className={`${styles.stepNode} ${
                    i === stepIndex
                        ? styles.stepCurrent
                        : statusFor(s.id)?.status === 'done'
                          ? styles.stepDone
                          : ''
                }`}
                onClick={() => goTo(s.id)}
            >
                <span className={styles.stepNum}>
                    {statusFor(s.id)?.status === 'done' && i !== stepIndex ? (
                        <Check2 size={12} aria-hidden />
                    ) : (
                        i + 1
                    )}
                </span>
                {s.label}
            </button>
        </Fragment>
    ))}
</nav>
```

(`import { Fragment } from 'react';`)

Main wrapper: `<main>` → `<main className={styles.main}>`.

Rail card →

```tsx
<aside className={styles.rail}>
    <div className={styles.railCard}>
        <span className={styles.railTitle}>Your board so far</span>
        {data.completeness.steps.map((s) => (
            <div key={s.step} className={styles.railRow}>
                {s.status === 'done' ? (
                    <Check2
                        size={12}
                        className={`${styles.railIcon} ${styles.railIconDone}`}
                        aria-label="done"
                    />
                ) : (
                    <Dot size={12} className={styles.railIcon} aria-hidden />
                )}
                <span>{s.summary}</span>
            </div>
        ))}
    </div>
</aside>
```

(Removes the `✓`/`·` glyphs.) Everything else (routing, CurrentStep, navBar buttons) unchanged.

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck` → exit 0.

```bash
git add "app/(new-layout)/games-v2/[game]/setup/setup.module.scss" "app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx"
git commit -m "feat(setup): wizard shell on board vocabulary — progress rail, surfaces, unified inputs"
```

---

### Task 7: Wizard steps sweep A — welcome, details form, categories

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-welcome.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-categories.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/game-details-form.tsx`

**Interfaces:**
- Consumes: `setup.module.scss` classes from Task 6 (`import styles from '../setup.module.scss';` from steps/, `'./setup.module.scss'` from setup/).

- [ ] **Step 1: `step-welcome.tsx`**

- `StatTile` → `<div className={styles.statTile}><span className={styles.statValue}>{value.toLocaleString()}</span><span className={styles.statLabel}>{label}</span></div>` (drop inline `minWidth` style — the class has it).
- No other markup changes (headings are covered by `.main` globals).

- [ ] **Step 2: `step-categories.tsx`**

Mapping (copy/logic unchanged):
- `className="alert alert-info py-2"` → `className={styles.infoNote}`
- both `className="alert alert-warning py-2 …"` → `className={styles.warnNote}` (keep any `mt-2` utility)
- `<table className="table align-middle">` → `<table className={styles.table}>`
- row `className={r.main ? '' : 'text-muted'}` stays; numeric cells keep `text-end`.
- No change to buttons/inputs (`.main` covers inputs; `btn` classes stay).

- [ ] **Step 3: `game-details-form.tsx`**

Only structural change: wrap the whole returned form content in a section surface if it isn't already inside one — do NOT wrap; instead leave as-is. This form is reused by the console's GameDetailsPane (already inside `.surface`) and by StepDetails. To avoid double-surfacing, `step-details.tsx` is also left as-is: the `.main` input overrides carry the unification. **No edits to `game-details-form.tsx` or `step-details.tsx` in this task** unless typecheck flags the imports — skip and note it.

- [ ] **Step 4: Verify + commit**

Run: `npm run typecheck` → exit 0. Grep: `grep -n "alert alert-" "app/(new-layout)/games-v2/[game]/setup/steps/step-categories.tsx"` → no matches.

```bash
git add "app/(new-layout)/games-v2/[game]/setup/steps"
git commit -m "feat(setup): welcome + categories steps on board vocabulary"
```

---

### Task 8: Wizard steps sweep B — category-config (+ live preview), defaults, finish

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-category-config.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/category-leaderboard-preview.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-defaults.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-finish.tsx`

**Interfaces:**
- Consumes: `setup.module.scss` (Task 6), `leaderboard.module.scss` (Task 3 — from setup/: `import lb from '../leaderboard/leaderboard.module.scss';`), console pill vocabulary is NOT imported — preview badges use `setup.module.scss` notes + `board-pill`-styled spans added below.

- [ ] **Step 1: Add preview pills to `setup.module.scss`**

Append:

```scss
.heldPill {
    @include board.board-pill(dt.$accent-red);
}

.pendingPill {
    @include board.board-pill;
}

.heldRow td {
    opacity: 0.55;
}
```

- [ ] **Step 2: `step-category-config.tsx` — mechanical mapping**

Add `import { Check2 } from 'react-bootstrap-icons';` and (if not present) `import styles from '../setup.module.scss';`. Apply everywhere in the file:

| Current | Replacement |
|---|---|
| `className="border rounded p-3 mb-3"` (section wrappers, lines ~283/406/548/847 and the variable editor ~585) | `className={styles.section}` |
| `{saved && '✓'}` in the `h3.h6` headings | `{saved && <Check2 size={14} aria-label="saved" />}` |
| `className="alert alert-danger py-2 mt-2 mb-0"` (all) | `className={`${styles.errorNote} mt-2 mb-0`}` |
| `className="card mb-2"` + inner `className="card-body"` (standards blocks ~850/888/929) | outer → `className={styles.section}` with the inner card-body div removed (unwrap children) — if unwrapping is invasive, keep the inner div but strip its class |
| `className="list-group mb-0"` (~671) | `className={`${styles.rows} mb-0`}` |
| `className="list-group-item d-flex align-items-center gap-2"` | `className={styles.rowItem}` |
| `className="badge bg-secondary"` | `className={styles.pendingPill}` |
| category selector pills (~156, `btn btn-sm btn-primary/btn-outline-secondary` ternary) | keep unchanged (deliberate — limits churn; they read fine as buttons) |

The sticky preview wrapper (`className="position-sticky" style={{ top: '1rem' }}`) stays.

- [ ] **Step 3: `category-leaderboard-preview.tsx` — real board-table**

```tsx
import lb from '../leaderboard/leaderboard.module.scss';
import styles from './setup.module.scss';
```

- Outer `<div className="border rounded p-3">` → `<div className={styles.section} style={{ marginBottom: 0 }}>`
- `<h3 className="h6 mb-1">` stays (`.main` styles it — the preview renders inside `<main className={styles.main}>`).
- Error block: `className="alert alert-warning py-2 …"` → `className={`${styles.warnNote} d-flex align-items-center justify-content-between gap-2 mb-0`}`; Retry button unchanged.
- Table: `<table className="table table-sm mb-0 align-middle">` → `<table className={lb.table}>`; wrap keeps `table-responsive` div → replace with `<div style={{ overflowX: 'auto' }}>` or keep the Bootstrap class (keep it — it's layout-only).
- Header cells: `<th scope="col">#</th>` → `<th scope="col" className={lb.rank}>#</th>`; others unchanged.
- Rows: `<tr … className={held ? 'text-muted' : undefined} style={held ? { opacity: 0.6 } : undefined}>` → `<tr key={…} className={held ? styles.heldRow : undefined}>`
- Rank cell: `<td>{entry.rank}</td>` → `<td className={`${lb.rank} ${entry.rank === 1 ? lb.rank1 : entry.rank === 2 ? lb.rank2 : entry.rank === 3 ? lb.rank3 : ''}`}>{entry.rank}</td>`
- Runner cell: add `className={lb.runner}`; badges: `badge text-bg-danger` → `styles.heldPill`; `badge text-bg-secondary` → `styles.pendingPill`.
- Time cells: add `className={lb.time}`.
- Video cell: `<span className="small">VOD</span>` → `<span className={lb.meta}>VOD</span>`; "no video" span → `className={lb.meta} + fst-italic` keep.
- Skeleton block unchanged.

- [ ] **Step 4: `step-defaults.tsx` — mechanical mapping**

| Current | Replacement |
|---|---|
| `className="border rounded p-3 mb-3"` (~210) | `className={styles.section}` |
| `className="alert alert-danger py-2 mt-2 mb-0"` (~407/431/437) | `className={`${styles.errorNote} mt-2 mb-0`}` |
| the per-row `border-bottom` utility in `row g-2 align-items-center border-bottom py-2` | keep as-is (layout-only) |

- [ ] **Step 5: `step-finish.tsx` — mechanical mapping + icons**

Add `import { Check2, Dot } from 'react-bootstrap-icons';`

| Current | Replacement |
|---|---|
| `className="list-group mb-2"` / `"list-group mb-3"` | `className={`${styles.rows} mb-2`}` / `…mb-3` |
| `className="list-group-item d-flex align-items-center gap-2"` | `className={styles.rowItem}` |
| `className="list-group-item text-muted"` | `className={`${styles.rowItem} text-muted`}` |
| `className="badge bg-secondary"` | `className={styles.pendingPill}` |
| status glyph span `{s.status === 'done' ? '✓' : '•'}` | `{s.status === 'done' ? <Check2 size={14} aria-hidden /> : <Dot size={14} aria-hidden />}` (keep the surrounding color-class ternary) |
| `className="alert alert-danger py-2"` | `className={styles.errorNote}` |
| `className="alert alert-warning py-2"` | `className={styles.warnNote}` |
| `className="alert alert-danger"` (error) | `className={styles.errorNote}` |

Done-state block: keep, but wrap in `<section className={`${styles.section} text-center py-5`}>`.

- [ ] **Step 6: Verify + commit**

Run: `npm run typecheck` → exit 0. Greps (expect no matches):

```bash
grep -rn "alert alert-" "app/(new-layout)/games-v2/[game]/setup" ; grep -rn "border rounded p-3" "app/(new-layout)/games-v2/[game]/setup" ; grep -rn "'✓'" "app/(new-layout)/games-v2/[game]/setup"
```

```bash
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "feat(setup): config/defaults/finish steps + live preview on board vocabulary"
```

---

### Task 9: Console panes — health, checklist, moderators, applications

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console.module.scss` (append classes)
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/board-health-card.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/setup-checklist-card.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/moderators-pane.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/attention/mod-applications-card.tsx`

**Interfaces:**
- Consumes: existing console classes (`.surface .paneHeader .paneTitle .item .sevLow .metaRow .actionRow .pill .pillNeutral .sevPillHigh .sevPillMedium .sevPillLow .eyebrow .time`) + new ones below.
- Produces: console.module.scss additions `.inlineCard .healthRow .healthIcon .modRow .modForm .noteInfo`.

- [ ] **Step 1: Append to `console.module.scss`**

```scss
// ---- Inline cards above the content pane -------------------
.inlineCard {
    @include board.board-surface(dt.$spacing-lg dt.$spacing-xl);
    display: flex;
    align-items: flex-start;
    gap: dt.$spacing-lg;
    flex-wrap: wrap;
    margin-bottom: dt.$spacing-lg;
}

.healthRow {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    font-size: dt.$font-size-sm;
    padding-block: 1px;

    a {
        color: inherit;
    }
}

.healthIconBlocker {
    color: dt.$accent-red;
}
.healthIconWarning {
    color: dt.$accent-amber;
}
.healthIconInfo {
    color: var(--bs-tertiary-color);
}

.modRow {
    @include board.board-surface(dt.$spacing-sm dt.$spacing-lg);
    border-radius: dt.$radius-md;
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
    font-size: dt.$font-size-sm;
    margin-bottom: dt.$spacing-xs;
}

.noteInfo {
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    border-left: 3px solid var(--bs-primary);
    border-radius: dt.$radius-md;
    background: var(--bs-body-bg);
    padding: dt.$spacing-sm dt.$spacing-lg;
    font-size: dt.$font-size-sm;
    margin-bottom: dt.$spacing-md;
}
```

- [ ] **Step 2: `board-health-card.tsx`**

```tsx
import { DashLg, ExclamationTriangleFill, XOctagonFill } from 'react-bootstrap-icons';
import styles from './console.module.scss';
```

- Outer `card mb-3` + `card-body …` → single `<div className={styles.inlineCard}>`.
- Grade badge → severity pills: healthy → `className={`${styles.pill} ${styles.sevPillLow}`}`, needs-attention → `…sevPillMedium`, at-risk → `…sevPillHigh` (replace `GRADE_CLASS` values accordingly; keep `GRADE_LABEL` and the `Board health: ` text).
- List: `<ul className="list-unstyled mb-0 small">` → `<div>`; each `<li>` → `<div className={styles.healthRow}>`; glyphs → `{item.severity === 'blocker' ? <XOctagonFill size={12} className={styles.healthIconBlocker} aria-hidden /> : item.severity === 'warning' ? <ExclamationTriangleFill size={12} className={styles.healthIconWarning} aria-hidden /> : <DashLg size={12} className={styles.healthIconInfo} aria-hidden />}` then the existing link/label.

- [ ] **Step 3: `setup-checklist-card.tsx`**

`import styles from './console.module.scss';`
- Outer → `<div className={styles.inlineCard}>` (drop `border-primary`).
- `<strong>Finish setup — …</strong>` stays; add `<span className={styles.eyebrow} style={{ display: 'block' }}>Setup</span>` above it inside the text div.
- The `…summary.join(' · ')` muted line stays. CTA link/button unchanged.

- [ ] **Step 4: `moderators-pane.tsx`**

`import styles from './console.module.scss';`
- `<section>` → `<section className={styles.surface}>`; `<h2 className="h5">Moderators</h2>` → `<div className={styles.paneHeader}><h2 className={styles.paneTitle}>Moderators</h2><span className={styles.paneCount}>{mods.length}</span></div>`.
- `alert alert-info py-2` → `className={styles.noteInfo}`.
- `<ul className="list-group mb-3">` → `<div className="mb-3">`; each `<li className="list-group-item …">` → `<div className={styles.modRow}>` (close tags accordingly; empty-state li → `<div className={`${styles.modRow} text-muted`}>`).
- `badge bg-secondary` → `className={`${styles.pill} ${styles.pillNeutral}`}`.
- Add-mod form row: wrap unchanged inputs in `<div className="d-flex gap-2">` (already) — no change; inputs inherit `.content` overrides only when inside the console content area (they are — ContentRouter renders this pane inside `.content`).

- [ ] **Step 5: `mod-applications-card.tsx`**

`import styles from '../../console/console.module.scss';`
- Outer `card mb-3 border-info` → `<div className={`${styles.surface} mb-3`}>`; `card-header` div → `<div className={styles.paneHeader}><h2 className={styles.paneTitle}>Moderator applications</h2><span className={styles.paneCount}>{remaining.length} pending</span></div>`; `card-body` div → plain `<div>`.
- `ApplicationRow` outer `border rounded p-2 mb-2` → `className={`${styles.item} ${styles.sevLow} mb-2`}`; first inner div → `className={styles.itemTop}`; signals span → `<span className={styles.metaRow}>` (keep text); motivation `<p>` unchanged; action div → `className={styles.actionRow}`; Approve `btn btn-sm btn-success` → `btn btn-sm btn-primary`; Deny unchanged.

- [ ] **Step 6: Verify + commit**

Run: `npm run typecheck` → exit 0. Grep: `grep -rn '"card' "app/(new-layout)/games-v2/[game]/manage/console" "app/(new-layout)/games-v2/[game]/manage/moderation/attention/mod-applications-card.tsx"` → no `card mb-3` matches remain in the four touched files.

```bash
git add "app/(new-layout)/games-v2/[game]/manage"
git commit -m "feat(console): tier-1 panes speak the console language — pills, surfaces, spine items"
```

---

### Task 10: Claim CTA + admin board-claims queue

**Files:**
- Create: `app/(new-layout)/admin/board-claims/board-claims.module.scss`
- Modify: `app/(new-layout)/admin/board-claims/board-claims-client.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/claim/claim-cta.tsx`

**Interfaces:**
- Consumes: `_board.scss` (from `admin/board-claims/`: `@use '../../styles/board' as board;`).
- Produces: `board-claims.module.scss` classes `.page .gameCard .gameHead .gameTitle .gameMeta .rivalPill .item .itemTop .meta .stalePill .actionRow .empty`.

- [ ] **Step 1: Create `board-claims.module.scss`**

```scss
@use '../../styles/design-tokens' as dt;
@use '../../styles/board' as board;

.page {
    max-width: 56rem;
    margin: 0 auto;
    padding: dt.$spacing-2xl dt.$spacing-lg dt.$spacing-3xl;
}

.title {
    font-size: dt.$font-size-xl;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin-bottom: dt.$spacing-xs;
}

.gameCard {
    @include board.board-surface(dt.$spacing-lg dt.$spacing-xl);
    margin-bottom: dt.$spacing-lg;
}

.gameHead {
    display: flex;
    align-items: baseline;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
    margin-bottom: dt.$spacing-md;

    a {
        color: var(--bs-emphasis-color);
        text-decoration: none;

        &:hover {
            color: var(--bs-primary);
        }
    }
}

.gameMeta {
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
}

.rivalPill {
    @include board.board-pill(dt.$accent-amber);
    margin-left: auto;
}

.item {
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    border-left: 3px solid var(--bs-secondary);
    border-radius: dt.$radius-md;
    background: var(--bs-body-bg);
    padding: dt.$spacing-md dt.$spacing-lg;
    margin-bottom: dt.$spacing-sm;
}

.itemTop {
    display: flex;
    align-items: baseline;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
}

.meta {
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
}

.stalePill {
    @include board.board-pill(dt.$accent-amber);
}

.actionRow {
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
}

.empty {
    @include board.board-surface;
    text-align: center;
    color: var(--bs-secondary-color);
}
```

- [ ] **Step 2: `board-claims-client.tsx` mapping**

`import styles from './board-claims.module.scss';`
- Both `container py-4` divs → `styles.page`; `<h1>` → `<h1 className={styles.title}>`.
- Empty state `<p className="text-muted">No pending applications.</p>` → `<div className={styles.empty}>No pending applications.</div>`.
- Game group `card mb-3` → `styles.gameCard`; `card-header d-flex …` → `styles.gameHead`; board stats span → `styles.gameMeta`; `badge bg-info ms-auto` → `styles.rivalPill`; `card-body` div → plain `<div>`.
- `ClaimRow` outer `border rounded p-3 mb-2` → `styles.item`; first inner div → `styles.itemTop`; signals span → `styles.meta`; `badge bg-warning text-dark` → `styles.stalePill`; action div → `styles.actionRow`; Approve `btn btn-sm btn-success` → `btn btn-sm btn-primary`.
- Logic (decide, prompt, stale calc) untouched.

- [ ] **Step 3: `claim-cta.tsx` light pass**

- Pending state span `btn btn-sm btn-outline-secondary disabled` → keep element, className → `btn btn-sm btn-outline-secondary disabled` is fine but reads as fake button; replace with `<span className="text-muted small align-self-center">Application pending</span>`.
- Trigger button `btn btn-sm btn-outline-primary` → `btn btn-sm btn-outline-secondary` (quiet — Submit a run stays the only primary in the header group).
- Modal: keep the custom overlay div; inside, error `alert alert-danger mt-2 mb-0 py-2` → `<div className="text-danger small mt-2 mb-0">{error}</div>`. Everything else unchanged.

- [ ] **Step 4: Verify + commit**

Run: `npm run typecheck` → exit 0.

```bash
git add "app/(new-layout)/admin/board-claims" "app/(new-layout)/games-v2/[game]/claim/claim-cta.tsx"
git commit -m "feat(claims): claim CTA quieted, admin queue on board item pattern"
```

---

### Task 11: Final verification sweep

**Files:** none new — fixes only if checks fail.

- [ ] **Step 1: Full checks**

```bash
npm run typecheck   # exit 0
npm run lint        # no new errors in touched files
rm -rf .next && npm run build   # completes
```

- [ ] **Step 2: Grep sweep (expect zero matches in the four surfaces)**

```bash
grep -rn "table table-hover\|alert alert-" "app/(new-layout)/games-v2/[game]/leaderboard" "app/(new-layout)/games-v2/[game]/setup" "app/(new-layout)/games-v2/[game]/sidebar"
grep -rn "'✓'\|'✕'\|'▾'\|'▸'" "app/(new-layout)/games-v2/[game]"
```

- [ ] **Step 3: Update docs + push**

Mark the spec `Status: implemented` in `docs/superpowers/specs/2026-07-15-board-visual-unification-design.md`. Then:

```bash
git add -A && git commit -m "docs: mark board visual unification spec implemented"
git push origin tier1-console-completion
```

(Do NOT open a PR — Joey opens PRs himself.)

- [ ] **Step 4: Hand off for browser pass**

Report to Joey: dark+light visual pass needed on `/games-v2/[game]`, `/games-v2/[game]/setup`, `/games-v2/[game]/manage`, `/admin/board-claims` (sandbox can't run `next dev`).
