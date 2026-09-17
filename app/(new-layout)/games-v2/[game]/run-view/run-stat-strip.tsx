import type React from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import { isSameRunner } from '../shared/is-same-runner';
import { EvidenceDialog } from './evidence-dialog';
import { RunActions } from './run-actions';
import { formatGap } from './run-format';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

function Cell({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className={styles.cell}>
            <span className={styles.cellLabel}>{label}</span>
            <span className={styles.cellValue}>{children}</span>
        </div>
    );
}

export function RunStatStrip({
    model,
    sessionUsername,
    isMod,
}: {
    model: RunViewModel;
    sessionUsername: string | null;
    isMod: boolean;
}) {
    const stats = model.timerStats;
    const sob = stats?.sumOfBests ?? null;
    const isOwner =
        isSameRunner(sessionUsername, model.runnerName) &&
        !model.isGuest &&
        model.userId != null;
    const canEditEvidence = isOwner || isMod;

    return (
        <div className={styles.strip}>
            {model.realTime != null && (
                <Cell label="RTA">
                    <DurationToFormatted duration={model.realTime} withMillis />
                </Cell>
            )}
            {model.gameTime != null && (
                <Cell label={model.gameTimeLabel === 'lrt' ? 'LRT' : 'IGT'}>
                    <DurationToFormatted duration={model.gameTime} withMillis />
                </Cell>
            )}
            {model.runDate && (
                <Cell label="Date">{formatRunDate(model.runDate)}</Cell>
            )}
            {stats?.attemptCount != null && (
                <Cell label="Attempts">
                    {stats.attemptCount.toLocaleString()}
                    {stats.finishedAttemptCount != null &&
                        ` (${stats.finishedAttemptCount.toLocaleString()} finished)`}
                </Cell>
            )}
            {sob != null && model.realTime != null && (
                <Cell label="Sum of best">
                    <DurationToFormatted duration={sob} withMillis />{' '}
                    <span className={styles.muted}>
                        {formatGap(sob - model.realTime)}
                    </span>
                </Cell>
            )}
            <Cell label="Video">
                {model.vodUrl ? (
                    'Yes'
                ) : canEditEvidence ? (
                    <EvidenceDialog
                        model={model}
                        sessionUsername={sessionUsername}
                        isMod={isMod}
                        label="Add video"
                    />
                ) : (
                    <span className={styles.muted}>No video</span>
                )}
            </Cell>
            <div className={styles.stripActions}>
                {canEditEvidence && model.vodUrl && (
                    <EvidenceDialog
                        model={model}
                        sessionUsername={sessionUsername}
                        isMod={isMod}
                        label="Edit video"
                    />
                )}
                <RunActions model={model} sessionUsername={sessionUsername} />
            </div>
        </div>
    );
}
