# Leaderboard Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the games-v2 leaderboard hero with a flat, category-free "spec sheet" header showing game identity + IGDB metadata; move the WR crown onto the rank-1 table row.

**Architecture:** `GET /v1/games/:id` (`pageData`) already carries all IGDB fields; we widen `getGameMetadata()` picks, thread a `gameMeta` object through `loadGamePageData` → `GamePageData` → `GameHero`, and rebuild the hero markup/styles. The crown block dies; rank-1 rows in the table get a WR chip + tint, and the WR-history drawer trigger moves to the board controls band.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SCSS modules with `design-tokens`/`board` mixins, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-20-leaderboard-header-redesign-design.md`

## Global Constraints

- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons.
- All styling through `dt.$*` tokens and `board.*` mixins — no raw hex, no new blur/glass/gradient effects.
- Every new metadata field is optional at render time: missing field ⇒ element not rendered. Header floor = cover + title + stats + actions.
- No backend changes. No new dependencies.
- Each task must end with `npm run typecheck` clean; commit per task.
- Working branch: `leaderboard-header-redesign`.

---

### Task 1: Widen `GameMetadata` + `getGameMetadata`

**Files:**
- Modify: `src/lib/game-mgmt.ts:40-73`

**Interfaces:**
- Produces: `GameMetadata` with new fields `summary`, `firstReleaseDate`, `seriesDisplay`, `genres`, `igdbPlatforms`, `companies`; exported types `GameCompanyMeta`, `GameIgdbPlatformMeta`; exported const `EMPTY_GAME_METADATA: GameMetadata`.
- Consumers unchanged: `setup/page.tsx`, `manage/page.tsx` (additive fields only).

- [ ] **Step 1: Replace the `GameMetadata` block (lines 40-73) with:**

```typescript
export interface GameCompanyMeta {
    name: string;
    isDeveloper: boolean;
    isPublisher: boolean;
}

export interface GameIgdbPlatformMeta {
    name: string;
    abbreviation: string | null;
}

export interface GameMetadata {
    coverUrl: string | null;
    platforms: string[];
    releaseYear: number | null;
    discordUrl: string | null;
    configured: boolean;
    summary: string | null;
    firstReleaseDate: string | null;
    seriesDisplay: string | null;
    genres: string[];
    igdbPlatforms: GameIgdbPlatformMeta[];
    companies: GameCompanyMeta[];
}

/** Render-degrades-gracefully fallback when /v1/games/:id fails or pageData is null. */
export const EMPTY_GAME_METADATA: GameMetadata = {
    coverUrl: null,
    platforms: [],
    releaseYear: null,
    discordUrl: null,
    configured: false,
    summary: null,
    firstReleaseDate: null,
    seriesDisplay: null,
    genres: [],
    igdbPlatforms: [],
    companies: [],
};

interface GameMetadataPageData {
    game?: {
        coverUrl?: string | null;
        platforms?: string[] | null;
        releaseYear?: number | null;
        discordUrl?: string | null;
        configured?: boolean | null;
        summary?: string | null;
        firstReleaseDate?: string | null;
        seriesDisplay?: string | null;
    };
    metadata?: {
        genres?: string[] | null;
        platforms?:
            | { name?: string | null; abbreviation?: string | null }[]
            | null;
        companies?:
            | {
                  name?: string | null;
                  isDeveloper?: boolean | null;
                  isPublisher?: boolean | null;
              }[]
            | null;
    };
}

export async function getGameMetadata(gameId: number): Promise<GameMetadata> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`game-meta:${gameId}`);

    const data = await apiFetch<GameMetadataPageData | undefined>(
        `/v1/games/${gameId}`,
    );
    return {
        coverUrl: data?.game?.coverUrl ?? null,
        platforms: data?.game?.platforms ?? [],
        releaseYear: data?.game?.releaseYear ?? null,
        discordUrl: data?.game?.discordUrl ?? null,
        configured: data?.game?.configured ?? false,
        summary: data?.game?.summary || null,
        firstReleaseDate: data?.game?.firstReleaseDate ?? null,
        seriesDisplay: data?.game?.seriesDisplay ?? null,
        genres: (data?.metadata?.genres ?? []).filter(
            (g): g is string => typeof g === 'string' && g.length > 0,
        ),
        igdbPlatforms: (data?.metadata?.platforms ?? []).flatMap((p) =>
            p?.name
                ? [{ name: p.name, abbreviation: p.abbreviation ?? null }]
                : [],
        ),
        companies: (data?.metadata?.companies ?? []).flatMap((c) =>
            c?.name
                ? [
                      {
                          name: c.name,
                          isDeveloper: c.isDeveloper ?? false,
                          isPublisher: c.isPublisher ?? false,
                      },
                  ]
                : [],
        ),
    };
}
```

Note: `summary` uses `|| null` (not `??`) deliberately — prod rows carry `""` for unsynced games and the header must treat empty string as absent.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: clean exit (fields are additive; existing consumers destructure only old fields).

- [ ] **Step 3: Commit**

```bash
git add src/lib/game-mgmt.ts
git commit -m "feat(games-v2): widen GameMetadata with IGDB pageData fields"
```

---

### Task 2: Derivation helpers (`game-facts.ts`) — TDD

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/header/game-facts.ts`
- Test: `app/(new-layout)/games-v2/[game]/header/game-facts.test.ts`

**Interfaces:**
- Consumes: `GameCompanyMeta`, `GameIgdbPlatformMeta` from `~src/lib/game-mgmt` (Task 1).
- Produces:
  - `deriveReleaseYear(modYear: number | null, firstReleaseDate: string | null): string | null`
  - `derivePlatforms(modPlatforms: string[], igdbPlatforms: GameIgdbPlatformMeta[]): string | null` (cap 4, `+N` overflow)
  - `deriveDeveloper(companies: GameCompanyMeta[]): string | null`
  - `deriveGenres(genres: string[]): string | null` (cap 3)

- [ ] **Step 1: Write the failing test file `game-facts.test.ts`:**

```typescript
import { describe, expect, it } from 'vitest';
import {
    deriveDeveloper,
    deriveGenres,
    derivePlatforms,
    deriveReleaseYear,
} from './game-facts';

describe('deriveReleaseYear', () => {
    it('prefers the moderator-set year', () => {
        expect(deriveReleaseYear(1994, '2007-10-10T00:00:00.000Z')).toBe(
            '1994',
        );
    });
    it('falls back to the IGDB first release date (UTC year)', () => {
        expect(deriveReleaseYear(null, '1996-06-23T00:00:00.000Z')).toBe(
            '1996',
        );
    });
    it('returns null when neither exists', () => {
        expect(deriveReleaseYear(null, null)).toBeNull();
    });
    it('returns null for an unparseable date', () => {
        expect(deriveReleaseYear(null, 'not-a-date')).toBeNull();
    });
});

describe('derivePlatforms', () => {
    const igdb = [
        { name: 'Nintendo 64', abbreviation: 'N64' },
        { name: 'Wii U', abbreviation: 'WiiU' },
        { name: 'Wii', abbreviation: null },
    ];
    it('prefers moderator-set platforms verbatim', () => {
        expect(derivePlatforms(['SNES'], igdb)).toBe('SNES');
    });
    it('falls back to IGDB abbreviations, using name when abbreviation is null', () => {
        expect(derivePlatforms([], igdb)).toBe('N64, WiiU, Wii');
    });
    it('caps IGDB platforms at 4 with +N overflow', () => {
        const many = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => ({
            name: n,
            abbreviation: n,
        }));
        expect(derivePlatforms([], many)).toBe('A, B, C, D +2');
    });
    it('returns null when both sources are empty', () => {
        expect(derivePlatforms([], [])).toBeNull();
    });
});

describe('deriveDeveloper', () => {
    it('joins developer-flagged companies and ignores publisher-only rows', () => {
        expect(
            deriveDeveloper([
                { name: 'Gradiente', isDeveloper: false, isPublisher: true },
                {
                    name: 'Nintendo EAD',
                    isDeveloper: true,
                    isPublisher: false,
                },
            ]),
        ).toBe('Nintendo EAD');
    });
    it('joins multiple developers', () => {
        expect(
            deriveDeveloper([
                { name: 'A', isDeveloper: true, isPublisher: false },
                { name: 'B', isDeveloper: true, isPublisher: true },
            ]),
        ).toBe('A, B');
    });
    it('falls back to the first company when none is developer-flagged', () => {
        expect(
            deriveDeveloper([
                { name: 'Valve', isDeveloper: false, isPublisher: true },
            ]),
        ).toBe('Valve');
    });
    it('returns null for no companies', () => {
        expect(deriveDeveloper([])).toBeNull();
    });
});

describe('deriveGenres', () => {
    it('joins up to three genres', () => {
        expect(deriveGenres(['Platform', 'Adventure'])).toBe(
            'Platform, Adventure',
        );
    });
    it('caps at three without overflow marker', () => {
        expect(deriveGenres(['A', 'B', 'C', 'D'])).toBe('A, B, C');
    });
    it('returns null when empty', () => {
        expect(deriveGenres([])).toBeNull();
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/header/game-facts.test.ts"`
Expected: FAIL — cannot resolve `./game-facts`.

- [ ] **Step 3: Implement `game-facts.ts`:**

```typescript
import type {
    GameCompanyMeta,
    GameIgdbPlatformMeta,
} from '~src/lib/game-mgmt';

// Header facts derivation: moderator-set values always beat IGDB values,
// and every helper returns null for "hide this fact" (spec §1).

const PLATFORM_CAP = 4;
const GENRE_CAP = 3;

export function deriveReleaseYear(
    modYear: number | null,
    firstReleaseDate: string | null,
): string | null {
    if (modYear != null) return String(modYear);
    if (!firstReleaseDate) return null;
    const year = new Date(firstReleaseDate).getUTCFullYear();
    return Number.isFinite(year) ? String(year) : null;
}

export function derivePlatforms(
    modPlatforms: string[],
    igdbPlatforms: GameIgdbPlatformMeta[],
): string | null {
    if (modPlatforms.length > 0) return modPlatforms.join(', ');
    if (igdbPlatforms.length === 0) return null;
    const names = igdbPlatforms.map((p) => p.abbreviation ?? p.name);
    const shown = names.slice(0, PLATFORM_CAP).join(', ');
    const overflow = names.length - PLATFORM_CAP;
    return overflow > 0 ? `${shown} +${overflow}` : shown;
}

export function deriveDeveloper(companies: GameCompanyMeta[]): string | null {
    const developers = companies.filter((c) => c.isDeveloper);
    if (developers.length > 0) {
        return developers.map((c) => c.name).join(', ');
    }
    return companies[0]?.name ?? null;
}

export function deriveGenres(genres: string[]): string | null {
    if (genres.length === 0) return null;
    return genres.slice(0, GENRE_CAP).join(', ');
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/header/game-facts.test.ts"`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/header/game-facts.ts" "app/(new-layout)/games-v2/[game]/header/game-facts.test.ts"
git commit -m "feat(games-v2): header fact derivation helpers"
```

---

### Task 3: Thread `gameMeta` through `GamePageData`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/types.ts`
- Modify: `app/(new-layout)/games-v2/[game]/data.ts`

**Interfaces:**
- Consumes: `getGameMetadata`, `EMPTY_GAME_METADATA`, `GameMetadata` (Task 1).
- Produces: `GamePageData.gameMeta: GameMetadata` — non-optional, always present (fallback = `EMPTY_GAME_METADATA`). `wrEntry`/`boardIsEmpty` stay for now (removed in Task 5 so every task compiles).

- [ ] **Step 1: In `types.ts`, add the import and field:**

```typescript
import type { GameMetadata } from '~src/lib/game-mgmt';
```

In `GamePageData`, after `quickStats: QuickStats;`:

```typescript
    /** IGDB + moderator game metadata from pageData; EMPTY_GAME_METADATA when the fetch fails. */
    gameMeta: GameMetadata;
```

- [ ] **Step 2: In `data.ts`, wire the fetch.**

Add to imports:

```typescript
import { EMPTY_GAME_METADATA, getGameMetadata } from '~src/lib/game-mgmt';
```

In the no-categories early return (`if (!selected)`), change `quickStats: await getQuickStats(game.id),` and add `gameMeta`:

```typescript
    if (!selected) {
        const [quickStats, gameMeta] = await Promise.all([
            getQuickStats(game.id),
            getGameMetadata(game.id).catch(() => EMPTY_GAME_METADATA),
        ]);
        return {
            game,
            // ... existing fields unchanged ...
            quickStats,
            gameMeta,
            // ... existing fields unchanged ...
        };
    }
```

In the main `Promise.all`, add a fifth element:

```typescript
    const [boardResult, quickStats, recentPbs, rawYourRuns, gameMeta] =
        await Promise.all([
            getLeaderboard({ ...baseQuery, timing: selected.primaryTiming }),
            getQuickStats(game.id).catch(() => ({
                totalRunTime: 0,
                totalAttemptCount: 0,
                totalFinishedAttemptCount: 0,
                uniqueRunners: 0,
            })),
            getRecentPbs(game.id).catch(() => []),
            sessionUsername
                ? getUserRankingsByName(sessionUsername).catch(() => [])
                : Promise.resolve([]),
            getGameMetadata(game.id).catch(() => EMPTY_GAME_METADATA),
        ]);
```

Add `gameMeta,` to the main return object.

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/types.ts" "app/(new-layout)/games-v2/[game]/data.ts"
git commit -m "feat(games-v2): thread gameMeta through GamePageData"
```

---

### Task 4: Rebuild `GameHero` as the spec-sheet band

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/game-hero.tsx` (full rewrite)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx` (both call sites)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss` (hero section)

**Interfaces:**
- Consumes: `GamePageData.gameMeta` (Task 3), `deriveReleaseYear`/`derivePlatforms`/`deriveDeveloper`/`deriveGenres` (Task 2).
- Produces: `GameHero` props: `{ game: ResolvedGame; stats: QuickStats; gameMeta: GameMetadata; categorySlug: string | null; subcategoryKey: string; canManage?: boolean; canModerate?: boolean; claim?: ClaimCtaState | null }`. The WR-history drawer is NOT rendered here anymore (Task 7 gives it a new home).

- [ ] **Step 1: Replace `game-hero.tsx` entirely with:**

```tsx
'use client';

import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildSubmitHref } from '~src/lib/board-url';
import type { GameMetadata } from '~src/lib/game-mgmt';
import type {
    QuickStats,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import styles from '../game-page.module.scss';
import {
    deriveDeveloper,
    deriveGenres,
    derivePlatforms,
    deriveReleaseYear,
} from './game-facts';

interface Props {
    game: ResolvedGame;
    stats: QuickStats;
    gameMeta: GameMetadata;
    /** Active category slug — submit-link context only, never displayed. */
    categorySlug: string | null;
    /** Active subcategory key — submit-link context only, never displayed. */
    subcategoryKey: string;
    canManage?: boolean;
    canModerate?: boolean;
    claim?: ClaimCtaState | null;
}

export function GameHero({
    game,
    stats,
    gameMeta,
    categorySlug,
    subcategoryKey,
    canManage,
    canModerate,
    claim,
}: Props) {
    // Carries the current board context (category + subcategory) into the
    // submit form so it preselects both — see submit/page.tsx requirement 1.
    const submitHref = buildSubmitHref(game.name, {
        categorySlug: categorySlug ?? undefined,
        subcategoryKey,
    });
    // Moderator-set cover beats the auto-matched IGDB cover.
    const cover = gameMeta.coverUrl ?? game.image;
    const facts = [
        {
            label: 'Released',
            value: deriveReleaseYear(
                gameMeta.releaseYear,
                gameMeta.firstReleaseDate,
            ),
        },
        {
            label: 'Platform',
            value: derivePlatforms(gameMeta.platforms, gameMeta.igdbPlatforms),
        },
        { label: 'Developer', value: deriveDeveloper(gameMeta.companies) },
        { label: 'Genres', value: deriveGenres(gameMeta.genres) },
    ].filter((f): f is { label: string; value: string } => f.value !== null);

    return (
        <header className={styles.hero}>
            <div className={styles.heroTop}>
                {cover && (
                    <img
                        src={cover}
                        alt={game.display}
                        width={96}
                        height={128}
                        className={styles.heroCover}
                        loading="eager"
                    />
                )}
                <div className={styles.heroText}>
                    <h1 className={styles.heroTitle}>{game.display}</h1>
                    {gameMeta.summary && (
                        <p className={styles.heroSummary}>{gameMeta.summary}</p>
                    )}
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
                {facts.length > 0 && (
                    <dl className={styles.factsGrid}>
                        {facts.map((f) => (
                            <div key={f.label} className={styles.fact}>
                                <dt>{f.label}</dt>
                                <dd>{f.value}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
            <div className={styles.heroStrip}>
                <div className={styles.heroStat}>
                    <b>{stats.uniqueRunners.toLocaleString()}</b>
                    <span>Runners</span>
                </div>
                <div className={styles.heroStat}>
                    <b>{stats.totalAttemptCount.toLocaleString()}</b>
                    <span>Attempts</span>
                </div>
                <div className={styles.heroStat}>
                    <b>
                        <DurationToFormatted duration={stats.totalRunTime} />
                    </b>
                    <span>Playtime</span>
                </div>
                {gameMeta.seriesDisplay && (
                    <span className={styles.seriesNote}>
                        Part of the {gameMeta.seriesDisplay} series
                    </span>
                )}
            </div>
        </header>
    );
}
```

- [ ] **Step 2: Update both call sites in `game-page.tsx`.**

No-categories branch (lines 43-53) becomes:

```tsx
                <GameHero
                    game={data.game}
                    stats={data.quickStats}
                    gameMeta={data.gameMeta}
                    categorySlug={null}
                    subcategoryKey=""
                    canManage={canManage}
                    canModerate={canManageRuns}
                    claim={claim}
                />
```

Main branch (lines 102-114) becomes:

```tsx
                <GameHero
                    game={data.game}
                    stats={data.quickStats}
                    gameMeta={data.gameMeta}
                    categorySlug={data.selectedCategory.name}
                    subcategoryKey={subcategoryKey}
                    canManage={canManage}
                    canModerate={canManageRuns}
                    claim={claim}
                />
```

`subcategoryLabel` (line 75) is now used by nothing in the hero — keep the
`formatSubcategoryKey` call ONLY if something else references
`subcategoryLabel`; otherwise delete the variable. (`showMilliseconds` at
line 79 stays — the pager still consumes it.)

- [ ] **Step 3: Replace the hero SCSS section in `game-page.module.scss`.**

Delete these rules (lines ~129-330 region): `.hero`, `.heroBackdrop`,
`.heroScrim`, `.heroContent`, `.heroMain`, `.heroCover`, `.heroText`,
`.heroTitle`, `.heroActions`, `.glassChip`, `.crown`, `.crownHead`,
`.crownEyebrow`, `.crownTimeRow`, `.crownTime`, `.crownPending`,
`.crownMeta`, `.crownEmpty`, `@keyframes heroEnter`, `@keyframes fadeIn`,
and the `prefers-reduced-motion` block that references `.hero, .crown`.
KEEP `.primaryAction`, `.eyebrow`, `.quietLink` (shared by other module
consumers).

Insert in their place:

```scss
// ---- Hero (game identity band — flat, category-free) ----------
.hero {
    border-bottom: 1px solid var(--bs-border-color);
    margin-bottom: dt.$spacing-lg;
}

.heroTop {
    display: flex;
    gap: dt.$spacing-xl;
    align-items: stretch;
    padding: dt.$spacing-2xl 0 dt.$spacing-xl;

    @media (max-width: 991.98px) {
        flex-wrap: wrap;
        padding: dt.$spacing-xl 0 dt.$spacing-lg;
    }
}

.heroCover {
    width: 96px;
    height: 128px;
    border-radius: dt.$radius-md;
    object-fit: cover;
    flex-shrink: 0;

    @media (max-width: 991.98px) {
        width: 60px;
        height: 80px;
    }
}

.heroText {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-sm;
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

.heroSummary {
    margin: 0;
    max-width: 66ch;
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.heroActions {
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: dt.$spacing-sm;
}

// quiet action chip (Discord / Manage) — outline, no glass
.quietChip {
    display: inline-block;
    padding: dt.$badge-padding;
    border: 1px solid var(--bs-border-color);
    border-radius: dt.$badge-radius;
    font-size: dt.$font-size-sm;
    font-weight: dt.$label-font-weight;
    color: var(--bs-secondary-color);
    text-decoration: none;
    white-space: nowrap;
    transition: color dt.$transition-fast,
        border-color dt.$transition-fast;

    &:hover {
        color: var(--bs-emphasis-color);
        border-color: var(--bs-secondary-color);
    }
}

// IGDB facts grid — the "spec sheet": label-over-value pairs behind a
// hairline. Missing facts simply aren't rendered; the whole grid is
// omitted when empty (see game-hero.tsx).
.factsGrid {
    width: 300px;
    flex-shrink: 0;
    margin: 0;
    border-left: 1px solid var(--bs-border-color);
    padding-left: dt.$spacing-2xl;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: dt.$spacing-lg dt.$spacing-xl;
    align-content: center;

    @media (max-width: 991.98px) {
        width: 100%;
        border-left: 0;
        padding-left: 0;
        border-top: 1px solid var(--bs-border-color);
        padding-top: dt.$spacing-lg;
    }
}

.fact {
    min-width: 0;

    dt {
        @include board.board-eyebrow;
    }

    dd {
        margin: 2px 0 0;
        font-size: dt.$font-size-sm;
        font-weight: 600;
        color: var(--bs-emphasis-color);
        overflow-wrap: break-word;
    }
}

// Bottom strip: site stats + series note over a top hairline.
.heroStrip {
    display: flex;
    align-items: baseline;
    gap: dt.$spacing-3xl;
    flex-wrap: wrap;
    border-top: 1px solid var(--bs-border-color);
    padding: dt.$spacing-md 0;
}

.heroStat {
    display: flex;
    flex-direction: column;
    gap: 1px;

    b {
        font-size: dt.$font-size-md;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
    }

    span {
        @include board.board-eyebrow;
    }
}

.seriesNote {
    margin-left: auto;
    font-size: dt.$font-size-sm;
    color: var(--bs-tertiary-color);
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: typecheck clean. Lint clean (if lint flags the now-unused
`subcategoryLabel`/`formatSubcategoryKey`/`HourglassSplit` etc. anywhere,
delete the dead references — Step 2's note).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/header/game-hero.tsx" "app/(new-layout)/games-v2/[game]/game-page.tsx" "app/(new-layout)/games-v2/[game]/game-page.module.scss"
git commit -m "feat(games-v2): spec-sheet game header — IGDB facts, no category info"
```

---

### Task 5: Drop `wrEntry` / `boardIsEmpty` from the data layer

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/types.ts`
- Modify: `app/(new-layout)/games-v2/[game]/data.ts`

**Interfaces:**
- Produces: `GamePageData` WITHOUT `wrEntry` and `boardIsEmpty`. Nothing consumes them after Task 4 (the hero was the only consumer).

- [ ] **Step 1: Verify nothing still consumes them**

Run: `grep -rn "wrEntry\|boardIsEmpty" "app/(new-layout)/games-v2" --include="*.tsx" --include="*.ts"`
Expected: hits only in `types.ts` and `data.ts`. If anything else hits, STOP — Task 4 missed a consumer.

- [ ] **Step 2: In `types.ts`:** delete the `wrEntry` field + its doc comment and the `boardIsEmpty` field + comment from `GamePageData`. Delete `LeaderboardEntry` from the type import if now unused.

- [ ] **Step 3: In `data.ts`:** delete
  - `wrEntry: null,` and `boardIsEmpty: false,` from the no-categories return;
  - the whole crown-refetch block (comment included):

```typescript
    // The crown always needs the real rank-1 entry, even on a deep-linked
    // later page. ...
    let wrEntry = null as GamePageData['wrEntry'];
    let boardIsEmpty = false;
    if (boardResult.ok) { ... }
```

  - `wrEntry,` and `boardIsEmpty,` from the main return object.

This also removes the extra page-1 `getLeaderboard` fetch on deep-linked pages.

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/types.ts" "app/(new-layout)/games-v2/[game]/data.ts"
git commit -m "refactor(games-v2): drop crown-only wrEntry/boardIsEmpty from page data"
```

---

### Task 6: WR treatment on the rank-1 table row

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard.module.scss`

**Interfaces:**
- Consumes: existing `entry.rank`, `entry.verificationStatus`, existing `.rank1Row`/`.rank1` classes.
- Produces: visual-only change; no prop changes.

- [ ] **Step 1: Add the WR chip in `leaderboard-row.tsx`.**

In the runner cell (after `<CountryFlag country={entry.country} />`, inside `.runnerCell`):

```tsx
                    {entry.rank === 1 &&
                        entry.verificationStatus === 'verified' && (
                            <span className={styles.wrChip} aria-label="World record">
                                WR
                            </span>
                        )}
```

The verified-only condition is the crown's honesty rule carried over: a
pending rank-1 keeps its existing "pending" InfoPill and gets no WR claim.
Tied rank-1 rows each get the chip — both hold the record.

- [ ] **Step 2: Add styles in `leaderboard.module.scss`.**

Add the row tint BEFORE the `.youRow` block (equal specificity — source
order lets the you-row identity tint win on a you+WR row):

```scss
// WR row: faint gold wash under the gold spine — the crown's new home.
// Declared before .youRow so your-own-row identity wins if you hold the WR.
.rank1Row td {
    background: rgba(dt.$accent-gold, 0.05);
}
```

Add the chip next to the other pill styles (e.g. after `.tieMark`):

```scss
// "WR" chip on the verified rank-1 row (crown honesty rule: pending
// rank-1 rows keep the pending pill instead — see leaderboard-row.tsx).
.wrChip {
    @include board.board-pill(dt.$accent-gold);
    flex-shrink: 0;
}
```

(Both `dt` and `board` are already `@use`d at the top of this module.)

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx" "app/(new-layout)/games-v2/[game]/leaderboard/leaderboard.module.scss"
git commit -m "feat(games-v2): WR chip + gold wash on verified rank-1 rows"
```

---

### Task 7: WR-history button in the board controls band

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`

**Interfaces:**
- Consumes: existing `WrHistoryDrawer` (`../drawers/wr-history-drawer`, props `{ show, onHide, gameSlug, categorySlug, categoryDisplay, subcategoryKey, showMilliseconds }`), existing `styles.quietLink` class, `subcategoryKey` + `showMilliseconds` locals already computed in `GamePage`.
- Produces: "WR history" button in `.bandEnd` (after `RulesPanel`); drawer mounted at page level.

- [ ] **Step 1: Add the dynamic import + state to `game-page.tsx`.**

Top of file, with the other imports:

```tsx
import dynamic from 'next/dynamic';

const WrHistoryDrawer = dynamic(
    () => import('./drawers/wr-history-drawer').then((m) => m.WrHistoryDrawer),
    { ssr: false },
);
```

Inside `GamePage`, next to the existing `rulesOpen` state:

```tsx
    const [historyOpen, setHistoryOpen] = useState(false);
```

- [ ] **Step 2: Add the trigger + drawer.**

In `.bandEnd`, after `<RulesPanel ... />`:

```tsx
                            <button
                                type="button"
                                className={styles.quietLink}
                                onClick={() => setHistoryOpen(true)}
                            >
                                WR history
                            </button>
```

After the `.band` div closes (sibling to the `rulesOpen &&` block):

```tsx
                {historyOpen && (
                    <WrHistoryDrawer
                        show={historyOpen}
                        onHide={() => setHistoryOpen(false)}
                        gameSlug={data.game.name}
                        categorySlug={data.selectedCategory.name}
                        categoryDisplay={data.selectedCategory.display}
                        subcategoryKey={subcategoryKey}
                        showMilliseconds={showMilliseconds}
                    />
                )}
```

(Both live inside the has-categories branch, so `data.selectedCategory` is
always real here. The `useEffect` that closes rules on category change gets
a sibling line: `useEffect(() => setHistoryOpen(false), [data.selectedCategory.id]);` —
a category switch must not leave the previous category's history open.)

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/game-page.tsx"
git commit -m "feat(games-v2): WR history trigger moves to board controls"
```

---

### Task 8: Cleanup + full verification

**Files:**
- Modify: none expected — verification sweep; fix anything found.

- [ ] **Step 1: Dead-reference sweep**

Run: `grep -rn "glassChip\|heroBackdrop\|heroScrim\|crownTime\|crownMeta\|crownEyebrow\|eyebrowText\|heroMain\|heroContent" "app/(new-layout)/games-v2"`
Expected: no hits. Delete any stragglers.

- [ ] **Step 2: Full check suite**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all clean/green.

- [ ] **Step 3: Clear build cache (significant style/layout changes)**

Run: `rm -rf .next`

- [ ] **Step 4: Commit any cleanup + push the branch**

```bash
git add -A && git diff --cached --quiet || git commit -m "chore(games-v2): header redesign cleanup"
git push -u origin leaderboard-header-redesign
```

(Push only — no PR; Joey opens PRs himself.)
