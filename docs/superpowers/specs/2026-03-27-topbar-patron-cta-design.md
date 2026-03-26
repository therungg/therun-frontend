# Topbar Patron CTA — Design Spec

## Goal

Replace the static "Support us" link in the topbar with a rotating widget that cycles through featured patron names and a CTA. Primary purpose: **conversion** — use social proof to encourage new patrons.

## Current State

- The topbar utilities section contains a `Link` to `/patron` styled as a pill button: `"Support us" + BunnyIcon`
- Hidden on mobile (`< 992px`), visible on desktop
- Styled in `Topbar.module.scss` via `.supportLink`

## Design

### Rotating Widget

Replace the static link with a client component that cycles through up to three slides, all linking to `/patron`:

1. **Supporter of the Day** — `"Supporter of the Day: {name}"` with patron color styling and optional bunny icon
2. **Latest Patron** — `"Welcome {name}!"` with patron color styling and optional bunny icon
3. **CTA** — `"Support us"` with bunny icon (the current static content)

Slides rotate on a ~5-second interval with a crossfade transition. Animation pauses on hover so users can read and click.

### Null Handling

- If `supporterOfTheDay` is `null`, skip that slide
- If `latestPatron` is `null`, skip that slide
- If both are `null`, render the static "Support us" link (no rotation)

### Patron Name Display

- If the patron has `preferences`, render using `PatreonName` component with their `colorPreference` and `showIcon` setting
- If `preferences` is `null`, render `patreonName` as plain text
- Display `username` if available, fall back to `patreonName`

### Layout

- Same footprint as the existing `.supportLink` pill — fixed width container to prevent layout shift during rotation
- `overflow: hidden` on the container, slides transition vertically or via opacity
- Height matches the current link height

## Data

### API Endpoint

```
GET {NEXT_PUBLIC_PATREON_API_URL}/featured
```

No authentication required. Returns:

```typescript
interface FeaturedPatron {
    patronId: number;
    patreonName: string;
    tier: number;
    username: string | null;
    preferences: PatronPreferences | null;
}

interface FeaturedPatronsResponse {
    supporterOfTheDay: FeaturedPatron | null;
    latestPatron: FeaturedPatron | null;
}
```

`PatronPreferences` reuses the existing type from `types/patreon.types.ts` (needs to be exported).

### Data Fetching

Server-side cached function:

```typescript
export async function getFeaturedPatrons(): Promise<FeaturedPatronsResponse> {
    'use cache';
    cacheLife('hours');
    cacheTag('featured-patrons');

    const url = `${process.env.NEXT_PUBLIC_PATREON_API_URL}/featured`;
    return fetcher(url);
}
```

Called from the server layout that renders the topbar, with the result passed as props to the client-side rotation widget.

## Component Structure

### New Files

- `src/components/Topbar/PatronCta.tsx` — client component, receives `FeaturedPatronsResponse` as props, handles rotation logic and rendering
- `src/components/Topbar/PatronCta.module.scss` — animation styles (crossfade, fixed container)
- `src/lib/featured-patrons.ts` — server-side `getFeaturedPatrons()` function

### New Types

Add to `types/patreon.types.ts`:

```typescript
export interface FeaturedPatron {
    patronId: number;
    patreonName: string;
    tier: number;
    username: string | null;
    preferences: PatronPreferences | null;
}

export interface FeaturedPatronsResponse {
    supporterOfTheDay: FeaturedPatron | null;
    latestPatron: FeaturedPatron | null;
}
```

Export `PatronPreferences` (currently not exported).

### Modified Files

- `Topbar.tsx` — replace the static `<Link>` with `<PatronCta>`, pass featured patron data as props
- `Topbar.module.scss` — may remove `.supportLink` or repurpose for the new widget
- The server component that renders `<Topbar>` (layout file) — call `getFeaturedPatrons()` and pass result down

## Styling

- Reuse the existing `.supportLink` pill styling (border, border-radius, padding, colors, dark mode)
- Fixed width to prevent layout shift — set to accommodate the longest expected slide text
- Crossfade: slides use `opacity` and `position: absolute` within the container, transitioning over ~300ms
- `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` as safety for long names

## Edge Cases

- Both fields null → static "Support us" link, no rotation
- Only one field present → alternate between that patron and the CTA (2 slides)
- Very long patron names → truncated with ellipsis within fixed container width
- Patron with `preferences.hide = true` → should not be returned by the API, but if received, skip
