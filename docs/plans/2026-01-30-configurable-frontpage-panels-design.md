# Configurable Frontpage Panels - Design Document

**Date:** 2026-01-30
**Status:** Approved
**Complexity:** Medium (2-3 days)

## Overview

Enable users to customize their frontpage experience by dragging panels to reorder them, moving them between columns, and hiding/showing panels. Configuration persists in the database and syncs across devices.

## User Experience

### Drag-and-Drop Interaction

- Panels are always draggable for logged-in users (no toggle needed)
- Small grip icon (⋮⋮) appears on hover in top-right of panel tab
- Grip icon always visible on touch devices
- Users drag panels to reorder within columns or move between columns

### Visual Feedback

- **Dragging panel:** Slight opacity (0.6), lifted shadow, follows cursor
- **Drop zones:** Highlight with dashed border when dragging over
- **Other panels:** Shift smoothly to make space (CSS transitions)
- **Cursor:** Changes to `grabbing` during drag

### Hiding Panels

- Small eye icon (👁) next to drag handle
- Click to hide → panel fades out, others shift to fill space
- **Minimum 3 visible panels enforced** - hide button disabled when at minimum
- Toast notification: "Panel hidden. Restore from dropdown ↑"

### Restoring Hidden Panels

- "Hidden Panels (2)" button in frontpage header (only shows if panels are hidden)
- Dropdown menu lists hidden panels with restore icons
- Click to restore → panel animates back to last known position

### Saving

- Auto-save on every drop/hide/restore
- Optimistic updates (instant UI, sync in background)
- Subtle "Saved" checkmark briefly after save completes

### Responsive Behavior

- **Desktop:** Two-column layout as configured
- **Mobile:** Single column, respects visibility but ignores column assignment

## Data Model

### Database Schema

Add to existing `users` table:
```sql
ALTER TABLE users ADD COLUMN frontpage_config JSONB;
```

### Config Structure

```typescript
type PanelId = 'live-runs' | 'stats' | 'current-user-live' | 'race' | 'patreon' | 'latest-pbs'
type ColumnId = 'left' | 'right'

type PanelConfig = {
  panels: Array<{
    id: PanelId
    visible: boolean
    order: number
    column: ColumnId
  }>
}
```

### Default Configuration

```typescript
const DEFAULT_FRONTPAGE_CONFIG = {
  panels: [
    { id: 'live-runs', visible: true, order: 0, column: 'left' },
    { id: 'stats', visible: true, order: 1, column: 'left' },
    { id: 'current-user-live', visible: true, order: 0, column: 'right' },
    { id: 'race', visible: true, order: 1, column: 'right' },
    { id: 'patreon', visible: true, order: 2, column: 'right' },
    { id: 'latest-pbs', visible: true, order: 3, column: 'right' }
  ]
}
```

Used when:
- User is not logged in (guest view)
- User is logged in but `frontpageConfig` is null
- Saved config is invalid or corrupted

## Component Architecture

### Server Components

**frontpage.tsx:**
- Load user session
- Load `frontpageConfig` from users table
- Render all 6 panel server components
- Pass config + panels to FrontpageLayout client component

**Panels remain server components:**
- No changes to individual panel components
- They continue to fetch their own data server-side

### Client Components

**FrontpageLayout.tsx (new):**
- Receives config and rendered panel components as props
- Wraps everything in @dnd-kit DndContext
- Manages drag-and-drop state
- Renders two droppable columns
- Handles hide/show/restore logic
- Calls server action on config changes

**DraggablePanel.tsx (new):**
- Wrapper around each panel
- Adds drag handle (grip icon)
- Adds hide button (eye icon)
- Uses @dnd-kit's `useSortable` hook
- Applies drag styles and animations

**HiddenPanelsDropdown.tsx (new):**
- Dropdown in frontpage header
- Shows count of hidden panels
- Lists hidden panels with restore buttons
- Only renders if panels are hidden

### Panel Registry

**src/lib/frontpage-panels.ts (new):**
```typescript
import LiveRunsPanel from '~app/(new-layout)/frontpage/panels/live-runs-panel/live-runs-panel'
import StatsPanel from '~app/(new-layout)/frontpage/panels/stats-panel/stats-panel'
// ... etc

export const PANEL_REGISTRY = {
  'live-runs': LiveRunsPanel,
  'stats': StatsPanel,
  'current-user-live': CurrentUserLivePanel,
  'race': RacePanel,
  'patreon': PatreonPanel,
  'latest-pbs': LatestPbsPanel,
} as const

export const PANEL_METADATA = {
  'live-runs': { name: 'Live Runs', defaultColumn: 'left' },
  'stats': { name: 'Stats', defaultColumn: 'left' },
  'current-user-live': { name: 'Your Live Run', defaultColumn: 'right' },
  'race': { name: 'Races', defaultColumn: 'right' },
  'patreon': { name: 'Patreon', defaultColumn: 'right' },
  'latest-pbs': { name: 'Latest PBs', defaultColumn: 'right' },
} as const
```

## Server Actions & API

**src/actions/frontpage-config.action.ts (new):**

```typescript
'use server'

import { getSession } from './session.action'
import { db } from '~src/db'
import { users } from '~src/db/schema'
import { eq } from 'drizzle-orm'

// Get user's config, returns default if not set
export async function getFrontpageConfig(): Promise<PanelConfig> {
  const session = await getSession()
  if (!session?.userId) return DEFAULT_FRONTPAGE_CONFIG

  const user = await db.select().from(users).where(eq(users.id, session.userId))
  return user[0]?.frontpageConfig ?? DEFAULT_FRONTPAGE_CONFIG
}

// Update config with validation
export async function updateFrontpageConfig(config: PanelConfig): Promise<{ success: boolean, error?: string }> {
  const session = await getSession()
  if (!session?.userId) {
    return { success: false, error: 'Not authenticated' }
  }

  // Validation
  const visibleCount = config.panels.filter(p => p.visible).length
  if (visibleCount < 3) {
    return { success: false, error: 'Must have at least 3 visible panels' }
  }

  const validPanelIds = Object.keys(PANEL_REGISTRY)
  const allValid = config.panels.every(p => validPanelIds.includes(p.id))
  if (!allValid) {
    return { success: false, error: 'Invalid panel configuration' }
  }

  // Save
  await db.update(users)
    .set({ frontpageConfig: config })
    .where(eq(users.id, session.userId))

  return { success: true }
}

// Reset to defaults
export async function resetFrontpageConfig(): Promise<void> {
  const session = await getSession()
  if (!session?.userId) throw new Error('Not authenticated')

  await db.update(users)
    .set({ frontpageConfig: null })
    .where(eq(users.id, session.userId))
}
```

**Error handling:**
- Save fails → revert to previous layout, show error toast
- Invalid config in DB → fall back to default
- Missing panels in saved config → merge with defaults (handles future panel additions)

## @dnd-kit Implementation

**Dependencies to install:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**DndContext setup in FrontpageLayout:**
```typescript
import { DndContext, DragEndEvent, DragOverlay, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

// Handle drag end
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over) return

  // Determine new position and column
  const draggedPanelId = active.id
  const targetColumn = over.data.current?.column || 'left'

  // Update config optimistically
  // Call updateFrontpageConfig server action
  // Show save indicator
}
```

**Sortable columns:**
- Each column is a separate `SortableContext`
- Allows dragging between columns
- `verticalListSortingStrategy` for vertical panel stacking

**DraggablePanel component:**
```typescript
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function DraggablePanel({ id, children, onHide }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="drag-handle" {...attributes} {...listeners}>⋮⋮</div>
      <button onClick={onHide}>👁</button>
      {children}
    </div>
  )
}
```

**Accessibility:**
- @dnd-kit provides keyboard navigation by default
- Screen reader announcements for drag operations
- Focus management handled automatically

## Migration & Rollout

**Database migration:**
```typescript
// drizzle/YYYY-MM-DD-add-frontpage-config.ts
import { pgTable, jsonb } from 'drizzle-orm/pg-core'

export async function up(db) {
  await db.schema.alterTable('users').addColumn('frontpage_config', jsonb())
}

export async function down(db) {
  await db.schema.alterTable('users').dropColumn('frontpage_config')
}
```

**Backwards compatibility:**
- Null config → use defaults (existing behavior)
- No code changes for non-logged-in users
- Guest users always see default layout

**Handling new panels added in future:**

When new panels are added to the codebase, users with saved configs won't see them automatically. Solution:

```typescript
// Merge saved config with current panel registry
function mergeConfigWithDefaults(savedConfig: PanelConfig): PanelConfig {
  const allPanelIds = Object.keys(PANEL_REGISTRY)
  const savedPanelIds = savedConfig.panels.map(p => p.id)

  // Find new panels not in saved config
  const newPanels = allPanelIds.filter(id => !savedPanelIds.includes(id))

  // Add new panels with defaults (visible, appended to their default column)
  return {
    panels: [
      ...savedConfig.panels,
      ...newPanels.map(id => ({
        id,
        visible: true,
        order: getNextOrder(savedConfig, PANEL_METADATA[id].defaultColumn),
        column: PANEL_METADATA[id].defaultColumn
      }))
    ]
  }
}
```

**Testing considerations:**
- Test drag between columns
- Test minimum visibility enforcement
- Test mobile responsive (single column)
- Test with missing/invalid config data
- Test keyboard navigation

**Rollout:**
- Feature works immediately for all users
- Existing users see current layout by default
- Drag handles and hide buttons appear automatically for logged-in users

## Summary

This design enables full frontpage customization with drag-and-drop reordering, column movement, and panel visibility controls. The implementation leverages @dnd-kit for robust, accessible drag-and-drop, stores configuration in the database for cross-device sync, and maintains backwards compatibility with sensible defaults.