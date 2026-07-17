'use client';

import { useEffect, useRef } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { toggleFilterValue } from './filter-values';
import { useFilterNav } from './use-filter-nav';

interface Props {
    def: VariableDef;
    selectedValues: string[];
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

export function VariablePill({
    def,
    selectedValues,
    isOpen,
    onOpen,
    onClose,
}: Props) {
    const { setVarFilter, isPending } = useFilterNav();
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const container = containerRef.current;

        // Mouse/touch outside the dropdown closes it.
        const handlePointerDown = (e: MouseEvent) => {
            if (container && !container.contains(e.target as Node)) {
                onClose();
            }
        };
        // Keyboard focus leaving the dropdown (Tab past the last checkbox)
        // closes it too — relatedTarget is the element about to receive focus.
        const handleFocusOut = (e: FocusEvent) => {
            const next = e.relatedTarget as Node | null;
            if (container && !container.contains(next)) {
                onClose();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        container?.addEventListener('focusout', handleFocusOut);
        container?.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            container?.removeEventListener('focusout', handleFocusOut);
            container?.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const toggle = (v: string) => {
        setVarFilter(def.nameNormalized, toggleFilterValue(selectedValues, v));
    };

    const label =
        selectedValues.length === 0
            ? def.name
            : `${def.name}: ${selectedValues.join(', ')}`;

    return (
        <div className="position-relative" ref={containerRef}>
            <button
                type="button"
                ref={triggerRef}
                onClick={() => (isOpen ? onClose() : onOpen())}
                disabled={isPending}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`${styles.pill} ${selectedValues.length > 0 ? styles.pillActive : ''}`}
            >
                {label}
            </button>
            {isOpen && (
                <div className={styles.dropdownPanel}>
                    {def.values.map((bucket, idx) => {
                        const canonical = bucket[0];
                        return (
                            <label
                                key={`${def.nameNormalized}-${idx}`}
                                className="d-block"
                                title={
                                    bucket.length > 1
                                        ? `Aliases: ${bucket.slice(1).join(', ')}`
                                        : undefined
                                }
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(canonical)}
                                    onChange={() => toggle(canonical)}
                                    className="me-1"
                                />
                                {canonical}
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
