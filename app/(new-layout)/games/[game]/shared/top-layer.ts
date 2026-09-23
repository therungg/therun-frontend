const LAYER_SELECTOR = '[role="dialog"], [role="menu"]';

/**
 * Whether the overlay holding `el` is the top layer: no other dialog or menu
 * outside it comes after it in the document. Dialogs and popovers portal to
 * the end of the body as they open, so a later one sits on top. With no
 * dialog or menu around `el`, `el` itself stands for its layer.
 */
export function isTopLayer(el: Element | null): boolean {
    if (!el) return false;
    const own = el.closest(LAYER_SELECTOR) ?? el;
    for (const layer of document.querySelectorAll(LAYER_SELECTOR)) {
        if (layer === own || own.contains(layer)) continue;
        if (
            own.compareDocumentPosition(layer) &
            Node.DOCUMENT_POSITION_FOLLOWING
        ) {
            return false;
        }
    }
    return true;
}

/**
 * Whether this overlay should take an Escape: nobody took it yet and the
 * overlay is on top. The one that takes it marks it handled
 * (`preventDefault`), so one Escape closes one layer whatever order the
 * listeners run in.
 */
export function takeEscape(e: KeyboardEvent, el: Element | null): boolean {
    if (e.defaultPrevented || !isTopLayer(el)) return false;
    e.preventDefault();
    return true;
}
