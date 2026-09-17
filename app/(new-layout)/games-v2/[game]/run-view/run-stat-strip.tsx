import type React from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatBoardDate } from '~src/lib/format-run-date';
import { isEmbeddableVod } from '~src/lib/vod-url';
import { EvidenceDialog } from './evidence-dialog';
import { effectiveEvidencePerms } from './evidence-perms';
import { formatDelta } from './run-format';
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
    const perms = effectiveEvidencePerms(model, sessionUsername, isMod);
    const canEditEvidence = perms.canEditVod || perms.canEditDescription;
    // One clock is already the hero's time; the cells only earn a place when
    // there are two to tell apart.
    const bothClocks = model.realTime != null && model.gameTime != null;
    const timesave =
        sob != null && model.realTime != null && sob < model.realTime
            ? model.realTime - sob
            : null;

    return (
        <div className={styles.strip}>
            {bothClocks && model.realTime != null && (
                <Cell label="RTA">
                    <DurationToFormatted duration={model.realTime} withMillis />
                </Cell>
            )}
            {bothClocks && model.gameTime != null && (
                <Cell label={model.gameTimeLabel === 'lrt' ? 'LRT' : 'IGT'}>
                    <DurationToFormatted duration={model.gameTime} withMillis />
                </Cell>
            )}
            {model.runDate && (
                <Cell label="Date">{formatBoardDate(model.runDate)}</Cell>
            )}
            {stats?.attemptCount != null && (
                <Cell label="Attempts">
                    {stats.finishedAttemptCount != null
                        ? `${stats.finishedAttemptCount.toLocaleString()} of ${stats.attemptCount.toLocaleString()} finished`
                        : stats.attemptCount.toLocaleString()}
                </Cell>
            )}
            {sob != null && model.realTime != null && (
                <Cell label="Sum of best">
                    <DurationToFormatted duration={sob} withMillis />
                    {timesave != null && (
                        <span className={styles.muted}>
                            {' '}
                            · {formatDelta(timesave)} possible timesave
                        </span>
                    )}
                </Cell>
            )}
            {!model.vodUrl && (
                <Cell label="Video">
                    {canEditEvidence ? (
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
            )}
            {model.vodUrl && !isEmbeddableVod(model.vodUrl) && (
                <Cell label="Video">
                    <a href={model.vodUrl} target="_blank" rel="noreferrer">
                        Link
                    </a>
                </Cell>
            )}
            {canEditEvidence && model.vodUrl && (
                <div className={styles.stripActions}>
                    <EvidenceDialog
                        model={model}
                        sessionUsername={sessionUsername}
                        isMod={isMod}
                        label="Edit"
                    />
                </div>
            )}
        </div>
    );
}
