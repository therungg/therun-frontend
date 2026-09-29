'use client';

import moment from 'moment';
import Link from '~src/components/link';
import { buildBoardHref, buildGameHref } from '~src/lib/board-url';
import { formatDuration } from '~src/lib/duration';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import { runnerProfileHref } from '~src/lib/runner-profile-href';
import { normalizeVariableName } from '~src/lib/variables/keys';
import { formatSubcategoryKey, formatVariableList } from '../../labels';
import { RunnerAvatar } from '../../leaderboard/runner-avatar';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
import styles from './mod-layer.module.scss';
import { isTimingVariable, rankedClockOf, sourceOf } from './run-facts';

/** The time the headline leads with: the ranked clock's, or the other
 * one when the ranked clock has none. */
export function headlineTimeOf(model: RunViewModel, mod: ModContext) {
    const ranked = rankedClockOf(model, mod);
    const shownGt =
        ranked.clock === 'gt' ? model.gameTime != null : model.realTime == null;
    const time = shownGt ? model.gameTime : model.realTime;
    const label = shownGt
        ? ranked.clock === 'gt'
            ? ranked.name.toLowerCase()
            : model.gameTimeLabel === 'lrt'
              ? 'load-removed'
              : 'game time'
        : 'real time';
    return { shownGt, time, label };
}

/**
 * The run in one line for a moderator: what board, what time on which
 * clock, who, and when it ran and came in. The status sits in the bar.
 */
export function RunHeadline({
    model,
    mod,
    newRunner = false,
    ref,
}: {
    model: RunViewModel;
    mod: ModContext;
    ref?: React.Ref<HTMLElement>;
    /** The queue flags the runner as new to this board. */
    newRunner?: boolean;
}) {
    const { shownGt, time, label: timingLabel } = headlineTimeOf(model, mod);
    const timerTime = shownGt ? model.timerGameTime : model.timerTime;

    const subNames = new Set(
        parseSubcategoryKey(model.subcategoryKey).map((p) =>
            normalizeVariableName(p.name),
        ),
    );
    // Every value by its label, never its key; the timing variable is left
    // to the clock beside the time.
    const defs = mod.sheet.variables.filter(
        (v) => v.categoryId === model.categoryId,
    );
    const values = [
        formatSubcategoryKey(model.subcategoryKey, defs),
        ...Object.entries(model.variables)
            .filter(([name]) => {
                const key = normalizeVariableName(name);
                const def = defs.find((d) => d.nameNormalized === key);
                return (
                    !subNames.has(key) && !isTimingVariable(def?.name ?? name)
                );
            })
            .map(([name, value]) =>
                formatVariableList({ [name]: value }, defs),
            ),
    ].filter((v): v is string => !!v && v.trim().length > 0);

    const names = rendersAsRoster(model.participants, model)
        ? model.participants.map((p) => p.name).join(', ')
        : model.runnerName;
    const source = sourceOf(model, mod);
    // A moderator can always open the board.
    const gameHref = buildGameHref(model.game, true);
    const boardHref = buildBoardHref(model.game.name, {
        categorySlug: model.categorySlug,
        subcategoryKey: model.categorySlug ? model.subcategoryKey : null,
    });
    const soloRunner =
        !rendersAsRoster(model.participants, model) && !model.isGuest;

    return (
        <header ref={ref} className={styles.headline}>
            {model.game.image && (
                <Link href={gameHref} aria-hidden tabIndex={-1}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={model.game.image}
                        width={48}
                        height={64}
                        alt=""
                        className={styles.headlineCover}
                    />
                </Link>
            )}
            <div className={styles.headlineBody}>
                <div className={styles.headlineBoard}>
                    <Link href={gameHref} className={styles.headlineLink}>
                        {model.game.display}
                    </Link>{' '}
                    ·{' '}
                    <Link
                        href={boardHref}
                        className={`${styles.headlineCategory} ${styles.headlineLink}`}
                    >
                        {model.categoryDisplay}
                    </Link>
                    {values.map((v) => (
                        <span key={v}> · {v}</span>
                    ))}
                </div>
                <div className={styles.headlineTimeRow}>
                    <h1 className={styles.headlineTime}>
                        {/* The heading names the run, not just a time. */}
                        <span className="visually-hidden">
                            {model.game.display} · {model.categoryDisplay} by{' '}
                            {names}:{' '}
                        </span>
                        {time != null ? formatDuration(time) : '—'}
                    </h1>
                    {time != null && (
                        <span className={styles.muted}>{timingLabel}</span>
                    )}
                    {timerTime != null && (
                        <span className={styles.muted}>
                            timer{' '}
                            <span className={styles.mono}>
                                {formatDuration(timerTime)}
                            </span>
                        </span>
                    )}
                    <span className={styles.headlineRunnerGroup}>
                        <RunnerAvatar
                            name={model.runnerName}
                            picture={model.picture}
                            size="xs"
                        />
                        {soloRunner ? (
                            <Link
                                href={runnerProfileHref(model.runnerName)}
                                className={`${styles.headlineRunner} ${styles.headlineLink}`}
                            >
                                {names}
                            </Link>
                        ) : (
                            <span className={styles.headlineRunner}>
                                {names}
                            </span>
                        )}
                        {newRunner && (
                            <span className={styles.headlineTag}>
                                New runner
                            </span>
                        )}
                    </span>
                </div>
            </div>
            {(model.runDate || source) && (
                <div className={styles.headlineWhen}>
                    {model.runDate && (
                        <span suppressHydrationWarning>
                            Ran{' '}
                            {moment(model.runDate).format(
                                // A date-only value has no time to show.
                                model.runDate.includes('T')
                                    ? 'D MMM YYYY, HH:mm'
                                    : 'D MMM YYYY',
                            )}
                        </span>
                    )}
                    {source && <span>{source}</span>}
                </div>
            )}
        </header>
    );
}
