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
import { RunTimesField } from '~src/components/time-input/run-times-field';
import { otherTiming, validateRunTimes } from '~src/lib/run-times';
import { buildSubcategoryKey } from '~src/lib/variables/keys';
import type { LeaderboardEntry } from '../../../../../../../types/leaderboards.types';
import {
    defaultCanonicalOf,
    SubcategoryBands,
    subcategoryVariablesFor,
} from '../../boards/subcategory-bands';
import { defaultBanScopeForCategories } from '../shared/action-model';
import { previewManualTimeAction } from '../shared/actions/manual-times.action';
import { clocksOfCategory } from '../shared/board-clocks';
import { type ScopeCardOption, ScopeCards } from '../shared/run-action-parts';
import { fireUndoToast } from '../shared/undo-toast';
import { subcategoryLabel } from '../worklist/worklist-model';
import { loadRunnerSheetAction } from './actions/sheet-reads.action';
import { HeavyFormBody, HeavyFormFooter, useHeavyForm } from './heavy-form';
import type {
    BusyHandler,
    FormBackHandler,
    PanelLayout,
} from './moderate-panel';
import styles from './moderate-panel.module.scss';
import { useInitialVerb, usePanelVerbKeys, usePanelVerbs } from './panel-verbs';
import {
    type OpenSubject,
    RunnerIdentity,
    RunnerLeft,
    RunnerRight,
    trackRecord,
} from './runner-columns';
import {
    type BanPreview,
    banLabel,
    bannedScope,
    banRuleExists,
    confirmRunnerVerb,
    type HeavyRunnerVerb,
    liftBan,
    previewBan,
    type RunnerConfirmInput,
    type RunnerRefs,
    type RunnerScope,
    ruleToLift,
    runnerHeavySpec,
} from './runner-heavy-verbs';
import type { RunnerSheetData } from './sheet-types';
import type { SheetBoard, SheetContext } from './subject';
import { VerbBar } from './verb-bar';
import {
    type ModerateVerb,
    RUNNER_BAR,
    RUNNER_MORE,
    runnerVerbs,
    VERB_LABEL,
} from './verbs';

export interface RunnerTabProps {
    userId: number;
    runnerName: string;
    /** Category the panel was opened from; default ban scope. */
    categoryId: number | null;
    context: SheetContext;
    onMutated: () => void;
    /** Opens one of the runner's runs in the Run tab. */
    onOpenRun: (entry: LeaderboardEntry, board: SheetBoard) => void;
    /** Shell contract: register Back while a form is open, null otherwise. */
    onFormBack: FormBackHandler;
    onBusyChange: BusyHandler;
    render: (layout: PanelLayout) => ReactNode;
    /** Acted on once when the runner has loaded; ignored if it does not apply. */
    initialVerb?: ModerateVerb;
    onInitialVerbUsed: () => void;
    /** Mounted inline on this runner's own page. */
    onRunnerPage?: boolean;
}

export function RunnerTab({
    userId,
    runnerName,
    categoryId,
    context,
    onMutated,
    onOpenRun,
    onFormBack,
    onBusyChange,
    render,
    initialVerb,
    onInitialVerbUsed,
    onRunnerPage = false,
}: RunnerTabProps) {
    const { gameSlug } = context;
    const category =
        categoryId != null
            ? (context.categories.find((c) => c.id === categoryId) ?? null)
            : null;
    const runner: RunnerRefs = {
        userId,
        runnerName,
        categoryId: category ? category.id : null,
        categoryDisplay: category?.display ?? null,
        gameDisplay: context.gameDisplay,
        canSiteBan: context.canSiteBan,
    };
    const runnerPage = `/games-v2/${gameSlug}/manage/moderation/runner/${userId}`;

    // ---- Read ------------------------------------------------------------------
    // Ban state, identity and runs come from the server, read again after
    // every mutation and every undo.
    const [data, setData] = useState<RunnerSheetData | null>(null);
    const loadSeq = useRef(0);
    const load = useCallback(async () => {
        const seq = ++loadSeq.current;
        const res = await loadRunnerSheetAction(gameSlug, userId).catch(() => ({
            error: 'Could not load the runner.',
        }));
        if (seq !== loadSeq.current) return;
        if ('error' in res) {
            toast.error(res.error);
            return;
        }
        setData(res.data);
    }, [gameSlug, userId]);
    useEffect(() => {
        void load();
    }, [load]);

    const afterMutation = () => {
        onMutated();
        void load();
    };

    const record = useMemo(
        () => (data ? trackRecord(data.combos) : null),
        [data],
    );
    const liveHideRules = data
        ? data.anonymizeRules.filter((r) => r.type === 'user' && !r.liftedAt)
        : [];
    const hidden = liveHideRules.length > 0;
    const hiddenLabels = liveHideRules.map((r) =>
        r.gameId == null
            ? 'Hidden everywhere'
            : r.categoryId != null
              ? `Hidden on ${
                    context.categories.find((c) => c.id === r.categoryId)
                        ?.display ?? 'a category'
                }`
              : `Hidden on ${context.gameDisplay}`,
    );

    // ---- Verb state --------------------------------------------------------------
    const availability = runnerVerbs({
        banned: data ? bannedScope(data.banState) : 'none',
        anonymized: hidden,
        isGuest: false,
        inScope: true,
    }).map((a) =>
        // Nothing is known until the read lands.
        data || !a.enabled ? a : { ...a, enabled: false, reason: 'Loading' },
    );
    const isEnabled = (verb: ModerateVerb) =>
        availability.some((a) => a.verb === verb && a.enabled);

    // ---- Heavy form --------------------------------------------------------------
    const [verb, setVerb] = useState<HeavyRunnerVerb | null>(null);
    const initialScope: RunnerScope =
        runner.categoryId == null
            ? 'game'
            : defaultBanScopeForCategories([runner.categoryId]);
    const [scope, setScope] = useState<RunnerScope>(initialScope);
    const [banPreview, setBanPreview] = useState<BanPreview | null>(null);

    // Add run
    const addTargets = useMemo(
        () =>
            context.categories.filter(
                (c) => !c.archived || c.id === runner.categoryId,
            ),
        [context.categories, runner.categoryId],
    );
    const [addCategoryId, setAddCategoryId] = useState<number | null>(null);
    const [addValues, setAddValues] = useState<Record<string, string>>({});
    const [addTimeMs, setAddTimeMs] = useState<number | null>(null);
    const [addSecondaryMs, setAddSecondaryMs] = useState<number | null>(null);
    const [addDate, setAddDate] = useState('');
    const [addVideo, setAddVideo] = useState('');
    const [addRank, setAddRank] = useState<number | null>(null);

    const addCategory = addTargets.find((c) => c.id === addCategoryId) ?? null;
    const addClocks = addCategory ? clocksOfCategory(addCategory) : null;
    const addSubVars = useMemo(
        () =>
            addCategory
                ? subcategoryVariablesFor(addCategory.id, context.variables)
                : [],
        [addCategory, context.variables],
    );
    const addKey = useMemo(
        () =>
            addSubVars.length === 0
                ? ''
                : buildSubcategoryKey(
                      addSubVars.map((v) => ({
                          name: v.nameNormalized,
                          value:
                              addValues[v.nameNormalized] ??
                              defaultCanonicalOf(v),
                      })),
                  ),
        [addSubVars, addValues],
    );
    const addSub = addCategory
        ? subcategoryLabel(
              { categoryId: addCategory.id, subcategoryKey: addKey },
              context.variables,
          )
        : '';
    const addBoardName = addCategory
        ? addSub
            ? `${addCategory.display} · ${addSub}`
            : addCategory.display
        : '';
    const addTimes = addClocks
        ? validateRunTimes({
              primaryTiming: addClocks.primaryTiming,
              showSecondary: addClocks.showSecondary,
              primaryMs: addTimeMs,
              secondaryMs: addSecondaryMs,
          })
        : null;
    const addBlocked =
        !addCategory || addTimeMs == null || !(addTimes?.ok ?? false);

    const formOpen = verb !== null;
    const { busy, busyRef, setBusy, back, openerRef, footerRef, rootRef } =
        usePanelVerbs({
            formOpen,
            closeForm: () => setVerb(null),
            onFormBack,
            onBusyChange,
        });

    // Ban: which boards the runner comes off, read again when the scope changes.
    useEffect(() => {
        if (verb !== 'ban' || scope === 'site') {
            setBanPreview(null);
            return;
        }
        let cancelled = false;
        setBanPreview(null);
        previewBan(gameSlug, userId, scope, runner.categoryId)
            .then((res) => {
                if (cancelled) return;
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
                setBanPreview(res.preview);
            })
            .catch(() => {
                if (!cancelled) toast.error('Could not preview the ban.');
            });
        return () => {
            cancelled = true;
        };
    }, [verb, scope, gameSlug, userId, runner.categoryId]);

    // Add run: where the time lands, once one is typed.
    useEffect(() => {
        if (verb !== 'add_run' || addTimeMs == null || !addClocks) {
            setAddRank(null);
            return;
        }
        let cancelled = false;
        const t = setTimeout(() => {
            previewManualTimeAction(gameSlug, {
                runnerRef: { userId },
                categoryId: addCategoryId ?? 0,
                subcategoryKey: addKey,
                timing: addClocks.primaryTiming,
                timeMs: addTimeMs,
            })
                .then((res) => {
                    if (cancelled || 'error' in res) return;
                    setAddRank(res.preview.resultingEntry.rank);
                })
                .catch(() => {
                    // No rank then; the sentence still reads.
                });
        }, 350);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [
        verb,
        addTimeMs,
        addClocks?.primaryTiming,
        addCategoryId,
        addKey,
        gameSlug,
        userId,
    ]);

    const scopeOptions: ScopeCardOption<RunnerScope>[] = [
        ...(runner.categoryDisplay
            ? [
                  {
                      value: 'category' as const,
                      title: runner.categoryDisplay,
                      detail: 'This category',
                  },
              ]
            : []),
        { value: 'game', title: context.gameDisplay, detail: 'Every board' },
        // A permission, not an unavailable verb: absent for everyone else.
        ...(context.canSiteBan
            ? [
                  {
                      value: 'site' as const,
                      title: 'Everywhere',
                      detail: 'Every game on the site',
                  },
              ]
            : []),
    ];

    const fieldsFor = (v: HeavyRunnerVerb): ReactNode => {
        switch (v) {
            case 'ban':
            case 'hide_identity':
                return scopeOptions.length > 1 ? (
                    <ScopeCards
                        label="Scope"
                        options={scopeOptions}
                        value={scope}
                        onChange={setScope}
                        disabled={busy}
                    />
                ) : undefined;
            case 'add_run':
                return (
                    <div className={styles.fieldStack}>
                        <select
                            aria-label="Board"
                            className="form-select form-select-sm"
                            value={addCategoryId ?? ''}
                            onChange={(e) => {
                                setAddCategoryId(Number(e.target.value));
                                setAddValues({});
                                setAddTimeMs(null);
                                setAddSecondaryMs(null);
                            }}
                            disabled={busy}
                        >
                            {addTargets.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display}
                                </option>
                            ))}
                        </select>
                        <SubcategoryBands
                            variables={addSubVars}
                            selectedValues={addValues}
                            onSelect={(name, canonical) =>
                                setAddValues((prev) => ({
                                    ...prev,
                                    [name]: canonical,
                                }))
                            }
                            idPrefix="moderate-add-run"
                        />
                        {addClocks ? (
                            <RunTimesField
                                key={addCategoryId ?? 0}
                                idPrefix="moderate-add-run"
                                size="lg"
                                primaryTiming={addClocks.primaryTiming}
                                gameTimeLabel={addClocks.gameTimeLabel}
                                showSecondary={addClocks.showSecondary}
                                primaryMs={addTimeMs}
                                onPrimaryChange={setAddTimeMs}
                                secondaryMs={addSecondaryMs}
                                onSecondaryChange={setAddSecondaryMs}
                                showErrors={addTimeMs !== null}
                                disabled={busy}
                            />
                        ) : null}
                        <input
                            type="date"
                            aria-label="Date"
                            className="form-control form-control-sm"
                            value={addDate}
                            onChange={(e) => setAddDate(e.target.value)}
                            disabled={busy}
                        />
                        <input
                            type="url"
                            aria-label="Video URL"
                            placeholder="Video URL"
                            className="form-control form-control-sm"
                            value={addVideo}
                            onChange={(e) => setAddVideo(e.target.value)}
                            disabled={busy}
                        />
                    </div>
                );
        }
    };

    const spec = verb
        ? runnerHeavySpec(verb, {
              runner,
              scope,
              banPreview,
              banRuleExists: data
                  ? banRuleExists(data.banState, scope, runner.categoryId)
                  : false,
              addBoardName,
              addBlocked,
              addRank,
              fields: fieldsFor(verb),
          })
        : null;
    const formState = useHeavyForm(spec);

    // ---- Verbs -------------------------------------------------------------------
    const openForm = (v: HeavyRunnerVerb) => {
        setScope(initialScope);
        setBanPreview(null);
        setAddCategoryId(
            addTargets.find((c) => c.id === runner.categoryId)?.id ??
                addTargets[0]?.id ??
                null,
        );
        setAddValues({});
        setAddTimeMs(null);
        setAddSecondaryMs(null);
        setAddDate('');
        setAddVideo('');
        setAddRank(null);
        openerRef.current = v;
        setVerb(v);
    };

    const runLiftBan = async () => {
        const rule = data ? ruleToLift(data.banState, runner.categoryId) : null;
        if (!rule) return;
        setBusy(true);
        try {
            const res = await liftBan(gameSlug, rule.ruleId);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(
                `${VERB_LABEL.lift_ban}: ${runnerName} on ${rule.categoryName ?? context.gameDisplay}`,
            );
            afterMutation();
        } catch {
            toast.error('Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const handle = (v: ModerateVerb) => {
        if (busyRef.current || verb !== null || !isEnabled(v)) return;
        switch (v) {
            case 'lift_ban':
                void runLiftBan();
                return;
            case 'ban':
            case 'hide_identity':
            case 'add_run':
                openForm(v);
                return;
            default:
                return;
        }
    };

    const confirm = async (reason: string) => {
        if (!verb || busyRef.current) return;
        let input: RunnerConfirmInput;
        if (verb === 'add_run') {
            if (!addCategory || !addClocks) return;
            input = {
                verb,
                reason,
                categoryId: addCategory.id,
                subcategoryKey: addKey,
                boardName: addBoardName,
                timing: addClocks.primaryTiming,
                timeMs: addTimeMs,
                secondary:
                    addClocks.showSecondary && addSecondaryMs !== null
                        ? {
                              timing: otherTiming(addClocks.primaryTiming),
                              timeMs: addSecondaryMs,
                          }
                        : null,
                evidenceUrl: addVideo,
                runDate: addDate,
            };
        } else if (verb === 'ban') {
            const top = data?.combos[0] ?? null;
            const fallback = runner.categoryId ?? context.categories[0]?.id;
            input = {
                verb,
                reason,
                scope,
                board: top
                    ? {
                          categoryId: top.categoryId,
                          subcategoryKey: top.subcategoryKey,
                      }
                    : fallback != null
                      ? { categoryId: fallback, subcategoryKey: '' }
                      : null,
            };
        } else {
            input = { verb, reason, scope };
        }
        setBusy(true);
        try {
            const res = await confirmRunnerVerb(gameSlug, runner, input);
            // Errors keep the form open and usable.
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            onFormBack(null);
            setVerb(null);
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

    // ---- Keys --------------------------------------------------------------------
    usePanelVerbKeys({ handle, formOpen, busyRef, rootRef });
    useInitialVerb({
        verb: initialVerb,
        ready: data !== null,
        handle,
        onUsed: onInitialVerbUsed,
    });

    // ---- Layout --------------------------------------------------------------------
    const openRun = (subject: OpenSubject) => {
        if (formOpen) return;
        onOpenRun(subject.entry, subject.board);
    };

    const identity = (
        <RunnerIdentity
            runnerName={runnerName}
            gameDisplay={context.gameDisplay}
            record={record}
            banLabel={
                data ? banLabel(data.banState, context.gameDisplay) : undefined
            }
            hiddenLabels={hiddenLabels}
            rootRef={rootRef}
        />
    );
    const left = (
        <RunnerLeft
            combos={data?.combos ?? null}
            record={record}
            gameSlug={gameSlug}
            variables={context.variables}
            comesOff={verb === 'ban' ? (banPreview?.comesOff ?? null) : null}
            formOpen={formOpen}
            runnerPage={runnerPage}
            onRunnerPage={onRunnerPage}
            userId={userId}
            runnerName={runnerName}
            onOpenRun={openRun}
        />
    );

    const layout: PanelLayout =
        spec && verb
            ? {
                  identity,
                  left,
                  right: (
                      <HeavyFormBody
                          key={verb}
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
                          onConfirm={(r) => void confirm(r)}
                      />
                  ),
                  pageLink: null,
              }
            : {
                  identity,
                  left,
                  right: (
                      <RunnerRight
                          modLog={data?.modLog ?? null}
                          modLogTotal={data?.modLogTotal ?? 0}
                          runnerPage={runnerPage}
                          onRunnerPage={onRunnerPage}
                          anonymizeRules={data?.anonymizeRules ?? []}
                          canLift={context.canSiteBan}
                          gameSlug={gameSlug}
                          onUndone={afterMutation}
                      />
                  ),
                  footer: (
                      <div ref={footerRef} className={styles.contents}>
                          <VerbBar
                              bar={RUNNER_BAR}
                              more={RUNNER_MORE}
                              availability={availability}
                              busy={busy}
                              onVerb={handle}
                          />
                      </div>
                  ),
                  pageLink: { href: runnerPage, label: 'Runner page' },
              };

    return render(layout);
}
