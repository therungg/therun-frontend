'use client';

import { useState } from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type { AutoVerifyResult } from '../../../../../../../types/moderation.types';
import type { WorklistItem } from '../../../../../../../types/worklist.types';
import { AutoVerifyBreakdown } from '../../../run-view/run-badges';
import { RowRoster } from '../shared/row-roster';
import {
    ageTone,
    boardLabel,
    boardTimeMs,
    deltaLabel,
    reasonLabel,
    runQueueKey,
    trackRecordLine,
    waitingLabel,
} from './worklist-model';
import styles from './worklist-pane.module.scss';

export function WorklistRow({
    item,
    now,
    busy,
    focused = false,
    onApprove,
    onInspect,
    variables,
}: {
    item: WorklistItem;
    /** The game's variables — names the run's subcategory beside its category. */
    variables: VariableRow[];
    now: Date;
    busy: boolean;
    /** The keyboard is on this row: show its keys on the verbs. */
    focused?: boolean;
    onApprove: (item: WorklistItem) => void;
    /** Opens the moderate modal on this run. */
    onInspect: (item: WorklistItem) => void;
}) {
    const [showChecks, setShowChecks] = useState(false);
    const tone = ageTone(item.waitingSince, now);
    const delta = deltaLabel(item);
    const record = trackRecordLine(item.trackRecord);
    const hasChecks = item.autoVerifyResult != null;

    return (
        <li
            className={`${styles.row} ${styles[`row_${tone}`] ?? ''}`}
            data-queue-key={runQueueKey(item)}
            data-focused={focused || undefined}
            tabIndex={-1}
        >
            <button
                type="button"
                className={styles.rowMain}
                onClick={() => onInspect(item)}
                aria-label={`Open ${item.runnerName}'s run on ${boardLabel(item, variables)}`}
            >
                <span className={`${styles.age} ${styles[`age_${tone}`]}`}>
                    {waitingLabel(item.waitingSince, now)}
                </span>
                <span className={styles.runner}>
                    <span className={styles.runnerName}>
                        {item.runnerName}
                        {item.isGuest && (
                            <span className={styles.pill}>Guest</span>
                        )}
                    </span>
                    {/* Who the run credits, when that is not the filer alone.
                        Unlinked: the whole row is one button. */}
                    <RowRoster
                        participants={item.participants}
                        filer={item}
                        links={false}
                    />
                    {record && <span className={styles.meta}>{record}</span>}
                </span>
                <span className={styles.board}>
                    <span>{boardLabel(item, variables)}</span>
                    <span className={styles.meta}>
                        would be #{item.wouldBeRank}
                    </span>
                </span>
                <span className={styles.time}>
                    <DurationToFormatted duration={boardTimeMs(item)} />
                    {delta && <span className={styles.meta}>{delta}</span>}
                </span>
                <span className={styles.vod}>
                    {item.vodUrl ? (
                        <span className={styles.pill}>VOD</span>
                    ) : (
                        <span className={`${styles.pill} ${styles.pillMuted}`}>
                            No VOD
                        </span>
                    )}
                </span>
            </button>

            <div className={styles.reasons}>
                {item.reasons.map((r) => (
                    <span
                        key={`${r.reason}:${r.flagId ?? 'derived'}`}
                        className={`${styles.reason} ${styles[`reason_${r.severity}`]}`}
                    >
                        {reasonLabel(r)}
                    </span>
                ))}
                {hasChecks && (
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setShowChecks((v) => !v)}
                        aria-expanded={showChecks}
                    >
                        {showChecks ? 'Hide checks' : 'Checks'}
                    </button>
                )}
            </div>

            <div className={styles.verbs}>
                <button
                    type="button"
                    className={styles.verbApprove}
                    disabled={busy || item.verificationStatus === 'verified'}
                    onClick={() => onApprove(item)}
                >
                    Verify
                    {focused && <kbd className={styles.kbd}>a</kbd>}
                </button>
                <button
                    type="button"
                    className={styles.verb}
                    disabled={busy}
                    onClick={() => onInspect(item)}
                >
                    Moderate
                    {focused && <kbd className={styles.kbd}>Enter</kbd>}
                </button>
            </div>

            {showChecks && hasChecks && (
                <div className={styles.checks}>
                    <AutoVerifyBreakdown
                        result={item.autoVerifyResult as AutoVerifyResult}
                    />
                </div>
            )}
        </li>
    );
}
