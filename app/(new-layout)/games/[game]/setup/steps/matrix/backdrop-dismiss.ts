import { type MouseEvent, useRef } from 'react';

/**
 * Backdrop handlers that close only on a click that started and ended on the
 * backdrop itself.
 *
 * A drag-select that begins in a textarea and is released past the dialog's
 * edge fires `click` on the backdrop (the nearest common ancestor), which
 * dismissed the dialog mid-edit and threw the text away.
 */
export function useBackdropDismiss(onDismiss: () => void) {
    const pressedOnBackdrop = useRef(false);
    return {
        onMouseDown: (e: MouseEvent<HTMLElement>) => {
            pressedOnBackdrop.current = e.target === e.currentTarget;
        },
        onClick: (e: MouseEvent<HTMLElement>) => {
            if (pressedOnBackdrop.current && e.target === e.currentTarget) {
                onDismiss();
            }
            pressedOnBackdrop.current = false;
        },
    };
}
