# Race detail live drawer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface live split data and commentary on race detail pages by reusing the existing `CommentaryDrawer`. Clicking a participant who is submitting live data opens the drawer focused on that runner. Run tab per-split rows are extended to show cumulative + segment times alongside the existing delta bar.

**Architecture:** A new race-side host component owns a lazy `LiveDataMap`, subscribes to the live websocket filtered to participants in this race, and renders the existing `CommentaryDrawer`. Participant clicks consume a context-exposed `focusUser(user)` to fetch + open. The Run tab's per-split section gets two new columns inside the existing `DeltaBar` grid layout.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, React Bootstrap, CSS Modules. No test runner — verification is `npm run typecheck` + `npm run lint` + visual check via `npm run dev`.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/components/live/commentary-drawer/tabs/run-tab.tsx` | modify | Per-split rows now include cumulative + segment time columns |
| `src/components/live/commentary-drawer/commentary-drawer.module.scss` | modify | Wider grid for 5-column per-split layout + new column classes |
| `app/(new-layout)/races/[race]/race-commentary-drawer-host.tsx` | new | Owns `LiveDataMap`, `currentlyViewing`, `manualSelectionTick`. Subscribes to live websocket filtered to race participants. Provides `RaceLiveContext` with `focusUser(user)`. Renders `<CommentaryDrawer>`. |
| `app/(new-layout)/races/[race]/race-view.tsx` | modify | Wraps render tree in `<CommentaryDrawerProvider>` + `<RaceCommentaryDrawerHost>`. |
| `app/(new-layout)/races/[race]/race-participant-detail.tsx` | modify | Click handler also calls `focusUser` from `RaceLiveContext` when participant has `liveData`. Visual cue extended to live (non-streaming) participants. |

The host file owns both the `RaceLiveContext` and the state — keeping them colocated makes the data flow obvious at one glance and avoids a separate context file with no other purpose.

---

## Task 1: Add total + segment time to Run tab per-split rows

**Files:**
- Modify: `src/components/live/commentary-drawer/tabs/run-tab.tsx`
- Modify: `src/components/live/commentary-drawer/commentary-drawer.module.scss:1151-1158` (grid column count) and add 2 new classes after `.deltaBarLabelText`

This task is fully independent of the race-detail wiring. Ship it first.

- [ ] **Step 1: Update the SCSS grid + add 2 new column classes**

In `src/components/live/commentary-drawer/commentary-drawer.module.scss`, change `.deltaBarRow`'s grid template and add two new classes after `.deltaBarLabelText`.

Find:

```scss
.deltaBarRow {
    display: grid;
    grid-template-columns: minmax(0, 9rem) 1fr 4rem;
    align-items: center;
    gap: 0.6rem;
    padding: 0.25rem 0;
    font-size: 0.78rem;
}
```

Replace with:

```scss
.deltaBarRow {
    display: grid;
    grid-template-columns: minmax(0, 9rem) 4.5rem 4.5rem 1fr 4rem;
    align-items: center;
    gap: 0.6rem;
    padding: 0.25rem 0;
    font-size: 0.78rem;
}
```

Then, immediately after the existing `.deltaBarLabelText { … }` block (around line 1173), insert:

```scss
.deltaBarTime {
    font-family: var(--bs-font-monospace);
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--bs-secondary-color);
    font-size: 0.74rem;
    white-space: nowrap;
}
```

- [ ] **Step 2: Update `DeltaBar` to render two extra cells**

Open `src/components/live/commentary-drawer/tabs/run-tab.tsx`. Find the `DeltaBarProps` interface and `DeltaBar` component (around lines 12–79).

Replace:

```typescript
interface DeltaBarProps {
    label: string;
    deltaMs: number | null;
    maxAbs: number;
    isGold: boolean;
    isActive: boolean;
}

const DeltaBar = ({
    label,
    deltaMs,
    maxAbs,
    isGold,
    isActive,
}: DeltaBarProps) => {
```

With:

```typescript
interface DeltaBarProps {
    label: string;
    totalMs: number | null;
    segmentMs: number | null;
    deltaMs: number | null;
    maxAbs: number;
    isGold: boolean;
    isActive: boolean;
}

const DeltaBar = ({
    label,
    totalMs,
    segmentMs,
    deltaMs,
    maxAbs,
    isGold,
    isActive,
}: DeltaBarProps) => {
```

Then, inside the returned JSX, immediately after the closing `</span>` of `.deltaBarLabelText` and before the `<div className={styles.deltaBarTrack}>…</div>`, insert two cells:

```tsx
<span className={styles.deltaBarTime}>{formatTimeMs(totalMs)}</span>
<span className={styles.deltaBarTime}>{formatTimeMs(segmentMs)}</span>
```

The full final return becomes:

```tsx
return (
    <div
        className={clsx(
            styles.deltaBarRow,
            isActive && styles.deltaBarRowActive,
        )}
    >
        <span className={styles.deltaBarLabelText} title={label}>
            {label}
        </span>
        <span className={styles.deltaBarTime}>{formatTimeMs(totalMs)}</span>
        <span className={styles.deltaBarTime}>{formatTimeMs(segmentMs)}</span>
        <div className={styles.deltaBarTrack}>
            <div className={styles.deltaBarCenter} />
            {pct > 0 && (
                <div
                    className={clsx(
                        styles.deltaBarFill,
                        fillKind === 'ahead' && styles.deltaBarFillAhead,
                        fillKind === 'behind' && styles.deltaBarFillBehind,
                        fillKind === 'gold' && styles.deltaBarFillGold,
                    )}
                    style={{ width: `${pct}%` }}
                />
            )}
        </div>
        <span
            className={clsx(
                styles.deltaBarValue,
                fillKind === 'ahead' && styles.toneAhead,
                fillKind === 'behind' && styles.toneBehind,
                fillKind === 'gold' && styles.toneNeutral,
            )}
        >
            {deltaMs == null ? '—' : d.text}
        </span>
    </div>
);
```

`formatTimeMs` is already imported at the top of the file. `formatTimeMs` already returns `'—'` for null/NaN/≤0.

- [ ] **Step 3: Pass totalMs + segmentMs from `RunTab`'s splitDeltas mapping**

Find the `RunTab` component's `splitDeltas` block (around line 1228-1265). It already computes `singleNow`. We need to also surface the cumulative `splitTime` and the segment time alongside the delta. Update the `.map()` to return them.

Find:

```typescript
return { s, i, singleDelta, isGold };
```

Replace with:

```typescript
return {
    s,
    i,
    singleDelta,
    singleNow,
    totalNow: s.splitTime ?? null,
    isGold,
};
```

Then find the JSX that renders the bars (around line 1332):

```tsx
{splitDeltas.map((d) => (
    <DeltaBar
        key={d.i}
        label={d.s.name || `Split ${d.i + 1}`}
        deltaMs={d.singleDelta}
        maxAbs={maxAbsSingle}
        isGold={d.isGold}
        isActive={d.i === selectedIndex}
    />
))}
```

Replace with:

```tsx
{splitDeltas.map((d) => (
    <DeltaBar
        key={d.i}
        label={d.s.name || `Split ${d.i + 1}`}
        totalMs={d.totalNow}
        segmentMs={d.singleNow}
        deltaMs={d.singleDelta}
        maxAbs={maxAbsSingle}
        isGold={d.isGold}
        isActive={d.i === selectedIndex}
    />
))}
```

- [ ] **Step 4: Type-check + lint**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both pass cleanly. If `lint` reports import order or formatting issues in files we touched, run `npm run lint-fix` and re-run `npm run lint` until clean.

- [ ] **Step 5: Visual check via dev server**

Run:

```bash
npm run dev
```

Open `http://localhost:3000/live`. If a runner is live and has a few completed splits, click them, open the commentary drawer, switch to the "Run" tab, scroll down to the "Per-split (single time vs PB)" section. Confirm each completed split row now has, left-to-right: name · cumulative split time · segment time · delta bar · delta value. Active / future rows still show `—` for total/segment when there's no `splitTime`. Gold styling on bar + value is unchanged.

If no live runner is available, this will be re-verified in Task 4's end-to-end check.

- [ ] **Step 6: Commit**

```bash
git add src/components/live/commentary-drawer/tabs/run-tab.tsx src/components/live/commentary-drawer/commentary-drawer.module.scss
git commit -m "feat(commentary-drawer): show split total + segment time in Run tab per-split rows"
```

---

## Task 2: Create `RaceCommentaryDrawerHost` with `RaceLiveContext`

**Files:**
- Create: `app/(new-layout)/races/[race]/race-commentary-drawer-host.tsx`

This task introduces the new host but does not yet wire it into the page. End-of-task verification is just typecheck + lint, since nothing renders the host yet.

- [ ] **Step 1: Create the host file**

Create `app/(new-layout)/races/[race]/race-commentary-drawer-host.tsx` with this content:

```tsx
'use client';

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import {
    type LiveDataMap,
    type LiveRun,
} from '~app/(new-layout)/live/live.types';
import { type Race } from '~app/(new-layout)/races/races.types';
import { CommentaryDrawer } from '~src/components/live/commentary-drawer/commentary-drawer';
import {
    CommentaryDrawerProvider,
    useCommentaryDrawerContext,
} from '~src/components/live/commentary-drawer/commentary-drawer-context';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';

interface RaceLiveContextValue {
    focusUser: (user: string) => Promise<void>;
}

const RaceLiveContext = createContext<RaceLiveContextValue>({
    focusUser: async () => {
        /* no-op when used outside the provider */
    },
});

export const useRaceLiveContext = () => useContext(RaceLiveContext);

const resolveLiveRun = (raw: unknown): LiveRun | undefined => {
    if (!raw) return undefined;
    if (Array.isArray(raw)) return raw[0] as LiveRun | undefined;
    return raw as LiveRun;
};

const InnerHost = ({
    race,
    children,
}: {
    race: Race;
    children: ReactNode;
}) => {
    const [liveDataMap, setLiveDataMap] = useState<LiveDataMap>({});
    const [currentlyViewing, setCurrentlyViewing] = useState<string>('');
    const [manualSelectionTick, setManualSelectionTick] = useState(0);
    const lastMessage = useLiveRunsWebsocket();
    const drawerCtx = useCommentaryDrawerContext();

    // Filter websocket messages to runners we're already tracking AND who
    // are participants in this race. Functional setState avoids stale-closure
    // bugs around liveDataMap.
    useEffect(() => {
        if (!lastMessage) return;
        const participantUsers = new Set(
            (race.participants ?? []).map((p) => p.user),
        );
        if (!participantUsers.has(lastMessage.user)) return;

        if (lastMessage.type === 'UPDATE') {
            setLiveDataMap((prev) => {
                if (!prev[lastMessage.user]) return prev;
                return { ...prev, [lastMessage.user]: lastMessage.run };
            });
        } else if (lastMessage.type === 'DELETE') {
            setLiveDataMap((prev) => {
                if (!prev[lastMessage.user]) return prev;
                const next = { ...prev };
                delete next[lastMessage.user];
                return next;
            });
        }
    }, [lastMessage, race.participants]);

    const focusUser = useCallback(
        async (user: string) => {
            const existing = liveDataMap[user];
            let run: LiveRun | undefined = existing;
            if (!run || run.isMinified) {
                const fetched = await getLiveRunForUser(user);
                run = resolveLiveRun(fetched);
                if (!run) return;
                setLiveDataMap((prev) => ({ ...prev, [user]: run! }));
            }
            setCurrentlyViewing(user);
            setManualSelectionTick((n) => n + 1);
            drawerCtx.setOpen(true);
        },
        [liveDataMap, drawerCtx],
    );

    return (
        <RaceLiveContext.Provider value={{ focusUser }}>
            {children}
            {currentlyViewing && (
                <CommentaryDrawer
                    liveDataMap={liveDataMap}
                    currentlyViewing={currentlyViewing}
                    manualSelectionTick={manualSelectionTick}
                />
            )}
        </RaceLiveContext.Provider>
    );
};

export const RaceCommentaryDrawerHost = ({
    race,
    children,
}: {
    race: Race;
    children: ReactNode;
}) => {
    return (
        <CommentaryDrawerProvider>
            <InnerHost race={race}>{children}</InnerHost>
        </CommentaryDrawerProvider>
    );
};
```

Notes:
- `RaceCommentaryDrawerHost` is the consumer-facing wrapper — it provides both the `CommentaryDrawerProvider` (for open state) and the inner state. Race-view only mounts this once.
- `useCommentaryDrawerContext` falls back to a no-op when used outside the provider, so the inner host's hook works even before the wrapper mounts (during SSR hydration).
- The websocket effect runs only when `lastMessage` or `race.participants` change. Functional `setLiveDataMap` and the `prev[user]` short-circuit keep the effect cheap.
- We don't preload any runner. The first `focusUser(user)` call lazily fetches.
- `getLiveRunForUser` returns either a single object, `undefined`, or (per the implementation) potentially an array. `resolveLiveRun` handles all three.
- `currentlyViewing` empty string suppresses drawer mount, which avoids rendering "Run ended" before the user has clicked anything.

- [ ] **Step 2: Type-check + lint**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both pass. The new file has no other consumers yet, so any errors are local.

- [ ] **Step 3: Commit**

```bash
git add app/\(new-layout\)/races/\[race\]/race-commentary-drawer-host.tsx
git commit -m "feat(races): add RaceCommentaryDrawerHost with lazy LiveDataMap + websocket"
```

---

## Task 3: Mount the host in `race-view.tsx`

**Files:**
- Modify: `app/(new-layout)/races/[race]/race-view.tsx`

This task wires the new host into the race detail page tree. After this task, the drawer is reachable but the click handler hasn't been updated yet, so nothing opens it.

- [ ] **Step 1: Add the import**

In `app/(new-layout)/races/[race]/race-view.tsx`, add this import alongside the other imports from the same directory (around line 1-29):

```typescript
import { RaceCommentaryDrawerHost } from '~app/(new-layout)/races/[race]/race-commentary-drawer-host';
```

- [ ] **Step 2: Wrap the page tree**

Find the existing return value (starts at the line `return (`, around line 70). It currently returns:

```tsx
return (
    <>
        <Breadcrumb breadcrumbs={breadcrumbs} />
        <Row>
            …
        </Row>
    </>
);
```

Wrap the entire fragment contents in `<RaceCommentaryDrawerHost race={raceState}>`:

```tsx
return (
    <RaceCommentaryDrawerHost race={raceState}>
        <Breadcrumb breadcrumbs={breadcrumbs} />
        <Row>
            …
        </Row>
    </RaceCommentaryDrawerHost>
);
```

The fragment `<>` wrapper can be removed — `RaceCommentaryDrawerHost` is the new top-level wrapper. Keep all the `<Row>` / `<Col>` content inside untouched.

- [ ] **Step 3: Type-check + lint**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add app/\(new-layout\)/races/\[race\]/race-view.tsx
git commit -m "feat(races): mount RaceCommentaryDrawerHost in race detail page"
```

---

## Task 4: Update participant click handler to focus the drawer

**Files:**
- Modify: `app/(new-layout)/races/[race]/race-participant-detail.tsx`

After this task, the feature is fully functional end-to-end.

- [ ] **Step 1: Import the context hook**

In `app/(new-layout)/races/[race]/race-participant-detail.tsx`, add this import after the other `~app/(new-layout)/races/[race]/…` imports near the top:

```typescript
import { useRaceLiveContext } from '~app/(new-layout)/races/[race]/race-commentary-drawer-host';
```

- [ ] **Step 2: Use the context inside `RaceParticipantDetailPagination`**

Find `RaceParticipantDetailPagination` (around line 34). At the top of the component body, add the hook call:

```typescript
const RaceParticipantDetailPagination = ({
    race,
    setStream,
}: RaceParticipantDetailProps) => {
    const participants = race.participants as RaceParticipantWithLiveData[];
    const raceLiveCtx = useRaceLiveContext();

    const [parent] = useAutoAnimate({
        duration: 300,
        easing: 'ease-out',
    });
    …
```

- [ ] **Step 3: Update the `onClick` handler to also focus the drawer**

Inside the same component, find the `<Col onClick={…}>`:

```tsx
<Col
    key={participant.user}
    onClick={() => {
        if (
            participant.liveData &&
            participant.liveData.streaming
        ) {
            setStream(participant.user);
        }
    }}
>
```

Replace with:

```tsx
<Col
    key={participant.user}
    onClick={() => {
        if (participant.liveData?.streaming) {
            setStream(participant.user);
        }
        if (participant.liveData) {
            raceLiveCtx.focusUser(participant.user);
        }
    }}
>
```

Click semantics now match the spec table:

| Participant state | Click does |
|---|---|
| Streaming + has liveData | swap stream + focus drawer (open if closed) |
| Has liveData, not streaming | focus drawer (open if closed) |
| Streaming, no liveData | swap stream only (existing) |
| Neither | nothing |

- [ ] **Step 4: Extend the "clickable" visual cue to non-streaming live participants**

The card uses `styles.participantCardStreaming` to communicate clickability. Currently it's only applied when `liveData.streaming` is truthy. Extend it to participants with any `liveData` so users see they can click them.

Find the `RaceParticipantDetailView` component's outer `<div>` (around line 93):

```tsx
<div
    className={`${styles.participantCard} ${
        isHighlighted ? styles.participantCardHighlighted : ''
    } ${
        participant.liveData && participant.liveData.streaming
            ? styles.participantCardStreaming
            : ''
    }`}
    style={
        teamColor ? { borderLeft: `3px solid ${teamColor}` } : undefined
    }
>
```

Replace with:

```tsx
<div
    className={`${styles.participantCard} ${
        isHighlighted ? styles.participantCardHighlighted : ''
    } ${
        participant.liveData ? styles.participantCardStreaming : ''
    }`}
    style={
        teamColor ? { borderLeft: `3px solid ${teamColor}` } : undefined
    }
>
```

The class name is a slight misnomer now (it covers all clickable participants, not just streaming) but renaming the style class is out of scope and would balloon a small change.

- [ ] **Step 5: Type-check + lint**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 6: End-to-end visual check**

Run:

```bash
npm run dev
```

Find a race that's currently in progress with at least one participant submitting live data. (Check `/races` for `IN PROGRESS` races, or create one and have someone submit.)

On the race detail page:

1. Click a participant whose card is highlighted (has live data).
2. Verify the drawer slides in from the side and shows that runner's name + game.
3. Switch through tabs: Split, Run, Predictions, Story, Career. Each should render without errors.
4. On Run tab, scroll to "Per-split (single time vs PB)" — confirm rows show name · total · segment · bar · delta (Task 1's payoff).
5. Click a different participant with live data. Drawer focus should switch.
6. Pin the drawer (pin icon, top-right of drawer). Click a different participant. The drawer stays on the pinned runner; the right-column stream still swaps.
7. Click a non-streaming participant with live data: drawer focuses on them; stream does not change. Click a streaming participant: both happen.
8. Close the drawer (X icon). Confirm clicking a participant opens it again.

If any of these fail, fix and re-verify before committing.

- [ ] **Step 7: Commit**

```bash
git add app/\(new-layout\)/races/\[race\]/race-participant-detail.tsx
git commit -m "feat(races): open commentary drawer on participant click"
```

---

## Self-review checklist

Before considering the plan complete:

- **Spec coverage:**
  - Race-side host owning LiveDataMap + websocket → Task 2
  - Wiring into race-view → Task 3
  - Click semantics (stream + drawer) → Task 4 step 3
  - Visual cue for non-streaming live participants → Task 4 step 4
  - Run tab total + segment columns → Task 1
  - "Out of scope" items (no new tabs, no /live changes, no stale auto-swap, no preloading, no gating) → not introduced anywhere ✓

- **Placeholders:** none. All code blocks contain complete, copyable code.

- **Type consistency:**
  - `focusUser` signature `(user: string) => Promise<void>` is identical in Task 2 (definition) and Task 4 (consumer).
  - `RaceCommentaryDrawerHost` props are `{ race: Race; children: ReactNode }` in Task 2 and matched in Task 3.
  - `DeltaBarProps` adds `totalMs` + `segmentMs` (Task 1 step 2) and is consumed at the call site (Task 1 step 3) with the same names.
  - The `splitDeltas` shape is updated coherently — `singleNow` was already an intermediate variable; we surface it via the returned object so the call site can pass it.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-10-race-detail-live-drawer.md`.
