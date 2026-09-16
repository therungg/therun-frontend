'use client';

import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { BoxArrowUpRight } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { loadRunHistoryAction } from '~src/actions/run-user-actions.action';
import { Vod } from '~src/components/run/dashboard/vod';
import { DurationField } from '~src/components/time-input/duration-field';
import { DurationToFormatted } from '~src/components/util/datetime';
import { timingLabel } from '~src/lib/setup/board-defaults';
import { buildSubcategoryKey } from '~src/lib/variables/keys';
import { isEmbeddableVod } from '~src/lib/vod-url';
import type {
    HistoryEvent,
    ModTiming,
    RejectionReasonKey,
} from '../../../../../../../types/moderation.types';
import { relativeDate } from '../../../leaderboard/relative-date';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import {
    defaultCanonicalOf,
    SubcategoryBands,
    subcategoryVariablesFor,
} from '../../boards/subcategory-bands';
import { isTriageInert } from '../attention/triage-keyboard';
import { MIN_ANONYMIZE_REASON, undoReason } from '../shared/action-model';
import {
    anonymizeRunAction,
    anonymizeUserAction,
} from '../shared/actions/anonymize-rules.action';
import { moveRunAction } from '../shared/actions/board-override.action';
import {
    excludeAction,
    previewExcludeAction,
} from '../shared/actions/exclude.action';
import {
    createManualTimeAction,
    deleteManualTimeAction,
    manualTimeVerdictAction,
    previewManualTimeAction,
    updateManualTimeAction,
} from '../shared/actions/manual-times.action';
import { restoreRunsAction } from '../shared/actions/restore.action';
import {
    applyVerdictsAction,
    previewVerdictsAction,
} from '../shared/actions/verdicts.action';
import { REJECTION_REASONS } from '../shared/rejection-reasons';
import { ScopeCards } from '../shared/run-action-parts';
import { fireUndoToast, type UndoResult } from '../shared/undo-toast';
import { subcategoryLabel } from '../worklist/worklist-model';
import {
    loadRunnerSheetAction,
    loadRunSheetAction,
} from './actions/sheet-reads.action';
import { EventRow } from './event-row';
import {
    HeavyFormBody,
    HeavyFormFooter,
    type HeavyFormSpec,
    useHeavyForm,
} from './heavy-form';
import type {
    BusyHandler,
    FormBackHandler,
    PanelLayout,
} from './moderate-panel';
import styles from './moderate-panel.module.scss';
import {
    flagsFromHistory,
    isLightRunVerb,
    type RunStatus,
    revertManualTime,
    runAvailability,
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
    runVerbs,
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

type HeavyVerb = 'decline' | 'remove' | 'set_time' | 'move' | 'hide_identity';
type HideScope = 'run' | 'category' | 'game';

interface FormDraft {
    verb: HeavyVerb;
    /** Preview said nothing would change: the action stays held. */
    noop?: string;
}

interface TrackRecord {
    approved: number;
    declined: number;
    pending: number;
    since: string | null;
}

const MIN_REASON = 10;

const STATUS_LABEL: Record<RunStatus, string> = {
    pending: 'Pending',
    verified: 'Approved',
    rejected: 'Declined',
};

const toModTiming = (t: 'rt' | 'gt'): ModTiming =>
    t === 'gt' ? 'gametime' : 'realtime';

function Time({ ms }: { ms: number | null }) {
    return (
        <span className={styles.mono}>
            {ms == null ? '…' : <DurationToFormatted duration={ms} />}
        </span>
    );
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
    const manualTimeId = entry.manualTimeId ?? null;
    const isManual = entry.source === 'manual';
    const userId = entry.userId ?? null;
    const runnerName = entry.runnerName;

    // ---- Reads -----------------------------------------------------------
    const [summary, setSummary] = useState<RunSheetSummary | null>(null);
    const [fullHistory, setFullHistory] = useState<HistoryEvent[] | null>(null);
    const [record, setRecord] = useState<TrackRecord | null>(null);
    // What a verb just did, until the next read lands with the truth.
    const [overrides, setOverrides] = useState<{
        status?: RunStatus;
        excluded?: boolean;
        marked?: boolean;
    }>({});
    const loadSeq = useRef(0);

    const loadSummary = useCallback(async () => {
        if (runId == null) return;
        const seq = ++loadSeq.current;
        const res = await loadRunSheetAction(gameSlug, runId).catch(() => ({
            error: 'Could not load the run.',
        }));
        if (seq !== loadSeq.current) return;
        if ('error' in res) return;
        setSummary(res.summary);
        setFullHistory(null);
        // History now says removed and marked; the status stays until the
        // entry itself is refreshed.
        setOverrides((o) => (o.status ? { status: o.status } : {}));
    }, [gameSlug, runId]);

    const entryStatus = entry.verificationStatus;
    useEffect(() => {
        setOverrides((o) => {
            if (!o.status) return o;
            const { status: _status, ...rest } = o;
            return rest;
        });
    }, [entryStatus]);

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

    // ---- State the verbs read -------------------------------------------
    const history = fullHistory ?? summary?.history ?? [];
    const fromHistory = flagsFromHistory(history);
    const status = overrides.status ?? entry.verificationStatus;
    const excluded = overrides.excluded ?? fromHistory.excluded ?? undefined;
    const marked = overrides.marked ?? fromHistory.marked ?? false;

    const availability = runAvailability(
        runVerbs(
            runVerbState(entry, {
                status,
                excluded,
                marked,
                inScope: true,
            }),
        ),
        isManual,
    );
    const isEnabled = (verb: ModerateVerb) =>
        availability.some((a) => a.verb === verb && a.enabled);

    // ---- Busy ---------------------------------------------------------------
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

    // ---- Board words -------------------------------------------------------
    const category = context.categories.find((c) => c.id === board.categoryId);
    const sub = subcategoryLabel(
        { categoryId: board.categoryId, subcategoryKey: board.subcategoryKey },
        context.variables,
    );
    const boardName = sub
        ? `${board.categoryDisplay} · ${sub}`
        : board.categoryDisplay;
    const clock = timingLabel(board.primaryTiming, category?.gameTimeLabel);
    const timeMs = entry.time;

    // ---- Heavy form ---------------------------------------------------------
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
                timing: toModTiming(board.primaryTiming),
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
    const moveToName = moveCategory
        ? (() => {
              const s = subcategoryLabel(
                  { categoryId: moveCategory.id, subcategoryKey: moveKey },
                  context.variables,
              );
              return s
                  ? `${moveCategory.display} · ${s}`
                  : moveCategory.display;
          })()
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

    const specFor = (d: FormDraft): HeavyFormSpec => {
        const common = { runnerName, verb: d.verb } as const;
        switch (d.verb) {
            case 'decline':
                return {
                    ...common,
                    whatChanges: d.noop ?? (
                        <>
                            {runnerName}&rsquo;s <Time ms={timeMs} /> never goes
                            on {boardName}.
                        </>
                    ),
                    undoHint: isManual ? undefined : 'Restore from history',
                    notUndoable: isManual
                        ? 'manual times have no restore'
                        : null,
                    reasonKeys: true,
                    minReason: MIN_REASON,
                    actionLabel: 'Decline run',
                    tone: 'danger',
                    blocked: Boolean(d.noop),
                };
            case 'remove':
                return {
                    ...common,
                    whatChanges:
                        d.noop ??
                        (isManual ? (
                            'This manual time is deleted.'
                        ) : (
                            <>
                                {runnerName}&rsquo;s <Time ms={timeMs} /> comes
                                off {boardName}.
                            </>
                        )),
                    undoHint: isManual ? undefined : 'Restore from history',
                    notUndoable: isManual
                        ? 'manual times have no restore'
                        : null,
                    reasonKeys: false,
                    minReason: MIN_REASON,
                    actionLabel: 'Remove run',
                    tone: 'danger',
                    blocked: Boolean(d.noop),
                };
            case 'set_time':
                return {
                    ...common,
                    whatChanges: (
                        <>
                            <Time ms={timeMs} /> becomes <Time ms={newTimeMs} />
                            .
                            {timePreviewRank != null
                                ? ` Lands at #${timePreviewRank}.`
                                : null}
                        </>
                    ),
                    undoHint: 'Undo from the toast right after',
                    notUndoable: null,
                    reasonKeys: false,
                    minReason: MIN_REASON,
                    actionLabel: 'Set time',
                    tone: 'primary',
                    blocked: newTimeMs == null || newTimeMs === timeMs,
                    fields: (
                        <DurationField
                            size="lg"
                            aria-label={`New time (${clock})`}
                            value={newTimeMs}
                            onChange={setNewTimeMs}
                            disabled={busy}
                        />
                    ),
                };
            case 'move':
                return {
                    ...common,
                    whatChanges: moveSame ? (
                        `${runnerName}'s run is on ${boardName}.`
                    ) : (
                        <>
                            {runnerName}&rsquo;s <Time ms={timeMs} /> moves from{' '}
                            {boardName} to {moveToName}.
                        </>
                    ),
                    undoHint: 'Move it back',
                    notUndoable: null,
                    reasonKeys: false,
                    minReason: MIN_REASON,
                    actionLabel: 'Move run',
                    tone: 'primary',
                    blocked: moveSame || moveCategory == null,
                    fields: (
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
                    ),
                };
            case 'hide_identity':
                return {
                    ...common,
                    whatChanges:
                        hideScope === 'run'
                            ? `${runnerName}'s run shows as "Anonymous runner".`
                            : hideScope === 'category'
                              ? `Every run of ${runnerName} on ${board.categoryDisplay} shows as "Anonymous runner".`
                              : `Every run of ${runnerName} in ${context.gameDisplay} shows as "Anonymous runner".`,
                    notUndoable: 'only a site admin can lift it',
                    reasonKeys: false,
                    minReason: MIN_ANONYMIZE_REASON,
                    actionLabel: 'Hide identity',
                    tone: 'danger',
                    fields:
                        hideOptions.length > 1 ? (
                            <ScopeCards
                                label="Scope"
                                options={hideOptions}
                                value={hideScope}
                                onChange={setHideScope}
                                disabled={busy}
                            />
                        ) : undefined,
                };
        }
    };

    const spec = draft ? specFor(draft) : null;
    const formState = useHeavyForm(spec);

    const afterMutation = () => {
        onMutated();
        void loadSummary();
    };

    // ---- Verbs ---------------------------------------------------------------
    const openForm = async (verb: HeavyVerb) => {
        setNewTimeMs(null);
        setMoveCategoryId(board.categoryId);
        setMoveValues({});
        setHideScope(runId != null ? 'run' : 'category');
        if (verb === 'decline' && runId != null) {
            setBusy(true);
            try {
                const res = await previewVerdictsAction(gameSlug, 'reject', [
                    runId,
                ]);
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
                openerRef.current = verb;
                setDraft({
                    verb,
                    noop:
                        res.preview.affectedRunCount === 0
                            ? 'Nothing changes: the run is no longer pending.'
                            : undefined,
                });
            } catch {
                toast.error('Could not check the run. Try again.');
            } finally {
                setBusy(false);
            }
            return;
        }
        if (verb === 'remove' && runId != null) {
            setBusy(true);
            try {
                const res = await previewExcludeAction(gameSlug, {
                    runIds: [runId],
                });
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
                openerRef.current = verb;
                setDraft({
                    verb,
                    noop:
                        res.preview.affectedRunCount === 0
                            ? 'Nothing changes: the run is already off the board.'
                            : undefined,
                });
            } catch {
                toast.error('Could not check the run. Try again.');
            } finally {
                setBusy(false);
            }
            return;
        }
        openerRef.current = verb;
        setDraft({ verb });
    };

    const runLight = async (
        verb: 'approve' | 'restore' | 'send_back' | 'ask_video' | 'mark',
    ) => {
        setBusy(true);
        const before = { status, excluded, marked };
        try {
            const res = await runVerbHandlers[verb](
                { gameSlug, runId, manualTimeId },
                status,
            );
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setOverrides((o) => ({
                ...o,
                ...(res.status ? { status: res.status } : {}),
                ...(res.excluded !== undefined
                    ? { excluded: res.excluded }
                    : {}),
                ...(res.marked !== undefined ? { marked: res.marked } : {}),
            }));
            const message = `${VERB_LABEL[verb]}: ${runnerName}`;
            if (res.undo) {
                const undo = res.undo;
                fireUndoToast(
                    message,
                    async () => {
                        const r = await undo();
                        if ('ok' in r) setOverrides(before);
                        return r;
                    },
                    afterMutation,
                );
            } else {
                toast.success(message);
            }
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
        setBusy(true);
        try {
            let message = `${VERB_LABEL[verb]}: ${runnerName}`;
            let undo: (() => Promise<UndoResult>) | null = null;
            let next: typeof overrides = {};
            switch (verb) {
                case 'decline': {
                    if (isManual) {
                        if (manualTimeId == null) return;
                        // A manual verdict needs written words; a key alone
                        // sends its own label.
                        const label =
                            REJECTION_REASONS.find((r) => r.key === reasonKey)
                                ?.label ?? '';
                        const res = await manualTimeVerdictAction(
                            gameSlug,
                            manualTimeId,
                            'reject',
                            reason.length >= MIN_REASON ? reason : label,
                        );
                        if ('error' in res) return void toast.error(res.error);
                    } else {
                        if (runId == null) return;
                        const res = await applyVerdictsAction(
                            gameSlug,
                            'reject',
                            [runId],
                            reason,
                            reasonKey ?? undefined,
                        );
                        if ('error' in res) return void toast.error(res.error);
                        undo = () =>
                            restoreRunsAction(
                                gameSlug,
                                [runId],
                                undoReason('reject'),
                            );
                    }
                    next = { status: 'rejected' };
                    break;
                }
                case 'remove': {
                    if (isManual) {
                        if (manualTimeId == null) return;
                        const res = await deleteManualTimeAction(
                            gameSlug,
                            manualTimeId,
                            reason,
                        );
                        if ('error' in res) return void toast.error(res.error);
                    } else {
                        if (runId == null) return;
                        const res = await excludeAction(gameSlug, {
                            runIds: [runId],
                            reason,
                        });
                        if ('error' in res) return void toast.error(res.error);
                        undo = () =>
                            restoreRunsAction(
                                gameSlug,
                                [runId],
                                undoReason('remove'),
                            );
                        next = { excluded: true };
                    }
                    break;
                }
                case 'set_time': {
                    if (newTimeMs == null) return;
                    if (isManual) {
                        if (manualTimeId == null) return;
                        const res = await updateManualTimeAction(
                            gameSlug,
                            manualTimeId,
                            { reason, timeMs: newTimeMs },
                        );
                        if ('error' in res) return void toast.error(res.error);
                        if (timeMs != null) {
                            const old = timeMs;
                            undo = () =>
                                revertManualTime(gameSlug, manualTimeId, old);
                        }
                    } else {
                        const res = await createManualTimeAction(gameSlug, {
                            runnerRef:
                                userId != null
                                    ? { userId }
                                    : { guestName: runnerName },
                            categoryId: board.categoryId,
                            subcategoryKey: board.subcategoryKey,
                            timing: toModTiming(board.primaryTiming),
                            timeMs: newTimeMs,
                            reason,
                        });
                        if ('error' in res) return void toast.error(res.error);
                        const createdId = res.result.id;
                        undo = () =>
                            deleteManualTimeAction(
                                gameSlug,
                                createdId,
                                'Undo of set time',
                            );
                    }
                    break;
                }
                case 'move': {
                    if (runId == null || !moveCategory || moveSame) return;
                    const source = {
                        categoryId: board.categoryId,
                        subcategoryKey: board.subcategoryKey,
                    };
                    const target = {
                        categoryId: moveCategory.id,
                        subcategoryKey: moveKey,
                    };
                    const res = await moveRunAction(
                        gameSlug,
                        runId,
                        target,
                        [source, target],
                        reason,
                    );
                    if ('error' in res) return void toast.error(res.error);
                    message = `Moved: ${runnerName} to ${moveToName}`;
                    break;
                }
                case 'hide_identity': {
                    const res =
                        hideScope === 'run' || userId == null
                            ? runId == null
                                ? { error: 'This entry has no run to hide.' }
                                : await anonymizeRunAction(gameSlug, {
                                      runId,
                                      reason,
                                      board: {
                                          categoryId: board.categoryId,
                                          subcategoryKey: board.subcategoryKey,
                                      },
                                  })
                            : await anonymizeUserAction(gameSlug, {
                                  userId,
                                  reason,
                                  categoryId:
                                      hideScope === 'category'
                                          ? board.categoryId
                                          : null,
                              });
                    if ('error' in res) return void toast.error(res.error);
                    message = res.result.alreadyExists
                        ? 'Already hidden at this scope. Nothing changed.'
                        : `Hidden: now shown as ${res.result.rule.displayName}`;
                    break;
                }
            }
            onFormBack(null);
            setDraft(null);
            setOverrides((o) => ({ ...o, ...next }));
            if (undo) {
                const u = undo;
                fireUndoToast(message, u, afterMutation);
            } else {
                toast.success(message);
            }
            afterMutation();
        } catch {
            toast.error('Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    // ---- Keys ------------------------------------------------------------------
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

    // ---- Layout ----------------------------------------------------------------
    const runPage = runId != null ? `/games-v2/${gameSlug}/run/${runId}` : null;
    const vodUrl = summary?.vodUrls[0] ?? entry.vodUrl ?? null;
    const statusTone = excluded
        ? 'neutral'
        : status === 'verified'
          ? 'approved'
          : status === 'rejected'
            ? 'declined'
            : 'pending';

    const identity = (
        <>
            <div ref={rootRef} className={styles.idLeft}>
                <div className={styles.who}>
                    <RunnerAvatar
                        name={runnerName}
                        picture={entry.picture}
                        anonymous={entry.anonymized}
                    />
                    {userId != null ? (
                        <button
                            type="button"
                            className={styles.whoName}
                            onClick={onOpenRunner}
                            disabled={formOpen}
                        >
                            {runnerName}
                        </button>
                    ) : (
                        <span className={styles.whoNameStatic}>
                            {runnerName}
                        </span>
                    )}
                    <span className={styles.status} data-tone={statusTone}>
                        {excluded ? 'Removed' : STATUS_LABEL[status]}
                    </span>
                </div>
                <div className={styles.where}>
                    <b>{board.categoryDisplay}</b>
                    {sub ? ` · ${sub}` : ''} · {clock}
                    {entry.runDate
                        ? ` · submitted ${relativeDate(entry.runDate)}`
                        : ''}
                    {isManual ? ' · manual time' : ''}
                </div>
            </div>
            <div className={styles.idRight}>
                <span className={styles.bigTime}>
                    {timeMs != null ? (
                        <DurationToFormatted duration={timeMs} />
                    ) : (
                        '—'
                    )}
                </span>
                {entry.rank > 0 ? (
                    <div className={styles.facts}>
                        <span>
                            {status === 'pending' ? 'would be ' : ''}
                            <span className={styles.mono}>#{entry.rank}</span>
                        </span>
                    </div>
                ) : null}
            </div>
        </>
    );

    const offCount = summary?.offSegments.length ?? 0;
    const left = (
        <section className={styles.section}>
            {vodUrl ? (
                isEmbeddableVod(vodUrl) ? (
                    <div className={styles.video}>
                        <Vod vod={vodUrl} />
                    </div>
                ) : (
                    <a
                        href={vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.vodLink}
                    >
                        <BoxArrowUpRight size={14} aria-hidden />
                        <span>{vodUrl}</span>
                    </a>
                )
            ) : (
                <div className={styles.noVideo}>No video</div>
            )}
            {summary && runPage ? (
                <div className={styles.splitsLine}>
                    <div className={styles.facts}>
                        {summary.splitCount === 0 ? (
                            <span>No splits</span>
                        ) : (
                            <>
                                <span>
                                    <span className={styles.mono}>
                                        {summary.splitCount}
                                    </span>{' '}
                                    splits
                                </span>
                                {summary.consistency === 'off' ? (
                                    <span className={styles.off}>
                                        {offCount === 1
                                            ? '1 segment looks off: '
                                            : `${offCount} segments look off: `}
                                        {summary.offSegments
                                            .map((s) => s.name)
                                            .join(', ')}
                                    </span>
                                ) : (
                                    <span>Consistent</span>
                                )}
                            </>
                        )}
                    </div>
                    <a className={styles.link} href={runPage}>
                        View splits
                    </a>
                </div>
            ) : null}
        </section>
    );

    const historyCount = summary?.historyCount ?? 0;
    const right = (
        <>
            {userId != null && record ? (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span>Runner on this game</span>
                    </div>
                    <div className={styles.record}>
                        <span>
                            <b>{record.approved}</b> approved
                        </span>
                        <span data-bad={record.declined > 0 || undefined}>
                            <b>{record.declined}</b> declined
                        </span>
                        {record.pending > 0 ? (
                            <span>
                                <b>{record.pending}</b> pending
                            </span>
                        ) : null}
                        {record.since ? (
                            <span>since {record.since.slice(0, 4)}</span>
                        ) : null}
                    </div>
                </section>
            ) : null}
            {runId != null && summary ? (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span>History</span>
                        <span>{historyCount}</span>
                    </div>
                    {history.length > 0 ? (
                        <ul className={styles.events}>
                            {history.map((event, i) => (
                                <EventRow
                                    key={event.logId ?? `${event.at}-${i}`}
                                    event={event}
                                    isLatest={i === 0}
                                    gameSlug={gameSlug}
                                    runId={runId}
                                    onUndone={afterMutation}
                                    canAct
                                />
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.quiet}>No events yet</p>
                    )}
                    {fullHistory === null && historyCount > history.length ? (
                        <button
                            type="button"
                            className={styles.showAll}
                            onClick={showAll}
                            disabled={showingAll}
                        >
                            Show all {historyCount}
                        </button>
                    ) : null}
                </section>
            ) : null}
        </>
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
                  right,
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
