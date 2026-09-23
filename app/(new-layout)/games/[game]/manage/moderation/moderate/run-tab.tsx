'use client';

import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { toast } from 'react-toastify';
import { loadRunHistoryAction } from '~src/actions/run-user-actions.action';
import { DurationField } from '~src/components/time-input/duration-field';
import { RunTimesField } from '~src/components/time-input/run-times-field';
import { buildRunHref } from '~src/lib/board-url';
import { otherTiming, validateRunTimes } from '~src/lib/run-times';
import { timingLabel } from '~src/lib/setup/board-defaults';
import type { VodReviewPatch } from '../../../../../../../types/leaderboards.types';
import type {
    HistoryEvent,
    RejectionReasonKey,
} from '../../../../../../../types/moderation.types';
import { createPlayheadStore } from '../../../leaderboard/vod-review/playhead-store';
import { appliedRetimeMs } from '../../../leaderboard/vod-review/retime';
import { ReviewVodPanel } from '../../../leaderboard/vod-review/review-vod-panel';
import type { VodReviewControls } from '../../../leaderboard/vod-review/vod-review-workbench';
import { previewManualTimeAction } from '../shared/actions/manual-times.action';
import { clocksOfCategory } from '../shared/board-clocks';
import { ScopeCards } from '../shared/run-action-parts';
import { fireUndoToast } from '../shared/undo-toast';
import { subcategoryLabel } from '../worklist/worklist-model';
import {
    loadRunnerTrackRecordAction,
    loadRunSheetAction,
} from './actions/sheet-reads.action';
import { HeavyFormBody, HeavyFormFooter, useHeavyForm } from './heavy-form';
import type {
    BusyHandler,
    FormBackHandler,
    PanelLayout,
} from './moderate-panel';
import styles from './moderate-panel.module.scss';
import { useMoveTarget } from './move-target';
import { useInitialVerb, usePanelVerbKeys, usePanelVerbs } from './panel-verbs';
import { RetimeFormBody } from './retime-form';
import { RulesInline, rulesInlineProps } from './rules-inline';
import {
    RunIdentity,
    RunLeft,
    RunRight,
    type TrackRecord,
} from './run-columns';
import {
    confirmRunVerb,
    type HeavyRunVerb,
    type HideScope,
    MIN_REASON,
    previewRunVerb,
    primaryOf,
    type RunConfirmInput,
    type RunRef,
    runHeavySpec,
    secondaryOf,
} from './run-heavy-verbs';
import {
    isLightRunVerb,
    runTabVerbs,
    runVerbHandlers,
    runVerbState,
} from './run-verbs';
import type { RunSheetSummary } from './sheet-types';
import type { SheetContext, SheetSubject } from './subject';
import { VerbBar } from './verb-bar';
import { type ModerateVerb, RUN_BAR, RUN_MORE, VERB_LABEL } from './verbs';

export interface RunTabProps {
    subject: Extract<SheetSubject, { kind: 'run' }>;
    context: SheetContext;
    onMutated: () => void;
    onOpenRunner: () => void;
    /** Shell contract: register Back while a form is open, null otherwise. */
    onFormBack: FormBackHandler;
    onBusyChange: BusyHandler;
    /** The shell's wrapper. The tab builds a `PanelLayout` and returns `render(layout)`. */
    render: (layout: PanelLayout) => ReactNode;
    /** Acted on once when the run's state has loaded; ignored if it does not apply. */
    initialVerb?: ModerateVerb;
    /** Replaces the default reason when the initial verb is Approve. */
    initialVerbReason?: string;
    onInitialVerbUsed: () => void;
    /** Rendered after the history in the right column. */
    extra?: ReactNode;
}

interface FormDraft {
    verb: HeavyRunVerb;
    /** Preview said nothing would change: the action stays held. */
    noop: string | null;
}

export function RunTab({
    subject,
    context,
    onMutated,
    onOpenRunner,
    onFormBack,
    onBusyChange,
    render,
    initialVerb,
    initialVerbReason,
    onInitialVerbUsed,
    extra,
}: RunTabProps) {
    const { entry, board } = subject;
    const { gameSlug } = context;
    const runId = entry.runId ?? null;
    const userId = entry.userId ?? null;
    const runnerName = entry.runnerName;
    const run: RunRef = {
        runId,
        manualTimeId: entry.manualTimeId ?? null,
        userId,
        runnerName,
        isManual: entry.source === 'manual',
        timeMs: entry.time,
        realTimeMs: entry.realTime,
        gameTimeMs: entry.gameTime,
    };
    const runPrimaryMs = primaryOf(run, board.primaryTiming);
    const runSecondaryMs = secondaryOf(run, board.primaryTiming);

    // ---- Reads -----------------------------------------------------------------
    // The summary is the truth for status, removed, marked and videos. It is
    // read again after every mutation and every undo.
    const [summary, setSummary] = useState<RunSheetSummary | null>(null);
    const [summaryFailed, setSummaryFailed] = useState(false);
    const [fullHistory, setFullHistory] = useState<HistoryEvent[] | null>(null);
    const [record, setRecord] = useState<TrackRecord | null>(null);
    const loadSeq = useRef(0);

    const loadSummary = useCallback(async () => {
        if (runId == null) return;
        const seq = ++loadSeq.current;
        const res = await loadRunSheetAction(gameSlug, runId).catch(() => ({
            error: 'Could not load the run.',
        }));
        if (seq !== loadSeq.current) return;
        if ('error' in res) {
            toast.error(res.error);
            setSummaryFailed(true);
            return;
        }
        setSummaryFailed(false);
        setSummary(res.summary);
        setFullHistory(null);
    }, [gameSlug, runId]);

    useEffect(() => {
        void loadSummary();
    }, [loadSummary]);

    useEffect(() => {
        if (userId == null) return;
        let cancelled = false;
        loadRunnerTrackRecordAction(gameSlug, userId)
            .then((res) => {
                if (cancelled || 'error' in res) return;
                setRecord(res.record);
            })
            .catch(() => {
                // The line is optional: without a read it stays out.
            });
        return () => {
            cancelled = true;
        };
    }, [gameSlug, userId]);

    const [showingAll, setShowingAll] = useState(false);
    const showAll = async () => {
        if (runId == null || showingAll) return;
        setShowingAll(true);
        try {
            const res = await loadRunHistoryAction(runId);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setFullHistory(
                [...res.events].sort((a, b) => b.at.localeCompare(a.at)),
            );
        } catch {
            toast.error('Could not load the history.');
        } finally {
            setShowingAll(false);
        }
    };

    const afterMutation = () => {
        onMutated();
        void loadSummary();
    };

    // ---- Verb state ---------------------------------------------------------------
    const verbState = runVerbState(entry, summary, { inScope: true });
    const availability = runTabVerbs(verbState, {
        summaryLoaded: summary !== null,
        statusKnown: subject.statusKnown,
        summaryFailed,
    });
    const isEnabled = (verb: ModerateVerb) =>
        availability.some((a) => a.verb === verb && a.enabled);

    // ---- Board words -----------------------------------------------------------
    const category = context.categories.find((c) => c.id === board.categoryId);
    const sub = subcategoryLabel(
        { categoryId: board.categoryId, subcategoryKey: board.subcategoryKey },
        context.variables,
    );
    const boardName = sub
        ? `${board.categoryDisplay} · ${sub}`
        : board.categoryDisplay;
    const clock = timingLabel(board.primaryTiming, category?.gameTimeLabel);
    // A board that shows both clocks holds both on the entry, so Set time
    // corrects both — a game-timed board with a real-time column had no way
    // to put a real time on an entry at all.
    const clocks = category ? clocksOfCategory(category) : null;

    // The board's rules, for the surfaces that show them.
    const rules = <RulesInline {...rulesInlineProps(board, context)} />;

    // ---- Heavy form ---------------------------------------------------------------
    const [draft, setDraft] = useState<FormDraft | null>(null);
    const [newTimeMs, setNewTimeMs] = useState<number | null>(null);
    const [newSecondaryMs, setNewSecondaryMs] = useState<number | null>(null);
    const setTimeVerdict = clocks
        ? validateRunTimes({
              primaryTiming: clocks.primaryTiming,
              showSecondary: clocks.showSecondary,
              primaryMs: newTimeMs,
              secondaryMs: newSecondaryMs,
          })
        : null;
    const [timePreviewRank, setTimePreviewRank] = useState<number | null>(null);
    const move = useMoveTarget(board, context);
    const [hideScope, setHideScope] = useState<HideScope>('run');
    // Retime: the review's markers and what it compares against.
    const [reviewPatch, setReviewPatch] = useState<VodReviewPatch | null>(null);
    const [reviewInfo, setReviewInfo] = useState<{
        realTimeMs: number | null;
        timing: 'realtime' | 'gametime';
    } | null>(null);
    const reviewControls = useRef<VodReviewControls | null>(null);
    const [playhead] = useState(createPlayheadStore);

    const formOpen = draft !== null;
    const { busy, busyRef, setBusy, back, openerRef, footerRef, rootRef } =
        usePanelVerbs({
            formOpen,
            closeForm: () => setDraft(null),
            onFormBack,
            onBusyChange,
        });

    // Where a proposed time would land: typed into Set time, or measured by
    // the Retime markers. Both replace the run's time, so both preview a rank.
    const previewTimeMs =
        draft?.verb === 'set_time'
            ? newTimeMs
            : draft?.verb === 'retime'
              ? appliedRetimeMs(reviewPatch)
              : null;
    useEffect(() => {
        if (previewTimeMs == null) {
            setTimePreviewRank(null);
            return;
        }
        let cancelled = false;
        const t = setTimeout(() => {
            previewManualTimeAction(gameSlug, {
                runnerRef:
                    userId != null ? { userId } : { guestName: runnerName },
                categoryId: board.categoryId,
                subcategoryKey: board.subcategoryKey,
                // A retime measures real time whatever the board's clock is.
                timing:
                    draft?.verb === 'retime' || board.primaryTiming !== 'gt'
                        ? 'realtime'
                        : 'gametime',
                timeMs: previewTimeMs,
            })
                .then((res) => {
                    if (cancelled || 'error' in res) return;
                    setTimePreviewRank(res.preview.resultingEntry.rank);
                })
                .catch(() => {
                    // No rank then; the time itself still reads.
                });
        }, 350);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [
        previewTimeMs,
        draft?.verb,
        gameSlug,
        userId,
        runnerName,
        board.categoryId,
        board.subcategoryKey,
        board.primaryTiming,
    ]);

    const hideOptions = (
        [
            { value: 'run', title: 'This run only' },
            {
                value: 'category',
                title: `This runner on ${board.categoryDisplay}`,
            },
            {
                value: 'game',
                title: `This runner across ${context.gameDisplay}`,
            },
        ] as { value: HideScope; title: string }[]
    ).filter((o) => (o.value === 'run' ? runId != null : userId != null));

    const fieldsFor = (verb: HeavyRunVerb): ReactNode => {
        switch (verb) {
            case 'set_time':
                return clocks ? (
                    <RunTimesField
                        primaryTiming={clocks.primaryTiming}
                        gameTimeLabel={clocks.gameTimeLabel}
                        showSecondary={clocks.showSecondary}
                        primaryMs={newTimeMs}
                        onPrimaryChange={setNewTimeMs}
                        secondaryMs={newSecondaryMs}
                        onSecondaryChange={setNewSecondaryMs}
                        idPrefix="set-time"
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
            case 'move':
                return move.fields(busy);
            case 'hide_identity':
                return hideOptions.length > 1 ? (
                    <ScopeCards
                        label="Scope"
                        options={hideOptions}
                        value={hideScope}
                        onChange={setHideScope}
                        disabled={busy}
                    />
                ) : undefined;
            default:
                return undefined;
        }
    };

    const spec = draft
        ? runHeavySpec(draft.verb, {
              runnerName,
              isManual: run.isManual,
              timeMs: run.timeMs,
              boardName,
              categoryDisplay: board.categoryDisplay,
              gameDisplay: context.gameDisplay,
              noop: draft.noop,
              newTimeMs,
              primaryMs: runPrimaryMs,
              secondaryMs: runSecondaryMs,
              newSecondaryMs: clocks?.showSecondary
                  ? newSecondaryMs
                  : undefined,
              timesInvalid: setTimeVerdict ? !setTimeVerdict.ok : false,
              timePreviewRank,
              moveSame: move.same,
              moveToName: move.toName,
              hideScope,
              canLift: context.canSiteBan,
              retimeFromMs: reviewInfo?.realTimeMs ?? null,
              retimeToMs: appliedRetimeMs(reviewPatch),
              retimeLoaded: reviewInfo !== null,
              retimeGameTime: reviewInfo?.timing === 'gametime',
              retimeHasStart: !!reviewPatch?.markers.some(
                  (m) => m.kind === 'start',
              ),
              retimeHasEnd: !!reviewPatch?.markers.some(
                  (m) => m.kind === 'end',
              ),
              fields: fieldsFor(draft.verb),
          })
        : null;
    const formState = useHeavyForm(spec);

    // ---- Verbs -------------------------------------------------------------------------
    const openForm = async (verb: HeavyRunVerb) => {
        // A correction starts from what is on the board, not from an empty
        // field: the mod is changing one clock, not retyping the entry.
        setNewTimeMs(verb === 'set_time' ? runPrimaryMs : null);
        setNewSecondaryMs(verb === 'set_time' ? runSecondaryMs : null);
        setReviewPatch(null);
        setReviewInfo(null);
        move.reset();
        setHideScope(runId != null ? 'run' : 'category');
        let noop: string | null = null;
        if ((verb === 'decline' || verb === 'remove') && runId != null) {
            setBusy(true);
            try {
                const res = await previewRunVerb(gameSlug, verb, [runId]);
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
                noop = res.noop;
            } catch {
                toast.error('Could not check the run. Try again.');
                return;
            } finally {
                setBusy(false);
            }
        }
        openerRef.current = verb;
        setDraft({ verb, noop });
    };

    const runLight = async (
        verb: 'approve' | 'restore' | 'send_back' | 'ask_video' | 'mark',
        reason?: string,
    ) => {
        setBusy(true);
        try {
            const res = await runVerbHandlers[verb]({
                gameSlug,
                runId,
                manualTimeId: run.manualTimeId,
                reason,
                excluded: summary?.excluded,
                status: summary?.status,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const message = `${VERB_LABEL[verb]}: ${runnerName}`;
            if (res.undo) fireUndoToast(message, res.undo, afterMutation);
            else toast.success(message);
            afterMutation();
        } catch {
            toast.error('Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const handle = (verb: ModerateVerb, reason?: string) => {
        if (busyRef.current || draft !== null || !isEnabled(verb)) return;
        if (isLightRunVerb(verb)) {
            void runLight(verb, reason);
            return;
        }
        switch (verb) {
            case 'decline':
            case 'remove':
            case 'set_time':
            case 'move':
            case 'hide_identity':
            case 'retime':
                void openForm(verb);
                return;
            default:
                return;
        }
    };

    const confirm = async (
        reason: string,
        reasonKey: RejectionReasonKey | null,
    ) => {
        if (!draft || busyRef.current) return;
        const verb = draft.verb;
        const input: RunConfirmInput =
            verb === 'decline'
                ? { verb, reason, reasonKey }
                : verb === 'set_time'
                  ? {
                        verb,
                        reason,
                        timeMs: newTimeMs,
                        // Clearing a clock the entry showed removes it.
                        // An empty field that started empty sends nothing:
                        // not every read path reports the second clock, and
                        // absence there must not delete a row the moderator
                        // was never shown.
                        secondary: !clocks?.showSecondary
                            ? undefined
                            : newSecondaryMs != null
                              ? {
                                    timing: otherTiming(clocks.primaryTiming),
                                    timeMs: newSecondaryMs,
                                }
                              : runSecondaryMs != null
                                ? null
                                : undefined,
                    }
                  : verb === 'move'
                    ? {
                          verb,
                          reason,
                          target: move.target,
                          targetName: move.toName,
                      }
                    : verb === 'hide_identity'
                      ? { verb, reason, scope: hideScope }
                      : verb === 'retime'
                        ? {
                              verb,
                              reason,
                              patch: reviewPatch,
                              gameId: context.gameId,
                          }
                        : { verb, reason };
        setBusy(true);
        try {
            const res = await confirmRunVerb(
                gameSlug,
                run,
                board,
                input,
                context.canSiteBan,
            );
            // Errors keep the form open and usable.
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            onFormBack(null);
            setDraft(null);
            const message = res.message ?? `${VERB_LABEL[verb]}: ${runnerName}`;
            if (res.undo) fireUndoToast(message, res.undo, afterMutation);
            else toast.success(message);
            afterMutation();
        } catch {
            toast.error('Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    // ---- Keys ----------------------------------------------------------------------------
    usePanelVerbKeys({ handle, formOpen, busyRef, rootRef });
    useInitialVerb({
        verb: initialVerb,
        ready: summary !== null || runId == null,
        handle: (verb) =>
            handle(verb, verb === 'approve' ? initialVerbReason : undefined),
        onUsed: onInitialVerbUsed,
    });

    // ---- Layout ----------------------------------------------------------------------------
    const runPage = runId != null ? buildRunHref(gameSlug, runId) : null;
    const identity = (
        <RunIdentity
            entry={entry}
            status={verbState.status}
            excluded={verbState.excluded}
            categoryDisplay={board.categoryDisplay}
            subcategory={sub}
            clock={clock}
            formOpen={formOpen}
            onOpenRunner={onOpenRunner}
            rootRef={rootRef}
        />
    );
    const vodUrl = summary
        ? (summary.vodUrls[0] ?? null)
        : (entry.vodUrl ?? null);
    const reviewTarget =
        run.isManual && run.manualTimeId != null
            ? {
                  kind: 'manual' as const,
                  manualTimeId: run.manualTimeId,
                  gameId: context.gameId,
              }
            : runId != null
              ? { kind: 'run' as const, runId }
              : null;
    const left =
        draft?.verb === 'retime' && vodUrl && reviewTarget ? (
            <ReviewVodPanel
                url={vodUrl}
                target={reviewTarget}
                gameSlug={gameSlug}
                onChange={setReviewPatch}
                onLoaded={setReviewInfo}
                controlsRef={reviewControls}
                playheadStore={playhead}
                hideActions
            />
        ) : (
            <RunLeft vodUrl={vodUrl} summary={summary} runPage={runPage} />
        );

    const layout: PanelLayout =
        spec && draft
            ? {
                  identity,
                  left,
                  right:
                      draft.verb === 'retime' ? (
                          <RetimeFormBody
                              submittedMs={reviewInfo?.realTimeMs ?? null}
                              retimedMs={appliedRetimeMs(reviewPatch)}
                              offsetMs={reviewPatch?.offsetMs ?? 0}
                              timing={reviewInfo?.timing ?? 'realtime'}
                              loaded={reviewInfo !== null}
                              fromRank={entry.rank}
                              toRank={timePreviewRank}
                              boardName={boardName}
                              markers={reviewPatch?.markers ?? []}
                              markersFps={reviewPatch?.fps ?? 60}
                              controlsRef={reviewControls}
                              playheadStore={playhead}
                              note={formState.reason}
                              onNoteChange={formState.setReason}
                              minNote={MIN_REASON}
                              busy={busy}
                              rules={rules}
                          />
                      ) : (
                          <HeavyFormBody
                              key={draft.verb}
                              spec={spec}
                              state={formState}
                              busy={busy}
                          />
                      ),
                  footer: (
                      <HeavyFormFooter
                          spec={spec}
                          state={formState}
                          busy={busy}
                          onBack={back}
                          onConfirm={(r, k) => void confirm(r, k)}
                      />
                  ),
                  pageLink: null,
              }
            : {
                  identity,
                  left,
                  right: (
                      <>
                          <RunRight
                              record={userId != null ? record : null}
                              summary={summary}
                              history={fullHistory ?? summary?.history ?? []}
                              expanded={fullHistory !== null}
                              showingAll={showingAll}
                              onShowAll={() => void showAll()}
                              gameSlug={gameSlug}
                              runId={runId}
                              onUndone={afterMutation}
                          />
                          {extra}
                      </>
                  ),
                  footer: (
                      <div ref={footerRef} className={styles.contents}>
                          <VerbBar
                              bar={RUN_BAR}
                              more={RUN_MORE}
                              availability={availability}
                              busy={busy}
                              onVerb={handle}
                          />
                      </div>
                  ),
                  pageLink: runPage
                      ? { href: runPage, label: 'Run page' }
                      : null,
              };

    return render(layout);
}
