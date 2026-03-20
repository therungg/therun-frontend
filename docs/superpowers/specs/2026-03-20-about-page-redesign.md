# About Page Redesign

**Date:** 2026-03-20
**Status:** Approved

## Overview

Complete redesign of the `/about` page. Replace the outdated plain-text feature list with a modern feature-grid showcase. Pure feature showcase tone — minimal narrative, let the features speak.

## Design

### Structure

1. **Hero section** — page title ("About The Run") + one-line tagline: "Free speedrun analytics. Live tracking, detailed splits, races, and more — built for runners and their communities."
2. **Feature grid** — responsive grid of 12 feature cards (3 columns on desktop, 2 on tablet, 1 on mobile)

### Feature Cards

Each card contains:
- Emoji icon (decorative, `aria-hidden="true"`)
- Title
- 1-2 sentence description
- Link to the relevant page

| # | Icon | Title | Description | Link | Link Text |
|---|------|-------|-------------|------|-----------|
| 1 | ⚡ | Live Tracking | Watch speedruns as they happen. See current pace, estimated finish time, and split-by-split progress in real time. | /live | See who's live |
| 2 | ⏱️ | Detailed Splits | Compare splits against your Sum of Best, best achieved, and averages. Consistency scores and graphs show where you gain and lose time. | /AverageTrey/Super%20Mario%20Sunshine/Any%25 | View an example |
| 3 | 👤 | Runner Profiles | Every runner gets a profile with their full stats, personal bests, run history, and a breakdown by game and category. | /KallyNui | Browse a profile |
| 4 | 🎮 | Game Pages | Leaderboards, category stats, and activity metrics for every game. Filter by category and see who's on top. | /games | Explore games |
| 5 | 🏁 | Races | Create or join races against other runners. MMR-based rankings, race history, and stats per game. | /races | Go to races |
| 6 | 🏆 | Tournaments | Organized competitive events with eligibility rules, live leaderboards, and multi-tier brackets. | /tournaments | View tournaments |
| 7 | 📖 | Story Mode | AI-generated narrative commentary on your runs. Customize tone, pronouns, and language to make every PB a story worth telling. | /stories/manage | Manage stories |
| 8 | 📅 | Annual Recap | Your year in speedrunning — total playtime, PBs, most-played games, and trends, compiled into a shareable recap. | /recap | See your recap |
| 9 | 🔌 | LiveSplit Integration | Automatic uploads via the LiveSplit component. Set it up once and your splits sync every time you finish a run. | /livesplit | Set up LiveSplit |
| 10 | 🎨 | Appearance Customization | Style your profile with custom colors, themes, and display options. Extended options available for Patreon supporters. | /change-appearance | Customize |
| 11 | 📺 | Twitch Extension | Show your stats directly under your stream. Viewers see your splits, PBs, and live progress without leaving Twitch. | https://dashboard.twitch.tv/extensions/gl1gra1r6ucnkchrswmdsefomfwxai-0.1.0 (external, `target="_blank" rel="noreferrer"`) | Learn more |
| 12 | 🔍 | Runs Explorer | Browse and filter finished runs across all games, categories, and runners. Find any run, any time. | /runs | Explore runs |

### Styling

- Reuse the card pattern from `how-it-works.module.scss` (gradient background, border, hover, radius) — adapt for this page's needs in a new `about.module.scss`
- Uses the project's existing design tokens (`_design-tokens.scss`)
- Container max-width: ~1100px (wider than `content-page.module.scss`'s 800px to fit 3 columns)
- Grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, gap: `$spacing-xl`
- Hero: centered text, `$font-size-2xl` title, muted tagline in `var(--bs-secondary-color)`
- Card link text: primary green color, `→` suffix
- Works in both light and dark mode via existing CSS variables

### Metadata

```typescript
export const metadata = buildMetadata({
    title: 'About',
    description: 'Free speedrun analytics — live tracking, detailed splits, races, tournaments, and more.',
});
```

### Accessibility

- Emoji icons are decorative: wrap in `<span aria-hidden="true">`
- Feature grid wrapped in `<section aria-label="Features">`
- Only the link text is clickable (not the entire card) for clear tab targets

### Files

- `app/(new-layout)/about/page.tsx` — rewrite with new content and structure
- `app/(new-layout)/about/about.module.scss` — new SCSS module (draws from `how-it-works` card pattern)

### Notes

- Fully static page — no data fetching, no `'use cache'` needed
- Internal links use `Link` from `~src/components/link`, external links use `<a>` with `target="_blank" rel="noreferrer"`
- Does not use the `<Title>` component — hero is custom-styled with centered layout

### What's Removed

- All old prose sections (Purpose, How to use, Beta disclaimer)
- Outdated feature descriptions (dark mode toggle, roadmap link, broken HTML)
- First-person voice
