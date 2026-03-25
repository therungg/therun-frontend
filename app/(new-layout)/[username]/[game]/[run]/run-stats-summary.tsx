import { Run } from '~src/common/types';
import { formatMillis, formatPlaytime } from '~src/utils/json-ld';

interface RunStatsSummaryProps {
    run: Run;
    username: string;
}

export function RunStatsSummary({ run, username }: RunStatsSummaryProps) {
    const pb = formatMillis(run.personalBest);
    const sob = formatMillis(run.sumOfBests);
    const tts = formatMillis(run.timeToSave);
    const playtime = formatPlaytime(run.totalRunTime);
    const completionPct =
        run.attemptCount > 0
            ? (
                  (parseInt(run.finishedAttemptCount) / run.attemptCount) *
                  100
              ).toFixed(1)
            : '0';

    return (
        <section aria-label="Run summary">
            <h2>Statistics</h2>
            <p>
                {username} has made {run.attemptCount.toLocaleString()} attempts
                of {run.game} - {run.run}
                {pb && <>, with a personal best of {pb}</>}.
                {sob && (
                    <>
                        {' '}
                        Their sum of best segments is {sob}
                        {tts && (
                            <>
                                , meaning there&apos;s {tts} of potential time
                                save
                            </>
                        )}
                        .
                    </>
                )}{' '}
                {run.finishedAttemptCount && (
                    <>
                        {run.finishedAttemptCount} of those attempts were
                        finished ({completionPct}% completion rate).
                    </>
                )}{' '}
                {playtime && <>Total time spent: {playtime}.</>}
            </p>
        </section>
    );
}
