'use client';

import {
    closestCorners,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors,
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
    const { setNodeRef, isOver } = useDroppable({
        id: `column-${columnId}`,
        data: { type: 'column', columnId },
    });

    console.log('📦 DroppableColumn render:', {
        columnId,
        droppableId: `column-${columnId}`,
        panelCount: panels.length,
        isEmpty: panels.length === 0,
    });

    const isEmpty = panels.length === 0;

    return (
        <div className={className}>
            <div
                ref={setNodeRef}
                style={{
                    minHeight: isEmpty ? '300px' : '100%',
                    border: isEmpty ? '2px dashed #999' : undefined,
                    borderRadius: isEmpty ? '8px' : undefined,
                    backgroundColor: isOver
                        ? '#e8f5e9'
                        : isEmpty
                          ? '#f5f5f5'
                          : undefined,
                    display: isEmpty ? 'flex' : undefined,
                    alignItems: isEmpty ? 'center' : undefined,
                    justifyContent: isEmpty ? 'center' : undefined,
                    padding: isEmpty ? '2rem' : undefined,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                }}
            >
                {isEmpty && (
                    <div
                        style={{
                            color: '#666',
                            fontSize: '1rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        Drop panels here
                    </div>
                )}
                <SortableContext
                    items={panels.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {children}
                </SortableContext>
            </div>
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
    const [activeId, setActiveId] = useState<PanelId | null>(null);

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

    const handleColumnDrop = (
        panelId: PanelId,
        targetColumn: 'left' | 'right',
    ) => {
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

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as PanelId);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        console.log('🔍 DEBUG: handleDragEnd called', {
            activeId: active.id,
            overId: over?.id,
            overData: over?.data,
        });

        setActiveId(null);

        if (!over || active.id === over.id) {
            console.log('❌ No valid drop target');
            return;
        }

        const activeId = active.id as PanelId;
        const overId = over.id as string;

        // Check if dropped on a column container vs a panel
        const isColumnDrop =
            typeof overId === 'string' && overId.startsWith('column-');

        console.log('🎯 Drop type:', isColumnDrop ? 'COLUMN' : 'PANEL', {
            overId,
            columnId: over.data.current?.columnId,
        });

        if (isColumnDrop) {
            const targetColumn = over.data.current?.columnId as
                | 'left'
                | 'right'
                | undefined;
            if (targetColumn) {
                console.log('✅ Calling handleColumnDrop:', {
                    activeId,
                    targetColumn,
                });
                handleColumnDrop(activeId, targetColumn);
            }
        } else {
            console.log('✅ Calling handlePanelDrop:', { activeId, overId });
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
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="row d-flex flex-wrap">
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
                </div>
                <DragOverlay>
                    {activeId ? (
                        <div
                            style={{
                                opacity: 0.9,
                                transform: 'rotate(3deg)',
                                cursor: 'grabbing',
                            }}
                        >
                            {panels[activeId]}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </>
    );
};
