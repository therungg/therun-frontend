'use client';

import { useId } from 'react';
import type { RejectionReasonKey } from '../../../../../../../types/moderation.types';
import styles from './reason-key-picker.module.scss';
import { REJECTION_REASONS } from './rejection-reasons';

/**
 * One choice from a closed list. A radio group, not a select: six options fit
 * on screen and a moderator declining their hundredth run should not have to
 * open a menu to see them.
 */
export function ReasonKeyPicker({
    value,
    onChange,
    disabled = false,
}: {
    value: RejectionReasonKey | null;
    onChange: (key: RejectionReasonKey) => void;
    disabled?: boolean;
}) {
    const name = useId();
    return (
        <fieldset className={styles.group} disabled={disabled}>
            <legend className={styles.legend}>
                Why are you declining this?
            </legend>
            {REJECTION_REASONS.map((r) => (
                <label
                    key={r.key}
                    className={styles.option}
                    data-selected={value === r.key}
                >
                    <input
                        type="radio"
                        name={name}
                        value={r.key}
                        checked={value === r.key}
                        onChange={() => onChange(r.key)}
                    />
                    <span>{r.label}</span>
                </label>
            ))}
        </fieldset>
    );
}
