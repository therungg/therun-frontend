# Configurable Frontpage Panels Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to drag-and-drop reorder frontpage panels, move them between columns, and hide/show panels with configuration persisting in the database.

**Architecture:** Add JSONB column to users table for panel config, create server actions for CRUD operations, wrap frontpage in @dnd-kit DndContext with client-side drag handling, and maintain server component architecture for panels.

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, Drizzle ORM, Next.js Server Actions

---

## Task 1: Install @dnd-kit Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install @dnd-kit packages**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: Packages installed successfully

**Step 2: Verify installation**

Run:
```bash
npm list @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: All three packages listed with version numbers

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @dnd-kit packages for drag-and-drop panels"
```

---

## Task 2: Create Type Definitions

**Files:**
- Create: `types/frontpage-config.types.ts`

**Step 1: Create type definitions file**

Create `types/frontpage-config.types.ts`:

```typescript
export type PanelId =
    | 'live-runs'
    | 'stats'
    | 'current-user-live'
    | 'race'
    | 'patreon'
    | 'latest-pbs';

export type ColumnId = 'left' | 'right';

export interface PanelConfigItem {
    id: PanelId;
    visible: boolean;
    order: number;
    column: ColumnId;
}

export interface PanelConfig {
    panels: PanelConfigItem[];
}

export interface PanelMetadata {
    name: string;
    defaultColumn: ColumnId;
}
```

**Step 2: Commit**

```bash
git add types/frontpage-config.types.ts
git commit -m "feat: add frontpage config type definitions"
```

---

## Task 3: Add Database Column

**Files:**
- Modify: `src/db/schema.ts:65-77` (users table)
- Create: `drizzle/0029_add_frontpage_config.sql`

**Step 1: Update users schema**

In `src/db/schema.ts`, modify the users table definition (around line 65-77):

```typescript
export const users = pgTable(
    "users",
    {
        id: serial().primaryKey().unique(),
        username: varchar({ length: 255 }).notNull().unique(),
        frontpageConfig: jsonb("frontpage_config").$type<PanelConfig>(),
    },
    (table) => [
        uniqueIndex("idx_users_username_lower").using(
            "btree",
            sql`(lower(${table.username}))`,
        ),
    ],
);
```

Add import at top of file:
```typescript
import { PanelConfig } from '../../types/frontpage-config.types';
```

**Step 2: Generate migration**

Run:
```bash
npm run generate-migration
```

Expected: New migration file created in `drizzle/` directory

**Step 3: Review migration SQL**

Check the generated SQL file ensures it adds `frontpage_config JSONB` column to users table.

**Step 4: Run migration**

Run:
```bash
npm run migrate
```

Expected: Migration applied successfully

**Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/*.sql drizzle/meta/*
git commit -m "feat: add frontpage_config column to users table"
```

---

## Task 4: Create Panel Registry and Constants

**Files:**
- Create: `src/lib/frontpage-panels.ts`

**Step 1: Create panel registry file**

Create `src/lib/frontpage-panels.ts`:

```typescript
import { PanelConfig, PanelId, PanelMetadata } from '../../types/frontpage-config.types';
import CurrentUserLivePanel from '~app/(new-layout)/frontpage/panels/current-user-live-panel/current-user-live-panel';
import { LatestPbsPanel } from '~app/(new-layout)/frontpage/panels/latest-pbs-panel/latest-pbs-panel';
import { LiveRunsPanel } from '~app/(new-layout)/frontpage/panels/live-runs-panel/live-runs-panel';
import PatreonPanel from '~app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel';
import RacePanel from '~app/(new-layout)/frontpage/panels/race-panel/race-panel';
import StatsPanel from '~app/(new-layout)/frontpage/panels/stats-panel/stats-panel';

export const PANEL_REGISTRY = {
    'live-runs': LiveRunsPanel,
    'stats': StatsPanel,
    'current-user-live': CurrentUserLivePanel,
    'race': RacePanel,
    'patreon': PatreonPanel,
    'latest-pbs': LatestPbsPanel,
} as const;

export const PANEL_METADATA: Record<PanelId, PanelMetadata> = {
    'live-runs': { name: 'Live Runs', defaultColumn: 'left' },
    'stats': { name: 'Stats', defaultColumn: 'left' },
    'current-user-live': { name: 'Your Live Run', defaultColumn: 'right' },
    'race': { name: 'Races', defaultColumn: 'right' },
    'patreon': { name: 'Patreon', defaultColumn: 'right' },
    'latest-pbs': { name: 'Latest PBs', defaultColumn: 'right' },
};

export const DEFAULT_FRONTPAGE_CONFIG: PanelConfig = {
    panels: [
        { id: 'live-runs', visible: true, order: 0, column: 'left' },
        { id: 'stats', visible: true, order: 1, column: 'left' },
        { id: 'current-user-live', visible: true, order: 0, column: 'right' },
        { id: 'race', visible: true, order: 1, column: 'right' },
        { id: 'patreon', visible: true, order: 2, column: 'right' },
        { id: 'latest-pbs', visible: true, order: 3, column: 'right' },
    ],
};

export function mergeConfigWithDefaults(savedConfig: PanelConfig): PanelConfig {
    const allPanelIds = Object.keys(PANEL_REGISTRY) as PanelId[];
    const savedPanelIds = savedConfig.panels.map((p) => p.id);

    const newPanels = allPanelIds.filter((id) => !savedPanelIds.includes(id));

    if (newPanels.length === 0) {
        return savedConfig;
    }

    const getNextOrder = (column: 'left' | 'right'): number => {
        const columnPanels = savedConfig.panels.filter((p) => p.column === column);
        return columnPanels.length > 0
            ? Math.max(...columnPanels.map((p) => p.order)) + 1
            : 0;
    };

    return {
        panels: [
            ...savedConfig.panels,
            ...newPanels.map((id) => ({
                id,
                visible: true,
                order: getNextOrder(PANEL_METADATA[id].defaultColumn),
                column: PANEL_METADATA[id].defaultColumn,
            })),
        ],
    };
}
```

**Step 2: Commit**

```bash
git add src/lib/frontpage-panels.ts
git commit -m "feat: add panel registry and default config"
```

---

## Task 5: Create Server Actions

**Files:**
- Create: `src/actions/frontpage-config.action.ts`

**Step 1: Create server actions file**

Create `src/actions/frontpage-config.action.ts`:

```typescript
'use server';

import { eq } from 'drizzle-orm';
import { PanelConfig } from '../../types/frontpage-config.types';
import { db } from '~src/db';
import { users } from '~src/db/schema';
import {
    DEFAULT_FRONTPAGE_CONFIG,
    mergeConfigWithDefaults,
    PANEL_REGISTRY,
} from '~src/lib/frontpage-panels';
import { getSession } from './session.action';

export async function getFrontpageConfig(): Promise<PanelConfig> {
    const session = await getSession();
    if (!session?.id) return DEFAULT_FRONTPAGE_CONFIG;

    const result = await db
        .select()
        .from(users)
        .where(eq(users.id, session.id))
        .limit(1);

    const user = result[0];
    if (!user?.frontpageConfig) {
        return DEFAULT_FRONTPAGE_CONFIG;
    }

    return mergeConfigWithDefaults(user.frontpageConfig as PanelConfig);
}

export async function updateFrontpageConfig(
    config: PanelConfig,
): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();
    if (!session?.id) {
        return { success: false, error: 'Not authenticated' };
    }

    const visibleCount = config.panels.filter((p) => p.visible).length;
    if (visibleCount < 3) {
        return {
            success: false,
            error: 'Must have at least 3 visible panels',
        };
    }

    const validPanelIds = Object.keys(PANEL_REGISTRY);
    const allValid = config.panels.every((p) =>
        validPanelIds.includes(p.id),
    );
    if (!allValid) {
        return { success: false, error: 'Invalid panel configuration' };
    }

    try {
        await db
            .update(users)
            .set({ frontpageConfig: config as any })
            .where(eq(users.id, session.id));

        return { success: true };
    } catch (error) {
        console.error('Failed to update frontpage config:', error);
        return { success: false, error: 'Failed to save configuration' };
    }
}

export async function resetFrontpageConfig(): Promise<void> {
    const session = await getSession();
    if (!session?.id) {
        throw new Error('Not authenticated');
    }

    await db
        .update(users)
        .set({ frontpageConfig: null })
        .where(eq(users.id, session.id));
}
```

**Step 2: Commit**

```bash
git add src/actions/frontpage-config.action.ts
git commit -m "feat: add server actions for frontpage config"
```

---

## Task 6: Create DraggablePanel Component

**Files:**
- Create: `app/(new-layout)/frontpage/components/draggable-panel.tsx`
- Create: `app/(new-layout)/frontpage/components/draggable-panel.module.scss`

**Step 1: Create DraggablePanel component**

Create `app/(new-layout)/frontpage/components/draggable-panel.tsx`:

```typescript
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';
import { FaEye, FaEyeSlash, FaGripVertical } from 'react-icons/fa6';
import styles from './draggable-panel.module.scss';

interface DraggablePanelProps {
    id: string;
    children: ReactNode;
    onHide: () => void;
    canHide: boolean;
    isAuthenticated: boolean;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
    id,
    children,
    onHide,
    canHide,
    isAuthenticated,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={styles.draggablePanel}>
            {isAuthenticated && (
                <div className={styles.controls}>
                    <button
                        className={styles.dragHandle}
                        {...attributes}
                        {...listeners}
                        aria-label="Drag to reorder"
                        title="Drag to reorder"
                    >
                        <FaGripVertical />
                    </button>
                    <button
                        className={styles.hideButton}
                        onClick={onHide}
                        disabled={!canHide}
                        aria-label="Hide panel"
                        title={
                            canHide
                                ? 'Hide panel'
                                : 'At least 3 panels must be visible'
                        }
                    >
                        <FaEyeSlash />
                    </button>
                </div>
            )}
            {children}
        </div>
    );
};
```

**Step 2: Create styles**

Create `app/(new-layout)/frontpage/components/draggable-panel.module.scss`:

```scss
.draggablePanel {
    position: relative;
    margin-bottom: 1.5rem;
}

.controls {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    gap: 0.5rem;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;

    .draggablePanel:hover & {
        opacity: 1;
    }

    @media (max-width: 768px) {
        opacity: 1;
    }
}

.dragHandle,
.hideButton {
    background: var(--bs-body-bg);
    border: 1px solid var(--bs-border-color);
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    cursor: pointer;
    color: var(--bs-body-color);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease-in-out;

    &:hover:not(:disabled) {
        background: var(--bs-primary);
        color: white;
        border-color: var(--bs-primary);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
}

.dragHandle {
    cursor: grab;

    &:active {
        cursor: grabbing;
    }
}
```

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/components/draggable-panel.tsx app/(new-layout)/frontpage/components/draggable-panel.module.scss
git commit -m "feat: add draggable panel wrapper component"
```

---

## Task 7: Create Hidden Panels Dropdown

**Files:**
- Create: `app/(new-layout)/frontpage/components/hidden-panels-dropdown.tsx`
- Create: `app/(new-layout)/frontpage/components/hidden-panels-dropdown.module.scss`

**Step 1: Create dropdown component**

Create `app/(new-layout)/frontpage/components/hidden-panels-dropdown.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { FaEye } from 'react-icons/fa6';
import { PanelId } from '../../../../types/frontpage-config.types';
import { PANEL_METADATA } from '~src/lib/frontpage-panels';
import styles from './hidden-panels-dropdown.module.scss';

interface HiddenPanelsDropdownProps {
    hiddenPanels: PanelId[];
    onRestore: (panelId: PanelId) => void;
}

export const HiddenPanelsDropdown: React.FC<HiddenPanelsDropdownProps> = ({
    hiddenPanels,
    onRestore,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    if (hiddenPanels.length === 0) {
        return null;
    }

    return (
        <div className={styles.dropdown}>
            <button
                className={styles.dropdownButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                Hidden Panels ({hiddenPanels.length})
            </button>
            {isOpen && (
                <div className={styles.dropdownMenu}>
                    {hiddenPanels.map((panelId) => (
                        <button
                            key={panelId}
                            className={styles.dropdownItem}
                            onClick={() => {
                                onRestore(panelId);
                                setIsOpen(false);
                            }}
                        >
                            <FaEye className={styles.icon} />
                            {PANEL_METADATA[panelId].name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
```

**Step 2: Create styles**

Create `app/(new-layout)/frontpage/components/hidden-panels-dropdown.module.scss`:

```scss
.dropdown {
    position: relative;
    display: inline-block;
    margin-bottom: 1rem;
}

.dropdownButton {
    background: var(--bs-primary);
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease-in-out;

    &:hover {
        background: var(--bs-primary-dark, #5a8c54);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(96, 140, 89, 0.25);
    }

    &:active {
        transform: translateY(0);
    }
}

.dropdownMenu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.25rem;
    background: var(--bs-body-bg);
    border: 1px solid var(--bs-border-color);
    border-radius: 0.375rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    z-index: 1000;
    overflow: hidden;
}

.dropdownItem {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: var(--bs-body-color);
    cursor: pointer;
    text-align: left;
    font-size: 0.875rem;
    transition: background 0.15s ease-in-out;

    &:hover {
        background: var(--bs-tertiary-bg);
    }

    &:not(:last-child) {
        border-bottom: 1px solid var(--bs-border-color);
    }
}

.icon {
    color: var(--bs-primary);
    flex-shrink: 0;
}
```

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/components/hidden-panels-dropdown.tsx app/(new-layout)/frontpage/components/hidden-panels-dropdown.module.scss
git commit -m "feat: add hidden panels dropdown component"
```

---

## Task 8: Create FrontpageLayout Client Component

**Files:**
- Create: `app/(new-layout)/frontpage/components/frontpage-layout.tsx`
- Create: `app/(new-layout)/frontpage/components/frontpage-layout.module.scss`

**Step 1: Create FrontpageLayout component**

Create `app/(new-layout)/frontpage/components/frontpage-layout.tsx`:

```typescript
'use client';

import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    PointerSensor,
    closestCorners,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ReactNode, useState } from 'react';
import { toast } from 'react-toastify';
import {
    ColumnId,
    PanelConfig,
    PanelId,
} from '../../../../types/frontpage-config.types';
import { updateFrontpageConfig } from '~src/actions/frontpage-config.action';
import { DraggablePanel } from './draggable-panel';
import { HiddenPanelsDropdown } from './hidden-panels-dropdown';
import styles from './frontpage-layout.module.scss';

interface FrontpageLayoutProps {
    initialConfig: PanelConfig;
    panels: Record<PanelId, ReactNode>;
    isAuthenticated: boolean;
}

export const FrontpageLayout: React.FC<FrontpageLayoutProps> = ({
    initialConfig,
    panels,
    isAuthenticated,
}) => {
    const [config, setConfig] = useState<PanelConfig>(initialConfig);
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
    );

    const saveConfig = async (newConfig: PanelConfig) => {
        setIsSaving(true);
        const result = await updateFrontpageConfig(newConfig);
        setIsSaving(false);

        if (result.success) {
            toast.success('Layout saved', { autoClose: 2000 });
        } else {
            toast.error(result.error || 'Failed to save layout');
            setConfig(config);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const activeId = active.id as PanelId;
        const overId = over.id as PanelId;

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

        reorderedSameColumn.forEach((p, idx) => {
            p.order = idx;
        });

        const newConfig = {
            panels: [...reorderedSameColumn, ...otherColumnPanels],
        };

        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const handleHidePanel = (panelId: PanelId) => {
        const newPanels = config.panels.map((p) =>
            p.id === panelId ? { ...p, visible: false } : p,
        );
        const newConfig = { panels: newPanels };
        setConfig(newConfig);
        saveConfig(newConfig);
        toast.info('Panel hidden. Restore from dropdown above', {
            autoClose: 3000,
        });
    };

    const handleRestorePanel = (panelId: PanelId) => {
        const newPanels = config.panels.map((p) =>
            p.id === panelId ? { ...p, visible: true } : p,
        );
        const newConfig = { panels: newPanels };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const visibleCount = config.panels.filter((p) => p.visible).length;
    const canHideMore = visibleCount > 3;

    const leftPanels = config.panels
        .filter((p) => p.column === 'left' && p.visible)
        .sort((a, b) => a.order - b.order);
    const rightPanels = config.panels
        .filter((p) => p.column === 'right' && p.visible)
        .sort((a, b) => a.order - b.order);
    const hiddenPanels = config.panels
        .filter((p) => !p.visible)
        .map((p) => p.id);

    return (
        <>
            {isAuthenticated && (
                <HiddenPanelsDropdown
                    hiddenPanels={hiddenPanels}
                    onRestore={handleRestorePanel}
                />
            )}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragEnd={handleDragEnd}
            >
                <div className="row d-flex flex-wrap">
                    <div className="col col-lg-6 col-xl-7 col-12">
                        <SortableContext
                            items={leftPanels.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
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
                        </SortableContext>
                    </div>
                    <div className="col col-lg-6 col-xl-5 col-12">
                        <SortableContext
                            items={rightPanels.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
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
                        </SortableContext>
                    </div>
                </div>
            </DndContext>
        </>
    );
};
```

**Step 2: Create minimal styles**

Create `app/(new-layout)/frontpage/components/frontpage-layout.module.scss`:

```scss
// Placeholder for any layout-specific styles
// Most styling is handled by Bootstrap grid and component styles
```

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/components/frontpage-layout.tsx app/(new-layout)/frontpage/components/frontpage-layout.module.scss
git commit -m "feat: add frontpage layout with drag-and-drop"
```

---

## Task 9: Update Frontpage to Use FrontpageLayout

**Files:**
- Modify: `app/(new-layout)/frontpage/frontpage.tsx`

**Step 1: Read current frontpage**

Read `app/(new-layout)/frontpage/frontpage.tsx` to see current structure.

**Step 2: Update frontpage component**

Replace the entire content of `app/(new-layout)/frontpage/frontpage.tsx`:

```typescript
import { PanelId } from '../../../types/frontpage-config.types';
import { getFrontpageConfig } from '~src/actions/frontpage-config.action';
import { getSession } from '~src/actions/session.action';
import { PANEL_REGISTRY } from '~src/lib/frontpage-panels';
import { FrontpageLayout } from './components/frontpage-layout';
import styles from './frontpage.module.scss';

export default async function FrontPage() {
    const session = await getSession();
    const config = await getFrontpageConfig();
    const isAuthenticated = !!session?.id;

    const panelComponents: Record<PanelId, React.ReactNode> = {
        'live-runs': <PANEL_REGISTRY['live-runs'] />,
        'stats': <PANEL_REGISTRY['stats'] />,
        'current-user-live': <PANEL_REGISTRY['current-user-live'] />,
        'race': <PANEL_REGISTRY['race'] />,
        'patreon': <PANEL_REGISTRY['patreon'] />,
        'latest-pbs': <PANEL_REGISTRY['latest-pbs'] />,
    };

    return (
        <div>
            <div className={`text-center mb-3 ${styles.heroSection}`}>
                <h1 className={`display-3 fw-medium ${styles.title}`}>
                    The Run
                </h1>
                <h2 className={`display-6 ${styles.subtitle}`}>
                    Everything Speedrunning
                </h2>
            </div>
            <FrontpageLayout
                initialConfig={config}
                panels={panelComponents}
                isAuthenticated={isAuthenticated}
            />
        </div>
    );
}
```

**Step 3: Verify imports work**

Run:
```bash
npm run typecheck 2>&1 | grep -i frontpage || echo "No new frontpage errors"
```

Expected: No new errors in frontpage files (pre-existing errors in other files are okay)

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/frontpage.tsx
git commit -m "feat: integrate FrontpageLayout with dynamic panel config"
```

---

## Task 10: Manual Testing

**Step 1: Start dev server**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:3000

**Step 2: Test guest view**

- Navigate to frontpage (logged out)
- Verify: All 6 panels visible in default order
- Verify: No drag handles or hide buttons visible
- Verify: Layout matches current production

**Step 3: Test authenticated view**

- Log in with Twitch
- Navigate to frontpage
- Verify: Drag handles (⋮⋮) appear on hover
- Verify: Hide buttons (eye icon) appear on hover

**Step 4: Test drag-and-drop**

- Drag a panel within same column
- Verify: Panel reorders smoothly
- Verify: "Layout saved" toast appears
- Refresh page
- Verify: Order persists

**Step 5: Test cross-column drag**

- Drag panel from left to right column
- Verify: Panel moves to right column
- Refresh page
- Verify: Column assignment persists

**Step 6: Test hide/show**

- Hide a panel
- Verify: "Panel hidden. Restore from dropdown above" toast appears
- Verify: "Hidden Panels (1)" button appears at top
- Click dropdown
- Verify: Hidden panel listed with eye icon
- Click to restore
- Verify: Panel reappears in original position

**Step 7: Test minimum enforcement**

- Hide panels until only 3 remain visible
- Verify: Hide buttons become disabled
- Verify: Tooltip shows "At least 3 panels must be visible"

**Step 8: Test mobile responsive**

- Resize browser to mobile width (<768px)
- Verify: Single column layout
- Verify: Drag handles always visible (not just on hover)
- Verify: Dragging still works

**Step 9: Document any issues found**

Create a list of any bugs or improvements needed.

---

## Task 11: Final Commit and Review

**Step 1: Run linter**

Run:
```bash
npm run lint-fix
```

Expected: Auto-fixes applied

**Step 2: Commit any lint fixes**

```bash
git add -A
git commit -m "style: apply linter fixes"
```

**Step 3: Review all commits**

Run:
```bash
git log --oneline origin/main..HEAD
```

Expected: 7-8 commits with clear, atomic changes

**Step 4: Use verification skill**

Use @superpowers:verification-before-completion to verify the feature works before claiming completion.

---

## Task 12: Optional Enhancements (YAGNI - Only if Requested)

These are NOT part of the core implementation. Only add if explicitly requested:

- **Reset button:** Button to reset to default layout
- **Keyboard shortcuts:** Hotkeys for hiding/showing panels
- **Panel animations:** More elaborate entrance/exit animations
- **Panel settings:** Per-panel configuration (refresh rate, filters, etc.)
- **Layout presets:** Pre-configured layouts users can switch between
- **Export/import config:** Share panel configurations

---

## Notes

- Pre-existing TypeScript errors (69 errors) noted in baseline - these are unrelated to our feature
- Session object structure: `session.id` for user ID, `session.username` for username (verify in session.action.ts)
- React Bootstrap toast already available via `react-toastify`
- Use existing Bootstrap grid classes for responsive layout
- All panels remain server components - only the layout wrapper is client-side
