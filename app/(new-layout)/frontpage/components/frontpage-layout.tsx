'use client';

import {
    closestCorners,
    DndContext,
    DragEndEvent,
    PointerSensor,
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
