# Getting Started Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the outdated `/how-it-works` page with a comprehensive `/getting-started` guide covering all site features in a phased, sequential layout.

**Architecture:** Server component page fetches session and renders hero + client component. Client component renders all phases/steps with auth-conditional CTAs. Styles use existing design token system matching the about page's visual language.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SCSS Modules, `design-tokens`

**Spec:** `docs/superpowers/specs/2026-03-20-getting-started-page-redesign.md`

---

### Task 1: Create SCSS module

**Files:**
- Create: `app/(new-layout)/getting-started/getting-started.module.scss`
- Reference: `app/(new-layout)/about/about.module.scss` (for design token usage and card styles)
- Reference: `app/(new-layout)/how-it-works/how-it-works.module.scss` (for step number styles)

- [ ] **Step 1: Create the stylesheet**

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

.phase {
    margin-bottom: $spacing-2xl;
}

.phaseLabel {
    font-size: $font-size-xs;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--bs-secondary-color);
    margin-bottom: $spacing-lg;
}

.steps {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
}

.step {
    display: flex;
    gap: $spacing-xl;
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

    &:hover {
        box-shadow: $shadow-md;
        border-color: rgba(var(--bs-primary-rgb), 0.25);
    }
}

.stepNumber {
    font-size: $font-size-display;
    font-weight: 700;
    color: var(--bs-primary);
    opacity: 0.4;
    line-height: 1;
    flex-shrink: 0;
}

.stepContent {
    flex: 1;
}

.stepTitle {
    font-size: $font-size-lg;
    font-weight: 600;
    margin-bottom: $spacing-sm;
}

.stepDescription {
    font-size: $font-size-sm;
    line-height: 1.6;
    color: var(--bs-secondary-color);
    margin-bottom: $spacing-md;
}

.stepAction {
    button,
    a {
        display: inline-block;
        background: var(--bs-primary);
        color: white;
        border: none;
        border-radius: $radius-md;
        padding: $spacing-sm $spacing-lg;
        font-size: $font-size-sm;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all $transition-fast;

        &:hover {
            opacity: 0.9;
            box-shadow: $shadow-sm;
        }
    }
}

.stepHint {
    font-size: $font-size-sm;
    color: var(--bs-secondary-color);
    font-style: italic;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(new-layout)/getting-started/getting-started.module.scss
git commit -m "style: add getting-started page SCSS module"
```

---

### Task 2: Create the client component (getting-started-steps)

**Files:**
- Create: `app/(new-layout)/getting-started/getting-started-steps.tsx`
- Reference: `app/(new-layout)/how-it-works/how-it-works-panels.tsx` (for auth-conditional CTA pattern and TwitchLoginButton usage)
- Reference: `app/(new-layout)/about/page.tsx` (for feature data structure pattern)

- [ ] **Step 1: Create the component**

```tsx
'use client';

import Link from '~src/components/link';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import styles from './getting-started.module.scss';

interface Step {
    number: string;
    title: string;
    description: string;
    cta: (session: { username: string }) => React.ReactNode;
}

interface Phase {
    label: string;
    steps: Step[];
}

const TWITCH_EXTENSION_URL =
    'https://dashboard.twitch.tv/extensions/gl1gra1r6ucnkchrswmdsefomfwxai-0.1.0';

const phases: Phase[] = [
    {
        label: 'Set Up Your Account',
        steps: [
            {
                number: '01',
                title: 'Sign in with Twitch',
                description:
                    'Log in with your Twitch account to create your profile. Your stats page will be at therun.gg/YourName.',
                cta: (session) =>
                    session.username ? (
                        <p className={styles.stepHint}>
                            Logged in as <strong>{session.username}</strong>
                        </p>
                    ) : (
                        <div className={styles.stepAction}>
                            <TwitchLoginButton url="/getting-started" />
                        </div>
                    ),
            },
            {
                number: '02',
                title: 'Connect LiveSplit',
                description:
                    'Install the therun.gg LiveSplit component and enter your upload key. Your splits sync automatically after every run — this is the recommended way to get your data on the site.',
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href="/livesplit">Get your upload key</Link>
                        </div>
                    ) : (
                        <p className={styles.stepHint}>
                            Sign in first to get your key
                        </p>
                    ),
            },
            {
                number: '03',
                title: 'Or upload manually',
                description:
                    "Don't use LiveSplit? You can drag and drop .lss split files directly.",
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href="/upload">Upload splits</Link>
                        </div>
                    ) : (
                        <p className={styles.stepHint}>
                            Sign in first to upload
                        </p>
                    ),
            },
        ],
    },
    {
        label: 'Explore Your Stats',
        steps: [
            {
                number: '04',
                title: 'Your profile',
                description:
                    'Your runner page shows personal bests, run history, session stats, and consistency scores across all your games and categories.',
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href={`/${session.username}`}>
                                View your profile
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.stepAction}>
                            <Link href="/KallyNui">
                                See an example profile
                            </Link>
                        </div>
                    ),
            },
            {
                number: '05',
                title: 'Detailed splits',
                description:
                    'Dive into any run to compare splits against your Sum of Best, best achieved, and averages. See where you gain and lose time with consistency graphs.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/AverageTrey/Super%20Mario%20Sunshine/Any%25">
                            View example splits
                        </Link>
                    </div>
                ),
            },
            {
                number: '06',
                title: 'Runs Explorer',
                description:
                    'Browse and filter completed runs across all games, categories, and runners.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/runs">Explore runs</Link>
                    </div>
                ),
            },
        ],
    },
    {
        label: 'Compete',
        steps: [
            {
                number: '07',
                title: 'Races',
                description:
                    'Create or join head-to-head races against other runners. Track your MMR ranking, race history, and per-game stats.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/races">Go to races</Link>
                    </div>
                ),
            },
            {
                number: '08',
                title: 'Tournaments',
                description:
                    'Compete in organized events with eligibility rules, live leaderboards, and brackets.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/tournaments">View tournaments</Link>
                    </div>
                ),
            },
        ],
    },
    {
        label: 'Make It Yours',
        steps: [
            {
                number: '09',
                title: 'Story Mode',
                description:
                    'Get AI-generated narrative commentary on your runs. Customize the tone, pronouns, and language to make every PB a story worth sharing.',
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href="/stories/manage">Manage stories</Link>
                        </div>
                    ) : (
                        <p className={styles.stepHint}>
                            Sign in to set up stories
                        </p>
                    ),
            },
            {
                number: '10',
                title: 'Customize your appearance',
                description:
                    'Style your profile with custom colors, themes, and display options. Extended options available for Patreon supporters.',
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href="/change-appearance">Customize</Link>
                        </div>
                    ) : (
                        <p className={styles.stepHint}>
                            Sign in to customize
                        </p>
                    ),
            },
            {
                number: '11',
                title: 'Twitch Extension',
                description:
                    'Show your stats directly under your stream. Viewers see your splits, PBs, and live progress without leaving Twitch.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <a
                            href={TWITCH_EXTENSION_URL}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Get the extension
                        </a>
                    </div>
                ),
            },
            {
                number: '12',
                title: 'Annual Recap',
                description:
                    'Your year in speedrunning — total playtime, PBs, most-played games, and trends compiled into a shareable recap.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/recap">See your recap</Link>
                    </div>
                ),
            },
        ],
    },
];

export default function GettingStartedSteps({
    session,
}: {
    session: { username: string };
}) {
    return (
        <>
            {phases.map((phase) => (
                <section key={phase.label} className={styles.phase}>
                    <h2 className={styles.phaseLabel}>{phase.label}</h2>
                    <div className={styles.steps}>
                        {phase.steps.map((step) => (
                            <div key={step.number} className={styles.step}>
                                <div className={styles.stepNumber}>
                                    {step.number}
                                </div>
                                <div className={styles.stepContent}>
                                    <h3 className={styles.stepTitle}>
                                        {step.title}
                                    </h3>
                                    <p className={styles.stepDescription}>
                                        {step.description}
                                    </p>
                                    {step.cta(session)}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(new-layout)/getting-started/getting-started-steps.tsx
git commit -m "feat: add getting-started steps client component"
```

---

### Task 3: Create the page component

**Files:**
- Create: `app/(new-layout)/getting-started/page.tsx`
- Reference: `app/(new-layout)/how-it-works/page.tsx` (for session fetching pattern)

- [ ] **Step 1: Create the server component**

```tsx
import GettingStartedSteps from '~app/(new-layout)/getting-started/getting-started-steps';
import { getSession } from '~src/actions/session.action';
import buildMetadata from '~src/utils/metadata';
import styles from './getting-started.module.scss';

export default async function GettingStarted() {
    const session = await getSession();

    return (
        <div className={styles.page}>
            <header className={styles.hero}>
                <h1>Getting Started</h1>
                <p className={styles.tagline}>
                    Everything you need to start tracking, analyzing, and
                    competing.
                </p>
            </header>
            <GettingStartedSteps session={session} />
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Getting Started',
    description:
        'Step-by-step guide to using The Run — set up your account, track your splits, explore your stats, race other runners, and more.',
});
```

- [ ] **Step 2: Verify the page loads**

Run: `npm run dev` and visit `http://localhost:3000/getting-started`

Expected: Page renders with hero, all 4 phases, all 12 steps with correct descriptions and CTAs.

- [ ] **Step 3: Commit**

```bash
git add app/(new-layout)/getting-started/page.tsx
git commit -m "feat: add getting-started page component"
```

---

### Task 4: Update navigation and redirects

**Files:**
- Modify: `src/components/Topbar/topbar-nav-items.ts:31` (change how-it-works → getting-started)
- Modify: `next.config.js:41-49` (add redirect)

- [ ] **Step 1: Update topbar nav item**

In `src/components/Topbar/topbar-nav-items.ts`, change the `aboutItems` entry:

```typescript
// Before:
{ href: '/how-it-works', label: 'How It Works' },

// After:
{ href: '/getting-started', label: 'Getting Started' },
```

- [ ] **Step 2: Add redirect in next.config.js**

In `next.config.js`, add a redirect entry to the `redirects()` array:

```javascript
{
    source: '/how-it-works',
    destination: '/getting-started',
    permanent: true,
},
```

- [ ] **Step 3: Verify nav and redirect**

Run: `npm run dev`
- Visit `http://localhost:3000` — confirm "Getting Started" appears in the About nav group
- Visit `http://localhost:3000/how-it-works` — confirm it redirects to `/getting-started`

- [ ] **Step 4: Commit**

```bash
git add src/components/Topbar/topbar-nav-items.ts next.config.js
git commit -m "feat: update nav to getting-started, add how-it-works redirect"
```

---

### Task 5: Delete old how-it-works page

**Files:**
- Delete: `app/(new-layout)/how-it-works/page.tsx`
- Delete: `app/(new-layout)/how-it-works/how-it-works-panels.tsx`
- Delete: `app/(new-layout)/how-it-works/how-it-works.module.scss`

- [ ] **Step 1: Remove the old directory**

```bash
rm -rf app/(new-layout)/how-it-works/
```

- [ ] **Step 2: Verify nothing references the old files**

Run: `grep -r "how-it-works" app/ src/ --include="*.tsx" --include="*.ts" -l`

Expected: No results (except possibly `next.config.js` redirect which is intentional).

- [ ] **Step 3: Verify the redirect still works**

Run: `npm run dev` and visit `http://localhost:3000/how-it-works`

Expected: Redirects to `/getting-started` (handled by `next.config.js`, not the old page files).

- [ ] **Step 4: Commit**

```bash
git add -A app/(new-layout)/how-it-works/
git commit -m "chore: remove old how-it-works page"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Visual check**

Run: `npm run dev` and verify:
- `/getting-started` — all phases and steps render correctly, vertical layout with step numbers on left
- Auth-conditional CTAs work (check both logged-in and logged-out states if possible)
- `/how-it-works` — redirects to `/getting-started`
- Topbar nav shows "Getting Started" under About group
