'use client';

import { useEffect, useRef } from 'react';
import styles from './variables-grid.module.scss';

/**
 * A checkbox that can show the third, "some but not all" state — for the grid's
 * column and whole-grid select-all controls. `indeterminate` is a DOM property
 * with no HTML attribute, so it must be set through a ref.
 */
export function TriCheckbox({
    checked,
    indeterminate,
    disabled,
    onChange,
    ariaLabel,
    className,
}: {
    checked: boolean;
    indeterminate: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
    ariaLabel: string;
    className?: string;
}) {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate && !checked;
    }, [indeterminate, checked]);
    return (
        <input
            ref={ref}
            type="checkbox"
            className={className}
            disabled={disabled}
            checked={checked}
            aria-label={ariaLabel}
            onChange={(e) => onChange(e.target.checked)}
        />
    );
}
