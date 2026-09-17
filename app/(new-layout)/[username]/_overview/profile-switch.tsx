import type { ReactNode } from 'react';
import { getSession } from '~src/actions/session.action';
import { canSeeBoards, canSeeRunnerOverview } from '~src/lib/board-access';
import { safeDecodeURI } from '~src/utils/uri';
import { RunnerOverview } from './runner-overview';

/**
 * Admins see the new overview, everyone else the stats page
 * (`canSeeRunnerOverview`).
 */
export async function ProfileSwitch({
    username,
    legacy,
}: {
    username: string;
    legacy: ReactNode;
}) {
    const session = await getSession();
    if (!canSeeRunnerOverview(session)) return legacy;
    return (
        <RunnerOverview
            name={safeDecodeURI(username)}
            boardsVisible={canSeeBoards(session)}
        />
    );
}
