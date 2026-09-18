'use client';

import { use, useEffect } from 'react';

/**
 * Renders nothing; waits for a server-handed promise and reports its value to
 * the shell. Used for the sidebar badges, which are data rather than markup —
 * the shell can't await the promise itself without blocking the whole console,
 * so it parks this inside its own Suspense boundary and takes the value when
 * it lands.
 */
export function StreamedValue<T>({
    promise,
    onValue,
}: {
    promise: Promise<T>;
    /** Must be stable (a state setter or a useCallback) — it is an effect dep. */
    onValue: (value: T) => void;
}) {
    const value = use(promise);
    useEffect(() => {
        onValue(value);
    }, [value, onValue]);
    return null;
}
