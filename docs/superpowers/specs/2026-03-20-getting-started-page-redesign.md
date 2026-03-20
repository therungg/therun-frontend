# Getting Started Page Redesign

**Date:** 2026-03-20
**Status:** Design approved, pending implementation

## Summary

Replace the outdated `/how-it-works` page (4 steps covering only login and manual upload) with a comprehensive `/getting-started` guide covering all site features. The page walks users through setup, stats exploration, competition, and customization in a sequential, phased layout.

## Route Changes

- New route: `app/(new-layout)/getting-started/page.tsx`
- Redirect `/how-it-works` → `/getting-started` via `next.config.js` `redirects()`
- Update topbar nav: change "How It Works" link in `aboutItems` to label "Getting Started", href `/getting-started`
- Delete old `app/(new-layout)/how-it-works/` directory after redirect is in place

## Page Design

### Layout

Vertical scroll page with steps grouped into phases. Each phase has:
- Uppercase label header (same style as about page group labels)
- Vertically stacked step rows beneath it

Each step row contains:
- Step number (large, faded primary color) on the left
- Title, 1-2 sentence description, and optional CTA on the right
- Full-width card with the same gradient background/border treatment used on the about and current how-it-works pages

### Hero

Centered header:
- Title: "Getting Started"
- Tagline: "Everything you need to start tracking, analyzing, and competing."

### Phases and Steps

#### Phase 1: Set Up Your Account

**Step 01 — Sign in with Twitch**
- Description: Log in with your Twitch account to create your profile. Your stats page will be at `therun.gg/YourName`.
- CTA (not logged in): Twitch login button (redirects back to `/getting-started`)
- CTA (logged in): "Logged in as **{username}**" text, no button

**Step 02 — Connect LiveSplit**
- Description: Install the therun.gg LiveSplit component and enter your upload key. Your splits sync automatically after every run — this is the recommended way to get your data on the site.
- CTA (not logged in): "Sign in first to get your key"
- CTA (logged in): Link to `/livesplit` — "Get your upload key"

**Step 03 — Or upload manually**
- Description: Don't use LiveSplit? You can drag and drop `.lss` split files directly.
- CTA (not logged in): "Sign in first to upload"
- CTA (logged in): Link to `/upload` — "Upload splits"

#### Phase 2: Explore Your Stats

**Step 04 — Your profile**
- Description: Your runner page shows personal bests, run history, session stats, and consistency scores across all your games and categories.
- CTA (not logged in): Link to example profile (e.g., `/KallyNui`) — "See an example profile"
- CTA (logged in): Link to `/{username}` — "View your profile"

**Step 05 — Detailed splits**
- Description: Dive into any run to compare splits against your Sum of Best, best achieved, and averages. See where you gain and lose time with consistency graphs.
- CTA: Link to example splits page (e.g., `/AverageTrey/Super%20Mario%20Sunshine/Any%25`) — "View example splits"

**Step 06 — Runs Explorer**
- Description: Browse and filter completed runs across all games, categories, and runners.
- CTA: Link to `/runs` — "Explore runs"

#### Phase 3: Compete

**Step 07 — Races**
- Description: Create or join head-to-head races against other runners. Track your MMR ranking, race history, and per-game stats.
- CTA: Link to `/races` — "Go to races"

**Step 08 — Tournaments**
- Description: Compete in organized events with eligibility rules, live leaderboards, and brackets.
- CTA: Link to `/tournaments` — "View tournaments"

#### Phase 4: Make It Yours

**Step 09 — Story Mode**
- Description: Get AI-generated narrative commentary on your runs. Customize the tone, pronouns, and language to make every PB a story worth sharing.
- CTA (not logged in): "Sign in to set up stories"
- CTA (logged in): Link to `/stories/manage` — "Manage stories"

**Step 10 — Customize your appearance**
- Description: Style your profile with custom colors, themes, and display options. Extended options available for Patreon supporters.
- CTA (not logged in): "Sign in to customize"
- CTA (logged in): Link to `/change-appearance` — "Customize"

**Step 11 — Twitch Extension**
- Description: Show your stats directly under your stream. Viewers see your splits, PBs, and live progress without leaving Twitch.
- CTA: External link to Twitch extension dashboard — "Get the extension"

**Step 12 — Annual Recap**
- Description: Your year in speedrunning — total playtime, PBs, most-played games, and trends compiled into a shareable recap.
- CTA: Link to `/recap` — "See your recap"

## Component Structure

### Files

- `app/(new-layout)/getting-started/page.tsx` — Server component. Fetches session via `getSession()`. Renders hero section and `<GettingStartedSteps session={session} />`. Exports metadata.
- `app/(new-layout)/getting-started/getting-started-steps.tsx` — `'use client'` component. Receives session prop. Renders all phases and steps with auth-conditional CTAs.
- `app/(new-layout)/getting-started/getting-started.module.scss` — Styles.

### Auth-Aware Behavior

The page is fully readable without logging in. Auth state only affects CTAs:
- Steps requiring login show helpful fallback text (not blocked/disabled states)
- Profile/upload links become personalized when logged in
- The Twitch login button on step 1 passes `url="/getting-started"` to redirect back after login

### Styling

Uses the same design token system (`design-tokens`) and visual language as the about page:
- Same gradient card backgrounds: `linear-gradient(135deg, color-mix(...))`
- Same border treatment: `rgba(var(--bs-primary-rgb), 0.15)`
- Same typography scale and spacing tokens
- Phase labels match the about page's `.groupLabel` style (uppercase, small, secondary color)
- Step numbers match current how-it-works `.stepNumber` style (large, faded primary)

New layout-specific styles:
- Steps are flex rows (number left, content right) instead of grid cards
- Max-width container matching about page (`1100px`)

## Relationship to About Page

The about page (`/about`) and getting-started page exist independently:
- About: feature overview with short descriptions and links to feature pages
- Getting Started: sequential onboarding guide with longer descriptions and auth-aware CTAs
- No cross-linking between them

## SEO

```typescript
export const metadata = buildMetadata({
    title: 'Getting Started',
    description: 'Step-by-step guide to using The Run — set up your account, track your splits, explore your stats, race other runners, and more.',
});
```
