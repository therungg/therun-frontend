'use client';

import { useLinkStatus } from 'next/link';

/**
 * Drawn inside a `<Link>` while the navigation it started is in flight, and
 * nothing otherwise. For links that only change the query on the game route:
 * those never show the route's loading skeleton, so without this the click
 * looks ignored until the next board renders.
 */
export function LinkPending({ className }: { className: string }) {
    const { pending } = useLinkStatus();
    return pending ? <span aria-hidden className={className} /> : null;
}
