# About Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the outdated about page with a modern feature-grid showcase.

**Architecture:** Static page with a centered hero and a responsive CSS grid of 12 feature cards. SCSS module draws from the `how-it-works` card pattern. No data fetching.

**Tech Stack:** Next.js App Router, SCSS modules, design tokens

**Spec:** `docs/superpowers/specs/2026-03-20-about-page-redesign.md`

---

### Task 1: Create the SCSS module

**Files:**
- Create: `app/(new-layout)/about/about.module.scss`
- Reference: `app/(new-layout)/how-it-works/how-it-works.module.scss`
- Reference: `app/(new-layout)/styles/_design-tokens.scss`

- [ ] **Step 1: Create `about.module.scss`**

```scss
@use '../styles/design-tokens' as *;

.page {
    max-width: 1100px;
    margin: 0 auto;
    padding: $spacing-xl $spacing-lg;
}

.hero {
    text-align: center;
    padding: $spacing-3xl $spacing-lg $spacing-2xl;

    h1 {
        font-size: $font-size-2xl;
        font-weight: 700;
        letter-spacing: -0.03em;
        margin-bottom: $spacing-md;
    }
}

.tagline {
    font-size: $font-size-base;
    color: var(--bs-secondary-color);
    max-width: 540px;
    margin: 0 auto;
    line-height: 1.6;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $spacing-xl;
    padding: $spacing-lg 0;
}

.card {
    background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--bs-body-bg) 92%, var(--bs-primary) 8%) 0%,
        color-mix(in srgb, var(--bs-body-bg) 96%, var(--bs-primary) 4%) 100%
    );
    border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
    border-radius: $radius-lg;
    padding: $spacing-xl;
    box-shadow: $shadow-sm;
    transition: all $transition-base;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    &:hover {
        box-shadow: $shadow-md;
        border-color: rgba(var(--bs-primary-rgb), 0.25);
    }
}

.cardIcon {
    font-size: $font-size-xl;
    line-height: 1;
}

.cardTitle {
    font-size: $font-size-md;
    font-weight: 600;
}

.cardDescription {
    font-size: $font-size-sm;
    line-height: 1.6;
    color: var(--bs-secondary-color);
    flex: 1;
}

.cardLink {
    font-size: $font-size-sm;
    color: var(--bs-primary);
    text-decoration: none;
    font-weight: 500;
    transition: color $transition-fast;

    &:hover {
        color: color-mix(in srgb, var(--bs-primary) 80%, white 20%);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(new-layout)/about/about.module.scss
git commit -m "style: add about page SCSS module"
```

---

### Task 2: Rewrite the page component

**Files:**
- Modify: `app/(new-layout)/about/page.tsx` (full rewrite)
- Reference: `app/(new-layout)/about/about.module.scss`

- [ ] **Step 1: Rewrite `page.tsx`**

```tsx
import Link from '~src/components/link';
import buildMetadata from '~src/utils/metadata';
import styles from './about.module.scss';

export const metadata = buildMetadata({
    title: 'About',
    description:
        'Free speedrun analytics — live tracking, detailed splits, races, tournaments, and more.',
});

interface FeatureCard {
    icon: string;
    title: string;
    description: string;
    href: string;
    linkText: string;
    external?: boolean;
}

const features: FeatureCard[] = [
    {
        icon: '\u26A1',
        title: 'Live Tracking',
        description:
            'Watch speedruns as they happen. See current pace, estimated finish time, and split-by-split progress in real time.',
        href: '/live',
        linkText: "See who's live",
    },
    {
        icon: '\u23F1\uFE0F',
        title: 'Detailed Splits',
        description:
            'Compare splits against your Sum of Best, best achieved, and averages. Consistency scores and graphs show where you gain and lose time.',
        href: '/AverageTrey/Super%20Mario%20Sunshine/Any%25',
        linkText: 'View an example',
    },
    {
        icon: '\uD83D\uDC64',
        title: 'Runner Profiles',
        description:
            'Every runner gets a profile with their full stats, personal bests, run history, and a breakdown by game and category.',
        href: '/KallyNui',
        linkText: 'Browse a profile',
    },
    {
        icon: '\uD83C\uDFAE',
        title: 'Game Pages',
        description:
            'Leaderboards, category stats, and activity metrics for every game. Filter by category and see who\u2019s on top.',
        href: '/games',
        linkText: 'Explore games',
    },
    {
        icon: '\uD83C\uDFC1',
        title: 'Races',
        description:
            'Create or join races against other runners. MMR-based rankings, race history, and stats per game.',
        href: '/races',
        linkText: 'Go to races',
    },
    {
        icon: '\uD83C\uDFC6',
        title: 'Tournaments',
        description:
            'Organized competitive events with eligibility rules, live leaderboards, and multi-tier brackets.',
        href: '/tournaments',
        linkText: 'View tournaments',
    },
    {
        icon: '\uD83D\uDCD6',
        title: 'Story Mode',
        description:
            'AI-generated narrative commentary on your runs. Customize tone, pronouns, and language to make every PB a story worth telling.',
        href: '/stories/manage',
        linkText: 'Manage stories',
    },
    {
        icon: '\uD83D\uDCC5',
        title: 'Annual Recap',
        description:
            'Your year in speedrunning \u2014 total playtime, PBs, most-played games, and trends, compiled into a shareable recap.',
        href: '/recap',
        linkText: 'See your recap',
    },
    {
        icon: '\uD83D\uDD0C',
        title: 'LiveSplit Integration',
        description:
            'Automatic uploads via the LiveSplit component. Set it up once and your splits sync every time you finish a run.',
        href: '/livesplit',
        linkText: 'Set up LiveSplit',
    },
    {
        icon: '\uD83C\uDFA8',
        title: 'Appearance Customization',
        description:
            'Style your profile with custom colors, themes, and display options. Extended options available for Patreon supporters.',
        href: '/change-appearance',
        linkText: 'Customize',
    },
    {
        icon: '\uD83D\uDCFA',
        title: 'Twitch Extension',
        description:
            'Show your stats directly under your stream. Viewers see your splits, PBs, and live progress without leaving Twitch.',
        href: 'https://dashboard.twitch.tv/extensions/gl1gra1r6ucnkchrswmdsefomfwxai-0.1.0',
        linkText: 'Learn more',
        external: true,
    },
    {
        icon: '\uD83D\uDD0D',
        title: 'Runs Explorer',
        description:
            'Browse and filter finished runs across all games, categories, and runners. Find any run, any time.',
        href: '/runs',
        linkText: 'Explore runs',
    },
];

export default function About() {
    return (
        <div className={styles.page}>
            <header className={styles.hero}>
                <h1>About The Run</h1>
                <p className={styles.tagline}>
                    Free speedrun analytics. Live tracking, detailed splits,
                    races, and more &mdash; built for runners and their
                    communities.
                </p>
            </header>

            <section aria-label="Features" className={styles.grid}>
                {features.map((feature) => (
                    <article key={feature.title} className={styles.card}>
                        <span
                            className={styles.cardIcon}
                            aria-hidden="true"
                        >
                            {feature.icon}
                        </span>
                        <h2 className={styles.cardTitle}>{feature.title}</h2>
                        <p className={styles.cardDescription}>
                            {feature.description}
                        </p>
                        {feature.external ? (
                            <a
                                className={styles.cardLink}
                                href={feature.href}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {feature.linkText} &rarr;
                            </a>
                        ) : (
                            <Link
                                className={styles.cardLink}
                                href={feature.href}
                            >
                                {feature.linkText} &rarr;
                            </Link>
                        )}
                    </article>
                ))}
            </section>
        </div>
    );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx next build --no-lint 2>&1 | tail -20` (or `npm run dev` and load `/about`)
Expected: Page renders with hero + 12 feature cards in a grid.

- [ ] **Step 3: Commit**

```bash
git add app/(new-layout)/about/page.tsx
git commit -m "feat: redesign about page with feature grid"
```

---

### Task 3: Visual verification and lint

- [ ] **Step 1: Run Biome check**

```bash
npx @biomejs/biome check app/(new-layout)/about/page.tsx
```

Expected: No errors. Fix any formatting issues with `--write` flag.

- [ ] **Step 2: Run ESLint**

```bash
npm run lint -- --no-error-on-unmatched-pattern
```

Expected: No new errors from the about page.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: No type errors.

- [ ] **Step 4: Load `/about` in the browser and verify:**

- Hero title and tagline are centered
- 3-column grid on desktop, responsive down to 1 column
- All 12 cards render with icon, title, description, and link
- Hover effects work (shadow + border change)
- Internal links navigate correctly
- Twitch Extension link opens in new tab
- Works in both light and dark mode

- [ ] **Step 5: Commit any lint fixes if needed**

```bash
git add -u
git commit -m "fix: lint fixes for about page"
```
