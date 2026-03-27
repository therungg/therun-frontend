# Topbar Patron CTA Redesign — Design Spec

## Goal

Replace the current rotating pill widget with a prominent Spotlight Strip that takes up meaningful topbar real estate. Make it eye-catching, readable, and emotionally compelling — hitting social proof, aspiration (colored names, bunny icon), gratitude, and community belonging.

## Current State

- `PatronCta` is a small rotating pill that cycles through "Supporter of the Day: {name}", "Welcome {name}!", and "Support us"
- Hidden on mobile, easy to miss on desktop, feels bolted on
- All slides link to `/patron`

## Design

### Desktop (>= 992px): Spotlight Strip

A contained card positioned between the nav links and utility icons (search, theme toggle, user menu). Takes up a significant portion of the topbar's horizontal space.

**Layout (left to right):**

1. **Bunny icon** (~22px) — anchors the left side, provides visual identity
2. **Two-line text area:**
   - Top: small uppercase label — "Patron of the day" or "Latest patron"
   - Bottom: patron's display name rendered with their tier color/gradient, bold
3. **"Become a Patron" button** — solid green (#608C59), white text, always visible

**Styling:**
- Background: subtle green gradient (`rgba(96,140,89,0.14)` to `rgba(96,140,89,0.03)`)
- Border: `1px solid rgba(96,140,89,0.25)`, `border-radius: 10px`
- Generous padding for breathing room — the previous version was cramped
- Dark mode: slightly adjusted opacity values, same color family
- `max-width: ~460px`, flex: 1 to fill available space

The entire strip is a link to `/patron`, not just the button.

### Mobile (< 992px): Inside Hamburger Menu

Not shown in the topbar. Instead, rendered as a prominent card at the top of the mobile navigation menu. Same content — bunny icon, label, patron name, CTA button — laid out to fit the menu width.

### Rotation

Two slides only (no "Support us" slide — the button handles that):

1. **Supporter of the Day** — label: "Patron of the day", name with tier styling
2. **Latest Patron** — label: "Latest patron", name with tier styling

Cycles every 5 seconds. **Slide-up transition** — new content slides up from below, old content slides out the top. Only the two-line text area animates; the bunny icon and CTA button remain static.

Pauses on hover and focus.

### Null Handling

- Both fields present → rotate between them (2 slides)
- Only one field present → show it statically (no rotation)
- Both null → show bunny icon + "Support therun.gg" as the label, "Become a Patron" button remains

### Patron Name Display

- Display `username` if available, fall back to `patreonName`
- If patron has `preferences`: render with `PatreonName` component using `colorPreference`, use `icon={false}` and render standalone `BunnyIcon` if `showIcon` is true (avoid tooltip clipping)
- If `preferences` is null: render name as plain text

## Data

No API changes. Uses existing `FeaturedPatronsResponse` from `GET {NEXT_PUBLIC_PATREON_API_URL}/featured`.

```typescript
interface FeaturedPatronsResponse {
    supporterOfTheDay: FeaturedPatron | null;
    latestPatron: FeaturedPatron | null;
}
```

Fetched server-side in `header.tsx` via `getFeaturedPatrons()` (cached for hours), passed as props through `Topbar` → `PatronCta`.

## Files to Modify

- `src/components/Topbar/PatronCta.tsx` — rewrite component with new layout, slide-up animation, two-line card design
- `src/components/Topbar/PatronCta.module.scss` — rewrite styles for spotlight strip, slide-up transition, mobile menu placement
- `src/components/Topbar/Topbar.tsx` — adjust PatronCta positioning, add mobile menu integration

No new files. No type changes. No API changes.

## Accessibility

- `aria-live="polite"` on the rotating text area
- `prefers-reduced-motion`: disable slide animation, show first available slide statically
- Pause rotation on hover and focus
- Keyboard-accessible: entire strip is a link, button is focusable
- Sufficient color contrast in both light and dark modes

## Edge Cases

- Very long patron names → `text-overflow: ellipsis` within the text area
- Patron with `preferences.hide = true` → filtered server-side in `getFeaturedPatrons()`
- API fetch failure → caught in `header.tsx`, falls back to `{ supporterOfTheDay: null, latestPatron: null }` (shows generic CTA)
