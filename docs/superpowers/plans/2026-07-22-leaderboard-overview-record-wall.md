# Leaderboard Overview "Record Wall" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the game overview page as a "record wall" of emblem plaques under a tightened one-row hero, per `docs/superpowers/specs/2026-07-22-leaderboard-overview-record-wall-design.md`.

**Architecture:** Server components in `app/(new-layout)/games-v2/[game]/overview/` render plaques from a per-category top-3 fetch (`pageSize: 3`, same request count as today). A new optional `ResolvedCategory.imageUrl` flows from the pageData payload (backend handoff pending — field is optional everywhere, monogram fallback covers absence). The shared `GameHero` collapses to one row + one hairline, which also changes the board page's header.

**Tech Stack:** Next.js 16 App Router, React 19 server components, SCSS modules with `_design-tokens.scss`/`_board.scss`, Vitest.

## Global Constraints

- **Super tight (binding, from spec §2):** intra-plaque gaps `dt.$spacing-sm`/`dt.$spacing-md` max; only existing design tokens (no new font sizes/colors); the emblem is the only image inside a plaque; hover = border brighten + background lift only (no transforms, no shadows).
- Gold = `dt.$accent-gold` (#d4af37), applied only when the rank-1 entry is `verificationStatus === 'verified'`.
- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons. Unused vars prefixed `_`.
- Commits: conventional style, **no co-author line**, no PR creation (Joey opens PRs).
- All work on branch `overview-record-wall` off `main` (feature branch in main repo — no worktrees).
- **Spec amendment (surfaced to Joey):** spec §3 said "S3 presigned upload like game cover" — in reality the game cover is a plain URL input (`setup/game-details-form.tsx`). The category image follows that existing pattern: URL text field in the console.
- Backend handoff (Joey, unchanged): `categories.image_url` nullable column, `PUT /v1/games/:id/categories/:catId` accepts `imageUrl`, `/v1/games/:id` pageData serves `imageUrl` on category rows.

---

### Task 1: Data layer — top-3 card entries + `imageUrl` read path

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/overview/card-entries.ts`
- Create: `app/(new-layout)/games-v2/[game]/overview/card-entries.test.ts`
- Modify: `types/leaderboards.types.ts` (ResolvedCategory, ~line 95–118)
- Modify: `src/lib/games-v1.ts:117-123` (PageDataCategoryFlags), `:160-181` (flagsById), `:194-222` (mapping)
- Modify: `app/(new-layout)/games-v2/[game]/overview/data.ts`

**Interfaces:**
- Consumes: `LeaderboardEntry` from `types/leaderboards.types.ts` (has `rank`, `time`, `verificationStatus`, `picture`, `country`, `runnerName`, `runDate`).
- Produces: `splitCardEntries(entries: LeaderboardEntry[]): { wr: LeaderboardEntry | null; podium: LeaderboardEntry[] }`; `OverviewCardData = { category: ResolvedCategory; entries: LeaderboardEntry[] }`; `ResolvedCategory.imageUrl?: string | null`.

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull && git checkout -b overview-record-wall
```

- [ ] **Step 2: Write the failing test**

Create `app/(new-layout)/games-v2/[game]/overview/card-entries.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { splitCardEntries } from './card-entries';

function entry(rank: number, time: number | null): LeaderboardEntry {
    return {
        rank,
        time,
        runnerName: `runner${rank}`,
        runDate: null,
        verificationStatus: 'verified',
    } as LeaderboardEntry;
}

describe('splitCardEntries', () => {
    it('empty board -> no wr, no podium', () => {
        expect(splitCardEntries([])).toEqual({ wr: null, podium: [] });
    });

    it('first entry not rank 1 -> treated as empty', () => {
        expect(splitCardEntries([entry(2, 100)])).toEqual({
            wr: null,
            podium: [],
        });
    });

    it('rank-1 with null time -> treated as empty', () => {
        expect(splitCardEntries([entry(1, null)])).toEqual({
            wr: null,
            podium: [],
        });
    });

    it('single entry -> wr only, empty podium', () => {
        const e1 = entry(1, 100);
        expect(splitCardEntries([e1])).toEqual({ wr: e1, podium: [] });
    });

    it('two entries -> wr + rank 2', () => {
        const [e1, e2] = [entry(1, 100), entry(2, 110)];
        expect(splitCardEntries([e1, e2])).toEqual({ wr: e1, podium: [e2] });
    });

    it('three entries -> wr + ranks 2-3', () => {
        const [e1, e2, e3] = [entry(1, 100), entry(2, 110), entry(3, 120)];
        expect(splitCardEntries([e1, e2, e3])).toEqual({
            wr: e1,
            podium: [e2, e3],
        });
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/overview/card-entries.test.ts"`
Expected: FAIL — cannot resolve `./card-entries`.

- [ ] **Step 4: Implement `card-entries.ts`**

```typescript
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';

export interface CardEntries {
    wr: LeaderboardEntry | null;
    podium: LeaderboardEntry[];
}

// A plaque only claims a record when the board's first entry is a real
// rank-1 with a time; otherwise the whole card renders the no-runs state
// (podium suppressed with it — never show runners-up under a missing WR).
export function splitCardEntries(entries: LeaderboardEntry[]): CardEntries {
    const first = entries[0] ?? null;
    if (!first || first.rank !== 1 || first.time === null) {
        return { wr: null, podium: [] };
    }
    return { wr: first, podium: entries.slice(1, 3) };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/overview/card-entries.test.ts"`
Expected: 6 passed.

- [ ] **Step 6: Add `imageUrl` to `ResolvedCategory`**

In `types/leaderboards.types.ts`, inside `ResolvedCategory` after `groupName`:

```typescript
    /** Moderator-set emblem art (36px square render). Null/absent -> monogram tile. */
    imageUrl?: string | null;
```

- [ ] **Step 7: Thread `imageUrl` through the resolver**

In `src/lib/games-v1.ts`:

`PageDataCategoryFlags` (line ~117) gains:

```typescript
    imageUrl?: string | null;
```

The `flagsById` map type (line ~160) becomes:

```typescript
    const flagsById = new Map<
        number,
        {
            isMain: boolean;
            archived: boolean;
            sortOrder: number;
            imageUrl: string | null;
        }
    >();
```

Both `flagsById.set(...)` call sites (ungroupedCategories loop and groups loop) gain:

```typescript
            imageUrl: c.imageUrl ?? null,
```

The `categories` mapping (line ~194, after `sortOrder`) gains:

```typescript
            imageUrl: flags?.imageUrl ?? null,
```

- [ ] **Step 8: Switch `data.ts` to top-3 entries**

In `app/(new-layout)/games-v2/[game]/overview/data.ts`:

Replace `OverviewCardData` and `fetchCardWr` with:

```typescript
export interface OverviewCardData {
    category: ResolvedCategory;
    /** Top-3 of the category's default board (page 1); [] = fetch failed or empty. */
    entries: LeaderboardEntry[];
}

// The card's record is the top of the category's DEFAULT board — the exact
// board clicking the card lands on (no subcategory values, not combined,
// unverified included), so the numbers on the card always match the top
// of the table behind it. One request per category, top 3 for the podium.
async function fetchCardEntries(
    gameSlug: string,
    category: ResolvedCategory,
): Promise<LeaderboardEntry[]> {
    try {
        const res = await getLeaderboard({
            gameSlug,
            categorySlug: category.name,
            subcategoryValues: {},
            combined: false,
            verified: false,
            page: 1,
            pageSize: 3,
            varFilters: {},
            timing: category.primaryTiming,
        });
        if (!res.ok) return [];
        return res.result.entries;
    } catch {
        return [];
    }
}
```

In `loadGameOverviewData`, rename the destructured `wrEntries` to `cardEntries`, change the `Promise.all` element to `Promise.all(featured.map((c) => fetchCardEntries(game.name, c)))`, and build cards as:

```typescript
        cards: featured.map((category, i) => ({
            category,
            entries: cardEntries[i],
        })),
```

`category-card.tsx` still reads `wrEntry` and will not compile — that is expected until Task 2. Verify only the data files:

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/overview/card-entries.test.ts" && npx tsc --noEmit 2>&1 | grep -v "category-card" | grep "overview\|games-v1\|leaderboards.types" || true`
Expected: tests pass; no type errors outside `category-card.tsx`.

- [ ] **Step 9: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/overview/card-entries.ts" \
        "app/(new-layout)/games-v2/[game]/overview/card-entries.test.ts" \
        "app/(new-layout)/games-v2/[game]/overview/data.ts" \
        types/leaderboards.types.ts src/lib/games-v1.ts
git commit -m "feat(games-v2): top-3 card entries + category imageUrl read path"
```

---

### Task 2: Plaque card component

**Files:**
- Rewrite: `app/(new-layout)/games-v2/[game]/overview/category-card.tsx`
- Rewrite card styles in: `app/(new-layout)/games-v2/[game]/overview/overview.module.scss`
- No change: `overview-page.tsx` (still passes `card={card}`)

**Interfaces:**
- Consumes: `OverviewCardData` (`{ category, entries }`) and `splitCardEntries` from Task 1; `RunnerAvatar` from `../leaderboard/runner-avatar` (`{ name, picture?, size?: 'sm' | 'md' }`, client component, monogram fallback built in); `CountryFlag`, `relativeDate`, `formatRunDate`, `DurationToFormatted`, `UserLink`, `buildBoardHref`, `buildSubmitHref` — all as used by the current card.
- Produces: `CategoryCard({ gameSlug, card }: { gameSlug: string; card: OverviewCardData })` — same signature as today.

- [ ] **Step 1: Rewrite `category-card.tsx`**

```tsx
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildBoardHref, buildSubmitHref } from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import { CountryFlag } from '../leaderboard/country-flag';
import { relativeDate } from '../leaderboard/relative-date';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { splitCardEntries } from './card-entries';
import type { OverviewCardData } from './data';
import styles from './overview.module.scss';

interface Props {
    gameSlug: string;
    card: OverviewCardData;
}

export function CategoryCard({ gameSlug, card }: Props) {
    const { category, entries } = card;
    const { wr, podium } = splitCardEntries(entries);
    const boardHref = buildBoardHref(gameSlug, {
        categorySlug: category.name,
    });
    const verified = wr?.verificationStatus === 'verified';

    return (
        <article className={styles.plaque}>
            <div className={styles.plaqueHead}>
                {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={category.imageUrl}
                        alt=""
                        aria-hidden
                        width={36}
                        height={36}
                        className={styles.emblem}
                        loading="lazy"
                    />
                ) : (
                    <span aria-hidden className={styles.emblemFallback}>
                        {category.display.slice(0, 1)}
                    </span>
                )}
                <div className={styles.plaqueTitleBlock}>
                    <h3 className={styles.plaqueTitle}>
                        <Link href={boardHref} className="stretched-link">
                            {category.display}
                        </Link>
                    </h3>
                    <span className={styles.plaqueStats}>
                        {(category.uniqueRunners ?? 0).toLocaleString()} runners
                        ·{' '}
                        {(category.totalAttemptCount ?? 0).toLocaleString()}{' '}
                        attempts
                    </span>
                </div>
                {wr && (
                    <span
                        className={
                            verified ? styles.eyebrowGold : styles.eyebrowDim
                        }
                    >
                        {verified ? '◆ WR' : 'Fastest'}
                    </span>
                )}
            </div>
            {wr ? (
                <>
                    <div className={styles.recordRow}>
                        <span
                            className={
                                verified
                                    ? styles.avatarRingGold
                                    : styles.avatarRing
                            }
                        >
                            <RunnerAvatar
                                name={wr.runnerName}
                                picture={wr.picture}
                                size="md"
                            />
                        </span>
                        <div className={styles.recordText}>
                            <span
                                className={
                                    verified
                                        ? styles.recordTimeGold
                                        : styles.recordTime
                                }
                            >
                                <DurationToFormatted
                                    duration={wr.time as number}
                                    withMillis={
                                        category.showMilliseconds ?? true
                                    }
                                />
                            </span>
                            <span className={styles.recordHolder}>
                                <UserLink username={wr.runnerName} />{' '}
                                <CountryFlag country={wr.country} />
                                {wr.runDate && (
                                    <span
                                        className={styles.recordWhen}
                                        title={formatRunDate(wr.runDate)}
                                    >
                                        {' '}
                                        · {relativeDate(wr.runDate)}
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                    {podium.length > 0 && (
                        <div className={styles.podium}>
                            {podium.map((p) => (
                                <span key={p.rank} className={styles.podiumSpot}>
                                    <span className={styles.podiumRank}>
                                        {p.rank}
                                    </span>{' '}
                                    <UserLink username={p.runnerName} />{' '}
                                    <span className={styles.podiumTime}>
                                        <DurationToFormatted
                                            duration={p.time as number}
                                            withMillis={false}
                                        />
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className={styles.plaqueEmpty}>
                    No runs yet —{' '}
                    <Link
                        href={buildSubmitHref(gameSlug, {
                            categorySlug: category.name,
                        })}
                        className={styles.plaqueEmptyLink}
                    >
                        set the first record
                    </Link>
                </div>
            )}
        </article>
    );
}
```

Note: podium entries may have `time: null` in pathological data; `DurationToFormatted` receives `p.time as number` the same way the current card does for the WR. Entries past rank 1 with null times are not worth defending against here — the board itself renders them dashed.

- [ ] **Step 2: Replace card styles in `overview.module.scss`**

Keep `.section`, `.sectionTitle`, `.cardGrid` (unchanged), and the `.emptyState`/`.emptyTitle`/`.emptyBody` block (restyled in Task 5). Replace `.card` through `.cardEmptyLink` with:

```scss
// ---- Plaque (record-wall card) --------------------------------
.plaque {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-md;
    padding: dt.$spacing-md dt.$spacing-lg;
    background: var(--bs-tertiary-bg);
    border: 1px solid var(--bs-border-color);
    border-radius: dt.$radius-lg;
    transition: border-color dt.$transition-fast,
        background-color dt.$transition-fast;

    &:hover {
        border-color: var(--bs-secondary-color);
        background: var(--bs-secondary-bg);
    }
}

.plaqueHead {
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
}

.emblem {
    width: 36px;
    height: 36px;
    border-radius: dt.$radius-md;
    object-fit: cover;
    flex-shrink: 0;
}

.emblemFallback {
    width: 36px;
    height: 36px;
    border-radius: dt.$radius-md;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--bs-secondary-bg);
    color: var(--bs-tertiary-color);
    font-size: dt.$font-size-sm;
    font-weight: 700;
    text-transform: uppercase;
    user-select: none;
}

.plaqueTitleBlock {
    min-width: 0;
    flex: 1;
}

.plaqueTitle {
    font-size: dt.$font-size-md;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;

    a {
        color: var(--bs-emphasis-color);
        text-decoration: none;
    }
}

.plaqueStats {
    font-size: dt.$font-size-2xs;
    color: var(--bs-tertiary-color);
}

.eyebrowGold {
    @include board.board-eyebrow;
    color: dt.$accent-gold;
    flex-shrink: 0;
}

.eyebrowDim {
    @include board.board-eyebrow;
    flex-shrink: 0;
}

// ---- Record row ----------------------------------------------
.recordRow {
    display: flex;
    align-items: center;
    gap: dt.$spacing-md;
}

// Ring around the holder's avatar; gold only when the record is verified.
.avatarRing,
.avatarRingGold {
    display: inline-flex;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 2px var(--bs-border-color);
}

.avatarRingGold {
    box-shadow:
        0 0 0 2px dt.$accent-gold,
        0 0 0 5px rgba(dt.$accent-gold, 0.15);
}

.recordText {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.recordTime,
.recordTimeGold {
    @include board.mono-time;
    font-size: dt.$font-size-xl;
    font-weight: 700;
    line-height: 1.15;
    color: var(--bs-emphasis-color);
}

.recordTimeGold {
    color: dt.$accent-gold;
}

.recordHolder {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
    // Runner link must stay clickable above the card's stretched link.
    position: relative;
    z-index: 2;
}

.recordWhen {
    color: var(--bs-tertiary-color);
}

// ---- Podium footer -------------------------------------------
.podium {
    display: flex;
    flex-wrap: wrap;
    gap: dt.$spacing-xs dt.$spacing-lg;
    margin-top: auto;
    padding-top: dt.$spacing-sm;
    border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.6);
    font-size: dt.$font-size-2xs;
    color: var(--bs-tertiary-color);
    // Runner-up links clickable above the stretched link.
    position: relative;
    z-index: 2;
}

.podiumSpot {
    white-space: nowrap;
}

.podiumRank {
    @include board.mono-time;
    color: var(--bs-secondary-color);
}

.podiumTime {
    @include board.mono-time;
}

.plaqueEmpty {
    margin-top: auto;
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
}

.plaqueEmptyLink {
    position: relative;
    z-index: 2;
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npx vitest run "app/(new-layout)/games-v2/[game]/overview/card-entries.test.ts"`
Expected: both clean (the Task-1 `wrEntry` compile break is resolved by this rewrite).

- [ ] **Step 4: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/overview/category-card.tsx" \
        "app/(new-layout)/games-v2/[game]/overview/overview.module.scss"
git commit -m "feat(games-v2): record-wall plaque cards with emblem, avatar, podium"
```

---

### Task 3: Hero — spec sheet, tightened (shared with board page)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/game-hero.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss:118-284` (hero section)

**Interfaces:**
- Consumes: `deriveReleaseYear/derivePlatforms/deriveDeveloper/deriveGenres` from `./game-facts` (unchanged); `DurationToFormatted`; `ClaimCta`.
- Produces: `GameHero` with an **unchanged prop signature** — both `overview-page.tsx` and the board page keep working without edits.

- [ ] **Step 1: Rewrite the hero JSX**

In `game-hero.tsx`, keep imports, props, `submitHref`, `cover`, and the `facts` derivation exactly as they are. Replace the returned JSX with:

```tsx
    const factsLine = [
        ...facts.map((f) => f.value),
        gameMeta.seriesDisplay ? `Part of the ${gameMeta.seriesDisplay} series` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <header className={styles.hero}>
            <div className={styles.heroRow}>
                {cover && (
                    <img
                        src={cover}
                        alt={game.display}
                        width={64}
                        height={85}
                        className={styles.heroCover}
                        loading="eager"
                    />
                )}
                <div className={styles.heroText}>
                    <h1 className={styles.heroTitle}>{game.display}</h1>
                    {factsLine && (
                        <p className={styles.heroFactsLine}>{factsLine}</p>
                    )}
                    <p className={styles.heroStatsLine}>
                        <b>{stats.uniqueRunners.toLocaleString()}</b> runners ·{' '}
                        <b>{stats.totalAttemptCount.toLocaleString()}</b>{' '}
                        attempts ·{' '}
                        <b>
                            <DurationToFormatted
                                duration={stats.totalRunTime}
                            />
                        </b>{' '}
                        played
                    </p>
                </div>
                <div className={styles.heroActions}>
                    {claim && !claim.hasModerators && (
                        <ClaimCta claim={claim} gameDisplay={game.display} />
                    )}
                    <Link href={submitHref} className={styles.primaryAction}>
                        Submit a run
                    </Link>
                    {gameMeta.discordUrl && (
                        <a
                            href={gameMeta.discordUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.quietChip}
                        >
                            Discord
                        </a>
                    )}
                    {(canManage || canModerate) && (
                        <Link
                            href={`/games-v2/${game.name}/manage`}
                            className={styles.quietChip}
                        >
                            {canModerate ? 'Moderate' : 'Manage'}
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
```

Removed from JSX: `heroTop`, `heroSummary` (summary paragraph), `factsGrid`/`fact` (spec-sheet block), `heroStrip`/`heroStat`/`seriesNote` (stats strip). `gameMeta.summary` is no longer rendered. The facts array itself still feeds `factsLine` (values only, labels dropped).

- [ ] **Step 2: Replace the hero SCSS section**

In `game-page.module.scss`, replace everything from the `// ---- Hero` comment (line ~118) through `.seriesNote` (line ~284) — keeping `.primaryAction`, `.quietChip`, and `.quietLink` — with:

```scss
// ---- Hero (game identity — one row, one hairline) -------------
.hero {
    border-bottom: 1px solid var(--bs-border-color);
    margin-bottom: dt.$spacing-lg;
    padding: dt.$spacing-lg 0 dt.$spacing-md;
}

.heroRow {
    display: flex;
    gap: dt.$spacing-lg;
    align-items: center;

    @media (max-width: 991.98px) {
        flex-wrap: wrap;
    }
}

.heroCover {
    width: 64px;
    height: 85px;
    border-radius: dt.$radius-md;
    object-fit: cover;
    flex-shrink: 0;

    @media (max-width: 991.98px) {
        width: 48px;
        height: 64px;
    }
}

.heroText {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-xs;
}

.heroTitle {
    font-size: dt.$font-size-hero-title;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin: 0;

    @media (max-width: 991.98px) {
        font-size: dt.$font-size-2xl;
    }
}

.heroFactsLine {
    margin: 0;
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
}

.heroStatsLine {
    margin: 0;
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);

    b {
        font-weight: 650;
        color: var(--bs-emphasis-color);
        font-variant-numeric: tabular-nums;
    }
}

.heroActions {
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
    flex-shrink: 0;

    @media (max-width: 991.98px) {
        width: 100%;
    }
}
```

- [ ] **Step 3: Check for orphaned class consumers**

Run: `grep -rn "heroTop\|heroSummary\|factsGrid\|heroStrip\|heroStat\|seriesNote\|\.fact\b" "app/(new-layout)/games-v2" --include="*.tsx" --include="*.scss"`
Expected: no hits outside this diff. If any component still references a removed class, fix it before committing.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean. `game-facts.test.ts` still passes (`npx vitest run "app/(new-layout)/games-v2/[game]/header/game-facts.test.ts"`).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/header/game-hero.tsx" \
        "app/(new-layout)/games-v2/[game]/game-page.module.scss"
git commit -m "feat(games-v2): tighten GameHero to one row + one hairline"
```

---

### Task 4: Console — category image field (write path)

**Files:**
- Modify: `src/lib/category-mgmt.ts:144-157` (UpdateCategoryBody)
- Modify: `app/(new-layout)/games-v2/[game]/manage/category-tab/actions/update-category-settings.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/category-tab/category-settings-section.tsx`

**Interfaces:**
- Consumes: `ResolvedCategory.imageUrl` (Task 1); `updateCategorySettingsAction` + `UpdateCategoryBody` (existing).
- Produces: `UpdateCategoryBody.imageUrl?: string | null`; action `Input.imageUrl?: string | null`. Backend PUT already tolerates unknown fields until the handoff lands; until then the save round-trips but the read path serves null (harmless — monogram fallback).

- [ ] **Step 1: Extend `UpdateCategoryBody`**

In `src/lib/category-mgmt.ts`, add to `UpdateCategoryBody`:

```typescript
    imageUrl?: string | null;
```

- [ ] **Step 2: Extend the server action**

In `update-category-settings.action.ts`:
- Add `imageUrl?: string | null;` to `Input`.
- After the top-N validation block, add:

```typescript
    if (
        input.imageUrl != null &&
        input.imageUrl !== '' &&
        !input.imageUrl.startsWith('https://')
    ) {
        return { error: 'Image URL must start with https://.' };
    }
```

- Add to the body assembly:

```typescript
    if (input.imageUrl !== undefined) body.imageUrl = input.imageUrl;
```

- [ ] **Step 3: Add the URL field to the settings form**

In `category-settings-section.tsx`:

- `State` gains `imageUrl: string;`. `readState` returns `imageUrl: category?.imageUrl ?? ''` (and `''` in the null branch).
- Add `category?.imageUrl` to the `useEffect` dependency array.
- `dirty` gains `|| state.imageUrl.trim() !== original.imageUrl.trim()`.
- In `handleSubmit`'s `startSave` payload, add:

```typescript
                imageUrl:
                    state.imageUrl.trim() !== original.imageUrl.trim()
                        ? state.imageUrl.trim() || null
                        : undefined,
```

- In the JSX, after the "Display" `col-md-6` block, add a new row before the video-requirement section:

```tsx
                <div className="mb-3">
                    <label className="form-label small" htmlFor="catImageUrl">
                        Emblem image URL
                    </label>
                    <input
                        type="url"
                        id="catImageUrl"
                        className="form-control form-control-sm"
                        placeholder="https://…"
                        value={state.imageUrl}
                        onChange={(e) =>
                            setState((s) => ({
                                ...s,
                                imageUrl: e.target.value,
                            }))
                        }
                        disabled={busy}
                    />
                    <div className="form-text small">
                        Square, iconic art — renders at 36px on the game page.
                        A boss face or item beats a screenshot. Leave empty for
                        the default letter tile.
                    </div>
                </div>
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/category-mgmt.ts \
        "app/(new-layout)/games-v2/[game]/manage/category-tab/actions/update-category-settings.action.ts" \
        "app/(new-layout)/games-v2/[game]/manage/category-tab/category-settings-section.tsx"
git commit -m "feat(games-v2): category emblem image URL in console settings"
```

---

### Task 5: Empty state restyle + full verification

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/overview/overview.module.scss` (emptyState block)

**Interfaces:**
- Consumes: everything above. No new interfaces.

- [ ] **Step 1: Restyle the empty state onto the plaque surface**

Replace the `.emptyState` rule (keep `.emptyTitle`/`.emptyBody` as-is):

```scss
.emptyState {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: dt.$spacing-sm;
    padding: dt.$spacing-3xl dt.$spacing-lg;
    text-align: center;
    background: var(--bs-tertiary-bg);
    border: 1px solid var(--bs-border-color);
    border-radius: dt.$radius-lg;
}
```

- [ ] **Step 2: Full verification sweep**

Run, expecting all clean:

```bash
npm run typecheck
npm run lint
npm run test
```

- [ ] **Step 3: Commit and push branch**

```bash
git add "app/(new-layout)/games-v2/[game]/overview/overview.module.scss"
git commit -m "feat(games-v2): empty state on plaque surface"
git push -u origin overview-record-wall
```

Do **not** open a PR — Joey opens PRs.

- [ ] **Step 4: Browser pass (manual, with Joey or via dev server)**

`npm run dev`, then check on a game with 2+ Featured categories:
- Overview desktop + mobile widths: plaque grid, group sections, sidebar rail.
- Verified record (gold time, gold `◆ WR`, gold avatar ring) vs unverified (`Fastest`, neutral).
- No-image emblems (letter tile) on every card — the day-one common case.
- A card with 0 runs ("set the first record"), 1 entry (no footer), 2 entries (rank 2 only).
- Runner links + podium links clickable; whole card navigates to the board.
- Console: set an emblem URL on a category, save, confirm it appears (requires backend handoff deployed; before that, confirm the form saves without error and the board still renders monograms).
- Board page: tightened hero regression (title/facts/stats/actions, mobile wrap, claim CTA).
