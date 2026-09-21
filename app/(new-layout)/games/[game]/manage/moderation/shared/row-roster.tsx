'use client';

import { rendersAsRoster } from '~src/lib/run-view/roster';
import type { RunParticipant } from '../../../../../../../types/leaderboards.types';
import { RunnerIdentity } from '../../../leaderboard/runners';
import styles from './row-roster.module.scss';

interface Props {
    /** The row's roster. Absent means solo (guide §6a) and nothing renders. */
    participants: RunParticipant[] | null | undefined;
    /** Who filed the row — `runnerName`/`userId`, the pair every moderation
     * row shape carries. */
    filer: { runnerName: string; userId?: number | null };
    /**
     * Whether the names may be links. False inside a row that is itself one
     * big button: an anchor nested in a button is not a thing the browser can
     * hit-test, so those rows name the team in plain text and the sheet the
     * row opens carries the links.
     */
    links?: boolean;
}

/**
 * Who a moderation LIST row credits, compactly — so a moderator does not have
 * to open the sheet to see that a run is a team's.
 *
 * Renders nothing at all for a solo row (`rendersAsRoster`, the same test the
 * board row and the run page share), which keeps every existing row exactly
 * as it was. Names go through `RunnerIdentity` — the one way a runner is
 * drawn anywhere in this feature — so a roster on a queue row spells a person
 * the same way the board does.
 */
export function RowRoster({ participants, filer, links = true }: Props) {
    if (!rendersAsRoster(participants, filer)) return null;
    return (
        <span className={styles.roster}>
            {participants.map((member, i) => (
                <span key={memberKey(member, i)} className={styles.member}>
                    <RunnerIdentity
                        name={member.name}
                        picture={member.picture}
                        country={member.country}
                        size="xs"
                        // THE LINK RULE (guide §7): on `userId`, never on
                        // `isGuest` — a masked account keeps `isGuest: false`
                        // and arrives with no id, and linking it would undo
                        // the mask.
                        link={links && member.userId != null}
                        hoverCard={links && member.userId != null}
                    />
                    {i < participants.length - 1 && (
                        <span className={styles.sep} aria-hidden>
                            ·
                        </span>
                    )}
                </span>
            ))}
        </span>
    );
}

/** Two guests can share a name, so the index is part of the key. */
function memberKey(member: RunParticipant, index: number): string {
    return `${member.userId ?? 'g'}-${member.name}-${index}`;
}
