import { Fragment } from 'react';
import { RunnerIdentity } from '~app/(new-layout)/games/[game]/leaderboard/runners';
import { namedPartners } from '~src/lib/run-view/roster';
import type { RunParticipant } from '../../../../types/leaderboards.types';
import styles from './leaderboards-profile.module.scss';

/** Two guests can share a name, so the index is part of the key — same rule
 * as every other roster list in this feature. */
function memberKey(member: RunParticipant, index: number): string {
    return `${member.userId ?? 'g'}-${member.name}-${index}`;
}

// Non-breaking spaces (U+00A0), not plain ones: these separators are text
// nodes sitting next to a flex item (`.runPartner`, the avatar+name+flag
// group), and a plain space at that boundary collapses under normal
// whitespace processing — it silently disappears there
// ("withjoeyandzoe"). A non-breaking space is never collapsed, so the
// words stay separated regardless of what sits next to them.
const WITH = 'with\u00a0';
const COMMA = ',\u00a0';
const AND = '\u00a0and\u00a0';

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
    // The same split every "with …" line takes (`namedPartners`), so a row of
    // avatars truncates exactly where a line of text would.
    const { shown, more } = namedPartners(partners);
    const tail = more > 0 ? `${more}\u00a0more` : null;
    // The count, when there is one, is the last item in the list — so the
    // "and" belongs before IT, not before the last named runner.
    const total = shown.length + (tail ? 1 : 0);
    return (
        <span className={styles.runPartners}>
            {WITH}
            {shown.map((member, i) => {
                const isLast = i === total - 1;
                const isSecondLast = i === total - 2;
                return (
                    <Fragment key={memberKey(member, i)}>
                        <span className={styles.runPartner}>
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
                        </span>
                        {!isLast ? (isSecondLast ? AND : COMMA) : null}
                    </Fragment>
                );
            })}
            {tail}
        </span>
    );
}
