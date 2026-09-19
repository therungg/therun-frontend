import type { ReactNode } from 'react';
import { otherTiming } from '~src/lib/run-times';
import type { VodReviewPatch } from '../../../../../../../types/leaderboards.types';
import type {
    AffectedLeaderboard,
    AnonymizeRule,
    ModTiming,
    RejectionReasonKey,
    SecondaryTimeInput,
} from '../../../../../../../types/moderation.types';
import { saveVodReviewAction } from '../../../leaderboard/actions/vod-review.action';
import { MIN_ANONYMIZE_REASON, undoReason } from '../shared/action-model';
import {
    anonymizeRunAction,
    anonymizeUserAction,
    liftAnonymizeRuleAction,
} from '../shared/actions/anonymize-rules.action';
import { moveRunAction } from '../shared/actions/board-override.action';
import {
    excludeAction,
    previewExcludeAction,
} from '../shared/actions/exclude.action';
import {
    deleteManualTimeAction,
    manualTimeVerdictAction,
    updateManualTimeAction,
} from '../shared/actions/manual-times.action';
import { restoreRunsAction } from '../shared/actions/restore.action';
import { setRunTimesAction } from '../shared/actions/run-times.action';
import {
    applyVerdictsAction,
    previewVerdictsAction,
} from '../shared/actions/verdicts.action';
import { REJECTION_REASONS } from '../shared/rejection-reasons';
import type { UndoResult } from '../shared/undo-toast';
import type { HeavyFormSpec } from './heavy-form';
import { Time } from './run-columns';
import { unwrap } from './run-verbs';
import type { SheetBoard } from './subject';
import { VERB_LABEL } from './verbs';

export type HeavyRunVerb =
    | 'decline'
    | 'remove'
    | 'set_time'
    | 'move'
    | 'hide_identity'
    | 'retime';
export type HideScope = 'run' | 'category' | 'game';

export const MIN_REASON = 10;

/** Deleting a manual time notifies its runner. */
const MANUAL_DELETE_TOLD =
    'is told the manual time was deleted, with this reason.';

/** A declined manual time can be approved again, never made pending again. */
const MANUAL_DECLINE_UNDO =
    'a declined manual time can be approved later, not made pending again';

export type ConfirmResult =
    | { error: string }
    | {
          ok: true;
          /** Null when there is no true inverse: plain toast. */
          undo: (() => Promise<UndoResult>) | null;
          /** Replaces the default "Verb: runner" toast text. */
          message?: string;
      };

/**
 * Lifts a hide identity rule: the inverse of Hide identity. Lifting is for
 * site admins; the backend refuses anyone else.
 */
export function liftHideRule(
    gameSlug: string,
    rule: Pick<AnonymizeRule, 'ruleId' | 'type' | 'targetId' | 'gameId'>,
    board: AffectedLeaderboard | null = null,
): Promise<UndoResult> {
    return unwrap(
        liftAnonymizeRuleAction(gameSlug, {
            ruleId: rule.ruleId,
            reason: 'Undo of hide identity',
            targetUserId: rule.type === 'user' ? rule.targetId : null,
            runId: rule.type === 'run' ? rule.targetId : null,
            board,
            global: rule.type === 'user' && rule.gameId == null,
        }),
    );
}

const toModTiming = (t: 'rt' | 'gt'): ModTiming =>
    t === 'gt' ? 'gametime' : 'realtime';

// ---- Many runs --------------------------------------------------------------
// The run tab calls these with one id; bulk mode calls them with many.

export async function declineRuns(
    gameSlug: string,
    runIds: number[],
    reason: string,
    reasonKey: RejectionReasonKey | null,
): Promise<ConfirmResult> {
    const res = await applyVerdictsAction(
        gameSlug,
        'reject',
        runIds,
        reason,
        reasonKey ?? undefined,
    );
    if ('error' in res) return res;
    return {
        ok: true,
        undo: () =>
            unwrap(
                restoreRunsAction(
                    gameSlug,
                    { include: [], unreject: runIds },
                    undoReason('reject'),
                ),
            ),
    };
}

/** Quiet removal: excluded from the board, the runner is not told. */
export async function removeRuns(
    gameSlug: string,
    runIds: number[],
    reason: string,
): Promise<ConfirmResult> {
    const res = await excludeAction(gameSlug, { runIds, reason });
    if ('error' in res) return res;
    return {
        ok: true,
        undo: () =>
            unwrap(
                restoreRunsAction(
                    gameSlug,
                    { include: runIds, unreject: [] },
                    undoReason('remove'),
                ),
            ),
    };
}

/**
 * Includes the removed runs and unreject the declined ones. Undo removes and
 * declines them again, each with its own call.
 */
export async function restoreRuns(
    gameSlug: string,
    runs: { removed: number[]; declined: number[] },
    reason: string,
): Promise<ConfirmResult> {
    const res = await restoreRunsAction(
        gameSlug,
        { include: runs.removed, unreject: runs.declined },
        reason,
    );
    if ('error' in res) return res;
    return {
        ok: true,
        undo: async (): Promise<UndoResult> => {
            if (runs.removed.length) {
                const ex = await excludeAction(gameSlug, {
                    runIds: runs.removed,
                    reason: undoReason('restore'),
                });
                if ('error' in ex) return { error: ex.error };
            }
            if (runs.declined.length) {
                const re = await applyVerdictsAction(
                    gameSlug,
                    'reject',
                    runs.declined,
                    undoReason('restore'),
                );
                if ('error' in re) return { error: re.error };
            }
            return { ok: true };
        },
    };
}

/** One board-override call per run; each run keeps its own source subcategory. */
export async function moveRuns(
    gameSlug: string,
    runs: { runId: number; runnerName: string; subcategoryKey: string }[],
    sourceCategoryId: number,
    target: AffectedLeaderboard,
    reason: string,
): Promise<ConfirmResult> {
    const errors: string[] = [];
    for (const run of runs) {
        const source = {
            categoryId: sourceCategoryId,
            subcategoryKey: run.subcategoryKey,
        };
        const res = await moveRunAction(
            gameSlug,
            run.runId,
            target,
            [source, target],
            reason,
        );
        if ('error' in res) errors.push(`${run.runnerName}: ${res.error}`);
    }
    if (errors.length > 0) return { error: errors.join('; ') };
    return { ok: true, undo: null };
}

/** Before the form opens: does the verb change anything? */
export async function previewRunVerb(
    gameSlug: string,
    verb: 'decline' | 'remove',
    runIds: number[],
): Promise<{ error: string } | { noop: string | null }> {
    if (verb === 'decline') {
        const res = await previewVerdictsAction(gameSlug, 'reject', runIds);
        if ('error' in res) return res;
        return {
            noop:
                res.preview.affectedRunCount === 0
                    ? 'Nothing changes: the run is no longer pending.'
                    : null,
        };
    }
    const res = await previewExcludeAction(gameSlug, { runIds });
    if ('error' in res) return res;
    return {
        noop:
            res.preview.affectedRunCount === 0
                ? 'Nothing changes: the run is already off the board.'
                : null,
    };
}

// ---- One run or manual time ---------------------------------------------------

export interface RunRef {
    runId: number | null;
    manualTimeId: number | null;
    userId: number | null;
    runnerName: string;
    isManual: boolean;
    /** The time on the board now, primary clock. */
    timeMs: number | null;
    /** Both clocks as the entry carries them, whichever one the board ranks by. */
    realTimeMs: number | null;
    gameTimeMs: number | null;
}

/** The clock a board shows beside the one it ranks by. */
export function secondaryOf(
    run: Pick<RunRef, 'realTimeMs' | 'gameTimeMs'>,
    primaryTiming: 'rt' | 'gt',
): number | null {
    return primaryTiming === 'gt' ? run.realTimeMs : run.gameTimeMs;
}

export type RunConfirmInput =
    | {
          verb: 'decline';
          reason: string;
          reasonKey: RejectionReasonKey | null;
      }
    | { verb: 'remove'; reason: string }
    | {
          verb: 'set_time';
          reason: string;
          timeMs: number | null;
          /** The board's other clock, when it shows one. Null removes it. */
          secondary?: SecondaryTimeInput | null;
      }
    | {
          verb: 'move';
          reason: string;
          target: AffectedLeaderboard | null;
          targetName: string;
      }
    | { verb: 'hide_identity'; reason: string; scope: HideScope }
    | {
          verb: 'retime';
          reason: string;
          /** The review's markers; `retimedMs` is the new time. */
          patch: VodReviewPatch | null;
          gameId: number;
      };

const NO_RUN = { error: 'This entry has no run behind it.' };
const NO_MANUAL = {
    error: 'This manual time has no id. Reload and try again.',
};

export async function confirmRunVerb(
    gameSlug: string,
    run: RunRef,
    board: SheetBoard,
    input: RunConfirmInput,
    /** Site admins can lift what Hide identity creates. */
    canLift = false,
): Promise<ConfirmResult> {
    const boardRef: AffectedLeaderboard = {
        categoryId: board.categoryId,
        subcategoryKey: board.subcategoryKey,
    };
    switch (input.verb) {
        case 'decline': {
            if (!run.isManual) {
                if (run.runId == null) return NO_RUN;
                return declineRuns(
                    gameSlug,
                    [run.runId],
                    input.reason,
                    input.reasonKey,
                );
            }
            if (run.manualTimeId == null) return NO_MANUAL;
            // A manual verdict needs written words; a key alone sends its label.
            const label =
                REJECTION_REASONS.find((r) => r.key === input.reasonKey)
                    ?.label ?? '';
            const res = await manualTimeVerdictAction(
                gameSlug,
                run.manualTimeId,
                'reject',
                input.reason.length >= MIN_REASON ? input.reason : label,
            );
            if ('error' in res) return res;
            return { ok: true, undo: null };
        }
        case 'remove': {
            if (!run.isManual) {
                if (run.runId == null) return NO_RUN;
                return removeRuns(gameSlug, [run.runId], input.reason);
            }
            if (run.manualTimeId == null) return NO_MANUAL;
            const res = await deleteManualTimeAction(
                gameSlug,
                run.manualTimeId,
                input.reason,
            );
            if ('error' in res) return res;
            return { ok: true, undo: null };
        }
        case 'set_time': {
            const timeMs = input.timeMs;
            if (timeMs == null) return { error: 'Type the new time first.' };
            if (run.isManual) {
                const id = run.manualTimeId;
                if (id == null) return NO_MANUAL;
                const res = await updateManualTimeAction(
                    gameSlug,
                    id,
                    {
                        reason: input.reason,
                        timeMs,
                        secondary: input.secondary,
                    },
                    boardRef,
                );
                if ('error' in res) return res;
                const old = run.timeMs;
                // Undo puts both clocks back, or takes the second one away
                // again when the edit is what created it.
                const oldSecondaryMs = secondaryOf(run, board.primaryTiming);
                const oldSecondary: SecondaryTimeInput | null =
                    oldSecondaryMs != null
                        ? {
                              timing: otherTiming(
                                  toModTiming(board.primaryTiming),
                              ),
                              timeMs: oldSecondaryMs,
                          }
                        : null;
                return {
                    ok: true,
                    undo:
                        old == null
                            ? null
                            : () =>
                                  unwrap(
                                      updateManualTimeAction(
                                          gameSlug,
                                          id,
                                          {
                                              reason: 'Undo of set time',
                                              timeMs: old,
                                              secondary: oldSecondary,
                                          },
                                          boardRef,
                                      ),
                                  ),
                };
            }
            // A run's clocks are corrected on the run. Filing a manual time
            // beside it only added a competitor — the board keeps whichever
            // is faster — so a correction to a slower time changed nothing,
            // which is exactly what a moderator sees as "it did nothing".
            const runId = run.runId;
            if (runId == null) return NO_RUN;
            const gt = board.primaryTiming === 'gt';
            const secondaryMs = input.secondary?.timeMs ?? null;
            const times = gt
                ? {
                      gameTime: timeMs,
                      ...(secondaryMs != null ? { time: secondaryMs } : {}),
                  }
                : {
                      time: timeMs,
                      ...(secondaryMs != null ? { gameTime: secondaryMs } : {}),
                  };
            const res = await setRunTimesAction(
                gameSlug,
                runId,
                times,
                input.reason,
                boardRef,
            );
            if ('error' in res) return res;
            // Undo writes back exactly the clocks the entry had. Reading them
            // off the entry rather than off its ranked time matters on a
            // game-timed board falling back to real time, where the ranked
            // number is the real time and no game time exists to restore.
            const before = {
                ...(run.realTimeMs != null ? { time: run.realTimeMs } : {}),
                ...(run.gameTimeMs != null ? { gameTime: run.gameTimeMs } : {}),
            };
            return {
                ok: true,
                undo:
                    Object.keys(before).length === 0
                        ? null
                        : () =>
                              unwrap(
                                  setRunTimesAction(
                                      gameSlug,
                                      runId,
                                      before,
                                      'Undo of set time',
                                      boardRef,
                                  ),
                              ),
            };
        }
        case 'move': {
            if (run.runId == null) return NO_RUN;
            if (!input.target) return { error: 'Pick a board first.' };
            const res = await moveRuns(
                gameSlug,
                [
                    {
                        runId: run.runId,
                        runnerName: run.runnerName,
                        subcategoryKey: board.subcategoryKey,
                    },
                ],
                board.categoryId,
                input.target,
                input.reason,
            );
            if ('error' in res) return res;
            return {
                ...res,
                message: `${VERB_LABEL.move}: ${run.runnerName} to ${input.targetName}`,
            };
        }
        case 'retime': {
            const newMs = input.patch?.retimedMs ?? null;
            if (!input.patch || newMs == null)
                return { error: 'Set the start and end on the video first.' };
            const target = run.isManual
                ? run.manualTimeId == null
                    ? null
                    : {
                          kind: 'manual' as const,
                          manualTimeId: run.manualTimeId,
                          gameId: input.gameId,
                      }
                : run.runId == null
                  ? null
                  : { kind: 'run' as const, runId: run.runId };
            if (!target) return run.isManual ? NO_MANUAL : NO_RUN;
            const res = await saveVodReviewAction(
                gameSlug,
                target,
                input.patch,
                { applyRetimeMs: newMs, reason: input.reason, board: boardRef },
            );
            if ('error' in res) return res;
            return { ok: true, undo: null };
        }
        case 'hide_identity': {
            const res =
                input.scope === 'run' || run.userId == null
                    ? run.runId == null
                        ? NO_RUN
                        : await anonymizeRunAction(gameSlug, {
                              runId: run.runId,
                              reason: input.reason,
                              board: {
                                  categoryId: board.categoryId,
                                  subcategoryKey: board.subcategoryKey,
                              },
                          })
                    : await anonymizeUserAction(gameSlug, {
                          userId: run.userId,
                          reason: input.reason,
                          categoryId:
                              input.scope === 'category'
                                  ? board.categoryId
                                  : null,
                      });
            if ('error' in res) return res;
            if (res.result.alreadyExists) {
                return {
                    ok: true,
                    undo: null,
                    message: 'Already hidden at this scope. Nothing changed.',
                };
            }
            const rule = res.result.rule;
            return {
                ok: true,
                undo: canLift
                    ? () =>
                          liftHideRule(gameSlug, rule, {
                              categoryId: board.categoryId,
                              subcategoryKey: board.subcategoryKey,
                          })
                    : null,
                message: `${VERB_LABEL.hide_identity}: ${run.runnerName} now shown as ${rule.displayName}`,
            };
        }
    }
}

// ---- Form specs -----------------------------------------------------------------

export interface RunSpecArgs {
    runnerName: string;
    isManual: boolean;
    timeMs: number | null;
    boardName: string;
    categoryDisplay: string;
    gameDisplay: string;
    /** From the preview: the verb would change nothing. */
    noop?: string | null;
    newTimeMs?: number | null;
    /** Set time: the board's other clock, before and after the edit. */
    secondaryMs?: number | null;
    newSecondaryMs?: number | null;
    /** Set time: the two clocks together do not make a valid entry. */
    timesInvalid?: boolean;
    timePreviewRank?: number | null;
    moveSame?: boolean;
    moveToName?: string;
    hideScope?: HideScope;
    /** Hide identity: the viewer can lift it (site admin). */
    canLift?: boolean;
    /** Retime: the submitted real time the review compares against. */
    retimeFromMs?: number | null;
    /** Retime: the time from the review's start and end markers. */
    retimeToMs?: number | null;
    /** Retime: the review has loaded; false until then. */
    retimeLoaded?: boolean;
    /** Retime: the entry keeps game time, which a real-time retime cannot replace. */
    retimeGameTime?: boolean;
    /** Retime: a start marker is set, so only the end is missing. */
    retimeHasStart?: boolean;
    /** Time input, board picker or scope cards, owned by the caller's state. */
    fields?: ReactNode;
}

/** Set time: the mod typed, cleared or replaced the board's other clock. */
function secondaryChanged(a: RunSpecArgs): boolean {
    return (
        a.newSecondaryMs !== undefined &&
        (a.newSecondaryMs ?? null) !== (a.secondaryMs ?? null)
    );
}

export function runHeavySpec(
    verb: HeavyRunVerb,
    a: RunSpecArgs,
): HeavyFormSpec {
    const base = { verb, runnerName: a.runnerName } as const;
    const noop = a.noop ?? null;
    switch (verb) {
        case 'decline':
            return {
                ...base,
                whatChanges: noop ?? (
                    <>
                        {a.runnerName}&rsquo;s <Time ms={a.timeMs} /> never goes
                        on {a.boardName}.
                    </>
                ),
                undoHint: a.isManual ? undefined : 'Restore from history',
                notUndoable: a.isManual ? MANUAL_DECLINE_UNDO : null,
                reasonKeys: true,
                minReason: MIN_REASON,
                actionLabel: 'Decline run',
                tone: 'danger',
                blocked: noop !== null,
            };
        case 'remove':
            return {
                ...base,
                whatChanges:
                    noop ??
                    (a.isManual ? (
                        'This manual time is deleted.'
                    ) : (
                        <>
                            {a.runnerName}&rsquo;s <Time ms={a.timeMs} /> comes
                            off {a.boardName}.
                        </>
                    )),
                // Remove is the quiet exclusion: nothing reaches the runner.
                told: a.isManual ? MANUAL_DELETE_TOLD : null,
                undoHint: a.isManual ? undefined : 'Restore from history',
                notUndoable: a.isManual ? 'manual times have no restore' : null,
                reasonKeys: false,
                minReason: MIN_REASON,
                actionLabel: 'Remove run',
                tone: 'danger',
                blocked: noop !== null,
            };
        case 'set_time':
            return {
                ...base,
                whatChanges: (
                    <>
                        {a.newTimeMs !== a.timeMs ? (
                            <>
                                <Time ms={a.timeMs} /> becomes{' '}
                                <Time ms={a.newTimeMs ?? null} />.
                            </>
                        ) : null}
                        {secondaryChanged(a) ? (
                            <>
                                {' '}
                                The other clock{' '}
                                {a.newSecondaryMs == null ? (
                                    'comes off the entry.'
                                ) : (
                                    <>
                                        reads <Time ms={a.newSecondaryMs} />.
                                    </>
                                )}
                            </>
                        ) : null}
                        {a.timePreviewRank != null
                            ? ` Lands at #${a.timePreviewRank}.`
                            : null}
                    </>
                ),
                undoHint: 'Undo from the toast right after',
                notUndoable: null,
                reasonKeys: false,
                minReason: MIN_REASON,
                actionLabel: 'Set time',
                tone: 'primary',
                blocked:
                    a.newTimeMs == null ||
                    a.timesInvalid === true ||
                    (a.newTimeMs === a.timeMs && !secondaryChanged(a)),
                fields: a.fields,
            };
        case 'move':
            return {
                ...base,
                whatChanges: a.moveSame ? (
                    `${a.runnerName}'s run is on ${a.boardName}.`
                ) : (
                    <>
                        {a.runnerName}&rsquo;s <Time ms={a.timeMs} /> moves from{' '}
                        {a.boardName} to {a.moveToName}.
                    </>
                ),
                undoHint: 'Move it back',
                notUndoable: null,
                reasonKeys: false,
                minReason: MIN_REASON,
                actionLabel: 'Move run',
                tone: 'primary',
                blocked: a.moveSame !== false || !a.moveToName,
                fields: a.fields,
            };
        case 'retime': {
            const to = a.retimeToMs ?? null;
            const from = a.retimeFromMs ?? null;
            return {
                ...base,
                whatChanges: !a.retimeLoaded ? (
                    'Loading the video review.'
                ) : a.retimeGameTime ? (
                    "This entry is game time. A retime from the video is real time and can't replace it."
                ) : to == null ? (
                    'Set the start and end on the video.'
                ) : to === from ? (
                    <>
                        The video gives <Time ms={to} />, the same time.
                    </>
                ) : (
                    <>
                        <Time ms={from} /> becomes <Time ms={to} />.
                    </>
                ),
                notUndoable: 'set the time again to change it',
                reasonKeys: false,
                minReason: MIN_REASON,
                actionLabel: 'Retime run',
                tone: 'primary',
                blocked:
                    !a.retimeLoaded ||
                    !!a.retimeGameTime ||
                    to == null ||
                    to === from,
                blockedHint: !a.retimeLoaded
                    ? 'Loading the video'
                    : a.retimeGameTime
                      ? 'Game time cannot be retimed'
                      : to == null
                        ? a.retimeHasStart
                            ? 'Set the end on the video'
                            : 'Set the start and end on the video'
                        : to === from
                          ? 'Same as the submitted time'
                          : 'Add a note first',
            };
        }
        case 'hide_identity':
            return {
                ...base,
                whatChanges:
                    a.hideScope === 'category'
                        ? `Every run of ${a.runnerName} on ${a.categoryDisplay} shows as "Anonymous runner".`
                        : a.hideScope === 'game'
                          ? `Every run of ${a.runnerName} in ${a.gameDisplay} shows as "Anonymous runner".`
                          : `${a.runnerName}'s run shows as "Anonymous runner".`,
                undoHint: a.canLift
                    ? 'Undo from the toast right after'
                    : undefined,
                notUndoable: a.canLift ? null : 'only a site admin can lift it',
                reasonKeys: false,
                minReason: MIN_ANONYMIZE_REASON,
                actionLabel: 'Hide identity',
                tone: 'danger',
                fields: a.fields,
            };
    }
}

// ---- Bulk form specs ----------------------------------------------------------

export type HeavyBulkVerb = 'decline' | 'remove' | 'move';

export interface BulkSpecArgs {
    boardName: string;
    /** Entries the verb acts on. */
    count: number;
    /** Manual times among them (decline, remove). */
    manualCount: number;
    /** Decline: entries that are not pending. */
    notPending?: number;
    /** Remove: entries that are not approved. */
    notApproved?: number;
    /** Remove: approved runs a moderator already removed. */
    alreadyRemoved?: number;
    /** Remove: approved runs off the board without being removed (not eligible). */
    notOnBoard?: number;
    /** Move: runs already on the picked board. */
    alreadyThere?: number;
    /** Move: manual times, which cannot move. */
    manualSkipped?: number;
    moveToName?: string;
    /** Move: no board picked. */
    noTarget?: boolean;
    /** Board picker for move, owned by the caller's state. */
    fields?: ReactNode;
}

const countOf = (n: number, one: string, many = `${one}s`) =>
    `${n} ${n === 1 ? one : many}`;

const skippedLine = (n: number | undefined, what: string) =>
    n ? ` ${what}, skipped.` : '';

/** The heavy form for a selection: same parts as a run, with counts and what is skipped. */
export function bulkHeavySpec(
    verb: HeavyBulkVerb,
    a: BulkSpecArgs,
): HeavyFormSpec {
    const base = { verb, runnerName: 'Each runner' } as const;
    const n = a.count;
    switch (verb) {
        case 'decline':
            return {
                ...base,
                whatChanges: `${countOf(n, 'pending run')} never ${n === 1 ? 'goes' : 'go'} on ${a.boardName}.${skippedLine(a.notPending, `${countOf(a.notPending ?? 0, 'run')} not pending`)}`,
                undoHint: a.manualCount ? undefined : 'Restore from history',
                notUndoable: a.manualCount ? MANUAL_DECLINE_UNDO : null,
                reasonKeys: true,
                minReason: MIN_REASON,
                actionLabel: `Decline ${countOf(n, 'run')}`,
                tone: 'danger',
            };
        case 'remove':
            return {
                ...base,
                whatChanges: `${countOf(n, 'approved run')} ${n === 1 ? 'comes' : 'come'} off ${a.boardName}.${a.manualCount ? ` ${countOf(a.manualCount, 'manual time')} ${a.manualCount === 1 ? 'is' : 'are'} deleted.` : ''}${skippedLine(a.notApproved, `${countOf(a.notApproved ?? 0, 'run')} not approved`)}${skippedLine(a.alreadyRemoved, `${countOf(a.alreadyRemoved ?? 0, 'run')} already removed`)}${skippedLine(a.notOnBoard, `${countOf(a.notOnBoard ?? 0, 'run')} not on the board`)}`,
                // Remove is the quiet exclusion; only a deleted manual time
                // reaches its runner.
                told:
                    a.manualCount === 0
                        ? null
                        : a.manualCount === n
                          ? MANUAL_DELETE_TOLD
                          : 'is told only when their manual time is deleted, with this reason.',
                undoHint: a.manualCount ? undefined : 'Restore from history',
                notUndoable: a.manualCount
                    ? 'manual times have no restore'
                    : null,
                reasonKeys: false,
                minReason: MIN_REASON,
                actionLabel: `Remove ${countOf(n, 'run')}`,
                tone: 'danger',
            };
        case 'move':
            return {
                ...base,
                whatChanges: `${
                    a.noTarget || !a.moveToName
                        ? 'Pick a board.'
                        : n === 0
                          ? `Every run is already on ${a.moveToName}.`
                          : `${countOf(n, 'run')} ${n === 1 ? 'moves' : 'move'} to ${a.moveToName}.`
                }${
                    n > 0
                        ? skippedLine(
                              a.alreadyThere,
                              `${countOf(a.alreadyThere ?? 0, 'run')} already there`,
                          )
                        : ''
                }${a.manualSkipped ? ` ${countOf(a.manualSkipped, 'manual time')} skipped.` : ''}`,
                undoHint: 'Move them back',
                notUndoable: null,
                reasonKeys: false,
                minReason: MIN_REASON,
                actionLabel: `Move ${countOf(n, 'run')}`,
                tone: 'primary',
                blocked: a.noTarget || !a.moveToName || n === 0,
                fields: a.fields,
            };
    }
}
