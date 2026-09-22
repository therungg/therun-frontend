import { otherRosterMembers, rendersAsRoster } from '~src/lib/run-view/roster';
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
 *
 * A team's run credits every member with an account, not the filer alone
 * (docs/frontend-guide-co-op-runs.md §9, "Recent PBs" — this is exactly the
 * count that subsection calls out). A guest seat is never credited — nothing
 * to link the panel's `UserLink` to — and a filer who has since taken
 * themselves off the roster has no member row, so they drop out here too,
 * same as everywhere else this feature counts credit.
 *
 * A partner is counted only once the run actually credits them
 * (`partnersCredited`, guide §9): a pending co-op run is on its filer's feed
 * but on nobody else's profile, so counting its partners here would put
 * somebody in "Most active" on the strength of a run that has not reached
 * their profile and may never. The FILER is counted either way — it is their
 * own submission, pending or not — and a row with no flag counts nobody but
 * them.
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

        // The same test the board row and the run page use for "is this
        // run's credit the roster's to tell" — never a length check of its
        // own, which reads a one-member roster left behind by a removal as a
        // solo run.
        const filer = { runnerName: pb.username };
        const roster = rendersAsRoster(pb.participants, filer)
            ? pb.participants
            : null;
        // Everyone on the roster who is NOT the filer. They are counted only
        // when the run credits them; the filer is counted whenever they are
        // still on it.
        const partners = roster
            ? new Set(otherRosterMembers(roster, { name: pb.username }))
            : null;
        const credited = roster
            ? roster
                  .filter(
                      (m) =>
                          m.userId != null &&
                          (pb.partnersCredited === true || !partners?.has(m)),
                  )
                  .map((m) => ({
                      key: `u:${m.userId}`,
                      name: m.name,
                      picture: m.picture,
                  }))
            : // The solo path has no account id to key on — `username` is
              // `finished_runs.username`, a denormalised copy that can differ
              // in case from the same account's canonical name on a roster
              // row (guide §7). Keying on the lowercased name at least keeps
              // two solo PBs of the same account from splitting into two
              // rows; it can't merge with that account's co-op rows, which
              // key on id instead — a real gap, not one this feed can close.
              [
                  {
                      key: pb.username.toLowerCase(),
                      name: pb.username,
                      picture: pb.userPicture ?? null,
                  },
              ];

        for (const { key, name, picture } of credited) {
            const existing = byRunner.get(key);
            if (!existing) {
                byRunner.set(key, {
                    username: name,
                    picture,
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
                existing.picture = picture;
            }
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
