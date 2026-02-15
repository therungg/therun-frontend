# SEO Metadata Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve all generateMetadata calls across the site for better search engine visibility — enrich dynamic pages with real data, fix bugs in buildMetadata(), add metadata to blog posts.

**Architecture:** Fix the shared `buildMetadata()` helper first (bug fixes), add a server-safe `formatDuration()` utility, then update each page's `generateMetadata` to fetch and display real data. All data fetching functions are already cached with `'use cache'`.

**Tech Stack:** Next.js 16 App Router, TypeScript, `'use cache'` directive

---

### Task 1: Fix buildMetadata() bugs

**Files:**
- Modify: `src/utils/metadata.ts:86-93`

**Step 1: Fix index/follow logic**

The `robots` block uses `props?.index || true` which always evaluates to `true` (short-circuit). Also, `follow` incorrectly references `props?.index` instead of `props?.follow`. Fix both:

```typescript
robots: {
    index: props?.index ?? true,
    follow: props?.follow ?? true,
    googleBot: {
        index: props?.index ?? true,
        follow: props?.follow ?? true,
    },
},
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
fix: use nullish coalescing for robots index/follow in buildMetadata
```

---

### Task 2: Add formatDuration() utility

**Files:**
- Modify: `src/utils/metadata.ts`

**Step 1: Add formatDuration function**

Add this function to `src/utils/metadata.ts`. It formats millisecond strings (which is what `Run.personalBest`, `Run.sumOfBests`, `Run.totalRunTime` contain) into human-readable durations for SEO descriptions. This mirrors the logic from `src/components/util/datetime.tsx:getFormattedString` but is server-safe (no 'use client' dependency).

```typescript
/**
 * Formats a millisecond duration string into a human-readable format for metadata.
 * Examples: "6563000" -> "1:49:23", "360000" -> "06:00", "86400000" -> "24h 00m"
 */
export function formatDuration(ms: string | undefined): string | null {
    if (!ms) return null;

    const milli = parseInt(ms);
    if (!milli && milli !== 0) return null;

    const seconds = String(Math.floor((milli / 1000) % 60)).padStart(2, '0');
    const minutes = String(Math.floor((milli / (60 * 1000)) % 60)).padStart(2, '0');
    const hours = Math.floor(milli / (60 * 60 * 1000));

    if (hours >= 100) return `${hours} hours`;
    if (hours >= 10) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}:${minutes}:${seconds}`;
    return `${minutes}:${seconds}`;
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
feat: add formatDuration utility for SEO metadata descriptions
```

---

### Task 3: Enrich [run]/page.tsx metadata with run data

**Files:**
- Modify: `app/(old-layout)/[username]/[game]/[run]/page.tsx:61-76`

**Step 1: Update generateMetadata to fetch run data**

The `getRun()` function is already cached with `'use cache'` + `cacheLife('minutes')` so calling it in metadata is free when the page also calls it. Import `formatDuration` and `getGameImage` from metadata utils. Import `getRun` from get-run lib.

Replace the existing `generateMetadata` function:

```typescript
export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username = params.username;

    if (!username) return buildMetadata();

    const game = safeDecodeURI(params.game);
    const category = safeDecodeURI(params.run);

    const [run, images] = await Promise.all([
        getRun(username, params.game, params.run).catch(() => null),
        getUserProfilePhoto(username),
    ]);

    const title = `${username}: ${game} - ${category}`;

    if (!run) {
        return buildMetadata({
            title,
            description: `${username}'s ${game} - ${category} speedrun on The Run`,
            images,
        });
    }

    const parts = [`${username}'s ${game} - ${category} speedrun`];

    const pb = formatDuration(run.personalBest);
    if (pb) parts.push(`PB: ${pb}`);

    parts.push(`${run.attemptCount} attempts`);

    const totalTime = formatDuration(run.totalRunTime);
    if (totalTime) parts.push(`${totalTime} played`);

    const sob = formatDuration(run.sumOfBests);
    if (sob) parts.push(`Sum of bests: ${sob}`);

    return buildMetadata({
        title,
        description: parts.join(' | '),
        images,
    });
}
```

Note: `formatDuration` must be imported from `~src/utils/metadata`.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
feat: enrich run page metadata with PB, attempts, and playtime
```

---

### Task 4: Enrich [username]/page.tsx metadata with user games

**Files:**
- Modify: `app/(old-layout)/[username]/page.tsx:119-139`

**Step 1: Update generateMetadata to show games**

Import `getUserRuns` from `~src/lib/get-user-runs`. Fetch runs in metadata and extract unique game names to build the description.

Replace the existing `generateMetadata` function:

```typescript
export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username = params.username;

    if (!username) return buildMetadata();

    const tournament = getTournamentNameFromSlug(username);

    if (tournament) {
        return buildMetadata({
            title: 'Speedrun tournament ' + tournament,
            description: 'Speedrun tournament ' + tournament,
        });
    }

    const [runs, images] = await Promise.all([
        getUserRuns(username).catch(() => [] as Run[]),
        getUserProfilePhoto(username),
    ]);

    const uniqueGames = [...new Set(runs.map((r) => r.game))];
    let description: string;

    if (uniqueGames.length === 0) {
        description = `${username} is on The Run! View their games, runs, and more.`;
    } else if (uniqueGames.length === 1) {
        description = `${username} on The Run | Runs ${uniqueGames[0]}`;
    } else if (uniqueGames.length <= 3) {
        description = `${username} on The Run | Runs ${uniqueGames.join(', ')}`;
    } else {
        const shown = uniqueGames.slice(0, 2).join(', ');
        description = `${username} on The Run | Runs ${shown}, and ${uniqueGames.length - 2} other games`;
    }

    return buildMetadata({
        title: username,
        description,
        images,
    });
}
```

Note: Import `Run` from `~src/common/types` (for the `.catch()` type annotation).

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
feat: enrich user profile metadata with game names
```

---

### Task 5: Enrich [username]/[game]/page.tsx (custom URL) metadata

**Files:**
- Modify: `app/(old-layout)/[username]/[game]/page.tsx:43-61`

**Step 1: Update generateMetadata with run stats**

This page already fetches the run in metadata via `getRunByCustomUrl`. Add `formatDuration` import and enrich the description with PB and attempt stats, matching the [run] page pattern.

Replace the existing `generateMetadata` function:

```typescript
export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username: string = params.username as string;
    const customUrl: string = params.game as string;

    if (!username || !customUrl) return buildMetadata();

    const [run, images] = await Promise.all([
        getRunByCustomUrl(username, customUrl),
        getUserProfilePhoto(username),
    ]);

    const gameAndCategory = `${run.game} - ${run.run}`;
    const title = `${username}: ${gameAndCategory}`;

    const parts = [`${username}'s ${gameAndCategory} speedrun`];

    const pb = formatDuration(run.personalBest);
    if (pb) parts.push(`PB: ${pb}`);

    parts.push(`${run.attemptCount} attempts`);

    const totalTime = formatDuration(run.totalRunTime);
    if (totalTime) parts.push(`${totalTime} played`);

    return buildMetadata({
        title,
        description: parts.join(' | '),
        images,
    });
}
```

Note: Import `formatDuration` from `~src/utils/metadata`.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
feat: enrich custom URL run page metadata with PB and attempts
```

---

### Task 6: Fix events/[event]/page.tsx to use buildMetadata()

**Files:**
- Modify: `app/(old-layout)/events/[event]/page.tsx:13-41`

**Step 1: Replace custom metadata with buildMetadata()**

The event page currently builds metadata manually, missing robots, keywords, manifest, and referrer directives. Switch to `buildMetadata()` while preserving the existing event-specific data.

```typescript
import buildMetadata from '~src/utils/metadata';

// ... existing imports ...

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const event = await getEventById(params.event);

    if (event.isDeleted) {
        return buildMetadata({
            description: 'Event not found',
            index: false,
        });
    }

    const description = event.shortDescription || `${event.name} on therun.gg`;

    return buildMetadata({
        title: event.name,
        description,
        images: event.imageUrl
            ? [{ url: event.imageUrl, alt: event.name }]
            : undefined,
    });
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
fix: use buildMetadata() for event page for consistent robots/keywords
```

---

### Task 7: Add metadata to blog/[post]/page.tsx

**Files:**
- Modify: `app/(footer)/blog/[post]/page.tsx`

**Step 1: Add generateMetadata with post title mapping**

The blog posts are hardcoded (4 total). Since `getBlogs()` is in a 'use client' file and returns React elements, create a simple title/description mapping in the page file. Use `generateMetadata` (dynamic) since it depends on the `[post]` param.

```typescript
import { Metadata } from 'next';
import buildMetadata from '~src/utils/metadata';
import { Post } from './post';

const posts = [
    'welcome-to-the-run',
    'twitch-extension',
    'the-run-live',
    'the-run-racing',
];

const postMeta: Record<string, { title: string; description: string }> = {
    'welcome-to-the-run': {
        title: 'Welcome to The Run!',
        description:
            'Introducing The Run — a free speedrun statistics tool. Learn about the launch, the features, and what comes next.',
    },
    'twitch-extension': {
        title: 'The Run Twitch Extension',
        description:
            'The Run now has a Twitch extension! Display your live speedrun splits and statistics directly on your Twitch stream.',
    },
    'the-run-live': {
        title: 'The Run Live',
        description:
            'Introducing The Run Live — watch speedrunners in real time with live splits, comparisons, and statistics.',
    },
    'the-run-racing': {
        title: 'The Run Racing',
        description:
            'Introducing racing on The Run — race other speedrunners head-to-head with live tracking and leaderboards.',
    },
};

export async function generateMetadata(props: {
    params: Promise<{ post: string }>;
}): Promise<Metadata> {
    const params = await props.params;
    const meta = postMeta[params.post];

    if (!meta) return buildMetadata({ description: 'Blog post on The Run' });

    return buildMetadata({
        title: meta.title,
        description: meta.description,
    });
}

export default async function PostPage(props: {
    params: Promise<{ post: string }>;
}) {
    const params = await props.params;
    const { post } = params;
    const postIndex = posts.findIndex((blog) => blog === post);
    return <Post index={postIndex} />;
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
feat: add metadata for individual blog posts
```

---

### Task 8: Final verification

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

**Step 3: Run build**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

**Step 4: Commit any lint fixes if needed**
