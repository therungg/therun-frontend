'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    loadSelfEligibleRunsAction,
    selfRunVerdictAction,
} from '~src/actions/run-user-actions.action';
import { selfClaimTimeAction } from '~src/actions/self-claim.action';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type { UserEligibleRunRow } from '../../../../../types/moderation.types';
import { ScopeCards } from '../manage/moderation/shared/run-action-parts';
import { parseTimeInput } from '../manage/moderation/shared/time-format';
import { BoardDialog } from './board-dialog';
import styles from './owner-remove-form.module.scss';

/**
 * What the runner wants to happen. Deliberately three plain outcomes rather
 * than the moderator wizard's scope/cutoff/notify matrix — a runner is
 * acting on their own entry, not passing judgement on someone else's.
 */
type Choice = 'only' | 'other' | 'time';

/** Sent with each self-reject so the run's history reads sensibly. */
const SELF_REASON = 'Removed by the runner';

export interface OwnerRemoveFormProps {
    gameId: number;
    runId: number;
    /** Board identity — filters eligible runs to this board and orders them. */
    categoryId: number;
    subcategoryKey: string;
    primaryTiming: 'rt' | 'gt';
    /** This entry's board time (ms) — decides which other runs are "faster". */
    runTimeMs: number | null;
    onDone: () => void;
    onClose: () => void;
}

/** A run's time on this board's ranking clock. */
const rowTime = (r: UserEligibleRunRow, timing: 'rt' | 'gt'): number | null =>
    timing === 'gt' ? r.gameTime : r.time;

/**
 * The runner-facing "take my run off this board" wizard: Decide (what should
 * happen) → Confirm (exactly what disappears), the owner-sized sibling of the
 * moderator's RunActionForm. No reason picker, no notify toggle, no runner
 * scope, no ban — and no moderation vocabulary anywhere in the copy.
 *
 * The cascade concept survives from the mod wizard because the board's rule
 * is the same for everyone: it shows a runner's *best* eligible run. If a
 * faster run of yours is left standing, it simply takes the slot you just
 * cleared — so anything faster than the time you say should stand goes with
 * it, and the Confirm step names every one of them.
 */
export function OwnerRemoveForm({
    gameId,
    runId,
    categoryId,
    subcategoryKey,
    primaryTiming,
    runTimeMs,
    onDone,
    onClose,
}: OwnerRemoveFormProps) {
    const router = useRouter();
    const [choice, setChoice] = useState<Choice>('only');
    const [standRunId, setStandRunId] = useState<number | null>(null);
    const [timeText, setTimeText] = useState('');
    const [step, setStep] = useState<'decide' | 'confirm'>('decide');
    const [error, setError] = useState<string | null>(null);
    const [isConfirming, startConfirm] = useTransition();

    /**
     * Your other runs on this exact board. Note what the backend can return:
     * `loadSelfEligibleRunsAction` never includes runs that are already
     * hidden, so this list is only ever times that are currently live. It is
     * a "which of my standing times should stay" question, never a way to
     * bring a hidden run back.
     */
    const [otherRuns, setOtherRuns] = useState<UserEligibleRunRow[] | null>(
        null,
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await loadSelfEligibleRunsAction(gameId);
            if (cancelled) return;
            if (!('ok' in res)) return setOtherRuns([]);
            setOtherRuns(
                res.rows
                    .filter(
                        (r) =>
                            r.categoryId === categoryId &&
                            r.subcategoryKey === subcategoryKey &&
                            r.runId !== runId &&
                            rowTime(r, primaryTiming) != null,
                    )
                    .sort(
                        (a, b) =>
                            (rowTime(a, primaryTiming) ?? 0) -
                            (rowTime(b, primaryTiming) ?? 0),
                    ),
            );
        })();
        return () => {
            cancelled = true;
        };
    }, [gameId, categoryId, subcategoryKey, runId, primaryTiming]);

    const loading = otherRuns == null;
    const hasOthers = (otherRuns?.length ?? 0) > 0;

    const setTimeMs = choice === 'time' ? parseTimeInput(timeText) : null;
    const setTimeValid = setTimeMs != null && !Number.isNaN(setTimeMs);

    const standRun =
        choice === 'other' && standRunId != null
            ? (otherRuns?.find((r) => r.runId === standRunId) ?? null)
            : null;

    /**
     * The time that should end up standing for you on this board — an
     * existing run of yours, or the one you typed. Null means "nothing in
     * particular": just this run goes.
     */
    const cutoff =
        choice === 'other'
            ? standRun
                ? rowTime(standRun, primaryTiming)
                : null
            : choice === 'time' && setTimeValid
              ? setTimeMs
              : null;

    // Anything of yours faster than that time would take the slot you're
    // clearing, so it goes too.
    const fasterRuns =
        cutoff == null || otherRuns == null
            ? []
            : otherRuns.filter((r) => {
                  const t = rowTime(r, primaryTiming);
                  return t != null && t < cutoff;
              });

    const hideRunIds = [runId, ...fasterRuns.map((r) => r.runId)];

    const canContinue =
        !loading &&
        (choice === 'only' ||
            (choice === 'other' && standRun != null) ||
            (choice === 'time' && setTimeValid));

    const handleConfirm = () => {
        setError(null);
        startConfirm(async () => {
            let provisional = false;
            // Sequential on purpose: the first failure stops the rest, so the
            // runner is never left guessing which half of the batch landed.
            for (const id of hideRunIds) {
                const res = await selfRunVerdictAction(
                    id,
                    'reject',
                    SELF_REASON,
                );
                if ('error' in res) return setError(res.error);
                if (res.applied === 'provisional') provisional = true;
            }
            if (choice === 'time' && setTimeMs != null && setTimeValid) {
                const res = await selfClaimTimeAction({
                    gameId,
                    categoryId,
                    subcategoryKey,
                    timing: primaryTiming === 'gt' ? 'gametime' : 'realtime',
                    timeMs: setTimeMs,
                    reason: SELF_REASON,
                });
                if ('error' in res) {
                    return setError(
                        `Your run was removed, but the time you set could not be saved: ${res.error}`,
                    );
                }
                if (res.applied === 'provisional') provisional = true;
            }
            toast.success(
                provisional
                    ? 'Submitted for moderator review.'
                    : hideRunIds.length === 1
                      ? 'Your run is no longer on the leaderboard.'
                      : `${hideRunIds.length} of your runs are no longer on the leaderboard.`,
            );
            // Neither the verdict nor the set-time action busts the board
            // caches, so pull fresh data before handing control back.
            router.refresh();
            onDone();
        });
    };

    if (step === 'decide') {
        return (
            <>
                <div className={styles.body}>
                    <ScopeCards
                        label="What should happen on this board?"
                        options={[
                            {
                                value: 'only' as Choice,
                                title: 'Just remove this run',
                                detail: 'Your time comes off the board.',
                            },
                            ...(hasOthers
                                ? [
                                      {
                                          value: 'other' as Choice,
                                          title: 'Another run of mine stands instead',
                                          detail: 'Pick one of your other times.',
                                      },
                                  ]
                                : []),
                            {
                                value: 'time' as Choice,
                                title: 'Set a time instead',
                                detail: 'Type the time that should stand.',
                            },
                        ]}
                        value={choice}
                        onChange={(v) => {
                            setChoice(v);
                            if (v !== 'other') setStandRunId(null);
                            if (v !== 'time') setTimeText('');
                        }}
                        disabled={isConfirming}
                    />

                    {loading && (
                        <p className={styles.note}>
                            Checking your other times on this board…
                        </p>
                    )}
                    {!loading && !hasOthers && (
                        <p className={styles.note}>
                            You have no other times on this board.
                        </p>
                    )}

                    {choice === 'other' && otherRuns && (
                        <OtherRunPicker
                            runs={otherRuns}
                            timing={primaryTiming}
                            value={standRunId}
                            onChange={setStandRunId}
                            fasterCount={fasterRuns.length}
                            disabled={isConfirming}
                        />
                    )}

                    {choice === 'time' && (
                        <div className={styles.zone}>
                            <label
                                className={styles.fieldLabel}
                                htmlFor="owner-remove-time"
                            >
                                Your time
                            </label>
                            <input
                                id="owner-remove-time"
                                type="text"
                                className="form-control form-control-sm"
                                value={timeText}
                                onChange={(e) => setTimeText(e.target.value)}
                                placeholder="e.g. 35:48 or 1:23:45"
                                disabled={isConfirming}
                            />
                            <p className={styles.note}>
                                This replaces your run with a time you enter
                                yourself. A moderator may check it before it
                                counts.
                                {fasterRuns.length > 0 &&
                                    ` ${fasterRuns.length} faster time${fasterRuns.length === 1 ? ' of yours goes' : 's of yours go'} too — a faster time left standing would outrank it.`}
                            </p>
                            {timeText.length > 0 && !setTimeValid && (
                                <p className={styles.fieldError}>
                                    Enter a valid time (h:mm:ss, m:ss, or
                                    m:ss.SSS).
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <div className={styles.footer}>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onClose}
                        disabled={isConfirming}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setStep('confirm')}
                        disabled={!canContinue || isConfirming}
                    >
                        Continue
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <div className={styles.body}>
                <p className={styles.summary}>
                    {choice === 'other' && cutoff != null ? (
                        <>
                            Your <DurationToFormatted duration={cutoff} /> will
                            be your time on this board.
                        </>
                    ) : choice === 'time' && setTimeMs != null ? (
                        <>
                            The <DurationToFormatted duration={setTimeMs} /> you
                            entered will be your time on this board.
                        </>
                    ) : (
                        'You will no longer have a time on this board.'
                    )}
                </p>

                <span className={styles.fieldLabel}>
                    {hideRunIds.length === 1
                        ? 'This run comes off the board'
                        : `These ${hideRunIds.length} runs come off the board`}
                </span>
                <ul className={styles.hideList}>
                    <li>
                        <span className={styles.hideTime}>
                            {runTimeMs != null ? (
                                <DurationToFormatted duration={runTimeMs} />
                            ) : (
                                'This run'
                            )}
                        </span>
                        <span className={styles.hideTag}>
                            the run you chose
                        </span>
                    </li>
                    {fasterRuns.map((r) => (
                        <li key={r.runId}>
                            <span className={styles.hideTime}>
                                <DurationToFormatted
                                    duration={rowTime(r, primaryTiming) ?? 0}
                                />
                            </span>
                            {r.endedAt && (
                                <span className={styles.hideDate}>
                                    {formatRunDate(r.endedAt)}
                                </span>
                            )}
                            <span className={styles.hideTag}>
                                faster than the time that stands
                            </span>
                        </li>
                    ))}
                </ul>

                <p className={styles.note}>
                    You can put {hideRunIds.length === 1 ? 'it' : 'them'} back
                    later from your run page. Boards and profiles can take a few
                    minutes to catch up.
                </p>

                {error && (
                    <div className={styles.errorAlert} role="alert">
                        {error}
                    </div>
                )}
            </div>
            <div className={styles.footer}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setStep('decide')}
                    disabled={isConfirming}
                >
                    Back
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onClose}
                    disabled={isConfirming}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${styles.btnDanger}`}
                    onClick={handleConfirm}
                    disabled={isConfirming}
                >
                    {isConfirming ? 'Working…' : 'Remove my run'}
                </button>
            </div>
        </>
    );
}

/**
 * "Which of your other times should stand?" — the owner's counterpart of the
 * mod wizard's CutoffPicker, minus its None row (option 1 on the Decide step
 * already covers "nothing stands instead") and minus the verification-status
 * column, which is the moderator's business, not the runner's.
 */
function OtherRunPicker({
    runs,
    timing,
    value,
    onChange,
    fasterCount,
    disabled = false,
}: {
    runs: UserEligibleRunRow[];
    timing: 'rt' | 'gt';
    value: number | null;
    onChange: (runId: number) => void;
    fasterCount: number;
    disabled?: boolean;
}) {
    const selectedIndex = Math.max(
        0,
        runs.findIndex((r) => r.runId === value),
    );
    return (
        <div className={styles.zone}>
            <span id="owner-remove-picker-label" className={styles.fieldLabel}>
                Which of your times should stand?
            </span>
            <div
                className={styles.picker}
                role="radiogroup"
                aria-labelledby="owner-remove-picker-label"
            >
                {runs.map((r, i) => (
                    <button
                        key={r.runId}
                        type="button"
                        role="radio"
                        aria-checked={value === r.runId}
                        tabIndex={i === selectedIndex ? 0 : -1}
                        disabled={disabled}
                        className={
                            value === r.runId
                                ? `${styles.pickerRow} ${styles.pickerRowActive}`
                                : styles.pickerRow
                        }
                        onClick={() => onChange(r.runId)}
                    >
                        <span className={styles.pickerTime}>
                            <DurationToFormatted
                                duration={
                                    (timing === 'gt' ? r.gameTime : r.time) ?? 0
                                }
                            />
                        </span>
                        {r.endedAt && (
                            <span className={styles.pickerDate}>
                                {formatRunDate(r.endedAt)}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            {fasterCount > 0 && (
                <p className={styles.note}>
                    {fasterCount} faster time{fasterCount === 1 ? '' : 's'} of
                    yours {fasterCount === 1 ? 'comes' : 'come'} off too — a
                    board shows your best time, so a faster one left standing
                    would just take the place of the run you are removing.
                </p>
            )}
        </div>
    );
}

/**
 * BoardDialog chrome around the form, for hosts that want the wizard as a
 * modal rather than inline (mirrors RunActionDialog around RunActionForm).
 */
export function OwnerRemoveDialog(props: OwnerRemoveFormProps) {
    const closeRef = useRef<HTMLButtonElement>(null);
    return (
        <BoardDialog
            open
            onClose={props.onClose}
            labelledBy="owner-remove-title"
            size="md"
            closeOnBackdropClick={false}
            initialFocusRef={closeRef}
        >
            <div className={styles.header}>
                <h5 className={styles.title} id="owner-remove-title">
                    Remove my run
                </h5>
                <button
                    ref={closeRef}
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={props.onClose}
                />
            </div>
            <OwnerRemoveForm {...props} />
        </BoardDialog>
    );
}
