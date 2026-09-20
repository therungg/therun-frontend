import { RunnerIdentity } from '~app/(new-layout)/games/[game]/leaderboard/runners';
import type { RunParticipant } from '../../../../types/leaderboards.types';
import styles from './leaderboards-profile.module.scss';

/** Two guests can share a name, so the index is part of the key — same rule
 * as every other roster list in this feature. */
function memberKey(member: RunParticipant, index: number): string {
    return `${member.userId ?? 'g'}-${member.name}-${index}`;
}

/**
 * "with X" / "with X and Y" / "with X, Y and Z" — the other runners credited
 * on a co-op PB, next to the row that already belongs to the profile's own
 * owner.
 *
 * `partners` is already the OTHER members, not the whole roster (guide §9) —
 * do not filter it again. Absent or empty renders nothing: the row reads
 * exactly as a solo PB does today.
 *
 * Drawn through `RunnerIdentity`, the one way a runner is drawn anywhere in
 * this feature, so a partner never spells or masks a name differently from
 * the same person on a board row.
 */
export function Partners({ partners }: { partners?: RunParticipant[] }) {
    if (!partners || partners.length === 0) return null;
    return (
        <span className={styles.runPartners}>
            with{' '}
            {partners.map((member, i) => {
                const isLast = i === partners.length - 1;
                const isSecondLast = i === partners.length - 2;
                return (
                    <span
                        key={memberKey(member, i)}
                        className={styles.runPartner}
                    >
                        <RunnerIdentity
                            name={member.name}
                            picture={member.picture}
                            country={member.country}
                            size="xs"
                            // THE LINK RULE (guide §7): link on `userId`,
                            // never on `isGuest` — a masked account keeps
                            // `isGuest: false` and arrives with a null id.
                            link={member.userId != null}
                            hoverCard={member.userId != null}
                        />
                        {!isLast ? (isSecondLast ? ' and ' : ', ') : null}
                    </span>
                );
            })}
        </span>
    );
}
