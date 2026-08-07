'use client';

import { PropsWithChildren } from 'react';
import { SessionErrorBoundary } from '~src/components/errors/session.error-boundary';
import { useSession } from '~src/components/session-provider';

// Replaces the page with the session-reset prompt when the client-side
// session fetch reports a broken session. Lives below the static shell so
// the check no longer forces every page to render dynamically.
export function SessionErrorGate({ children }: PropsWithChildren) {
    const session = useSession();

    return session.sessionError ? <SessionErrorBoundary /> : children;
}
