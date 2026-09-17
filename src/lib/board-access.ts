/**
 * Whether this visitor may open the new board pages (game board, standings,
 * stats, races). Admin-only in production until launch; development shows
 * them to everyone. Every board page gates on this, and every public page
 * that links into a board asks it first — so launch is a change here.
 */
type SessionRoles = { roles?: string[] | null } | null | undefined;

/** Admin-only in production, everyone in development: the pre-launch rule. */
function preLaunch(session: SessionRoles): boolean {
    return (
        process.env.NODE_ENV !== 'production' ||
        !!session?.roles?.includes('admin')
    );
}

export function canSeeBoards(session: SessionRoles): boolean {
    return preLaunch(session);
}

/**
 * Whether this visitor gets the new runner overview on `/<name>` instead of
 * the stats page. Its own launch, separate from the boards', on the same
 * pre-launch rule for now.
 */
export function canSeeRunnerOverview(session: SessionRoles): boolean {
    return preLaunch(session);
}
