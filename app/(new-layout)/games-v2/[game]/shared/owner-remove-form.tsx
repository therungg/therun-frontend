'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    loadSelfEligibleRunsAction,
    revalidateSelfBoardsAction,
    selfRunVerdictAction,
} from '~src/actions/run-user-actions.action';
import { selfClaimTimeAction } from '~src/actions/self-claim.action';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type { UserEligibleRunRow } from '../../../../../types/moderation.types';
import {
    rovingRadioKeyDown,
    ScopeCards,
} from '../manage/moderation/shared/run-action-parts';
import { parseTimeInput } from '../manage/moderation/shared/time-format';
import { BoardDialog } from './board-dialog';
import styles from './owner-remove-form.module.scss';

/**
 * What the runner wants to happen. Deliberately three plain outcomes rather
 * than the moderator wizard's scope/cutoff/notify matrix — a runner is
 * acting on their own entry, not passing judgement on someone else's.
 */
type Choice = 'only' | 'other' | 'time';

/** Sent with each self-hide so the run's history reads sensibly. */
const SELF_REASON = 'Hidden by the runner';

export interface OwnerRemoveFormProps {
    gameId: number;
    /** Board cache invalidation is slug-keyed (`lb:{gameSlug}:…`). */
    gameSlug: string;
    runId: number;
    /** Board identity — filters eligible runs to this board and orders them. */
    categoryId: number;
    subcategoryKey: string;
    primaryTiming: 'rt' | 'gt';
    /**
     * `category.rtaFallback` — on a game-time board, a run with no game time
     * is still ranked, by its real time (the backend orders on
     * `COALESCE(gameTime, time)`). Without this the wizard drops every
     * RTA-only run of the runner's from its roster and then states "You have
     * no other times on this board", never offers "another run of mine stands
     * instead", and computes an empty cascade — leaving a FASTER run of
     * theirs standing on the board they just cleared.
     */
    rtaFallback?: boolean;
    /** This entry's board time (ms) — decides which other runs are "faster". */
    runTimeMs: number | null;
    onDone: () => void;
    onClose: () => void;
    /** Mirrors the confirm mutation's in-flight state to a wrapping host. */
    onBusyChange?: (busy: boolean) => void;
}

/**
 * A run's time on this board's ranking clock — the same expression the board
 * ranks by, including the RTA fallback (`COALESCE(gameTime, time)`) when the
 * board has it on. Anything else here silently disagrees with the board about
 * which of the runner's times is faster.
 */
const rowTime = (
    r: UserEligibleRunRow,
    timing: 'rt' | 'gt',
    rtaFallback = false,
): number | null =>
    timing === 'gt' ? (r.gameTime ?? (rtaFallback ? r.time : null)) : r.time;

/**
 * The runner-facing "hide my run" wizard: Decide (what should happen) →
 * Confirm (exactly what disappears), the owner-sized sibling of the
 * moderator's RunActionForm. No reason picker, no notify toggle, no runner
 * scope, no ban — and no moderation vocabulary anywhere in the copy. The verb
 * is "hide" throughout, matching the sibling SelfRunVerdictDialog and the
 * "Restore my run" control this wizard points at.
 *
 * The cascade concept survives from the mod wizard because the board's rule
 * is the same for everyone: it shows a runner's *best* eligible run. If a
 * faster run of yours is left standing, it simply takes the slot you just
 * cleared — so anything faster than the time you say should stand goes with
 * it, and the Confirm step names every one of them.
 */
export function OwnerRemoveForm({
    gameId,
    gameSlug,
    runId,
    categoryId,
    subcategoryKey,
    primaryTiming,
    rtaFallback = false,
    runTimeMs,
    onDone,
    onClose,
    onBusyChange,
}: OwnerRemoveFormProps) {
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
    /**
     * A failed roster load is NOT an empty roster. Conflating them would
     * render "You have no other times on this board", hide the
     * pick-another-run option, and let the runner confirm on a false premise
     * while the cascade silently does nothing. Kept as its own state so every
     * screen can say "unknown" instead of "none".
     */
    const [rosterError, setRosterError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await loadSelfEligibleRunsAction(gameId);
            if (cancelled) return;
            if (!('ok' in res)) return setRosterError(true);
            setOtherRuns(
                res.rows
                    .filter(
                        (r) =>
                            r.categoryId === categoryId &&
                            r.subcategoryKey === subcategoryKey &&
                            r.runId !== runId &&
                            rowTime(r, primaryTiming, rtaFallback) != null,
                    )
                    .sort(
                        (a, b) =>
                            (rowTime(a, primaryTiming, rtaFallback) ?? 0) -
                            (rowTime(b, primaryTiming, rtaFallback) ?? 0),
                    ),
            );
        })();
        return () => {
            cancelled = true;
        };
    }, [gameId, categoryId, subcategoryKey, runId, primaryTiming, rtaFallback]);

    useEffect(() => {
        onBusyChange?.(isConfirming);
    }, [isConfirming, onBusyChange]);

    const loading = otherRuns == null && !rosterError;
    const hasOthers = (otherRuns?.length ?? 0) > 0;
    /** Fastest surviving run of yours — the one that inherits the slot. */
    const nextBest = otherRuns?.[0] ?? null;

    const setTimeMs = choice === 'time' ? parseTimeInput(timeText) : null;
    const setTimeValid = setTimeMs != null && !Number.isNaN(setTimeMs);

    const standRun =
        choice === 'other' && standRunId != null
            ? (otherRuns?.find((r) => r.runId === standRunId) ?? null)
            : null;

    /**
     * The time that should end up standing for you on this board — an
     * existing run of yours, or the one you typed. Null means "nothing in
     * particular": just this run goes, and whatever the board surfaces next
     * (your next-best time, if you have one) surfaces.
     */
    const cutoff =
        choice === 'other'
            ? standRun
                ? rowTime(standRun, primaryTiming, rtaFallback)
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
                  const t = rowTime(r, primaryTiming, rtaFallback);
                  return t != null && t < cutoff;
              });

    /**
     * Fastest first, the run you opened this on last. Order matters on a
     * partial failure: stopping halfway must never leave the FASTEST run
     * standing, since suppressing it is the entire reason the cascade exists.
     * Failing after the fast ones leaves the slower target on the board — the
     * less wrong of the two boards.
     */
    const hideRunIds = [...fasterRuns.map((r) => r.runId), runId];

    /**
     * Ids already hidden by an attempt that failed later on. Self-hide is
     * idempotent server-side, but re-issuing N calls to reach the one step
     * that failed is pointless — a retry resumes where it stopped.
     */
    const hiddenIds = useRef<Set<number>>(new Set());

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
                if (hiddenIds.current.has(id)) continue;
                const res = await selfRunVerdictAction(
                    id,
                    'reject',
                    SELF_REASON,
                );
                if ('error' in res) return setError(res.error);
                hiddenIds.current.add(id);
                if (res.applied === 'provisional') provisional = true;
            }
            // Deliberately AFTER the hides, never before: the backend stamps a
            // self-asserted time as instantly verified when it can't improve
            // the runner's current rank, so filing first — with the faster run
            // still standing — would slip an unreviewed time onto the board
            // the moment the removal lands.
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
                        `Your run is hidden, but the time you entered could not be saved (${res.error}). Try again to file just the time, or restore the run from your run page.`,
                    );
                }
                if (res.applied === 'provisional') provisional = true;
            }
            toast.success(
                provisional
                    ? 'Submitted for moderator review.'
                    : hideRunIds.length === 1
                      ? 'Your run is now hidden from the leaderboard.'
                      : `${hideRunIds.length} of your runs are now hidden from the leaderboard.`,
            );
            // The board itself is cached under `lb:*` tags that none of the
            // actions above expire (and that a router refresh would not touch
            // either) — bust them so the runner returns to a board that
            // reflects what they just did.
            await revalidateSelfBoardsAction(gameSlug, gameId, [
                { categoryId, subcategoryKey },
            ]);
            onDone();
        });
    };

    // The truthful outcome of "just hide this run": if you have other times
    // here, the board promotes your next-best one rather than leaving you off
    // it. Unknown when the roster failed to load — say so rather than guess.
    const onlyOutcome = rosterError ? (
        <>
            Your run comes off this board. If you have other times here, your
            next-best one takes its place.
        </>
    ) : nextBest ? (
        <>
            Your{' '}
            <DurationToFormatted
                duration={rowTime(nextBest, primaryTiming, rtaFallback) ?? 0}
            />{' '}
            becomes your time on this board.
        </>
    ) : (
        <>You will no longer have a time on this board.</>
    );

    if (step === 'decide') {
        return (
            <>
                <div className={styles.body}>
                    <ScopeCards
                        label="What should happen on this board?"
                        options={[
                            {
                                value: 'only' as Choice,
                                title: 'Just hide this run',
                                detail: rosterError
                                    ? 'Your next-best time here, if any, takes its place.'
                                    : nextBest
                                      ? 'Your next-best time takes its place.'
                                      : 'Your time comes off the board.',
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
                    {rosterError && (
                        <p className={styles.note} role="status">
                            We could not check your other times on this board,
                            so this list may be incomplete. You can still hide
                            this run — close and reopen this to try the check
                            again.
                        </p>
                    )}
                    {!loading && !rosterError && !hasOthers && (
                        <p className={styles.note}>
                            You have no other times on this board.
                        </p>
                    )}

                    {choice === 'other' && otherRuns && (
                        <OtherRunPicker
                            runs={otherRuns}
                            timing={primaryTiming}
                            rtaFallback={rtaFallback}
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
                        onlyOutcome
                    )}
                </p>

                <span className={styles.fieldLabel}>
                    {hideRunIds.length === 1
                        ? 'This run gets hidden'
                        : `These ${hideRunIds.length} runs get hidden`}
                </span>
                <ul className={styles.hideList}>
                    {fasterRuns.map((r) => (
                        <li key={r.runId}>
                            <span className={styles.hideTime}>
                                <DurationToFormatted
                                    duration={
                                        rowTime(
                                            r,
                                            primaryTiming,
                                            rtaFallback,
                                        ) ?? 0
                                    }
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
                </ul>

                <p className={styles.note}>
                    You can restore {hideRunIds.length === 1 ? 'it' : 'them'}{' '}
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
                    {isConfirming ? 'Working…' : 'Hide my run'}
                </button>
            </div>
        </>
    );
}

/**
 * "Which of your other times should stand?" — the owner's counterpart of the
 * mod wizard's CutoffPicker, minus its None row (option 1 on the Decide step
 * already covers "nothing stands instead") and minus the verification-status
 * column, which is the moderator's business, not the runner's. Same
 * radiogroup keyboard contract as the mod parts: roving tabindex plus
 * arrow-key navigation, so every row is reachable without a mouse.
 */
function OtherRunPicker({
    runs,
    timing,
    rtaFallback,
    value,
    onChange,
    fasterCount,
    disabled = false,
}: {
    runs: UserEligibleRunRow[];
    timing: 'rt' | 'gt';
    /** See OwnerRemoveFormProps — the picker must rank the way the board does. */
    rtaFallback: boolean;
    value: number | null;
    onChange: (runId: number) => void;
    fasterCount: number;
    disabled?: boolean;
}) {
    const values = runs.map((r) => r.runId);
    const selectedIndex = Math.max(
        0,
        values.findIndex((id) => id === value),
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
                        onKeyDown={(e) =>
                            rovingRadioKeyDown(e, values, i, onChange)
                        }
                    >
                        <span className={styles.pickerTime}>
                            <DurationToFormatted
                                duration={rowTime(r, timing, rtaFallback) ?? 0}
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
                    would just take the place of the run you are hiding.
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
    // Mirror of the form's in-flight confirm state. BoardDialog's Escape
    // handler is unconditional, so without this gate Escape would tear the
    // dialog down mid-batch, leaving the mutation running with nowhere to
    // report a failure.
    const [busy, setBusy] = useState(false);
    const requestClose = () => {
        if (!busy) props.onClose();
    };
    return (
        <BoardDialog
            open
            onClose={requestClose}
            labelledBy="owner-remove-title"
            size="md"
            closeOnBackdropClick={false}
            initialFocusRef={closeRef}
        >
            <div className={styles.header}>
                <h5 className={styles.title} id="owner-remove-title">
                    Hide my run
                </h5>
                <button
                    ref={closeRef}
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={requestClose}
                    disabled={busy}
                />
            </div>
            <OwnerRemoveForm
                {...props}
                onClose={requestClose}
                onBusyChange={setBusy}
            />
        </BoardDialog>
    );
}
