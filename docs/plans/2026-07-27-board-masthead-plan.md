# Board Masthead + Category Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the board page's bare hero + bland sticky pill band with a single contained masthead plate — condensed game line, the category as the headline with the board's record beside it, and a category rail of recessed group wells with engraved endcaps — plus a slim glass bar that sticks in the plate's place.

**Architecture:** Build bottom-up so every task ships a working page. Pure logic modules first (TDD), then the shared rail vocabulary as `_board.scss` mixins consumed by both the real rail and the setup wizard's preview, then the rail and subcategory tier as drop-in replacements inside today's `.band`, then the plate that absorbs them, then the sticky bar. Presentational tasks verify with `typecheck` + `lint` + a named browser check, because this repo has no component-test harness — only colocated `*.test.ts` for pure functions.

**Tech Stack:** Next.js 16 App Router, React 19 (React Compiler on — do not hand-memoise), TypeScript, SCSS modules, Vitest, Biome.

Spec: `docs/plans/2026-07-27-board-masthead-design.md`. Read it before Task 1.

## Global Constraints

- **Tokens, not magic numbers.** Every dimension, colour, radius, shadow and duration comes from `app/(new-layout)/styles/_design-tokens.scss` (`dt.$spacing-*`, `dt.$radius-*`, `dt.$font-size-*`, `dt.$transition-*`, `dt.$font-mono`, `dt.$accent-gold`).
- **Shared vocabulary lives in `_board.scss`.** Anything two surfaces use is a mixin there, not a copied block or a cross-module class import.
- **One green:** affirmative/active states use `var(--bs-primary)`. **One red:** `dt.$accent-red`, never Bootstrap's `$danger`.
- **Icons:** `react-bootstrap-icons` only, `aria-hidden` when decorative. No emoji.
- **Times:** `board.mono-time` (mono, tabular). All numerals in the rail use `font-variant-numeric: tabular-nums`.
- **Motion:** `dt.$transition-fast`, deceleration easing, no bounce. Anything animated must be disabled under `@media (prefers-reduced-motion: reduce)`.
- **Unused variables must be prefixed `_`** (Biome/ESLint rule).
- **Test scope:** repo convention (root `CLAUDE.md`) is that the user runs the suite. Each task runs only the single colocated test file it authors, via `npm run test -- <path>`. Do not run the full suite.
- **Verification gates are differential, not absolute.** `npm run typecheck` and `npm run lint` are already dirty at this branch's base — 357 type errors and 1 lint error + 42 warnings, none of them in `games-v2` (they live in old files like `src/components/user/userform.tsx` and `app/(new-layout)/data/results-table.tsx`). A baseline is captured at `.superpowers/sdd/2026-07-27-board-masthead-plan/typecheck-baseline.txt`. **Never try to make the whole repo clean, and never touch a file outside your task to silence a diagnostic.** A task passes its gate when it adds no new diagnostics of its own:
  - Types: `npm run typecheck 2>&1 | grep -E "games-v2|styles/_board"` — expected empty.
  - Lint: `npx @biomejs/biome check <the files you touched>` — expected clean.
  - The single pre-existing `src/lib/game-metadata.ts` error (`EMPTY_GAME_METADATA` missing `summaryOverride`, `igdbUrl`) is in the baseline. It is not yours; leave it.
- **Commit per task.** Do not add yourself as a co-author. Do not push, do not open a PR.
- **Branch:** work on the current branch (`game-standings`). Do not create a worktree.

---

### Task 1: Resolve the board's record entry

The header's record line needs rank 1 of the board *as filtered*. Page 1 already holds it; a deep-linked later page does not. This restores the block deleted in `e1e58060`, behind a testable helper.

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/header/wr-entry.ts`
- Create: `app/(new-layout)/games-v2/[game]/header/wr-entry.test.ts`
- Modify: `app/(new-layout)/games-v2/[game]/types.ts`
- Modify: `app/(new-layout)/games-v2/[game]/data.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveWrEntry(leaderboard: LeaderboardResponse, fetchFirstPage: () => Promise<LeaderboardEntry[] | null>): Promise<LeaderboardEntry | null>` and `GamePageData.wrEntry: LeaderboardEntry | null`.

- [ ] **Step 1: Write the failing test**

Create `app/(new-layout)/games-v2/[game]/header/wr-entry.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';
import { resolveWrEntry } from './wr-entry';

function entry(overrides: Partial<LeaderboardEntry> & { rank: number }): LeaderboardEntry {
    return {
        runnerName: `runner-${overrides.rank}`,
        isGuest: false,
        time: 1000 * overrides.rank,
        realTime: 1000 * overrides.rank,
        gameTime: null,
        runDate: null,
        verificationStatus: 'verified',
        ...overrides,
    };
}

function board(overrides: Partial<LeaderboardResponse>): LeaderboardResponse {
    return {
        entries: [],
        page: 1,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0,
        hideRealTime: false,
        hideGameTime: false,
        ...overrides,
    };
}

describe('resolveWrEntry', () => {
    it('takes rank 1 straight off page 1 without a second read', async () => {
        const fetchFirstPage = vi.fn();
        const result = await resolveWrEntry(
            board({ page: 1, totalItems: 3, entries: [entry({ rank: 1 }), entry({ rank: 2 })] }),
            fetchFirstPage,
        );
        expect(result?.rank).toBe(1);
        expect(fetchFirstPage).not.toHaveBeenCalled();
    });

    it('returns null for an empty board and never reads page 1', async () => {
        const fetchFirstPage = vi.fn();
        const result = await resolveWrEntry(board({ page: 1, totalItems: 0 }), fetchFirstPage);
        expect(result).toBeNull();
        expect(fetchFirstPage).not.toHaveBeenCalled();
    });

    it('reads page 1 when the visitor deep-linked a later page', async () => {
        const fetchFirstPage = vi.fn().mockResolvedValue([entry({ rank: 1 })]);
        const result = await resolveWrEntry(
            board({ page: 4, totalItems: 90, entries: [entry({ rank: 76 })] }),
            fetchFirstPage,
        );
        expect(result?.rank).toBe(1);
        expect(fetchFirstPage).toHaveBeenCalledTimes(1);
    });

    it('degrades to null when the page-1 read fails', async () => {
        const result = await resolveWrEntry(
            board({ page: 4, totalItems: 90, entries: [entry({ rank: 76 })] }),
            async () => null,
        );
        expect(result).toBeNull();
    });

    it('degrades to null when page 1 comes back empty', async () => {
        const result = await resolveWrEntry(
            board({ page: 3, totalItems: 90, entries: [entry({ rank: 51 })] }),
            async () => [],
        );
        expect(result).toBeNull();
    });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm run test -- "app/(new-layout)/games-v2/[game]/header/wr-entry.test.ts"`
Expected: FAIL — cannot resolve `./wr-entry`.

- [ ] **Step 3: Write the implementation**

Create `app/(new-layout)/games-v2/[game]/header/wr-entry.ts`:

```ts
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';

/**
 * The record for the board being displayed — filters included, so it always
 * agrees with the run count beside it in the masthead.
 *
 * Page 1 already carries rank 1. A deep-linked later page doesn't, and costs
 * one page-1 read; callers must route that through the cached `getLeaderboard`
 * so it is never a fresh hit and never a client waterfall. An empty board or a
 * failed read resolves to null and the masthead simply omits the record.
 */
export async function resolveWrEntry(
    leaderboard: LeaderboardResponse,
    fetchFirstPage: () => Promise<LeaderboardEntry[] | null>,
): Promise<LeaderboardEntry | null> {
    if (leaderboard.totalItems === 0) return null;
    if (leaderboard.page === 1) return leaderboard.entries[0] ?? null;
    const entries = await fetchFirstPage();
    return entries?.[0] ?? null;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run test -- "app/(new-layout)/games-v2/[game]/header/wr-entry.test.ts"`
Expected: PASS, 5 tests.

- [ ] **Step 5: Add `wrEntry` to the page data type**

In `app/(new-layout)/games-v2/[game]/types.ts`, add to the `GamePageData` interface, directly after `leaderboard`:

```ts
    /**
     * Rank 1 of the board being shown, filters included — the masthead's
     * record line. Null when the board is empty or the read failed.
     */
    wrEntry: LeaderboardEntry | null;
```

`LeaderboardEntry` is already imported in that file's type import block — add it there if it is not.

- [ ] **Step 6: Populate it in the data layer**

In `app/(new-layout)/games-v2/[game]/data.ts`:

1. Add `resolveWrEntry` to the imports: `import { resolveWrEntry } from './header/wr-entry';`
2. In the early-return branch for games with no selectable category (the object that already sets `leaderboard: emptyBoard()`), add `wrEntry: null,`.
3. Immediately before the final `return {` of `loadGamePageData`, add:

```ts
    // Filters included, so the masthead's record always matches its run
    // count. Later pages route their page-1 read through the same cached
    // getLeaderboard a normal page-1 load would take.
    const wrEntry = boardResult.ok
        ? await resolveWrEntry(leaderboard, async () => {
              const first = await getLeaderboard({
                  ...baseQuery,
                  page: 1,
                  timing: selected.primaryTiming,
              });
              return first.ok ? first.result.entries : null;
          })
        : null;
```

4. Add `wrEntry,` to the returned object, after `leaderboard,`.

If `baseQuery` is not the identifier used for the shared query object in the current file, use whatever local the existing `getLeaderboard` call spreads — read the surrounding function before editing.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no *new* diagnostics from your files — apply the differential gate in Global Constraints, do not chase the pre-existing repo-wide errors.

- [ ] **Step 8: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/header/wr-entry.ts" \
        "app/(new-layout)/games-v2/[game]/header/wr-entry.test.ts" \
        "app/(new-layout)/games-v2/[game]/types.ts" \
        "app/(new-layout)/games-v2/[game]/data.ts"
git commit -m "feat(games-v2): resolve the board's record entry for the masthead"
```

---

### Task 2: Board identity helpers

Two pure rules the masthead and rail need: what the board's full name is once subcategory defaults are applied, and whether a group's chips show emblems.

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/header/board-identity.ts`
- Create: `app/(new-layout)/games-v2/[game]/header/board-identity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `effectiveSubcategoryLabel(defs: VariableDef[], selected: Record<string, string>): string` and `groupShowsEmblems(pills: ResolvedCategory[]): boolean`.

- [ ] **Step 1: Write the failing test**

Create `app/(new-layout)/games-v2/[game]/header/board-identity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    VariableDef,
} from '../../../../../types/leaderboards.types';
import { effectiveSubcategoryLabel, groupShowsEmblems } from './board-identity';

function def(overrides: Partial<VariableDef> & { nameNormalized: string }): VariableDef {
    return {
        id: 1,
        gameId: 1,
        categoryId: null,
        name: overrides.nameNormalized,
        role: 'subcategory',
        values: [['A'], ['B']],
        defaultValueIndex: null,
        sortOrder: 0,
        description: null,
        version: 1,
        published: true,
        scope: 'game',
        ...overrides,
    };
}

function cat(overrides: Partial<ResolvedCategory> & { id: number }): ResolvedCategory {
    return {
        name: `cat-${overrides.id}`,
        display: `Cat ${overrides.id}`,
        primaryTiming: 'rt',
        archived: false,
        sortOrder: 0,
        ...overrides,
    };
}

describe('effectiveSubcategoryLabel', () => {
    it('uses the selected value', () => {
        const defs = [def({ nameNormalized: 'character', values: [['Mario'], ['Luigi']] })];
        expect(effectiveSubcategoryLabel(defs, { character: 'Luigi' })).toBe('Luigi');
    });

    it('falls back to the default when nothing is selected', () => {
        const defs = [
            def({ nameNormalized: 'character', values: [['Mario'], ['Luigi']], defaultValueIndex: 0 }),
        ];
        expect(effectiveSubcategoryLabel(defs, {})).toBe('Mario');
    });

    it('omits a variable with no selection and no default', () => {
        const defs = [
            def({ nameNormalized: 'character', values: [['Mario']], defaultValueIndex: 0 }),
            def({ nameNormalized: 'ruleset', values: [['NMS']], defaultValueIndex: null, sortOrder: 1 }),
        ];
        expect(effectiveSubcategoryLabel(defs, {})).toBe('Mario');
    });

    it('joins several variables in sortOrder with a middle dot', () => {
        const defs = [
            def({ nameNormalized: 'ruleset', values: [['NMS']], defaultValueIndex: 0, sortOrder: 2 }),
            def({ nameNormalized: 'character', values: [['Mario']], defaultValueIndex: 0, sortOrder: 1 }),
        ];
        expect(effectiveSubcategoryLabel(defs, {})).toBe('Mario · NMS');
    });

    it('ignores filter-role variables', () => {
        const defs = [
            def({ nameNormalized: 'character', values: [['Mario']], defaultValueIndex: 0 }),
            def({ nameNormalized: 'platform', role: 'filter', values: [['N64']], defaultValueIndex: 0, sortOrder: 1 }),
        ];
        expect(effectiveSubcategoryLabel(defs, {})).toBe('Mario');
    });

    it('returns an empty string when there are no subcategory variables', () => {
        expect(effectiveSubcategoryLabel([], {})).toBe('');
    });
});

describe('groupShowsEmblems', () => {
    it('is true only when every category in the group has art', () => {
        expect(
            groupShowsEmblems([
                cat({ id: 1, imageUrl: 'https://x/1.png' }),
                cat({ id: 2, imageUrl: 'https://x/2.png' }),
            ]),
        ).toBe(true);
    });

    it('is false when one category is missing art, so the row stays uniform', () => {
        expect(
            groupShowsEmblems([cat({ id: 1, imageUrl: 'https://x/1.png' }), cat({ id: 2 })]),
        ).toBe(false);
    });

    it('treats null art as missing', () => {
        expect(groupShowsEmblems([cat({ id: 1, imageUrl: null })])).toBe(false);
    });

    it('is false for an empty group', () => {
        expect(groupShowsEmblems([])).toBe(false);
    });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm run test -- "app/(new-layout)/games-v2/[game]/header/board-identity.test.ts"`
Expected: FAIL — cannot resolve `./board-identity`.

- [ ] **Step 3: Write the implementation**

Create `app/(new-layout)/games-v2/[game]/header/board-identity.ts`:

```ts
import type {
    ResolvedCategory,
    VariableDef,
} from '../../../../../types/leaderboards.types';

/**
 * The subcategory half of the board's name — "Mario · No Major Skips".
 *
 * Reads the *effective* board, not the URL: a variable with no explicit
 * selection still narrows the board to its default value, so the masthead has
 * to name that value too or the headline disagrees with the record beside it.
 */
export function effectiveSubcategoryLabel(
    defs: VariableDef[],
    selected: Record<string, string>,
): string {
    return defs
        .filter((d) => d.role === 'subcategory')
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((d) => {
            const fallback =
                d.defaultValueIndex != null
                    ? (d.values[d.defaultValueIndex]?.[0] ?? '')
                    : '';
            return selected[d.nameNormalized] ?? fallback;
        })
        .filter(Boolean)
        .join(' · ');
}

/**
 * Whether a group's chips carry their category emblems.
 *
 * All-or-nothing per group: `CategoryEmblem` renders nothing when art is
 * absent (Joey's call, 2026-07-22), so deciding per chip would leave one well
 * holding a ragged mix of chips with and without art. Deciding per group keeps
 * every row internally uniform and still rewards a complete set.
 */
export function groupShowsEmblems(pills: ResolvedCategory[]): boolean {
    return pills.length > 0 && pills.every((c) => !!c.imageUrl);
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run test -- "app/(new-layout)/games-v2/[game]/header/board-identity.test.ts"`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/header/board-identity.ts" \
        "app/(new-layout)/games-v2/[game]/header/board-identity.test.ts"
git commit -m "feat(games-v2): board-name and emblem-uniformity helpers"
```

---

### Task 3: Rail vocabulary + the category rail

> **Amendment (2026-07-27, after review).** The `_board.scss` code below hardcodes recess colours as raw `rgba(0,0,0,X)` / `rgba(255,255,255,X)`, which contradicts this plan's own "Tokens, not magic numbers" constraint and renders as dark smudges in light mode (`ThemeProvider` has no `forcedTheme`, so `system` can select light). Ruled by Joey: route them through theme variables — well `color-mix(in srgb, var(--bs-body-bg) 92%, var(--bs-body-color) 8%)`, endcap the same at 86%/14%, borders `rgba(var(--bs-border-color-rgb), .55)`, inner shadow `rgba(var(--bs-body-color-rgb), .10)`, and the engraved label `text-shadow: 0 1px 0 rgba(var(--bs-body-bg-rgb), .7)` so it inverts with the theme. The solid-green active chip keeps its white inner highlight and dark drop shadow — those sit on a saturated fill and read correctly in both themes.

Adds the shared mixins and swaps `CategoryPills` for `CategoryRail` **inside today's `.band`**, so the page keeps working and the improvement is visible on its own.

**Files:**
- Modify: `app/(new-layout)/styles/_board.scss` (append a new section)
- Create: `app/(new-layout)/games-v2/[game]/header/masthead.module.scss`
- Create: `app/(new-layout)/games-v2/[game]/header/category-rail.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/header/category-pills.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx:129-134`

**Interfaces:**
- Consumes: `groupShowsEmblems` (Task 2); `computeCategoryVisibility` from `./category-visibility`; `useBoardNav` from `../filters/use-board-nav`.
- Produces: mixins `board-rail-block`, `board-rail-endcap`, `board-rail-well`, `board-rail-chips`, `board-chip`, `board-chip-active`, `board-chip-count`, `board-chip-ghost`; component `<CategoryRail categories groups selectedCategoryName variableKeys />`.

- [ ] **Step 1: Add the rail vocabulary to `_board.scss`**

Append to `app/(new-layout)/styles/_board.scss`:

```scss
// ---- Category rail (board masthead) --------------------------------
// A group of boards is one recessed well with its name engraved into a
// darker endcap welded to its left edge, so membership is structural
// rather than implied by proximity.
//
// INVARIANT: the endcap never sets the row height. The chips set it and
// the cap centres itself in whatever they need. Both directions matter —
// a tall cap must not strand dead space under a single chip row, and a
// well wrapped to three rows must not strand the cap's label at the top.
@mixin board-rail-block {
    display: flex;
    align-items: stretch;

    // Narrow screens can't spare a 9rem gutter: the cap becomes a full
    // width label above its well.
    @media (max-width: 767.98px) {
        flex-direction: column;
    }
}

@mixin board-rail-endcap($width: 9.25rem) {
    display: flex;
    align-items: center;
    width: $width;
    flex-shrink: 0;
    padding: dt.$spacing-sm dt.$spacing-md;
    border: 1px solid rgba(0, 0, 0, 0.4);
    border-right: 0;
    border-radius: dt.$radius-lg 0 0 dt.$radius-lg;
    background: rgba(0, 0, 0, 0.28);
    box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.035);
    font-size: dt.$font-size-2xs;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    line-height: 1.25;
    color: var(--bs-secondary-color);
    // Engraved into the recess rather than printed on it.
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.7);

    @media (max-width: 767.98px) {
        width: 100%;
        border-right: 1px solid rgba(0, 0, 0, 0.4);
        border-bottom: 0;
        border-radius: dt.$radius-lg dt.$radius-lg 0 0;
        box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.035);
    }
}

@mixin board-rail-well {
    flex: 1;
    min-width: 0;
    border: 1px solid rgba(0, 0, 0, 0.4);
    border-left: 0;
    border-radius: 0 dt.$radius-lg dt.$radius-lg 0;
    background: rgba(0, 0, 0, 0.22);
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.35);

    @media (max-width: 767.98px) {
        border-left: 1px solid rgba(0, 0, 0, 0.4);
        border-radius: 0 0 dt.$radius-lg dt.$radius-lg;
    }
}

// An ungrouped section has no endcap, so its well is round on both ends.
@mixin board-rail-well-solo {
    border-left: 1px solid rgba(0, 0, 0, 0.4);
    border-radius: dt.$radius-lg;
}

// Rows centre inside the well — this is the half of the invariant that
// stops space pooling beneath the chips when the cap is the taller side.
@mixin board-rail-chips {
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    gap: dt.$spacing-xs;
    padding: dt.$spacing-xs;
    height: 100%;
}

@mixin board-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid transparent;
    background: transparent;
    color: var(--bs-secondary-color);
    font-size: dt.$font-size-sm;
    font-weight: 500;
    padding: dt.$spacing-xs dt.$spacing-md;
    border-radius: dt.$radius-md;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color dt.$transition-fast,
        color dt.$transition-fast;

    &:hover {
        background: rgba(var(--bs-body-color-rgb), 0.05);
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

    @media (pointer: coarse) {
        padding-block: dt.$spacing-sm;
    }
}

// The board you are on: a solid key, not a tint. This is the single
// biggest departure from the old 10%-opacity pill and the reason the
// band read as undifferentiated.
@mixin board-chip-active {
    background: var(--bs-primary);
    border-color: color-mix(in srgb, var(--bs-primary) 70%, white);
    color: #fff;
    font-weight: 600;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15),
        0 2px 6px rgba(0, 0, 0, 0.35);

    &:hover {
        background: var(--bs-primary);
        color: #fff;
    }

    // The standard green ring disappears against a green fill.
    &:focus-visible {
        outline-color: var(--bs-emphasis-color);
    }
}

// Collapsed-group chip: present but not yet expanded.
@mixin board-chip-ghost {
    border-style: dashed;
    border-color: rgba(var(--bs-border-color-rgb), 0.45);
    font-size: dt.$font-size-2xs;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.09em;
}

@mixin board-chip-count {
    font-family: dt.$font-mono;
    font-variant-numeric: tabular-nums;
    font-size: dt.$font-size-2xs;
    opacity: 0.5;
}
```

- [ ] **Step 2: Create the masthead stylesheet**

Create `app/(new-layout)/games-v2/[game]/header/masthead.module.scss`:

```scss
@use '../../../styles/design-tokens' as dt;
@use '../../../styles/board' as board;

.rail {
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-sm;
}

.block {
    @include board.board-rail-block;
}

.endcap {
    @include board.board-rail-endcap;
}

.well {
    @include board.board-rail-well;
}

.wellSolo {
    @include board.board-rail-well-solo;
}

.chips {
    @include board.board-rail-chips;
}

.chip {
    @include board.board-chip;
}

.chipActive {
    @include board.board-chip-active;
}

.chipGhost {
    @include board.board-chip-ghost;
}

.chipCount {
    @include board.board-chip-count;
}

.chipEmblem {
    width: 17px;
    height: 17px;
    border-radius: dt.$radius-sm;
    object-fit: cover;
    flex-shrink: 0;
}

.emptyGroup {
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
    padding: dt.$spacing-xs dt.$spacing-sm;
}
```

- [ ] **Step 3: Write the rail component**

Create `app/(new-layout)/games-v2/[game]/header/category-rail.tsx`:

```tsx
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CaretRightFill } from 'react-bootstrap-icons';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { useBoardNav } from '../filters/use-board-nav';
import { groupShowsEmblems } from './board-identity';
import { computeCategoryVisibility } from './category-visibility';
import styles from './masthead.module.scss';

const PENDING_PREFIX = 'category:';

interface Props {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    selectedCategoryName: string;
    variableKeys: string[];
}

export function CategoryRail({
    categories,
    groups,
    selectedCategoryName,
    variableKeys,
}: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    // Which collapsed groups the reader opened this visit. Not persisted:
    // "hidden by default" is the moderator's call about the default state,
    // so every visit starts from it again.
    const [opened, setOpened] = useState<Set<number>>(new Set());

    const { sections } = useMemo(
        () => computeCategoryVisibility(categories, groups),
        [categories, groups],
    );

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('category', name);
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        navigate(`${pathname}?${sp.toString()}`, `${PENDING_PREFIX}${name}`);
    };

    // Optimistic selection: while a category nav is in flight the clicked
    // chip reads active immediately rather than waiting for the RSC payload.
    const optimisticSelectedName =
        isPending && pendingKey?.startsWith(PENDING_PREFIX)
            ? pendingKey.slice(PENDING_PREFIX.length)
            : selectedCategoryName;

    const toggle = (id: number) =>
        setOpened((prev) => {
            const next = new Set(prev);
            if (!next.delete(id)) next.add(id);
            return next;
        });

    if (sections.length === 0) return null;
    if (sections.length === 1 && sections[0].pills.length <= 1) return null;

    // A collapsed group holding the board you're looking at expands
    // regardless — otherwise the active chip is invisible.
    const isOpen = (section: (typeof sections)[number]) =>
        !section.collapsedByDefault ||
        section.id === null ||
        section.pills.some((c) => c.name === optimisticSelectedName) ||
        opened.has(section.id);

    const open = sections.filter(isOpen);
    const collapsed = sections.filter((s) => !isOpen(s));

    return (
        <nav
            aria-label="Category"
            aria-busy={isPending || undefined}
            className={styles.rail}
        >
            {open.map((section, idx) => {
                const capId = `rail-group-${section.id ?? `ungrouped-${idx}`}`;
                const withEmblems = groupShowsEmblems(section.pills);
                return (
                    <div
                        key={capId}
                        className={styles.block}
                        role={section.name ? 'group' : undefined}
                        aria-labelledby={section.name ? capId : undefined}
                    >
                        {section.name && (
                            <span className={styles.endcap} id={capId}>
                                {section.name}
                            </span>
                        )}
                        <div
                            className={`${styles.well} ${section.name ? '' : styles.wellSolo}`}
                        >
                            <div className={styles.chips}>
                                {section.pills.length === 0 ? (
                                    <span className={styles.emptyGroup}>
                                        No categories enabled for this group.
                                    </span>
                                ) : (
                                    section.pills.map((c) => {
                                        const active =
                                            c.name === optimisticSelectedName;
                                        const runners = c.uniqueRunners ?? null;
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => onSelect(c.name)}
                                                aria-pressed={active}
                                                aria-label={
                                                    runners == null
                                                        ? undefined
                                                        : `${c.display}, ${runners} runners`
                                                }
                                                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                                            >
                                                {withEmblems && c.imageUrl && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={c.imageUrl}
                                                        alt=""
                                                        aria-hidden
                                                        width={17}
                                                        height={17}
                                                        loading="lazy"
                                                        className={
                                                            styles.chipEmblem
                                                        }
                                                    />
                                                )}
                                                {c.display}
                                                {runners != null && (
                                                    <span
                                                        aria-hidden
                                                        className={
                                                            styles.chipCount
                                                        }
                                                    >
                                                        {runners.toLocaleString()}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Every still-collapsed group shares one trailing well — a
                collapsed group must not own a whole block row for one chip. */}
            {collapsed.length > 0 && (
                <div className={styles.block}>
                    <div className={`${styles.well} ${styles.wellSolo}`}>
                        <div className={styles.chips}>
                            {collapsed.map((section) => (
                                <button
                                    key={`collapsed-${section.id}`}
                                    type="button"
                                    aria-expanded={false}
                                    onClick={() => toggle(section.id as number)}
                                    className={`${styles.chip} ${styles.chipGhost}`}
                                >
                                    <CaretRightFill size={9} aria-hidden />
                                    {section.name}
                                    <span aria-hidden className={styles.chipCount}>
                                        {section.pills.length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
```

- [ ] **Step 4: Swap it into the page**

In `app/(new-layout)/games-v2/[game]/game-page.tsx`:

1. Replace the import `import { CategoryPills } from './header/category-pills';` with `import { CategoryRail } from './header/category-rail';`
2. Replace the `<CategoryPills ... />` element with `<CategoryRail ... />` — the props are identical.
3. Delete `app/(new-layout)/games-v2/[game]/header/category-pills.tsx`.

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no *new* diagnostics from your files — apply the differential gate in Global Constraints, do not chase the pre-existing repo-wide errors. If Biome reformats `masthead.module.scss` or the new component, accept its formatting.

- [ ] **Step 6: Browser check**

Start the dev server, and **kill it before finishing the task** (see root `CLAUDE.md` — two `next dev` processes on one `.next` corrupt Turbopack output). Check nothing is already serving first: `ps -eo pid,args | grep "next dev" | grep -v grep`.

Verify on a board page:
- Ungrouped game: one well, no endcap, rounded both ends; active chip is a solid green key.
- Grouped game (2+ groups): one endcap block per group, all endcap right edges on the same vertical line, no dead space above or below the chips in any well.
- A `hiddenByDefault` group appears as a dashed chip in a trailing well and expands into its own block when clicked.
- Landing directly on a board inside a hidden group: that group is already expanded.
- Narrow the window below 768px: endcaps become full-width labels above their wells.

- [ ] **Step 7: Commit**

```bash
git add "app/(new-layout)/styles/_board.scss" \
        "app/(new-layout)/games-v2/[game]/header/masthead.module.scss" \
        "app/(new-layout)/games-v2/[game]/header/category-rail.tsx" \
        "app/(new-layout)/games-v2/[game]/header/category-pills.tsx" \
        "app/(new-layout)/games-v2/[game]/game-page.tsx"
git commit -m "feat(games-v2): category rail — recessed group wells with engraved endcaps"
```

---

### Task 4: Subcategory tier on the same anatomy

Choosing a Character is the same kind of act as choosing a board, so it uses the same control.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/filters/filter-bar.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/subcategory-pills.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/active-filter-chips.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/header/masthead.module.scss`

**Interfaces:**
- Consumes: the mixins and module classes from Task 3.
- Produces: no new exports; `FilterBar` keeps its current props and call site.

- [ ] **Step 1: Add the tier styles**

Append to `app/(new-layout)/games-v2/[game]/header/masthead.module.scss`:

```scss
// The subcategory tier is the same anatomy one rank down, separated by a
// full-width hairline: these narrow the board rather than choosing it.
.tier {
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-sm;
    margin-top: dt.$spacing-sm;
    padding-top: dt.$spacing-sm;
    border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.35);
}
```

- [ ] **Step 2: Rewrite `subcategory-pills.tsx`'s markup**

Keep every hook, the `canonicalOf`/`pendingKeyFor` helpers, `onPick`, and the optimistic-value logic exactly as they are. Replace only the returned JSX:

```tsx
    return (
        <>
            {subcatDefs.map((def) => {
                const defaultCanonical =
                    def.defaultValueIndex != null
                        ? canonicalOf(def, def.defaultValueIndex)
                        : '';
                const activeValue =
                    selected[def.nameNormalized] ?? defaultCanonical;
                const pendingValue = def.values
                    .map((bucket) => bucket[0])
                    .find(
                        (canonical) =>
                            isPending &&
                            pendingKey === pendingKeyFor(def, canonical),
                    );
                const optimisticActiveValue = pendingValue ?? activeValue;
                const capId = `subcat-${def.nameNormalized}`;
                return (
                    <div
                        key={def.nameNormalized}
                        className={styles.block}
                        role="group"
                        aria-labelledby={capId}
                        aria-busy={isPending || undefined}
                    >
                        <span className={styles.endcap} id={capId}>
                            {def.name}
                        </span>
                        <div className={styles.well}>
                            <div className={styles.chips}>
                                {def.values.map((bucket, idx) => {
                                    const canonical = bucket[0];
                                    const isActive =
                                        optimisticActiveValue === canonical;
                                    return (
                                        <button
                                            key={`${def.nameNormalized}-${idx}`}
                                            type="button"
                                            onClick={() => onPick(def, canonical)}
                                            aria-pressed={isActive}
                                            className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                                            title={
                                                bucket.length > 1
                                                    ? `Aliases: ${bucket.slice(1).join(', ')}`
                                                    : undefined
                                            }
                                        >
                                            {canonical}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
```

Change the stylesheet import to `import styles from '../header/masthead.module.scss';`.

- [ ] **Step 3: Rewrite `active-filter-chips.tsx`'s markup**

Keep the `chips` derivation and the `setVarFilter` call unchanged. Replace the returned JSX:

```tsx
    return (
        <div className={styles.block} role="group" aria-labelledby="active-filters-cap">
            <span className={styles.endcap} id="active-filters-cap">
                Active
            </span>
            <div className={styles.well}>
                <div className={styles.chips}>
                    {chips.map(({ def, value, values }) => (
                        <button
                            key={`${def.nameNormalized}-${value}`}
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                                setVarFilter(
                                    def.nameNormalized,
                                    removeFilterValue(values, value),
                                )
                            }
                            className={`${styles.chip} ${styles.chipActive}`}
                            aria-label={`Remove ${def.name}: ${value} filter`}
                        >
                            {def.name}: {value}
                            <span aria-hidden="true"> ×</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
```

Change the stylesheet import to `import styles from '../header/masthead.module.scss';`.

- [ ] **Step 4: Rewrite `filter-bar.tsx`**

```tsx
import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../header/masthead.module.scss';
import { ActiveFilterChips } from './active-filter-chips';
import { SubcategoryPills } from './subcategory-pills';

interface Props {
    defs: VariableDef[];
    selectedSubcategoryValues: Record<string, string>;
    selectedVarFilters: Record<string, string>;
}

export function FilterBar({
    defs,
    selectedSubcategoryValues,
    selectedVarFilters,
}: Props) {
    const hasSubcategories = defs.some((d) => d.role === 'subcategory');
    const hasVarFilters = Object.keys(selectedVarFilters).length > 0;
    if (!hasSubcategories && !hasVarFilters) return null;

    return (
        <div className={styles.tier}>
            <SubcategoryPills defs={defs} selected={selectedSubcategoryValues} />
            <ActiveFilterChips defs={defs} selected={selectedVarFilters} />
        </div>
    );
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no *new* diagnostics from your files — apply the differential gate in Global Constraints, do not chase the pre-existing repo-wide errors.

- [ ] **Step 6: Browser check**

On a board with subcategory variables (and again with a variable filter applied): the tier sits under a hairline, one endcap block per variable, endcaps aligned with the category rail's above them, and the Active block's chips still remove their filter on click. Kill the dev server before finishing.

- [ ] **Step 7: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/filters/filter-bar.tsx" \
        "app/(new-layout)/games-v2/[game]/filters/subcategory-pills.tsx" \
        "app/(new-layout)/games-v2/[game]/filters/active-filter-chips.tsx" \
        "app/(new-layout)/games-v2/[game]/header/masthead.module.scss"
git commit -m "feat(games-v2): subcategory tier on the rail's endcap anatomy"
```

---

### Task 5: The masthead plate and the condensed hero

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/game-hero.tsx`
- Create: `app/(new-layout)/games-v2/[game]/header/board-masthead.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/header/masthead.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss`

**Interfaces:**
- Consumes: `GamePageData.wrEntry` (Task 1), `effectiveSubcategoryLabel` (Task 2), `CategoryRail` (Task 3), `FilterBar` (Task 4).
- Produces: `<BoardMasthead data canManage canManageRuns claim back rulesOpen onToggleRules onOpenHistory />`; `GameHero` gains `variant?: 'full' | 'condensed'` defaulting to `'full'`.

- [ ] **Step 1: Add `variant` to `GameHero`**

In `game-hero.tsx`, add to `Props`:

```tsx
    /**
     * `full` (default) is the spec-sheet hero the category wall and the
     * standings page use, where the game is the subject. `condensed` is for
     * a board page, where the game is context and the category below it is
     * the subject: a small cover and one facts line, no stat band.
     */
    variant?: 'full' | 'condensed';
```

Destructure `variant = 'full'`, then:

- Wrap the existing `<div className={styles.heroStatBand}>…</div>` block in `{variant === 'full' && ( … )}`.
- On the `<header>`: `className={variant === 'condensed' ? styles.heroCondensed : styles.hero}`.
- On the cover `<img>`: `className={variant === 'condensed' ? styles.heroCoverSm : styles.heroCover}` and swap `width={132} height={176}` for `width={56} height={75}` when condensed.
- Append the runner/attempt counts to `factsLine` when condensed, so the stat band's information survives:

```tsx
    const factsLine = [
        ...facts.map((f) => f.value),
        gameMeta.seriesDisplay
            ? `Part of the ${gameMeta.seriesDisplay} series`
            : null,
        variant === 'condensed'
            ? `${stats.uniqueRunners.toLocaleString()} runners`
            : null,
        variant === 'condensed' && stats.totalAttemptCount > 0
            ? `${stats.totalAttemptCount.toLocaleString()} attempts`
            : null,
    ]
        .filter(Boolean)
        .join(' · ');
```

- [ ] **Step 2: Add the condensed hero and plate styles**

In `game-page.module.scss`, add beside the existing `.hero`:

```scss
// Board-page hero: the game is context here, the category below it is the
// subject — so no bottom rule (the plate encloses it) and no stat band.
.heroCondensed {
    padding: dt.$spacing-lg 0 dt.$spacing-md;
}

.heroCoverSm {
    width: 56px;
    height: 75px;
    border-radius: dt.$radius-md;
    box-shadow: dt.$shadow-md;
    object-fit: cover;
    flex-shrink: 0;
}
```

Append to `masthead.module.scss`:

```scss
// ---- The plate ------------------------------------------------------
// One contained surface holding the condensed game line, the board line
// and the rail. Deliberately NOT sticky — the slim bar takes that job, so
// rail height stops being a scrolling cost.
.plate {
    @include board.board-surface(0);
    overflow: hidden;
    margin-bottom: dt.$spacing-lg;
}

.plateTop {
    padding: 0 dt.$spacing-xl dt.$spacing-lg;
}

.boardLine {
    display: flex;
    align-items: flex-end;
    gap: dt.$spacing-lg;
    flex-wrap: wrap;
}

.groupEyebrow {
    @include board.board-eyebrow;
    display: block;
}

.boardTitle {
    font-size: dt.$font-size-2xl;
    font-weight: 750;
    letter-spacing: -0.025em;
    line-height: 1.1;
    margin: dt.$spacing-xs 0 0;
}

// The subcategory half of the board's name, one rank down in weight.
.boardTitleSuffix {
    font-size: dt.$font-size-md;
    font-weight: 500;
    color: var(--bs-secondary-color);
    letter-spacing: 0;
}

.boardMeta {
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
    font-variant-numeric: tabular-nums;
    margin: dt.$spacing-xs 0 0;
}

.record {
    margin-left: auto;
    text-align: right;
    line-height: 1.3;
}

.recordTime {
    @include board.mono-time;
    font-size: dt.$font-size-xl;
    color: dt.$accent-gold;
    display: block;
}

.recordHolder {
    font-size: dt.$font-size-xs;
    color: var(--bs-secondary-color);
}

// The rail is the plate's floor: deeper tint, its own top hairline.
.railZone {
    background: var(--bs-secondary-bg);
    border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    padding: dt.$spacing-md dt.$spacing-xl;
}

.utilities {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: dt.$spacing-sm;
    margin-top: dt.$spacing-sm;
    padding-top: dt.$spacing-sm;
    border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.35);
}

.utilitySep {
    width: 1px;
    height: 0.9rem;
    background: rgba(var(--bs-border-color-rgb), 0.6);
}
```

- [ ] **Step 3: Write the plate component**

Create `app/(new-layout)/games-v2/[game]/header/board-masthead.tsx`:

```tsx
'use client';

import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { ClaimCtaState } from '../claim/claim-cta';
import { FilterBar } from '../filters/filter-bar';
import { FiltersPopover } from '../filters/filters-popover';
import { VerifiedToggle } from '../filters/verified-toggle';
import gamePageStyles from '../game-page.module.scss';
import { RulesPanel } from '../rules/rules-panel';
import type { GamePageData } from '../types';
import { effectiveSubcategoryLabel } from './board-identity';
import { CategoryRail } from './category-rail';
import { GameHero } from './game-hero';
import styles from './masthead.module.scss';

interface Props {
    data: GamePageData;
    canManage: boolean;
    canManageRuns: boolean;
    claim?: ClaimCtaState | null;
    back?: { href: string; label: string };
    rulesOpen: boolean;
    onToggleRules: () => void;
    onOpenHistory: () => void;
}

export function BoardMasthead({
    data,
    canManage,
    canManageRuns,
    claim,
    back,
    rulesOpen,
    onToggleRules,
    onOpenHistory,
}: Props) {
    const category = data.selectedCategory;
    const suffix = effectiveSubcategoryLabel(
        data.variables,
        data.activeFilters.subcategoryValues,
    );
    const wr = data.wrEntry;
    const variableKeys = data.variables.map((v) => v.nameNormalized);

    return (
        <div className={styles.plate}>
            <div className={styles.plateTop}>
                <GameHero
                    variant="condensed"
                    game={data.game}
                    stats={data.quickStats}
                    gameMeta={data.gameMeta}
                    categorySlug={category.name}
                    subcategoryKey=""
                    canManage={canManage}
                    canModerate={canManageRuns}
                    claim={claim}
                    back={back}
                />
                <div className={styles.boardLine}>
                    <div>
                        {category.groupName && (
                            <span className={styles.groupEyebrow}>
                                {category.groupName}
                            </span>
                        )}
                        <h1 className={styles.boardTitle}>
                            {category.display}
                            {suffix && (
                                <span className={styles.boardTitleSuffix}>
                                    {' · '}
                                    {suffix}
                                </span>
                            )}
                        </h1>
                        <p className={styles.boardMeta}>
                            {data.leaderboard.totalItems.toLocaleString()} runs
                            on this board
                        </p>
                    </div>
                    {wr?.time != null && (
                        <div className={styles.record}>
                            <span className={styles.groupEyebrow}>
                                World record
                            </span>
                            <span className={styles.recordTime}>
                                <DurationToFormatted
                                    duration={wr.time}
                                    withMillis={category.showMilliseconds ?? true}
                                />
                            </span>
                            <span className={styles.recordHolder}>
                                {wr.isGuest ? (
                                    wr.runnerName
                                ) : (
                                    <UserLink username={wr.runnerName} />
                                )}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.railZone}>
                <CategoryRail
                    categories={data.categories}
                    groups={data.groups}
                    selectedCategoryName={category.name}
                    variableKeys={variableKeys}
                />
                <FilterBar
                    defs={data.variables}
                    selectedSubcategoryValues={
                        data.activeFilters.subcategoryValues
                    }
                    selectedVarFilters={data.activeFilters.varFilters}
                />
                <div className={styles.utilities}>
                    <VerifiedToggle verified={data.activeFilters.verified} />
                    <span className={styles.utilitySep} aria-hidden />
                    <FiltersPopover
                        defs={data.variables}
                        selectedVarFilters={data.activeFilters.varFilters}
                    />
                    <span className={styles.utilitySep} aria-hidden />
                    <RulesPanel
                        rules={category.rules}
                        open={rulesOpen}
                        onToggle={onToggleRules}
                    />
                    <span className={styles.utilitySep} aria-hidden />
                    <button
                        type="button"
                        className={gamePageStyles.quietLink}
                        onClick={onOpenHistory}
                    >
                        WR history
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Wire it into `game-page.tsx`**

Replace the whole `<GameHero … />` + `<div className={styles.band}>…</div>` region of the main (non-empty) return with:

```tsx
                <BoardMasthead
                    data={data}
                    canManage={canManage}
                    canManageRuns={canManageRuns}
                    claim={claim}
                    back={backToWall}
                    rulesOpen={rulesOpen}
                    onToggleRules={() => setRulesOpen((o) => !o)}
                    onOpenHistory={() => setHistoryOpen(true)}
                />
```

Add `import { BoardMasthead } from './header/board-masthead';`. Remove the now-unused imports (`CategoryRail`, `FilterBar`, `FiltersPopover`, `VerifiedToggle`, `RulesPanel` — keep `RulesBody`, which still renders below). Leave the no-categories branch on the plain `<GameHero />`.

- [ ] **Step 5: Delete the dead band styles**

From `game-page.module.scss` remove `.band`, `.bandRow`, `.bandRowSub`, `.bandEnd`, `.groupLabel`, `.groupToggle`, `.groupCount`, `.pill`, `.pillActive`. Keep `.popoverRoot`, `.popoverPanel`, `.filterCount`, `.rulesToggle`, `.rulesBody`, `.dropdownPanel`, `.notice`, `.quietLink`, `.primaryAction`, `.quietChip`, the hero rules and the grid rules.

`.notice`'s invalid-combination suggestion links use `styles.pill`. Point them at `masthead.module.scss`'s `.chip` instead: import it in `game-page.tsx` as `import mastheadStyles from './header/masthead.module.scss';` and use `mastheadStyles.chip`.

Anything else still referencing a removed class must be found before committing: `grep -rn "styles.pill\|styles.band\|styles.groupLabel" "app/(new-layout)/games-v2"` must return only `setup/steps/category-band-preview.tsx`, which Task 7 handles.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no *new* diagnostics from your files — apply the differential gate in Global Constraints, do not chase the pre-existing repo-wide errors.

- [ ] **Step 7: Browser check**

- The plate encloses game line, board line and rail as one surface.
- The board line names the effective board including default subcategory values, and the record beside it matches the table's rank-1 time.
- Deep-link `?page=4` — the record still shows rank 1, not rank 76.
- An empty board shows no record block and the plate doesn't collapse.
- Category wall and `/standings` are visually unchanged.

Kill the dev server before finishing.

- [ ] **Step 8: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/header/game-hero.tsx" \
        "app/(new-layout)/games-v2/[game]/header/board-masthead.tsx" \
        "app/(new-layout)/games-v2/[game]/header/masthead.module.scss" \
        "app/(new-layout)/games-v2/[game]/game-page.tsx" \
        "app/(new-layout)/games-v2/[game]/game-page.module.scss"
git commit -m "feat(games-v2): board masthead plate with condensed hero and record line"
```

---

### Task 6: The slim sticky bar

The plate is no longer sticky. A one-row glass bar takes its place once the plate scrolls out.

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/header/sticky-board-bar.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/header/masthead.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/header/board-masthead.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `<StickyBoardBar coverUrl gameDisplay boardName verified defs selectedVarFilters onOpenHistory />`.

- [ ] **Step 1: Add the styles**

Append to `masthead.module.scss`:

```scss
// ---- Sticky slim bar -------------------------------------------------
// What the plate used to do badly: today the whole multi-row band pins to
// the top for the length of a hundred-row board. One row, bounded height,
// regardless of how many categories the game has.
.sentinel {
    height: 0;
}

.stickyBar {
    @include board.board-glass;
    position: sticky;
    top: dt.$spacing-sm;
    z-index: dt.$z-sticky;
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    border-radius: dt.$radius-lg;
    padding: dt.$spacing-sm dt.$spacing-lg;
    margin-bottom: dt.$spacing-lg;
    box-shadow: dt.$shadow-md;
    animation: masthead-bar-in dt.$transition-base both;
}

@keyframes masthead-bar-in {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@media (prefers-reduced-motion: reduce) {
    .stickyBar {
        animation: none;
    }
}

.stickyArt {
    width: 20px;
    height: 27px;
    border-radius: dt.$radius-sm;
    object-fit: cover;
    flex-shrink: 0;
}

.stickyTitle {
    font-size: dt.$font-size-sm;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stickyGame {
    color: var(--bs-tertiary-color);
    font-weight: 400;
}

.stickyEnd {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
}
```

- [ ] **Step 2: Write the component**

Create `app/(new-layout)/games-v2/[game]/header/sticky-board-bar.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';
import { FiltersPopover } from '../filters/filters-popover';
import { VerifiedToggle } from '../filters/verified-toggle';
import gamePageStyles from '../game-page.module.scss';
import styles from './masthead.module.scss';

interface Props {
    coverUrl: string | null;
    gameDisplay: string;
    /** The board's full name, subcategory values included. */
    boardName: string;
    verified: boolean;
    defs: VariableDef[];
    selectedVarFilters: Record<string, string>;
    onOpenHistory: () => void;
}

/**
 * Appears only once the masthead plate has scrolled past. A sentinel sits
 * at the plate's bottom edge; when it leaves the top of the viewport the
 * bar takes over. Hidden by default, so with JS off the page simply keeps
 * the plate and no sticky chrome — acceptable for an enhancement.
 */
export function StickyBoardBar({
    coverUrl,
    gameDisplay,
    boardName,
    verified,
    defs,
    selectedVarFilters,
    onOpenHistory,
}: Props) {
    const [stuck, setStuck] = useState(false);
    const sentinel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = sentinel.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([e]) =>
                setStuck(
                    !e.isIntersecting && e.boundingClientRect.top < 0,
                ),
            { threshold: 0 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <>
            <div ref={sentinel} className={styles.sentinel} aria-hidden />
            {stuck && (
                <div className={styles.stickyBar}>
                    {coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={coverUrl}
                            alt=""
                            aria-hidden
                            width={20}
                            height={27}
                            className={styles.stickyArt}
                        />
                    )}
                    <span className={styles.stickyTitle}>
                        {boardName}{' '}
                        <span className={styles.stickyGame}>
                            · {gameDisplay}
                        </span>
                    </span>
                    <span className={styles.stickyEnd}>
                        <VerifiedToggle verified={verified} />
                        <FiltersPopover
                            defs={defs}
                            selectedVarFilters={selectedVarFilters}
                        />
                        <button
                            type="button"
                            className={gamePageStyles.quietLink}
                            onClick={onOpenHistory}
                        >
                            WR history
                        </button>
                    </span>
                </div>
            )}
        </>
    );
}
```

- [ ] **Step 3: Mount it under the plate**

In `board-masthead.tsx`, add the import and render it immediately after the closing `</div>` of `.plate`, wrapping both in a fragment. Build the board name once and reuse it for the title suffix and the bar:

```tsx
    const boardName = suffix
        ? `${category.display} · ${suffix}`
        : category.display;
```

```tsx
            <StickyBoardBar
                coverUrl={data.gameMeta.coverUrl ?? data.game.image ?? null}
                gameDisplay={data.game.display}
                boardName={boardName}
                verified={data.activeFilters.verified}
                defs={data.variables}
                selectedVarFilters={data.activeFilters.varFilters}
                onOpenHistory={onOpenHistory}
            />
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no *new* diagnostics from your files — apply the differential gate in Global Constraints, do not chase the pre-existing repo-wide errors. If `ResolvedGame` has no `image` field, drop that half of the `coverUrl` expression.

- [ ] **Step 5: Browser check**

Scroll a long board: the plate scrolls away and the slim bar appears at the top carrying the board name; scrolling back up removes it. The bar's Filters popover opens and applies. With reduced motion enabled the bar appears without sliding. Kill the dev server before finishing.

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/header/sticky-board-bar.tsx" \
        "app/(new-layout)/games-v2/[game]/header/masthead.module.scss" \
        "app/(new-layout)/games-v2/[game]/header/board-masthead.tsx"
git commit -m "feat(games-v2): slim sticky board bar replaces the sticky band"
```

---

### Task 7: Keep the wizard's band preview honest

`category-band-preview.tsx` renders the public band from unsaved wizard state by importing the page module's classes directly. Task 5 deleted those classes. The preview exists precisely to stop the wizard drifting from the board, so it moves onto the same vocabulary.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/category-band-preview.tsx`

**Interfaces:**
- Consumes: `masthead.module.scss` classes from Tasks 3–4.
- Produces: no exports change.

- [ ] **Step 1: Repoint the import**

Replace `import band from '../../game-page.module.scss';` with `import band from '../../header/masthead.module.scss';`.

- [ ] **Step 2: Move the markup onto block/endcap/well**

Replace each `<div className={band.bandRow}>` group with the block anatomy, and each `<span className={band.pill}>` with `band.chip` / `band.chipActive`. The category sections become:

```tsx
                    {sections.map((section, idx) => (
                        <div
                            key={section.id ?? `ungrouped-${idx}`}
                            className={band.block}
                        >
                            {section.name && (
                                <span className={band.endcap}>
                                    {section.name}
                                </span>
                            )}
                            <div
                                className={`${band.well} ${section.name ? '' : band.wellSolo}`}
                            >
                                <div className={band.chips}>
                                    {section.collapsedByDefault ? (
                                        <span
                                            className={`${band.chip} ${band.chipGhost}`}
                                        >
                                            ▸ {section.name} {section.pills.length}
                                        </span>
                                    ) : section.pills.length === 0 ? (
                                        <span className={band.emptyGroup}>
                                            No categories in this group.
                                        </span>
                                    ) : (
                                        section.pills.map((c) => (
                                            <span
                                                key={c.id}
                                                className={band.chip}
                                            >
                                                {c.display}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
```

Replace the `▸` with `<CaretRightFill size={9} aria-hidden />` from `react-bootstrap-icons` — the system bans non-icon glyphs.

The subcategory block below becomes one `band.block` per variable, with `band.endcap` carrying `v.name` and `band.chips` holding a `band.chip` per bucket (`band.chipActive` for the default value), replacing the `bandRowSub` + `groupLabel` markup. Keep the inert `<span>`s — this is a picture of the board, not the board.

Delete the now-unused `styles.previewBand` wrapper only if it becomes empty; otherwise leave `setup.module.scss` alone.

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no *new* diagnostics from your files — apply the differential gate in Global Constraints, do not chase the pre-existing repo-wide errors.

- [ ] **Step 4: Verify no dangling references remain**

Run: `grep -rn "bandRow\|band\.pill\|groupLabel\|bandRowSub" "app/(new-layout)/games-v2"`
Expected: no output.

- [ ] **Step 5: Browser check**

Open the setup wizard's categories step: the preview renders wells with endcaps matching a real board, and ticking a category updates it. Kill the dev server before finishing.

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/steps/category-band-preview.tsx"
git commit -m "fix(games-v2): wizard band preview follows the new rail anatomy"
```

---

### Task 8: Reshape the loading skeleton

`loading.module.scss` mirrors the old hero geometry so content lands without shifting. It now predicts the wrong shape.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/loading.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/loading.module.scss`

- [ ] **Step 1: Restyle the skeleton to the plate**

In `loading.module.scss`, replace the `.hero` / `.cover` rules and the `.band` rule:

```scss
// Mirrors the masthead plate in header/masthead.module.scss — one bordered
// surface, a 56px cover, the board line, and the rail zone on its deeper
// tint — so the real content lands in place instead of shifting the page.
.plate {
    @include board.board-surface(0);
    overflow: hidden;
    margin-bottom: dt.$spacing-lg;
}

.plateTop {
    padding: dt.$spacing-lg dt.$spacing-xl;
    display: flex;
    gap: dt.$spacing-lg;
    align-items: center;
}

.cover {
    @include board.board-skeleton;
    width: 56px;
    height: 75px;
    border-radius: dt.$radius-md;
    flex-shrink: 0;
}

.boardTitleBar {
    @include board.board-skeleton;
    height: 1.9rem;
    width: 40%;
    border-radius: dt.$radius-sm;
    margin-bottom: dt.$spacing-sm;
}

.railZone {
    background: var(--bs-secondary-bg);
    border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    padding: dt.$spacing-md dt.$spacing-xl;
}

.railBlock {
    @include board.board-skeleton;
    height: 2.5rem;
    border-radius: dt.$radius-lg;
}
```

Keep `.titleBar`, `.factsLine`, `.heroText`, `.grid`, `.table`, `.row` and the rail-panel rules as they are, deleting only what the new markup stops using.

- [ ] **Step 2: Restructure the markup**

In `loading.tsx`, replace the `.hero` block and the standalone `<div className={styles.band} />` with:

```tsx
            <div className={styles.plate}>
                <div className={styles.plateTop}>
                    <div className={styles.cover} />
                    <div className={styles.heroText}>
                        <div className={styles.titleBar} />
                        <div className={styles.factsLine} />
                        <div className={styles.boardTitleBar} />
                    </div>
                </div>
                <div className={styles.railZone}>
                    <div className={styles.railBlock} />
                </div>
            </div>
```

Update the file's header comment to say it mirrors the masthead plate.

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no *new* diagnostics from your files — apply the differential gate in Global Constraints, do not chase the pre-existing repo-wide errors.

- [ ] **Step 4: Browser check**

With network throttled, navigate to a board: the skeleton's plate occupies roughly the same box as the real masthead, and the swap doesn't jump the page. Kill the dev server before finishing.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/loading.tsx" \
        "app/(new-layout)/games-v2/[game]/loading.module.scss"
git commit -m "fix(games-v2): loading skeleton mirrors the masthead plate"
```

---

### Task 9: Correct the design system doc

Two claims in `system.md` are now false, and the new vocabulary is undocumented.

**Files:**
- Modify: `.interface-design/system.md`

- [ ] **Step 1: Replace signature #4**

It currently describes "Ambient art hero / the crown — the game's own cover art, blurred to atmosphere under a scrim, with the category WR set monumentally in gold mono." No such hero exists, and blurred-art backdrops were rejected twice (2026-07-22, 2026-07-23). Replace with:

```markdown
4. **The masthead plate** — the board page's identity is one contained surface: a condensed game line, the category as the headline with its record in gold mono beside it, and the category rail as the plate's floor. Presence comes from scale, type, spacing and containment — never from art backdrops, gradients or washes, which are out of the vocabulary entirely.
```

- [ ] **Step 2: Fix the glass rule**

The Rules section reads "**Glass** (board-glass) is reserved for the hero's quiet actions, the sticky control band, and the rail's live panel". The sticky control band no longer exists. Replace "the sticky control band" with "the sticky slim board bar".

Also update the Popover-shadow rule's exception, which cites `.heroCover` as a 96×128px thumbnail over a blurred ambient backdrop: the board page's cover is now 56×75 inside the plate and uses `$shadow-md`; the `$shadow-lg` exception applies only to the full hero's 132×176 cover on the category wall and standings page.

- [ ] **Step 3: Document the rail in Components**

Append to the Components list:

```markdown
- Category rail (`games-v2/[game]/header/masthead.module.scss` + `_board.scss`'s `board-rail-block`/`-endcap`/`-well`/`-well-solo`/`-chips`, `board-chip`/`-active`/`-ghost`/`-count`) — a group of boards is one recessed well with its name engraved into a darker endcap on its left. **Invariant: the endcap never sets the row height** — the chips set it and the cap centres in whatever they need, in both directions. Chips carry a tabular-mono runner count; emblems are all-or-nothing per group so a well never mixes chips with and without art. Collapsed groups share one trailing endcap-less well, one dashed chip each. The subcategory tier below the hairline uses the identical anatomy one rank down.
```

- [ ] **Step 4: Commit**

```bash
git add .interface-design/system.md
git commit -m "docs(games-v2): system.md — masthead plate replaces the ambient-art signature"
```

---

## Self-Review

**Spec coverage:** Decision 1 (two hero densities) → Task 5 Step 1. Decision 2 (board line) → Task 5 Steps 2–3. Decision 3 (crown stays in table) → no task, deliberately: the table is untouched. Decision 4 (rail, chip, endcap, invariant, collapsed groups, trivial case) → Task 3. Decision 5 (wrap) → falls out of `flex-wrap` in `board-rail-chips`; no measurement code exists to remove. Decision 6 (sticky) → Tasks 5 Step 5 (removal) and 6 (replacement). Decision 7 (subcategory tier) → Task 4. Decision 8 (responsive) → Task 3 Step 1 media queries. Data section → Task 1. Knock-on 1–4 → Tasks 7, 8, 9.

**Known gap, called out rather than hidden:** the spec's `role="group"`/`aria-labelledby` requirement is implemented for category groups (Task 3) and subcategory variables (Task 4), but the ungrouped/solo well has no label to point at and correctly omits both attributes.

**Type consistency:** `resolveWrEntry` (Task 1) matches its call in Task 1 Step 6. `GamePageData.wrEntry` (Task 1) is read as `data.wrEntry` in Task 5. `effectiveSubcategoryLabel(defs, selected)` and `groupShowsEmblems(pills)` (Task 2) match their uses in Tasks 5 and 3. `CategoryRail`'s four props match `CategoryPills`' old signature, so the Task 3 swap is prop-for-prop. Module class names (`block`, `endcap`, `well`, `wellSolo`, `chips`, `chip`, `chipActive`, `chipGhost`, `chipCount`, `chipEmblem`, `emptyGroup`, `tier`, `plate`, `plateTop`, `railZone`) are defined in Task 3/4/5 before every later use.
