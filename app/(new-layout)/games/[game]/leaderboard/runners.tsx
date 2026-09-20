'use client';

import { UserLink } from '~src/components/links/links';
import { rosterIsSoloFiler } from '~src/lib/run-view/roster';
import type {
    LeaderboardEntry,
    RunParticipant,
} from '../../../../../types/leaderboards.types';
import type { UserCardContext } from '../../../../../types/user-card.types';
import { CountryFlag } from './country-flag';
import styles from './leaderboard.module.scss';
import { RunnerAvatar } from './runner-avatar';

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
 * Everyone credited is named — no cap and no +N chip. The cell wraps onto a
 * second line when a big roster needs it and the row grows to fit: a td's
 * `height` is a minimum in table layout, so nothing clips and every other
 * column keeps its own alignment.
 */
export function Runners({ entry, gameSlug, timeMs, moderate }: Props) {
    // Redacted rows arrive with the placeholder name and no roster at all —
    // a hidden result names nobody. Always keyed off the flag, never the name.
    const isAnonymous = entry.anonymized === true;
    const roster = entry.participants;

    // A one-member roster lays out like a solo row, and when that member is
    // the filer it IS the solo row — keep the avatar, flag and hover-card
    // context the row already has rather than dropping them. A one-member
    // roster that is NOT the filer is a run someone took themselves off, and
    // falling back to `runnerName` there names the person who left.
    //
    // The run page's hero makes the same decision, from the same helper, so
    // the two cannot drift.
    const rosterIsFiler = rosterIsSoloFiler(roster, entry);

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
            <RunnerIdentity
                name={entry.runnerName}
                picture={entry.picture}
                country={entry.country}
                size="sm"
                // Unchanged from before the roster existed: the filer's name
                // is always a link, and only the hover card drops away for a
                // guest, who has no account behind the name.
                link
                hoverCard={!entry.isGuest}
                // The row already holds everything the hover card's identity
                // line needs, so it paints before the card's own fetch
                // resolves.
                cardContext={{
                    rank: entry.rank,
                    timeMs,
                    picture: entry.picture,
                    country: entry.country,
                    gameSlug,
                }}
                moderate={moderate}
            />
        );
    }

    return (
        <span className={styles.runners}>
            {roster.map((member, i) => (
                <span key={memberKey(member, i)} className={styles.rosterName}>
                    {/* A member carries their OWN picture and country, so each
                        one renders the same three things a solo runner does —
                        through the same component, so the two cannot drift.
                        Smaller avatar: a roster puts several of them on a line
                        that used to hold one. */}
                    <RunnerIdentity
                        name={member.name}
                        picture={member.picture}
                        country={member.country}
                        size="xs"
                        // THE LINK RULE (guide §7): link on `userId`, never on
                        // `isGuest`. A masked account keeps `isGuest: false`
                        // and arrives with a null id — linking it would
                        // re-resolve the identity the mask exists to hide.
                        link={member.userId != null}
                        hoverCard={member.userId != null}
                        cardContext={{
                            rank: entry.rank,
                            timeMs,
                            picture: member.picture,
                            country: member.country,
                            gameSlug,
                        }}
                    />
                    {/* The middot travels with the name BEFORE it, so a wrap
                        never drops a separator onto the start of a line. */}
                    {i < roster.length - 1 && (
                        <span className={styles.runnerSep} aria-hidden>
                            ·
                        </span>
                    )}
                </span>
            ))}
        </span>
    );
}

interface IdentityProps {
    name: string;
    picture?: string | null;
    country?: string | null;
    size: 'xs' | 'sm' | 'md';
    /**
     * Whether this name carries a profile link and a flag. False renders a
     * plain label — a guest, or an account masked on this board.
     */
    link: boolean;
    /** Whether the link opens a hover card. Ignored when `link` is false. */
    hoverCard: boolean;
    /** What the surrounding surface already knows about this runner. Omitted
     * where it knows nothing worth painting early (the run page's roster). */
    cardContext?: UserCardContext;
    moderate?: { label: string; onOpen: () => void };
}

/**
 * Avatar, name, flag — the three things a runner is on a board row. The solo
 * row and every roster member render through here, because a second copy of
 * this is the bug this feature keeps producing.
 *
 * An unlinked name still gets its avatar, so the roster keeps its rhythm
 * rather than going ragged where a guest sits. It gets no flag: the backend
 * nulls `country` alongside `userId` on a masked member, but the rule is
 * structural here rather than trusted to the payload.
 *
 * Exported because the run page's hero and its Runners panel credit the same
 * people the board row does, and a roster that spells a runner differently
 * from the board it sits on is the bug this component exists to prevent.
 */
export function RunnerIdentity({
    name,
    picture,
    country,
    size,
    link,
    hoverCard,
    cardContext,
    moderate,
}: IdentityProps) {
    return (
        <>
            <RunnerAvatar name={name} picture={picture} size={size} />
            {link ? (
                <>
                    <UserLink
                        username={name}
                        url={undefined}
                        to="leaderboards"
                        hoverCard={hoverCard}
                        cardContext={cardContext}
                        moderate={moderate}
                    />
                    <CountryFlag country={country} />
                </>
            ) : (
                <span className={styles.guestName}>{name}</span>
            )}
        </>
    );
}

/** Two guests can share a name, so the index is part of the key. */
function memberKey(member: RunParticipant, index: number): string {
    return `${member.userId ?? 'g'}-${member.name}-${index}`;
}
