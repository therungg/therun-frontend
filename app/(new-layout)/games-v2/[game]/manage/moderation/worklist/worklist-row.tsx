'use client';

import { useState } from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type { AutoVerifyResult } from '../../../../../../../types/moderation.types';
import type { WorklistItem } from '../../../../../../../types/worklist.types';
import { AutoVerifyBreakdown } from '../../../run-view/run-badges';
import type { ModVerb } from '../shared/action-model';
import {
    ageTone,
    boardLabel,
    boardTimeMs,
    deltaLabel,
    reasonLabel,
    trackRecordLine,
    waitingLabel,
} from './worklist-model';
import styles from './worklist-pane.module.scss';

export function WorklistRow({
    item,
    now,
    busy,
    onApprove,
    onVerb,
    onHideIdentity,
    onInspect,
    onRequestVideo,
    variables,
}: {
    item: WorklistItem;
    /** The game's variables — names the run's subcategory beside its category. */
    variables: VariableRow[];
    now: Date;
    busy: boolean;
    onApprove: (item: WorklistItem) => void;
    onVerb: (item: WorklistItem, verb: ModVerb) => void;
    onHideIdentity: (item: WorklistItem) => void;
    onInspect: (item: WorklistItem) => void;
    onRequestVideo?: (item: WorklistItem) => void;
}) {
    const [showChecks, setShowChecks] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const tone = ageTone(item.waitingSince, now);
    const delta = deltaLabel(item);
    const record = trackRecordLine(item.trackRecord);
    const hasChecks = item.autoVerifyResult != null;

    return (
        <li className={`${styles.row} ${styles[`row_${tone}`]}`}>
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
                        {item.trackRecord?.trusted && (
                            <span className={styles.pill}>Trusted</span>
                        )}
                    </span>
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
                    className="btn btn-sm btn-primary"
                    disabled={busy || item.verificationStatus === 'verified'}
                    onClick={() => onApprove(item)}
                >
                    Approve
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={busy}
                    onClick={() => onVerb(item, 'reject')}
                >
                    Decline
                </button>
                <div className={styles.more}>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={busy}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((v) => !v)}
                    >
                        More
                    </button>
                    {menuOpen && (
                        <div className={styles.menu} role="menu">
                            {!item.vodUrl &&
                                item.userId !== null &&
                                onRequestVideo && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onRequestVideo(item);
                                        }}
                                    >
                                        Ask for a video
                                    </button>
                                )}
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setMenuOpen(false);
                                    onVerb(item, 'remove');
                                }}
                            >
                                Remove
                            </button>
                            {item.userId !== null && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onVerb(item, 'ban');
                                    }}
                                >
                                    Ban runner
                                </button>
                            )}
                            {item.userId !== null && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onHideIdentity(item);
                                    }}
                                >
                                    Hide identity
                                </button>
                            )}
                        </div>
                    )}
                </div>
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
