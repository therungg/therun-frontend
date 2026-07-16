# Leaderboard Premium Redesign ("The Crown") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the games-v2 public leaderboard page as a composed, Apple-grade surface: ambient art hero with a monumental WR ("the crown"), sticky glass control band with a Filters popover, a subtracted table (avatars, podium spines, row-as-link, exception-only status), a two-panel sticky rail, and "Show more" pagination.

**Architecture:** One CSS grid (`minmax(0,1fr) 340px`) established by a shared mixin and used by both the hero's content and the page body, so the crown column flows into the rail. All styling stays SCSS modules composing `_board.scss` mixins over `--bs-*` variables (light+dark for free). New client behavior is minimal: a filters popover, lifted rules state, row click navigation, and a client pager that appends pages via a server action.

**Tech Stack:** Next.js 16 App Router, React 19 (compiler on), SCSS modules, Bootstrap CSS vars, `react-bootstrap-icons`, vitest.

**Spec:** `docs/superpowers/specs/2026-07-16-leaderboard-premium-redesign-design.md`

## Global Constraints

- Tokens only — use `_design-tokens.scss` values; no magic numbers, no hex outside tokens.
- No emoji anywhere; icons are `react-bootstrap-icons` only.
- Times always `mono-time` (mono + `tabular-nums`).
- Every touched surface must work in light **and** dark (`--bs-*`-derived colors only).
- `@media (prefers-reduced-motion: reduce)` disables every animation added by this plan.
- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons.
- Behavior changes are limited to the spec's four: row-as-link, hover-revealed actions, Filters popover, Show-more pagination. Everything else keeps behavior, URLs, and copy identical.
- Game art is 3:4 portrait (e.g. 96×128).
- The wizard preview (`setup/category-leaderboard-preview.tsx`) imports `lb.table`, `lb.rank`, `lb.rank1/2/3`, `lb.runner`, `lb.time` from `leaderboard.module.scss` — these class names must keep existing and keep working standalone (it renders a plain table with no pager/avatar).
- Verification commands: `npm run typecheck`, `npm run lint`, `npm run build`, `npx vitest run <file>`.
- Commits: conventional messages, no co-author line.

**Two documented deviations from the spec** (layout reality, agreed direction unchanged):
1. The hero is a full-container-width **rounded card** (App-Store-card style), not viewport-bleed — the page renders inside Bootstrap `.container` (`app/(new-layout)/content.tsx`) and bleed hacks fight the scrollbar. Update the spec line in Task 10.
2. The Filters popover renders whenever there is anything to put in it (the verified toggle always exists), not only when filter variables exist. Count badge = active var filters + verified.

---

### Task 1: Tokens + shared mixins (glass, hero columns, avatar)

**Files:**
- Modify: `app/(new-layout)/styles/_design-tokens.scss`
- Modify: `app/(new-layout)/styles/_board.scss`

**Interfaces:**
- Produces (used by Tasks 4–8): SCSS tokens `dt.$font-size-hero-title`, `dt.$font-size-hero-time`, `dt.$avatar-sm`, `dt.$avatar-md`; mixins `board.board-glass`, `board.board-page-columns`, `board.board-avatar($size)`.

- [ ] **Step 1: Add tokens**

In `_design-tokens.scss`, after the `$font-size-display: 2.5rem; // hero timer` line, add:

```scss
$font-size-hero-title: 2.25rem; // game title in the board hero
$font-size-hero-time: 3rem;     // "the crown" WR numeral

// Avatars (runner monograms / profile images)
$avatar-sm: 28px;
$avatar-md: 32px;
```

- [ ] **Step 2: Add mixins to `_board.scss`**

Append at the end of the file:

```scss
// ---- Page grid ----------------------------------------------
// The board page's single grid: main column + rail. The hero's
// content and the page body both compose this so the crown column
// aligns with the rail below it.
@mixin board-page-columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    column-gap: dt.$spacing-3xl;
    align-items: start;

    @media (max-width: 991.98px) {
        grid-template-columns: minmax(0, 1fr);
    }
}

// ---- Glass ---------------------------------------------------
// Frosted material. Sanctioned uses only: hero action chips, the
// sticky control band, the rail's live panel. Never content surfaces.
@mixin board-glass {
    background: color-mix(in srgb, var(--bs-body-bg) 72%, transparent);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.4);

    @supports not (backdrop-filter: blur(1px)) {
        background: color-mix(in srgb, var(--bs-body-bg) 96%, transparent);
    }
}

// ---- Avatar monogram -----------------------------------------
// Consumer sets background-color inline (hue derived from name).
@mixin board-avatar($size: dt.$avatar-sm) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: $size;
    height: $size;
    border-radius: 50%;
    flex-shrink: 0;
    color: #fff;
    font-size: calc(#{$size} * 0.38);
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    user-select: none;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run typecheck && npm run build`
Expected: both succeed (mixins unused yet; build proves SCSS parses).

- [ ] **Step 4: Commit**

```bash
git add app/\(new-layout\)/styles/_design-tokens.scss app/\(new-layout\)/styles/_board.scss
git commit -m "feat(board): glass, page-grid and avatar primitives + hero type tokens"
```

---

### Task 2: `relativeDate` util (TDD)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/relative-date.ts`
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/relative-date.test.ts`

**Interfaces:**
- Produces: `relativeDate(iso: string, now?: Date): string` — "today" / "yesterday" / "N days ago" / "N mo ago" / "N yr ago". Used by Task 6 (row "when" cell) and Task 4 (crown meta).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { relativeDate } from './relative-date';

const NOW = new Date('2026-07-16T12:00:00Z');

describe('relativeDate', () => {
    it('same day is today', () => {
        expect(relativeDate('2026-07-16T08:00:00Z', NOW)).toBe('today');
    });
    it('one day back is yesterday', () => {
        expect(relativeDate('2026-07-15T08:00:00Z', NOW)).toBe('yesterday');
    });
    it('days under a month', () => {
        expect(relativeDate('2026-07-02T08:00:00Z', NOW)).toBe('14 days ago');
    });
    it('months under a year', () => {
        expect(relativeDate('2026-02-16T08:00:00Z', NOW)).toBe('5 mo ago');
    });
    it('years', () => {
        expect(relativeDate('2024-05-16T08:00:00Z', NOW)).toBe('2 yr ago');
    });
    it('date-only strings work', () => {
        expect(relativeDate('2026-07-15', NOW)).toBe('yesterday');
    });
    it('future or invalid dates fall back to today/empty', () => {
        expect(relativeDate('2026-07-17T08:00:00Z', NOW)).toBe('today');
        expect(relativeDate('not-a-date', NOW)).toBe('');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/leaderboard/relative-date.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
const DAY_MS = 86_400_000;

/**
 * Short relative date for board rows and the crown meta.
 * Calendar-day based ("yesterday" means the previous calendar day, UTC).
 */
export function relativeDate(iso: string, now: Date = new Date()): string {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';
    const days = Math.floor(
        (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
            Date.UTC(
                then.getUTCFullYear(),
                then.getUTCMonth(),
                then.getUTCDate(),
            )) /
            DAY_MS,
    );
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} mo ago`;
    return `${Math.floor(days / 365)} yr ago`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/leaderboard/relative-date.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/leaderboard/relative-date.*
git commit -m "feat(board): relativeDate helper for row dates and crown meta"
```

---

### Task 3: Runner monogram avatar (TDD on the hue hash)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/avatar-hue.ts`
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/runner-avatar.tsx`
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/avatar-hue.test.ts`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard.module.scss` (append)

**Interfaces:**
- Produces: `nameHue(name: string): number` (0–359, deterministic); `<RunnerAvatar name={string} size={28|32} />` — server-safe component, used by Task 6 rows. CSS classes `styles.avatar` (28px) and `styles.avatarMd` (32px).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { nameHue } from './avatar-hue';

describe('nameHue', () => {
    it('is deterministic', () => {
        expect(nameHue('Nindo')).toBe(nameHue('Nindo'));
    });
    it('stays in 0..359', () => {
        for (const n of ['a', 'Zx9', 'longer name here', '游戏']) {
            const h = nameHue(n);
            expect(h).toBeGreaterThanOrEqual(0);
            expect(h).toBeLessThan(360);
        }
    });
    it('differs for typical names', () => {
        expect(nameHue('alice')).not.toBe(nameHue('bob'));
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/leaderboard/avatar-hue.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement hash + component + styles**

`avatar-hue.ts`:

```ts
/** Deterministic hue (0–359) from a runner name — FNV-1a over UTF-16. */
export function nameHue(name: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
        h ^= name.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) % 360;
}
```

`runner-avatar.tsx` (no `'use client'` — server-safe):

```tsx
import { nameHue } from './avatar-hue';
import styles from './leaderboard.module.scss';

interface Props {
    name: string;
    size?: 'sm' | 'md';
}

function initials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`;
    return name.slice(0, 2);
}

export function RunnerAvatar({ name, size = 'sm' }: Props) {
    return (
        <span
            aria-hidden
            className={size === 'md' ? styles.avatarMd : styles.avatar}
            style={{ backgroundColor: `hsl(${nameHue(name)} 32% 42%)` }}
        >
            {initials(name)}
        </span>
    );
}
```

Append to `leaderboard.module.scss`:

```scss
// ---- Runner avatars (monogram) -------------------------------
.avatar {
    @include board.board-avatar(dt.$avatar-sm);
}

.avatarMd {
    @include board.board-avatar(dt.$avatar-md);
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/leaderboard/avatar-hue.test.ts && npm run typecheck`
Expected: 3 passed; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/leaderboard/avatar-hue.* app/\(new-layout\)/games-v2/\[game\]/leaderboard/runner-avatar.tsx app/\(new-layout\)/games-v2/\[game\]/leaderboard/leaderboard.module.scss
git commit -m "feat(board): runner monogram avatars"
```

---

### Task 4: GameHero — ambient art + the crown

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/header/game-hero.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/header/game-header.tsx` (only consumer is game-page.tsx; deletion lands in Task 5 when game-page switches over — in this task just create the new component)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss` (append hero styles)

**Interfaces:**
- Consumes: `board.board-page-columns`, `board.board-glass`, tokens from Task 1; `relativeDate` from Task 2.
- Produces: `<GameHero game stats category leaderboard subcategoryKey canManage canModerate sessionUsername claim selfClaim />` where `category: ResolvedCategory | null`, `leaderboard: LeaderboardResponse | null` (null on the no-categories page). Task 5 wires it into game-page.

- [ ] **Step 1: Create `game-hero.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useState } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    LeaderboardResponse,
    QuickStats,
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import styles from '../game-page.module.scss';
import { relativeDate } from '../leaderboard/relative-date';

const WrHistoryDrawer = dynamic(
    () => import('../drawers/wr-history-drawer').then((m) => m.WrHistoryDrawer),
    { ssr: false },
);

interface Props {
    game: ResolvedGame;
    stats: QuickStats;
    category: ResolvedCategory | null;
    leaderboard: LeaderboardResponse | null;
    subcategoryKey: string;
    canManage?: boolean;
    canModerate?: boolean;
    sessionUsername?: string | null;
    claim?: ClaimCtaState | null;
    selfClaim?: ReactNode;
}

export function GameHero({
    game,
    stats,
    category,
    leaderboard,
    subcategoryKey,
    canManage,
    canModerate,
    sessionUsername,
    claim,
    selfClaim,
}: Props) {
    const [historyOpen, setHistoryOpen] = useState(false);

    // The crown only ever shows the actual record: rank 1 on the
    // currently loaded data. On deep-linked later pages entries[0]
    // is not rank 1, so the crown falls back to its empty state.
    const top = leaderboard?.entries[0];
    const wr = top && top.rank === 1 && top.time !== null ? top : null;
    const wrHref = wr
        ? wr.source === 'manual' && wr.manualTimeId != null
            ? `/games-v2/${game.name}/manual/${wr.manualTimeId}`
            : wr.runId != null
              ? `/games-v2/${game.name}/run/${wr.runId}`
              : null
        : null;

    return (
        <header className={styles.hero}>
            {game.image ? (
                <img
                    src={game.image}
                    alt=""
                    aria-hidden
                    className={styles.heroBackdrop}
                />
            ) : null}
            <div className={styles.heroScrim} />
            <div className={styles.heroContent}>
                <div className={styles.heroMain}>
                    {game.image && (
                        <img
                            src={game.image}
                            alt={game.display}
                            width={96}
                            height={128}
                            className={styles.heroCover}
                            loading="eager"
                        />
                    )}
                    <div className={styles.heroText}>
                        <h1 className={styles.heroTitle}>{game.display}</h1>
                        <div className={styles.metaLine}>
                            <span>{stats.uniqueRunners.toLocaleString()}</span>{' '}
                            runners ·{' '}
                            <span>
                                {stats.totalAttemptCount.toLocaleString()}
                            </span>{' '}
                            attempts ·{' '}
                            <span>
                                <DurationToFormatted
                                    duration={stats.totalRunTime}
                                />
                            </span>{' '}
                            total
                        </div>
                        <div className={styles.heroActions}>
                            {claim && sessionUsername && (
                                <ClaimCta
                                    claim={claim}
                                    gameDisplay={game.display}
                                />
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
                                    className={`btn btn-sm ${styles.glassChip}`}
                                >
                                    {canModerate ? 'Moderate' : 'Manage'}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
                {category && (
                    <div
                        className={styles.crown}
                        key={`${category.id}:${subcategoryKey}`}
                    >
                        <div className={styles.crownHead}>
                            <span className={styles.eyebrow}>
                                World record — {category.display}
                            </span>
                            <button
                                type="button"
                                className={styles.quietLink}
                                onClick={() => setHistoryOpen(true)}
                            >
                                History
                            </button>
                        </div>
                        {wr ? (
                            <>
                                <div className={styles.crownTime}>
                                    {wrHref ? (
                                        <Link
                                            href={wrHref}
                                            className="text-decoration-none"
                                        >
                                            <DurationToFormatted
                                                duration={wr.time as number}
                                            />
                                        </Link>
                                    ) : (
                                        <DurationToFormatted
                                            duration={wr.time as number}
                                        />
                                    )}
                                </div>
                                <div className={styles.crownMeta}>
                                    <UserLink
                                        username={wr.runnerName}
                                        url={undefined}
                                    />
                                    {wr.runDate && (
                                        <span
                                            title={new Date(
                                                wr.runDate,
                                            ).toLocaleDateString()}
                                        >
                                            {' '}
                                            · {relativeDate(wr.runDate)}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className={styles.crownEmpty}>
                                No verified runs yet — set the first record.
                            </div>
                        )}
                    </div>
                )}
            </div>
            {historyOpen && category && (
                <WrHistoryDrawer
                    show={historyOpen}
                    onHide={() => setHistoryOpen(false)}
                    gameSlug={game.name}
                    categorySlug={category.name}
                    categoryDisplay={category.display}
                    subcategoryKey={subcategoryKey}
                />
            )}
        </header>
    );
}
```

- [ ] **Step 2: Append hero styles to `game-page.module.scss`**

```scss
// ---- Hero ("the crown") -------------------------------------
.hero {
    position: relative;
    overflow: hidden;
    border-radius: dt.$radius-xl;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.4);
    margin-bottom: dt.$spacing-lg;
    animation: heroEnter dt.$transition-slow both;
}

.heroBackdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(80px) saturate(140%);
    transform: scale(1.5);
    opacity: 0.5;
}

.heroScrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        to bottom,
        color-mix(in srgb, var(--bs-body-bg) 25%, transparent),
        color-mix(in srgb, var(--bs-body-bg) 88%, transparent)
    );
}

.heroContent {
    @include board.board-page-columns;
    position: relative;
    padding: dt.$spacing-3xl;

    @media (max-width: 991.98px) {
        padding: dt.$spacing-xl;
        row-gap: dt.$spacing-xl;
    }
}

.heroMain {
    display: flex;
    gap: dt.$spacing-xl;
    align-items: flex-start;
    min-width: 0;
}

.heroCover {
    width: 96px;
    height: 128px;
    border-radius: dt.$radius-lg;
    object-fit: cover;
    box-shadow: dt.$shadow-lg;
    flex-shrink: 0;

    @media (max-width: 991.98px) {
        width: 60px;
        height: 80px;
    }
}

.heroText {
    min-width: 0;
}

.heroTitle {
    font-size: dt.$font-size-hero-title;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin: 0 0 dt.$spacing-xs;

    @media (max-width: 991.98px) {
        font-size: dt.$font-size-2xl;
    }
}

.heroActions {
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
    margin-top: dt.$spacing-lg;
}

// quiet action over the ambience — glass instead of outline
.glassChip {
    @include board.board-glass;
    color: var(--bs-emphasis-color);
    border-radius: dt.$badge-radius;

    &:hover {
        color: var(--bs-emphasis-color);
        background: color-mix(in srgb, var(--bs-body-bg) 84%, transparent);
    }
}

.crown {
    animation: fadeIn dt.$transition-fast both;
}

.crownHead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: dt.$spacing-xs;
}

.crownTime {
    @include board.mono-time;
    font-size: dt.$font-size-hero-time;
    font-weight: 700;
    line-height: 1.1;
    color: dt.$accent-gold;

    a {
        color: inherit;

        &:hover {
            text-decoration: underline;
        }
    }

    @media (max-width: 991.98px) {
        font-size: dt.$font-size-display;
    }
}

.crownMeta {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
}

.crownEmpty {
    font-size: dt.$font-size-sm;
    color: var(--bs-secondary-color);
    max-width: 22rem;
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

@keyframes heroEnter {
    from {
        opacity: 0;
        transform: translateY(12px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@media (prefers-reduced-motion: reduce) {
    .hero,
    .crown {
        animation: none;
    }
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean (component not yet consumed).

- [ ] **Step 4: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/header/game-hero.tsx app/\(new-layout\)/games-v2/\[game\]/game-page.module.scss
git commit -m "feat(board): GameHero — ambient art hero with the crown"
```

---

### Task 5: Page grid + rail (hero wired in, sidebar slimmed)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/sidebar.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/sidebar/wr-card.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/sidebar/quick-stats-panel.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/header/game-header.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss` (append grid/rail)
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/sidebar.module.scss` (live panel glass, drop `.wrTime`)

**Interfaces:**
- Consumes: `GameHero` (Task 4), `board.board-page-columns`, `board.board-glass`.
- Produces: page structure `hero → band → rulesBody? → grid(colMain, rail)` that Tasks 6–8 modify further. `Sidebar` keeps its name and its single prop `data: GamePageData` but renders only `LivePanel` + `RecentPbsPanel`.

- [ ] **Step 1: Slim the sidebar**

Replace the body of `sidebar/sidebar.tsx` with:

```tsx
import type { GamePageData } from '../types';
import { LivePanel } from './live-panel';
import { RecentPbsPanel } from './recent-pbs-panel';

interface Props {
    data: GamePageData;
}

export function Sidebar({ data }: Props) {
    return (
        <>
            <LivePanel gameDisplay={data.game.display} />
            <RecentPbsPanel pbs={data.recentPbs} />
        </>
    );
}
```

Delete `wr-card.tsx` and `quick-stats-panel.tsx`. In `sidebar.module.scss`, delete the `.wrTime` block (now unused) and add a glass variant for the live panel plus rail stickiness helpers:

```scss
// the "now" element gets the glass material
.panelGlass {
    @include board.board-glass;
    border-radius: dt.$radius-lg;
    padding: dt.$spacing-lg;
    margin-bottom: dt.$spacing-lg;
}
```

Then in `sidebar/live-panel.tsx`, change its root `className={styles.panel}` to `className={styles.panelGlass}` (read the file first; it is a small panel component using `styles.panel` — only the root class changes).

- [ ] **Step 2: Rewire game-page.tsx**

Replace the `GameHeader` import/usage with `GameHero`, and the Bootstrap `row`/`col-lg-*` with the grid. The full new return for the categories-present branch (rules state is added in Task 6 — for now keep `<RulesPanel …/>` where shown):

```tsx
const subcategoryKey = data.activeFilters.combined
    ? ''
    : Object.keys(data.activeFilters.subcategoryValues)
          .sort()
          .map((k) => `${k}=${data.activeFilters.subcategoryValues[k]}`)
          .join('|');

return (
    <div>
        <GameHero
            game={data.game}
            stats={data.quickStats}
            category={data.selectedCategory}
            leaderboard={data.invalidCombination ? null : data.leaderboard}
            subcategoryKey={subcategoryKey}
            canManage={canManage}
            canModerate={canManageRuns}
            sessionUsername={data.sessionUsername}
            claim={claim}
            selfClaim={/* unchanged SelfClaimButton block */}
        />
        <div className={styles.band}>{/* unchanged band contents */}</div>
        <RulesPanel
            rules={data.selectedCategory.rules}
            categoryId={data.selectedCategory.id}
        />
        <div className={styles.grid}>
            <div className={styles.colMain}>
                {/* unchanged invalidCombination / table / pagination block */}
            </div>
            <aside className={styles.rail}>
                <Sidebar data={data} />
            </aside>
        </div>
    </div>
);
```

The no-categories branch becomes:

```tsx
<div>
    <GameHero
        game={data.game}
        stats={data.quickStats}
        category={null}
        leaderboard={null}
        subcategoryKey=""
        canManage={canManage}
        canModerate={canManageRuns}
        sessionUsername={data.sessionUsername}
        claim={claim}
    />
    <div className={styles.notice}>
        <p className="text-muted mb-0">No runs uploaded for this game yet.</p>
    </div>
</div>
```

Delete `header/game-header.tsx` and remove the old `.header`, `.cover`, `.title`, `.actions` rules from `game-page.module.scss` (keep `.metaLine` — the hero uses it).

- [ ] **Step 3: Append grid styles to `game-page.module.scss`**

```scss
// ---- Page grid ----------------------------------------------
.grid {
    @include board.board-page-columns;
}

.colMain {
    min-width: 0;
}

.rail {
    @media (min-width: 992px) {
        position: sticky;
        top: dt.$spacing-lg;
        align-self: start;
    }
}
```

(The rail's sticky `top` is refined to clear the sticky band in Task 6.)

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all green; no remaining references to `GameHeader`, `WrCard`, `QuickStatsPanel` (`grep -rn "GameHeader\|WrCard\|QuickStatsPanel" app/\(new-layout\)/games-v2` returns nothing).

- [ ] **Step 5: Commit**

```bash
git add -A app/\(new-layout\)/games-v2/\[game\]
git commit -m "feat(board): composed page grid — hero wired in, rail slimmed to live + recent"
```

---

### Task 6: Sticky glass band, Filters popover, rules in the band

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/filters/filters-popover.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/filter-bar.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/rules/rules-panel.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss`

**Interfaces:**
- Consumes: existing `VariablePills`, `VerifiedToggle`, `SubcategoryPills` (logic untouched), `board.board-glass`.
- Produces: `<FiltersPopover defs selectedVarFilters verified />`; `RulesPanel` gains controlled props `{ rules, open, onToggle }` and exports `RulesBody({ rules })`; band DOM: row 1 = categories + end-cluster (Filters, Rules), row 2 = subcategory pills only.

- [ ] **Step 1: Create `filters-popover.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Sliders } from 'react-bootstrap-icons';
import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { VariablePills } from './variable-pills';
import { VerifiedToggle } from './verified-toggle';

interface Props {
    defs: VariableDef[];
    selectedVarFilters: Record<string, string>;
    verified: boolean;
}

export function FiltersPopover({ defs, selectedVarFilters, verified }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const filterDefs = defs.filter((d) => d.role === 'filter');
    const count =
        Object.keys(selectedVarFilters).length + (verified ? 1 : 0);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div className={styles.popoverRoot} ref={rootRef}>
            <button
                type="button"
                className={`${styles.pill} ${count > 0 ? styles.pillActive : ''}`}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <Sliders size={13} aria-hidden />
                Filters
                {count > 0 && (
                    <span className={styles.filterCount}>{count}</span>
                )}
            </button>
            {open && (
                <div
                    className={styles.popoverPanel}
                    role="dialog"
                    aria-label="Filters"
                >
                    {filterDefs.length > 0 && (
                        <VariablePills
                            defs={filterDefs}
                            selected={selectedVarFilters}
                        />
                    )}
                    <VerifiedToggle verified={verified} />
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Slim `filter-bar.tsx` to subcategories only**

```tsx
import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { SubcategoryPills } from './subcategory-pills';

interface Props {
    defs: VariableDef[];
    selectedSubcategoryValues: Record<string, string>;
}

export function FilterBar({ defs, selectedSubcategoryValues }: Props) {
    const hasSubcategories = defs.some((d) => d.role === 'subcategory');
    if (!hasSubcategories) return null;

    return (
        <div className={`${styles.bandRow} ${styles.bandRowSub}`}>
            <SubcategoryPills
                defs={defs}
                selected={selectedSubcategoryValues}
            />
        </div>
    );
}
```

(Read `subcategory-pills.tsx` first; if it already self-hides without subcategory defs, keep the guard anyway — it prevents an empty hairline row.)

- [ ] **Step 3: Make `RulesPanel` controlled and export `RulesBody`**

```tsx
'use client';

import { ChevronDown, ChevronRight } from 'react-bootstrap-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../game-page.module.scss';

const EXCERPT_LIMIT = 80;

function buildExcerpt(text: string): string {
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > EXCERPT_LIMIT
        ? `${oneLine.slice(0, EXCERPT_LIMIT - 1)}…`
        : oneLine;
}

export function RulesPanel({
    rules,
    open,
    onToggle,
}: {
    rules: string | null | undefined;
    open: boolean;
    onToggle: () => void;
}) {
    if (!rules || rules.trim().length === 0) return null;

    return (
        <button
            type="button"
            className={styles.rulesToggle}
            onClick={onToggle}
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
    );
}

export function RulesBody({ rules }: { rules: string }) {
    return (
        <div className={styles.rulesBody}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rules}</ReactMarkdown>
        </div>
    );
}
```

- [ ] **Step 4: Rewire the band in `game-page.tsx`**

Add state + effect (mirrors the old panel's reset-on-category-change):

```tsx
const [rulesOpen, setRulesOpen] = useState(false);
// biome-ignore lint/correctness/useExhaustiveDependencies: reset on category switch only
useEffect(() => setRulesOpen(false), [data.selectedCategory.id]);
```

Band block becomes:

```tsx
<div className={styles.band}>
    <div className={styles.bandRow}>
        <CategoryPills
            categories={data.categories}
            groups={data.groups}
            selectedCategoryName={data.selectedCategory.name}
            variableKeys={variableKeys}
        />
        <div className={styles.bandEnd}>
            <FiltersPopover
                defs={data.variables}
                selectedVarFilters={data.activeFilters.varFilters}
                verified={data.activeFilters.verified}
            />
            <RulesPanel
                rules={data.selectedCategory.rules}
                open={rulesOpen}
                onToggle={() => setRulesOpen((o) => !o)}
            />
        </div>
    </div>
    <FilterBar
        defs={data.variables}
        selectedSubcategoryValues={data.activeFilters.subcategoryValues}
    />
</div>
{rulesOpen && data.selectedCategory.rules && (
    <RulesBody rules={data.selectedCategory.rules} />
)}
```

Note `CategoryPills` renders its own internal rows — it sits inside `bandRow` next to `bandEnd`; give the wrapping row `justify-content: space-between` via `.bandRow` staying flex + `.bandEnd { margin-left: auto }`.

- [ ] **Step 5: Band styles in `game-page.module.scss`**

Replace the existing `.band` rule with, and add the new classes:

```scss
.band {
    @include board.board-glass;
    border-radius: dt.$radius-lg;
    padding: dt.$spacing-sm dt.$spacing-lg;
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-xs;
    margin-bottom: dt.$spacing-lg;
    position: sticky;
    top: dt.$spacing-sm;
    z-index: 20;
}

.bandEnd {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: dt.$spacing-xs;
    flex-shrink: 0;
}

.popoverRoot {
    position: relative;
}

.popoverPanel {
    @include board.board-surface(dt.$spacing-md dt.$spacing-lg);
    position: absolute;
    right: 0;
    top: calc(100% + #{dt.$spacing-xs});
    z-index: 30;
    background: var(--bs-body-bg);
    box-shadow: dt.$shadow-lg;
    min-width: 16rem;
    display: flex;
    flex-direction: column;
    gap: dt.$spacing-sm;
}

.filterCount {
    @include board.mono-time;
    font-size: dt.$font-size-2xs;
    background: rgba(var(--bs-primary-rgb), 0.15);
    border-radius: 999px;
    padding: 0 0.4rem;
}
```

And refine the rail clearance in the same file (from Task 5): change `.rail`'s `top: dt.$spacing-lg;` to `top: 5rem;` so it clears the one-row sticky band.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: green. `grep -n "VerifiedToggle\|VariablePills" app/\(new-layout\)/games-v2/\[game\]/filters/filter-bar.tsx` returns nothing (they now live in the popover).

- [ ] **Step 7: Commit**

```bash
git add -A app/\(new-layout\)/games-v2/\[game\]
git commit -m "feat(board): sticky glass control band with Filters popover, rules toggle in band"
```

---

### Task 7: Table subtraction — avatars, podium, row-as-link, exception-only status

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard.module.scss`

**Interfaces:**
- Consumes: `RunnerAvatar` (Task 3), `relativeDate` (Task 2).
- Produces: `LeaderboardTable` props unchanged (`leaderboard, sessionUsername, canManage, gameSlug, variableKeys`) — Task 8's pager wraps it without modification. New row classes `rank1Row/rank2Row/rank3Row`, `reveal`, `when`.

- [ ] **Step 1: Update the header row in `leaderboard-table.tsx`**

Replace the `<thead>` contents with:

```tsx
<tr>
    <th className={styles.rank}>#</th>
    <th>Runner</th>
    {!hideRealTime && <th>Real time</th>}
    {!hideGameTime && <th>Game time</th>}
    <th>When</th>
    <th aria-label="Video, status and actions" />
</tr>
```

- [ ] **Step 2: Rewrite `leaderboard-row.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { PlayBtn } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import styles from './leaderboard.module.scss';
import { relativeDate } from './relative-date';
import { RowActionsMenu } from './row-actions-menu';
import { RunnerAvatar } from './runner-avatar';

interface Props {
    entry: LeaderboardEntry;
    isCurrentUser: boolean;
    canManage: boolean;
    gameSlug: string;
    hideRealTime: boolean;
    hideGameTime: boolean;
    sessionUsername: string | null;
}

export function LeaderboardRow({
    entry,
    isCurrentUser,
    canManage,
    gameSlug,
    hideRealTime,
    hideGameTime,
    sessionUsername,
}: Props) {
    const router = useRouter();
    const showManageButton = canManage && entry.runId != null && !entry.isGuest;
    const detailHref =
        entry.source === 'manual' && entry.manualTimeId != null
            ? `/games-v2/${gameSlug}/manual/${entry.manualTimeId}`
            : entry.runId != null
              ? `/games-v2/${gameSlug}/run/${entry.runId}`
              : null;

    const podiumClass =
        entry.rank === 1
            ? styles.rank1Row
            : entry.rank === 2
              ? styles.rank2Row
              : entry.rank === 3
                ? styles.rank3Row
                : '';
    const rankClass =
        entry.rank === 1
            ? styles.rank1
            : entry.rank === 2
              ? styles.rank2
              : entry.rank === 3
                ? styles.rank3
                : '';

    // The whole row opens the run detail; real links/buttons inside
    // keep working (we ignore clicks that land on them).
    const onRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if (!detailHref) return;
        const target = e.target as HTMLElement;
        if (target.closest('a, button, input, [role="menu"], [role="dialog"]'))
            return;
        router.push(detailHref);
    };

    const time = (value: number | null) => (
        <td className={styles.time}>
            {value != null ? (
                detailHref ? (
                    <Link href={detailHref}>
                        <DurationToFormatted duration={value} />
                    </Link>
                ) : (
                    <DurationToFormatted duration={value} />
                )
            ) : (
                '—'
            )}
        </td>
    );

    return (
        <tr
            className={`${podiumClass} ${isCurrentUser ? styles.youRow : ''} ${detailHref ? styles.rowLink : ''}`}
            onClick={onRowClick}
        >
            <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
            <td className={styles.runner}>
                <span className={styles.runnerCell}>
                    <RunnerAvatar
                        name={entry.runnerName}
                        size={entry.rank <= 3 ? 'md' : 'sm'}
                    />
                    <UserLink username={entry.runnerName} url={undefined} />
                </span>
            </td>
            {!hideRealTime && time(entry.realTime)}
            {!hideGameTime && time(entry.gameTime)}
            <td
                className={styles.meta}
                title={
                    entry.runDate
                        ? new Date(entry.runDate).toLocaleDateString()
                        : undefined
                }
            >
                {entry.runDate ? relativeDate(entry.runDate) : ''}
            </td>
            <td className={styles.trailing}>
                {entry.source === 'manual' && (
                    <span
                        className={styles.setPill}
                        title="A moderator-set leaderboard time"
                    >
                        set time
                    </span>
                )}
                {entry.source !== 'manual' &&
                    entry.verificationStatus === 'pending' && (
                        <span className={styles.setPill}>pending</span>
                    )}
                {entry.vodUrl && (
                    <a
                        href={entry.vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.iconLink}
                        aria-label="Watch VOD"
                        title="Watch VOD"
                    >
                        <PlayBtn size={16} />
                    </a>
                )}
                <span className={styles.reveal}>
                    <RowActionsMenu
                        entry={entry}
                        sessionUsername={sessionUsername}
                        canManage={canManage}
                        gameSlug={gameSlug}
                    />
                    {showManageButton && (
                        <Link
                            href={`/games-v2/${gameSlug}/manage/run/${entry.runId}`}
                            className="btn btn-sm btn-outline-secondary"
                        >
                            Manage
                        </Link>
                    )}
                </span>
            </td>
        </tr>
    );
}
```

Delete the old `CheckCircleFill` import and the `.verified` usage.

- [ ] **Step 3: Table styles**

In `leaderboard.module.scss`, extend `.table` and add the new classes (keep `.rank`, `.rank1/2/3`, `.runner`, `.time` names — the wizard preview imports them):

```scss
.table {
    @include board.board-table;

    tbody td {
        padding: dt.$spacing-md dt.$spacing-lg;
    }

    tbody tr:last-child td {
        border-bottom: 0;
    }
}

.rowLink {
    cursor: pointer;
}

.runnerCell {
    display: inline-flex;
    align-items: center;
    gap: dt.$spacing-sm;
}

.when {
    white-space: nowrap;
}

.trailing {
    text-align: right;
    white-space: nowrap;

    > * + * {
        margin-left: dt.$spacing-sm;
    }
}

// actions are invisible at rest; revealed on hover / keyboard focus
.reveal {
    display: inline-flex;
    gap: dt.$spacing-xs;
    opacity: 0;
    transition: opacity dt.$transition-fast;
}

tr:hover .reveal,
tr:focus-within .reveal {
    opacity: 1;
}

@media (pointer: coarse) {
    .reveal {
        display: none;
    }
}

// podium rows: medal spine + heavier rank numeral
.rank1Row td:first-child {
    box-shadow: inset 3px 0 0 dt.$accent-gold;
}
.rank2Row td:first-child {
    box-shadow: inset 3px 0 0 dt.$accent-silver;
}
.rank3Row td:first-child {
    box-shadow: inset 3px 0 0 dt.$accent-bronze;
}

.rank1Row .rank,
.rank2Row .rank,
.rank3Row .rank {
    font-size: dt.$font-size-md;
    font-weight: 700;
}
```

Note: the podium selectors are declared **after** `.youRow` in the file so a podium+you row keeps the medal spine (same specificity, later source order wins) while the `.youRow` tint still applies. Move the existing `.youRow` block above these if needed. Delete the now-unused `.verified` rule.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: green. Also `grep -n "CheckCircleFill" app/\(new-layout\)/games-v2/\[game\]/leaderboard/leaderboard-row.tsx` returns nothing.

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/leaderboard
git commit -m "feat(board): table subtraction — avatars, podium spines, row-as-link, exception-only status"
```

---

### Task 8: "Show more" pagination (TDD on the merge)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/actions/fetch-page.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/merge-entries.ts`
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/merge-entries.test.ts`
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/leaderboard/pagination-bar.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard.module.scss`

**Interfaces:**
- Consumes: `getLeaderboard` + `LeaderboardQuery` from `~src/lib/leaderboards-v1`; `LeaderboardTable` (Task 7, props unchanged); `ResolvedCategory.primaryTiming`.
- Produces: `fetchLeaderboardPage(q: LeaderboardQuery): Promise<LeaderboardResponse | null>` server action; `mergeEntries(pages: LeaderboardEntry[][]): LeaderboardEntry[]`; `<LeaderboardPager initial query sessionUsername canManage gameSlug variableKeys />`.

- [ ] **Step 1: Write the failing merge test**

```ts
import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { mergeEntries } from './merge-entries';

function entry(rank: number, runId: number | null): LeaderboardEntry {
    return {
        rank,
        runnerName: `runner${rank}`,
        userId: null,
        isGuest: false,
        runId,
        time: rank * 1000,
        realTime: rank * 1000,
        gameTime: null,
        runDate: null,
        vodUrl: null,
        verificationStatus: 'verified',
        variables: null,
        source: 'run',
        manualTimeId: null,
    };
}

describe('mergeEntries', () => {
    it('flattens and sorts by rank', () => {
        const merged = mergeEntries([
            [entry(3, 3), entry(4, 4)],
            [entry(1, 1), entry(2, 2)],
        ]);
        expect(merged.map((e) => e.rank)).toEqual([1, 2, 3, 4]);
    });
    it('dedupes overlapping pages by run identity', () => {
        const merged = mergeEntries([
            [entry(1, 1), entry(2, 2)],
            [entry(2, 2), entry(3, 3)],
        ]);
        expect(merged).toHaveLength(3);
    });
    it('dedupes manual/guest entries without runId by name+rank', () => {
        const a = { ...entry(5, null), runnerName: 'guest' };
        const merged = mergeEntries([[a], [{ ...a }]]);
        expect(merged).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/leaderboard/merge-entries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `merge-entries.ts`**

```ts
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';

function identity(e: LeaderboardEntry): string {
    if (e.runId != null) return `run:${e.runId}`;
    if (e.manualTimeId != null) return `manual:${e.manualTimeId}`;
    return `name:${e.runnerName}:${e.rank}`;
}

/** Flatten fetched pages into one rank-ordered, deduplicated list. */
export function mergeEntries(
    pages: LeaderboardEntry[][],
): LeaderboardEntry[] {
    const seen = new Set<string>();
    const out: LeaderboardEntry[] = [];
    for (const page of pages) {
        for (const e of page) {
            const key = identity(e);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(e);
        }
    }
    return out.sort((a, b) => a.rank - b.rank);
}
```

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/leaderboard/merge-entries.test.ts`
Expected: 3 passed.

- [ ] **Step 4: Server action**

`actions/fetch-page.action.ts`:

```ts
'use server';

import {
    getLeaderboard,
    type LeaderboardQuery,
} from '~src/lib/leaderboards-v1';
import type { LeaderboardResponse } from '../../../../../types/leaderboards.types';

// Public read — same data the page itself renders; no auth gate.
export async function fetchLeaderboardPage(
    q: LeaderboardQuery,
): Promise<LeaderboardResponse | null> {
    const res = await getLeaderboard(q);
    return res.ok ? res.result : null;
}
```

(Confirm `LeaderboardQuery` is exported from `~src/lib/leaderboards-v1`; it is declared at `src/lib/leaderboards-v1.ts:16` — add `export` if missing.)

- [ ] **Step 5: The pager**

`leaderboard-pager.tsx`:

```tsx
'use client';

import { useRef, useState, useTransition } from 'react';
import type { LeaderboardQuery } from '~src/lib/leaderboards-v1';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';
import { fetchLeaderboardPage } from '../actions/fetch-page.action';
import styles from './leaderboard.module.scss';
import { LeaderboardTable } from './leaderboard-table';
import { mergeEntries } from './merge-entries';

interface Props {
    initial: LeaderboardResponse;
    query: Omit<LeaderboardQuery, 'page'>;
    sessionUsername: string | null;
    canManage: boolean;
    gameSlug: string;
    variableKeys: string[];
}

/**
 * Client accumulator around the SSR'd page: "Show more" appends the
 * next page, "Show previous" prepends (deep links land mid-board).
 * The URL's ?page= tracks the highest loaded page via replaceState
 * so refresh/share keeps a valid deep link. Parent must key this
 * component by the filter signature so state resets on any change.
 */
export function LeaderboardPager({
    initial,
    query,
    sessionUsername,
    canManage,
    gameSlug,
    variableKeys,
}: Props) {
    const [pages, setPages] = useState<LeaderboardEntry[][]>([
        initial.entries,
    ]);
    const [minPage, setMinPage] = useState(initial.page);
    const [maxPage, setMaxPage] = useState(initial.page);
    const [isPending, startTransition] = useTransition();
    const firstMount = useRef(true);
    const stagger = firstMount.current;
    firstMount.current = false;

    const load = (page: number, position: 'before' | 'after') => {
        startTransition(async () => {
            const res = await fetchLeaderboardPage({ ...query, page });
            if (!res) return;
            setPages((prev) =>
                position === 'after'
                    ? [...prev, res.entries]
                    : [res.entries, ...prev],
            );
            if (position === 'after') setMaxPage(page);
            else setMinPage(page);
            const sp = new URLSearchParams(window.location.search);
            const highest = position === 'after' ? page : maxPage;
            if (highest === 1) sp.delete('page');
            else sp.set('page', String(highest));
            const qs = sp.toString();
            window.history.replaceState(
                null,
                '',
                qs
                    ? `${window.location.pathname}?${qs}`
                    : window.location.pathname,
            );
        });
    };

    const merged = mergeEntries(pages);
    const shownThrough = Math.min(
        maxPage * initial.pageSize,
        initial.totalItems,
    );

    return (
        <div className={stagger ? styles.boardStagger : styles.boardFade}>
            {minPage > 1 && (
                <div className={styles.showMoreBar}>
                    <button
                        type="button"
                        className={styles.showMoreBtn}
                        disabled={isPending}
                        onClick={() => load(minPage - 1, 'before')}
                    >
                        Show previous
                    </button>
                </div>
            )}
            <LeaderboardTable
                leaderboard={{ ...initial, entries: merged }}
                sessionUsername={sessionUsername}
                canManage={canManage}
                gameSlug={gameSlug}
                variableKeys={variableKeys}
            />
            {maxPage < initial.totalPages && (
                <div className={styles.showMoreBar}>
                    <button
                        type="button"
                        className={styles.showMoreBtn}
                        disabled={isPending}
                        onClick={() => load(maxPage + 1, 'after')}
                    >
                        {isPending ? 'Loading…' : 'Show more'}
                    </button>
                    <span className={styles.showMoreMeta}>
                        <span>{shownThrough.toLocaleString()}</span> of{' '}
                        <span>{initial.totalItems.toLocaleString()}</span>
                    </span>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 6: Styles + motion for the board column**

Append to `leaderboard.module.scss`:

```scss
// ---- Show more ----------------------------------------------
.showMoreBar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: dt.$spacing-xs;
    margin-block: dt.$spacing-lg;
}

.showMoreBtn {
    @include board.control-pill;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    padding: dt.$spacing-sm dt.$spacing-2xl;
}

.showMoreMeta {
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);

    span {
        @include board.mono-time;
        color: var(--bs-tertiary-color);
    }
}

// ---- Entry motion -------------------------------------------
@keyframes boardRowIn {
    from {
        opacity: 0;
        transform: translateY(6px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@keyframes boardFadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

// initial navigation: first ten rows stagger in
.boardStagger tbody tr {
    animation: boardRowIn 150ms cubic-bezier(0.4, 0, 0.2, 1) both;

    @for $i from 1 through 10 {
        &:nth-child(#{$i}) {
            animation-delay: #{($i - 1) * 20}ms;
        }
    }
}

// subsequent filter/category swaps: quick fade of the whole board
.boardFade {
    animation: boardFadeIn 120ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
    .boardStagger tbody tr,
    .boardFade {
        animation: none;
    }
}
```

Also delete the `.pager`, `.pageBtn`, `.pageBtnActive` rules (pager retired).

- [ ] **Step 7: Wire into `game-page.tsx`, delete the pager bar**

Replace the table + `PaginationBar` block inside `.colMain` with:

```tsx
<LeaderboardPager
    key={`${data.selectedCategory.id}|${subcategoryKey}|${JSON.stringify(data.activeFilters.varFilters)}|${data.activeFilters.combined}|${data.activeFilters.verified}`}
    initial={data.leaderboard}
    query={{
        gameSlug: data.game.name,
        categorySlug: data.selectedCategory.name,
        timing: data.selectedCategory.primaryTiming,
        subcategoryValues: data.activeFilters.subcategoryValues,
        combined: data.activeFilters.combined,
        varFilters: data.activeFilters.varFilters,
        verified: data.activeFilters.verified,
        pageSize: data.activeFilters.pageSize,
    }}
    sessionUsername={data.sessionUsername}
    canManage={canManageRuns}
    gameSlug={data.game.name}
    variableKeys={variableKeys}
/>
```

Delete `pagination-bar.tsx` and its import.

- [ ] **Step 8: Verify**

Run: `npm run typecheck && npm run lint && npm run build && npx vitest run`
Expected: all green; `grep -rn "PaginationBar" app/\(new-layout\)` returns nothing.

- [ ] **Step 9: Commit**

```bash
git add -A app/\(new-layout\)/games-v2/\[game\]
git commit -m "feat(board): show-more pagination with deep-link preservation, board entry motion"
```

---

### Task 9: VerificationBadge → board pills (no-emoji ride-along)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/run-view/run-badges.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/run-view/run-badges.tsx`

**Interfaces:**
- Consumes: `board.board-pill`. `VerificationBadge` is imported by `run-view/run-view.tsx` and `manage/run/[runId]/run-card.tsx` — its props (`status`) must not change.

- [ ] **Step 1: Create `run-badges.module.scss`**

```scss
@use '../../../styles/design-tokens' as dt;
@use '../../../styles/board' as board;

.verified {
    @include board.board-pill(dt.$accent-green);
}

.pending {
    @include board.board-pill(dt.$accent-amber);
}

.rejected {
    @include board.board-pill;
}
```

- [ ] **Step 2: Rewrite `VerificationBadge` in `run-badges.tsx`**

Replace only the `VerificationBadge` function (leave `VariablesLine` and the header comment untouched); add the imports:

```tsx
import { CheckCircleFill, HourglassSplit } from 'react-bootstrap-icons';
import styles from './run-badges.module.scss';

export function VerificationBadge({
    status,
}: {
    status: 'pending' | 'verified' | 'rejected';
}) {
    if (status === 'verified') {
        return (
            <span className={styles.verified} aria-label="verified">
                <CheckCircleFill size={11} aria-hidden /> Verified
            </span>
        );
    }
    if (status === 'pending') {
        return (
            <span className={styles.pending} aria-label="pending">
                <HourglassSplit size={11} aria-hidden /> Pending
            </span>
        );
    }
    return (
        <span className={styles.rejected} aria-label="rejected">
            Rejected
        </span>
    );
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build`
Expected: green; `grep -rn "text-bg-success\|⌛\|✓" app/\(new-layout\)/games-v2/\[game\]/run-view/` returns nothing.

- [ ] **Step 4: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/run-view
git commit -m "fix(run-view): verification badge speaks board-pill, drops emoji glyphs"
```

---

### Task 10: System doc, spec status, final verification

**Files:**
- Modify: `.interface-design/system.md`
- Modify: `docs/superpowers/specs/2026-07-16-leaderboard-premium-redesign-design.md`

- [ ] **Step 1: Update `system.md`**

- Signature list gains: `4. **Ambient art hero / the crown** — the game's own cover art, blurred to atmosphere under a scrim, with the category WR set monumentally in gold mono. Per-game identity derived from content, not configuration.`
- Rules gain a materials line: `**Glass** (board-glass) is reserved for the hero's quiet actions, the sticky control band, and the rail's live panel — never for content surfaces.`
- Motion rule extended: `One orchestrated load-in per navigation (hero fade-up, first rows stagger); category/filter swaps crossfade. prefers-reduced-motion disables all of it.`
- "Feel" note: the public board's register moves from calm-admin to premium-competitive; the console keeps its calm register.

- [ ] **Step 2: Update the spec**

- Status line → `implemented`.
- Record the two deviations from this plan's Global Constraints section (contained rounded hero card; Filters popover always available since it hosts the verified toggle), plus band rows wrap instead of horizontal-scroll (flex-wrap kept from the existing band — fewer moving parts, same legibility).

- [ ] **Step 3: Full verification suite**

```bash
rm -rf .next
npm run typecheck && npm run lint && npm run build && npx vitest run
```

Expected: all green.

Grep checks (all must return nothing):

```bash
grep -rn "table table-hover\|alert alert-" app/\(new-layout\)/games-v2/\[game\]
grep -rn "✓\|⌛\|▾\|▸" app/\(new-layout\)/games-v2/\[game\] --include="*.tsx"
grep -rn "GameHeader\|WrCard\|QuickStatsPanel\|PaginationBar" app/\(new-layout\)/games-v2
```

- [ ] **Step 4: Commit + push**

```bash
git add -A
git commit -m "docs: crown redesign implemented — system.md signatures, spec status"
git push -u origin HEAD
```

- [ ] **Step 5: Hand off to Joey**

Sandbox can't run `next dev`. List for Joey's browser pass (from the spec): light+dark on art-rich game / no-art game / empty board / 2-entry board / filtered combination / mobile width; sticky band + rail over long boards; reduced motion; keyboard-only row navigation; Filters popover; Show more + `?page=3` deep link; touch device mod-action path via run detail.

---

## Self-Review Notes

- **Spec coverage:** hero+crown (T4), grid/rail (T5), glass band + popover + rules (T6), table subtraction + podium + avatars + relative dates (T2/3/7), show-more (T8), motion (T4 hero, T8 board), badge ride-along (T9), system/spec docs (T10). Backend asks (avatarUrl/countryCode) are documented in the spec as a handoff — no task, by design.
- **Type consistency:** `LeaderboardTable` props unchanged across T7/T8; `RunnerAvatar` size prop is `'sm' | 'md'` in both T3 and T7; `RulesPanel` controlled props match between T6 steps 3 and 4; `fetchLeaderboardPage` consumes the exported `LeaderboardQuery`.
- **Known judgment calls for the implementer:** the row-click ignores clicks on interactive descendants via `closest()`; podium spine wins over you-spine by source order; `stagger` runs only on the pager's first mount (ref flag) so filter swaps get the quick fade instead.
