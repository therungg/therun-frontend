'use client';

import { DurationToFormatted } from '~src/components/util/datetime';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type { WorklistSelfClaim } from '../../../../../../../types/worklist.types';
import {
    ageTone,
    boardLabel,
    claimQueueKey,
    trackRecordLine,
    waitingLabel,
} from './worklist-model';
import styles from './worklist-pane.module.scss';

/**
 * A time a runner typed in themselves. There is no run behind it, so no
 * inspector and no splits: the evidence link and the runner's note are what a
 * moderator has. Moderate opens the modal on the claim.
 */
export function SelfClaimRow({
    claim,
    variables,
    now,
    focused = false,
    onModerate,
}: {
    claim: WorklistSelfClaim;
    variables: VariableRow[];
    now: Date;
    focused?: boolean;
    onModerate: (claim: WorklistSelfClaim) => void;
}) {
    const tone = ageTone(claim.createdAt, now);
    const record = trackRecordLine(claim.trackRecord);
    return (
        <li
            className={`${styles.row} ${styles[`row_${tone}`] ?? ''}`}
            data-queue-key={claimQueueKey(claim)}
            data-focused={focused || undefined}
            tabIndex={-1}
        >
            <div className={styles.rowMain}>
                <span
                    className={`${styles.age} ${styles[`age_${tone}`]}`}
                    suppressHydrationWarning
                >
                    {waitingLabel(claim.createdAt, now)}
                </span>
                <span className={styles.runner}>
                    <span className={styles.runnerName}>
                        {claim.runnerName}
                        {claim.isGuest && (
                            <span className={styles.pill}>Guest</span>
                        )}
                    </span>
                    {record && <span className={styles.meta}>{record}</span>}
                </span>
                <span className={styles.board}>
                    <span>{boardLabel(claim, variables)}</span>
                    {claim.runDate && (
                        <span className={styles.meta}>
                            got it {claim.runDate.slice(0, 10)}
                        </span>
                    )}
                </span>
                <span className={styles.time}>
                    <DurationToFormatted duration={claim.timeMs} />
                    <span className={styles.meta}>
                        {claim.timing === 'gametime'
                            ? 'game time'
                            : 'real time'}
                    </span>
                </span>
                <span className={styles.vod}>
                    {claim.evidenceUrl ? (
                        <a
                            className={styles.pill}
                            href={claim.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Evidence
                        </a>
                    ) : (
                        <span className={`${styles.pill} ${styles.pillMuted}`}>
                            No evidence
                        </span>
                    )}
                </span>
            </div>

            <div className={styles.reasons}>
                <span className={`${styles.reason} ${styles.reason_high}`}>
                    Typed in their own time
                </span>
                {claim.note && (
                    <span className={styles.meta}>“{claim.note}”</span>
                )}
            </div>

            <div className={styles.verbs}>
                <button
                    type="button"
                    className={styles.verb}
                    onClick={() => onModerate(claim)}
                >
                    Moderate
                </button>
            </div>
        </li>
    );
}
