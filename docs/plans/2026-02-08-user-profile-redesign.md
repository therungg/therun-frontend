# User Profile Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completely redesign the user profile page at `app/(old-layout)/[username]` using the new-layout design system — identity-first hero, styled tabs, Panel-based sections, live run banner, and consolidated activity/races views.

**Architecture:** The profile stays in `app/(old-layout)/[username]` but adopts the new-layout design tokens, Panel/Card/Badge components, and SCSS module styling. The existing `user-profile.tsx` is replaced with a new component structure. Data fetching in `page.tsx` is extended to include race detail data and user summary stats. All existing functionality is preserved.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, SCSS Modules, Bootstrap 5, react-circular-progressbar, Victory charts, CalendarHeatmap, react-twitch-embed, CASL RBAC

**Design document:** `docs/plans/2026-02-08-user-profile-redesign-design.md`

---

### Task 1: Create Profile SCSS Module with Design Tokens

**Files:**
- Create: `app/(old-layout)/[username]/profile.module.scss`

**Context:** This SCSS module defines all the styles for the redesigned profile page. It imports the new-layout design tokens and mixins and defines styles for the hero section, tabs, stat strips, live banner, game panels, and sidebar panels.

**Step 1: Create the SCSS module**

Import design tokens from the new-layout:
```scss
@import '../../(new-layout)/styles/design-tokens';
@import '../../(new-layout)/styles/mixins';
```

Define these class groups:

**Hero Section (`.hero`)**
- Full-width container with gradient background: `linear-gradient(180deg, color-mix(in srgb, var(--bs-body-bg) 85%, var(--bs-primary) 15%) 0%, var(--bs-body-bg) 100%)`
- Padding: `$spacing-2xl` on all sides, `$spacing-3xl` bottom
- Border-radius: `$radius-lg` on bottom
- Flex layout with gap for avatar and content
- Inner `.heroContent` is flex column
- `.heroMain` is flex row between identity (left) and stats strip (right), `align-items: center`
- Responsive: at `max-width: 991px`, `.heroMain` becomes `flex-direction: column` and stats strip goes below

**Avatar (`.avatar`)**
- 96px × 96px circle (`border-radius: 50%`)
- `object-fit: cover`, `flex-shrink: 0`
- Border: `3px solid var(--bs-primary)`
- Box-shadow: `$shadow-md`

**Username section (`.usernameSection`)**
- `.username`: `font-size: 1.75rem`, `font-weight: 700`, `line-height: 1.2`
- `.liveBadge`: inline-flex, align-items center, gap `$spacing-xs`, `color: var(--bs-danger)`, `font-weight: 600`, `font-size: 0.85rem`
- `.metadata`: flex row, gap `$spacing-sm`, `font-size: 0.9rem`, `color: var(--bs-secondary-color)`, `flex-wrap: wrap`, `align-items: center`
- `.metadataDivider`: `opacity: 0.3`
- `.bio`: `font-size: 0.95rem`, `color: var(--bs-secondary-color)`, `font-style: italic`, `margin-top: $spacing-xs`
- `.socials`: flex row, gap `$spacing-sm`, margin-top `$spacing-sm`
- `.socialLink`: `display: inline-flex`, `padding: $spacing-xs`, `border-radius: $radius-sm`, `transition: $transition-fast`, `color: var(--bs-secondary-color)`, hover: `color: var(--bs-primary)`, `transform: translateY($hover-lift)`

**Stats Strip (`.statsStrip`)**
- `display: flex`, `gap: $spacing-lg`, `flex-wrap: wrap`
- `.statBox`: `text-align: center`, `min-width: 70px`
- `.statValue`: `@include monospace-value`, `font-size: 1.25rem`, `color: var(--bs-primary)`
- `.statLabel`: `font-size: 0.7rem`, `text-transform: uppercase`, `letter-spacing: 0.5px`, `opacity: 0.6`, `font-weight: 600`

**Edit Button (`.editButton`)**
- `position: absolute`, `top: $spacing-lg`, `right: $spacing-lg`
- `background: transparent`, `border: 1px solid var(--bs-border-color)`, `border-radius: $radius-md`
- `padding: $spacing-xs $spacing-sm`, `cursor: pointer`
- `transition: $transition-fast`
- Hover: `border-color: var(--bs-primary)`, `color: var(--bs-primary)`, `transform: translateY($hover-lift)`

**Tabs (`.profileTabs`)**
- Container: flex row, gap `$spacing-xs`, `border-bottom: 2px solid var(--bs-border-color)`, `padding-bottom: 0`, `margin-bottom: $spacing-2xl`
- `.tab`: `padding: $spacing-sm $spacing-lg`, `border: none`, `background: transparent`, `font-weight: 500`, `font-size: 0.95rem`, `color: var(--bs-secondary-color)`, `cursor: pointer`, `border-bottom: 2px solid transparent`, `margin-bottom: -2px`, `transition: $transition-fast`
- `.tab:hover`: `color: var(--bs-body-color)`
- `.tabActive`: `color: var(--bs-primary)`, `border-bottom-color: var(--bs-primary)`, `font-weight: 600`
- `.tabControls`: `margin-left: auto`, `display: flex`, `align-items: center`, `gap: $spacing-md`

**Live Run Banner (`.liveRunBanner`)**
- Reuse the pulse-glow animation pattern from `current-user-live-panel.module.scss`
- `display: flex`, `gap: $spacing-lg`, `padding: $spacing-lg`
- `background: linear-gradient(135deg, color-mix(in srgb, var(--bs-tertiary-bg) 80%, var(--bs-primary) 20%) 0%, var(--bs-tertiary-bg) 100%)`
- `border: 2px solid var(--bs-primary)`, `border-radius: $radius-lg`
- `animation: pulse-glow 2s infinite`
- Define `@keyframes pulse-glow` with box-shadow animation
- `.bannerImage`: `width: 90px`, `height: 120px`, `flex-shrink: 0`, `border-radius: $radius-md`, `overflow: hidden`
- `.bannerContent`: `flex: 1`, flex column, gap `$spacing-md`
- `.bannerTimer`: `@include monospace-value`, `font-size: 1.8rem`, `color: var(--bs-primary)`
- `.bannerSplitInfo`: flex row wrap, gap `$spacing-lg`, `font-size: 0.9rem`
- `.deltaAhead`: `color: #28a745`, `background: rgba(40, 167, 69, 0.1)`, `padding: 0.15rem 0.5rem`, `border-radius: $radius-sm`
- `.deltaBehind`: `color: #dc3545`, `background: rgba(220, 53, 69, 0.1)`, same padding/radius
- `.progressBarContainer`: `width: 100%`, `height: 6px`, `background: rgba(var(--bs-primary-rgb), 0.1)`, `border-radius: $radius-sm`, `overflow: hidden`
- `.progressBar`: `height: 100%`, `background: var(--bs-primary)`, `border-radius: $radius-sm`, `transition: width 0.3s ease`

**Quick Stats Panel (`.quickStats`)**
- `.statsGrid`: `display: grid`, `grid-template-columns: repeat(2, 1fr)`, `gap: $spacing-md`
- `.quickStatItem`: `padding: $spacing-md`, `background: linear-gradient(135deg, var(--bs-tertiary-bg), color-mix(in srgb, var(--bs-tertiary-bg) 90%, var(--bs-primary) 10%))`, `border-radius: $radius-md`, `border: 1px solid rgba(96, 140, 89, 0.15)`
- `.quickStatValue`: `@include monospace-value`, `font-size: 1rem`, `font-weight: 700`, `color: var(--bs-primary)`
- `.quickStatLabel`: `font-size: 0.7rem`, `text-transform: uppercase`, `letter-spacing: 0.4px`, `opacity: 0.65`

**Game Panel overrides (`.gamePanel`)**
- Reduce the margin-top from the Panel default (6rem → 4rem) for a tighter layout in lists
- `.gamePanelTable`: clean table styling with `border-collapse: separate`, `border-spacing: 0`
- `.gamePanelRow`: hover with `@include subtle-hover` but just background change, no translateX

**Modal (`.editModal`)**
- Standard Bootstrap modal with the new design palette
- `.editModalBody`: `padding: $spacing-2xl`

**Responsive breakpoints:**
- `@media (max-width: 991px)`: hero stacks, stats strip wraps
- `@media (max-width: 767px)`: reduce avatar to 72px, reduce font sizes

**Step 2: Verify the import paths work**

Run: `npx sass --no-source-map --style compressed app/(old-layout)/[username]/profile.module.scss /dev/null 2>&1 || echo "Sass compilation check"`

This may error since Next.js handles the SCSS compilation — that's fine. The imports will be validated during `npm run dev`.

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/profile.module.scss
git commit -m "feat(profile): add SCSS module with design tokens for profile redesign"
```

---

### Task 2: Create ProfileHero Component

**Files:**
- Create: `app/(old-layout)/[username]/components/profile-hero.tsx`

**Context:** This component replaces the `Userform` display mode. It renders the hero identity card with avatar, username, metadata, socials, stats strip, and live badge. The edit button opens a modal (built in Task 3).

**Step 1: Create the component**

```tsx
'use client';

import { hasFlag } from 'country-flag-icons';
import Image from 'next/image';
import Link from 'next/link';
import {
    Twitch as TwitchIcon,
    Twitter as TwitterIcon,
    Youtube as YoutubeIcon,
    Pencil as PencilIcon,
} from 'react-bootstrap-icons';
import { Run } from '~src/common/types';
import { countries } from '~src/common/countries';
import { BlueskyIcon } from '~src/icons/bluesky-icon';
import { PingAnimation } from '~app/(new-layout)/components/ping-animation.component';
import { Can, subject } from '~src/rbac/Can.component';
import { NameAsPatreon } from '~src/components/patreon/patreon-name';
import { CountryIcon } from '~src/components/user/userform';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { UserData } from '~src/lib/get-session-data';
import type { LiveRun } from '~app/(old-layout)/live/live.types';
import type { UserStats as UserRaceStats } from '~app/(old-layout)/races/races.types';
import type { User as IUser } from 'types/session.types';
import styles from '../profile.module.scss';
```

Props interface:
```tsx
interface ProfileHeroProps {
    username: string;
    userData: UserData;
    runs: Run[];
    liveRun?: LiveRun;
    raceStats?: UserRaceStats;
    session: IUser;
    onEditClick: () => void;
}
```

The component computes:
- `totalGames` = `new Set(runs.map(r => r.game)).size`
- `totalPlayTime` = sum of `run.totalRunTime` (parse int, filter NaN)
- `totalAttempts` = sum of `run.attemptCount`
- `totalFinished` = sum of `run.finishedAttemptCount`
- `completionPct` = `((totalFinished / totalAttempts) * 100).toFixed(0)`
- `totalRaces` = `raceStats?.totalRaces ?? 0`
- `displayName` = if `userData.login` differs from username, use `userData.login`, else `username`

Render structure:
```tsx
<div className={styles.hero}>
    <div className={styles.heroMain}>
        {/* Left: Avatar + Identity */}
        <div className="d-flex gap-3 align-items-start">
            {userData.picture && (
                <Image
                    src={userData.picture}
                    alt={username}
                    width={96}
                    height={96}
                    className={styles.avatar}
                    unoptimized
                />
            )}
            <div className={styles.usernameSection}>
                <div className="d-flex align-items-center gap-2">
                    <h1 className={styles.username}>
                        <NameAsPatreon name={displayName} />
                    </h1>
                    {userData.aka && (
                        <span className={styles.metadata}>({userData.aka})</span>
                    )}
                    {liveRun && (
                        <Link href={`/live/${username}`} className={styles.liveBadge}>
                            <PingAnimation /> LIVE
                        </Link>
                    )}
                </div>
                <div className={styles.metadata}>
                    {userData.pronouns && <span>{userData.pronouns}</span>}
                    {userData.pronouns && userData.country && (
                        <span className={styles.metadataDivider}>·</span>
                    )}
                    {userData.country && hasFlag(userData.country) && (
                        <span>
                            {countries()[userData.country]}{' '}
                            <CountryIcon countryCode={userData.country} />
                        </span>
                    )}
                    {userData.timezone && (
                        <>
                            <span className={styles.metadataDivider}>·</span>
                            <span>{userData.timezone}</span>
                        </>
                    )}
                </div>
                {userData.bio && <div className={styles.bio}>{userData.bio}</div>}
                <div className={styles.socials}>
                    <a href={`https://twitch.tv/${username}`} target="_blank" rel="noreferrer" className={styles.socialLink}>
                        <TwitchIcon size={20} />
                    </a>
                    {userData.socials?.youtube && (
                        <a href={`https://youtube.com/${userData.socials.youtube}`} target="_blank" rel="noreferrer" className={styles.socialLink}>
                            <YoutubeIcon size={20} />
                        </a>
                    )}
                    {userData.socials?.twitter && (
                        <a href={`https://twitter.com/${userData.socials.twitter}`} target="_blank" rel="noreferrer" className={styles.socialLink}>
                            <TwitterIcon size={20} />
                        </a>
                    )}
                    {userData.socials?.bluesky && (
                        <a href={`https://bsky.app/profile/${userData.socials.bluesky}`} target="_blank" rel="noreferrer" className={styles.socialLink}>
                            <BlueskyIcon />
                        </a>
                    )}
                </div>
            </div>
        </div>

        {/* Right: Stats Strip */}
        <div className={styles.statsStrip}>
            <StatBox value={totalGames} label="Games" />
            <StatBox value={runs.length} label="Categories" />
            <StatBox value={<DurationToFormatted duration={totalPlayTime.toString()} />} label="Played" />
            <StatBox value={`${completionPct}%`} label="Completion" />
            {totalRaces > 0 && <StatBox value={totalRaces} label="Races" />}
        </div>
    </div>

    {/* Edit button */}
    <Can I="edit" this={subject('user', username)}>
        <button className={styles.editButton} onClick={onEditClick} aria-label="Edit profile">
            <PencilIcon size={16} />
        </button>
    </Can>
</div>
```

Helper component inside the file:
```tsx
const StatBox = ({ value, label }: { value: React.ReactNode; label: string }) => (
    <div className={styles.statBox}>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
    </div>
);
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

Fix any type errors.

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/profile-hero.tsx
git commit -m "feat(profile): add ProfileHero identity card component"
```

---

### Task 3: Create ProfileEditModal Component

**Files:**
- Create: `app/(old-layout)/[username]/components/profile-edit-modal.tsx`

**Context:** This replaces the inline `Userform` edit mode with a Bootstrap modal. Contains all the same form fields (pronouns, AKA, country, timezone, bio, socials) but in a modal dialog. Saves via the same `PUT /api/users/${session.id}-${username}` endpoint.

**Step 1: Create the modal component**

Reuse the form fields from `src/components/user/userform.tsx` (lines 173-383) but wrap them in a Bootstrap `Modal` component instead of inline rendering. The component takes these props:

```tsx
interface ProfileEditModalProps {
    show: boolean;
    onHide: () => void;
    username: string;
    session: IUser;
    userData: UserData;
}
```

State: same `form` state as `Userform` (pronouns, socials, bio, country, aka, timezone).

On save: call the same PUT endpoint, then `onHide()`. On cancel: `onHide()`.

The modal uses `Modal`, `Modal.Header`, `Modal.Body`, `Modal.Footer` from react-bootstrap, with the form content restructured into a single column layout that works well in a modal.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/profile-edit-modal.tsx
git commit -m "feat(profile): add ProfileEditModal component replacing inline editing"
```

---

### Task 4: Create LiveRunBanner Component

**Files:**
- Create: `app/(old-layout)/[username]/components/live-run-banner.tsx`

**Context:** Renders a prominent live run banner at the top of the Overview tab when the user is currently running. Uses the same visual language as `CurrentUserLivePanelView` (pulse-glow border, timer, delta, progress bar) but adapted for the profile context.

**Step 1: Create the component**

Props:
```tsx
interface LiveRunBannerProps {
    liveRun: LiveRun;
    username: string;
}
```

The component is very similar to `app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel-view.tsx` (lines 55-163) but:
- Uses `styles` from `profile.module.scss` (`.liveRunBanner`, `.bannerImage`, `.bannerContent`, `.bannerTimer`, etc.)
- Shows "Live Run" instead of "Your Live Run"
- Uses the same `LiveSplitTimerComponent`, `GameImage`, `DurationToFormatted` components
- Wraps in a `Link` to `/live/${username}`
- Computes `progressPercentage = Math.min(100, (liveRun.currentTime / liveRun.pb) * 100)`

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/live-run-banner.tsx
git commit -m "feat(profile): add LiveRunBanner component with pulse-glow animation"
```

---

### Task 5: Create QuickStatsPanel Component

**Files:**
- Create: `app/(old-layout)/[username]/components/quick-stats-panel.tsx`

**Context:** Replaces the old `UserStats` table (`src/components/run/user-detail/user-stats.tsx`) with a styled Panel containing a 2-column grid of stat cards. Same data, new presentation.

**Step 1: Create the component**

Props: `{ runs: Run[] }` — same as existing `UserStats`.

Compute the same values as `src/components/run/user-detail/user-stats.tsx` (lines 6-23):
- `totalPlayTime`, `totalAttempts`, `totalFinishedAttempts`, `games`, `lastSessionTime`
- `completionPct = ((totalFinishedAttempts / totalAttempts) * 100).toFixed(1)`

Render as a Panel:
```tsx
<Panel subtitle="Stats" title="Quick Stats">
    <div className={styles.statsGrid}>
        <QuickStatItem label="Games" value={games} />
        <QuickStatItem label="Categories" value={runs.length} />
        <QuickStatItem label="Played" value={<DurationToFormatted duration={totalPlayTime} />} />
        <QuickStatItem label="Attempts" value={totalAttempts} />
        <QuickStatItem label="Completed" value={totalFinishedAttempts} />
        <QuickStatItem label="Completion" value={`${completionPct}%`} />
        <QuickStatItem label="Last Active" value={<IsoToFormatted iso={lastSessionTime} />} />
    </div>
</Panel>
```

Where `QuickStatItem` renders:
```tsx
<div className={styles.quickStatItem}>
    <div className={styles.quickStatValue}>{value}</div>
    <div className={styles.quickStatLabel}>{label}</div>
</div>
```

Import `Panel` from `~app/(new-layout)/components/panel.component`.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/quick-stats-panel.tsx
git commit -m "feat(profile): add QuickStatsPanel with grid layout"
```

---

### Task 6: Create SummaryPanel Component

**Files:**
- Create: `app/(old-layout)/[username]/components/summary-panel.tsx`

**Context:** Brings the frontpage weekly/monthly stats summary to the profile sidebar. Reuses `ProgressChart`, `StatsContent`, and `fetchStatsAction` from the frontpage stats panel. This is a server component that fetches summary data for the profile user.

**Step 1: Create the server component**

This is an async server component that:
1. Calls `getUserSummary(username, 'month', 0)` and `getDateOfFirstUserSummary(username, 'week')` and `getDateOfFirstUserSummary(username, 'month')` in parallel
2. Pre-fetches game data for finished runs (same pattern as `stats-panel.tsx` lines 36-44)
3. Wraps `StatsContent` in a Panel

```tsx
import { Panel } from '~app/(new-layout)/components/panel.component';
import { getGameGlobal } from '~src/components/game/get-game';
import { getDateOfFirstUserSummary, getUserSummary } from '~src/lib/summary';
import { StatsContent } from '~app/(new-layout)/frontpage/panels/stats-panel/stats-content';

interface SummaryPanelProps {
    username: string;
}

export default async function SummaryPanel({ username }: SummaryPanelProps) {
    const [initialStats, firstWeek, firstMonth] = await Promise.all([
        getUserSummary(username, 'month', 0),
        getDateOfFirstUserSummary(username, 'week'),
        getDateOfFirstUserSummary(username, 'month'),
    ]);

    if (!initialStats) return null;

    const uniqueGames = [...new Set(initialStats.finishedRuns.map((r) => r.game))];
    const gameDataArray = await Promise.all(uniqueGames.map((game) => getGameGlobal(game)));
    const initialGameDataMap = Object.fromEntries(
        uniqueGames.map((game, i) => [game, gameDataArray[i]]),
    );

    return (
        <Panel subtitle="Summary" title="Performance">
            <div className="p-3">
                <StatsContent
                    initialStats={initialStats}
                    username={username}
                    firstWeek={firstWeek}
                    firstMonth={firstMonth}
                    initialGameDataMap={initialGameDataMap}
                />
            </div>
        </Panel>
    );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/summary-panel.tsx
git commit -m "feat(profile): add SummaryPanel with weekly/monthly stats"
```

---

### Task 7: Create RaceStatsPanel Component

**Files:**
- Create: `app/(old-layout)/[username]/components/race-stats-panel.tsx`

**Context:** Replaces the old race stats table in the overview sidebar with a styled Panel using the stats grid pattern.

**Step 1: Create the component**

Props: `{ raceStats: UserRaceStats; username: string }`

Render a Panel with a stats grid (same pattern as QuickStatsPanel) showing:
- Total Races
- Finished Races
- Finish % (computed)
- Total Race Time (DurationToFormatted)

Add a link to the Races tab using `onClick` to switch tabs (pass a callback prop), or just a "View Race Details" link text.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/race-stats-panel.tsx
git commit -m "feat(profile): add RaceStatsPanel sidebar component"
```

---

### Task 8: Create ProfileTabs Component

**Files:**
- Create: `app/(old-layout)/[username]/components/profile-tabs.tsx`

**Context:** Custom tab navigation replacing Bootstrap's `<Tabs>`. Renders styled tab buttons with active state. Controls which tab content is shown. Includes the game time toggle and game filter controls to the right of the tabs.

**Step 1: Create the component**

Props:
```tsx
interface ProfileTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    tabs: { key: string; label: string }[];
    hasGameTime: boolean;
    useGameTime: boolean;
    setUseGameTime: (v: boolean) => void;
    gameCount: number;
    games: string[];
    currentGame: string;
    setCurrentGame: (game: string) => void;
}
```

Renders:
```tsx
<div className={styles.profileTabs}>
    {tabs.map(tab => (
        <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => onTabChange(tab.key)}
        >
            {tab.label}
        </button>
    ))}
    <div className={styles.tabControls}>
        {hasGameTime && (
            <GametimeForm useGameTime={useGameTime} setUseGameTime={setUseGameTime} />
        )}
        {gameCount > 1 && (
            <select className="form-select form-select-sm" style={{ maxWidth: '200px' }}
                onChange={(e) => setCurrentGame(e.target.value.split('#')[0])}
                value={currentGame}
            >
                <option value="all-games">All Games</option>
                {games.map(game => (
                    <option key={game} value={game}>{game.split('#')[0]}</option>
                ))}
            </select>
        )}
    </div>
</div>
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/profile-tabs.tsx
git commit -m "feat(profile): add styled ProfileTabs component"
```

---

### Task 9: Create OverviewTab Component

**Files:**
- Create: `app/(old-layout)/[username]/components/overview-tab.tsx`

**Context:** The Overview tab content, extracted from the current `user-profile.tsx` (lines 175-239). Contains the live run banner, game panels (UserOverview), and sidebar (QuickStatsPanel, SummaryPanel, RaceStatsPanel, HighlightedRun).

**Step 1: Create the component**

Props:
```tsx
interface OverviewTabProps {
    runs: Map<string, Run[]>; // runMap
    currentRuns: Run[];
    username: string;
    session: IUser;
    useGameTime: boolean;
    allGlobalGameData: GlobalGameData[];
    liveRun?: LiveRun;
    raceStats?: UserRaceStats;
    highlightedRun?: Run;
    parentForceUpdate: () => void;
}
```

Renders:
```tsx
<>
    {/* Live Run Banner */}
    {liveRun && !Array.isArray(liveRun) && (
        <LiveRunBanner liveRun={liveRun} username={username} />
    )}

    <Row>
        {/* Main Content: Game Overview */}
        <Col xl={8} lg={12}>
            <UserOverview
                runs={runs}
                username={username}
                gameTime={useGameTime}
                session={session}
                allGlobalGameData={allGlobalGameData}
                parentForceUpdate={parentForceUpdate}
            />
        </Col>

        {/* Sidebar */}
        <Col xl={4} lg={12}>
            <div className="d-flex flex-column gap-3">
                <QuickStatsPanel runs={currentRuns} />
                <Suspense fallback={<PanelSkeleton title="Performance" />}>
                    <SummaryPanel username={username} />
                </Suspense>
                {raceStats && (
                    <RaceStatsPanel raceStats={raceStats} username={username} />
                )}
                {highlightedRun && <HighlightedRun run={highlightedRun} />}
            </div>
        </Col>
    </Row>
</>
```

Note: `SummaryPanel` is a server component, so it needs `Suspense` wrapping since it's used inside a client component boundary. If this causes issues, convert it to a client component that fetches via `useSWR` or a server action instead.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/overview-tab.tsx
git commit -m "feat(profile): add OverviewTab with live banner and sidebar panels"
```

---

### Task 10: Create ActivityTab Component

**Files:**
- Create: `app/(old-layout)/[username]/components/activity-tab.tsx`

**Context:** Merges the current Activity tab (Stats component with heatmap/charts) and Sessions tab into one unified view. Wraps each section in Panels.

**Step 1: Create the component**

Props:
```tsx
interface ActivityTabProps {
    username: string;
    sessions: RunSession[];
    useGameTime: boolean;
}
```

Renders the existing `Stats` component (which fetches its own data via useSWR) followed by `SessionOverview`, each wrapped in the new design.

```tsx
<div className="d-flex flex-column gap-3">
    {/* Activity charts (fetches its own data) */}
    <Stats username={username} />

    {/* Sessions section */}
    <Panel subtitle="History" title="Recent Sessions">
        <div className="p-3">
            <SessionOverview sessions={sessions} />
        </div>
    </Panel>
</div>
```

The `Stats` component already handles its own data fetching and rendering. We keep it as-is for now — its internal styling can be updated in a follow-up task if needed.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/activity-tab.tsx
git commit -m "feat(profile): add ActivityTab merging activity charts and sessions"
```

---

### Task 11: Create RacesTab Component

**Files:**
- Create: `app/(old-layout)/[username]/components/races-tab.tsx`

**Context:** Brings race content inline into the profile. Since race data requires additional API calls (`getDetailedUserStats`, `getRaceParticipationsByUser`, `getRacesByIds`), this component fetches its data client-side using useSWR or loads it lazily.

**Step 1: Create the component**

Two approaches:
- **Option A (simpler):** Fetch race detail data in `page.tsx` server-side and pass it down. This means adding the race detail data fetching to the existing page.
- **Option B:** Client-side fetch when the Races tab is activated.

Go with **Option A** — fetch in `page.tsx` and pass down. This way the data is ready when the user clicks the tab.

Props:
```tsx
interface RacesTabProps {
    username: string;
    globalStats: UserStats;
    categoryStatsMap: UserStats[][];
    participations: RaceParticipant[];
    initialRaces: Race[];
}
```

Renders the existing `UserRaceProfile` sub-components but without the breadcrumbs:
- Race stats summary row (stat cards using QuickStatItem pattern)
- `UserRaces` component (race history with load-more)
- `UserRaceStatsByGame` component

Wrap each section in Panels.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/races-tab.tsx
git commit -m "feat(profile): add RacesTab component bringing races inline"
```

---

### Task 12: Create StreamTab Component

**Files:**
- Create: `app/(old-layout)/[username]/components/stream-tab.tsx`

**Context:** Simple component wrapping TwitchEmbed in a Panel.

**Step 1: Create the component**

```tsx
'use client';

import { TwitchEmbed } from 'react-twitch-embed';
import { Panel } from '~app/(new-layout)/components/panel.component';

interface StreamTabProps {
    username: string;
}

export const StreamTab = ({ username }: StreamTabProps) => (
    <Panel subtitle="Live" title="Twitch Stream">
        <TwitchEmbed
            channel={username}
            width="100%"
            height="800px"
            muted
            withChat={true}
        />
    </Panel>
);
```

**Step 2: Commit**

```bash
git add app/\(old-layout\)/\[username\]/components/stream-tab.tsx
git commit -m "feat(profile): add StreamTab component with Panel wrapper"
```

---

### Task 13: Update page.tsx to Fetch Race Detail Data

**Files:**
- Modify: `app/(old-layout)/[username]/page.tsx`

**Context:** Add race detail data fetching so the Races tab has its data ready. Import the same functions used by the races page.

**Step 1: Add race detail data fetching**

Add imports at the top:
```tsx
import { getDetailedUserStats, getRaceParticipationsByUser, getRacesByIds } from '~src/lib/races';
import { groupCategoryStatsByGame } from '~app/(old-layout)/[username]/races/group-category-stats-by-game';
```

In the `Promise.all` (line 75), add the race detail fetches:
```tsx
const [userData, liveData, raceStats, session, detailedRaceStats, raceParticipations] = await Promise.all([
    getGlobalUser(username),
    getLiveRunForUser(username),
    getUserRaceStats(username),
    getSession(),
    getDetailedUserStats(username).catch(() => null),
    getRaceParticipationsByUser(username).catch(() => []),
] as const);
```

After the Promise.all, fetch initial races:
```tsx
let initialRaces = [];
let categoryStatsMap = [];
if (raceParticipations && raceParticipations.length > 0) {
    initialRaces = await getRacesByIds(
        raceParticipations.slice(0, 10).map((p) => p.raceId),
    );
}
if (detailedRaceStats?.categoryStats) {
    categoryStatsMap = groupCategoryStatsByGame(detailedRaceStats.categoryStats);
}
```

Pass these as new props to `UserProfile`:
```tsx
<UserProfile
    ...existing props...
    detailedRaceStats={detailedRaceStats?.globalStats}
    raceParticipations={raceParticipations || []}
    initialRaces={initialRaces}
    categoryStatsMap={categoryStatsMap}
/>
```

**Step 2: Update UserPageProps interface** in `user-profile.tsx` to accept the new props:
```tsx
export interface UserPageProps {
    // ...existing...
    detailedRaceStats?: UserStats;
    raceParticipations?: RaceParticipant[];
    initialRaces?: Race[];
    categoryStatsMap?: UserStats[][];
}
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Commit**

```bash
git add app/\(old-layout\)/\[username\]/page.tsx
git commit -m "feat(profile): extend page.tsx to fetch race detail data"
```

---

### Task 14: Rewrite UserProfile Component

**Files:**
- Modify: `app/(old-layout)/[username]/user-profile.tsx`

**Context:** This is the main integration task. Replace the current `UserProfile` component with the new structure: ProfileHero → ProfileTabs → tab content (OverviewTab, ActivityTab, RacesTab, StreamTab). Wire up all state (game time, game filter, active tab, live run, edit modal).

**Step 1: Rewrite the component**

Keep the same exports and props interface (extended in Task 13). The component structure becomes:

```tsx
export const UserProfile = ({ runs, username, userData, ... }: UserPageProps) => {
    const [useGameTime, setUseGameTime] = useState(hasGameTime && defaultGameTime);
    const [currentGame, setCurrentGame] = useState('all-games');
    const [, forceUpdate] = useReducer((x) => x + 1, 0);
    const [liveRun, setLiveRun] = useState(liveData);
    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);

    // WebSocket for live run updates (unchanged)
    const lastMessage = useLiveRunsWebsocket(username);
    useEffect(() => { /* same as before */ }, [lastMessage]);

    if (runs.length === 0) return <NoRuns ... />;

    // Same sorting and filtering logic
    runs.sort(...);
    const currentRuns = ...;
    const runMap = getRunmap(currentRuns);
    const highlightedRun = ...;
    const allRunsRunMap = getRunmap(runs);
    const sessions = prepareSessions(currentRuns, false);
    const gameTimeSessions = ...;

    // Build tabs array
    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'activity', label: 'Activity' },
        { key: 'races', label: 'Races' },
        ...(username ? [{ key: 'stream', label: 'Stream' }] : []),
    ];

    // Unique game names for filter
    const uniqueGames = Array.from(allRunsRunMap.keys())
        .filter((game, i, arr) => i === 0 || game.split('#')[0] !== arr[i-1].split('#')[0]);

    return (
        <>
            <ProfileHero
                username={username}
                userData={userData}
                runs={runs}
                liveRun={liveRun}
                raceStats={raceStats}
                session={session}
                onEditClick={() => setShowEditModal(true)}
            />

            <ProfileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={tabs}
                hasGameTime={hasGameTime}
                useGameTime={useGameTime}
                setUseGameTime={setUseGameTime}
                gameCount={allRunsRunMap.size}
                games={uniqueGames}
                currentGame={currentGame}
                setCurrentGame={setCurrentGame}
            />

            {activeTab === 'overview' && (
                <OverviewTab
                    runs={runMap}
                    currentRuns={currentRuns}
                    username={username}
                    session={session}
                    useGameTime={useGameTime}
                    allGlobalGameData={allGlobalGameData}
                    liveRun={liveRun}
                    raceStats={raceStats}
                    highlightedRun={highlightedRun}
                    parentForceUpdate={forceUpdate}
                />
            )}

            {activeTab === 'activity' && (
                <ActivityTab
                    username={username}
                    sessions={useGameTime && gameTimeSessions ? gameTimeSessions : sessions}
                    useGameTime={useGameTime}
                />
            )}

            {activeTab === 'races' && detailedRaceStats && (
                <RacesTab
                    username={username}
                    globalStats={detailedRaceStats}
                    categoryStatsMap={categoryStatsMap || []}
                    participations={raceParticipations || []}
                    initialRaces={initialRaces || []}
                />
            )}

            {activeTab === 'stream' && (
                <StreamTab username={username} />
            )}

            <ProfileEditModal
                show={showEditModal}
                onHide={() => setShowEditModal(false)}
                username={username}
                session={session}
                userData={userData}
            />
        </>
    );
};
```

Also update `NoRuns` to use the new `ProfileHero` component instead of `Userform`.

**Step 2: Remove old imports** that are no longer needed (Tabs, Tab from react-bootstrap, Userform for display, etc.)

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Commit**

```bash
git add app/\(old-layout\)/\[username\]/user-profile.tsx
git commit -m "feat(profile): rewrite UserProfile with new component architecture"
```

---

### Task 15: Visual Polish and Dev Testing

**Files:**
- Modify: `app/(old-layout)/[username]/profile.module.scss` (adjustments)
- Potentially modify: various component files for spacing/styling fixes

**Context:** Run the dev server and visually verify the profile page. Fix any styling issues, spacing problems, responsive breakpoints, or missing styles.

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test the profile page**

Navigate to a user profile (e.g., `localhost:3000/someuser`) and check:
- [ ] Hero section renders correctly with avatar, name, metadata, stats strip
- [ ] Social links display and are clickable
- [ ] Edit button appears for the logged-in user only
- [ ] Edit modal opens and saves correctly
- [ ] Live badge appears when user has active run
- [ ] Tabs render with correct styling (active state, hover)
- [ ] Game time toggle works
- [ ] Game filter works
- [ ] Overview tab: game panels display, sidebar stats panels display
- [ ] Live run banner appears when user is live
- [ ] Activity tab: heatmap, charts, and sessions display
- [ ] Races tab: race stats and history display
- [ ] Stream tab: Twitch embed displays
- [ ] Responsive: test at mobile widths (hero stacks, tabs scroll, columns stack)
- [ ] Dark mode: verify all colors use CSS variables correctly
- [ ] No console errors

**Step 3: Fix any issues discovered**

Adjust SCSS module, component spacing, or Bootstrap classes as needed.

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix(profile): visual polish and responsive fixes"
```

---

### Task 16: Typecheck and Lint

**Files:**
- Potentially modify: any files flagged by linter

**Step 1: Run typecheck**

Run: `npm run typecheck`

Expected: No errors. Fix any that appear.

**Step 2: Run lint**

Run: `npm run lint`

Expected: No errors. Fix any that appear.

**Step 3: Run Biome format**

Run: `npx @biomejs/biome check --write app/\(old-layout\)/\[username\]/`

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore(profile): fix lint and typecheck issues"
```

---

### Task 17: Build Verification

**Step 1: Clear build cache**

Run: `rm -rf .next`

**Step 2: Run production build**

Run: `npm run build`

Expected: Build succeeds without errors.

**Step 3: Fix any build errors**

If the build fails, fix the issues and re-run.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(profile): resolve build errors"
```

---

### Task 18: Final Cleanup

**Step 1: Review for dead code**

Check if any old components are now unused:
- The `Userform` component's Display function — still needed for NoRuns fallback? If NoRuns now uses ProfileHero, the Display function may be unused.
- The old `UserRaceStatsTable` import in user-profile.tsx — should be removed.
- The `SessionOverview` as a standalone tab usage — should be removed from user-profile.tsx (now in ActivityTab).

Remove any unused imports.

**Step 2: Verify the races page still works**

The races page at `app/(old-layout)/[username]/races/page.tsx` should continue to work independently. Verify it still renders correctly.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore(profile): remove dead code and unused imports"
```

**Step 4: Push**

```bash
git push
```
