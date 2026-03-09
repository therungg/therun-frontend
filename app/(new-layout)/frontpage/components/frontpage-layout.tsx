'use client';

import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { updateFrontpageConfig } from '~src/actions/frontpage-config.action';
import { NON_HIDEABLE_SECTIONS } from '~src/lib/frontpage-sections-metadata';
import type {
    FrontpageConfig,
    SectionId,
} from '../../../../types/frontpage-config.types';
import { DraggableSection } from './draggable-section';
import { HiddenSectionsDropdown } from './hidden-sections-dropdown';

interface FrontpageLayoutProps {
    initialConfig: FrontpageConfig;
    sections: Record<SectionId, ReactNode>;
    isAuthenticated: boolean;
}

export const FrontpageLayout: React.FC<FrontpageLayoutProps> = ({
    initialConfig,
    sections,
    isAuthenticated,
}) => {
    const [config, setConfig] = useState<FrontpageConfig>(initialConfig);
    const [activeId, setActiveId] = useState<SectionId | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    );

    const saveConfig = async (newConfig: FrontpageConfig) => {
        const result = await updateFrontpageConfig(newConfig);
        if (result.success) {
            toast.success('Layout saved', { autoClose: 2000 });
        } else {
            toast.error(result.error || 'Failed to save layout');
            setConfig(config);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as SectionId);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        const activeSection = config.sections.find((s) => s.id === active.id);
        const overSection = config.sections.find((s) => s.id === over.id);

        if (!activeSection || !overSection) return;

        // Only allow reordering within the same column
        if (activeSection.column !== overSection.column) return;

        const column = activeSection.column;
        const columnSections = config.sections
            .filter((s) => s.column === column && s.visible)
            .sort((a, b) => a.order - b.order);

        const activeIndex = columnSections.findIndex((s) => s.id === active.id);
        const overIndex = columnSections.findIndex((s) => s.id === over.id);

        const reordered = arrayMove(columnSections, activeIndex, overIndex).map(
            (s, idx) => ({ ...s, order: idx }),
        );

        const otherSections = config.sections.filter(
            (s) => s.column !== column || !s.visible,
        );
        const newConfig: FrontpageConfig = {
            sections: [...reordered, ...otherSections],
        };

        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const handleHideSection = (sectionId: SectionId) => {
        if (NON_HIDEABLE_SECTIONS.includes(sectionId)) return;
        const newSections = config.sections.map((s) =>
            s.id === sectionId ? { ...s, visible: false } : s,
        );
        const newConfig: FrontpageConfig = { sections: newSections };
        setConfig(newConfig);
        saveConfig(newConfig);
        toast.info('Section hidden. Restore from dropdown above.', {
            autoClose: 3000,
        });
    };

    const handleRestoreSection = (sectionId: SectionId) => {
        const newSections = config.sections.map((s) =>
            s.id === sectionId ? { ...s, visible: true } : s,
        );
        const newConfig: FrontpageConfig = { sections: newSections };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const visibleCount = config.sections.filter((s) => s.visible).length;
    const canHideMore = visibleCount > 2;

    const leftSections = useMemo(
        () =>
            config.sections
                .filter((s) => s.column === 'left' && s.visible)
                .sort((a, b) => a.order - b.order),
        [config.sections],
    );

    const rightSections = useMemo(
        () =>
            config.sections
                .filter((s) => s.column === 'right' && s.visible)
                .sort((a, b) => a.order - b.order),
        [config.sections],
    );

    const hiddenSections = config.sections
        .filter((s) => !s.visible)
        .map((s) => s.id);

    const renderColumn = (columnSections: typeof leftSections) =>
        columnSections.map((section) => (
            <DraggableSection
                key={section.id}
                id={section.id}
                onHide={() => handleHideSection(section.id)}
                canHide={canHideMore}
                hideable={!NON_HIDEABLE_SECTIONS.includes(section.id)}
                isAuthenticated={isAuthenticated}
            >
                {sections[section.id]}
            </DraggableSection>
        ));

    return (
        <>
            {isAuthenticated && (
                <HiddenSectionsDropdown
                    hiddenSections={hiddenSections}
                    onRestore={handleRestoreSection}
                />
            )}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <Row className="g-4">
                    <Col lg={8} xs={12} as="section" aria-label="Main content">
                        <SortableContext
                            items={leftSections.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="d-flex flex-column gap-4">
                                {renderColumn(leftSections)}
                            </div>
                        </SortableContext>
                    </Col>
                    <Col
                        lg={4}
                        xs={12}
                        as="aside"
                        aria-label="Stats and community"
                    >
                        <SortableContext
                            items={rightSections.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="d-flex flex-column gap-4">
                                {renderColumn(rightSections)}
                            </div>
                        </SortableContext>
                    </Col>
                </Row>
                <DragOverlay>
                    {activeId ? (
                        <div
                            style={{
                                opacity: 0.9,
                                transform: 'rotate(2deg)',
                                cursor: 'grabbing',
                            }}
                        >
                            {sections[activeId]}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </>
    );
};
