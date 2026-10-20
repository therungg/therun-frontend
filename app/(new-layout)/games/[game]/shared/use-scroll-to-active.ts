import { type RefObject, useEffect } from 'react';

export function useScrollToActive(
    ref: RefObject<HTMLElement | null>,
    selector: string,
    activeKey: unknown,
) {
    useEffect(() => {
        const el = ref.current;
        const active = el?.querySelector<HTMLElement>(selector);
        if (!el || !active) return;
        const box = el.getBoundingClientRect();
        const item = active.getBoundingClientRect();
        if (item.left >= box.left && item.right <= box.right) return;
        el.scrollLeft += item.left - box.left - 16;
    }, [ref, selector, activeKey]);
}
