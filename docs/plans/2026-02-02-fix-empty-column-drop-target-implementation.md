# Fix Empty Column Drop Target Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix bug where empty columns cannot accept dropped panels, enabling users to redistribute panels freely between columns.

**Architecture:** Add `useDroppable` hook to column containers to make them persistent drop targets even when empty. Refactor `handleDragEnd` to distinguish between column drops and panel drops, handling each case appropriately.

**Tech Stack:** React 19, @dnd-kit/core, TypeScript, Next.js 16

---

## Task 1: Add useDroppable Import and Create DroppableColumn Component

**Files:**
- Modify: `app/(new-layout)/frontpage/components/frontpage-layout.tsx:3-10` (imports)
- Modify: `app/(new-layout)/frontpage/components/frontpage-layout.tsx:22-26` (add component before FrontpageLayout)

**Step 1: Add useDroppable import**

Add `useDroppable` to the @dnd-kit/core imports:

```typescript
import {
    closestCorners,
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from '@dnd-kit/core';
```

**Step 2: Create DroppableColumn component before FrontpageLayout**

Insert this component definition after the imports and before the `FrontpageLayoutProps` interface (around line 21):

```typescript
interface DroppableColumnProps {
    columnId: 'left' | 'right';
    panels: Array<{ id: PanelId; order: number }>;
    className: string;
    children: ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
    columnId,
    panels,
    className,
    children,
}) => {
    const { setNodeRef } = useDroppable({
        id: `column-${columnId}`,
        data: { type: 'column', columnId },
    });

    return (
        <div ref={setNodeRef} className={className}>
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

**Step 3: Verify code compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/components/frontpage-layout.tsx
git commit -m "feat: add DroppableColumn component with useDroppable hook"
```

---

## Task 2: Extract Panel Drop Logic into handlePanelDrop

**Files:**
- Modify: `app/(new-layout)/frontpage/components/frontpage-layout.tsx:57-107` (handleDragEnd function)

**Step 1: Create handlePanelDrop function**

Add this new function after `saveConfig` function and before `handleDragEnd` (around line 56):

```typescript
const handlePanelDrop = (activeId: PanelId, overId: PanelId) => {
    const newPanels = [...config.panels];
    const activeIndex = newPanels.findIndex((p) => p.id === activeId);
    const overIndex = newPanels.findIndex((p) => p.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const activePanel = newPanels[activeIndex];
    const overPanel = newPanels[overIndex];

    const targetColumn = overPanel.column;

    newPanels[activeIndex] = { ...activePanel, column: targetColumn };

    const sameColumnPanels = newPanels.filter(
        (p) => p.column === targetColumn && p.visible,
    );
    const otherColumnPanels = newPanels.filter(
        (p) => p.column !== targetColumn,
    );

    const reorderedSameColumn = [...sameColumnPanels];
    const movedPanelIndex = reorderedSameColumn.findIndex(
        (p) => p.id === activeId,
    );
    const targetPanelIndex = reorderedSameColumn.findIndex(
        (p) => p.id === overId,
    );

    const [movedPanel] = reorderedSameColumn.splice(movedPanelIndex, 1);
    reorderedSameColumn.splice(targetPanelIndex, 0, movedPanel);

    const reorderedWithOrder = reorderedSameColumn.map((p, idx) => ({
        ...p,
        order: idx,
    }));

    const newConfig = {
        panels: [...reorderedWithOrder, ...otherColumnPanels],
    };

    setConfig(newConfig);
    saveConfig(newConfig);
};
```

**Step 2: Verify code compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/components/frontpage-layout.tsx
git commit -m "refactor: extract panel drop logic into handlePanelDrop"
```

---

## Task 3: Create handleColumnDrop Function

**Files:**
- Modify: `app/(new-layout)/frontpage/components/frontpage-layout.tsx` (add after handlePanelDrop)

**Step 1: Add handleColumnDrop function**

Add this function after `handlePanelDrop` (before `handleDragEnd`):

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

    // Get all visible panels in target column (after moving the panel)
    const columnPanels = newPanels.filter(
        (p) => p.column === targetColumn && p.visible,
    );

    // Find max order, or -1 if column was empty
    const maxOrder =
        columnPanels.length > 0
            ? Math.max(...columnPanels.map((p) => p.order))
            : -1;

    // Place at end (or at 0 if column was empty)
    newPanels[panelIndex].order = maxOrder + 1;

    const newConfig = { panels: newPanels };
    setConfig(newConfig);
    saveConfig(newConfig);
};
```

**Step 2: Verify code compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/components/frontpage-layout.tsx
git commit -m "feat: add handleColumnDrop for empty column drops"
```

---

## Task 4: Refactor handleDragEnd to Route to Handlers

**Files:**
- Modify: `app/(new-layout)/frontpage/components/frontpage-layout.tsx:57-107` (replace handleDragEnd)

**Step 1: Replace handleDragEnd implementation**

Replace the entire `handleDragEnd` function body with this routing logic:

```typescript
const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = active.id as PanelId;
    const overId = over.id as string;

    // Check if dropped on a column container vs a panel
    const isColumnDrop =
        typeof overId === 'string' && overId.startsWith('column-');

    if (isColumnDrop) {
        const targetColumn = over.data.current?.columnId as
            | 'left'
            | 'right'
            | undefined;
        if (targetColumn) {
            handleColumnDrop(activeId, targetColumn);
        }
    } else {
        handlePanelDrop(activeId, overId as PanelId);
    }
};
```

**Step 2: Verify code compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/components/frontpage-layout.tsx
git commit -m "refactor: update handleDragEnd to route column and panel drops"
```

---

## Task 5: Replace Column Divs with DroppableColumn Components

**Files:**
- Modify: `app/(new-layout)/frontpage/components/frontpage-layout.tsx:156-194` (render section)

**Step 1: Replace left column div**

Replace lines 157-174 (the left column section) with:

```typescript
<DroppableColumn
    columnId="left"
    panels={leftPanels}
    className="col col-lg-6 col-xl-7 col-12"
>
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
```

**Step 2: Replace right column div**

Replace lines 175-193 (the right column section) with:

```typescript
<DroppableColumn
    columnId="right"
    panels={rightPanels}
    className="col col-lg-6 col-xl-5 col-12"
>
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
```

**Step 3: Verify code compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 4: Build to verify no runtime errors**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 5: Commit**

```bash
git add app/(new-layout)/frontpage/components/frontpage-layout.tsx
git commit -m "feat: use DroppableColumn components for empty column drop support"
```

---

## Task 6: Manual Testing - Empty Column Drops

**Testing Steps:**

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server starts on http://localhost:3000

**Step 2: Navigate to frontpage**

Navigate to the new layout frontpage (logged in user)
Expected: See drag handles on panels

**Step 3: Test moving all panels to left**

- Drag all right column panels to left column one by one
- Verify each panel moves successfully
Expected: All panels now in left column, right column empty

**Step 4: Test dropping on empty right column**

- Drag one panel from left column to the empty right column area
- Drop it in the empty space where right column was
Expected: Panel moves to right column at order 0

**Step 5: Test moving all panels to right**

- Drag all remaining left panels to right column
- Verify empty left column accepts drops
Expected: All panels in right, left column empty, can drop panels back to left

**Step 6: Verify persistence**

- Refresh the page
Expected: Layout persists, configuration saved correctly

---

## Task 7: Manual Testing - Panel-to-Panel Drops (Regression)

**Testing Steps:**

**Step 1: Reset to default layout**

Reset frontpage config to defaults if needed
Expected: Panels distributed across both columns

**Step 2: Test reordering within left column**

- Drag a panel within the left column
- Drop it above/below another panel in same column
Expected: Panels reorder correctly, order values update

**Step 3: Test reordering within right column**

- Drag a panel within the right column
- Drop it above/below another panel in same column
Expected: Panels reorder correctly

**Step 4: Test cross-column panel-to-panel drops**

- Drag a left panel and drop it directly on a right panel
- Verify it inserts at that position in right column
Expected: Panel moves to right column at correct position

**Step 5: Test hide/restore functionality**

- Hide a panel using eye icon
- Restore it from dropdown
Expected: Hide/restore works as before

**Step 6: Test minimum 3 panels enforcement**

- Try to hide panels until only 3 remain
- Verify hide button becomes disabled
Expected: Cannot hide below 3 panels

---

## Task 8: Edge Case Testing

**Testing Steps:**

**Step 1: Test dragging last panel from column**

- Move panels so each column has exactly 1 panel
- Drag one panel to the other column
- Verify empty column accepts it back
Expected: No soft-locking, can move panels freely

**Step 2: Test rapid successive drops**

- Quickly drag and drop multiple panels between columns
- Verify no race conditions or state corruption
Expected: All drops handled correctly, final state consistent

**Step 3: Test dropping on column vs panel**

- Drag panel to empty space in column (not on another panel)
- Verify it appends to end of column
- Drag panel directly onto another panel
- Verify it inserts at that position
Expected: Both drop types work correctly

**Step 4: Test with hidden panels**

- Hide several panels
- Move all visible panels to one column
- Restore a hidden panel
- Verify restored panel appears correctly
Expected: Hidden panels don't interfere with column drops

**Step 5: Test mobile responsive (if applicable)**

- Resize browser to mobile width
- Verify single column layout
- Verify drag still works (or is disabled appropriately)
Expected: Mobile behavior consistent with design

---

## Task 9: Lint and Type Check

**Files:**
- Verify: `app/(new-layout)/frontpage/components/frontpage-layout.tsx`

**Step 1: Run linter**

Run: `npm run lint`
Expected: No linting errors

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Fix any issues**

If there are linting or type errors, fix them now.

**Step 4: Run Biome formatting**

Run: `npx @biomejs/biome check --write app/(new-layout)/frontpage/components/frontpage-layout.tsx`
Expected: File formatted correctly

**Step 5: Commit formatting changes (if any)**

```bash
git add app/(new-layout)/frontpage/components/frontpage-layout.tsx
git commit -m "style: format frontpage-layout with biome"
```

---

## Task 10: Final Verification and Documentation

**Files:**
- Modify: `docs/plans/2026-02-02-fix-empty-column-drop-target.md` (update status)

**Step 1: Run full build**

Run: `npm run build`
Expected: Production build succeeds

**Step 2: Verify all tests pass (if applicable)**

Run: `npm test` (if tests exist for this feature)
Expected: All tests pass

**Step 3: Update design document status**

Update the design document to mark as implemented:

```markdown
**Status:** Implemented
**Date Implemented:** 2026-02-02
```

**Step 4: Review changes**

Run: `git diff origin/feature/configurable-frontpage-panels`
Expected: Review all changes, verify nothing unexpected

**Step 5: Commit documentation update**

```bash
git add docs/plans/2026-02-02-fix-empty-column-drop-target.md
git commit -m "docs: mark empty column drop fix as implemented"
```

---

## Summary

This implementation plan fixes the empty column drop target bug by:
1. Adding `useDroppable` hook to make column containers persistent drop targets
2. Creating a `DroppableColumn` component that wraps each column
3. Refactoring `handleDragEnd` to route to `handleColumnDrop` or `handlePanelDrop`
4. Implementing logic to place panels in empty columns at order 0
5. Maintaining backward compatibility with existing panel-to-panel drops

The fix is minimal, follows @dnd-kit patterns, and preserves all existing functionality while eliminating the soft-lock issue.
