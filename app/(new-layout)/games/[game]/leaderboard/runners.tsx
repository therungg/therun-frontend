'use client';

import { UserLink } from '~src/components/links/links';
import type {
    LeaderboardEntry,
    RunParticipant,
} from '../../../../../types/leaderboards.types';
import { CountryFlag } from './country-flag';
import styles from './leaderboard.module.scss';
import { RunnerAvatar } from './runner-avatar';

/** Names shown inline before the rest fold into a +N chip. */
const INLINE_NAMES = 2;

interface Props {
    entry: LeaderboardEntry;
    gameSlug: string;
    /** The ranked time, for the solo hover card's identity line. */
    timeMs?: number;
    /** Moderator's way into the Runner tab; solo rows only — a roster has no
     * single runner to act on. */
    moderate?: { label: string; onOpen: () => void };
}

/**
 * Who a board row credits.
 *
 * One runner renders exactly what the row has always rendered: avatar, name,
 * flag — nothing about a solo row moves, and a run with no roster does not
 * carry `participants` at all (absent means solo; see
 * docs/frontend-guide-co-op-runs.md §1).
 *
 * Two or more renders the whole roster instead of the filer alone, which is
 * the point: the board deduplicates by team now, so several rows legitimately
 * credit the same person with different partners, and naming only the filer on
 * each of them reads as a bug.
 *
 * The cell sits in a strict table grid that must not wrap, so the roster is
 * capped: two names inline, the rest behind a +N chip that names them on
 * hover. Two names is about as wide as one long username, which the cell
 * already survives.
 */
export function Runners({ entry, gameSlug, timeMs, moderate }: Props) {
    // Redacted rows arrive with the placeholder name and no roster at all —
    // a hidden result names nobody. Always keyed off the flag, never the name.
    const isAnonymous = entry.anonymized === true;
    const roster = entry.participants;

    // A one-member roster lays out like a solo row, and when that member is
    // the filer it IS the solo row — keep the avatar, flag and hover-card
    // context the row already has rather than dropping them.
    const onlyMember = roster?.length === 1 ? roster[0] : null;
    const rosterIsFiler =
        onlyMember != null &&
        onlyMember.name === entry.runnerName &&
        (onlyMember.userId ?? null) === (entry.userId ?? null);

    if (isAnonymous) {
        return (
            <>
                <RunnerAvatar
                    name={entry.runnerName}
                    picture={entry.picture}
                    size="sm"
                    anonymous
                />
                {/* No profile link, no flag: the row keeps its rank, its time
                    and its history, and gives up every route back to a
                    person. The name is a name — muted, but not greyed to
                    unreadable and not italicised. */}
                <span className={styles.anonName}>{entry.runnerName}</span>
            </>
        );
    }

    if (roster == null || roster.length === 0 || rosterIsFiler) {
        return (
            <>
                <RunnerAvatar
                    name={entry.runnerName}
                    picture={entry.picture}
                    size="sm"
                />
                <UserLink
                    username={entry.runnerName}
                    url={undefined}
                    to="leaderboards"
                    // A guest has no account behind the name, so there is no
                    // card to open.
                    hoverCard={!entry.isGuest}
                    // The row already holds everything the hover card's
                    // identity line needs, so it paints before the card's own
                    // fetch resolves.
                    cardContext={{
                        rank: entry.rank,
                        timeMs,
                        picture: entry.picture,
                        country: entry.country,
                        gameSlug,
                    }}
                    moderate={moderate}
                />
                <CountryFlag country={entry.country} />
            </>
        );
    }

    const shown = roster.slice(0, INLINE_NAMES);
    const rest = roster.slice(INLINE_NAMES);
    // `picture` and `country` belong to the filer, not to the run's runners.
    // The avatar is drawn from the leading name and only carries the filer's
    // picture when the filer leads; the flag is dropped entirely rather than
    // hung off somebody else's name.
    const leadPicture =
        shown[0].name === entry.runnerName ? entry.picture : null;

    return (
        <>
            <RunnerAvatar
                name={shown[0].name}
                picture={leadPicture}
                size="sm"
            />
            <span className={styles.runners}>
                {shown.map((member, i) => (
                    <span
                        key={memberKey(member, i)}
                        className={styles.rosterName}
                    >
                        {i > 0 && (
                            <span className={styles.runnerSep} aria-hidden>
                                +
                            </span>
                        )}
                        <MemberName member={member} />
                    </span>
                ))}
                {rest.length > 0 && (
                    <span
                        className={styles.runnerMore}
                        title={rest.map((m) => m.name).join(', ')}
                    >
                        +{rest.length}
                    </span>
                )}
            </span>
        </>
    );
}

/**
 * A member with an id links to their profile. A null id is a guest OR an
 * account masked on this board — the payload cannot tell them apart, on
 * purpose — and neither one links.
 */
function MemberName({ member }: { member: RunParticipant }) {
    if (member.userId == null) {
        return <span className={styles.guestName}>{member.name}</span>;
    }
    return (
        <UserLink
            username={member.name}
            url={undefined}
            to="leaderboards"
            hoverCard={!member.isGuest}
        />
    );
}

/** Two guests can share a name, so the index is part of the key. */
function memberKey(member: RunParticipant, index: number): string {
    return `${member.userId ?? 'g'}-${member.name}-${index}`;
}
