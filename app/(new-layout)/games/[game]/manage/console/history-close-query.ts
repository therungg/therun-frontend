// What the `/manage` URL should become when the History drawer closes.
//
// The drawer can arrive at `?pane=history` two ways that both leave
// `activeItem` `null` (`history` is a NON_LANDING id — see nav-model.ts):
// the sub-route "History" sidebar item and the all-clear "Review history"
// link in needs-attention.tsx. Restoring the URL only when `activeItem` was
// non-null left both stranded on `?pane=history` after close — a reload or
// Back/Forward would re-open the drawer, and Needs attention would dump the
// viewer on the grid instead of back on the queue.

import type { NavItemId } from './nav-model';

/**
 * Returns the query string `/manage` should carry after the drawer closes,
 * or `null` when it should be the bare path (an empty query string is a
 * dangling `?`, not a real URL).
 *
 * Only rewrites `pane` when the current URL actually reflects the history
 * overlay (`?pane=history`); anything else means the drawer was opened
 * without touching the URL (the sidebar's History item while another pane
 * was active), so the existing query already describes reality and is
 * returned unchanged.
 *
 * When the URL is `?pane=history`: a non-null `activeItem` is the pane that
 * was showing underneath and goes back into `pane`; a null `activeItem`
 * (the grid) means `pane` should be removed entirely. Every other param
 * (e.g. `kind`) is preserved unchanged either way.
 */
export function historyCloseQuery(
    searchParams: URLSearchParams | string,
    activeItem: NavItemId | null,
): string | null {
    const params = new URLSearchParams(searchParams);

    if (params.get('pane') !== 'history') {
        const unchanged = params.toString();
        return unchanged.length > 0 ? unchanged : null;
    }

    if (activeItem) {
        params.set('pane', activeItem);
    } else {
        params.delete('pane');
    }

    const query = params.toString();
    return query.length > 0 ? query : null;
}
