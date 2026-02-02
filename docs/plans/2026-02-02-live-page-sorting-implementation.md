# Live Page Custom Sorting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add custom sorting controls to the live runs page (importance, runtime, runner, game, delta to PB)

**Architecture:** Extract sorting logic from `liveRunArrayToMap` into dedicated `sortLiveRuns` function. Add segmented control UI component above search bar. Apply sorting in Live component render for automatic re-sorting on WebSocket updates.

**Tech Stack:** React 19, TypeScript, Bootstrap 5, Next.js 16 App Router

---

## Task 1: Add SortOption Type Definition

**Files:**
- Modify: `app/(old-layout)/live/live.types.ts`

**Step 1: Add SortOption type export**

Add this type export at the end of the file (after line 86):

```typescript
export type SortOption = 'importance' | 'runtime' | 'runner' | 'game' | 'delta';
```

**Step 2: Verify TypeScript accepts the type**

Run: `npm run typecheck`
Expected: No new errors (existing errors are pre-existing)

**Step 3: Commit**

```bash
git add app/(old-layout)/live/live.types.ts
git commit -m "feat: add SortOption type for live page sorting"
```

---

## Task 2: Add sortLiveRuns Utility Function

**Files:**
- Modify: `app/(old-layout)/live/utilities.ts`

**Step 1: Import SortOption type**

Add to imports at the top of the file (after line 4):

```typescript
import {
    LiveDataMap,
    LiveRun,
    WebsocketLiveRunMessage,
    SortOption,
} from '~app/(old-layout)/live/live.types';
```

**Step 2: Add sortLiveRuns function**

Add this function at the end of the file (after line 106):

```typescript
export const sortLiveRuns = (
    liveRuns: LiveRun[],
    sortOption: SortOption,
): LiveRun[] => {
    return [...liveRuns].sort((a, b) => {
        switch (sortOption) {
            case 'importance':
                return b.importance - a.importance; // High to low

            case 'runtime':
                return b.currentTime - a.currentTime; // Long to short

            case 'runner':
                return a.user.localeCompare(b.user); // A to Z

            case 'game':
                return a.game.localeCompare(b.game); // A to Z

            case 'delta':
                // Most negative first (furthest ahead of PB)
                const deltaA = a.delta ?? Infinity;
                const deltaB = b.delta ?? Infinity;
                return deltaA - deltaB;

            default:
                return 0;
        }
    });
};
```

**Step 3: Verify TypeScript accepts the function**

Run: `npm run typecheck`
Expected: No new errors

**Step 4: Commit**

```bash
git add app/(old-layout)/live/utilities.ts
git commit -m "feat: add sortLiveRuns utility function with all sort options"
```

---

## Task 3: Create SortControl Component

**Files:**
- Create: `app/(old-layout)/live/sort-control.tsx`

**Step 1: Create the component file**

Create new file with this content:

```typescript
'use client';
import React from 'react';
import { SortOption } from '~app/(old-layout)/live/live.types';

interface SortControlProps {
    value: SortOption;
    onChange: (option: SortOption) => void;
}

export const SortControl = ({ value, onChange }: SortControlProps) => {
    const options = [
        { value: 'importance' as const, label: 'Importance' },
        { value: 'runtime' as const, label: 'Run Time' },
        { value: 'runner' as const, label: 'Runner' },
        { value: 'game' as const, label: 'Game' },
        { value: 'delta' as const, label: 'Delta to PB' },
    ];

    return (
        <div className="d-flex align-items-center gap-2">
            <span className="text-muted">Sort by:</span>
            <div className="btn-group" role="group">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className={`btn ${value === option.value ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
```

**Step 2: Verify TypeScript accepts the component**

Run: `npm run typecheck`
Expected: No new errors

**Step 3: Commit**

```bash
git add app/(old-layout)/live/sort-control.tsx
git commit -m "feat: add SortControl segmented button component"
```

---

## Task 4: Integrate Sorting into Live Component

**Files:**
- Modify: `app/(old-layout)/live/live.tsx`

**Step 1: Add imports**

Update the imports at the top of the file. Change line 6 to include SortOption and add sortLiveRuns to the utilities import (modify lines 6-12):

```typescript
import { LiveDataMap, LiveProps, SortOption } from '~app/(old-layout)/live/live.types';
import {
    getRecommendedStream,
    isWebsocketDataProcessable,
    liveRunArrayToMap,
    liveRunIsInSearch,
    sortLiveRuns,
} from '~app/(old-layout)/live/utilities';
```

And add the SortControl import after line 12:

```typescript
import { SortControl } from '~app/(old-layout)/live/sort-control';
```

**Step 2: Add sortOption state**

Add state after the search state (after line 27):

```typescript
    const [sortOption, setSortOption] = useState<SortOption>('importance');
```

**Step 3: Add SortControl UI component**

Add the controls row after line 115 (after the title/button row, before the loading skeleton):

```typescript
            <Row className="g-3 mb-3">
                <Col>
                    <SortControl value={sortOption} onChange={setSortOption} />
                </Col>
            </Row>
```

**Step 4: Apply sorting to the render**

Replace lines 162-164 with the sorted version:

```typescript
                {sortLiveRuns(
                    Object.values(updatedLiveDataMap).filter((liveRun) =>
                        liveRunIsInSearch(liveRun, search),
                    ),
                    sortOption,
                ).map((liveRun) => {
```

**Step 5: Verify TypeScript accepts the changes**

Run: `npm run typecheck`
Expected: No new errors

**Step 6: Test the implementation**

Run: `npm run dev`

1. Navigate to `/live` in browser
2. Verify "Sort by:" control appears above search bar
3. Verify "Importance" button is active by default
4. Click each sort button and verify:
   - Button becomes active (primary color)
   - Previous button becomes inactive (outline)
   - Live runs re-sort appropriately
5. Test search filter works with sorting
6. Verify WebSocket updates maintain sort order

Expected: All sorting options work correctly, UI is responsive

**Step 7: Stop dev server**

Run: `pkill -f "next dev"`

**Step 8: Commit**

```bash
git add app/(old-layout)/live/live.tsx
git commit -m "feat: integrate sorting controls into Live component

- Add sortOption state defaulting to 'importance'
- Add SortControl component above search bar
- Apply sortLiveRuns in render for automatic re-sorting
- Sorting works with search filter and WebSocket updates

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Manual Testing Checklist

**Files:**
- None (testing only)

**Step 1: Start dev server and test all scenarios**

Run: `npm run dev`

Test cases:
1. **Default behavior**: Page loads with "Importance" selected and sorted correctly
2. **Sort by Runtime**: Longest runs appear first
3. **Sort by Runner**: Alphabetical A-Z by username
4. **Sort by Game**: Alphabetical A-Z by game name
5. **Sort by Delta to PB**: Most negative (furthest ahead) first, runs without PB at end
6. **Search integration**: Sorting applies to filtered results
7. **WebSocket updates**: New/updated runs automatically re-sort
8. **Mobile responsive**: Controls wrap properly on small screens
9. **Empty state**: Control visible when no runs exist
10. **No search results**: Control visible when search returns nothing

Expected: All test cases pass

**Step 2: Stop dev server**

Run: `pkill -f "next dev"`

**Step 3: Document completion**

Update design document status to "Implemented":

```bash
sed -i 's/Status: Design Complete/Status: Implemented/' docs/plans/2026-02-02-live-page-custom-sorting-design.md
git add docs/plans/2026-02-02-live-page-custom-sorting-design.md
git commit -m "docs: mark live page sorting as implemented"
```

---

## Completion Criteria

- [ ] SortOption type added to live.types.ts
- [ ] sortLiveRuns function added to utilities.ts
- [ ] SortControl component created and functional
- [ ] Live component integrates sorting with state and UI
- [ ] All 5 sort options work correctly
- [ ] Sorting works with search filter
- [ ] WebSocket updates maintain sort order
- [ ] Mobile responsive behavior verified
- [ ] All commits made with clear messages
- [ ] Design document marked as implemented

## Notes

- No test files needed (this is UI functionality, manual testing sufficient)
- Existing TypeScript errors are pre-existing, not related to this feature
- Future enhancement: Add "lock" button to freeze sort order
- Future enhancement: Add custom filters alongside sort controls
