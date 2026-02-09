# SEO Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve Google discoverability and rich result formatting for home, live, races, user profiles, and runs pages on therun.gg.

**Architecture:** Add JSON-LD structured data to key pages via a `JsonLd` component, fix broken sitemaps (users endpoint, race pagination), add runs to sitemap, and improve home page metadata.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Schema.org JSON-LD

---

### Task 1: Create JSON-LD component and utility

**Files:**
- Create: `src/components/json-ld.tsx`
- Create: `src/utils/json-ld.ts`

**Step 1: Create the JsonLd component**

Create `src/components/json-ld.tsx`:
```tsx
interface JsonLdProps {
    data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}
```

**Step 2: Create JSON-LD builder functions**

Create `src/utils/json-ld.ts` with three builder functions:

```typescript
const BASE_URL = 'https://therun.gg';

export function buildWebSiteJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'The Run',
        url: BASE_URL,
        description:
            'Free speedrun statistics — live run tracking, leaderboards, personal bests, and race data for speedrunners.',
    };
}

export function buildPersonJsonLd({
    username,
    picture,
    description,
    socials,
}: {
    username: string;
    picture?: string;
    description: string;
    socials?: { youtube?: string; twitter?: string; twitch?: string };
}) {
    const sameAs: string[] = [];
    if (socials?.twitch) sameAs.push(`https://twitch.tv/${socials.twitch}`);
    if (socials?.youtube) sameAs.push(`https://youtube.com/${socials.youtube}`);
    if (socials?.twitter) sameAs.push(`https://twitter.com/${socials.twitter}`);

    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: username,
        url: `${BASE_URL}/${username}`,
        description,
        ...(picture ? { image: picture } : {}),
        ...(sameAs.length > 0 ? { sameAs } : {}),
    };
}

export function buildSportsEventJsonLd({
    username,
    game,
    category,
    personalBest,
}: {
    username: string;
    game: string;
    category: string;
    personalBest?: string;
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: `${game} - ${category}`,
        url: `${BASE_URL}/${username}/${encodeURIComponent(game)}/${encodeURIComponent(category)}`,
        description: `${username} speedruns ${game} - ${category}${personalBest ? ` with a personal best of ${personalBest}` : ''}`,
        performer: {
            '@type': 'Person',
            name: username,
            url: `${BASE_URL}/${username}`,
        },
    };
}
```

**Step 3: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors related to new files

**Step 4: Commit**

```bash
git add src/components/json-ld.tsx src/utils/json-ld.ts
git commit -m "feat(seo): add JSON-LD component and builder utilities"
```

---

### Task 2: Add JSON-LD to home page + custom metadata

**Files:**
- Modify: `app/(old-layout)/page.tsx`

The home page currently has no metadata export and no JSON-LD. Add both.

**Step 1: Add metadata and JSON-LD to home page**

Modify `app/(old-layout)/page.tsx`:
```tsx
import React from 'react';
import { Homepage } from '~app/(old-layout)/components/homepage';
import { JsonLd } from '~src/components/json-ld';
import buildMetadata from '~src/utils/metadata';
import { buildWebSiteJsonLd } from '~src/utils/json-ld';

export const metadata = buildMetadata({
    title: 'Speedrun Statistics, Live Runs & Leaderboards',
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

export default async function Page() {
    return (
        <>
            <JsonLd data={buildWebSiteJsonLd()} />
            <Homepage />
        </>
    );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add app/(old-layout)/page.tsx
git commit -m "feat(seo): add home page metadata and WebSite JSON-LD"
```

---

### Task 3: Add JSON-LD to user profile page

**Files:**
- Modify: `app/(old-layout)/[username]/page.tsx`

The user profile page already fetches `userData` (with `socials`, `picture`) and `runs`. Use this data to build Person JSON-LD with stats in the description.

**Step 1: Add JSON-LD to user profile**

Add imports at top of `app/(old-layout)/[username]/page.tsx`:
```typescript
import { JsonLd } from '~src/components/json-ld';
import { buildPersonJsonLd } from '~src/utils/json-ld';
```

In the `Page` component, after the data is fetched (after line 80), before the return, build the JSON-LD description:
```typescript
const topGame = runs.length > 0 ? runs[0].game : undefined;
const pbCount = runs.filter((r) => r.personalBest).length;
const profileDescription = [
    `${userData.user} is a speedrunner on The Run.`,
    topGame ? `Top game: ${topGame}.` : '',
    `${runs.length} runs tracked, ${pbCount} personal bests.`,
]
    .filter(Boolean)
    .join(' ');
```

Wrap the return JSX to include JsonLd (only for non-tournament pages):
```tsx
return (
    <>
        <JsonLd
            data={buildPersonJsonLd({
                username: userData.user,
                picture: userData.picture,
                description: profileDescription,
                socials: userData.socials,
            })}
        />
        <UserProfile
            runs={runs}
            username={userData.user}
            hasGameTime={hasGameTime}
            defaultGameTime={defaultGameTime}
            liveData={liveData}
            session={session}
            userData={userData}
            allGlobalGameData={allGlobalGameData}
            raceStats={raceStats}
        />
    </>
);
```

Make sure to only render JsonLd when it's NOT a tournament page (the tournament check is on lines 28-41, and if it's a tournament, it returns early — so the JsonLd code below will only run for actual user profiles).

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add app/(old-layout)/[username]/page.tsx
git commit -m "feat(seo): add Person JSON-LD to user profile pages"
```

---

### Task 4: Add JSON-LD to run page

**Files:**
- Modify: `app/(old-layout)/[username]/[game]/[run]/page.tsx`

The run page already fetches the `run` object which has `personalBest`, `game`, `run` (category). Use this for SportsEvent JSON-LD.

**Step 1: Add JSON-LD to run page**

Add imports at top of `app/(old-layout)/[username]/[game]/[run]/page.tsx`:
```typescript
import { JsonLd } from '~src/components/json-ld';
import { buildSportsEventJsonLd } from '~src/utils/json-ld';
```

Wrap the return to include JsonLd:
```tsx
const decodedGame = safeDecodeURI(game);
const decodedRun = safeDecodeURI(runName);

return (
    <>
        <JsonLd
            data={buildSportsEventJsonLd({
                username,
                game: decodedGame,
                category: decodedRun,
                personalBest: run.personalBest,
            })}
        />
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

Note: `safeDecodeURI` is already imported in this file (line 8).

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add app/(old-layout)/[username]/[game]/[run]/page.tsx
git commit -m "feat(seo): add SportsEvent JSON-LD to run pages"
```

---

### Task 5: Fix web manifest

**Files:**
- Modify: `public/site.webmanifest`

**Step 1: Fill in empty name fields**

Change `"name": ""` to `"name": "The Run - Speedrun Statistics"` and `"short_name": ""` to `"short_name": "The Run"`.

**Step 2: Commit**

```bash
git add public/site.webmanifest
git commit -m "fix(seo): populate web manifest name fields"
```

---

### Task 6: Fix sitemap — create sitemap data fetching library

**Files:**
- Create: `src/lib/sitemap.ts`

Create data fetching functions for the new sitemap endpoints. These will be used by the dynamic sitemap in the next task.

**Step 1: Create sitemap data fetching functions**

Create `src/lib/sitemap.ts`:
```typescript
'use server';

import { cacheLife, cacheTag } from 'next/cache';

const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL as string;

interface SitemapUser {
    id: number;
    username: string;
}

interface SitemapRun {
    id: number;
    user: string;
    game: string;
    run: string;
}

interface SitemapResponse<T> {
    result: T[];
    cursor: number | null;
}

export async function getSitemapUsers(): Promise<SitemapUser[]> {
    'use cache';
    cacheLife('days');
    cacheTag('sitemap-users');

    const allUsers: SitemapUser[] = [];
    let cursor: number | null = null;

    while (true) {
        const url = cursor
            ? `${BASE_URL}/api/sitemap/users?cursor=${cursor}`
            : `${BASE_URL}/api/sitemap/users`;
        const res = await fetch(url);
        const data: SitemapResponse<SitemapUser> = await res.json();

        allUsers.push(...data.result);

        if (!data.cursor || data.result.length === 0) break;
        cursor = data.cursor;
    }

    return allUsers;
}

export async function getSitemapRuns(
    cursor?: number,
): Promise<SitemapResponse<SitemapRun>> {
    'use cache';
    cacheLife('days');
    cacheTag('sitemap-runs');

    const url = cursor
        ? `${BASE_URL}/api/sitemap/runs?cursor=${cursor}`
        : `${BASE_URL}/api/sitemap/runs`;
    const res = await fetch(url);
    return res.json();
}

export async function getAllSitemapRuns(): Promise<SitemapRun[]> {
    'use cache';
    cacheLife('days');
    cacheTag('sitemap-runs');

    const allRuns: SitemapRun[] = [];
    let cursor: number | undefined;

    while (true) {
        const data = await getSitemapRuns(cursor);
        allRuns.push(...data.result);

        if (!data.cursor || data.result.length === 0) break;
        cursor = data.cursor;
    }

    return allRuns;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/lib/sitemap.ts
git commit -m "feat(seo): add sitemap data fetching for users and runs endpoints"
```

---

### Task 7: Fix and rewrite dynamic sitemap

**Files:**
- Modify: `app/(old-layout)/dynamic-sitemap/sitemap.ts`

Three fixes:
1. Replace broken `getPaginatedUsers()` (admin endpoint) with new `getSitemapUsers()`
2. Fix race pagination bug (skips last page)
3. Add runs as a new sitemap segment

**Step 1: Rewrite the dynamic sitemap**

Replace the entire content of `app/(old-layout)/dynamic-sitemap/sitemap.ts`:

```typescript
import { MetadataRoute } from 'next';
import { Race, RaceGameStatsByGame } from '~app/(old-layout)/races/races.types';
import { getAllTournamentSlugs } from '~app/(old-layout)/tournaments/tournament-list';
import { getAllEvents } from '~src/lib/events';
import {
    getPaginatedFinishedRaces,
    getRaceGameStats,
    getRaceGameStatsByGame,
} from '~src/lib/races';
import { getAllSitemapRuns, getSitemapUsers } from '~src/lib/sitemap';
import { safeEncodeURI } from '~src/utils/uri';

export const maxDuration = 120;

export async function generateSitemaps() {
    return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
}

export default async function sitemap({
    id,
}: {
    id: number;
}): Promise<MetadataRoute.Sitemap> {
    switch (parseInt(id.toString())) {
        case 0:
            return sitemapForRaces();
        case 1:
            return sitemapForUsers();
        case 2:
            return sitemapForRaceStats();
        case 3:
            return sitemapForTournaments();
        case 4:
            return sitemapForEvents();
        case 5:
            return sitemapForRuns();
    }

    return [];
}

const sitemapForRaces = async (): Promise<MetadataRoute.Sitemap> => {
    const allItems: Race[] = [];
    let page = 1;

    while (true) {
        const result = await getPaginatedFinishedRaces(page, 100);
        allItems.push(...result.items);

        if (page >= result.totalPages) break;
        page++;
    }

    return allItems.map((race) => ({
        url: 'https://therun.gg/races/' + race.raceId,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.4,
    }));
};

const sitemapForUsers = async (): Promise<MetadataRoute.Sitemap> => {
    const users = await getSitemapUsers();

    return users.map((user) => ({
        url: 'https://therun.gg/' + user.username,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));
};

const sitemapForRaceStats = async (): Promise<MetadataRoute.Sitemap> => {
    const stats = await getRaceGameStats(0);

    const gameStatPromises = stats.map((stat) =>
        getRaceGameStatsByGame(safeEncodeURI(stat.displayValue)),
    );

    const gameStats: RaceGameStatsByGame[] =
        await Promise.all(gameStatPromises);

    const gameStatsUrls: MetadataRoute.Sitemap = stats
        .map((stat) => {
            if (!stat.displayValue) return undefined;

            return {
                url:
                    'https://therun.gg/races/stats/' +
                    safeEncodeURI(stat.displayValue),
                lastModified: new Date(),
                changeFrequency: 'daily' as const,
                priority: 0.7,
            };
        })
        .filter(Boolean) as MetadataRoute.Sitemap;

    const categoryStatsUrls: MetadataRoute.Sitemap = [];

    gameStats.forEach((gameStat) => {
        const categories = gameStat.categories;

        if (!categories) return;

        categories.forEach((categoryStat) => {
            if (!categoryStat.displayValue) return;

            const split = categoryStat.displayValue.split('#');

            if (split.length !== 2) return;

            const [game, category] = split;

            categoryStatsUrls.push({
                url:
                    'https://therun.gg/races/stats/' +
                    safeEncodeURI(game) +
                    '/' +
                    safeEncodeURI(category),
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.6,
            });
        });
    });

    return [...gameStatsUrls, ...categoryStatsUrls];
};

const sitemapForTournaments = async (): Promise<MetadataRoute.Sitemap> => {
    const tournaments = await getAllTournamentSlugs();

    return tournaments.map((tournament) => ({
        url: 'https://therun.gg/' + tournament,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.6,
    }));
};

const sitemapForEvents = async (): Promise<MetadataRoute.Sitemap> => {
    const allEvents = await getAllEvents();

    return allEvents.map((event) => ({
        url: 'https://therun.gg/events/' + event.slug,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.4,
    }));
};

const sitemapForRuns = async (): Promise<MetadataRoute.Sitemap> => {
    const runs = await getAllSitemapRuns();

    return runs.map((run) => ({
        url:
            'https://therun.gg/' +
            run.user +
            '/' +
            safeEncodeURI(run.game) +
            '/' +
            safeEncodeURI(run.run),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
    }));
};
```

Key changes:
- **Race pagination**: Changed from `page++` post-increment with `===` to `while(true)` with `page >= totalPages` check, incrementing after
- **Users**: Replaced `getPaginatedUsers()` (admin endpoint) with `getSitemapUsers()` (public endpoint)
- **Runs**: Added new `sitemapForRuns()` using `getAllSitemapRuns()`
- **generateSitemaps**: Added `{ id: 5 }` for runs
- Removed unused `getPaginatedUsers` import

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add app/(old-layout)/dynamic-sitemap/sitemap.ts
git commit -m "fix(seo): fix sitemap - broken users endpoint, race pagination bug, add runs"
```

---

### Task 8: Remove duplicate in static sitemap

**Files:**
- Modify: `app/sitemap.tsx`

The existing static sitemap has a duplicate `/games` entry (lines 29-40). Remove the duplicate.

**Step 1: Remove duplicate games entry**

In `app/sitemap.tsx`, remove the second `/games` entry (lines 35-40):
```typescript
{
    url: 'https://therun.gg/games',
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
},
```

**Step 2: Commit**

```bash
git add app/sitemap.tsx
git commit -m "fix(seo): remove duplicate games entry from static sitemap"
```

---

### Task 9: Verify build

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors related to changed files

**Step 3: Clear build cache and build**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

**Step 4: Commit any lint auto-fixes if needed**

---

## Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/components/json-ld.tsx` | Create | Reusable JSON-LD script component |
| `src/utils/json-ld.ts` | Create | Builder functions for WebSite, Person, SportsEvent schemas |
| `src/lib/sitemap.ts` | Create | Data fetching for sitemap endpoints |
| `app/(old-layout)/page.tsx` | Modify | Add metadata + WebSite JSON-LD |
| `app/(old-layout)/[username]/page.tsx` | Modify | Add Person JSON-LD |
| `app/(old-layout)/[username]/[game]/[run]/page.tsx` | Modify | Add SportsEvent JSON-LD |
| `public/site.webmanifest` | Modify | Fill empty name/short_name |
| `app/(old-layout)/dynamic-sitemap/sitemap.ts` | Modify | Fix users, fix race pagination, add runs |
| `app/sitemap.tsx` | Modify | Remove duplicate games entry |

## Backend Dependencies

Already created by user:
- `GET /api/sitemap/users` → `{ result: [{ id, username }], cursor }`
- `GET /api/sitemap/runs?cursor=<id>` → `{ result: [{ id, user, game, run }], cursor }`
