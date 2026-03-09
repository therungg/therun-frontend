'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { FaEyeSlash, FaGripVertical } from 'react-icons/fa6';
import styles from './draggable-section.module.scss';

interface DraggableSectionProps {
    id: string;
    children: ReactNode;
    onHide: () => void;
    canHide: boolean;
    hideable?: boolean;
    isAuthenticated: boolean;
}

export const DraggableSection: React.FC<DraggableSectionProps> = ({
    id,
    children,
    onHide,
    canHide,
    hideable = true,
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
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={styles.section}>
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
                    {hideable && (
                        <button
                            className={styles.hideButton}
                            onClick={onHide}
                            disabled={!canHide}
                            aria-label="Hide section"
                            title={
                                canHide
                                    ? 'Hide section'
                                    : 'At least 2 sections must be visible'
                            }
                        >
                            <FaEyeSlash />
                        </button>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};
