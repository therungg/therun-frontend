# Live Page Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add filtering capabilities to the live runs page with toggle buttons for Live on Twitch, Ongoing runs, and PB Pace.

**Architecture:** Add FilterState type and filtering utilities, create FilterControl component with pill-shaped toggle buttons, integrate into Live component with URL param persistence.

**Tech Stack:** React 19, TypeScript, Next.js 16 App Router, React Bootstrap

---

## Task 1: Add FilterState type definition

**Files:**
- Modify: `app/(old-layout)/live/live.types.ts:88` (after SortOption export)

**Step 1: Add FilterState interface**

Add the FilterState interface after the SortOption type:

```typescript
export interface FilterState {
    liveOnTwitch: boolean;
    ongoing: boolean;
    pbPace: boolean;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add app/(old-layout)/live/live.types.ts
git commit -m "feat: add FilterState type for live page filtering"
```

---

## Task 2: Add filtering utility functions

**Files:**
- Modify: `app/(old-layout)/live/utilities.ts:139` (end of file)

**Step 1: Add filterLiveRuns function**

Add at the end of utilities.ts:

```typescript
export const filterLiveRuns = (
    liveRun: LiveRun,
    filters: FilterState,
): boolean => {
    // If no filters are active, show all runs
    if (!filters.liveOnTwitch && !filters.ongoing && !filters.pbPace) {
        return true;
    }

    // Live on Twitch filter
    if (filters.liveOnTwitch) {
        if (!liveRun.currentlyStreaming) {
            return false;
        }
    }

    // Ongoing filter (not reset and not finished)
    if (filters.ongoing) {
        if (liveRun.hasReset || liveRun.endedAt) {
            return false;
        }
    }

    // PB Pace filter (negative delta means ahead of PB)
    if (filters.pbPace) {
        // Exclude runs without delta or PB data
        if (
            liveRun.delta === null ||
            liveRun.delta === undefined ||
            liveRun.pb === null ||
            liveRun.pb === undefined
        ) {
            return false;
        }
        if (liveRun.delta >= 0) {
            return false;
        }
    }

    return true;
};
```

**Step 2: Add URL param parsing function**

Add after filterLiveRuns:

```typescript
export const parseFilterParams = (searchParams: string): FilterState => {
    const params = new URLSearchParams(searchParams);
    const filtersParam = params.get('filters');

    if (!filtersParam) {
        return { liveOnTwitch: false, ongoing: false, pbPace: false };
    }

    const filterArray = filtersParam.split(',');

    return {
        liveOnTwitch: filterArray.includes('live'),
        ongoing: filterArray.includes('ongoing'),
        pbPace: filterArray.includes('pbpace'),
    };
};
```

**Step 3: Add URL param serialization function**

Add after parseFilterParams:

```typescript
export const serializeFilterParams = (filters: FilterState): string => {
    const activeFilters: string[] = [];

    if (filters.liveOnTwitch) activeFilters.push('live');
    if (filters.ongoing) activeFilters.push('ongoing');
    if (filters.pbPace) activeFilters.push('pbpace');

    return activeFilters.length > 0 ? activeFilters.join(',') : '';
};
```

**Step 4: Update imports at top of file**

Update the import statement at line 1 to include FilterState:

```typescript
import {
    LiveDataMap,
    LiveRun,
    SortOption,
    WebsocketLiveRunMessage,
    FilterState,
} from '~app/(old-layout)/live/live.types';
```

**Step 5: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 6: Commit**

```bash
git add app/(old-layout)/live/utilities.ts
git commit -m "feat: add filtering utility functions for live runs"
```

---

## Task 3: Create FilterControl component

**Files:**
- Create: `app/(old-layout)/live/filter-control.tsx`

**Step 1: Create FilterControl component file**

Create new file with the following content:

```typescript
'use client';
import React from 'react';
import { FilterState } from '~app/(old-layout)/live/live.types';

interface FilterControlProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
}

interface FilterButton {
    key: keyof FilterState;
    label: string;
    color: string;
    ariaLabel: string;
}

export const FilterControl = ({ filters, onChange }: FilterControlProps) => {
    const filterButtons: FilterButton[] = [
        {
            key: 'liveOnTwitch',
            label: '🔴 Live',
            color: '#dc3545',
            ariaLabel: 'Filter by live on Twitch',
        },
        {
            key: 'ongoing',
            label: '▶️ Ongoing',
            color: '#0d6efd',
            ariaLabel: 'Filter by ongoing runs',
        },
        {
            key: 'pbPace',
            label: '⚡ PB Pace',
            color: '#198754',
            ariaLabel: 'Filter by runs ahead of personal best',
        },
    ];

    const toggleFilter = (key: keyof FilterState) => {
        onChange({
            ...filters,
            [key]: !filters[key],
        });
    };

    const handleKeyDown = (
        e: React.KeyboardEvent,
        key: keyof FilterState,
    ) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleFilter(key);
        }
    };

    return (
        <div className="d-flex flex-wrap align-items-center gap-2">
            {filterButtons.map((button) => {
                const isActive = filters[button.key];
                return (
                    <button
                        key={button.key}
                        type="button"
                        onClick={() => toggleFilter(button.key)}
                        onKeyDown={(e) => handleKeyDown(e, button.key)}
                        aria-pressed={isActive}
                        aria-label={button.ariaLabel}
                        className="border"
                        style={{
                            height: '32px',
                            borderRadius: '16px',
                            padding: '0 16px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: isActive
                                ? button.color
                                : 'transparent',
                            color: isActive
                                ? 'white'
                                : 'var(--bs-body-color)',
                            borderColor: isActive
                                ? button.color
                                : 'var(--bs-border-color)',
                            outline: 'none',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        {button.label}
                    </button>
                );
            })}
        </div>
    );
};
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add app/(old-layout)/live/filter-control.tsx
git commit -m "feat: create FilterControl component with toggle buttons"
```

---

## Task 4: Integrate FilterControl into Live component

**Files:**
- Modify: `app/(old-layout)/live/live.tsx`

**Step 1: Add FilterControl import**

Add to imports at top of file (after line 11):

```typescript
import { FilterControl } from '~app/(old-layout)/live/filter-control';
```

**Step 2: Update imports from live.types**

Update the import at lines 6-10 to include FilterState:

```typescript
import {
    LiveDataMap,
    LiveProps,
    SortOption,
    FilterState,
} from '~app/(old-layout)/live/live.types';
```

**Step 3: Update imports from utilities**

Update the import at lines 12-18 to include filter functions:

```typescript
import {
    getRecommendedStream,
    isWebsocketDataProcessable,
    liveRunArrayToMap,
    liveRunIsInSearch,
    sortLiveRuns,
    filterLiveRuns,
    parseFilterParams,
    serializeFilterParams,
} from '~app/(old-layout)/live/utilities';
```

**Step 4: Add filters state**

Add after the sortOption state (line 34):

```typescript
    const [filters, setFilters] = useState<FilterState>({
        liveOnTwitch: false,
        ongoing: false,
        pbPace: false,
    });
```

**Step 5: Add useEffect for URL param sync on mount**

Add after the currentlyViewing useEffect (around line 100):

```typescript
    // Sync filters from URL params on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const parsedFilters = parseFilterParams(window.location.search);
        setFilters(parsedFilters);
    }, []);

    // Update URL when filters change
    useEffect(() => {
        const serialized = serializeFilterParams(filters);
        const params = new URLSearchParams(window.location.search);

        if (serialized) {
            params.set('filters', serialized);
        } else {
            params.delete('filters');
        }

        const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;

        window.history.replaceState({}, '', newUrl);
    }, [filters]);
```

**Step 6: Add FilterControl to controls bar**

Replace the comment at line 186 with the FilterControl component:

```typescript
                        <FilterControl
                            filters={filters}
                            onChange={setFilters}
                        />
```

**Step 7: Apply filters in render**

Update the filter chain around lines 195-204. Replace the existing filter logic:

```typescript
                {Object.values(updatedLiveDataMap).length > 0 &&
                    Object.values(updatedLiveDataMap)
                        .filter((liveRun) => liveRunIsInSearch(liveRun, search))
                        .filter((liveRun) => filterLiveRuns(liveRun, filters))
                        .length == 0 && (
                        <div>
                            No runs matched your search
                            {(filters.liveOnTwitch ||
                                filters.ongoing ||
                                filters.pbPace) &&
                                ' and filters'}
                            !
                        </div>
                    )}

                {sortLiveRuns(
                    Object.values(updatedLiveDataMap)
                        .filter((liveRun) => liveRunIsInSearch(liveRun, search))
                        .filter((liveRun) => filterLiveRuns(liveRun, filters)),
                    sortOption,
                ).map((liveRun) => {
```

**Step 8: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 9: Test in development server**

Run: `npm run dev`
Navigate to: `http://localhost:3000/live`
Expected:
- Filter buttons appear after search input
- Clicking toggles change button appearance
- Filters actually filter the runs
- URL updates with `?filters=live,ongoing,pbpace` when filters are active

**Step 10: Commit**

```bash
git add app/(old-layout)/live/live.tsx
git commit -m "feat: integrate FilterControl into live page with URL persistence"
```

---

## Task 5: Test filtering logic manually

**Files:**
- Test: Manual testing in browser

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test Live on Twitch filter**

Navigate to: `http://localhost:3000/live`
Actions:
1. Click "🔴 Live" button
2. Verify only runs with streaming indicator show
3. Check URL contains `?filters=live`

**Step 3: Test Ongoing filter**

Actions:
1. Click "▶️ Ongoing" button
2. Verify reset/finished runs are hidden
3. Check URL contains `?filters=ongoing` or appends to existing

**Step 4: Test PB Pace filter**

Actions:
1. Click "⚡ PB Pace" button
2. Verify only runs ahead of PB show
3. Check URL contains `?filters=pbpace` or appends to existing

**Step 5: Test combined filters**

Actions:
1. Activate all three filters
2. Verify runs must match all criteria
3. Check URL contains `?filters=live,ongoing,pbpace`

**Step 6: Test URL persistence**

Actions:
1. Activate some filters
2. Copy URL from browser
3. Open URL in new tab
4. Verify filters are active on load

**Step 7: Test filter + search combo**

Actions:
1. Enter search term
2. Activate filters
3. Verify both search and filters apply
4. Verify empty state message mentions both

**Step 8: Test filter toggle off**

Actions:
1. Activate a filter
2. Click same button to deactivate
3. Verify runs reappear
4. Verify URL updates (removes that filter)

---

## Task 6: Final polish and documentation

**Files:**
- Modify: `docs/plans/2026-02-02-live-page-filtering-design.md:4`

**Step 1: Update design doc status**

Change status from "Approved" to "Implemented":

```markdown
**Status:** Implemented
```

**Step 2: Run linter**

Run: `npm run lint-fix`
Expected: Auto-fixes any style issues

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: No type errors

**Step 4: Stop dev server**

Run: `pkill -f "next dev"`
Expected: Development server stops

**Step 5: Final commit**

```bash
git add docs/plans/2026-02-02-live-page-filtering-design.md
git commit -m "docs: mark live page filtering design as implemented"
```

**Step 6: Verify all commits**

Run: `git log --oneline -6`
Expected: See all 6 commits for this feature

---

## Success Criteria

- [ ] Three filter toggle buttons appear in controls bar
- [ ] Filters work individually and in combination
- [ ] Filter state persists to URL params
- [ ] URL params restore filter state on page load
- [ ] Empty state messages mention filters when active
- [ ] All TypeScript types are correct
- [ ] No linter errors
- [ ] Filters work with search functionality
- [ ] Accessible keyboard navigation works
- [ ] Visual states (active/inactive/hover) work correctly

## Notes

- This is a client-side only feature (no API changes)
- Filters apply after search in the filter chain
- URL params use comma-separated format for cleanliness
- React Compiler will auto-memoize the FilterControl component
