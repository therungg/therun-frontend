# Console Category IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the console's six `categoryScoped` panes and its sidebar `<select>` with one category index (a comparison matrix with bulk edits) and one category detail route, and make the wizard and console name the same things the same way.

**Architecture:** Three pure, tested modules (`agreement`, `category-rows`, `vocabulary`) derive everything the new UI asserts, so the table's claims are testable without rendering a table. The index is a console pane (`?pane=categories`); the detail screen is a sub-route under the existing `SubrouteChrome`, like `roster` and `run/[runId]` already are. The six existing pane components survive nearly unchanged — they become sections on the detail screen.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, vitest (colocated `*.test.ts`), SCSS modules, `react-bootstrap-icons`, Biome (4-space indent, single quotes, trailing commas).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-29-console-category-ia-design.md`. Read it before Task 1.
- **Two incompatible timing enums.** `ResolvedCategory.primaryTiming` is `'rt' | 'gt'` (`types/leaderboards.types.ts:28`); `PrimaryTiming` in `src/lib/category-mgmt.ts:5` is `'realtime' | 'gametime'`. Normalise in exactly one place (Task 3) — the matrix reads the first, every write action takes the second.
- **`min_time` policy value keys are `{ minTimeMs, minGameTimeMs }`.** Not `rtMs`/`gtMs` — the backend 400s and nothing saves.
- **Bulk edits write only the field chosen.** Never send a whole form. Reproducing audit A2's blanket write is a task failure.
- **Caching:** server reads use `'use cache'` + `cacheLife()`/`cacheTag()`. Mutations that a UI step immediately re-reads use `updateTag(tag)`, not `revalidateTag` — `revalidateTag` is stale-while-revalidate and server actions do not read their own writes. The existing category actions already use `updateTag`; follow them.
- **`categories.active` is NULL in production.** Filter archived with `IS NOT FALSE` semantics — in frontend terms, treat `archived` via the existing `src/lib/archived-flag.ts` normalisation, never `active === true`.
- Unused variables must be prefixed `_`. Icons come from `react-bootstrap-icons` — no emoji.
- Never run the dev server as part of a task. Never push to `main` in this repo. Do not open a PR.
- **Test file convention:** under `src/lib`, tests live in a sibling `__tests__/` directory (`src/lib/setup/__tests__/steps.test.ts`). Under `app/`, they are colocated (`nav-model.test.ts`). Follow whichever applies to the file you are testing.
- Run `npm run typecheck` and `npx vitest run <file>` per task. Do not run the full suite unless a task says to.

## Interaction with the variables work in flight

The approved variables redesign is being implemented **on this same branch, in
parallel** (`3e4153bb`, `94a01ee1`, `66d98594` and counting). Two points of contact:

1. **Task 11 mounts the variables UI.** Today that is `VariablesSection` +
   `CombinationsSection`. The variables plan's Task 16 replaces both with a single
   `variables-screen.tsx` whose third zone *is* sub-boards. Whichever has landed when Task
   11 runs is what the detail screen mounts — check before writing the imports. If
   `variables-screen.tsx` exists, the detail screen has **six** sections, not seven, and the
   `combinations` entry in `SECTIONS` becomes an anchor inside the variables section rather
   than a section of its own. Task 6's `legacyPaneRedirect` still maps `?pane=combinations`
   to `#combinations` either way, so nothing else changes.

2. **Naming proximity, no conflict.** `src/lib/variables/language.ts` is the vocabulary of
   variable *roles* ("splits this board" / "filter only"). `src/lib/console/vocabulary.ts`
   (Task 1) is the vocabulary of *nav concepts*. Different scope, no shared symbols — do not
   merge them.

Rebase before starting each phase; do not assume the tree matches what this plan saw.

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/lib/console/agreement.ts` | Modal value + which categories differ, per column. Pure. |
| `src/lib/console/__tests__/agreement.test.ts` | Its tests. |
| `src/lib/console/category-rows.ts` | Fold `ResolvedCategory[]` + policies + variables into `CategoryConfigRow[]`. Owns both enum normalisations. Pure. |
| `src/lib/console/__tests__/category-rows.test.ts` | Its tests. |
| `src/lib/console/vocabulary.ts` | One label per concept; step→concept and nav→concept maps; wizard wayfinding targets. Pure. |
| `src/lib/console/__tests__/vocabulary.test.ts` | Its tests. |
| `src/lib/console/legacy-panes.ts` | Map retired `?pane=`/`?cat=` deep links onto the new routes. Pure. |
| `src/lib/console/__tests__/legacy-panes.test.ts` | Its tests. |
| `app/(new-layout)/games-v2/[game]/manage/console/categories-pane/categories-pane.tsx` | The index: composes table + filters + bulk bar. |
| `.../categories-pane/category-matrix.tsx` | The table itself: grouped rows, columns, `▲` markers, checkboxes. |
| `.../categories-pane/bulk-bar.tsx` | Selection count + the five bulk actions. |
| `.../categories-pane/bulk-dialog.tsx` | Confirm-with-from-values dialog, sequential writes, per-row result. |
| `.../categories-pane/categories-pane.module.scss` | Styles for the above. |
| `app/(new-layout)/games-v2/[game]/manage/category/[categoryId]/page.tsx` | Detail route (server): auth, load, render. |
| `.../category/[categoryId]/category-detail.tsx` | Detail client: section rail, prev/next, the seven sections. |
| `.../category/[categoryId]/category-detail.module.scss` | Its styles. |
| `app/(new-layout)/games-v2/[game]/manage/category-tab/proof-section.tsx` | Proof & review, extracted from `category-settings-section.tsx`. |

**Modified**

| File | Change |
|---|---|
| `.../console/nav-model.ts` | Two groups; drop `categoryScoped`, `resolveCategoryId`, six ids; rename `categories-visibility` → `categories`. |
| `.../console/nav-model.test.ts` | Updated for the above. |
| `.../console/console-sidebar.tsx` | Delete the picker and `activeIsCategoryScoped`; icon map follows the id changes. |
| `.../console/console-chrome.tsx` | Drop the three category props. |
| `.../console/console-shell.tsx` | Drop category selection state, `handleSelectCategory`, the `cat=` branch in `handleNavigate`; add legacy-pane redirect. |
| `.../console/subroute-chrome.tsx` | Drop the three category props. |
| `.../console/content-router.tsx` | Delete the six category cases; add the `categories` case. |
| `.../manage/game-tab/game-tab.tsx` | Drop the `categories-visibility` section (moved to the index). |
| `.../manage/category-tab/category-settings-section.tsx` | Remove proof fields (now `proof-section.tsx`). |
| `.../manage/categories/page.tsx` | Redirect target → `?pane=categories`. |
| `.../manage/page.tsx` | Build `CategoryConfigRow[]`, pass to the shell. |
| `src/lib/setup/health.ts` | `STEP_PANE` points at `categories`; add `variables`. |
| `app/(new-layout)/games-v2/[game]/setup/setup-rail.tsx` | Labels from `vocabulary.ts`. |
| `.../setup/steps/step-*.tsx` | Wayfinding footer. |

---

# Phase 1 — Pure modules

### Task 1: `vocabulary.ts` — one label per concept

**Files:**
- Create: `src/lib/console/vocabulary.ts`
- Test: `src/lib/console/__tests__/vocabulary.test.ts`

**Interfaces:**
- Consumes: `SetupStepId` from `src/lib/setup/completeness.ts`.
- Produces: `ConceptId`, `CONCEPT_LABEL`, `STEP_CONCEPTS`, `conceptLabel(id)`, `consoleLocationForStep(step)` returning `{ crumb: string; pane: string } | null`. Tasks 4, 14 and 15 consume these.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/console/__tests__/vocabulary.test.ts
import { describe, expect, it } from 'vitest';
import { SETUP_STEP_ORDER } from '../../setup/completeness';
import {
    CONCEPT_LABEL,
    type ConceptId,
    conceptLabel,
    consoleLocationForStep,
    STEP_CONCEPTS,
} from '../vocabulary';

describe('vocabulary', () => {
    it('gives every setup step at least one concept', () => {
        for (const step of SETUP_STEP_ORDER) {
            expect(STEP_CONCEPTS[step], step).toBeDefined();
        }
    });

    it('only maps steps to concepts that have labels', () => {
        for (const concepts of Object.values(STEP_CONCEPTS)) {
            for (const c of concepts) {
                expect(CONCEPT_LABEL[c], c).toBeTruthy();
            }
        }
    });

    it('labels the four concepts wizard step 5 splits into', () => {
        expect(STEP_CONCEPTS.defaults).toEqual([
            'timing',
            'proof',
            'standards',
            'rules',
        ]);
        expect(conceptLabel('proof')).toBe('Proof & review');
        expect(conceptLabel('standards')).toBe('Minimum time');
    });

    it('sends board-wide steps to the category index, not one category', () => {
        expect(consoleLocationForStep('defaults')).toEqual({
            crumb: 'Categories ▸ Timing',
            pane: 'categories',
        });
        expect(consoleLocationForStep('exceptions')?.pane).toBe('categories');
    });

    it('has no console location for the terminal step', () => {
        expect(consoleLocationForStep('finish')).toBeNull();
    });

    it('never returns an empty label', () => {
        for (const [id, label] of Object.entries(CONCEPT_LABEL)) {
            expect(label.trim().length, id).toBeGreaterThan(0);
        }
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/console/__tests__/vocabulary.test.ts`
Expected: FAIL — cannot resolve `../vocabulary`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/console/vocabulary.ts
// One label per concept, shared by the wizard rail, the wizard step headers,
// the console nav and the detail section headings. `steps.ts` plays this role
// for step labels; this extends it across the wizard/console seam so the two
// can't drift apart again (they had: "Game details" vs "Details & metadata",
// "Categories" vs "Categories & visibility").
import type { SetupStepId } from '../setup/completeness';

export type ConceptId =
    | 'attention'
    | 'roster'
    | 'reports'
    | 'bans'
    | 'history'
    | 'setup'
    | 'game-details'
    | 'categories'
    | 'groups'
    | 'identifiers'
    | 'moderators'
    | 'reassign'
    | 'variables'
    | 'combinations'
    | 'timing'
    | 'proof'
    | 'standards'
    | 'rules'
    | 'category-settings';

export const CONCEPT_LABEL: Record<ConceptId, string> = {
    attention: 'Needs attention',
    roster: 'Browse runs',
    reports: 'Reports',
    bans: 'Bans',
    history: 'History',
    setup: 'Setup wizard',
    'game-details': 'Game details',
    categories: 'Categories',
    groups: 'Groups',
    identifiers: 'URL slug',
    moderators: 'Moderators',
    reassign: 'Merge games & categories',
    variables: 'Variables',
    combinations: 'Sub-boards',
    timing: 'Timing',
    proof: 'Proof & review',
    standards: 'Minimum time',
    rules: 'Rules',
    'category-settings': 'Settings',
};

export function conceptLabel(id: ConceptId): string {
    return CONCEPT_LABEL[id];
}

/**
 * Which console concepts a wizard step covers. Step 5 ("Defaults") is one
 * screen with four headings (step-defaults.tsx:261,335,395,463) and therefore
 * maps to four concepts; the console reaches all four from the category index.
 */
export const STEP_CONCEPTS: Record<SetupStepId, ConceptId[]> = {
    details: ['game-details', 'identifiers'],
    categories: ['categories'],
    groups: ['groups'],
    variables: ['variables', 'combinations'],
    defaults: ['timing', 'proof', 'standards', 'rules'],
    exceptions: ['categories'],
    finish: [],
};

export interface ConsoleLocation {
    /** Human breadcrumb for the wizard's wayfinding footer. */
    crumb: string;
    /** `?pane=` value to link to. */
    pane: string;
}

const BOARD_PANES: ReadonlySet<ConceptId> = new Set([
    'game-details',
    'categories',
    'groups',
    'identifiers',
    'moderators',
    'reassign',
]);

/**
 * Where a wizard step's work lives once setup is done. Board-level steps point
 * at their own pane; per-category steps point at the index rather than at one
 * arbitrary category — which is what health.ts's STEP_PANE used to get wrong.
 */
export function consoleLocationForStep(
    step: SetupStepId,
): ConsoleLocation | null {
    const concepts = STEP_CONCEPTS[step];
    if (concepts.length === 0) return null;
    const first = concepts[0];
    if (BOARD_PANES.has(first)) {
        return { crumb: CONCEPT_LABEL[first], pane: first };
    }
    return {
        crumb: `${CONCEPT_LABEL.categories} ▸ ${CONCEPT_LABEL[first]}`,
        pane: 'categories',
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/console/__tests__/vocabulary.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/console/vocabulary.ts src/lib/console/__tests__/vocabulary.test.ts
git commit -m "feat(console): shared vocabulary for wizard and console labels"
```

---

### Task 2: `agreement.ts` — which categories differ

**Files:**
- Create: `src/lib/console/agreement.ts`
- Test: `src/lib/console/__tests__/agreement.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `modalValue<T>(values: T[]): { value: T; count: number } | null` and `differingIds<T>(rows: Array<{ id: number; value: T }>): Set<number>`. Task 3 re-exports column keys; Task 7 renders the markers.

`modalValue` returns `null` on an empty list **and on a tie for first place** — `▲` means "the odd one out", and with no consensus there is no odd one out.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/console/__tests__/agreement.test.ts
import { describe, expect, it } from 'vitest';
import { differingIds, modalValue } from '../agreement';

describe('modalValue', () => {
    it('returns null for an empty list', () => {
        expect(modalValue([])).toBeNull();
    });

    it('returns the only value when they all agree', () => {
        expect(modalValue(['rt', 'rt', 'rt'])).toEqual({
            value: 'rt',
            count: 3,
        });
    });

    it('returns the clear majority', () => {
        expect(modalValue(['rt', 'rt', 'gt'])).toEqual({
            value: 'rt',
            count: 2,
        });
    });

    it('returns null when the top two tie', () => {
        expect(modalValue(['rt', 'gt'])).toBeNull();
        expect(modalValue(['rt', 'rt', 'gt', 'gt'])).toBeNull();
    });

    it('treats a single value as its own consensus', () => {
        expect(modalValue(['rt'])).toEqual({ value: 'rt', count: 1 });
    });

    it('distinguishes null from a value', () => {
        expect(modalValue([null, null, 5])).toEqual({ value: null, count: 2 });
    });
});

describe('differingIds', () => {
    it('marks nothing when every row agrees', () => {
        const rows = [
            { id: 1, value: 'rt' },
            { id: 2, value: 'rt' },
        ];
        expect(differingIds(rows).size).toBe(0);
    });

    it('marks only the odd one out', () => {
        const rows = [
            { id: 1, value: 'rt' },
            { id: 2, value: 'rt' },
            { id: 3, value: 'gt' },
        ];
        expect([...differingIds(rows)]).toEqual([3]);
    });

    it('marks nothing when there is no majority', () => {
        const rows = [
            { id: 1, value: 'rt' },
            { id: 2, value: 'gt' },
        ];
        expect(differingIds(rows).size).toBe(0);
    });

    it('marks nothing for a single row', () => {
        expect(differingIds([{ id: 1, value: 'rt' }]).size).toBe(0);
    });

    it('marks nothing for no rows', () => {
        expect(differingIds([]).size).toBe(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/console/__tests__/agreement.test.ts`
Expected: FAIL — cannot resolve `../agreement`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/console/agreement.ts
// "Does this board agree with itself?" — the one fact the old console could
// never show, because it only ever rendered one category at a time.

/**
 * The most common value, or null when the list is empty or the top two tie.
 * A tie means there is no consensus, and therefore no odd one out to mark.
 * Values are keyed by JSON so null, numbers and strings compare structurally.
 */
export function modalValue<T>(values: T[]): { value: T; count: number } | null {
    if (values.length === 0) return null;

    const counts = new Map<string, { value: T; count: number }>();
    for (const value of values) {
        const key = JSON.stringify(value ?? null);
        const entry = counts.get(key);
        if (entry) entry.count += 1;
        else counts.set(key, { value, count: 1 });
    }

    const ranked = [...counts.values()].sort((a, b) => b.count - a.count);
    if (ranked.length > 1 && ranked[0].count === ranked[1].count) return null;
    return ranked[0];
}

/** Ids whose value differs from the consensus. Empty when there is none. */
export function differingIds<T>(
    rows: Array<{ id: number; value: T }>,
): Set<number> {
    const modal = modalValue(rows.map((r) => r.value));
    if (!modal) return new Set();
    const modalKey = JSON.stringify(modal.value ?? null);
    return new Set(
        rows
            .filter((r) => JSON.stringify(r.value ?? null) !== modalKey)
            .map((r) => r.id),
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/console/__tests__/agreement.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/console/agreement.ts src/lib/console/__tests__/agreement.test.ts
git commit -m "feat(console): agreement module — modal value and outliers"
```

---

### Task 3: `category-rows.ts` — fold the sources into matrix rows

**Files:**
- Create: `src/lib/console/category-rows.ts`
- Test: `src/lib/console/__tests__/category-rows.test.ts`

**Interfaces:**
- Consumes: `differingIds` (Task 2); `ResolvedCategory`, `VariableRow` from `types/leaderboards.types.ts`; `BoardPolicyRow` from `types/moderation.types.ts`; `PrimaryTiming` from `src/lib/category-mgmt.ts`.
- Produces: `CategoryConfigRow`, `ColumnId`, `COLUMN_IDS`, `buildCategoryRows(input)`, `columnValue(row, col)`, `disagreementsByColumn(rows)`, `toPrimaryTiming(t)`, `subBoardCount(vars, categoryId)`. Tasks 7–10 consume all of these.

This task owns **both** normalisations named in Global Constraints. Nothing downstream may touch `'rt' | 'gt'` again.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/console/__tests__/category-rows.test.ts
import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../types/moderation.types';
import {
    buildCategoryRows,
    columnValue,
    disagreementsByColumn,
    subBoardCount,
    toPrimaryTiming,
} from '../category-rows';

const cat = (over: Partial<ResolvedCategory> = {}): ResolvedCategory => ({
    id: 1,
    name: 'any',
    display: 'Any%',
    primaryTiming: 'rt',
    archived: false,
    sortOrder: 1,
    isMain: true,
    ...over,
});

const policy = (categoryId: number, minTimeMs: number): BoardPolicyRow => ({
    id: 100 + categoryId,
    gameId: 7,
    categoryId,
    subcategoryKey: null,
    policyType: 'min_time',
    value: { minTimeMs },
    createdBy: 1,
    reason: '',
    createdAt: '2026-01-01T00:00:00Z',
});

const variable = (over: Partial<VariableRow> = {}): VariableRow => ({
    id: 1,
    gameId: 7,
    categoryId: null,
    name: 'Platform',
    nameNormalized: 'platform',
    role: 'subcategory',
    values: [['N64'], ['VC'], ['Emu'], ['Switch']],
    defaultValueIndex: 0,
    sortOrder: 1,
    description: null,
    version: 1,
    published: true,
    ...over,
});

describe('toPrimaryTiming', () => {
    it('maps the resolved enum onto the write enum', () => {
        expect(toPrimaryTiming('rt')).toBe('realtime');
        expect(toPrimaryTiming('gt')).toBe('gametime');
    });
});

describe('subBoardCount', () => {
    it('multiplies the value counts of subcategory variables', () => {
        const vars = [
            variable(),
            variable({ id: 2, name: 'Version', nameNormalized: 'version', values: [['1.0'], ['1.1']] }),
        ];
        expect(subBoardCount(vars, 1)).toBe(8);
    });

    it('ignores filter-role variables', () => {
        const vars = [variable({ role: 'filter' })];
        expect(subBoardCount(vars, 1)).toBe(1);
    });

    it('ignores unpublished variables', () => {
        expect(subBoardCount([variable({ published: false })], 1)).toBe(1);
    });

    it('lets a category row wholesale-replace the game-wide row of that name', () => {
        const vars = [
            variable(),
            variable({ id: 9, categoryId: 1, values: [['N64'], ['Emu']] }),
        ];
        expect(subBoardCount(vars, 1)).toBe(2);
    });

    it('does not apply another category rows override', () => {
        const vars = [
            variable(),
            variable({ id: 9, categoryId: 2, values: [['N64'], ['Emu']] }),
        ];
        expect(subBoardCount(vars, 1)).toBe(4);
    });
});

describe('buildCategoryRows', () => {
    it('normalises timing and attaches the minimum', () => {
        const rows = buildCategoryRows({
            categories: [cat({ id: 1, primaryTiming: 'gt' })],
            policies: [policy(1, 4500000)],
            variables: [],
        });
        expect(rows[0].timing).toBe('gametime');
        expect(rows[0].minTimeMs).toBe(4500000);
    });

    it('reads minTimeMs, not rtMs', () => {
        const bad = { ...policy(1, 0), value: { rtMs: 999 } };
        const rows = buildCategoryRows({
            categories: [cat({ id: 1 })],
            policies: [bad],
            variables: [],
        });
        expect(rows[0].minTimeMs).toBeNull();
    });

    it('ignores policies for other categories and non-min_time policies', () => {
        const rows = buildCategoryRows({
            categories: [cat({ id: 1 })],
            policies: [
                policy(2, 1000),
                { ...policy(1, 2000), policyType: 'max_time' },
            ],
            variables: [],
        });
        expect(rows[0].minTimeMs).toBeNull();
    });

    it('derives hasRules from non-blank rules text', () => {
        const rows = buildCategoryRows({
            categories: [
                cat({ id: 1, rules: '  ' }),
                cat({ id: 2, rules: 'No BLJ' }),
            ],
            policies: [],
            variables: [],
        });
        expect(rows[0].hasRules).toBe(false);
        expect(rows[1].hasRules).toBe(true);
    });
});

describe('columnValue', () => {
    const base = buildCategoryRows({
        categories: [cat({ id: 1, requireVideo: true, requireVideoTopN: 10 })],
        policies: [],
        variables: [],
    })[0];

    it('collapses proof into one comparable key', () => {
        expect(columnValue(base, 'proof')).toBe('top10');
        expect(
            columnValue({ ...base, requireVideoTopN: null }, 'proof'),
        ).toBe('all');
        expect(
            columnValue({ ...base, requireVideo: false }, 'proof'),
        ).toBe('none');
    });
});

describe('disagreementsByColumn', () => {
    it('compares featured categories only', () => {
        const rows = buildCategoryRows({
            categories: [
                cat({ id: 1, primaryTiming: 'rt' }),
                cat({ id: 2, primaryTiming: 'rt' }),
                cat({ id: 3, primaryTiming: 'gt', isMain: false }),
            ],
            policies: [],
            variables: [],
        });
        expect(disagreementsByColumn(rows).timing.size).toBe(0);
    });

    it('excludes archived categories from the comparison', () => {
        const rows = buildCategoryRows({
            categories: [
                cat({ id: 1, primaryTiming: 'rt' }),
                cat({ id: 2, primaryTiming: 'rt' }),
                cat({ id: 3, primaryTiming: 'gt', archived: true }),
            ],
            policies: [],
            variables: [],
        });
        expect(disagreementsByColumn(rows).timing.size).toBe(0);
    });

    it('marks the featured outlier', () => {
        const rows = buildCategoryRows({
            categories: [
                cat({ id: 1 }),
                cat({ id: 2 }),
                cat({ id: 3, primaryTiming: 'gt' }),
            ],
            policies: [],
            variables: [],
        });
        expect([...disagreementsByColumn(rows).timing]).toEqual([3]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/console/__tests__/category-rows.test.ts`
Expected: FAIL — cannot resolve `../category-rows`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/console/category-rows.ts
// The matrix's single source of truth. Everything the index asserts is derived
// here so it can be tested without rendering a table.
//
// This module owns BOTH enum normalisations:
//   ResolvedCategory.primaryTiming  'rt' | 'gt'            (read)
//   PrimaryTiming                   'realtime' | 'gametime' (write)
// Nothing downstream may touch 'rt' | 'gt' again.
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../types/moderation.types';
import type { PrimaryTiming } from '../category-mgmt';
import { differingIds } from './agreement';

export interface CategoryConfigRow {
    id: number;
    display: string;
    groupId: number | null;
    groupName: string | null;
    sortOrder: number;
    isMain: boolean;
    archived: boolean;
    timing: PrimaryTiming;
    hideRealTime: boolean;
    hideGameTime: boolean;
    showMilliseconds: boolean;
    minTimeMs: number | null;
    hasRules: boolean;
    requireVideo: boolean;
    requireVideoTopN: number | null;
    subBoards: number;
}

export type ColumnId =
    | 'timing'
    | 'minimum'
    | 'rules'
    | 'proof'
    | 'subBoards';

export const COLUMN_IDS: readonly ColumnId[] = [
    'timing',
    'minimum',
    'rules',
    'proof',
    'subBoards',
];

export function toPrimaryTiming(t: 'rt' | 'gt'): PrimaryTiming {
    return t === 'gt' ? 'gametime' : 'realtime';
}

/**
 * How many leaderboards this category splits into.
 *
 * Merge rule (same as the public read): a category row wholesale-replaces the
 * game-wide row with the same nameNormalized. Only published subcategory-role
 * variables split a board; filter-role ones don't.
 *
 * Caveat: this is the open-mode maximum. A managed valid-combination set can
 * prune it. The approved variables redesign adds real combination counts; this
 * column shows the upper bound until then.
 */
export function subBoardCount(
    variables: VariableRow[],
    categoryId: number,
): number {
    const effective = new Map<string, VariableRow>();
    for (const v of variables) {
        if (v.categoryId === null) effective.set(v.nameNormalized, v);
    }
    for (const v of variables) {
        if (v.categoryId === categoryId) effective.set(v.nameNormalized, v);
    }

    let count = 1;
    for (const v of effective.values()) {
        if (v.role !== 'subcategory' || !v.published) continue;
        if (v.values.length > 0) count *= v.values.length;
    }
    return count;
}

function minTimeFor(
    policies: BoardPolicyRow[],
    categoryId: number,
): number | null {
    const row = policies.find(
        (p) => p.policyType === 'min_time' && p.categoryId === categoryId,
    );
    // Value keys are { minTimeMs, minGameTimeMs } — rtMs/gtMs is the shape the
    // backend rejects, and a row carrying it must read as "unset", not as 0.
    const raw = row?.value?.minTimeMs;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

export function buildCategoryRows(input: {
    categories: ResolvedCategory[];
    policies: BoardPolicyRow[];
    variables: VariableRow[];
}): CategoryConfigRow[] {
    return input.categories.map((c) => ({
        id: c.id,
        display: c.display,
        groupId: c.groupId ?? null,
        groupName: c.groupName ?? null,
        sortOrder: c.sortOrder,
        isMain: c.isMain ?? false,
        archived: c.archived,
        timing: toPrimaryTiming(c.primaryTiming),
        hideRealTime: c.hideRealTime ?? false,
        hideGameTime: c.hideGameTime ?? false,
        showMilliseconds: c.showMilliseconds ?? false,
        minTimeMs: minTimeFor(input.policies, c.id),
        hasRules: (c.rules ?? '').trim().length > 0,
        requireVideo: c.requireVideo ?? false,
        requireVideoTopN: c.requireVideoTopN ?? null,
        subBoards: subBoardCount(input.variables, c.id),
    }));
}

/** The comparable key for a column — what "same" means for the ▲ marker. */
export function columnValue(
    row: CategoryConfigRow,
    column: ColumnId,
): string | number | boolean | null {
    switch (column) {
        case 'timing':
            return row.timing;
        case 'minimum':
            return row.minTimeMs;
        case 'rules':
            return row.hasRules;
        case 'proof':
            if (!row.requireVideo) return 'none';
            return row.requireVideoTopN == null
                ? 'all'
                : `top${row.requireVideoTopN}`;
        case 'subBoards':
            return row.subBoards;
    }
}

/**
 * Which categories are the odd one out, per column. Only featured, unarchived
 * categories take part: an archived category isn't on the board, so it can't
 * disagree with it.
 */
export function disagreementsByColumn(
    rows: CategoryConfigRow[],
): Record<ColumnId, Set<number>> {
    const featured = rows.filter((r) => r.isMain && !r.archived);
    const out = {} as Record<ColumnId, Set<number>>;
    for (const column of COLUMN_IDS) {
        out[column] = differingIds(
            featured.map((r) => ({ id: r.id, value: columnValue(r, column) })),
        );
    }
    return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/console/__tests__/category-rows.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/console/category-rows.ts src/lib/console/__tests__/category-rows.test.ts
git commit -m "feat(console): category-rows — matrix data model and enum normalisation"
```

---

# Phase 2 — Nav model and chrome

### Task 4: Two nav groups, no `categoryScoped`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts`

**Interfaces:**
- Consumes: `CONCEPT_LABEL`, `ConceptId` (Task 1).
- Produces: `NavItemId` without the six category ids and with `categories` replacing `categories-visibility`; `NavGroupId = 'moderate' | 'board'`; `NavItem` without `categoryScoped`. `resolveCategoryId` is deleted. Tasks 5, 6, 13 depend on this shape.

- [ ] **Step 1: Update the test first**

Delete the whole `describe('resolveCategoryId')` block from `nav-model.test.ts`, and replace every `'categories-visibility'` string with `'categories'`. Then add:

```ts
describe('nav shape', () => {
    const ALL: NavFlags = {
        canModerate: true,
        canEditStandards: true,
        canConfigure: true,
        canReassign: true,
        canEditMods: true,
    };

    it('has exactly two groups', () => {
        expect(buildNav(ALL).map((g) => g.id)).toEqual(['moderate', 'board']);
    });

    it('shows twelve items to a fully privileged viewer', () => {
        expect(buildNav(ALL).flatMap((g) => g.items)).toHaveLength(12);
    });

    it('orders the board group to match the wizard', () => {
        const board = buildNav(ALL).find((g) => g.id === 'board');
        expect(board?.items.slice(0, 4).map((i) => i.id)).toEqual([
            'setup',
            'game-details',
            'categories',
            'groups',
        ]);
    });

    it('no longer carries any category-scoped item', () => {
        const items = buildNav(ALL).flatMap((g) => g.items);
        expect(items.some((i) => 'categoryScoped' in i)).toBe(false);
    });

    it('gives a configure-only viewer the board group without moderation', () => {
        const groups = buildNav({ ...ALL, canModerate: false, canEditMods: false, canReassign: false });
        expect(groups.map((g) => g.id)).toEqual(['board']);
        expect(groups[0].items.map((i) => i.id)).not.toContain('moderators');
    });

    it('lands on the category index by default', () => {
        expect(defaultItem(buildNav(ALL))).toBe('attention');
        const configureOnly = buildNav({
            canModerate: false,
            canEditStandards: false,
            canConfigure: true,
            canReassign: false,
            canEditMods: false,
        });
        expect(defaultItem(configureOnly)).toBe('game-details');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts"`
Expected: FAIL — `resolveCategoryId` import gone, group ids still three.

- [ ] **Step 3: Rewrite the model**

In `nav-model.ts`: delete `'standards' | 'timing' | 'rules' | 'variables' | 'combinations' | 'category-settings'` from `NavItemId`, rename `'categories-visibility'` to `'categories'`, set `export type NavGroupId = 'moderate' | 'board';`, remove `categoryScoped` from `NavItem`, and replace `ALL_GROUPS` with:

```ts
const ALL_GROUPS: NavGroup[] = [
    {
        id: 'moderate',
        label: 'Moderate',
        items: [
            { id: 'attention', label: CONCEPT_LABEL.attention },
            { id: 'roster', label: CONCEPT_LABEL.roster },
            { id: 'reports', label: CONCEPT_LABEL.reports },
            { id: 'bans', label: CONCEPT_LABEL.bans },
            { id: 'history', label: CONCEPT_LABEL.history },
        ],
    },
    {
        id: 'board',
        label: 'Board',
        items: [
            // Leaves the console for the wizard rather than opening a pane —
            // see handleNavigate in console-shell.tsx. The permanent door back
            // into setup, which is why it sits first and survives go-live.
            { id: 'setup', label: CONCEPT_LABEL.setup },
            { id: 'game-details', label: CONCEPT_LABEL['game-details'] },
            // The category index: the door to every per-category setting, and
            // the featured/archived screen that used to be its own pane.
            { id: 'categories', label: CONCEPT_LABEL.categories },
            { id: 'groups', label: CONCEPT_LABEL.groups },
            { id: 'identifiers', label: CONCEPT_LABEL.identifiers },
            { id: 'moderators', label: CONCEPT_LABEL.moderators },
            { id: 'reassign', label: CONCEPT_LABEL.reassign },
        ],
    },
];
```

Add the import `import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';`.

Simplify `itemVisible` — the `standards` carve-out moves to the detail screen (Task 11):

```ts
function itemVisible(
    groupId: NavGroupId,
    itemId: NavItemId,
    flags: NavFlags,
): boolean {
    if (itemId === 'reassign') return flags.canReassign;
    if (itemId === 'moderators') return flags.canEditMods;
    if (groupId === 'moderate') return flags.canModerate;
    // The category index is readable by any moderator — it is how they reach
    // Minimum time, which moderators may see. Section-level gating lives on
    // the detail screen.
    if (itemId === 'categories') return flags.canConfigure || flags.canModerate;
    return flags.canConfigure;
}
```

Delete `resolveCategoryId` entirely.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts"`
Expected: PASS. Typecheck will still fail — consumers are fixed in Task 5.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts" "app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts"
git commit -m "refactor(console): two nav groups, category-scoped items removed"
```

---

### Task 5: Delete the sidebar picker and its prop chain

**Files:**
- Modify: `.../console/console-sidebar.tsx`
- Modify: `.../console/console-chrome.tsx`
- Modify: `.../console/subroute-chrome.tsx`
- Modify: `.../console/console-shell.tsx`

**Interfaces:**
- Consumes: Task 4's `NavItem` without `categoryScoped`.
- Produces: `ConsoleSidebar`, `ConsoleChrome` and `SubrouteChrome` with no `categories` / `selectedCategoryId` / `onSelectCategory` props.

- [ ] **Step 1: Strip the sidebar**

In `console-sidebar.tsx`: delete the `categories`, `selectedCategoryId` and `onSelectCategory` props; delete the `activeIsCategoryScoped` const (`:75-77`) and the entire picker block (`:85-110`). In `NAV_ICON`, delete the six removed keys and rename `'categories-visibility'` to `'categories'`, keeping `Eye`. Add `categories: Collection` — no: `Collection` is already `groups`. Use `ListUl` for `categories` and add it to the import list.

- [ ] **Step 2: Strip the two chromes**

In `console-chrome.tsx` and `subroute-chrome.tsx`: delete the same three props from the `Props` interface, from the destructure, and from the `<ConsoleSidebar …>` call.

- [ ] **Step 3: Strip the shell**

In `console-shell.tsx`:
- delete `handleSelectCategory` entirely (the block at `:365-373`);
- delete the `categoryOptions` memo;
- in `handleNavigate`, replace the trailing block with:

```ts
        // Every other pane switch is a real destination, not a normalization —
        // push so Back retraces panes one switch at a time.
        router.push(`?pane=${id}`, { scroll: false });
        setActiveItem(id);
```

- delete `selectedCategoryId` / `setSelectedCategoryId` state and every remaining reference, including the props passed to `ConsoleChrome`.

Leave `selectedCategory` if `content-router` still needs it at this point; Task 13 removes it.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: remaining errors only in `content-router.tsx` (six deleted `NavItemId` cases) and `manage/page.tsx`. Those are Tasks 6 and 13. If any *other* file errors, fix it here.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/"
git commit -m "refactor(console): remove the sidebar category picker and its prop chain"
```

---

### Task 6: Routing and back-compat

**Files:**
- Modify: `.../console/console-shell.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/categories/page.tsx:9`
- Create: `src/lib/console/legacy-panes.ts`
- Test: `src/lib/console/__tests__/legacy-panes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `legacyPaneRedirect(pane, cat)` returning `{ kind: 'detail'; categoryId: number; hash: string } | { kind: 'pane'; pane: string } | null`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/console/__tests__/legacy-panes.test.ts
import { describe, expect, it } from 'vitest';
import { legacyPaneRedirect } from '../legacy-panes';

describe('legacyPaneRedirect', () => {
    it('sends a category-scoped pane with a category to the detail screen', () => {
        expect(legacyPaneRedirect('rules', '12')).toEqual({
            kind: 'detail',
            categoryId: 12,
            hash: 'rules',
        });
    });

    it('maps every retired pane id to its section anchor', () => {
        for (const [pane, hash] of [
            ['standards', 'standards'],
            ['timing', 'timing'],
            ['rules', 'rules'],
            ['variables', 'variables'],
            ['combinations', 'combinations'],
            ['category-settings', 'category-settings'],
        ] as const) {
            expect(legacyPaneRedirect(pane, '3')).toEqual({
                kind: 'detail',
                categoryId: 3,
                hash,
            });
        }
    });

    it('sends a category-scoped pane without a category to the index', () => {
        expect(legacyPaneRedirect('rules', null)).toEqual({
            kind: 'pane',
            pane: 'categories',
        });
    });

    it('renames the old visibility pane', () => {
        expect(legacyPaneRedirect('categories-visibility', null)).toEqual({
            kind: 'pane',
            pane: 'categories',
        });
    });

    it('ignores a non-numeric category', () => {
        expect(legacyPaneRedirect('rules', 'abc')).toEqual({
            kind: 'pane',
            pane: 'categories',
        });
    });

    it('leaves current panes alone', () => {
        expect(legacyPaneRedirect('attention', null)).toBeNull();
        expect(legacyPaneRedirect('groups', '4')).toBeNull();
        expect(legacyPaneRedirect(null, null)).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/console/__tests__/legacy-panes.test.ts`
Expected: FAIL — cannot resolve `../legacy-panes`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/console/legacy-panes.ts
// Deep links from before the category IA change — bookmarks, the four
// /manage/moderation/* redirects, and per-game localStorage last-pane values.

const RETIRED_CATEGORY_PANES: ReadonlySet<string> = new Set([
    'standards',
    'timing',
    'rules',
    'variables',
    'combinations',
    'category-settings',
]);

export type LegacyRedirect =
    | { kind: 'detail'; categoryId: number; hash: string }
    | { kind: 'pane'; pane: string };

export function legacyPaneRedirect(
    pane: string | null,
    cat: string | null,
): LegacyRedirect | null {
    if (!pane) return null;
    if (pane === 'categories-visibility') {
        return { kind: 'pane', pane: 'categories' };
    }
    if (!RETIRED_CATEGORY_PANES.has(pane)) return null;

    const categoryId = cat ? Number.parseInt(cat, 10) : Number.NaN;
    if (!Number.isFinite(categoryId)) {
        return { kind: 'pane', pane: 'categories' };
    }
    return { kind: 'detail', categoryId, hash: pane };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/console/__tests__/legacy-panes.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Wire it into the shell**

In `console-shell.tsx`, inside the existing mount effect that reads `?pane=` (the one that calls `resolveInitialPane`), run the redirect **before** resolving:

```ts
    // Legacy deep links: ?pane=rules&cat=12 became /manage/category/12#rules.
    // Runs before resolveInitialPane so a stored last-pane from before the
    // change is migrated too, rather than silently falling back to default.
    useEffect(() => {
        const redirect = legacyPaneRedirect(
            searchParams.get('pane') ?? storedPane,
            searchParams.get('cat'),
        );
        if (!redirect) return;
        if (redirect.kind === 'detail') {
            router.replace(
                `/games-v2/${game.name}/manage/category/${redirect.categoryId}#${redirect.hash}`,
            );
        } else {
            router.replace(`?pane=${redirect.pane}`, { scroll: false });
        }
    }, [searchParams, storedPane, router, game.name]);
```

Also clear a retired id out of the per-game `localStorage` last-pane key at the same point, so it can't resurrect on the next visit.

- [ ] **Step 6: Repoint the categories route**

`app/(new-layout)/games-v2/[game]/manage/categories/page.tsx:9` — change `?pane=groups` to `?pane=categories`.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/console/legacy-panes.ts src/lib/console/__tests__/legacy-panes.test.ts "app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx" "app/(new-layout)/games-v2/[game]/manage/categories/page.tsx"
git commit -m "feat(console): redirect retired category panes to the detail route"
```

---

# Phase 3 — The index

### Task 7: The matrix table

**Files:**
- Create: `.../console/categories-pane/category-matrix.tsx`
- Create: `.../console/categories-pane/categories-pane.module.scss`

**Interfaces:**
- Consumes: `CategoryConfigRow`, `ColumnId`, `disagreementsByColumn` (Task 3).
- Produces: `<CategoryMatrix rows selectedIds onToggle onToggleAll gameSlug />`; `formatMinimum(ms)` exported for reuse by Task 10.

- [ ] **Step 1: Group and order the rows**

Rows render in the board's own order: groups by `sortOrder`, categories by `sortOrder` inside each, ungrouped last, archived behind a `<details>`. Write this helper at the top of the file:

```tsx
interface RowGroup {
    key: string;
    name: string | null;
    rows: CategoryConfigRow[];
}

/** Board order, not alphabetical — the console mirrors the public page. */
function groupRows(rows: CategoryConfigRow[]): RowGroup[] {
    const byGroup = new Map<string, RowGroup>();
    for (const row of rows) {
        const key = row.groupId == null ? 'ungrouped' : `g${row.groupId}`;
        let group = byGroup.get(key);
        if (!group) {
            group = { key, name: row.groupName ?? null, rows: [] };
            byGroup.set(key, group);
        }
        group.rows.push(row);
    }
    for (const group of byGroup.values()) {
        group.rows.sort(
            (a, b) =>
                (a.sortOrder || Number.MAX_SAFE_INTEGER) -
                    (b.sortOrder || Number.MAX_SAFE_INTEGER) ||
                a.display.localeCompare(b.display),
        );
    }
    // Ungrouped last — it's the leftovers bucket, not a group.
    return [...byGroup.values()].sort((a, b) =>
        a.key === 'ungrouped' ? 1 : b.key === 'ungrouped' ? -1 : 0,
    );
}
```

`sortOrder` of `0` means unset and sorts last — that is the existing convention (`types/leaderboards.types.ts:34`), so the `|| Number.MAX_SAFE_INTEGER` is load-bearing, not defensive.

- [ ] **Step 2: Render cells with the outlier marker**

```tsx
export function formatMinimum(ms: number | null): string {
    if (ms == null) return '—';
    const total = Math.round(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function proofLabel(row: CategoryConfigRow): string {
    if (!row.requireVideo) return 'none';
    return row.requireVideoTopN == null
        ? 'all'
        : `top ${row.requireVideoTopN}`;
}

function Cell({ text, differs }: { text: string; differs: boolean }) {
    return (
        <td className={styles.cell}>
            {text}
            {differs && (
                <span
                    className={styles.outlier}
                    title="Differs from the rest of the board"
                    aria-label="differs from the rest of the board"
                >
                    ▲
                </span>
            )}
        </td>
    );
}
```

Columns, in order: checkbox, name, Timing (`RTA`/`IGT` from `row.timing === 'gametime' ? 'IGT' : 'RTA'`), Minimum (`formatMinimum`), Rules (`✓`/`—`), Proof (`proofLabel`), Sub-boards (`row.subBoards`). The category name is a `<Link href={\`/games-v2/${gameSlug}/manage/category/${row.id}\`}>`.

Compute `const differs = useMemo(() => disagreementsByColumn(rows), [rows]);` once and pass `differs.timing.has(row.id)` per cell. **Do not** call `disagreementsByColumn` per row.

- [ ] **Step 3: Footer summary**

Below the table, generated from the same data — never hand-written:

```tsx
const missingRules = rows.filter(
    (r) => r.isMain && !r.archived && !r.hasRules,
).length;
```

Render `▲ differs from the rest of the board` only when any set is non-empty, and `· {missingRules} categories missing rules` only when `missingRules > 0`.

- [ ] **Step 4: Verify by typecheck**

Run: `npm run typecheck`
Expected: PASS for this file (the pane that mounts it lands in Task 8).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/categories-pane/"
git commit -m "feat(console): category matrix table with outlier markers"
```

---

### Task 8: Filters, search, and the pane shell

**Files:**
- Create: `.../console/categories-pane/categories-pane.tsx`
- Modify: `.../console/content-router.tsx`
- Modify: `.../manage/page.tsx`

**Interfaces:**
- Consumes: `CategoryMatrix` (Task 7), `buildCategoryRows` (Task 3).
- Produces: `<CategoriesPane rows gameSlug gameId canConfigure />`, and a `categoryRows: CategoryConfigRow[]` prop threaded from `page.tsx` through the shell to the content router.

- [ ] **Step 1: Build the rows server-side**

In `manage/page.tsx`, after the existing `Promise.all` that already loads `policies` and `variables` (`:160-164`), add:

```ts
    const categoryRows = buildCategoryRows({
        categories,
        policies,
        variables,
    });
```

`policies` and `variables` are currently loaded inside the `if (metadata)` branch for completeness. Hoist those two calls out of that branch so the index gets them unconditionally — a board with no metadata still has categories to show. Pass `categoryRows` to `<ConsoleShell>` and on to `ContentRouter`.

- [ ] **Step 2: Filter state**

```tsx
type Filter = 'featured' | 'all' | 'archived';

const [filter, setFilter] = useState<Filter>('featured');
const [query, setQuery] = useState('');

const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
        if (filter === 'featured' && (!r.isMain || r.archived)) return false;
        if (filter === 'archived' && !r.archived) return false;
        if (filter === 'all' && r.archived) return false;
        return !q || r.display.toLowerCase().includes(q);
    });
}, [rows, filter, query]);
```

Default is `featured` — the 900-category board is a filter problem, and featured is the set that is actually on the board.

Header line: `{featuredCount} featured · {archivedCount} archived`, both computed from `rows`, not `visible`.

- [ ] **Step 3: Clear selection when the visible set changes**

```tsx
// A bulk action must never apply to a row the mod can no longer see.
useEffect(() => {
    setSelectedIds(new Set());
}, [filter, query]);
```

- [ ] **Step 4: Mount it in the router**

In `content-router.tsx`, add:

```tsx
        case 'categories':
            return (
                <CategoriesPane
                    rows={props.categoryRows}
                    gameSlug={game.name}
                    gameId={game.id}
                    canConfigure={props.canConfigure}
                />
            );
```

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add "app/(new-layout)/games-v2/[game]/manage/"
git commit -m "feat(console): categories index pane with filters and search"
```

---

### Task 9: Selection and the bulk bar

**Files:**
- Create: `.../console/categories-pane/bulk-bar.tsx`
- Modify: `.../console/categories-pane/categories-pane.tsx`

**Interfaces:**
- Consumes: `CategoryConfigRow`.
- Produces: `<BulkBar selected onAction />` where `onAction(kind: BulkKind)` and `export type BulkKind = 'timing' | 'minimum' | 'proof' | 'rules' | 'archive'`.

- [ ] **Step 1: Selection in the pane**

```tsx
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
}, []);

const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
        prev.size === visible.length ? new Set() : new Set(visible.map((r) => r.id)),
    );
}, [visible]);
```

- [ ] **Step 2: The bar**

Renders only when `selected.length > 0`. Sticky to the bottom of the pane. Content: `{selected.length} selected`, then five buttons — `Set timing`, `Set minimum`, `Set proof`, `Copy rules from…`, `Archive`. Every button is disabled when `!canConfigure`.

The bar takes `selected: CategoryConfigRow[]` (not ids) so the dialog can show from-values without re-looking-up.

- [ ] **Step 3: Typecheck and commit**

```bash
npm run typecheck
git add "app/(new-layout)/games-v2/[game]/manage/console/categories-pane/"
git commit -m "feat(console): multi-select and bulk action bar on the category index"
```

---

### Task 10: Bulk dialogs and the write loop

**Files:**
- Create: `.../console/categories-pane/bulk-dialog.tsx`

**Interfaces:**
- Consumes: `updateTimingSettingsAction`, `updateCategorySettingsAction`, `curateCategoryAction`, `createPolicyAction`, `updatePolicyAction`; `formatMinimum` (Task 7); `toPrimaryTiming` (Task 3).
- Produces: `<BulkDialog kind selected gameSlug gameId onClose onDone />`.

**This is the task that must not reproduce audit A2.** Each branch sends exactly one field.

- [ ] **Step 1: The confirmation body**

Before any write, the dialog lists what will change and what it changes *from*. Rows already at the target value are excluded from the write and shown as "already set":

```tsx
const changing = selected.filter((r) => currentValue(r) !== target);
const unchanged = selected.length - changing.length;
```

Heading: `Set timing to IGT for {changing.length} categories?`
Each row: `{r.display} — {fromLabel(r)} → {toLabel}`.
If `unchanged > 0`, a muted line: `{unchanged} already set — they won't be touched.`
The confirm button is disabled when `changing.length === 0`.

- [ ] **Step 2: One field per action**

```tsx
async function applyOne(row: CategoryConfigRow): Promise<string | null> {
    switch (kind) {
        case 'timing': {
            // Only primaryTiming. Not hideRealTime, not showMilliseconds —
            // sending the rest is the blanket write that reverts boards.
            const res = await updateTimingSettingsAction({
                gameSlug,
                gameId,
                categoryId: row.id,
                primaryTiming: target as PrimaryTiming,
            });
            return 'error' in res ? res.error : null;
        }
        case 'proof': {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: row.id,
                requireVideo: target !== 'none',
                requireVideoTopN: typeof target === 'number' ? target : null,
            });
            return 'error' in res ? res.error : null;
        }
        case 'rules': {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: row.id,
                rules: sourceRules,
            });
            return 'error' in res ? res.error : null;
        }
        case 'archive': {
            const res = await curateCategoryAction({
                gameSlug,
                gameId,
                categoryId: row.id,
                active: false,
            });
            return 'error' in res ? res.error : null;
        }
        case 'minimum': {
            // min_time value keys are { minTimeMs, minGameTimeMs } — rtMs/gtMs
            // is rejected by the backend and nothing saves.
            const existing = policyIdByCategory.get(row.id);
            const value = { minTimeMs: target as number };
            const res = existing
                ? await updatePolicyAction(gameSlug, existing, value)
                : await createPolicyAction(gameSlug, {
                      policyType: 'min_time',
                      value,
                      categoryId: row.id,
                  });
            return 'error' in res ? res.error : null;
        }
    }
}
```

`proof` writes two fields because they are one concept and one control — `requireVideoTopN` is meaningless without `requireVideo`. That is the single deliberate exception; note it in a comment.

- [ ] **Step 3: Sequential writes with per-row results**

```tsx
const [results, setResults] = useState<Map<number, 'ok' | string>>(new Map());

async function run() {
    setBusy(true);
    for (const row of changing) {
        const error = await applyOne(row);
        setResults((prev) => new Map(prev).set(row.id, error ?? 'ok'));
    }
    setBusy(false);
    router.refresh();
}
```

Sequential, not `Promise.all`: these are writes against one game's rows, the counts are small, and a partial failure must be attributable to a row. Show a live `{done}/{changing.length}` while running. On completion, if any row failed, keep the dialog open listing the failures with their error text; only auto-close on a clean run.

`router.refresh()` is required — without it the index still shows pre-write values while the toast says it worked, which is audit B4's defect.

- [ ] **Step 4: Typecheck and commit**

```bash
npm run typecheck
git add "app/(new-layout)/games-v2/[game]/manage/console/categories-pane/"
git commit -m "feat(console): bulk edit dialogs that write one field per action"
```

---

# Phase 4 — The detail route

### Task 11: The detail route and section rail

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/category/[categoryId]/page.tsx`
- Create: `.../category/[categoryId]/category-detail.tsx`
- Create: `.../category/[categoryId]/category-detail.module.scss`

**Interfaces:**
- Consumes: `SubrouteChrome` (Task 5 shape), `CONCEPT_LABEL` (Task 1), the six existing section components.
- Produces: the route. Task 13 deletes the panes it replaces.

- [ ] **Step 1: The server page**

Mirror `manage/moderation/roster/page.tsx` for auth and chrome. Resolve the game, resolve categories, find the one matching `params.categoryId`; `notFound()` if absent. Compute the same `NavFlags` as `manage/page.tsx:69-77`. Render `<SubrouteChrome activeItem="categories">` around `<CategoryDetail>`.

- [ ] **Step 2: Section list gated by permission**

```tsx
const SECTIONS = [
    { id: 'variables', requires: 'configure' },
    { id: 'combinations', requires: 'configure' },
    { id: 'timing', requires: 'configure' },
    { id: 'proof', requires: 'configure' },
    // Minimum time is visible to any moderator — it is the carve-out that
    // used to live in nav-model's itemVisible.
    { id: 'standards', requires: 'moderate' },
    { id: 'rules', requires: 'configure' },
    { id: 'category-settings', requires: 'configure' },
] as const;

const visibleSections = SECTIONS.filter((s) =>
    s.requires === 'moderate' ? canModerate : canConfigure,
);
```

Order is wizard order (variables 4, then step 5's four headings in their own order), so setup muscle memory transfers.

- [ ] **Step 3: Sticky rail, heading, prev/next**

The rail lists `visibleSections` with `CONCEPT_LABEL[s.id]`, each an `<a href="#id">`. Mark the current one with `aria-current="true"` driven by an `IntersectionObserver` over the section elements.

Header: `‹ Categories` back link to `?pane=categories`, `<h1>{category.display}</h1>`, and prev/next links stepping through the **board order** array passed from the page — a mod configuring five categories in a row must not return to the index between them.

Each section is `<section id={s.id} tabIndex={-1}>` so the anchor lands focus for keyboard users.

- [ ] **Step 4: Typecheck and commit**

```bash
npm run typecheck
git add "app/(new-layout)/games-v2/[game]/manage/category/"
git commit -m "feat(console): category detail route with section rail"
```

---

### Task 12: Extract Proof & review

**Files:**
- Create: `.../manage/category-tab/proof-section.tsx`
- Modify: `.../manage/category-tab/category-settings-section.tsx`

**Interfaces:**
- Consumes: `updateCategorySettingsAction`.
- Produces: `<ProofSection gameSlug gameId category />`.

- [ ] **Step 1: Move the fields**

Move the `videoPolicy` state machine (`category-settings-section.tsx:44-47`), its save branch (`:142-145`) and the corresponding form controls into `proof-section.tsx`. It saves `requireVideo` + `requireVideoTopN` and nothing else.

Heading: `<h2 className="h5 mb-1">Proof & review</h2>` — matching the wizard's `step-defaults.tsx:335`, which is where this concept is named today.

- [ ] **Step 2: Remove them from Settings**

Delete the same fields from `category-settings-section.tsx` and change its heading from `Category Settings` to `Settings` (`:200`) to match `CONCEPT_LABEL['category-settings']`.

- [ ] **Step 3: Verify nothing else rendered them**

Run: `grep -rn "requireVideo" "app/(new-layout)/games-v2/[game]/manage/"`
Expected: hits only in `proof-section.tsx`, `page.tsx`'s `requireVideoAnywhere`, and the bulk dialog.

- [ ] **Step 4: Typecheck and commit**

```bash
npm run typecheck
git add "app/(new-layout)/games-v2/[game]/manage/category-tab/"
git commit -m "feat(console): Proof & review becomes its own section"
```

---

### Task 13: Retire the six panes

**Files:**
- Modify: `.../console/content-router.tsx`
- Modify: `.../manage/game-tab/game-tab.tsx`
- Modify: `.../console/console-shell.tsx`

- [ ] **Step 1: Delete the cases**

Remove the `standards`, `timing`, `rules`, `variables`, `combinations` and `category-settings` cases from `content-router.tsx` (`:115-176`), along with the now-unused `selectedCategory` prop, the `Placeholder` imports they used, and `categories-visibility` from the `GameTab` case group.

- [ ] **Step 2: Drop the visibility section from GameTab**

In `game-tab.tsx`, remove `'categories-visibility'` from `GameTabSection` and `SECTION_ANCHOR` (`:13-22`) and delete the section it rendered — featured/archived now lives on the index as a column and the Archive bulk action.

- [ ] **Step 3: Drop the remaining category state**

Remove `selectedCategory` and anything left feeding it from `console-shell.tsx`.

- [ ] **Step 4: Typecheck and full test run**

```bash
npm run typecheck
npx vitest run
```
Expected: both clean. This is the first point where the whole thing should compile.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/"
git commit -m "refactor(console): retire the six category-scoped panes"
```

---

# Phase 5 — Wizard reconciliation

### Task 14: One vocabulary across the seam

**Files:**
- Modify: `src/lib/setup/steps.ts`
- Modify: `app/(new-layout)/games-v2/[game]/setup/setup-rail.tsx`
- Test: `src/lib/setup/__tests__/steps.test.ts`

- [ ] **Step 1: Add the failing assertion**

```ts
it('takes every rail label from the shared vocabulary', () => {
    for (const step of SETUP_STEPS) {
        const concepts = STEP_CONCEPTS[step.id];
        if (concepts.length === 0) continue;
        expect(step.label).toBe(CONCEPT_LABEL[concepts[0]]);
    }
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/lib/setup/__tests__/steps.test.ts`
Expected: FAIL — step 5's label is `Defaults`, `CONCEPT_LABEL.timing` is `Timing`.

- [ ] **Step 3: Reconcile**

`defaults` and `exceptions` are the two steps whose label is not a single concept. Keep their rail labels (`Defaults`, `Exceptions`) and exclude them from the assertion by name, with a comment saying why: they are multi-concept steps, and the console reaches their contents through the index. Every other step's label now comes from `CONCEPT_LABEL`.

Also fix the stale `/** 1-5 … */` comment on `SetupStepMeta.num` (`steps.ts:5`) — there are seven steps.

- [ ] **Step 4: Run it**

Run: `npx vitest run src/lib/setup/__tests__/steps.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/setup/steps.ts src/lib/setup/__tests__/steps.test.ts "app/(new-layout)/games-v2/[game]/setup/setup-rail.tsx"
git commit -m "refactor(setup): wizard labels come from the shared vocabulary"
```

---

### Task 15: Wayfinding footers and the health map

**Files:**
- Modify: `src/lib/setup/health.ts:21-27`
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-*.tsx`
- Test: `src/lib/setup/__tests__/health.test.ts`

- [ ] **Step 1: Repoint `STEP_PANE`**

```ts
// Board-wide steps point at the category index, not at one arbitrary
// category — `timing` and `rules` used to be per-category panes, so a
// board-wide warning deep-linked to whichever category happened to be
// selected.
const STEP_PANE: Partial<Record<SetupStepId, string>> = {
    details: 'game-details',
    categories: 'categories',
    groups: 'groups',
    variables: 'categories',
    defaults: 'categories',
    exceptions: 'categories',
};
```

- [ ] **Step 2: Assert it**

```ts
it('never deep-links a board-wide warning to a per-category pane', () => {
    const health = computeBoardHealth({
        completeness: completenessWithBlocker('defaults'),
        attentionCreatedAts: [],
        now: 0,
    });
    expect(health.items[0].pane).toBe('categories');
});
```

Run: `npx vitest run src/lib/setup/__tests__/health.test.ts` — FAIL, then PASS after step 1.

- [ ] **Step 3: The footer**

Add to `step-header.tsx` (so all seven get it from one place) an optional footer rendered from `consoleLocationForStep(step)`:

```tsx
{location && (
    <p className="text-muted small mt-3 mb-0">
        After setup this lives in the console under{' '}
        <Link href={`/games-v2/${gameSlug}/manage?pane=${location.pane}`}>
            {location.crumb}
        </Link>
        .
    </p>
)}
```

Returns `null` for `finish`, which has no console home.

- [ ] **Step 4: Typecheck, test, commit**

```bash
npm run typecheck
npx vitest run src/lib/setup/
git add src/lib/setup/ "app/(new-layout)/games-v2/[game]/setup/"
git commit -m "feat(setup): wayfinding footers from wizard steps into the console"
```

---

# Phase 6 — Verification

### Task 16: Full verification

- [ ] **Step 1: Static checks**

```bash
npm run typecheck
npm run lint
npx vitest run
```
All three must be clean. Do not proceed on a failure — fix it.

- [ ] **Step 2: Dead reference sweep**

```bash
grep -rn "categoryScoped\|resolveCategoryId\|categories-visibility" app/ src/ --include=*.ts --include=*.tsx
grep -rn "'rt'\|\"rt\"" app/\(new-layout\)/games-v2/\[game\]/manage/ --include=*.tsx
```
Expected: no hits from the first. The second should hit nothing in the manage tree — if it does, an enum leaked past Task 3.

- [ ] **Step 3: Build**

```bash
rm -rf .next && npm run build
```
Confirm no dev server is running first (`ps -eo pid,args | grep "next dev" | grep -v grep`). Never build while one is up.

- [ ] **Step 4: Manual pass (needs a dev server — kill it when done)**

Record pass/fail for each:
1. Sidebar shows two groups, twelve items, no dropdown; it does not reflow when switching panes.
2. `?pane=categories` lists categories in board group order; featured filter is default.
3. A category whose timing differs from the rest shows `▲`; a unanimous column shows none.
4. Selecting two rows and applying a timing change updates both, and the table shows the new values without a manual reload.
5. A bulk dialog on rows already at the target says "already set" and disables confirm.
6. `?pane=rules&cat=<id>` redirects to `/manage/category/<id>#rules`.
7. `?pane=rules` with no `cat` lands on the index.
8. `/manage/moderation/rules` still works.
9. Detail screen: rail highlights on scroll, prev/next steps in board order, back link returns to the index.
10. A moderator without configure rights sees only Minimum time on the detail screen.
11. Wizard step 5 footer links to `?pane=categories`.

- [ ] **Step 5: Push**

```bash
git push -u origin <branch>
```
Do not open a PR — the user does that.

---

## Self-Review

**Spec coverage.** §1 nav model → Tasks 4, 5. §2 index → Tasks 7–10. §3 detail screen → Tasks 11, 12. §4 data → Task 3 (both hazards named in Global Constraints and asserted in tests). §5 routing → Task 6. §6 reconciliation → Tasks 14, 15. §7 code shape → the File Structure table. Testing section → Tasks 1–3, 4, 6, 14, 15 plus Task 16's manual list. The spec's "Cache gets no nav row" decision is honoured by Task 4's `ALL_GROUPS`, which has no such item.

**Placeholders.** None. Every code step carries the code; the two UI-heavy tasks (7, 11) give the load-bearing logic — grouping, ordering, marker computation, permission gating — and leave only markup arrangement to the implementer, which is the right split.

**Type consistency.** `CategoryConfigRow`, `ColumnId`, `PrimaryTiming` and `BulkKind` are used with the same names and shapes across Tasks 3, 7, 8, 9 and 10. `differingIds` (Task 2) is consumed only by `disagreementsByColumn` (Task 3). `CONCEPT_LABEL`/`STEP_CONCEPTS`/`consoleLocationForStep` (Task 1) are consumed by Tasks 4, 11, 14, 15 under those exact names. `legacyPaneRedirect` returns the discriminated union Task 6 Step 5 destructures.

**Known ordering constraint.** The tree does not typecheck between Task 4 and Task 13 — Task 4 removes nav ids that Tasks 5, 6 and 13 clean up. This is called out in Task 5 Step 4 and Task 13 Step 4. Tasks 4–13 must run in order; Phase 1 and Phase 5 are independent of that window.
