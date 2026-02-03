# Live Page Custom Sorting - Design Document

**Date:** 2026-02-02
**Status:** Implemented
**Feature:** Add custom sorting options to the live runs page

## Overview

Add sorting controls to the live page allowing users to sort runs by:
- Importance (default, current behavior)
- Current run time (longest first)
- Runner name (A-Z)
- Game name (A-Z)
- Delta to PB (most negative first, furthest ahead)

## Requirements

- Segmented control UI (iOS-style button group)
- Placed above the search bar in dedicated controls section
- No persistence - always defaults to "Importance" on page load
- Fixed sort directions (no toggle)
- Automatic re-sorting when WebSocket updates arrive
- Runs with missing data (e.g., no PB for delta sort) appear at the end
- Future compatibility: "lock" feature to freeze sort order

## Architecture

### Component Structure

**State Management:**
Add `sortOption` state to the `Live` component:
```typescript
type SortOption = 'importance' | 'runtime' | 'runner' | 'game' | 'delta';
const [sortOption, setSortOption] = useState<SortOption>('importance');
```

**Sorting Logic Location:**
Extract sorting from `liveRunArrayToMap` into dedicated `sortLiveRuns` function in `utilities.ts`:
- `liveRunArrayToMap`: Converts array to map structure (keeps username formatting)
- `sortLiveRuns`: Handles all sorting logic based on selected option

This separation improves testability and allows re-sorting without map reconstruction.

## Implementation Details

### 1. Sorting Function (utilities.ts)

```typescript
export const sortLiveRuns = (
    liveRuns: LiveRun[],
    sortOption: SortOption
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

**Missing Data Handling:**
- Delta sort: Use `Infinity` when undefined, pushing runs without PB to end
- Other fields: All runs have required fields per LiveRun type

**Performance:**
- Shallow copy with spread operator prevents mutation
- Important for React re-rendering optimization

### 2. UI Component (SortControl.tsx)

New component in `app/(old-layout)/live/`:

```typescript
interface SortControlProps {
    value: SortOption;
    onChange: (option: SortOption) => void;
}

export const SortControl = ({ value, onChange }: SortControlProps) => {
    const options = [
        { value: 'importance', label: 'Importance' },
        { value: 'runtime', label: 'Run Time' },
        { value: 'runner', label: 'Runner' },
        { value: 'game', label: 'Game' },
        { value: 'delta', label: 'Delta to PB' },
    ];

    return (
        <div className="d-flex align-items-center gap-2">
            <span className="text-muted">Sort by:</span>
            <div className="btn-group" role="group">
                {options.map(option => (
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

**Styling:**
- Bootstrap's `btn-group` for segmented control base
- Active: `btn-primary`, Inactive: `btn-outline-primary`
- "Sort by:" label for clarity
- Wraps naturally on mobile

### 3. Integration (live.tsx)

**Add control** (after line 115, before search bar):
```typescript
<Row className="g-3 mb-3">
    <Col>
        <SortControl value={sortOption} onChange={setSortOption} />
    </Col>
</Row>
```

**Apply sorting** (modify lines 162-164):
```typescript
{sortLiveRuns(
    Object.values(updatedLiveDataMap).filter((liveRun) =>
        liveRunIsInSearch(liveRun, search)
    ),
    sortOption
).map((liveRun) => {
    // ... existing map logic
})}
```

### 4. Real-time Behavior

When WebSocket updates arrive (useEffect at line 35):
- Component re-renders with updated `updatedLiveDataMap`
- Sorting happens in render
- New/updated runs automatically sorted by current `sortOption`

### 5. Type Definitions

Add to `live.types.ts`:
```typescript
export type SortOption = 'importance' | 'runtime' | 'runner' | 'game' | 'delta';
```

## Mobile Responsiveness

Button group will wrap on smaller screens:
- Desktop: Single row
- Tablet: Single row (might be tight)
- Mobile: 2-3 rows (2-2-1 or 3-2 pattern)

Acceptable for a control used once per session. Can add responsive dropdown later if needed.

## Edge Cases

1. **Empty state**: Sort control visible but no effect (shows "nobody is running live")
2. **Search with no results**: Sort control remains visible, ready when search changes
3. **Finished runs**: `currentTime` represents total time, sorting still works
4. **Tie-breaking**: Identical values maintain insertion order (stable sort)

## Future Enhancements

**Lock Feature:**
Add lock icon button next to sort control to freeze current order. When locked:
- Store sorted array in state
- Skip `sortLiveRuns` call during renders
- Prevent automatic re-sorting from WebSocket updates

**Filter Compatibility:**
Controls row designed to grow horizontally:
```
[Sort by: buttons] [Filter controls] [Per-game filters]
```

## Files to Modify

- `app/(old-layout)/live/live.tsx` - Add sort state and integration
- `app/(old-layout)/live/utilities.ts` - Add `sortLiveRuns` function
- `app/(old-layout)/live/live.types.ts` - Add `SortOption` type
- `app/(old-layout)/live/sort-control.tsx` - New component file

## Testing Considerations

- Sort maintains order when switching between options
- WebSocket updates re-sort correctly
- Missing data (no PB) handled properly
- Search + sort work together
- Mobile wrapping doesn't break functionality
