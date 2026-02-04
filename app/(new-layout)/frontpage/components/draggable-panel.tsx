'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';
import { FaEyeSlash, FaGripVertical } from 'react-icons/fa6';
import styles from './draggable-panel.module.scss';

interface DraggablePanelProps {
    id: string;
    children: ReactNode;
    onHide: () => void;
    canHide: boolean;
    hideable?: boolean;
    isAuthenticated: boolean;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
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
                    {hideable && (
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
                    )}
                </div>
            )}
            {children}
        </div>
    );
};
