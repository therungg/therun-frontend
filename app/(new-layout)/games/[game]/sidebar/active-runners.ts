import type { RecentPb } from '../../../../../types/leaderboards.types';

/** How far back "active" reaches. */
export const ACTIVE_WINDOW_DAYS = 30;

/**
 * Fewer than this and the panel doesn't render. One name under a heading
 * reading "Most active" is the empty-panel problem wearing a hat.
 */
export const MIN_ACTIVE_RUNNERS = 2;

export interface ActiveRunner {
    username: string;
    /**
     * Avatar off their most recent PB row in the window. The feed carries it
     * per row, so a runner anonymized on one board still shows the picture
     * their other rows publish — take the latest, which is the row the panel
     * dates itself by.
     */
    picture?: string | null;
    pbs: number;
    /** Boards they PB'd on in the window, most recent first. */
    categories: string[];
    /** Their most recent PB in the window, for tie-breaking and display. */
    latestAt: string;
}

/**
 * Who has been setting PBs on this game lately.
 *
 * Derived from the Recent PBs feed the rail already fetches — deliberately
 * NOT a measure of attempt volume or playtime, which would need a backend
 * aggregate this page has no endpoint for. That's why the panel is titled by
 * what this actually counts ("PBs in the last 30 days") rather than by a
 * broader claim about activity.
 *
 * `pbs` is the number of PB rows in the window, so a runner improving the
 * same board four times counts four times. That's the intended reading:
 * repeat improvement is exactly the activity worth surfacing.
 */
export function deriveActiveRunners(
    pbs: RecentPb[],
    limit = 5,
    now: Date = new Date(),
): ActiveRunner[] {
    const cutoff = now.getTime() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const byRunner = new Map<string, ActiveRunner>();

    for (const pb of pbs) {
        const at = Date.parse(pb.endedAt);
        // An unparseable date can't be placed in the window; counting it
        // would let a malformed row inflate someone's total forever.
        if (Number.isNaN(at) || at < cutoff) continue;

        const existing = byRunner.get(pb.username);
        if (!existing) {
            byRunner.set(pb.username, {
                username: pb.username,
                picture: pb.userPicture,
                pbs: 1,
                categories: pb.category ? [pb.category] : [],
                latestAt: pb.endedAt,
            });
            continue;
        }
        existing.pbs += 1;
        if (pb.category && !existing.categories.includes(pb.category)) {
            existing.categories.push(pb.category);
        }
        if (Date.parse(existing.latestAt) < at) {
            existing.latestAt = pb.endedAt;
            existing.picture = pb.userPicture;
        }
    }

    return [...byRunner.values()]
        .sort(
            (a, b) =>
                b.pbs - a.pbs ||
                Date.parse(b.latestAt) - Date.parse(a.latestAt) ||
                a.username.localeCompare(b.username),
        )
        .slice(0, limit);
}
