# SEO Improvements: Home Page & User Run Pages

## Problem

therun.gg has 51k indexed pages ranking poorly and 50k pages marked "Crawled - currently not indexed" in Google Search Console. Target queries are runner-specific ("{username} speedrun", "{username} PB") and generic ("speedrun statistics", "live speedruns", "speedrun tracker").

## Root Causes

1. **Home page has no crawlable content** — All sections (trending games, PB feed, races, community pulse) are behind Suspense boundaries. Google sees skeleton placeholders, not content.
2. **Run pages have thin content** — Title, a stats table, and tab labels. 50k+ structurally identical pages with minimal unique text triggers Google's "low-value" filter.
3. **Wrong JSON-LD on run pages** — Uses `ProfilePage > Person` schema (same as user profiles). Doesn't describe the actual content: a speedrun record with times, splits, and history.
4. **No breadcrumb schema** — Google can't understand the site hierarchy (home > user > game > category).
5. **Metadata robots bug** — All four `robots` fields (`index`, `follow`, `googleBot.index`, `googleBot.follow`) use `props?.index || true`. The `||` operator means `false || true` evaluates to `true`, so you can never set `noindex`. And `follow` reads `index` instead of its own prop.
6. **Sitemap timestamps always `new Date()`** — Every generation updates all timestamps, signaling fake freshness to Google.

## Design

### 1. Home Page: Server-Rendered Content

**Goal:** Give Google crawlable text that establishes therun.gg as a speedrun statistics platform.

#### 1a. Static intro section

Add a server-rendered section above or below the hero that contains actual text describing the platform. Not a marketing page — a brief, factual description with relevant keywords that Google can index.

```
therun.gg is a free speedrun statistics platform. Track live speedruns,
compare personal bests, view leaderboards, analyze splits, and race other
speedrunners across thousands of games.
```

This should be an `<h1>` or prominent heading + paragraph, rendered server-side (no Suspense).

#### 1b. Server-render all sections except the hero

Production benchmarks show all frontpage API calls complete in under 400ms, with most under 200ms. The only slow call is the hero's `/live?limit=5` at ~700ms. Since all sections fetch in parallel, the total wall time without the hero is ~350ms (bottleneck: recent PBs) — acceptable for server rendering.

**Benchmark results (production, averaged over 2 runs):**

| Section | Endpoint | Avg |
|---|---|---|
| Hero: top 5 live runs | `/live?limit=5` | ~700ms |
| Hero: live count | `/live/count` | ~165ms |
| Trending: game activity | `/games/activity` | ~170ms |
| Trending: category activity (per game) | `/games/activity` | ~175ms |
| PB Feed: notable PBs | `/v1/finished-runs` | ~205ms |
| PB Feed: recent PBs | `/v1/finished-runs` | ~350ms |
| PB Feed: game image map | `/v1/runs/games` | ~180ms |
| Races: active races | `/active` | ~325ms |
| Races: finished races | `?page=1&pageSize=6` | ~190ms |
| Community: global stats | `/global-stats` | ~175ms |
| Community: global stats 24h | `/global-stats?offset=24h` | ~165ms |
| Patreon: all patrons | lambda | ~260ms |

**Decision:** Remove Suspense from all sections *except* the hero. The hero is both the slowest call (~700ms) and the most ephemeral content (live data changes every second — zero SEO value). Keep the hero in Suspense with a skeleton fallback.

Sections to server-render (remove Suspense wrappers):
- **Trending Games** — Game names, runner counts, activity data (~170ms)
- **PB Feed** — Runner names, game names, PB times (~350ms, the bottleneck)
- **Races** — Active and finished races (~325ms)
- **Community Pulse** — Global stats, 24h stats (~175ms)
- **Patreon** — Patron list (~260ms)

**Your Stats** remains Suspense-wrapped because it's user-specific (requires auth, not crawlable).

**Architectural note:** The frontpage uses a configurable layout system — sections are passed as a `Record<SectionId, ReactNode>` to the client-side `FrontpageLayout` component. To avoid blocking the entire page on these fetches, the server-rendered sections should be extracted and rendered directly in `page.tsx` or `frontpage.tsx` *outside* the `FrontpageLayout` sections map. They can still appear visually in the same position via CSS, but must be in the server response independently of the layout component. The hero and Your Stats sections remain in the sections map with Suspense.

#### 1c. Structured data for home page

Add `ItemList` schema for trending games, giving Google a structured list of the most active games on the platform.

### 2. Run Pages: Content Enrichment

**Goal:** Transform run pages from thin data tables into content-rich pages that provide unique value.

#### 2a. Server-rendered narrative summary

Add a prose summary section rendered server-side on each run page. Data is already fetched server-side in `page.tsx`. Generate a text block like:

```
{username} has completed {attempts} attempts of {game} - {category},
with a personal best of {pb}. Their sum of best segments is {sob},
meaning there's {timeSave} of potential time save. They've spent
{totalRunTime} on this category.
```

If the run has splits data available server-side, include:
```
Their run consists of {splitCount} segments. {username} has been
running this category since {firstSessionDate}.
```

This is not filler — it's the same data that's in the stats table, but in a format Google can parse for relevance signals. Render this as a visible `<p>` element, not `visually-hidden`.

**Important:** `run.tsx` is a `'use client'` component. The narrative summary and server-rendered stats (2a, 2c) must be rendered in `page.tsx` (the server component), *not* inside `RunDetail`. Pass the run data to a new server-rendered section in `page.tsx` that sits above or alongside the `RunDetail` client component.

#### 2b. Remove visually-hidden stats hack

The current `visually-hidden aria-hidden="true"` stats div is counterproductive. Google may penalize hidden content. Replace it with the narrative summary from 2a, which serves the same SEO purpose but is visible to users.

#### 2c. Server-render the Stats tab content

The Stats component (PB, attempts, finished, completion %, SoB, time to save, total run time) should be rendered server-side as part of the initial HTML. This data is already available in `page.tsx`.

Since `run.tsx` (`RunDetail`) is a `'use client'` component, the server-rendered stats must live outside it. Create a new server component (e.g., `RunStatsSummary`) rendered in `page.tsx` alongside `RunDetail`. The client-side Stats component inside `RunDetail` can remain for interactive/live updates, but the initial data is visible in the server HTML via the new component.

#### 2d. Heading hierarchy

The run page already has an `<h1>` via the `<Title>` component. Ensure the subsections use proper heading levels:
- `<h1>`: Already exists — `{game} - {category}` via `<Title>`
- `<h2>`: "Statistics" (for the new server-rendered stats section)
- `<h2>`: "Splits" (when splits are visible)
- `<h2>`: "Run History" / "Sessions" etc. for other major sections

### 3. User Profile Pages: Minor Improvements

User profiles are in better shape. Targeted fixes:

#### 3a. Heading hierarchy

Ensure `<h1>` is the username. Verify the current rendering uses proper heading tags.

#### 3b. Server-rendered game list

The list of games/categories the user runs should be in the initial server HTML. This provides unique keyword-rich content (game names, category names, PB times) that differentiates each profile page.

### 4. JSON-LD Schema Fixes

#### 4a. Run pages: Replace ProfilePage with appropriate schema

Current: `ProfilePage > Person` (wrong — this is a speedrun record, not a profile).

Replace with a combination of:
- `BreadcrumbList` for navigation context
- `WebPage` with descriptive `about` — there's no perfect schema.org type for speedruns. `SportsEvent` implies a scheduled event with start/end dates, which doesn't fit a persistent stats page. `WebPage` is safe and honest.

Recommended structure:
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "{game} - {category} speedrun stats by {username}",
  "url": "https://therun.gg/{username}/{game}/{category}",
  "description": "...",
  "mainEntity": {
    "@type": "Person",
    "name": "{username}",
    "url": "https://therun.gg/{username}"
  },
  "about": {
    "@type": "VideoGame",
    "name": "{game}"
  },
  "dateCreated": "{firstPBDate}",
  "dateModified": "{lastSessionDate}"
}
```

This tells Google: "this page is about a person's performance in a specific video game" without misrepresenting the content type.

#### 4b. Add BreadcrumbList to all pages

Add breadcrumb structured data:
- Run pages: `Home > {username} > {game} > {category}`
- User pages: `Home > {username}`
- Game pages: `Home > Games > {game}`

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://therun.gg" },
    { "@type": "ListItem", "position": 2, "name": "{username}", "item": "https://therun.gg/{username}" },
    { "@type": "ListItem", "position": 3, "name": "{game}", "item": "https://therun.gg/{username}/{game}" },
    { "@type": "ListItem", "position": 4, "name": "{category}" }
  ]
}
```

#### 4c. Add VideoObject for runs with VODs

When a run has a highlighted VOD URL, add `VideoObject` schema. Note: `thumbnailUrl` is required by Google for Video rich results.
```json
{
  "@type": "VideoObject",
  "name": "{game} - {category} speedrun by {username}",
  "description": "...",
  "contentUrl": "{vodUrl}",
  "thumbnailUrl": "{userProfilePhoto or gameImage}",
  "uploadDate": "{date}"
}
```
If no suitable thumbnail is available, use the user's profile photo or the game image as a fallback. If neither exists, omit the `VideoObject` entirely rather than generating validation errors.

### 5. Metadata Fixes

#### 5a. Fix robots bug

In `src/utils/metadata.ts`, all four robots fields have the same two bugs:
```typescript
robots: {
    index: props?.index || true,    // bug: || true means false || true = true (can never noindex)
    follow: props?.index || true,   // bug: reads index instead of follow, same || issue
    googleBot: {
        index: props?.index || true,
        follow: props?.index || true,
    },
},
```

Fix all four lines using `??` (nullish coalescing) and the correct prop:
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

**This fix is a prerequisite for Section 6a** (noindex on low-activity runs). Without it, `index: false` silently becomes `true`.

#### 5b. Improve run page titles for CTR

Current: `{username}: {game} - {category}`

Better for search: `{username}'s {game} {category} Speedrun Stats | PB: {time}`

This front-loads the search terms people use and includes the PB time which differentiates results.

#### 5c. Improve home page title

Current: `Speedrun Statistics, Live Runs & Leaderboards`

Better: `therun.gg - Free Speedrun Statistics & Live Run Tracker`

Includes the brand name (people search for "therun.gg") and "free" as a differentiator.

#### 5d. ~~Add more specific keywords per page~~ (removed)

Google officially ignores the `keywords` meta tag. Not worth implementing.

### 6. Technical Crawl Optimization

#### 6a. Canonical URL strategy

For the 50k "crawled, not indexed" pages: many run pages may have near-identical content (same game/category, different users with very few attempts). Consider:
- Pages with fewer than N attempts (e.g., 5) should have `noindex` — they add no value and dilute crawl budget.
- Ensure every indexed page has a self-referencing canonical URL.

Implementation: In the run page `generateMetadata`, check attempt count and set `index: false` for low-activity runs.

```typescript
const shouldIndex = run.attemptCount >= 5;
return buildMetadata({
    // ...
    index: shouldIndex,
});
```

#### 6b. Fix sitemap timestamps

Replace `lastModified: new Date()` with actual last-modified dates:
- Run sitemaps: use the run's last session date from the API data
- User sitemaps: use the user's last active date
- Static sitemap: use a fixed date or build date

This gives Google accurate freshness signals instead of "everything changed right now."

#### 6c. Sitemap priority tuning

Adjust priorities based on content quality:
- User profiles with many runs: priority 0.8 (keep)
- Run pages with many attempts: priority 0.6
- Run pages with few attempts: priority 0.3 (or exclude entirely per 6a)

#### 6d. Internal linking

Add contextual internal links on run pages:
- Link to the user's profile
- Link to the game page
- Link to other categories the user runs in the same game

These already partially exist as navigation, but ensure they're semantic `<a>` tags (not JS-only navigation) and visible to crawlers.

### 7. robots.txt Update

Current robots.txt blocks all AI crawlers. This is fine. No changes needed unless you want to allow specific bots for discovery purposes.

Consider adding a `robots.ts` API route instead of the static file, so it can be version-controlled with the app and dynamically reference all sitemap indexes (currently hardcoded to sitemaps 0-6, but the dynamic sitemap can generate more).

## Files to Modify

| File | Changes |
|------|---------|
| `app/(new-layout)/page.tsx` | Add static intro section, structured data |
| `app/(new-layout)/frontpage/frontpage.tsx` | Remove Suspense from trending/PB sections |
| `app/(new-layout)/[username]/[game]/[run]/page.tsx` | Add narrative summary, server-rendered stats (new `RunStatsSummary` component), heading hierarchy, canonical self-ref |
| `app/(new-layout)/[username]/[game]/[run]/run.tsx` | Remove visually-hidden stats div |
| `app/(new-layout)/[username]/page.tsx` | Verify heading hierarchy, server-render game list |
| `src/utils/json-ld.ts` | New schema builders: WebPage (run), BreadcrumbList, VideoObject; replace ProfilePage on run pages |
| `src/utils/metadata.ts` | Fix robots bug (all 4 fields), improve title templates |
| `app/sitemap.tsx` | Fix timestamps |
| `app/(new-layout)/dynamic-sitemap/sitemap.ts` | Fix timestamps, adjust priorities, filter low-activity runs |
| `src/components/json-ld.tsx` | No changes needed (generic renderer) |

## Out of Scope

- Internationalization / hreflang (English only)
- Link building / off-page SEO
- Page speed optimization (separate concern)
- New pages or content types
- Marketing landing pages
