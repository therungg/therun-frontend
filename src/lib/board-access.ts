/**
 * Whether this visitor may open the new board pages (game board, standings,
 * stats, races). Launched: everyone sees them. Every board page still asks,
 * and every public page that links into a board asks before drawing the link,
 * so this stays the one switch — flip it back to `preLaunch(session)` to pull
 * the boards from the public again.
 */
type SessionRoles = { roles?: string[] | null } | null | undefined;

/** Admin-only in production, everyone in development: the pre-launch rule. */
function preLaunch(session: SessionRoles): boolean {
    return (
        process.env.NODE_ENV !== 'production' ||
        !!session?.roles?.includes('admin')
    );
}

export function canSeeBoards(_session: SessionRoles): boolean {
    return true;
}

/**
 * Whether this visitor gets the new runner overview on `/<name>` instead of
 * the stats page. Its own launch, separate from the boards', still on the
 * pre-launch rule.
 */
export function canSeeRunnerOverview(session: SessionRoles): boolean {
    return preLaunch(session);
}
