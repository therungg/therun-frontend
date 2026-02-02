'use client';

import {
    closestCorners,
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ReactNode, useState } from 'react';
import { toast } from 'react-toastify';
import { updateFrontpageConfig } from '~src/actions/frontpage-config.action';
import { PanelConfig, PanelId } from '../../../../types/frontpage-config.types';
import { DraggablePanel } from './draggable-panel';
import { HiddenPanelsDropdown } from './hidden-panels-dropdown';

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
    const [_isSaving, setIsSaving] = useState(false);

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
            (p) => p.column === targetColumn && p.visible && p.id !== panelId,
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
