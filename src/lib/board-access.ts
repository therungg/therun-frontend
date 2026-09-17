/**
 * Whether this visitor may open the new board pages (game board, standings,
 * stats, races). Admin-only in production until launch; development shows
 * them to everyone. Every board page gates on this, and every public page
 * that links into a board asks it first — so launch is a change here.
 */
export function canSeeBoards(
    session: { roles?: string[] | null } | null | undefined,
): boolean {
    return (
        process.env.NODE_ENV !== 'production' ||
        !!session?.roles?.includes('admin')
    );
}
