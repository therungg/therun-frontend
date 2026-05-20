# Run Preview — Design

**Date:** 2026-05-20
**Status:** Draft

## Goal

A fullscreen, chromeless "run preview" page for showing on-screen during events while a caster/host narrates. Inspired by Purge's weatherman segment at TI — concise, interesting, paced. Scoped to a single runner attempting a single game + category.

Doubles as a shareable stat page (URL is canonical, no admin auth required).

## URL & Access

- Public, no auth required
- Canonical URL: `/[username]/[game]/[run]/preview` — `[run]` is the category slug, matching the existing `/[username]/[game]/[run]` page pattern
- Fullscreen, chromeless (no site header, footer, or navigation)
- No picker UI in v1 — URL-driven only

## Format

Multi-segment, operator-paced. 5 segments. Operator advances forward/back through them while talking.

### Navigation

- Keyboard: `ArrowRight` / `Space` / `PageDown` → next; `ArrowLeft` / `PageUp` → previous; `Home` → first; `End` → last. Wraps at edges.
- Click anywhere on page → next
- No auto-advance
- No URL sync — segment state in memory only
- No position indicator (chromeless)
- Transition: 200ms fade between segments

### Empty-segment skipping

If a segment has no data to show (e.g., no splits data), the navigator filters it out of the render list. The 5 segments are conceptual slots, not fixed positions.

## Visual Personality

Clean stat-show layout (legible from across a room) with a playful game-themed frame.

- Dark background (near-black, not pure)
- `dominantColor` (extracted from game art) used as accent for highlights/borders only
- White primary text, muted gray secondary
- One display face (bold, tabular-figures) for big numbers; one body face
- Shared `<SegmentFrame>` wrapper provides:
  - Subtle slow-pulse animated gradient background using `dominantColor` (very low opacity, doesn't compete with foreground)
  - 4 decorative SVG corner ornaments in `dominantColor`
  - Thin context strip bottom-left (game art thumb + category name) — visible on every segment except `IdentityCard`

## The 5 Segments

### 1. Identity Card

Sets the vibe. Establishes who and what.

- Game art as hero element (large, centered)
- Runner name + avatar prominent
- Category name as styled badge
- Pronouns shown subtly under name
- Decorative background framing pulled from `dominantColor`
- Context strip hidden here (the page itself is the context)

### 2. Headline Stats

4 big-number tiles, clean typography:

- **PB** — time, "set N ago" subtitle
- **Sum-of-Best** — time, "potential save: N" subtitle (delta to PB)
- **Attempts** — total, "N% finished" subtitle
- **Time Invested** — total ms across all attempts, humanized ("2d 14h")

### 3. Recent Form

- Sparkline/line chart of last 20 finished runs (Y = run time, lower = better)
- Annotated trend label: "improving — N seconds faster on avg vs prior 20" / "flat" / "regressing"
- Runs-per-week (last 4 weeks) shown beside chart

### 4. Split Story

Horizontal bar list of segments. Each row:

- Split name
- Gold time (green chip)
- Average time (neutral)
- PB time (white)
- "Time lost vs PB" bar (visual delta)

Chokepoint segment (worst avg-vs-PB delta) highlighted.

Footer line: "Theoretical best is N seconds faster than PB."

### 5. Storylines

Top 3 storyline cards from the rules engine. Each card:

- Kind icon (per storyline kind)
- Title (one short line)
- Body (1-2 sentences)

Mix of category-scoped and global storylines (e.g., "also runs N other categories of this game").

## Data Shape

The contract between data fetching and rendering. Designed so the source can swap from frontend composition (phase 1) to a single backend endpoint (phase 2) without changing the UI.

```ts
type PreviewData = {
    runner: {
        username: string;
        displayName: string;
        avatarUrl: string | null;
        pronouns: string | null;
    };
    game: {
        name: string;
        slug: string;
        imageUrl: string | null;
        dominantColor: string | null; // hex, e.g. '#3a7bd5'
    };
    category: {
        name: string;
        slug: string;
    };
    headline: {
        pb: { time: number; achievedAt: string; runId: string } | null;
        sumOfBest: { time: number; gapToPb: number } | null;
        attempts: { total: number; finished: number; finishRate: number };
        timeInvested: { totalMs: number };
    };
    recentForm: {
        runs: Array<{ time: number; achievedAt: string; isPb: boolean }>; // last 20 finished
        trend: 'improving' | 'flat' | 'regressing' | null; // null if <3 runs
        runsPerWeek: number; // last 4 weeks
    } | null;
    splits: {
        segments: Array<{
            name: string;
            goldTime: number | null;
            avgTime: number | null;
            pbTime: number | null;
            timeLostVsPb: number; // ms
            isChokepoint: boolean; // worst delta in the run
        }>;
        theoreticalBestGap: number; // sum-of-best vs PB, ms
    } | null;
    storylines: Array<Storyline>; // top 3 after priority sort
};

type Storyline = {
    kind: StorylineKind;
    title: string;
    body: string;
    priority: number; // 1-9, higher = more important
};

type StorylineKind =
    | 'pb-drought'
    | 'pb-fresh'
    | 'chokepoint'
    | 'gold-chaser'
    | 'grinder'
    | 'time-sink'
    | 'gold-streak'
    | 'multi-category'
    | 'first-run';
```

## Data Fetching (Phase 1)

Server-side `getPreviewData(username, gameSlug, categorySlug): Promise<PreviewData | null>` in `src/lib/preview.ts`:

- Composes existing lib functions: `getAdvancedUserStats`, `getUserRuns`, `getPersonalBestRuns`, `getGlobalUser`
- Extracts `dominantColor` from `game.imageUrl` using a server-side helper (`src/lib/dominant-color.ts`, uses `colorthief` or equivalent). Cached at the same `cacheLife('hours')` boundary.
- Runs `src/lib/preview-storylines.ts` engine to fill `storylines[]`
- Returns `null` if the user/game/category combo has no resolvable data; page calls `notFound()`
- Cache: `'use cache'` + `cacheLife('hours')` + `cacheTag('preview-{username}-{game}-{category}')`

## Data Fetching (Phase 2, future)

Swap `getPreviewData` internals to a single `apiFetch('/preview/...')` call when a backend endpoint exists. Public type signature unchanged.

## Storylines Engine

`src/lib/preview-storylines.ts`. Each rule is a pure function `(input: StorylineInput) => Storyline | null`.

`StorylineInput` is the combined data the engine sees: category PB data, other-category PBs for the same user (for global rules), recent runs, splits, attempts, account age.

Engine flow: run all rules, filter nulls, sort by priority (desc), return top 3.

### Initial rules

| Kind             | Trigger                                          | Priority |
| ---------------- | ------------------------------------------------ | -------- |
| `pb-fresh`       | PB set within last 14 days                       | 9        |
| `pb-drought`     | No new PB in >90 days                            | 8        |
| `chokepoint`     | Segment with worst avg-vs-PB delta (>5% of PB)   | 7        |
| `gold-chaser`    | Sum-of-best gap >5% of PB                        | 6        |
| `gold-streak`    | New gold split in last 5 runs                    | 6        |
| `grinder`        | High attempt count (>500) + low finish rate (<20%) | 5      |
| `multi-category` | Runs ≥3 other categories of this game            | 4        |
| `time-sink`      | Total time invested >100 hours                   | 3        |
| `first-run`      | No PB yet (never finished category)              | 9        |

Easy to extend. Body strings use a small template format (e.g., `"Hasn't beaten their PB in {months} months — could tonight break the spell?"`).

## Edge Cases

| Scenario                                | Behavior                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| Runner doesn't exist                    | `notFound()`                                                                            |
| Game/category doesn't exist for runner  | `notFound()`                                                                            |
| No PB / never finished                  | `IdentityCard` framed as "first attempt"; PB/SoB tiles show "—"; `RecentForm` and `SplitStory` hidden; `first-run` storyline fires |
| <3 finished runs                        | `RecentForm` shown without trend label                                                  |
| No splits data                          | `SplitStory` hidden; split-based storyline rules skipped                                |
| Missing game art                        | `IdentityCard` falls back to game name in large type                                    |
| `dominantColor` extraction fails        | Neutral accent color used                                                               |
| Storylines engine returns 0 hits        | `Storylines` segment skipped                                                            |
| Storylines engine returns 1-2 hits      | Segment shown with what it has                                                          |

## File Structure

```
app/(chromeless)/
  layout.tsx                          // chromeless layout, no header/footer
  [username]/[game]/[run]/preview/
    page.tsx                          // server component, fetches PreviewData
    PreviewNavigator.tsx              // client, keyboard/click + segment state
    SegmentFrame.tsx                  // shared frame (bg, corners, strip)
    segments/
      IdentityCard.tsx
      HeadlineStats.tsx
      RecentForm.tsx
      SplitStory.tsx
      Storylines.tsx
    preview.module.scss

src/lib/
  preview.ts                          // getPreviewData composer
  preview-storylines.ts               // rules engine + rule functions
  dominant-color.ts                   // server-side color extraction

src/lib/__tests__/
  preview-storylines.test.ts          // rule firing fixtures

types/
  preview.types.ts                    // PreviewData, Storyline, StorylineInput
```

## Testing

- **Storylines engine** — unit tests with fixture `StorylineInput` covering each rule firing and not-firing. Most logic-dense piece, regression-prone.
- **Data composition** (`getPreviewData`) — verify manually
- **Segments** — verify visually in browser
- **Navigator keyboard/click** — verify manually

## Out of Scope (v1)

- Backend `/preview` endpoint (phase 2)
- Stories API integration for storyline narratives (phase 3 — possibly)
- Live data refresh / WebSocket-driven updates during a run
- Picker landing page / search UI
- Per-game custom theming beyond `dominantColor`
- Animations beyond simple fade
- Mobile/responsive (designed for 1080p stream capture)
- Per-event branding overlay
