'use client';

import { type ReactNode, useRef, useState } from 'react';
import { DurationField } from '~src/components/time-input/duration-field';
import { RunTimesField } from '~src/components/time-input/run-times-field';
import { validateRunTimes } from '~src/lib/run-times';
import { timingLabel } from '~src/lib/setup/board-defaults';
import type { VodReviewPatch } from '../../../../../../types/leaderboards.types';
import { createPlayheadStore } from '../../leaderboard/vod-review/playhead-store';
import { appliedRetimeMs } from '../../leaderboard/vod-review/retime';
import { ReviewVodPanel } from '../../leaderboard/vod-review/review-vod-panel';
import type { VodReviewControls } from '../../leaderboard/vod-review/vod-review-workbench';
import {
    HeavyFormBody,
    HeavyFormFooter,
    useHeavyForm,
} from '../../manage/moderation/moderate/heavy-form';
import { useMoveTarget } from '../../manage/moderation/moderate/move-target';
import { RetimeFormBody } from '../../manage/moderation/moderate/retime-form';
import {
    RulesInline,
    rulesInlineProps,
} from '../../manage/moderation/moderate/rules-inline';
import {
    setTimeSecondary,
    useTimePreviewRank,
} from '../../manage/moderation/moderate/run-form-shared';
import {
    MIN_REASON,
    primaryOf,
    type RunConfirmInput,
    type RunRef,
    runHeavySpec,
    secondaryOf,
} from '../../manage/moderation/moderate/run-heavy-verbs';
import { VERB_LABEL } from '../../manage/moderation/moderate/verbs';
import { clocksOfCategory } from '../../manage/moderation/shared/board-clocks';
import { subcategoryLabel } from '../../manage/moderation/worklist/worklist-model';
import { BoardDialog } from '../../shared/board-dialog';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
import styles from './decision-bar.module.scss';
import type { HeavyVerb } from './run-verb-model';

/**
 * Set time, Retime, Move and Remove: the moderate sheet's heavy form, in a
 * dialog. Owns the form's fields; the confirm goes back to the caller.
 */
export function VerbDialog({
    verb,
    noop,
    model,
    mod,
    run,
    busy,
    onCancel,
    onConfirm,
}: {
    verb: HeavyVerb;
    /** From the preview: the verb would change nothing. */
    noop: string | null;
    model: RunViewModel;
    mod: ModContext;
    run: RunRef;
    busy: boolean;
    onCancel: () => void;
    onConfirm: (input: RunConfirmInput) => void;
}) {
    const { board, sheet: context } = mod;
    const category = context.categories.find((c) => c.id === board.categoryId);
    const clocks = category ? clocksOfCategory(category) : null;
    const clock = timingLabel(board.primaryTiming, category?.gameTimeLabel);
    const sub = subcategoryLabel(
        { categoryId: board.categoryId, subcategoryKey: board.subcategoryKey },
        context.variables,
    );
    const boardName = sub
        ? `${board.categoryDisplay} · ${sub}`
        : board.categoryDisplay;
    const runPrimaryMs = primaryOf(run, board.primaryTiming);
    const runSecondaryMs = secondaryOf(run, board.primaryTiming);

    // A correction starts from what is on the board, not from an empty field.
    const [newTimeMs, setNewTimeMs] = useState<number | null>(
        verb === 'set_time' ? runPrimaryMs : null,
    );
    const [newSecondaryMs, setNewSecondaryMs] = useState<number | null>(
        verb === 'set_time' ? runSecondaryMs : null,
    );
    const timesVerdict = clocks
        ? validateRunTimes({
              primaryTiming: clocks.primaryTiming,
              showSecondary: clocks.showSecondary,
              primaryMs: newTimeMs,
              secondaryMs: newSecondaryMs,
          })
        : null;
    const move = useMoveTarget(board, context);
    const [reviewPatch, setReviewPatch] = useState<VodReviewPatch | null>(null);
    const [reviewInfo, setReviewInfo] = useState<{
        realTimeMs: number | null;
        timing: 'realtime' | 'gametime';
    } | null>(null);
    const reviewControls = useRef<VodReviewControls | null>(null);
    const [playhead] = useState(createPlayheadStore);
    const retimedMs = appliedRetimeMs(reviewPatch);

    const previewRank = useTimePreviewRank({
        gameSlug: context.gameSlug,
        userId: run.userId,
        runnerName: run.runnerName,
        board,
        timeMs:
            verb === 'set_time'
                ? newTimeMs
                : verb === 'retime'
                  ? retimedMs
                  : null,
        retime: verb === 'retime',
    });

    let fields: ReactNode;
    if (verb === 'set_time') {
        fields = clocks ? (
            <RunTimesField
                primaryTiming={clocks.primaryTiming}
                gameTimeLabel={clocks.gameTimeLabel}
                showSecondary={clocks.showSecondary}
                primaryMs={newTimeMs}
                onPrimaryChange={setNewTimeMs}
                secondaryMs={newSecondaryMs}
                onSecondaryChange={setNewSecondaryMs}
                idPrefix="run-view-set-time"
                showErrors
                disabled={busy}
            />
        ) : (
            <DurationField
                size="lg"
                aria-label={`New time (${clock})`}
                value={newTimeMs}
                onChange={setNewTimeMs}
                disabled={busy}
            />
        );
    } else if (verb === 'move') {
        fields = move.fields(busy);
    }

    const spec = runHeavySpec(verb, {
        runnerName: run.runnerName,
        isManual: run.isManual,
        timeMs: run.timeMs,
        boardName,
        categoryDisplay: board.categoryDisplay,
        gameDisplay: context.gameDisplay,
        noop,
        newTimeMs,
        primaryMs: runPrimaryMs,
        secondaryMs: runSecondaryMs,
        newSecondaryMs: clocks?.showSecondary ? newSecondaryMs : undefined,
        timesInvalid: timesVerdict ? !timesVerdict.ok : false,
        timePreviewRank: previewRank,
        moveSame: move.same,
        moveToName: move.toName,
        retimeFromMs: reviewInfo?.realTimeMs ?? null,
        retimeToMs: retimedMs,
        retimeLoaded: reviewInfo !== null,
        retimeGameTime: reviewInfo?.timing === 'gametime',
        retimeHasStart: !!reviewPatch?.markers.some((m) => m.kind === 'start'),
        retimeHasEnd: !!reviewPatch?.markers.some((m) => m.kind === 'end'),
        fields,
    });
    const form = useHeavyForm(spec);

    const confirm = (reason: string) => {
        switch (verb) {
            case 'set_time':
                onConfirm({
                    verb,
                    reason,
                    timeMs: newTimeMs,
                    secondary: setTimeSecondary(
                        clocks,
                        newSecondaryMs,
                        runSecondaryMs,
                    ),
                });
                return;
            case 'move':
                onConfirm({
                    verb,
                    reason,
                    target: move.target,
                    targetName: move.toName,
                });
                return;
            case 'retime':
                onConfirm({
                    verb,
                    reason,
                    patch: reviewPatch,
                    gameId: context.gameId,
                });
                return;
            case 'remove':
                onConfirm({ verb, reason });
                return;
        }
    };

    const reviewTarget = run.isManual
        ? run.manualTimeId != null
            ? {
                  kind: 'manual' as const,
                  manualTimeId: run.manualTimeId,
                  gameId: context.gameId,
              }
            : null
        : run.runId != null
          ? { kind: 'run' as const, runId: run.runId }
          : null;
    const retimeTarget =
        verb === 'retime' && model.vodUrl ? reviewTarget : null;

    return (
        <BoardDialog
            open
            onClose={() => {
                if (!busy) onCancel();
            }}
            title={VERB_LABEL[verb]}
            size={retimeTarget ? 'full' : 'lg'}
            closeOnBackdropClick={!busy}
            themed
        >
            {retimeTarget ? (
                <div className={styles.retime}>
                    <div>
                        <ReviewVodPanel
                            url={model.vodUrl ?? ''}
                            target={retimeTarget}
                            gameSlug={context.gameSlug}
                            onChange={setReviewPatch}
                            onLoaded={setReviewInfo}
                            controlsRef={reviewControls}
                            playheadStore={playhead}
                            hideActions
                        />
                    </div>
                    <div>
                        <RetimeFormBody
                            submittedMs={reviewInfo?.realTimeMs ?? null}
                            retimedMs={retimedMs}
                            offsetMs={reviewPatch?.offsetMs ?? 0}
                            timing={reviewInfo?.timing ?? 'realtime'}
                            loaded={reviewInfo !== null}
                            fromRank={model.boardContext?.rank ?? null}
                            toRank={previewRank}
                            boardName={boardName}
                            markers={reviewPatch?.markers ?? []}
                            markersFps={reviewPatch?.fps ?? 60}
                            controlsRef={reviewControls}
                            playheadStore={playhead}
                            note={form.reason}
                            onNoteChange={form.setReason}
                            minNote={MIN_REASON}
                            busy={busy}
                            rules={
                                <RulesInline
                                    {...rulesInlineProps(board, context)}
                                />
                            }
                        />
                    </div>
                </div>
            ) : (
                <div className={styles.flushBody}>
                    <HeavyFormBody spec={spec} state={form} busy={busy} />
                </div>
            )}
            <div className={styles.dialogFooter}>
                <HeavyFormFooter
                    spec={spec}
                    state={form}
                    busy={busy}
                    onBack={onCancel}
                    onConfirm={(reason) => confirm(reason)}
                />
            </div>
        </BoardDialog>
    );
}
