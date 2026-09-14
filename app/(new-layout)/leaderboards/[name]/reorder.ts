import type { DragEvent } from 'react';

/** Moves the item at `from` to `to`, returning a new array. */
export function move<T>(list: T[], from: number, to: number): T[] {
    if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= list.length ||
        to >= list.length
    ) {
        return list;
    }
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

export type DragList = 'pins' | 'games';

/** Namespaced drag payload so a pin card and a shelf tile never cross-drop. */
export function writeDragIndex(e: DragEvent, list: DragList, index: number) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ list, index }));
}

/** The dragged index, only when it came from the same list; else null. */
export function readDragIndex(e: DragEvent, list: DragList): number | null {
    let payload: unknown;
    try {
        payload = JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch {
        return null;
    }
    if (
        typeof payload !== 'object' ||
        payload === null ||
        (payload as { list?: unknown }).list !== list ||
        typeof (payload as { index?: unknown }).index !== 'number'
    ) {
        return null;
    }
    return (payload as { index: number }).index;
}
