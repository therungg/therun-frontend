# Fix Empty Column Drop Target - Design Document

**Date:** 2026-02-02
**Status:** Implemented
**Date Implemented:** 2026-02-02
**Type:** Bug Fix
**Related:** Configurable Frontpage Panels feature

## Problem

When all panels are moved to one column, the empty column becomes impossible to drop panels into. The empty column has no drop target because `SortableContext` has no items to render, soft-locking users from redistributing panels.

## Root Cause

Each column is a `SortableContext` containing only visible panels in that column. When a column becomes empty:
- `leftPanels` or `rightPanels` array is empty
- `SortableContext` has `items={[]}` (no droppable items)
- @dnd-kit has no drop target in that column
- Dragging panels over the empty column does nothing

## Solution: Droppable Column Containers

Make the column containers themselves droppable using @dnd-kit's `useDroppable` hook. This ensures columns remain valid drop targets even when empty.

### Implementation Overview

1. **Create DroppableColumn component** - Wraps each column with `useDroppable`
2. **Update handleDragEnd** - Detect column drops vs panel drops
3. **Handle empty column drops** - Place panel at order 0
4. **Handle non-empty column drops** - Append to end when dropped on container

## Component Architecture

### DroppableColumn Component

```typescript
interface DroppableColumnProps {
    columnId: 'left' | 'right';
    panels: Array<{ id: PanelId; order: number }>;
    children: ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
    columnId,
    panels,
    children,
}) => {
    const { setNodeRef } = useDroppable({
        id: `column-${columnId}`,
        data: { type: 'column', columnId },
    });

    return (
        <div ref={setNodeRef} className="col col-lg-6 col-xl-7 col-12">
            <SortableContext
                items={panels.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
            >
                {children}
            </SortableContext>
        </div>
    );
};
```

**Key Details:**
- Column IDs prefixed as `column-left`, `column-right` (prevents ID collision with panels)
- `data` prop stores metadata for handleDragEnd to identify column drops
- Droppable ref wraps entire column div, making it always hittable
- Empty columns still have droppable ref active

### Updated FrontpageLayout

Replace existing column divs with DroppableColumn components:

```typescript
<DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
    <div className="row d-flex flex-wrap">
        <DroppableColumn columnId="left" panels={leftPanels}>
            {leftPanels.map((panel) => (
                <DraggablePanel
                    key={panel.id}
                    id={panel.id}
                    onHide={() => handleHidePanel(panel.id)}
                    canHide={canHideMore}
                    isAuthenticated={isAuthenticated}
                >
                    {panels[panel.id]}
                </DraggablePanel>
            ))}
        </DroppableColumn>

        <DroppableColumn columnId="right" panels={rightPanels}>
            {rightPanels.map((panel) => (
                <DraggablePanel
                    key={panel.id}
                    id={panel.id}
                    onHide={() => handleHidePanel(panel.id)}
                    canHide={canHideMore}
                    isAuthenticated={isAuthenticated}
                >
                    {panels[panel.id]}
                </DraggablePanel>
            ))}
        </DroppableColumn>
    </div>
</DndContext>
```

## Drop Handling Logic

### Detecting Drop Target Type

Current code assumes `over.id` is always a panel ID. We need to handle two cases:

```typescript
const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as PanelId;
    const overId = over.id as string;

    // Check if dropped on a column container vs a panel
    const isColumnDrop = typeof overId === 'string' && overId.startsWith('column-');

    if (isColumnDrop) {
        handleColumnDrop(activeId, over.data.current?.columnId);
    } else {
        handlePanelDrop(activeId, overId as PanelId);
    }
};
```

### Case 1: Drop on Column Container

When dropped directly on a column (not on a specific panel):

```typescript
const handleColumnDrop = (panelId: PanelId, targetColumn: 'left' | 'right') => {
    const newPanels = [...config.panels];
    const panelIndex = newPanels.findIndex((p) => p.id === panelId);

    if (panelIndex === -1) return;

    // Move panel to target column
    newPanels[panelIndex] = {
        ...newPanels[panelIndex],
        column: targetColumn,
    };

    // Get all visible panels in target column
    const columnPanels = newPanels.filter(
        (p) => p.column === targetColumn && p.visible,
    );

    // Find max order, or -1 if empty
    const maxOrder =
        columnPanels.length > 0 ? Math.max(...columnPanels.map((p) => p.order)) : -1;

    // Place at end (or at 0 if column was empty)
    newPanels[panelIndex].order = maxOrder + 1;

    const newConfig = { panels: newPanels };
    setConfig(newConfig);
    saveConfig(newConfig);
};
```

**Logic:**
- Move panel to target column
- Calculate max order of visible panels in that column
- If empty (maxOrder = -1), new order becomes 0
- If not empty, append to end (maxOrder + 1)

### Case 2: Drop on Panel

This is the existing logic (current lines 65-106 in frontpage-layout.tsx):
- Determine target column from the panel being dropped on
- Reorder panels within target column
- Update order values
- Save config

**No changes needed** - existing panel-to-panel drop behavior remains identical.

## Visual Feedback (Optional Enhancement)

Add subtle hint when column is empty:

```typescript
<DroppableColumn columnId="left" panels={leftPanels}>
    {leftPanels.length === 0 && isAuthenticated && (
        <div className="empty-column-hint">
            Drag panels here
        </div>
    )}
    {leftPanels.map((panel) => (
        <DraggablePanel ... />
    ))}
</DroppableColumn>
```

**Styling:**
```css
.empty-column-hint {
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
    opacity: 0.5;
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    margin-bottom: 1rem;
}
```

Only show for authenticated users (guests can't drag).

## Testing Plan

**Core Functionality:**
- [ ] Move all panels to left column
- [ ] Drag a panel to the empty right column
- [ ] Verify panel appears at order 0 in right column
- [ ] Move all panels to right column
- [ ] Drag a panel to the empty left column
- [ ] Verify panel appears at order 0 in left column

**Drop Targets:**
- [ ] Drop on empty column container works
- [ ] Drop on non-empty column container appends to end
- [ ] Drop on specific panel still reorders correctly
- [ ] Drop on same column reorders within column

**Edge Cases:**
- [ ] Dragging last visible panel works (minimum 3 enforcement)
- [ ] Order values recalculate correctly after drops
- [ ] Save/persistence works for all scenarios
- [ ] Mobile: single column layout (no cross-column needed)

**Regression:**
- [ ] Existing panel-to-panel dragging unchanged
- [ ] Hide/restore functionality still works
- [ ] Save feedback (toast, spinner) still works

## Implementation Changes

**Files to Modify:**
- `app/(new-layout)/frontpage/components/frontpage-layout.tsx`
  - Add `useDroppable` import
  - Create DroppableColumn component
  - Refactor handleDragEnd into handleColumnDrop and handlePanelDrop
  - Update column rendering to use DroppableColumn

**New Imports:**
```typescript
import { useDroppable } from '@dnd-kit/core';
```

**No Breaking Changes:**
- Existing config format unchanged
- No database migrations needed
- Backwards compatible with saved configurations

## Summary

This fix makes empty columns valid drop targets by wrapping column containers with `useDroppable`. Users can now redistribute panels freely without soft-locking columns. The solution is minimal, uses @dnd-kit patterns correctly, and maintains all existing drag-and-drop behavior.
