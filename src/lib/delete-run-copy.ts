/**
 * What deleting a run takes with it, in one sentence for the confirm dialog.
 *
 * `where` finishes "every statistic …": "on this page", "behind Any%". The
 * leaderboard clause is only true when this run is the one holding the
 * board entry; a run that never made the board, or that a faster run has
 * since replaced there, leaves the board exactly as it is.
 */
export function deleteRunMessage(
    where: string,
    holdsBoardEntry: boolean,
): string {
    const base = `The splits, the history and every statistic ${where} go with it`;
    if (!holdsBoardEntry) {
        return `${base}. This cannot be undone.`;
    }
    return `${base}, and so does your entry on the leaderboard: your place there is removed, and your next-best run takes it if you have one. This cannot be undone.`;
}
