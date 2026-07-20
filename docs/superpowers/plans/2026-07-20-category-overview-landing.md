# Category-Overview Landing + Featured-Only Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Root game URL becomes a Featured-category overview (WR + stats per card); public views list Featured categories only; `active` is replaced by `archived` frontend-wide with a deploy-order-independent shim.

**Architecture:** Normalize `archived` once at the fetch edge (`games-v1.ts`), drop `active` from `ResolvedCategory` so typecheck finds every consumer. A pure `decideGameRootView()` picks redirect/empty/board/overview in `page.tsx`; the overview gets its own loader + components under `overview/`, reusing `GameHero` and a prop-narrowed `Sidebar`. Card WRs are N parallel cached `getLeaderboard` page-1/size-1 fetches.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SCSS modules (`dt` tokens + `board` mixins), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-20-category-overview-landing-design.md`

## Global Constraints

- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons.
- Styling via `dt.$*` tokens / `board.*` mixins only — no raw hex, no blur/glass/gradients (matches the new header vocabulary: flat surfaces, hairline borders).
- Public games-v2 surfaces list Featured (`isMain && !archived`) categories ONLY. Non-Featured deep links redirect to game root. Run/manual/profile surfaces unchanged.
- API request bodies keep the `active` field name (backend renames later); only frontend read-side switches to `archived`.
- Typecheck gate = no NEW errors (repo baseline 356 pre-existing in untouched legacy files). Commit per task. Branch: `category-overview-landing`.
- A failed per-card WR fetch renders the card without a WR line — never sinks the page.

---

### Task 1: `normalizeArchived` shim + shared `normalizeSlug` (TDD)

**Files:**
- Create: `src/lib/archived-flag.ts`
- Create: `src/lib/normalize-slug.ts`
- Test: `src/lib/archived-flag.test.ts`

**Interfaces:**
- Produces: `normalizeArchived(row: { active?: boolean | null; archived?: boolean | null }): boolean`; `normalizeSlug(slug: string): string`.
- Note: these are PLAIN modules (no `'use server'`) — `games-v1.ts` is a `'use server'` file and may only export async functions, so these helpers must live outside it (same trap as the `EMPTY_GAME_METADATA` incident).

- [ ] **Step 1: Write the failing test `src/lib/archived-flag.test.ts`:**

```typescript
import { describe, expect, it } from 'vitest';
import { normalizeArchived } from './archived-flag';

describe('normalizeArchived', () => {
    it('prefers the new archived field when present', () => {
        expect(normalizeArchived({ archived: true, active: true })).toBe(true);
        expect(normalizeArchived({ archived: false, active: false })).toBe(
            false,
        );
    });
    it('falls back to inverted active when archived is absent', () => {
        expect(normalizeArchived({ active: false })).toBe(true);
        expect(normalizeArchived({ active: true })).toBe(false);
    });
    it('treats null archived as absent', () => {
        expect(normalizeArchived({ archived: null, active: false })).toBe(
            true,
        );
    });
    it('defaults to not-archived when neither field exists', () => {
        expect(normalizeArchived({})).toBe(false);
        expect(normalizeArchived({ active: null })).toBe(false);
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/archived-flag.test.ts`
Expected: FAIL — cannot resolve `./archived-flag`.

- [ ] **Step 3: Implement both modules.**

`src/lib/archived-flag.ts`:

```typescript
// Transition shim for the backend's active -> archived rename: reads the
// new field when the API serves it, else inverts legacy `active`. Delete
// the fallback once the backend stops serving `active`.
export function normalizeArchived(row: {
    active?: boolean | null;
    archived?: boolean | null;
}): boolean {
    return row.archived ?? !(row.active ?? true);
}
```

`src/lib/normalize-slug.ts` (extracted so non-'use server' modules can share it; `games-v1.ts` switches to this import in Task 2):

```typescript
export function normalizeSlug(slug: string): string {
    return slug.toLowerCase().replace(/[\s-]+/g, '');
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/archived-flag.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/archived-flag.ts src/lib/normalize-slug.ts src/lib/archived-flag.test.ts
git commit -m "feat(games-v2): archived-flag shim + shared normalizeSlug"
```

---

### Task 2: `ResolvedCategory.archived` rename sweep

**Files:**
- Modify: `types/leaderboards.types.ts:18-30` (`ResolvedCategory`)
- Modify: `src/lib/games-v1.ts` (mapping + local `normalizeSlug` removal)
- Modify: every `.active` reader of `ResolvedCategory` (typecheck-driven; known list below)

**Interfaces:**
- Produces: `ResolvedCategory.archived: boolean` (non-optional — normalized at the fetch edge); `active` deleted from the type. `PageDataCategoryFlags` gains `archived?: boolean | null`.
- Consumes: `normalizeArchived`, `normalizeSlug` (Task 1).

- [ ] **Step 1: In `types/leaderboards.types.ts`, replace `active?: boolean;` in `ResolvedCategory` with:**

```typescript
    /** Normalized from API archived/active (see src/lib/archived-flag.ts). Archived = invisible everywhere. */
    archived: boolean;
```

- [ ] **Step 2: In `src/lib/games-v1.ts`:**

1. Add imports: `import { normalizeArchived } from './archived-flag';` and `import { normalizeSlug } from './normalize-slug';`. Delete the local `function normalizeSlug(...)` (lines ~46-48).
2. `PageDataCategoryFlags` becomes:

```typescript
interface PageDataCategoryFlags {
    id: number;
    isMain?: boolean;
    active?: boolean | null;
    archived?: boolean | null;
}
```

3. Both `flagsById.set(c.id, { ... })` sites store `{ isMain: c.isMain ?? false, archived: normalizeArchived(c) }` (the map's value type becomes `{ isMain: boolean; archived: boolean }`).
4. The category mapping's `active: flags?.active ?? true,` becomes `archived: flags?.archived ?? false,`.

- [ ] **Step 3: Sweep the readers.** Run `npm run typecheck` — every remaining `.active` read on a `ResolvedCategory` is now an error. Fix with these mechanical rules (`c.active !== false` → `!c.archived`; `c.active ?? true` → `!c.archived`; `c.active` (truthy use) → `!c.archived`). Known sites:

- `app/(new-layout)/games-v2/[game]/data.ts:38,40` — `filter((c) => c.active !== false)` → `filter((c) => !c.archived)`; the `selected.active !== false` guard → `!resolved.selected.archived`.
- `app/(new-layout)/games-v2/[game]/header/category-visibility.ts:51` — `(c.active ?? true)` → `!c.archived` (rule itself is rewritten in Task 3; make it compile here).
- `app/(new-layout)/games-v2/[game]/submit/page.tsx:119` — `categories.filter((c) => c.active !== false)` → `categories.filter((c) => !c.archived)` (Featured narrowing happens in Task 6, not here).
- `app/(new-layout)/games-v2/[game]/manage/page.tsx:93,174` — `c.active !== false` → `!c.archived`; `c.active && c.requireVideo` → `!c.archived && c.requireVideo`.
- `app/(new-layout)/games-v2/[game]/setup/page.tsx:82,85,86,116` and `setup/steps/step-categories.tsx:26,33,76` — same rules (`(c.active ?? true)` → `!c.archived`).
- `src/lib/setup/completeness.ts` — if `categoryFactsFromResolved` reads `.active`, apply the same rule.
- Any other file typecheck names. Do NOT touch `active` in API request bodies (`curate-category.action.ts`, `update-visibility.action.ts` `body.active`), nor non-`ResolvedCategory` row types (`categories-table.tsx` rows come from a different game-mgmt shape and keep `active` until the backend renames).

- [ ] **Step 4: Verify**

Run: `npm run typecheck` (no new errors vs 356 baseline), `npm run lint`, `npm run test`.
Expected: all clean/green (existing category-visibility tests may reference `active` in fixtures — update fixtures to `archived: false` etc. as part of this task).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(games-v2): ResolvedCategory.active -> archived with edge shim"
```

---

### Task 3: Featured-only pill band (kill fallback + overflow)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/category-visibility.ts` (rewrite)
- Modify: `app/(new-layout)/games-v2/[game]/header/category-visibility.test.ts` (rewrite expectations)
- Modify: `app/(new-layout)/games-v2/[game]/header/category-pills.tsx` (drop overflow rendering)
- Delete: `app/(new-layout)/games-v2/[game]/header/category-overflow.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/data.ts:38-40` (Featured filter)

**Interfaces:**
- Produces: `computeCategoryVisibility(categories, groups): { sections: CategorySection[] }` — `overflow` field and `selectedCategoryName` param deleted. Input contract: caller passes Featured-only categories.
- Consumes: `ResolvedCategory.archived` (Task 2).

- [ ] **Step 1: In `data.ts`, narrow the public category list to Featured:**

```typescript
    const categories = resolved.categories.filter(
        (c) => !c.archived && c.isMain,
    );
    const selected =
        resolved.selected &&
        !resolved.selected.archived &&
        resolved.selected.isMain
            ? resolved.selected
            : (categories[0] ?? null);
```

(The `categories[0]` fallback is a defensive interim only — Task 5's `decideGameRootView` gates `page.tsx` so a non-Featured `?category` redirects before this loader runs.)

- [ ] **Step 2: Rewrite `category-visibility.ts`:**

```typescript
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';

export interface CategorySection {
    id: number | null;
    name: string | null;
    pills: ResolvedCategory[];
}

export interface CategoryVisibility {
    sections: CategorySection[];
}

function byPlaytimeDesc(a: ResolvedCategory, b: ResolvedCategory): number {
    return (b.totalRunTime ?? 0) - (a.totalRunTime ?? 0);
}

/**
 * Splits the pill band into labeled group sections. Callers pass
 * Featured-only categories — the band never lists anything else (site
 * policy: non-Featured categories are not publicly viewable, so there is
 * no fallback set and no overflow/"More…" affordance anymore).
 */
export function computeCategoryVisibility(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): CategoryVisibility {
    const visible = [...categories].sort(byPlaytimeDesc);

    const usedGroupIds = new Set(
        visible.map((c) => c.groupId ?? null).filter((id) => id != null),
    );
    const trivial =
        groups.length === 0 ||
        (groups.length <= 1 && usedGroupIds.size <= 1);
    if (trivial) {
        return { sections: [{ id: null, name: null, pills: visible }] };
    }

    const byGroup = new Map<number, ResolvedCategory[]>();
    const ungrouped: ResolvedCategory[] = [];
    for (const c of visible) {
        if (c.groupId == null) ungrouped.push(c);
        else {
            const arr = byGroup.get(c.groupId) ?? [];
            arr.push(c);
            byGroup.set(c.groupId, arr);
        }
    }
    const sections: CategorySection[] = groups.map((g) => ({
        id: g.id,
        name: g.name,
        pills: (byGroup.get(g.id) ?? []).sort(byPlaytimeDesc),
    }));
    if (ungrouped.length > 0) {
        sections.push({
            id: null,
            name: null,
            pills: ungrouped.sort(byPlaytimeDesc),
        });
    }
    return { sections };
}
```

- [ ] **Step 3: Update `category-pills.tsx`:** drop the `selectedCategoryName` argument from the `computeCategoryVisibility` call (keep the prop if the highlight logic uses it for active-pill styling — only the visibility call loses it), delete the overflow/"More…" rendering block and the `category-overflow` import. Delete `category-overflow.tsx`. Verify with `grep -rn "category-overflow\|overflow" "app/(new-layout)/games-v2/[game]/header"` — no functional hits.

- [ ] **Step 4: Rewrite `category-visibility.test.ts` expectations:** tests for the fallback set and overflow are deleted; keep/adjust grouping tests (trivial single-section, multi-group sections in sortOrder, ungrouped trailing, playtime ordering within a section). All fixture categories get `archived: false` and `isMain: true`.

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test` — green, no new errors.

```bash
git add -A
git commit -m "feat(games-v2): pill band lists Featured categories only"
```

---

### Task 4: `decideGameRootView` (TDD)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/root-view.ts`
- Test: `app/(new-layout)/games-v2/[game]/root-view.test.ts`

**Interfaces:**
- Produces:

```typescript
export type RootViewDecision =
    | { view: 'redirect' }
    | { view: 'empty' }
    | { view: 'overview'; featured: ResolvedCategory[] }
    | { view: 'board'; category: ResolvedCategory };

export function decideGameRootView(
    categories: ResolvedCategory[],
    categoryParam: string | undefined,
): RootViewDecision;
```

- Consumes: `normalizeSlug` (Task 1), `ResolvedCategory.archived` (Task 2).

- [ ] **Step 1: Write the failing test `root-view.test.ts`:**

```typescript
import { describe, expect, it } from 'vitest';
import type { ResolvedCategory } from '../../../../types/leaderboards.types';
import { decideGameRootView } from './root-view';

function cat(over: Partial<ResolvedCategory>): ResolvedCategory {
    return {
        id: 1,
        name: 'any',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        isMain: true,
        ...over,
    };
}

describe('decideGameRootView', () => {
    const anyPct = cat({ id: 1, name: 'any', display: 'Any%' });
    const hundred = cat({ id: 2, name: '100', display: '100%' });
    const junk = cat({ id: 3, name: 'junkcat', isMain: false });
    const dead = cat({ id: 4, name: 'oldcat', archived: true });

    it('param resolving to a Featured category -> board', () => {
        expect(decideGameRootView([anyPct, hundred, junk], '100')).toEqual({
            view: 'board',
            category: hundred,
        });
    });
    it('param matching is slug-normalized (case/spaces/dashes)', () => {
        expect(decideGameRootView([anyPct], 'ANY')).toEqual({
            view: 'board',
            category: anyPct,
        });
    });
    it('param naming a non-Featured category -> redirect', () => {
        expect(decideGameRootView([anyPct, junk], 'junkcat')).toEqual({
            view: 'redirect',
        });
    });
    it('param naming an archived category -> redirect', () => {
        expect(decideGameRootView([anyPct, dead], 'oldcat')).toEqual({
            view: 'redirect',
        });
    });
    it('param naming an unknown category -> redirect', () => {
        expect(decideGameRootView([anyPct], 'nope')).toEqual({
            view: 'redirect',
        });
    });
    it('no param, multiple Featured -> overview with only Featured', () => {
        expect(decideGameRootView([anyPct, hundred, junk], undefined)).toEqual(
            { view: 'overview', featured: [anyPct, hundred] },
        );
    });
    it('no param, exactly one Featured -> that board directly', () => {
        expect(decideGameRootView([anyPct, junk, dead], undefined)).toEqual({
            view: 'board',
            category: anyPct,
        });
    });
    it('no param, zero Featured -> empty', () => {
        expect(decideGameRootView([junk, dead], undefined)).toEqual({
            view: 'empty',
        });
    });
    it('empty param string behaves like no param', () => {
        expect(decideGameRootView([anyPct, hundred], '')).toEqual({
            view: 'overview',
            featured: [anyPct, hundred],
        });
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/root-view.test.ts"`
Expected: FAIL — cannot resolve `./root-view`.

- [ ] **Step 3: Implement `root-view.ts`:**

```typescript
import { normalizeSlug } from '~src/lib/normalize-slug';
import type { ResolvedCategory } from '../../../../types/leaderboards.types';

export type RootViewDecision =
    | { view: 'redirect' }
    | { view: 'empty' }
    | { view: 'overview'; featured: ResolvedCategory[] }
    | { view: 'board'; category: ResolvedCategory };

/**
 * The game root's render decision. Site policy: only Featured
 * (isMain && !archived) categories are publicly viewable — anything else
 * requested via ?category redirects to the game root (never 404s, so old
 * shared links degrade gracefully). Without a param: 0 Featured -> empty
 * state, 1 -> straight to that board (an overview of one card is noise),
 * 2+ -> overview.
 */
export function decideGameRootView(
    categories: ResolvedCategory[],
    categoryParam: string | undefined,
): RootViewDecision {
    const featured = categories.filter((c) => !c.archived && c.isMain);

    if (categoryParam) {
        const norm = normalizeSlug(categoryParam);
        const match = featured.find((c) => c.name === norm);
        return match
            ? { view: 'board', category: match }
            : { view: 'redirect' };
    }

    if (featured.length === 0) return { view: 'empty' };
    if (featured.length === 1) {
        return { view: 'board', category: featured[0] };
    }
    return { view: 'overview', featured };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/root-view.test.ts"`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/root-view.ts" "app/(new-layout)/games-v2/[game]/root-view.test.ts"
git commit -m "feat(games-v2): decideGameRootView policy helper"
```

---

### Task 5: Overview loader, components, Sidebar prop narrowing

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/overview/data.ts`
- Create: `app/(new-layout)/games-v2/[game]/overview/overview-page.tsx`
- Create: `app/(new-layout)/games-v2/[game]/overview/category-card.tsx`
- Create: `app/(new-layout)/games-v2/[game]/overview/overview.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/sidebar.tsx` (narrow props)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx` (Sidebar call site)

**Interfaces:**
- Consumes: `decideGameRootView`'s `featured` list (Task 4), `GameHero` props (`game, stats, gameMeta, categorySlug, subcategoryKey, canManage, canModerate, claim`), `getLeaderboard` from `~src/lib/leaderboards-v1`, `getQuickStats`/`getRecentPbs` from `~src/lib/games-v1`, `getGameMetadata`/`EMPTY_GAME_METADATA`, `getUserRankingsByName`, `buildBoardHref`/`buildSubmitHref` from `~src/lib/board-url`, `CountryFlag`, `relativeDate`, `formatRunDate`, `DurationToFormatted`, `UserLink`.
- Produces:

```typescript
export interface OverviewCardData {
    category: ResolvedCategory;
    /** Rank-1 entry of the category's default board; null = fetch failed or empty board. */
    wrEntry: LeaderboardEntry | null;
}
export interface GameOverviewData {
    game: ResolvedGame;
    gameMeta: GameMetadata;
    quickStats: QuickStats;
    groups: ResolvedGroup[];
    cards: OverviewCardData[];
    recentPbs: RecentPb[];
    yourRuns: UserRanking[];
    sessionUsername: string | null;
}
export async function loadGameOverviewData(
    game: ResolvedGame,
    featured: ResolvedCategory[],
    groups: ResolvedGroup[],
    sessionUsername: string | null,
): Promise<GameOverviewData>;
```

- `Sidebar` props become: `{ game: { name: string; display: string }; yourRuns: UserRanking[]; recentPbs: RecentPb[]; claim?: ClaimCtaState | null }`.

- [ ] **Step 1: Narrow `Sidebar` props** (`sidebar/sidebar.tsx`): replace `data: GamePageData` with the narrowed shape above; body references become `game.display` / `game.name` / `yourRuns` / `recentPbs`. Update the call site in `game-page.tsx` (`<Sidebar data={data} claim={claim} />` → `<Sidebar game={data.game} yourRuns={data.yourRuns} recentPbs={data.recentPbs} claim={claim} />` — both call sites if the no-categories branch renders it).

- [ ] **Step 2: Write `overview/data.ts`:**

```typescript
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { getQuickStats, getRecentPbs } from '~src/lib/games-v1';
import {
    getLeaderboard,
    getUserRankingsByName,
} from '~src/lib/leaderboards-v1';
import type { GameMetadata } from '~src/lib/game-mgmt';
import type {
    LeaderboardEntry,
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    UserRanking,
} from '../../../../../types/leaderboards.types';

export interface OverviewCardData {
    category: ResolvedCategory;
    /** Rank-1 entry of the category's default board; null = fetch failed or empty board. */
    wrEntry: LeaderboardEntry | null;
}

export interface GameOverviewData {
    game: ResolvedGame;
    gameMeta: GameMetadata;
    quickStats: QuickStats;
    groups: ResolvedGroup[];
    cards: OverviewCardData[];
    recentPbs: RecentPb[];
    yourRuns: UserRanking[];
    sessionUsername: string | null;
}

// The card's WR is the rank-1 of the category's DEFAULT board — the exact
// board clicking the card lands on (no subcategory values, not combined,
// unverified included), so the number on the card always matches the top
// of the table behind it.
async function fetchCardWr(
    gameSlug: string,
    category: ResolvedCategory,
): Promise<LeaderboardEntry | null> {
    try {
        const res = await getLeaderboard({
            gameSlug,
            categorySlug: category.name,
            subcategoryValues: {},
            combined: false,
            verified: false,
            page: 1,
            pageSize: 1,
            varFilters: {},
            timing: category.primaryTiming,
        });
        if (!res.ok) return null;
        const entry = res.result.entries[0] ?? null;
        return entry && entry.rank === 1 && entry.time !== null ? entry : null;
    } catch {
        return null;
    }
}

export async function loadGameOverviewData(
    game: ResolvedGame,
    featured: ResolvedCategory[],
    groups: ResolvedGroup[],
    sessionUsername: string | null,
): Promise<GameOverviewData> {
    const [quickStats, gameMeta, recentPbs, rawYourRuns, wrEntries] =
        await Promise.all([
            getQuickStats(game.id).catch(() => ({
                totalRunTime: 0,
                totalAttemptCount: 0,
                totalFinishedAttemptCount: 0,
                uniqueRunners: 0,
            })),
            getGameMetadata(game.id).catch(() => EMPTY_GAME_METADATA),
            getRecentPbs(game.id).catch(() => []),
            sessionUsername
                ? getUserRankingsByName(sessionUsername).catch(() => [])
                : Promise.resolve([]),
            Promise.all(
                featured.map((c) => fetchCardWr(game.name, c)),
            ),
        ]);

    return {
        game,
        gameMeta,
        quickStats,
        groups,
        cards: featured.map((category, i) => ({
            category,
            wrEntry: wrEntries[i],
        })),
        recentPbs,
        yourRuns: rawYourRuns.filter((r) => r.gameSlug === game.name),
        sessionUsername,
    };
}
```

- [ ] **Step 3: Write `overview/category-card.tsx`:**

```tsx
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildBoardHref, buildSubmitHref } from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import { CountryFlag } from '../leaderboard/country-flag';
import { relativeDate } from '../leaderboard/relative-date';
import styles from './overview.module.scss';
import type { OverviewCardData } from './data';

interface Props {
    gameSlug: string;
    card: OverviewCardData;
}

export function CategoryCard({ gameSlug, card }: Props) {
    const { category, wrEntry } = card;
    const boardHref = buildBoardHref(gameSlug, {
        categorySlug: category.name,
    });
    const verified = wrEntry?.verificationStatus === 'verified';

    return (
        <article className={styles.card}>
            <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>
                    <Link href={boardHref} className="stretched-link">
                        {category.display}
                    </Link>
                </h3>
                <span className={styles.cardStats}>
                    {(category.uniqueRunners ?? 0).toLocaleString()} runners ·{' '}
                    {(category.totalAttemptCount ?? 0).toLocaleString()}{' '}
                    attempts
                </span>
            </div>
            {wrEntry ? (
                <div className={styles.cardWr}>
                    <span className={styles.cardEyebrow}>
                        {verified ? 'World record' : 'Fastest time'}
                    </span>
                    <span className={styles.cardTime}>
                        <DurationToFormatted
                            duration={wrEntry.time as number}
                            withMillis={category.showMilliseconds ?? true}
                        />
                    </span>
                    <span className={styles.cardHolder}>
                        <UserLink
                            username={wrEntry.runnerName}
                            url={undefined}
                        />{' '}
                        <CountryFlag country={wrEntry.country} />
                        {wrEntry.runDate && (
                            <span
                                className={styles.cardWhen}
                                title={formatRunDate(wrEntry.runDate)}
                            >
                                {' '}
                                · {relativeDate(wrEntry.runDate)}
                            </span>
                        )}
                    </span>
                </div>
            ) : (
                <div className={styles.cardEmpty}>
                    No runs yet —{' '}
                    <Link
                        href={buildSubmitHref(gameSlug, {
                            categorySlug: category.name,
                        })}
                        className={styles.cardEmptyLink}
                    >
                        set the first record
                    </Link>
                </div>
            )}
        </article>
    );
}
```

- [ ] **Step 4: Write `overview/overview-page.tsx`:**

```tsx
import Link from '~src/components/link';
import type { ClaimCtaState } from '../claim/claim-cta';
import gamePageStyles from '../game-page.module.scss';
import { GameHero } from '../header/game-hero';
import { Sidebar } from '../sidebar/sidebar';
import { CategoryCard } from './category-card';
import styles from './overview.module.scss';
import type { GameOverviewData } from './data';
import type { ResolvedGroup } from '../../../../../types/leaderboards.types';

interface Props {
    data: GameOverviewData;
    canManage: boolean;
    canModerate: boolean;
    claim?: ClaimCtaState | null;
}

interface CardSection {
    key: string;
    name: string | null;
    cards: GameOverviewData['cards'];
}

// Group sections in group sortOrder, ungrouped trailing — the same
// ordering vocabulary as the board page's pill band.
function sectionize(
    cards: GameOverviewData['cards'],
    groups: ResolvedGroup[],
): CardSection[] {
    const byGroup = new Map<number, GameOverviewData['cards']>();
    const ungrouped: GameOverviewData['cards'] = [];
    for (const card of cards) {
        const gid = card.category.groupId ?? null;
        if (gid == null) ungrouped.push(card);
        else {
            const arr = byGroup.get(gid) ?? [];
            arr.push(card);
            byGroup.set(gid, arr);
        }
    }
    const sections: CardSection[] = [];
    for (const g of groups) {
        const arr = byGroup.get(g.id);
        if (arr?.length) {
            sections.push({ key: `g${g.id}`, name: g.name, cards: arr });
        }
    }
    if (ungrouped.length > 0) {
        sections.push({ key: 'ungrouped', name: null, cards: ungrouped });
    }
    // Single unlabeled section: skip headers entirely.
    if (sections.length === 1) sections[0].name = null;
    return sections;
}

export function GameOverviewPage({
    data,
    canManage,
    canModerate,
    claim,
}: Props) {
    const sections = sectionize(data.cards, data.groups);

    return (
        <div>
            <GameHero
                game={data.game}
                stats={data.quickStats}
                gameMeta={data.gameMeta}
                categorySlug={null}
                subcategoryKey=""
                canManage={canManage}
                canModerate={canModerate}
                claim={claim}
            />
            <div className={gamePageStyles.grid}>
                <div className={gamePageStyles.colMain}>
                    {data.cards.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyTitle}>
                                No leaderboards configured yet.
                            </p>
                            <p className={styles.emptyBody}>
                                {canManage || canModerate
                                    ? 'Mark categories as Featured in the console to publish their boards.'
                                    : 'This game has no featured leaderboards yet.'}
                            </p>
                            {(canManage || canModerate) && (
                                <Link
                                    href={`/games-v2/${data.game.name}/manage`}
                                    className={gamePageStyles.primaryAction}
                                >
                                    Open the console
                                </Link>
                            )}
                        </div>
                    ) : (
                        sections.map((s) => (
                            <section key={s.key} className={styles.section}>
                                {s.name && (
                                    <h2 className={styles.sectionTitle}>
                                        {s.name}
                                    </h2>
                                )}
                                <div className={styles.cardGrid}>
                                    {s.cards.map((card) => (
                                        <CategoryCard
                                            key={card.category.id}
                                            gameSlug={data.game.name}
                                            card={card}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))
                    )}
                </div>
                <aside className={gamePageStyles.rail}>
                    <Sidebar
                        game={data.game}
                        yourRuns={data.yourRuns}
                        recentPbs={data.recentPbs}
                        claim={claim}
                    />
                </aside>
            </div>
        </div>
    );
}
```

- [ ] **Step 5: Write `overview/overview.module.scss`:**

```scss
@use '../../../styles/design-tokens' as dt;
@use '../../../styles/board' as board;

// NOTE for implementer: match the @use paths used by sibling modules
// (see leaderboard/leaderboard.module.scss's header) — adjust relative
// depth if these two lines don't resolve.

.section {
    margin-bottom: dt.$spacing-2xl;
}

.sectionTitle {
    @include board.board-eyebrow;
    margin: 0 0 dt.$spacing-md;
}

.cardGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: dt.$spacing-md;
}

.card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-md;
    padding: dt.$spacing-lg;
    border: 1px solid var(--bs-border-color);
    border-radius: dt.$radius-lg;
    transition: border-color dt.$transition-fast;

    &:hover {
        border-color: var(--bs-secondary-color);
    }
}

.cardHead {
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-xs;
}

.cardTitle {
    font-size: dt.$font-size-md;
    font-weight: 700;
    margin: 0;

    a {
        color: var(--bs-emphasis-color);
        text-decoration: none;
    }
}

.cardStats {
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
}

.cardWr {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
}

.cardEyebrow {
    @include board.board-eyebrow;
}

.cardTime {
    @include board.mono-time;
    font-size: dt.$font-size-xl;
    font-weight: 700;
    color: dt.$accent-gold;
}

.cardHolder {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
    // Runner link must stay clickable above the card's stretched link.
    position: relative;
    z-index: 1;
}

.cardWhen {
    color: var(--bs-tertiary-color);
}

.cardEmpty {
    margin-top: auto;
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
}

.cardEmptyLink {
    position: relative;
    z-index: 1;
}

.emptyState {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: dt.$spacing-sm;
    padding: dt.$spacing-3xl dt.$spacing-lg;
    text-align: center;
    border: 1px solid var(--bs-border-color);
    border-radius: dt.$radius-lg;
}

.emptyTitle {
    font-weight: 600;
    margin: 0;
}

.emptyBody {
    color: var(--bs-secondary-color);
    font-size: dt.$font-size-sm;
    margin: 0;
    max-width: 34rem;
}
```

- [ ] **Step 6: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test` — no new errors, green. (The overview isn't reachable yet — Task 6 wires it.)

```bash
git add -A
git commit -m "feat(games-v2): category-overview page, cards, narrowed Sidebar"
```

---

### Task 6: Wire `page.tsx` dispatcher + submit Featured filter

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/page.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/submit/page.tsx:118-119`

**Interfaces:**
- Consumes: `decideGameRootView` (Task 4), `loadGameOverviewData` + `GameOverviewPage` (Task 5), existing `loadGamePageData`/`GamePage`.

- [ ] **Step 1: Rework `GameV2Page` in `page.tsx`.** After the session gate, replace the current `loadGamePageData` block with the decision flow (claim computation stays shared; `redirect` comes from `next/navigation`):

```tsx
    const resolvedGame = await resolveGame(game);
    if (!resolvedGame) notFound();
    if (
        resolvedGame.redirectedToGameId != null &&
        resolvedGame.redirectedToSlug
    ) {
        permanentRedirect(`/games-v2/${resolvedGame.redirectedToSlug}`);
    }

    const { categories, groups } = await resolveCategory(resolvedGame.id);
    const decision = decideGameRootView(categories, sp.category);
    if (decision.view === 'redirect') {
        redirect(`/games-v2/${resolvedGame.name}`);
    }

    const ability = defineAbilityFor(session);
    const canManage = ability.can(
        'edit',
        caslSubject('category-settings', { game: resolvedGame.name }),
    );
    const canManageRuns = ability.can(
        'edit',
        caslSubject('leaderboard', { game: resolvedGame.name }),
    );

    let claim: ClaimCtaState | null = null;
    if (sessionUsername && !canManage && !canManageRuns) {
        const [mods, myClaim] = await Promise.all([
            listGameModerators(resolvedGame.id),
            getMyBoardClaim(session.id, resolvedGame.id),
        ]);
        claim = {
            gameId: resolvedGame.id,
            hasModerators: mods.length > 0,
            myClaimPending: myClaim?.status === 'pending',
        };
    }

    if (decision.view === 'overview' || decision.view === 'empty') {
        const featured =
            decision.view === 'overview' ? decision.featured : [];
        const data = await loadGameOverviewData(
            resolvedGame,
            featured,
            groups,
            sessionUsername,
        );
        return (
            <GameOverviewPage
                data={data}
                canManage={canManage}
                canModerate={canManageRuns}
                claim={claim}
            />
        );
    }

    // decision.view === 'board': load exactly as before; pass the decided
    // category slug so the loader and the decision can't diverge.
    const data = await loadGamePageData(
        game,
        { ...sp, category: decision.category.name },
        sessionUsername,
    );
    if (!data) notFound();

    return (
        <GamePage
            data={data}
            canManage={canManage}
            canManageRuns={canManageRuns}
            claim={claim}
        />
    );
```

Imports to add: `redirect` (extend the existing `next/navigation` import), `decideGameRootView` from `./root-view`, `loadGameOverviewData` from `./overview/data`, `GameOverviewPage` from `./overview/overview-page`. The old `data.game.redirectedToGameId` check moves up to `resolvedGame` (shown above) — remove the old copy. `resolveGame`/`resolveCategory` calls here are cache hits (`'use cache'`), not extra network fetches; `loadGamePageData` re-resolving internally is likewise cached.

- [ ] **Step 2: Submit page Featured filter** (`submit/page.tsx:119`):

```typescript
    const featuredCategories = categories.filter(
        (c) => !c.archived && c.isMain,
    );
```

Rename the variable's uses (`activeCategories` → `featuredCategories`). The "no categories to submit to" branch triggers on `featuredCategories.length === 0`.

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test` — no new errors, green.

```bash
git add "app/(new-layout)/games-v2/[game]/page.tsx" "app/(new-layout)/games-v2/[game]/submit/page.tsx"
git commit -m "feat(games-v2): root dispatches overview/board/empty; submit lists Featured only"
```

---

### Task 7: Console copy audit + final sweep

**Files:**
- Modify: any games-v2 UI copy still saying "active" for the archived concept (audit-driven)

- [ ] **Step 1: Copy audit.** `grep -rni "active" "app/(new-layout)/games-v2" --include="*.tsx" | grep -v activeElement | grep -v activeSection | grep -v activeFilters | grep -v isActive | grep -vi interactive` — review hits that are USER-VISIBLE COPY (labels, buttons, tooltips) describing the archived concept; they must say Featured/Archived vocabulary (e.g. `categories-table.tsx` filter labels already use Current/Archived — verify). API field names (`body.active`) and CSS/state names stay.

- [ ] **Step 2: Dead-reference sweep.** `grep -rn "category-overflow\|selectedCategoryName.*computeCategoryVisibility\|\.overflow" "app/(new-layout)/games-v2/[game]/header"` — no functional hits. `grep -rn "\.active\b" "app/(new-layout)/games-v2" --include="*.tsx" --include="*.ts" | grep -v ".test." | grep -v activeElement | grep -v activeFilters | grep -v activeSection | grep -v isActive` — remaining hits must be API-body writes or non-ResolvedCategory row types only.

- [ ] **Step 3: Full suite + cache clear**

Run: `npm run typecheck && npm run lint && npm run test`, then `rm -rf .next`.
Expected: no new typecheck errors vs 356 baseline; lint clean; all tests green.

- [ ] **Step 4: Commit + push**

```bash
git add -A && git diff --cached --quiet || git commit -m "chore(games-v2): archived-vocabulary copy audit + sweep"
git push -u origin category-overview-landing
```

(Push only — no PR.)
