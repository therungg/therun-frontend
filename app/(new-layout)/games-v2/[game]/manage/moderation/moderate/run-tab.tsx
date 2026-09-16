'use client';

import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'react-toastify';
import { loadRunHistoryAction } from '~src/actions/run-user-actions.action';
import { DurationField } from '~src/components/time-input/duration-field';
import { timingLabel } from '~src/lib/setup/board-defaults';
import { buildSubcategoryKey } from '~src/lib/variables/keys';
import type {
    HistoryEvent,
    RejectionReasonKey,
} from '../../../../../../../types/moderation.types';
import {
    defaultCanonicalOf,
    SubcategoryBands,
    subcategoryVariablesFor,
} from '../../boards/subcategory-bands';
import { isTriageInert } from '../attention/triage-keyboard';
import { previewManualTimeAction } from '../shared/actions/manual-times.action';
import { ScopeCards } from '../shared/run-action-parts';
import { fireUndoToast } from '../shared/undo-toast';
import { subcategoryLabel } from '../worklist/worklist-model';
import {
    loadRunnerSheetAction,
    loadRunSheetAction,
} from './actions/sheet-reads.action';
import { HeavyFormBody, HeavyFormFooter, useHeavyForm } from './heavy-form';
import type {
    BusyHandler,
    FormBackHandler,
    PanelLayout,
} from './moderate-panel';
import styles from './moderate-panel.module.scss';
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
    previewRunVerb,
    type RunConfirmInput,
    type RunRef,
    runHeavySpec,
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
import {
    type ModerateVerb,
    RUN_BAR,
    RUN_MORE,
    VERB_LABEL,
    verbFromKey,
} from './verbs';

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
    };

    // ---- Reads -----------------------------------------------------------------
    // The summary is the truth for status, removed, marked and videos. It is
    // read again after every mutation and every undo.
    const [summary, setSummary] = useState<RunSheetSummary | null>(null);
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
            return;
        }
        setSummary(res.summary);
        setFullHistory(null);
    }, [gameSlug, runId]);

    useEffect(() => {
        void loadSummary();
    }, [loadSummary]);

    useEffect(() => {
        if (userId == null) return;
        let cancelled = false;
        loadRunnerSheetAction(gameSlug, userId)
            .then((res) => {
                if (cancelled || 'error' in res) return;
                const counts: TrackRecord = {
                    approved: 0,
                    declined: 0,
                    pending: 0,
                    since: null,
                };
                for (const combo of res.data.combos) {
                    for (const r of combo.runs) {
                        if (r.verificationStatus === 'verified')
                            counts.approved++;
                        else if (r.verificationStatus === 'rejected')
                            counts.declined++;
                        else if (r.verificationStatus === 'pending')
                            counts.pending++;
                        if (counts.since === null || r.endedAt < counts.since)
                            counts.since = r.endedAt;
                    }
                }
                setRecord(counts);
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
    });
    const isEnabled = (verb: ModerateVerb) =>
        availability.some((a) => a.verb === verb && a.enabled);

    // ---- Busy -------------------------------------------------------------------
    const [busy, setBusyState] = useState(false);
    const busyRef = useRef(false);
    const setBusy = useCallback(
        (b: boolean) => {
            busyRef.current = b;
            setBusyState(b);
            onBusyChange(b);
        },
        [onBusyChange],
    );
    useEffect(() => () => onBusyChange(false), [onBusyChange]);

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

    // ---- Heavy form ---------------------------------------------------------------
    const [draft, setDraft] = useState<FormDraft | null>(null);
    const [newTimeMs, setNewTimeMs] = useState<number | null>(null);
    const [timePreviewRank, setTimePreviewRank] = useState<number | null>(null);
    const [moveCategoryId, setMoveCategoryId] = useState<number>(
        board.categoryId,
    );
    const [moveValues, setMoveValues] = useState<Record<string, string>>({});
    const [hideScope, setHideScope] = useState<HideScope>('run');
    const openerRef = useRef<ModerateVerb | null>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const back = useCallback(() => {
        if (busyRef.current) return;
        setDraft(null);
    }, []);

    const formOpen = draft !== null;
    useEffect(() => {
        if (!formOpen) return;
        onFormBack(back);
        return () => onFormBack(null);
    }, [formOpen, onFormBack, back]);

    // After Back or a confirm, focus returns to the verb that opened the form
    // (or to More, when the verb lives in the menu).
    useEffect(() => {
        if (formOpen || !openerRef.current) return;
        const verb = openerRef.current;
        openerRef.current = null;
        const root = footerRef.current;
        const target =
            root?.querySelector<HTMLElement>(`[data-verb="${verb}"]`) ??
            root?.querySelector<HTMLElement>('[data-more]');
        target?.focus();
    }, [formOpen]);

    // Set time: where the new time lands, once one is typed.
    useEffect(() => {
        if (draft?.verb !== 'set_time' || newTimeMs == null) {
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
                timing: board.primaryTiming === 'gt' ? 'gametime' : 'realtime',
                timeMs: newTimeMs,
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
        draft?.verb,
        newTimeMs,
        gameSlug,
        userId,
        runnerName,
        board.categoryId,
        board.subcategoryKey,
        board.primaryTiming,
    ]);

    // Move: the boards a run can go to, same rule as the board's Move.
    const moveTargets = useMemo(
        () =>
            context.categories.filter(
                (c) =>
                    (!c.archived && (c.isMain ?? false)) ||
                    c.id === board.categoryId,
            ),
        [context.categories, board.categoryId],
    );
    const moveCategory =
        moveTargets.find((c) => c.id === moveCategoryId) ?? null;
    const moveSubVars = useMemo(
        () =>
            moveCategory
                ? subcategoryVariablesFor(moveCategory.id, context.variables)
                : [],
        [moveCategory, context.variables],
    );
    const moveKey = useMemo(
        () =>
            moveSubVars.length === 0
                ? ''
                : buildSubcategoryKey(
                      moveSubVars.map((v) => ({
                          name: v.nameNormalized,
                          value:
                              moveValues[v.nameNormalized] ??
                              defaultCanonicalOf(v),
                      })),
                  ),
        [moveSubVars, moveValues],
    );
    const moveSame =
        moveCategory?.id === board.categoryId &&
        moveKey === board.subcategoryKey;
    const moveSub = moveCategory
        ? subcategoryLabel(
              { categoryId: moveCategory.id, subcategoryKey: moveKey },
              context.variables,
          )
        : '';
    const moveToName = moveCategory
        ? moveSub
            ? `${moveCategory.display} · ${moveSub}`
            : moveCategory.display
        : '';

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
                return (
                    <DurationField
                        size="lg"
                        aria-label={`New time (${clock})`}
                        value={newTimeMs}
                        onChange={setNewTimeMs}
                        disabled={busy}
                    />
                );
            case 'move':
                return (
                    <div className={styles.fieldStack}>
                        <select
                            aria-label="Board"
                            className="form-select form-select-sm"
                            value={moveCategoryId}
                            onChange={(e) => {
                                setMoveCategoryId(Number(e.target.value));
                                setMoveValues({});
                            }}
                            disabled={busy}
                        >
                            {moveTargets.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display}
                                </option>
                            ))}
                        </select>
                        <SubcategoryBands
                            variables={moveSubVars}
                            selectedValues={moveValues}
                            onSelect={(name, canonical) =>
                                setMoveValues((prev) => ({
                                    ...prev,
                                    [name]: canonical,
                                }))
                            }
                            idPrefix="moderate-move"
                        />
                    </div>
                );
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
              timePreviewRank,
              moveSame: moveSame || moveCategory == null,
              moveToName,
              hideScope,
              fields: fieldsFor(draft.verb),
          })
        : null;
    const formState = useHeavyForm(spec);

    // ---- Verbs -------------------------------------------------------------------------
    const openForm = async (verb: HeavyRunVerb) => {
        setNewTimeMs(null);
        setMoveCategoryId(board.categoryId);
        setMoveValues({});
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
    ) => {
        setBusy(true);
        try {
            const res = await runVerbHandlers[verb]({
                gameSlug,
                runId,
                manualTimeId: run.manualTimeId,
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

    const handle = (verb: ModerateVerb) => {
        if (busyRef.current || draft !== null || !isEnabled(verb)) return;
        if (isLightRunVerb(verb)) {
            void runLight(verb);
            return;
        }
        switch (verb) {
            case 'decline':
            case 'remove':
            case 'set_time':
            case 'move':
            case 'hide_identity':
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
                  ? { verb, reason, timeMs: newTimeMs }
                  : verb === 'move'
                    ? {
                          verb,
                          reason,
                          target:
                              moveCategory && !moveSame
                                  ? {
                                        categoryId: moveCategory.id,
                                        subcategoryKey: moveKey,
                                    }
                                  : null,
                          targetName: moveToName,
                      }
                    : verb === 'hide_identity'
                      ? { verb, reason, scope: hideScope }
                      : { verb, reason };
        setBusy(true);
        try {
            const res = await confirmRunVerb(gameSlug, run, board, input);
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
    const handleRef = useRef(handle);
    const formOpenRef = useRef(formOpen);
    useEffect(() => {
        handleRef.current = handle;
        formOpenRef.current = formOpen;
    });
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.repeat) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const active = document.activeElement as HTMLElement | null;
            if (
                isTriageInert({
                    activeTag: active?.tagName ?? null,
                    isContentEditable: active?.isContentEditable ?? false,
                    dialogOpen: formOpenRef.current || busyRef.current,
                })
            )
                return;
            // Inline on a page, keys act only while focus is in the panel.
            const panel = rootRef.current?.closest('[data-mount]');
            if (
                panel?.getAttribute('data-mount') !== 'modal' &&
                !panel?.contains(active)
            )
                return;
            const verb = verbFromKey(e.key);
            if (!verb) return;
            e.preventDefault();
            handleRef.current(verb);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    // ---- Layout ----------------------------------------------------------------------------
    const runPage = runId != null ? `/games-v2/${gameSlug}/run/${runId}` : null;
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
    const left = (
        <RunLeft
            vodUrl={
                summary ? (summary.vodUrls[0] ?? null) : (entry.vodUrl ?? null)
            }
            summary={summary}
            runPage={runPage}
        />
    );

    const layout: PanelLayout =
        spec && draft
            ? {
                  identity,
                  left,
                  right: (
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
