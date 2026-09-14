'use client';

import { DurationToFormatted } from '~src/components/util/datetime';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type { WorklistSelfClaim } from '../../../../../../../types/worklist.types';
import { ManualTimeVerdictRow } from '../attention/manual-time-verdict-row';
import {
    ageTone,
    boardLabel,
    trackRecordLine,
    waitingLabel,
} from './worklist-model';
import styles from './worklist-pane.module.scss';

/**
 * A time a runner typed in themselves. There is no run behind it, so no
 * inspector and no splits: the evidence link and the runner's note are what a
 * moderator has, and the decision is verify or reject.
 */
export function SelfClaimRow({
    claim,
    gameSlug,
    variables,
    now,
    onDone,
}: {
    claim: WorklistSelfClaim;
    gameSlug: string;
    variables: VariableRow[];
    now: Date;
    onDone: () => void;
}) {
    const tone = ageTone(claim.createdAt, now);
    const record = trackRecordLine(claim.trackRecord);
    return (
        <li className={`${styles.row} ${styles[`row_${tone}`]}`}>
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
                <ManualTimeVerdictRow
                    gameSlug={gameSlug}
                    manualTimeId={claim.manualTimeId}
                    onDone={onDone}
                />
            </div>
        </li>
    );
}
