# Frontend Integration Guide: IGDB Metadata & Game Customizations

## Overview

Games now carry rich metadata from IGDB (genres, platforms, developers, screenshots, etc.) and support visual/leaderboard/community customizations. All of this is available through the existing `pageData` read path and new write endpoints.

All responses follow `{ result: <data> }`. Errors return `{ error: "<message>" }`. Auth is via `Authorization: Bearer <sessionId>` header.

---

## Updated pageData Shape

`GET /game-mgmt/:gameId` now returns an expanded `pageData` with two new top-level keys: `metadata` and `customizations`.

```typescript
interface PageData {
  game: {
    id: number;
    display: string;
    image: string;
    seriesId: number | null;
    seriesDisplay: string | null;
    forceRealTime: boolean;
    autoCreated: boolean;
    // IGDB scalar fields (all nullable)
    summary: string | null;          // short game description
    storyline: string | null;        // longer narrative description
    igdbCategory: number | null;     // see IGDB Category Enum below
    firstReleaseDate: string | null; // ISO timestamp
    igdbRating: number | null;       // user rating 0-100
    aggregatedRating: number | null; // critic rating 0-100
    igdbUrl: string | null;          // link to IGDB page
  };
  ungroupedCategories: Category[];
  groups: CategoryGroup[];
  roles: Role[];
  aliases: string[];
  metadata: GameMetadata;            // NEW
  customizations: GameCustomizations | null; // NEW
  updatedAt: string;
}
```

### GameMetadata

All IGDB relation data, pre-joined and flattened for direct rendering.

```typescript
interface GameMetadata {
  genres: string[];                     // ["Platform", "Indie", "Adventure"]
  platforms: {
    name: string;                       // "PC (Microsoft Windows)"
    abbreviation: string | null;        // "PC"
  }[];
  companies: {
    name: string;                       // "Matt Makes Games"
    isDeveloper: boolean;
    isPublisher: boolean;
  }[];
  engines: string[];                    // ["Unity"]
  franchises: string[];                 // ["The Legend of Zelda"]
  themes: string[];                     // ["Action", "Science Fiction"]
  gameModes: string[];                  // ["Single player"]
  playerPerspectives: string[];         // ["Side view", "Bird view"]
  keywords: string[];                   // ["speedrun", "pixel art"]
  screenshots: string[];               // full URLs to IGDB-hosted images
  artworks: string[];                   // full URLs to promotional art
  videos: {
    name: string | null;                // video title
    youtubeId: string | null;           // YouTube video ID
  }[];
  websites: {
    category: number;                   // see IGDB Website Category Enum below
    url: string;
  }[];
  releaseDates: {
    date: string | null;                // ISO timestamp
    platform: string | null;            // platform name
    region: number | null;              // see IGDB Region Enum below
  }[];
}
```

### GameCustomizations

```typescript
interface GameCustomizations {
  visual: VisualCustomization | null;       // supporter-only
  leaderboard: LeaderboardCustomization | null; // supporter-only
  community: CommunityCustomization | null; // free for all
  flair: FlairCustomization | null;         // supporter-only
}

interface VisualCustomization {
  bannerImage?: string;       // hero image URL
  backgroundImage?: string;   // full page background URL
  backgroundPattern?: string; // "dots", "grid", etc.
  accentColor?: string;       // hex color, e.g. "#ff5500"
  theme?: string;             // "retro", "neon", "dark", etc.
  customIcon?: string;        // small icon URL
  animatedHeader?: {
    type: "parallax" | "video" | null;
    videoUrl?: string;
  };
}

interface LeaderboardCustomization {
  style?: "table" | "card";
  density?: "compact" | "comfortable" | "spacious";
  alternatingRows?: boolean;
  columnOrder?: string[];     // ["rank", "runner", "time", "date", "video"]
  highlightRules?: HighlightRule[];
  rankIcons?: Record<string, string>; // { "1": "url", "2": "url", "3": "url" }
}

interface HighlightRule {
  type: "topN" | "threshold";
  n?: number;                 // for topN
  under?: number;             // for threshold (seconds)
  colors?: string[];          // for topN: [gold, silver, bronze]
  color?: string;             // for threshold
}

interface CommunityCustomization {
  announcements?: {
    id: string;               // UUID
    text: string;
    pinned: boolean;
    createdAt: string;        // ISO timestamp
  }[];
  customLinks?: {
    label: string;            // "Discord", "Wiki", etc.
    url: string;
    icon?: string;            // icon identifier
  }[];
  featuredRuns?: number[];    // finished run IDs
  spotlight?: {
    userId: number;
    reason: string;
  } | null;
}

interface FlairCustomization {
  embedEnabled?: boolean;
  wrCelebration?: "confetti" | "flash" | "none";
  submissionSplash?: {
    message?: string;
    image?: string;
  };
}
```

---

## IGDB Enums

### Game Category (`igdbCategory`)

| Value | Meaning |
|-------|---------|
| 0 | Main game |
| 1 | DLC / Addon |
| 2 | Expansion |
| 3 | Bundle |
| 4 | Standalone expansion |
| 5 | Mod |
| 6 | Episode |
| 7 | Season |
| 8 | Remake |
| 9 | Remaster |
| 10 | Expanded game |
| 11 | Port |
| 12 | Fork |
| 13 | Pack |
| 14 | Update |

### Website Category (`metadata.websites[].category`)

| Value | Site |
|-------|------|
| 1 | Official |
| 2 | Wikia |
| 3 | Wikipedia |
| 4 | Facebook |
| 5 | Twitter |
| 6 | Twitch |
| 8 | Instagram |
| 9 | YouTube |
| 10 | iPhone |
| 11 | iPad |
| 12 | Android |
| 13 | Steam |
| 14 | Reddit |
| 15 | Itch.io |
| 16 | Epic Games |
| 17 | GOG |
| 18 | Discord |

### Release Date Region (`metadata.releaseDates[].region`)

| Value | Region |
|-------|--------|
| 1 | Europe |
| 2 | North America |
| 3 | Australia |
| 4 | New Zealand |
| 5 | Japan |
| 6 | China |
| 7 | Asia |
| 8 | Worldwide |
| 9 | Korea |
| 10 | Brazil |

---

## New Endpoints

### GET /game-mgmt/:id/igdb-preview

Fetch fresh IGDB metadata for a game without saving. Use this for a "Sync from IGDB" UI where the user can preview what IGDB has and selectively apply fields via `PUT /game-mgmt/:id`.

Returns the raw IGDB response structure (different from `pageData.metadata` — this is the source data before normalization).

```typescript
// Response
{
  result: {
    id: number;                  // IGDB game ID
    name: string;
    summary?: string;
    storyline?: string;
    slug?: string;
    url?: string;
    category?: number;
    first_release_date?: number; // unix timestamp (seconds)
    rating?: number;
    aggregated_rating?: number;
    cover?: { id: number; url: string };
    genres?: { id: number; name: string }[];
    platforms?: { id: number; name: string; abbreviation?: string }[];
    involved_companies?: {
      id: number;
      company: { id: number; name: string };
      developer: boolean;
      publisher: boolean;
    }[];
    franchises?: { id: number; name: string }[];
    game_engines?: { id: number; name: string }[];
    themes?: { id: number; name: string }[];
    game_modes?: { id: number; name: string }[];
    player_perspectives?: { id: number; name: string }[];
    keywords?: { id: number; name: string }[];
    screenshots?: { id: number; url: string; image_id: string }[];
    artworks?: { id: number; url: string; image_id: string }[];
    videos?: { id: number; name: string; video_id: string }[];
    websites?: { id: number; category: number; url: string }[];
    release_dates?: {
      id: number;
      date?: number;             // unix timestamp
      platform?: { id: number; name: string };
      region?: number;
    }[];
  }
}

// Error responses
{ error: "Game has no IGDB match" }     // 400 — game was never matched to IGDB
{ error: "IGDB data not found" }        // 404 — IGDB ID exists but IGDB returned nothing
```

**Auth:** Required. Needs `edit-game` on this game.

**Note:** `first_release_date` and `release_dates[].date` are unix timestamps (seconds), not ISO strings. Convert with `new Date(value * 1000)` on the frontend.

### GET /game-mgmt/:id/customizations

Fetch current customization settings for a game. Returns `{}` if no customizations have been set.

```typescript
// Response
{
  result: GameCustomizations | {}
}
```

**Auth:** None (public). Customizations are also embedded in `pageData`, so this endpoint is mainly useful for the edit form to get the current state without the full pageData payload.

### PUT /game-mgmt/:id/customizations

Update game customizations. Each top-level key (`visual`, `leaderboard`, `community`, `flair`) is independent — you can send just the one you're changing.

```typescript
// Request body (all keys optional — only send what you're changing)
{
  visual?: VisualCustomization;
  leaderboard?: LeaderboardCustomization;
  community?: CommunityCustomization;
  flair?: FlairCustomization;
}

// Response
{ result: { updated: true } }
```

**Auth:** Required. Needs `edit-customizations` on this game.

**Important:** Each key replaces the entire JSONB value for that domain. If you send `{ community: { announcements: [...] } }`, the entire `community` column is replaced — not merged. To add an announcement, read the current state first, append to the array, and send the full object back.

### PUT /game-mgmt/:id (expanded)

The existing game edit endpoint now accepts additional IGDB scalar fields.

```typescript
// Request body (all optional, in addition to existing fields)
{
  // Existing fields
  display?: string;
  image?: string;
  forceRealTime?: boolean;
  seriesId?: number | null;
  sortOrderInSeries?: number;

  // New IGDB scalar fields
  summary?: string | null;
  storyline?: string | null;
  igdbCategory?: number | null;
  firstReleaseDate?: string | null;      // ISO string
  igdbRating?: number | null;
  aggregatedRating?: number | null;
}

// Response
{ result: { updated: true } }
```

**Auth:** Required. Needs `edit-game` on this game.

---

## How IGDB Data Gets Populated

### Automatic (no frontend action needed)

When a game is first matched to IGDB (via the background image matching cron), the system now fetches the full metadata — not just the cover image. All relation data (genres, platforms, companies, etc.) is persisted automatically. The game's `pageData` is rebuilt to include the new metadata.

Once a game has been synced (`igdbSyncedAt` is set), the cron will not overwrite it again. Manual edits are safe.

### Manual Sync (frontend-driven)

For games that need a metadata refresh or were manually corrected:

1. **Fetch preview:** `GET /game-mgmt/:id/igdb-preview` to see current IGDB data
2. **Show diff UI:** Compare `pageData` values with the IGDB preview
3. **Apply selectively:** User picks which fields to update, frontend sends `PUT /game-mgmt/:id` with only the chosen fields

The IGDB preview endpoint does not write anything — it's read-only. The user controls what gets saved through the edit endpoint.

---

## Permissions

| Endpoint | Permission |
|----------|-----------|
| `GET /game-mgmt/:id` | Public |
| `GET /game-mgmt/:id/customizations` | Public |
| `GET /game-mgmt/:id/igdb-preview` | `edit-game` |
| `PUT /game-mgmt/:id` (including new fields) | `edit-game` |
| `PUT /game-mgmt/:id/customizations` | `edit-customizations` |

`edit-customizations` is granted to: `global-admin`, `series-admin`, `series-mod`, `game-admin`, `game-mod`.

### Supporter Gating

`visual`, `leaderboard`, and `flair` customizations are intended for supporters. The backend currently accepts all customization writes — supporter status enforcement is deferred to the frontend (or a future middleware). The `community` customization is free for all games.

---

## Frontend Page Architecture

### Game Page — New Sections

Using data from `pageData`:

**Game Info Panel:**
- `game.summary` — show below the game title
- `game.storyline` — expandable "About" section
- `game.firstReleaseDate` — format as year or full date
- `game.igdbCategory` — badge: "DLC", "Remake", etc. (use enum table above)
- `game.igdbRating` / `game.aggregatedRating` — star rating or score display
- `game.igdbUrl` — "View on IGDB" link

**Metadata Sidebar / Tags:**
- `metadata.genres` — genre tags/pills
- `metadata.platforms` — platform icons or labels (use `abbreviation` for compact display)
- `metadata.companies` — split into "Developed by" and "Published by" using `isDeveloper`/`isPublisher`
- `metadata.engines` — "Engine: Unity"
- `metadata.franchises` — "Part of: The Legend of Zelda"
- `metadata.themes` — theme tags
- `metadata.gameModes` — "Single player", "Co-op", etc.
- `metadata.playerPerspectives` — "Side view", "First person", etc.

**Media Gallery:**
- `metadata.screenshots` — image gallery/carousel
- `metadata.artworks` — promotional art gallery
- `metadata.videos` — embedded YouTube players (construct URL: `https://www.youtube.com/watch?v={youtubeId}`)

**External Links:**
- `metadata.websites` — render based on `category` enum (show icon + label: Steam, Discord, etc.)

**Release Info:**
- `metadata.releaseDates` — table/list of per-platform release dates with regions

### Customizations — Applying to the Page

**Visual** (`customizations.visual`):
- `bannerImage` — render as hero banner in the header area
- `backgroundImage` / `backgroundPattern` — apply to page container CSS
- `accentColor` — set as CSS custom property for themed elements
- `theme` — apply a CSS class for predefined themes
- `customIcon` — show in nav, breadcrumbs, search results
- `animatedHeader` — if `type === "parallax"`, apply parallax scroll effect; if `type === "video"`, render video background

**Leaderboard** (`customizations.leaderboard`):
- `style` — switch between table and card view components
- `density` — adjust padding/font-size per density level
- `alternatingRows` — toggle zebra striping CSS
- `columnOrder` — render columns in the specified order
- `highlightRules` — apply CSS classes based on rules:
  - `topN`: color the top N rows with the specified colors
  - `threshold`: highlight rows where time < `under` seconds
- `rankIcons` — replace "#1", "#2", "#3" text with `<img>` elements

**Community** (`customizations.community`):
- `announcements` — render pinned ones as a banner at the top of the game page
- `customLinks` — show in a "Resources" section (Discord, Wiki, Guides, etc.)
- `featuredRuns` — pin specific runs to a "Featured" section above the leaderboard
- `spotlight` — "Community Spotlight" card showing a featured runner with reason text

**Flair** (`customizations.flair`):
- `embedEnabled` — show/hide an "Embed" button that generates a leaderboard widget snippet
- `wrCelebration` — trigger animation when a new WR is set on the live page
- `submissionSplash` — show custom message/image on the run submission confirmation screen

---

## Typical Frontend Flows

### Flow: Mod Syncs IGDB Data

1. Mod opens game settings panel
2. Clicks "Sync from IGDB"
3. `GET /game-mgmt/:id/igdb-preview`
4. If error "Game has no IGDB match" — show message, offer manual search (future feature)
5. Show preview alongside current values, highlighting differences
6. Mod selects fields to update (checkboxes next to each field)
7. Build request body with only selected fields
8. `PUT /game-mgmt/:id` with selected scalar fields (summary, storyline, etc.)
9. Show success, re-fetch pageData after 500ms for updated values

### Flow: Mod Edits Game Summary

1. Mod opens game settings
2. Edits summary text in a textarea
3. `PUT /game-mgmt/:id` with `{ summary: "New description" }`
4. Optimistically update local state

### Flow: Mod Adds an Announcement

1. Mod opens customizations panel
2. `GET /game-mgmt/:id/customizations` to get current state
3. Mod types announcement text, toggles "pinned"
4. Append to existing `community.announcements` array:
   ```typescript
   const updated = {
     ...currentCustomizations.community,
     announcements: [
       ...(currentCustomizations.community?.announcements ?? []),
       { id: crypto.randomUUID(), text: "New rule!", pinned: true, createdAt: new Date().toISOString() }
     ]
   };
   ```
5. `PUT /game-mgmt/:id/customizations` with `{ community: updated }`
6. Optimistically update local state

### Flow: Supporter Customizes Leaderboard

1. Supporter (game-admin) opens customization panel
2. Selects "Card" style, "comfortable" density
3. Drags columns to reorder: rank, runner, time, video, date
4. Adds highlight rule: top 3 with gold/silver/bronze
5. Adds threshold rule: sub-hour runs in green
6. ```typescript
   PUT /game-mgmt/:id/customizations
   {
     leaderboard: {
       style: "card",
       density: "comfortable",
       columnOrder: ["rank", "runner", "time", "video", "date"],
       highlightRules: [
         { type: "topN", n: 3, colors: ["#FFD700", "#C0C0C0", "#CD7F32"] },
         { type: "threshold", under: 3600, color: "#00ff88" }
       ]
     }
   }
   ```
7. Preview updates live, pageData rebuilds in background

### Flow: Supporter Sets Custom Theme

1. Supporter opens visual customization
2. Picks accent color via color picker
3. Uploads banner image (to your image hosting, gets URL back)
4. Selects "retro" theme preset
5. ```typescript
   PUT /game-mgmt/:id/customizations
   {
     visual: {
       accentColor: "#ff5500",
       bannerImage: "https://cdn.therun.gg/banners/game123.png",
       theme: "retro"
     }
   }
   ```

### Flow: Rendering a Game Page with Customizations

```typescript
// Pseudocode for applying customizations
const { game, metadata, customizations } = pageData;

// Apply visual theme
if (customizations?.visual) {
  const v = customizations.visual;
  if (v.accentColor) document.documentElement.style.setProperty('--accent', v.accentColor);
  if (v.theme) containerRef.classList.add(`theme-${v.theme}`);
  if (v.backgroundImage) containerRef.style.backgroundImage = `url(${v.backgroundImage})`;
}

// Render metadata
const developers = metadata.companies.filter(c => c.isDeveloper).map(c => c.name);
const publishers = metadata.companies.filter(c => c.isPublisher).map(c => c.name);

// Render leaderboard with customizations
const lbConfig = customizations?.leaderboard;
const columns = lbConfig?.columnOrder ?? ["rank", "runner", "time", "date"];
const style = lbConfig?.style ?? "table";

// Apply highlight rules to rows
function getRowStyle(rank: number, time: number) {
  for (const rule of lbConfig?.highlightRules ?? []) {
    if (rule.type === "topN" && rank <= rule.n && rule.colors?.[rank - 1]) {
      return { backgroundColor: rule.colors[rank - 1] };
    }
    if (rule.type === "threshold" && rule.under && time < rule.under * 1000) {
      return { backgroundColor: rule.color };
    }
  }
  return {};
}
```

---

## Notes

- **pageData is the primary read path.** Metadata and customizations are embedded in pageData so you don't need separate fetches for page renders. Use the individual endpoints (`GET /customizations`, `GET /igdb-preview`) only for edit UIs.
- **Customization writes replace entire domains.** When updating `community`, send the complete `community` object — not a partial merge. Read current state first.
- **IGDB metadata is populated automatically** on first match. Manual edits via `PUT /game-mgmt/:id` are never overwritten by the background sync.
- **IGDB preview returns raw IGDB data** with snake_case keys and unix timestamps. The `pageData.metadata` uses camelCase and ISO strings. The frontend needs to transform when applying preview data to edit fields.
- **Screenshots/artworks are IGDB-hosted URLs.** They use IGDB's CDN (`images.igdb.com`). Consider proxying or caching if you need reliability guarantees.
