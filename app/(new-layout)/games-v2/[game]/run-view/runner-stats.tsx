import type React from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatBoardDate } from '~src/lib/format-run-date';
import { isEmbeddableVod } from '~src/lib/vod-url';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { EvidenceDialog } from './evidence-dialog';
import { effectiveEvidencePerms } from './evidence-perms';
import { formatDelta } from './run-format';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

/** Date, both clocks when there are two, and the video state — under the hero. */
export function RunMetaLine({
    model,
    sessionUsername,
    isMod,
}: {
    model: RunViewModel;
    sessionUsername: string | null;
    isMod: boolean;
}) {
    const perms = effectiveEvidencePerms(model, sessionUsername, isMod);
    const canEditEvidence = perms.canEditVod || perms.canEditDescription;
    // One clock is already the hero's time; list them only when there are
    // two to tell apart.
    const bothClocks = model.realTime != null && model.gameTime != null;

    return (
        <div className={styles.meta}>
            {model.runDate && (
                <span className={styles.metaItem}>
                    {formatBoardDate(model.runDate)}
                </span>
            )}
            {bothClocks && model.realTime != null && (
                <span className={styles.metaItem}>
                    <span className={styles.metaLabel}>RTA</span>
                    <span className={styles.metaTime}>
                        <DurationToFormatted
                            duration={model.realTime}
                            withMillis
                        />
                    </span>
                </span>
            )}
            {bothClocks && model.gameTime != null && (
                <span className={styles.metaItem}>
                    <span className={styles.metaLabel}>
                        {model.gameTimeLabel === 'lrt' ? 'LRT' : 'IGT'}
                    </span>
                    <span className={styles.metaTime}>
                        <DurationToFormatted
                            duration={model.gameTime}
                            withMillis
                        />
                    </span>
                </span>
            )}
            {!model.vodUrl &&
                (canEditEvidence ? (
                    <EvidenceDialog
                        model={model}
                        sessionUsername={sessionUsername}
                        isMod={isMod}
                        label="Add video"
                    />
                ) : (
                    <span className={styles.noVideo}>No video</span>
                ))}
            {model.vodUrl && !isEmbeddableVod(model.vodUrl) && (
                <a
                    href={model.vodUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.metaLink}
                >
                    Video link
                </a>
            )}
            {canEditEvidence && model.vodUrl && (
                <EvidenceDialog
                    model={model}
                    sessionUsername={sessionUsername}
                    isMod={isMod}
                    label="Edit video"
                />
            )}
        </div>
    );
}

function Tile({
    label,
    value,
    sub,
    accent = false,
    children,
}: {
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    accent?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className={styles.tile}>
            <span className={styles.tileLabel}>{label}</span>
            <span
                className={`${styles.tileValue} ${accent ? styles.tileAccent : ''}`}
            >
                {value}
            </span>
            {sub && <span className={styles.tileSub}>{sub}</span>}
            {children}
        </div>
    );
}

function formatRate(pct: number): string {
    return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

/**
 * The runner's own timer figures (attempts, finishes, sum of best). They
 * come from their splits file, not the board, so the block says whose they
 * are.
 */
export function RunnerStats({ model }: { model: RunViewModel }) {
    const stats = model.timerStats;
    if (!stats) return null;
    const attempts = stats.attemptCount;
    const finished = stats.finishedAttemptCount;
    const sob = model.realTime != null ? stats.sumOfBests : null;
    const timesave =
        sob != null && model.realTime != null && sob < model.realTime
            ? model.realTime - sob
            : null;
    const finishRate =
        attempts != null && finished != null && attempts > 0
            ? Math.min(100, (finished / attempts) * 100)
            : null;
    if (attempts == null && finished == null && sob == null) return null;

    return (
        <section className={`${styles.surface} ${styles.panel}`}>
            <h2 className={styles.statsTitle}>
                <RunnerAvatar
                    name={model.runnerName}
                    picture={model.picture}
                    size="sm"
                />
                <span className={styles.statsName}>
                    {model.runnerName}&apos;s stats
                </span>
            </h2>
            <div className={styles.tiles}>
                {attempts != null && (
                    <Tile label="Attempts" value={attempts.toLocaleString()} />
                )}
                {finished != null && (
                    <Tile
                        label="Finished"
                        value={finished.toLocaleString()}
                        sub={
                            finishRate != null
                                ? `${formatRate(finishRate)} finish rate`
                                : undefined
                        }
                    >
                        {finishRate != null && (
                            <span className={styles.meter} aria-hidden>
                                <span
                                    className={styles.meterFill}
                                    style={{ width: `${finishRate}%` }}
                                />
                            </span>
                        )}
                    </Tile>
                )}
                {sob != null && (
                    <Tile
                        label="Sum of best"
                        value={
                            <DurationToFormatted duration={sob} withMillis />
                        }
                    />
                )}
                {timesave != null && (
                    <Tile
                        label="Possible timesave"
                        value={formatDelta(timesave)}
                        accent
                    />
                )}
            </div>
        </section>
    );
}
