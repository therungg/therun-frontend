# Current User Live Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a real-time live run panel to the new frontpage showing the logged-in user's active speedrun with websocket updates and special highlight styling.

**Architecture:** Server component fetches session and initial live run data, passes to client component which manages websocket updates. Panel only renders when user has active run. Entire panel is clickable link to detailed live view.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, WebSocket (existing hook), SCSS Modules

---

## Task 1: Create Server Component Structure

**Files:**
- Create: `app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel.tsx`

**Step 1: Create server component file**

Create the directory and server component:

```typescript
import { getSession } from '~src/actions/session.action';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { CurrentUserLivePanelView } from './current-user-live-panel-view';

export default async function CurrentUserLivePanel() {
    const session = await getSession();

    // No session = no panel
    if (!session?.username) {
        return null;
    }

    // Fetch live run data
    const liveData = await getLiveRunForUser(session.username);

    // No active run = no panel
    if (!liveData || Array.isArray(liveData) && liveData.length === 0) {
        return null;
    }

    return (
        <Panel
            subtitle="Currently Running"
            title="Your Live Run"
            link={{ url: `/live/${session.username}`, text: 'View Details' }}
            className="p-4"
        >
            <CurrentUserLivePanelView
                initialLiveData={liveData}
                username={session.username}
            />
        </Panel>
    );
}
```

**Step 2: Verify imports resolve**

Run: `npm run typecheck 2>&1 | grep current-user-live-panel`

Expected: No errors for this file (may have pre-existing errors from other files)

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel.tsx
git commit -m "feat: add server component for current user live panel

- Fetches session and live run data
- Returns null if no session or no active run
- Passes data to client component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Client Component with Websocket

**Files:**
- Create: `app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel-view.tsx`

**Step 1: Create client component with websocket integration**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import Link from 'next/link';
import styles from './current-user-live-panel.module.scss';

interface CurrentUserLivePanelViewProps {
    initialLiveData: LiveRun;
    username: string;
}

export const CurrentUserLivePanelView: React.FC<CurrentUserLivePanelViewProps> = ({
    initialLiveData,
    username,
}) => {
    const [liveRun, setLiveRun] = useState<LiveRun | undefined>(initialLiveData);
    const lastMessage = useLiveRunsWebsocket(username);

    useEffect(() => {
        if (lastMessage !== null) {
            if (lastMessage.type === 'UPDATE') {
                setLiveRun(lastMessage.run);
            }
            if (lastMessage.type === 'DELETE') {
                setLiveRun(undefined);
            }
        }
    }, [lastMessage]);

    // Hide panel if run ended
    if (!liveRun) {
        return null;
    }

    return (
        <Link href={`/live/${username}`} className={styles.panelLink}>
            <div className={styles.liveRunPanel}>
                <div>Live run content placeholder</div>
            </div>
        </Link>
    );
};
```

**Step 2: Verify TypeScript compilation**

Run: `npm run typecheck 2>&1 | grep current-user-live-panel-view`

Expected: No new errors for this file

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel-view.tsx
git commit -m "feat: add client component with websocket for live panel

- Manages live run state with websocket updates
- Handles UPDATE and DELETE messages
- Wraps content in clickable link

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Live Run Content Display

**Files:**
- Modify: `app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel-view.tsx:37-40`

**Step 1: Import required components**

Add imports at top of file:

```typescript
import { LiveSplitTimerComponent } from '~app/(old-layout)/live/live-split-timer.component';
import { LiveIcon } from '~src/components/live/live-user-run';
import { DurationToFormatted } from '~src/components/util/datetime';
import { GameImage } from '~src/components/image/gameimage';
import Image from 'next/image';
import { useTheme } from 'next-themes';
```

**Step 2: Replace placeholder with full content**

Replace the `<div>Live run content placeholder</div>` section with:

```typescript
const { resolvedTheme } = useTheme();
const dark = resolvedTheme === 'dark';

// Calculate progress percentage
const progressPercentage = liveRun.pb > 0
    ? Math.min((liveRun.currentTime / liveRun.pb) * 100, 100)
    : 0;

// Determine if ahead or behind
const isAhead = liveRun.delta < 0;

return (
    <Link href={`/live/${username}`} className={styles.panelLink}>
        <div className={styles.liveRunPanel}>
            {/* Live Badge */}
            <div className={styles.liveBadge}>
                <LiveIcon height={16} dark={dark} />
            </div>

            {/* Top Section: Game Info */}
            <div className={styles.topSection}>
                <div className={styles.gameImageContainer}>
                    {liveRun.gameImage && liveRun.gameImage !== 'noimage' ? (
                        <GameImage
                            alt={liveRun.game}
                            src={liveRun.gameImage}
                            quality="small"
                            height={80}
                            width={80}
                        />
                    ) : (
                        <Image
                            alt="Logo"
                            src={dark ? '/logo_dark_theme_no_text_transparent.png' : '/logo_light_theme_no_text_transparent.png'}
                            width={60}
                            height={60}
                        />
                    )}
                </div>
                <div className={styles.gameInfo}>
                    <div className={styles.gameName}>{liveRun.game}</div>
                    <div className={styles.categoryName}>{liveRun.category}</div>
                    {liveRun.currentlyStreaming && (
                        <div className={styles.streamingIndicator}>
                            🟣 Streaming
                        </div>
                    )}
                </div>
            </div>

            {/* Center Section: Primary Stats */}
            <div className={styles.centerSection}>
                <div className={styles.timerContainer}>
                    <LiveSplitTimerComponent liveRun={liveRun} dark={dark} />
                </div>

                <div className={styles.splitInfo}>
                    Split {liveRun.currentSplitIndex + 1}/{liveRun.splits.length}: {liveRun.currentSplitName}
                </div>

                <div className={`${styles.delta} ${isAhead ? styles.deltaAhead : styles.deltaBehind}`}>
                    {isAhead ? '-' : '+'}<DurationToFormatted duration={Math.abs(liveRun.delta)} />
                </div>
            </div>

            {/* Bottom Section: Progress */}
            <div className={styles.bottomSection}>
                <div className={styles.pbReference}>
                    PB: <DurationToFormatted duration={liveRun.pb} />
                </div>
                <div className={styles.progressBarContainer}>
                    <div
                        className={`${styles.progressBar} ${isAhead ? styles.progressAhead : styles.progressBehind}`}
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>
        </div>
    </Link>
);
```

**Step 3: Verify TypeScript compilation**

Run: `npm run typecheck 2>&1 | grep current-user-live-panel-view`

Expected: No new errors

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel-view.tsx
git commit -m "feat: add complete live run content display

- Game image and info
- Live timer with LiveSplitTimerComponent
- Current split and delta display
- Progress bar based on PB
- Live badge indicator

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Panel Styling

**Files:**
- Create: `app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel.module.scss`

**Step 1: Create styles file**

```scss
@import '../../../styles/design-tokens';
@import '../../../styles/mixins';

.panelLink {
    text-decoration: none;
    color: inherit;
    display: block;
}

.liveRunPanel {
    position: relative;
    border: 2px solid var(--bs-primary);
    border-radius: 0.75rem;
    padding: 1rem;
    animation: live-pulse 2s ease-in-out infinite;
    box-shadow: 0 0 12px rgba(96, 140, 89, 0.3);
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    background: var(--bs-body-bg);

    &:hover {
        box-shadow: 0 0 16px rgba(96, 140, 89, 0.4);
        transform: translateY(-2px);
    }
}

@keyframes live-pulse {
    0%, 100% {
        border-color: var(--bs-primary);
        box-shadow: 0 0 12px rgba(96, 140, 89, 0.3);
    }
    50% {
        border-color: var(--bs-primary-light);
        box-shadow: 0 0 16px rgba(96, 140, 89, 0.5);
    }
}

.liveBadge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 2;
}

.topSection {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.gameImageContainer {
    flex-shrink: 0;
    width: 80px;
    height: 80px;
    border-radius: 0.5rem;
    overflow: hidden;
}

.gameInfo {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.gameName {
    font-size: 1.1rem;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.categoryName {
    font-size: 0.9rem;
    opacity: 0.8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.streamingIndicator {
    font-size: 0.8rem;
    color: var(--bs-primary);
    font-weight: 600;
}

.centerSection {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.timerContainer {
    font-size: 2rem;
    font-weight: 700;
    font-family: var(--bs-font-monospace);
    color: var(--bs-primary);
}

.splitInfo {
    font-size: 0.9rem;
    opacity: 0.8;
    text-align: center;
}

.delta {
    font-size: 1.1rem;
    font-weight: 600;
    font-family: var(--bs-font-monospace);
}

.deltaAhead {
    color: #4caf50;
}

.deltaBehind {
    color: #f44336;
}

.bottomSection {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.pbReference {
    font-size: 0.85rem;
    opacity: 0.7;
    text-align: center;
    font-family: var(--bs-font-monospace);
}

.progressBarContainer {
    width: 100%;
    height: 8px;
    background: var(--bs-tertiary-bg);
    border-radius: 4px;
    overflow: hidden;
}

.progressBar {
    height: 100%;
    transition: width 0.3s ease-in-out;
    border-radius: 4px;
}

.progressAhead {
    background: linear-gradient(90deg, #4caf50, #66bb6a);
}

.progressBehind {
    background: linear-gradient(90deg, #f44336, #ef5350);
}

// Dark mode adjustments
[data-bs-theme="dark"] {
    .liveRunPanel {
        box-shadow: 0 0 12px rgba(96, 140, 89, 0.4);

        &:hover {
            box-shadow: 0 0 16px rgba(96, 140, 89, 0.5);
        }
    }

    @keyframes live-pulse {
        0%, 100% {
            box-shadow: 0 0 12px rgba(96, 140, 89, 0.4);
        }
        50% {
            box-shadow: 0 0 16px rgba(96, 140, 89, 0.6);
        }
    }
}
```

**Step 2: Verify styles compile**

Run: `npm run dev` (in background if not already running) and check for SCSS compilation errors

Expected: No compilation errors

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel.module.scss
git commit -m "feat: add styling for live panel with pulse animation

- Animated pulsing border and glow
- Responsive layout for game info and stats
- Color-coded delta (green ahead, red behind)
- Progress bar with gradient colors
- Dark mode support

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Integrate Panel into Frontpage

**Files:**
- Modify: `app/(new-layout)/frontpage/frontpage.tsx:1` (add import)
- Modify: `app/(new-layout)/frontpage/frontpage.tsx:24` (add panel)

**Step 1: Add import**

Add to imports at top of file:

```typescript
import CurrentUserLivePanel from './panels/current-user-live-panel/current-user-live-panel';
```

**Step 2: Add panel to right column**

Find the right column div (around line 24) and add panel at the top:

```typescript
<div className="col col-lg-6 col-xl-5 col-12">
    <CurrentUserLivePanel />
    <RacePanel />
    <PatreonPanel />
    <LatestPbsPanel />
</div>
```

**Step 3: Verify TypeScript compilation**

Run: `npm run typecheck 2>&1 | grep frontpage`

Expected: No new errors

**Step 4: Test in development**

Run: `npm run dev` and navigate to `http://localhost:3000`

Expected behavior:
- If not logged in: Panel does not appear
- If logged in without active run: Panel does not appear
- If logged in with active run: Panel appears at top of right column

**Step 5: Commit**

```bash
git add app/(new-layout)/frontpage/frontpage.tsx
git commit -m "feat: integrate current user live panel into frontpage

- Added at top of right column
- Conditionally renders based on session and live run state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Manual Testing & Refinement

**Files:**
- None (testing only)

**Step 1: Test no session state**

1. Ensure you're logged out
2. Navigate to frontpage
3. Verify panel does not appear

**Step 2: Test no active run state**

1. Log in
2. Ensure you don't have an active run
3. Navigate to frontpage
4. Verify panel does not appear

**Step 3: Test active run display**

1. Log in
2. Start a speedrun (connect LiveSplit)
3. Navigate to frontpage
4. Verify panel appears with:
   - Game image and info
   - Live timer counting
   - Current split displayed
   - Delta showing correct color
   - Progress bar filling

**Step 4: Test websocket updates**

1. With panel visible, continue the run
2. Complete a split
3. Verify panel updates automatically (new split, updated timer, new delta)

**Step 5: Test run completion**

1. With panel visible, finish or reset the run
2. Verify panel disappears automatically

**Step 6: Test clickability**

1. With panel visible, click anywhere on it
2. Verify navigation to `/live/{username}`

**Step 7: Test styling**

1. Verify pulse animation is visible but not distracting
2. Test hover effect (lift + enhanced glow)
3. Verify delta colors (green if ahead, red if behind)
4. Test in both light and dark modes

**Step 8: Document any issues**

If any issues found, create follow-up tasks in this plan or fix immediately if minor.

---

## Task 7: Final Verification & Polish

**Files:**
- Modify: Any files needing refinement based on testing

**Step 1: Run type check**

Run: `npm run typecheck 2>&1 | grep current-user-live`

Expected: No errors in new files

**Step 2: Run linter**

Run: `npm run lint-fix`

Expected: Auto-fixes applied, no remaining errors in new files

**Step 3: Test responsive behavior**

1. Test panel on mobile viewport (DevTools)
2. Verify text truncates properly
3. Verify layout doesn't break

**Step 4: Performance check**

1. Check Network tab for websocket connection
2. Verify only one connection established
3. Check for memory leaks (multiple panel mount/unmount cycles)

**Step 5: Commit any refinements**

```bash
git add .
git commit -m "polish: refinements to live panel based on testing

[Describe any changes made]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Completion Checklist

- [ ] Server component created and fetches data correctly
- [ ] Client component manages websocket updates
- [ ] Panel displays all required information
- [ ] Styling matches design (pulse animation, colors, layout)
- [ ] Panel integrates into frontpage at correct position
- [ ] Panel appears only when conditions met (session + active run)
- [ ] Panel disappears when run ends
- [ ] Websocket updates work in real-time
- [ ] Entire panel is clickable and navigates correctly
- [ ] Works in both light and dark modes
- [ ] Responsive on mobile
- [ ] No TypeScript errors in new files
- [ ] No linting errors
- [ ] All commits follow conventional commit format

---

## Notes

- Panel reuses existing components (`LiveSplitTimerComponent`, `LiveIcon`, etc.)
- Websocket connection uses existing `useLiveRunsWebsocket` hook (no new connections)
- Server component pattern matches other panels in `app/(new-layout)/frontpage/panels/`
- Styling follows existing design tokens and mixins
- Panel gracefully handles missing optional fields (gameImage, currentlyStreaming)

## Related Skills

- @superpowers:executing-plans - Execute this plan task-by-task
- @superpowers:subagent-driven-development - Use subagents per task with review
- @superpowers:verification-before-completion - Verify all tests pass before claiming done
- @superpowers:finishing-a-development-branch - Cleanup after implementation complete
