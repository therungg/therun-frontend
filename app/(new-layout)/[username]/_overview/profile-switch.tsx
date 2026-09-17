import type { ReactNode } from 'react';
import { getSession } from '~src/actions/session.action';
import { canSeeBoards } from '~src/lib/board-access';
import { safeDecodeURI } from '~src/utils/uri';
import { RunnerOverview } from './runner-overview';

/**
 * Admins see the new overview, everyone else the stats page.
 * Development shows the overview to everyone, like the standings gate.
 */
export async function ProfileSwitch({
    username,
    legacy,
}: {
    username: string;
    legacy: ReactNode;
}) {
    const session = await getSession();
    const overview =
        process.env.NODE_ENV !== 'production' ||
        !!session?.roles?.includes('admin');
    if (!overview) return legacy;
    return (
        <RunnerOverview
            name={safeDecodeURI(username)}
            boardsVisible={canSeeBoards(session)}
        />
    );
}
