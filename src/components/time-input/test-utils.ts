import { fireEvent } from '@testing-library/react';

/**
 * Types digits into a DurationField the way a user does: one keystroke at a
 * time, filling from the right. `1:23:45` is the digits `12345`, and `.` opens
 * the fraction.
 *
 * Tests cannot hand the field a formatted string in one `change` event — it
 * reads a single keystroke off the right edge, so `'35:48'` would register
 * only as the `8`.
 */
export function typeDuration(input: HTMLElement, keys: string) {
    const el = input as HTMLInputElement;
    for (const ch of keys) {
        fireEvent.change(el, { target: { value: el.value + ch } });
    }
}

/**
 * Empties a DurationField. One `change` to `''` would only register as a
 * single backspace, so this presses backspace until the field is clear.
 */
export function clearDuration(input: HTMLElement) {
    const el = input as HTMLInputElement;
    let guard = 0;
    while (el.value !== '' && guard++ < 20) {
        fireEvent.change(el, { target: { value: el.value.slice(0, -1) } });
    }
}
