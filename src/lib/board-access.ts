/**
 * Whether this visitor may open the new board pages (game board, standings,
 * stats, races). Launched: everyone sees them. Every board page still asks,
 * and every public page that links into a board asks before drawing the link,
 * so this stays the one switch — flip it back to `preLaunch(session)` to pull
 * the boards from the public again.
 */
type SessionRoles = { roles?: string[] | null } | null | undefined;

/**
 * Admin-only in production, everyone in development: the pre-launch rule.
 *
 * Unused on purpose, and underscored so it stays that way without the linter
 * arguing. It is the switch the comment above describes — `canSeeBoards`
 * returns it instead of `true` to pull the boards back from the public — and
 * deleting it would mean writing the rule again from memory the day that is
 * wanted.
 */
function _preLaunch(session: SessionRoles): boolean {
    return (
        process.env.NODE_ENV !== 'production' ||
        !!session?.roles?.includes('admin')
    );
}

export function canSeeBoards(_session: SessionRoles): boolean {
    return true;
}
