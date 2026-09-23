'use client';

import moment from 'moment';
import { formatDuration } from '~src/lib/duration';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import { normalizeVariableName } from '~src/lib/variables/keys';
import { formatSubcategoryKey, formatVariableList } from '../../labels';
import { RunnerAvatar } from '../../leaderboard/runner-avatar';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
import styles from './mod-layer.module.scss';
import { isTimingVariable, rankedClockOf, sourceOf } from './run-facts';

/**
 * The run in one line for a moderator: what board, what time on which
 * clock, who, and when it ran and came in. The status sits in the bar.
 */
export function RunHeadline({
    model,
    mod,
}: {
    model: RunViewModel;
    mod: ModContext;
}) {
    const ranked = rankedClockOf(model, mod);
    const shownGt =
        ranked.clock === 'gt' ? model.gameTime != null : model.realTime == null;
    const time = shownGt ? model.gameTime : model.realTime;
    const timingLabel = shownGt
        ? ranked.clock === 'gt'
            ? ranked.name.toLowerCase()
            : model.gameTimeLabel === 'lrt'
              ? 'load-removed'
              : 'game time'
        : 'real time';
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

    return (
        <header className={styles.headline}>
            {model.game.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={model.game.image}
                    width={48}
                    height={64}
                    alt=""
                    className={styles.headlineCover}
                />
            )}
            <div className={styles.headlineBody}>
                <div className={styles.headlineBoard}>
                    {model.game.display} ·{' '}
                    <span className={styles.headlineCategory}>
                        {model.categoryDisplay}
                    </span>
                    {values.map((v) => (
                        <span key={v}> · {v}</span>
                    ))}
                </div>
                <div className={styles.headlineTimeRow}>
                    <h1 className={styles.headlineTime}>
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
                        <span className={styles.headlineRunner}>{names}</span>
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
