# SEO Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Google search ranking for therun.gg by fixing crawlability, enriching content, and correcting structured data.

**Architecture:** Fix metadata bugs first (prerequisite for noindex logic). Then enrich run pages with server-rendered content. Then fix home page Suspense architecture. Then update JSON-LD schemas. Finally optimize sitemaps and crawl signals.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, schema.org JSON-LD

**Spec:** `docs/superpowers/specs/2026-03-25-seo-improvements-design.md`

---

### Task 1: Fix robots metadata bug

**Files:**
- Modify: `src/utils/metadata.ts:113-120`

This is a prerequisite for Task 7 (noindex on low-activity runs). The `|| true` operator means `false || true === true`, so you can never disable indexing. Also, `follow` reads `index` instead of its own prop.

- [ ] **Step 1: Fix the four robots fields**

In `src/utils/metadata.ts`, replace lines 113-120:

```typescript
// Before (buggy):
robots: {
    index: props?.index || true,
    follow: props?.index || true,
    googleBot: {
        index: props?.index || true,
        follow: props?.index || true,
    },
},

// After (fixed):
robots: {
    index: props?.index ?? true,
    follow: props?.follow ?? true,
    googleBot: {
        index: props?.index ?? true,
        follow: props?.follow ?? true,
    },
},
```

- [ ] **Step 2: Verify the fix compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No new errors related to metadata.ts

- [ ] **Step 3: Commit**

```bash
git add src/utils/metadata.ts
git commit -m "fix(seo): use nullish coalescing for robots metadata fields

All four robots fields used || true which prevented noindex.
follow also incorrectly read index instead of follow prop."
```

---

### Task 2: Improve page titles for CTR

**Files:**
- Modify: `app/(new-layout)/page.tsx:6-20`
- Modify: `app/(new-layout)/[username]/[game]/[run]/page.tsx:78-113`

- [ ] **Step 1: Update home page title**

In `app/(new-layout)/page.tsx`, change the metadata export:

```typescript
export const metadata = buildMetadata({
    title: 'Free Speedrun Statistics & Live Run Tracker',
    description:
        'Free speedrun statistics for every runner. Track live runs, view leaderboards, analyze personal bests, and race other speedrunners — all on therun.gg.',
    keywords: [
        'TheRun',
        'speedrun',
        'statistics',
        'speedrun tracker',
        'live speedruns',
        'speedrun leaderboards',
        'personal best',
        'speedrun races',
    ],
});
```

This produces `The Run | Free Speedrun Statistics & Live Run Tracker` via `buildMetadata`'s title template.

- [ ] **Step 2: Update run page title in generateMetadata**

In `app/(new-layout)/[username]/[game]/[run]/page.tsx`, update the `generateMetadata` function. Change the title from:
```typescript
title: `${username}: ${gameAndCategory}`,
```
to:
```typescript
title: `${username}'s ${gameAndCategory} Speedrun Stats${pb ? ` | PB: ${pb}` : ''}`,
```

This front-loads search terms and includes the PB time for differentiation.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 4: Commit**

```bash
git add app/\(new-layout\)/page.tsx app/\(new-layout\)/\[username\]/\[game\]/\[run\]/page.tsx
git commit -m "feat(seo): improve page titles for better search CTR

Home page title now includes brand and 'free' differentiator.
Run page titles include username, game, category, and PB time."
```

---

### Task 3: Run page content enrichment — narrative summary and server-rendered stats

**Files:**
- Create: `app/(new-layout)/[username]/[game]/[run]/run-stats-summary.tsx`
- Modify: `app/(new-layout)/[username]/[game]/[run]/page.tsx:17-76`
- Modify: `app/(new-layout)/[username]/[game]/[run]/run.tsx:241-243`

The key constraint: `run.tsx` is `'use client'`. All server-rendered SEO content must go in `page.tsx` or new server components, not inside `RunDetail`.

- [ ] **Step 1: Create the RunStatsSummary server component**

Create `app/(new-layout)/[username]/[game]/[run]/run-stats-summary.tsx`:

Note: Uses `formatMillis` and `formatPlaytime` from `json-ld.ts` instead of the `DurationToFormatted` client component, so the text is pure server-rendered HTML with no client hydration.

```typescript
import { Run } from '~src/common/types';
import { formatMillis, formatPlaytime } from '~src/utils/json-ld';

interface RunStatsSummaryProps {
    run: Run;
    username: string;
}

export function RunStatsSummary({ run, username }: RunStatsSummaryProps) {
    const pb = formatMillis(run.personalBest);
    const sob = formatMillis(run.sumOfBests);
    const tts = formatMillis(run.timeToSave);
    const playtime = formatPlaytime(run.totalRunTime);
    const completionPct =
        run.attemptCount > 0
            ? (
                  (parseInt(run.finishedAttemptCount) / run.attemptCount) *
                  100
              ).toFixed(1)
            : '0';

    return (
        <section aria-label="Run summary">
            <h2>Statistics</h2>
            <p>
                {username} has made {run.attemptCount.toLocaleString()} attempts
                of {run.game} - {run.run}
                {pb && <>, with a personal best of {pb}</>}.
                {sob && (
                    <>
                        {' '}
                        Their sum of best segments is {sob}
                        {tts && <>, meaning there&apos;s {tts} of potential time save</>}.
                    </>
                )}{' '}
                {run.finishedAttemptCount && (
                    <>
                        {run.finishedAttemptCount} of those attempts were
                        finished ({completionPct}% completion rate).
                    </>
                )}{' '}
                {playtime && <>Total time spent: {playtime}.</>}
            </p>
        </section>
    );
}
```

- [ ] **Step 2: Add RunStatsSummary to the run page.tsx**

In `app/(new-layout)/[username]/[game]/[run]/page.tsx`, add the import and render the summary between `<JsonLd>` and `<RunDetail>`:

Add import at top:
```typescript
import { RunStatsSummary } from '~app/(new-layout)/[username]/[game]/[run]/run-stats-summary';
```

Update the return JSX in `RunPage`:
```typescript
return (
    <>
        <JsonLd
            data={buildRunProfileJsonLd({
                // ... existing props unchanged
            })}
        />
        <RunStatsSummary run={run} username={username} />
        <RunDetail
            run={run}
            username={username}
            game={game}
            runName={runName}
            globalGameData={globalGameData}
            liveData={liveData}
            tab={searchParams.tab}
        />
    </>
);
```

- [ ] **Step 3: Remove the visually-hidden stats div from run.tsx**

In `app/(new-layout)/[username]/[game]/[run]/run.tsx`, remove lines 241-243:

```typescript
// Delete this block:
<div className="visually-hidden" aria-hidden="true">
    <Stats run={run} gameTime={useGameTime} />
</div>
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/\[username\]/\[game\]/\[run\]/run-stats-summary.tsx \
       app/\(new-layout\)/\[username\]/\[game\]/\[run\]/page.tsx \
       app/\(new-layout\)/\[username\]/\[game\]/\[run\]/run.tsx
git commit -m "feat(seo): add server-rendered narrative summary to run pages

Adds RunStatsSummary component rendered in page.tsx (server component)
with prose description of run stats. Removes visually-hidden stats hack
from the client-side RunDetail component."
```

---

### Task 4: JSON-LD schema fixes — run pages, breadcrumbs, VideoObject

**Files:**
- Modify: `src/utils/json-ld.ts`
- Modify: `app/(new-layout)/[username]/[game]/[run]/page.tsx`
- Modify: `app/(new-layout)/[username]/page.tsx`
- Modify: `app/(new-layout)/page.tsx`

- [ ] **Step 1: Replace buildRunProfileJsonLd with WebPage schema**

In `src/utils/json-ld.ts`, replace the `buildRunProfileJsonLd` function (lines 198-239):

```typescript
export function buildRunProfileJsonLd({
    username,
    game,
    category,
    runUrl,
    personalBest,
    sumOfBests,
    attemptCount,
    finishedAttemptCount,
    totalRunTime,
    image,
    dateCreated,
    dateModified,
}: RunProfileJsonLdInput) {
    const pb = formatMillis(personalBest);
    const sob = formatMillis(sumOfBests);
    const playtime = formatPlaytime(totalRunTime);

    const descParts = [`${username} speedruns ${game} - ${category}`];
    if (pb) descParts.push(`PB: ${pb}`);
    if (sob) descParts.push(`Sum of best: ${sob}`);
    if (attemptCount) descParts.push(`${attemptCount} attempts`);
    if (playtime) descParts.push(`${playtime} played`);
    const description = descParts.join(' | ');

    return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `${game} - ${category} speedrun stats by ${username}`,
        url: `${BASE_URL}/${runUrl}`,
        description,
        ...(dateCreated ? { dateCreated } : {}),
        ...(dateModified ? { dateModified } : {}),
        mainEntity: {
            '@type': 'Person',
            name: username,
            url: `${BASE_URL}/${username}`,
            knowsAbout: ['Speedrunning', game, `${game} - ${category}`],
            ...(image ? { image } : {}),
        },
        about: {
            '@type': 'VideoGame',
            name: game,
        },
    };
}
```

- [ ] **Step 2: Add buildBreadcrumbJsonLd function**

Add to `src/utils/json-ld.ts`:

```typescript
export function buildBreadcrumbJsonLd(
    items: { name: string; url?: string }[],
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            ...(item.url ? { item: `${BASE_URL}${item.url}` } : {}),
        })),
    };
}
```

- [ ] **Step 3: Add buildVideoObjectJsonLd function**

Add to `src/utils/json-ld.ts`:

```typescript
interface VideoObjectInput {
    name: string;
    description: string;
    contentUrl: string;
    thumbnailUrl: string;
    uploadDate?: string;
}

export function buildVideoObjectJsonLd({
    name,
    description,
    contentUrl,
    thumbnailUrl,
    uploadDate,
}: VideoObjectInput) {
    return {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name,
        description,
        contentUrl,
        thumbnailUrl,
        ...(uploadDate ? { uploadDate } : {}),
    };
}
```

- [ ] **Step 4: Add buildItemListJsonLd function for home page trending games**

Add to `src/utils/json-ld.ts`:

```typescript
export function buildItemListJsonLd(
    items: { name: string; url: string }[],
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: `${BASE_URL}${item.url}`,
        })),
    };
}
```

- [ ] **Step 5: Add breadcrumbs to run page**

In `app/(new-layout)/[username]/[game]/[run]/page.tsx`, add breadcrumb JSON-LD. Add import:

```typescript
import { buildRunProfileJsonLd, buildBreadcrumbJsonLd, buildVideoObjectJsonLd, formatMillis } from '~src/utils/json-ld';
import { safeDecodeURI } from '~src/utils/uri';
```

In the `RunPage` component return, add breadcrumb and optional video JSON-LD:

```typescript
const decodedGame = safeDecodeURI(game);
const decodedRun = safeDecodeURI(runName);

return (
    <>
        <JsonLd
            data={buildRunProfileJsonLd({
                // ... existing props unchanged
            })}
        />
        <JsonLd
            data={buildBreadcrumbJsonLd([
                { name: 'Home', url: '/' },
                { name: username, url: `/${username}` },
                { name: decodedGame, url: `/${username}/${game}` },
                { name: decodedRun },
            ])}
        />
        {run.vod && userData?.picture && (
            <JsonLd
                data={buildVideoObjectJsonLd({
                    name: `${decodedGame} - ${decodedRun} speedrun by ${username}`,
                    description: `${username}'s ${decodedGame} - ${decodedRun} speedrun`,
                    contentUrl: run.vod,
                    thumbnailUrl: userData.picture,
                    uploadDate: dateCreated,
                })}
            />
        )}
        <RunStatsSummary run={run} username={username} />
        <RunDetail ... />
    </>
);
```

- [ ] **Step 6: Add breadcrumbs to user profile page**

In `app/(new-layout)/[username]/page.tsx`, add import and breadcrumb JsonLd. Add to imports:

```typescript
import { buildPersonJsonLd, buildBreadcrumbJsonLd, formatMillis, formatPlaytime } from '~src/utils/json-ld';
```

In the return JSX, add after the existing `<JsonLd>`:

```typescript
<JsonLd
    data={buildBreadcrumbJsonLd([
        { name: 'Home', url: '/' },
        { name: userData.user },
    ])}
/>
```

- [ ] **Step 7: Verify build**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 8: Commit**

```bash
git add src/utils/json-ld.ts \
       app/\(new-layout\)/\[username\]/\[game\]/\[run\]/page.tsx \
       app/\(new-layout\)/\[username\]/page.tsx
git commit -m "feat(seo): update JSON-LD schemas for run pages

Replace ProfilePage with WebPage+VideoGame on run pages.
Add BreadcrumbList to run and user profile pages.
Add VideoObject for runs with VODs.
Add ItemList builder for home page trending games."
```

---

### Task 5: Home page — static intro and server-rendered sections

**Files:**
- Modify: `app/(new-layout)/page.tsx`
- Modify: `app/(new-layout)/frontpage/frontpage.tsx`

This is the most architecturally involved task. The `FrontpageLayout` is a `'use client'` component that receives sections as a `Record<SectionId, ReactNode>`. To server-render sections for SEO, we extract them from the sections map and render them directly, while keeping the layout system working for authenticated users.

- [ ] **Step 1: Add static intro section to the home page**

In `app/(new-layout)/page.tsx`, add an intro section and the trending ItemList JSON-LD. Update the component:

```typescript
import { JsonLd } from '~src/components/json-ld';
import { buildWebSiteJsonLd } from '~src/utils/json-ld';
import buildMetadata from '~src/utils/metadata';
import FrontPage from './frontpage/frontpage';

export const metadata = buildMetadata({
    title: 'Free Speedrun Statistics & Live Run Tracker',
    description:
        'Free speedrun statistics for every runner. Track live runs, view leaderboards, analyze personal bests, and race other speedrunners — all on therun.gg.',
    keywords: [
        'TheRun',
        'speedrun',
        'statistics',
        'speedrun tracker',
        'live speedruns',
        'speedrun leaderboards',
        'personal best',
        'speedrun races',
    ],
});

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ statsUser?: string }>;
}) {
    const params = await searchParams;

    return (
        <>
            <JsonLd data={buildWebSiteJsonLd()} />
            <section aria-label="About therun.gg">
                <h1 className="h3 mb-2">
                    Speedrun Statistics, Live Runs & Leaderboards
                </h1>
                <p className="text-muted mb-4">
                    therun.gg is a free speedrun statistics platform. Track live
                    speedruns, compare personal bests, view leaderboards,
                    analyze splits, and race other speedrunners across thousands
                    of games.
                </p>
            </section>
            <FrontPage statsUser={params.statsUser} />
        </>
    );
}
```

- [ ] **Step 2: Remove Suspense from non-hero, non-auth sections in frontpage.tsx**

In `app/(new-layout)/frontpage/frontpage.tsx`, remove Suspense wrappers from trending, pb-feed, races, quick-links, community-pulse, and patreon. Keep Suspense only on the hero and your-stats:

```typescript
import { Suspense } from 'react';
import { getFrontpageConfig } from '~src/actions/frontpage-config.action';
import { getSession } from '~src/actions/session.action';
import { DEFAULT_FRONTPAGE_CONFIG } from '~src/lib/frontpage-sections-metadata';
import type { SectionId } from '../../../types/frontpage-config.types';
import { FrontpageHero } from './components/frontpage-hero';
import { FrontpageLayout } from './components/frontpage-layout';
import { SectionSkeleton } from './components/section-skeleton';
import { CommunityPulse } from './sections/community-pulse';
import { PatreonSection } from './sections/patreon-section';
import { PbFeedSection } from './sections/pb-feed-section';
import { QuickLinks } from './sections/quick-links';
import { RacesSection } from './sections/races-section';
import { TrendingSection } from './sections/trending-section';
import { YourStatsSection } from './sections/your-stats-section';

export default async function FrontPage({ statsUser }: { statsUser?: string }) {
    const session = await getSession();
    const isLoggedIn = !!session?.user;

    const config = isLoggedIn
        ? await getFrontpageConfig(session.username)
        : DEFAULT_FRONTPAGE_CONFIG;

    const sections: Record<SectionId, React.ReactNode> = {
        trending: <TrendingSection />,
        'pb-feed': <PbFeedSection />,
        races: <RacesSection />,
        'quick-links': <QuickLinks />,
        'your-stats': (
            <Suspense fallback={<SectionSkeleton height={300} />}>
                <YourStatsSection statsUser={statsUser} />
            </Suspense>
        ),
        'community-pulse': <CommunityPulse />,
        patreon: <PatreonSection />,
    };

    return (
        <div className="d-flex flex-column gap-4">
            <div id="live">
                <Suspense fallback={<SectionSkeleton height={340} />}>
                    <FrontpageHero />
                </Suspense>
            </div>
            <FrontpageLayout
                initialConfig={config}
                sections={sections}
                isAuthenticated={isLoggedIn}
            />
        </div>
    );
}
```

**Note on architecture:** The spec suggested extracting sections outside `FrontpageLayout`. This plan takes a simpler approach: keep sections in the layout map but remove Suspense wrappers. This works because Next.js SSRs async server components passed as props to client components — the HTML is in the initial response. This preserves the drag-and-drop layout system without duplicating rendering logic. If Google still doesn't index the content (verify after deploy), the fallback is extracting sections outside the layout as the spec describes.

- [ ] **Step 3: Verify dev server works**

Run: `npm run dev` and open `http://localhost:3000` — verify the page loads and all sections render. Check the page source (View Source) to confirm trending games and PB feed content is in the initial HTML.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/page.tsx app/\(new-layout\)/frontpage/frontpage.tsx
git commit -m "feat(seo): server-render frontpage sections for crawlability

Add static intro heading and description to home page.
Remove Suspense from all sections except hero and your-stats so
content appears in initial server HTML for search engines.
Hero kept in Suspense (~700ms, no SEO value).
Your-stats kept in Suspense (auth-required, not crawlable)."
```

---

### Task 6: Fix sitemap timestamps

**Files:**
- Modify: `app/sitemap.tsx`
- Modify: `app/(new-layout)/dynamic-sitemap/sitemap.ts`

The sitemap API data (`SitemapRun`, `SitemapUser`) doesn't include timestamps, so we can't use real last-modified dates for those. For the static sitemap, use a stable build date. For dynamic sitemaps, remove the fake `new Date()` and omit `lastModified` entirely (which is valid — Google will crawl based on other signals).

- [ ] **Step 1: Fix static sitemap timestamps**

In `app/sitemap.tsx`, replace all `lastModified: new Date()` with omitting `lastModified` for pages that don't have a meaningful date. For the homepage, use a recent stable date:

```typescript
import { MetadataRoute } from 'next';

export default async function sitemap() {
    const normalRoutes: MetadataRoute.Sitemap = [
        {
            url: 'https://therun.gg',
            changeFrequency: 'always',
            priority: 1,
        },
        {
            url: 'https://therun.gg/live',
            changeFrequency: 'always',
            priority: 0.9,
        },
        {
            url: 'https://therun.gg/livesplit',
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: 'https://therun.gg/events',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/games',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/patreon',
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: 'https://therun.gg/patron',
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: 'https://therun.gg/races',
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: 'https://therun.gg/races/stats',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/races/finished',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/recap',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/tournaments',
            changeFrequency: 'daily',
            priority: 0.6,
        },
    ];

    return normalRoutes;
}
```

- [ ] **Step 2: Fix dynamic sitemap timestamps**

In `app/(new-layout)/dynamic-sitemap/sitemap.ts`, remove `lastModified: new Date()` from all sitemap functions. Replace with omitting `lastModified`:

For `sitemapForRaces`: remove `lastModified: new Date()` line
For `sitemapForUsers`: remove `lastModified: new Date()` line
For `sitemapForRaceStats`: remove both `lastModified: new Date()` lines (gameStatsUrls and categoryStatsUrls)
For `sitemapForTournaments`: remove `lastModified: new Date()` line
For `sitemapForEvents`: remove `lastModified: new Date()` line
For `sitemapForRuns`: remove `lastModified: new Date()` line

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.tsx app/\(new-layout\)/dynamic-sitemap/sitemap.ts
git commit -m "fix(seo): remove fake sitemap timestamps

All sitemaps used new Date() for lastModified, making every entry
appear freshly modified on each generation. Removed since the API
data doesn't include real timestamps. Omitting lastModified is
valid and avoids misleading Google's freshness signals."
```

---

### Task 7: Noindex low-activity run pages

**Files:**
- Modify: `app/(new-layout)/[username]/[game]/[run]/page.tsx:78-113`

Depends on Task 1 (robots bug fix). Without that fix, `index: false` silently becomes `true`.

- [ ] **Step 1: Add noindex logic to generateMetadata**

In `app/(new-layout)/[username]/[game]/[run]/page.tsx`, update the `generateMetadata` function. After fetching the run, add an index check:

```typescript
export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username = params.username;

    if (!username) return buildMetadata();

    const game = safeDecodeURI(params.game);
    const category = safeDecodeURI(params.run);
    const gameAndCategory = `${game} - ${category}`;

    const [run, images] = await Promise.all([
        getRun(username, params.game, params.run),
        getUserProfilePhoto(username),
    ]);

    const descParts = [`${username}'s ${gameAndCategory} speedrun stats`];
    const pb = formatMillis(run?.personalBest);
    if (pb) descParts.push(`PB: ${pb}`);
    if (run?.attemptCount) descParts.push(`${run.attemptCount} attempts`);
    const sob = formatMillis(run?.sumOfBests);
    if (sob) descParts.push(`Sum of best: ${sob}`);

    // Don't index thin pages with very few attempts
    const shouldIndex = (run?.attemptCount ?? 0) >= 5;

    const metadata = buildMetadata({
        title: `${username}'s ${gameAndCategory} Speedrun Stats${pb ? ` | PB: ${pb}` : ''}`,
        description: descParts.join(' | '),
        images,
        index: shouldIndex,
    });

    if (run?.customUrl) {
        metadata.alternates = {
            canonical: `/${username}/${run.customUrl}`,
        };
    }

    return metadata;
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add app/\(new-layout\)/\[username\]/\[game\]/\[run\]/page.tsx
git commit -m "feat(seo): noindex run pages with fewer than 5 attempts

Thin pages with very few attempts dilute crawl budget.
Pages with <5 attempts get noindex to focus Google on
higher-quality content."
```

---

### Task 8: Verify everything builds together

**Files:** None (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: No new errors

- [ ] **Step 3: Build**

Run: `rm -rf .next && npm run build`
Expected: Successful build with no errors

- [ ] **Step 4: Spot-check page source**

Run `npm run dev`, then:
- View source of `http://localhost:3000` — confirm intro text and section content in HTML
- View source of a run page — confirm narrative summary in HTML
- Check JSON-LD scripts contain `WebPage` type on run pages, `BreadcrumbList` on both

---

## Execution Order & Dependencies

```
Task 1 (robots fix) ──────────────────────────┐
Task 2 (titles)                                │
Task 3 (run page content)                      ├── Task 7 (noindex) depends on Task 1
Task 4 (JSON-LD schemas)                       │
Task 5 (home page server-render)               │
Task 6 (sitemap timestamps)                    │
                                               │
Task 7 (noindex low-activity) ◄────────────────┘
Task 8 (final verification)
```

Tasks 1-6 are independent and can run in parallel. Task 7 depends on Task 1. Task 8 runs last.

## Deferred Spec Items

The following spec items are intentionally deferred. They are lower impact and can be done in a follow-up:

- **2d**: Heading hierarchy audit (adding h2 to "Splits", "Sessions" etc. in run.tsx tabs — requires touching the client component's tab rendering)
- **3a/3b**: User profile heading hierarchy and server-rendered game list — profiles already rank better than run pages; lower priority
- **6c**: Sitemap priority tuning — the API doesn't expose attempt counts in sitemap data, so we can't vary priority per run without extra API calls
- **6d**: Internal linking on run pages — existing navigation uses `<Link>` (semantic `<a>` tags), so this is already partially in place
- **4b (game pages)**: Breadcrumbs for game pages (`Home > Games > {game}`) — not part of the target query set
- **1c**: `ItemList` JSON-LD for trending games — the builder function is created but wiring it into the home page requires passing data up from the TrendingSection, which is complex. Can be added once the base changes are validated.
