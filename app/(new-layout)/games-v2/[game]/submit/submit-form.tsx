'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { selfClaimTimeAction } from '~src/actions/self-claim.action';
import { submitRunAction } from '~src/actions/submit-run.action';
import { getMyStandingAction } from '~src/actions/user-standing.action';
import Link from '~src/components/link';
import { buildBoardHref } from '~src/lib/board-url';
import { formatRunTimeEcho, parseRunTimeInput } from '~src/lib/run-time-input';
import { describeSubmitWarning } from '~src/lib/run-view/submit-warnings';
import type {
    ResolvedCategory,
    ResolvedGroup,
    SubmitRunInput,
    SubmitRunResult,
    UserRanking,
    ValidCombinations,
    VariableDef,
} from '../../../../../types/leaderboards.types';
import type {
    ModTiming,
    SelfManualTimeResult,
} from '../../../../../types/moderation.types';
import { RulesBody, RulesPanel } from '../rules/rules-panel';
import { ClaimFields } from './claim-fields';
import { loadVariablesAction } from './load-variables.action';
import { RunFields } from './run-fields';
import { buildSubcategoryKey } from './subcategory-key';
import styles from './submit-form.module.scss';
import { EMPTY_TIME, type TimeField } from './time-input';

export type SubmitFormMode = 'submit' | 'claim';

interface Props {
    game: { id: number; name: string; display: string };
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    initialMode?: SubmitFormMode;
    /** Category slug from the board URL that sent the runner here (e.g. `?category=any%`). Unknown/blank -> ignored silently. */
    initialCategorySlug?: string;
    /** Subcategory variable params from the board URL (same param names the board uses). Matched against the resolved category's variables once they load; unmatched keys are ignored silently. */
    initialSubcategoryValues?: Record<string, string>;
}

const SUBMIT_MODE_HINT =
    'Submit a new run with your category, time, date, and a video link for verification.';
const CLAIM_MODE_HINT =
    'Assert or correct your time on this board without a video or splits — for example, to fix an imported time.';

function todayISODate(): string {
    // Local date, YYYY-MM-DD — matches the <input type="date"> value format.
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function canonicalDefault(def: VariableDef): string {
    const idx = def.defaultValueIndex ?? 0;
    return def.values[idx]?.[0] ?? def.values[0]?.[0] ?? '';
}

/** Resolves `raw` against a subcategory def's value buckets (case-insensitive), or null if it doesn't match any. */
function canonicalMatch(def: VariableDef, raw: string): string | null {
    const bucket = def.values.find((aliases) =>
        aliases.some((alias) => alias.toLowerCase() === raw.toLowerCase()),
    );
    return bucket?.[0] ?? null;
}

function isValidHttpUrl(raw: string): boolean {
    try {
        const u = new URL(raw);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

export function SubmitForm({
    game,
    categories,
    groups,
    initialMode,
    initialCategorySlug,
    initialSubcategoryValues,
}: Props) {
    const [mode, setMode] = useState<SubmitFormMode>(initialMode ?? 'submit');
    const [categoryId, setCategoryId] = useState<number>(() => {
        if (initialCategorySlug) {
            const match = categories.find(
                (c) =>
                    c.name.toLowerCase() === initialCategorySlug.toLowerCase(),
            );
            if (match) return match.id;
        }
        return categories[0].id;
    });
    const category = useMemo(
        () => categories.find((c) => c.id === categoryId) ?? categories[0],
        [categories, categoryId],
    );

    const [variables, setVariables] = useState<VariableDef[]>([]);
    const [validCombinations, setValidCombinations] =
        useState<ValidCombinations>({ mode: 'open' });
    const [subcategory, setSubcategory] = useState<Record<string, string>>({});
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [varsLoading, startVarsTransition] = useTransition();
    const [varsError, setVarsError] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);

    // The URL's subcategory params apply once, to whichever category's
    // variables load first — not on every later category switch.
    const appliedInitialSubcategory = useRef(false);

    // Run-submit fields.
    const [rt, setRt] = useState<TimeField>(EMPTY_TIME);
    const [gt, setGt] = useState<TimeField>(EMPTY_TIME);
    const [runDate, setRunDate] = useState<string>(todayISODate());
    const [vodUrl, setVodUrl] = useState<string>('');
    const [vodTouched, setVodTouched] = useState(false);

    // Claim fields — a claim asserts a single time against one timing
    // method; it never carries a date or a required video (§E1 self-service).
    const [claimTiming, setClaimTiming] = useState<ModTiming>('realtime');
    const [claimTime, setClaimTime] = useState<TimeField>(EMPTY_TIME);
    const [evidenceUrl, setEvidenceUrl] = useState<string>('');
    const [evidenceTouched, setEvidenceTouched] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [runResult, setRunResult] = useState<SubmitRunResult | null>(null);
    const [claimResult, setClaimResult] = useState<SelfManualTimeResult | null>(
        null,
    );

    // Current standing on the selected board — quiet context, no line when
    // there's no match (signed out never reaches this form; see submit/page.tsx).
    const [standing, setStanding] = useState<UserRanking | null>(null);

    const today = todayISODate();

    const switchMode = (next: SubmitFormMode) => {
        if (next === mode) return;
        setMode(next);
        setError(null);
    };

    // Collapse the rules disclosure whenever the category changes, so
    // switching categories doesn't carry a stale open panel forward.
    useEffect(() => {
        setRulesOpen(false);
    }, [category.id]);

    // Load variables whenever the category changes.
    useEffect(() => {
        let cancelled = false;
        setVarsError(false);
        setError(null);
        setClaimTiming(
            category.primaryTiming === 'gt' ? 'gametime' : 'realtime',
        );
        startVarsTransition(async () => {
            try {
                const resp = await loadVariablesAction(
                    game.name,
                    category.name,
                );
                if (cancelled) return;
                setVariables(resp.variables);
                setValidCombinations(resp.validCombinations);
                const sub: Record<string, string> = {};
                for (const def of resp.variables) {
                    if (def.role === 'subcategory') {
                        let matched: string | null = null;
                        if (
                            !appliedInitialSubcategory.current &&
                            initialSubcategoryValues
                        ) {
                            const rawEntry = Object.entries(
                                initialSubcategoryValues,
                            ).find(
                                ([k]) =>
                                    k.toLowerCase() ===
                                    def.nameNormalized.toLowerCase(),
                            );
                            if (rawEntry)
                                matched = canonicalMatch(def, rawEntry[1]);
                        }
                        sub[def.nameNormalized] =
                            matched ?? canonicalDefault(def);
                    }
                }
                appliedInitialSubcategory.current = true;
                setSubcategory(sub);
                setFilters({});
            } catch {
                if (cancelled) return;
                setVariables([]);
                setValidCombinations({ mode: 'open' });
                setSubcategory({});
                setFilters({});
                setVarsError(true);
            }
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.name, category.name]);

    const subcatDefs = variables.filter((v) => v.role === 'subcategory');
    const filterDefs = variables.filter((v) => v.role === 'filter');

    const displayNames = useMemo(() => {
        const map: Record<string, string> = {};
        for (const v of variables) map[v.nameNormalized] = v.name;
        return map;
    }, [variables]);

    const subcategoryKey = buildSubcategoryKey(subcategory);
    const combinationInvalid =
        validCombinations.mode === 'managed' &&
        !validCombinations.keys.includes(subcategoryKey);

    // Current standing on the board this exact selection resolves to.
    // Waits for variables to settle so it doesn't fire on a stale
    // subcategory key mid-category-switch.
    useEffect(() => {
        if (varsLoading) return;
        setStanding(null);
        let cancelled = false;
        getMyStandingAction(game.name, category.name, subcategoryKey).then(
            (result) => {
                if (!cancelled) setStanding(result);
            },
        );
        return () => {
            cancelled = true;
        };
    }, [game.name, category.name, subcategoryKey, varsLoading]);

    const showRt = !category.hideRealTime;
    const showGt = !category.hideGameTime;
    const primaryIsRt = category.primaryTiming !== 'gt';
    const claimTimingChoice = showRt && showGt;
    const effectiveClaimTiming: ModTiming = claimTimingChoice
        ? claimTiming
        : showGt
          ? 'gametime'
          : 'realtime';

    const parseInto = (raw: string, set: (v: TimeField) => void): void => {
        const trimmed = raw.trim();
        if (trimmed.length === 0) {
            set({ raw, ms: undefined, error: false });
            return;
        }
        const ms = parseRunTimeInput(trimmed);
        set({ raw, ms, error: ms === undefined });
    };

    const primaryMissing = primaryIsRt
        ? rt.ms === undefined
        : gt.ms === undefined;

    const vodRequired = category.requireVideo === true;
    const vodInvalid =
        vodUrl.trim().length > 0 && !isValidHttpUrl(vodUrl.trim());
    const vodMissing = vodRequired && vodUrl.trim().length === 0;
    // Only surface the inline error once the user has interacted with the field —
    // the disabled submit button plus the passive hint already cover the untouched state.
    const vodShowInvalid = vodTouched && (vodInvalid || vodMissing);

    const evidenceInvalid =
        evidenceUrl.trim().length > 0 && !isValidHttpUrl(evidenceUrl.trim());
    const evidenceShowInvalid = evidenceTouched && evidenceInvalid;

    const canSubmitRun =
        !submitting &&
        !varsLoading &&
        !combinationInvalid &&
        !primaryMissing &&
        !rt.error &&
        !gt.error &&
        !vodInvalid &&
        !vodMissing &&
        runDate.length > 0;

    const canSubmitClaim =
        !submitting &&
        !varsLoading &&
        !combinationInvalid &&
        claimTime.ms !== undefined &&
        !claimTime.error &&
        !evidenceInvalid;

    const canSubmit = mode === 'submit' ? canSubmitRun : canSubmitClaim;

    // The entered primary time (submit: RT or GT depending on the category's
    // primary timing; claim: the single asserted time), for the "slower than
    // your current best" comparison against `standing`.
    const enteredMs =
        mode === 'submit' ? (primaryIsRt ? rt.ms : gt.ms) : claimTime.ms;

    const reset = () => {
        setRt(EMPTY_TIME);
        setGt(EMPTY_TIME);
        setRunDate(todayISODate());
        setVodUrl('');
        setVodTouched(false);
        setClaimTime(EMPTY_TIME);
        setEvidenceUrl('');
        setEvidenceTouched(false);
        setError(null);
        setRunResult(null);
        setClaimResult(null);
    };

    const onSubmitRun = async () => {
        if (!canSubmitRun) return;
        setSubmitting(true);
        setError(null);

        const chosen: Record<string, string> = {};
        for (const def of subcatDefs) {
            const v = subcategory[def.nameNormalized];
            if (v && v.length > 0) chosen[def.nameNormalized] = v;
        }
        for (const def of filterDefs) {
            const v = filters[def.nameNormalized];
            if (v && v.length > 0) chosen[def.nameNormalized] = v;
        }

        const input: SubmitRunInput = {
            gameId: game.id,
            categoryId: category.id,
            runDate,
        };
        if (showRt && rt.ms !== undefined) input.time = rt.ms;
        if (showGt && gt.ms !== undefined) input.gameTime = gt.ms;
        if (vodUrl.trim().length > 0) input.vodUrl = vodUrl.trim();
        if (Object.keys(chosen).length > 0) input.variables = chosen;

        const res = await submitRunAction(game.name, input);
        setSubmitting(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setRunResult(res);
    };

    const onSubmitClaim = async () => {
        if (!canSubmitClaim || claimTime.ms === undefined) return;
        setSubmitting(true);
        setError(null);

        const res = await selfClaimTimeAction({
            gameId: game.id,
            categoryId: category.id,
            timing: effectiveClaimTiming,
            timeMs: claimTime.ms,
            subcategoryKey:
                subcategoryKey.length > 0 ? subcategoryKey : undefined,
            evidenceUrl:
                evidenceUrl.trim().length > 0 ? evidenceUrl.trim() : null,
        });
        setSubmitting(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setClaimResult(res);
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'submit') onSubmitRun();
        else onSubmitClaim();
    };

    if (runResult) {
        const statusLine =
            runResult.applied === 'instant'
                ? 'Your run is on the board.'
                : 'Your run is submitted and awaiting verification — it appears on the board marked unverified.';
        const warningMessages = runResult.warnings
            .map((w) => describeSubmitWarning(w, displayNames))
            .filter((m): m is string => m !== null);
        const boardHref = buildBoardHref(game.name, {
            categorySlug: category.name,
            subcategoryKey: runResult.subcategoryKey,
        });

        return (
            <div className="border rounded p-4">
                <h2 className="h5 mb-2">Run submitted</h2>
                <p className="mb-3">{statusLine}</p>
                {runResult.applied !== 'instant' && (
                    <p className="small text-muted mb-3">
                        You'll get a notification here when a moderator reviews
                        it.
                    </p>
                )}
                {warningMessages.length > 0 && (
                    <ul className="small text-warning-emphasis mb-3">
                        {warningMessages.map((m) => (
                            <li key={m}>{m}</li>
                        ))}
                    </ul>
                )}
                <div className="d-flex gap-2">
                    <Link href={boardHref} className="btn btn-sm btn-primary">
                        See it on the board
                    </Link>
                    <Link
                        href={`/games-v2/${game.name}/run/${runResult.id}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        View your run
                    </Link>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={reset}
                    >
                        Submit another
                    </button>
                </div>
            </div>
        );
    }

    if (claimResult) {
        const statusLine =
            claimResult.applied === 'instant'
                ? 'Your time is on the board.'
                : 'Your time is submitted and awaiting verification — it appears on the board marked unverified.';
        const boardHref = buildBoardHref(game.name, {
            categorySlug: category.name,
            subcategoryKey,
        });

        return (
            <div className="border rounded p-4">
                <h2 className="h5 mb-2">Time submitted</h2>
                <p className="mb-3">{statusLine}</p>
                {claimResult.applied !== 'instant' && (
                    <p className="small text-muted mb-3">
                        You'll get a notification here when a moderator reviews
                        it.
                    </p>
                )}
                <div className="d-flex gap-2">
                    <Link href={boardHref} className="btn btn-sm btn-primary">
                        See it on the board
                    </Link>
                    <Link
                        href={`/games-v2/${game.name}/manual/${claimResult.manualTimeId}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        View your time
                    </Link>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={reset}
                    >
                        Claim another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="d-flex flex-column gap-3">
            <div>
                <div
                    className={styles.modeSwitch}
                    role="group"
                    aria-label="Submission type"
                >
                    <button
                        type="button"
                        aria-pressed={mode === 'submit'}
                        className={`${styles.modeButton} ${mode === 'submit' ? styles.modeButtonActive : ''}`}
                        onClick={() => switchMode('submit')}
                    >
                        Submit a run
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === 'claim'}
                        className={`${styles.modeButton} ${mode === 'claim' ? styles.modeButtonActive : ''}`}
                        onClick={() => switchMode('claim')}
                    >
                        Claim an existing time
                    </button>
                </div>
                <p className={`small mb-0 mt-2 ${styles.modeHint}`}>
                    {mode === 'submit' ? SUBMIT_MODE_HINT : CLAIM_MODE_HINT}
                </p>
            </div>

            <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
                <div>
                    <label htmlFor="submit-category" className="form-label">
                        Category
                    </label>
                    <select
                        id="submit-category"
                        className="form-select"
                        value={categoryId}
                        onChange={(e) => setCategoryId(Number(e.target.value))}
                    >
                        {renderCategoryOptions(categories, groups)}
                    </select>
                </div>

                {category.rules && category.rules.trim().length > 0 && (
                    <div>
                        <RulesPanel
                            rules={category.rules}
                            open={rulesOpen}
                            onToggle={() => setRulesOpen((o) => !o)}
                            label="Category rules"
                        />
                        {rulesOpen && <RulesBody rules={category.rules} />}
                    </div>
                )}

                {varsError && (
                    <div className="alert alert-warning py-2 mb-0" role="alert">
                        Could not load variables for this category. You can
                        still {mode === 'submit' ? 'submit' : 'claim'};
                        variables will use their defaults.
                    </div>
                )}

                <StandingLine standing={standing} enteredMs={enteredMs} />

                {subcatDefs.map((def) => (
                    <div key={def.nameNormalized}>
                        <label
                            htmlFor={`sub-${def.nameNormalized}`}
                            className="form-label"
                        >
                            {def.name}
                        </label>
                        <select
                            id={`sub-${def.nameNormalized}`}
                            className="form-select"
                            value={subcategory[def.nameNormalized] ?? ''}
                            onChange={(e) =>
                                setSubcategory((prev) => ({
                                    ...prev,
                                    [def.nameNormalized]: e.target.value,
                                }))
                            }
                            required
                        >
                            {def.values.map((bucket, idx) => (
                                <option
                                    key={`${def.nameNormalized}-${idx}`}
                                    value={bucket[0]}
                                >
                                    {bucket[0]}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}

                {combinationInvalid && (
                    <div className="alert alert-warning py-2 mb-0" role="alert">
                        This combination has no leaderboard. Pick a different
                        combination to {mode === 'submit' ? 'submit' : 'claim'}.
                    </div>
                )}

                {mode === 'submit' ? (
                    <RunFields
                        filterDefs={filterDefs}
                        filters={filters}
                        onFilterChange={(name, value) =>
                            setFilters((prev) => ({ ...prev, [name]: value }))
                        }
                        showRt={showRt}
                        showGt={showGt}
                        primaryIsRt={primaryIsRt}
                        rt={rt}
                        gt={gt}
                        onChangeRt={(raw) => parseInto(raw, setRt)}
                        onChangeGt={(raw) => parseInto(raw, setGt)}
                        runDate={runDate}
                        today={today}
                        onChangeRunDate={setRunDate}
                        vodUrl={vodUrl}
                        vodRequired={vodRequired}
                        vodInvalid={vodInvalid}
                        vodMissing={vodMissing}
                        vodShowInvalid={vodShowInvalid}
                        onVodChange={(v) => {
                            setVodUrl(v);
                            setVodTouched(true);
                        }}
                        onVodBlur={() => setVodTouched(true)}
                    />
                ) : (
                    <ClaimFields
                        claimTimingChoice={claimTimingChoice}
                        claimTiming={claimTiming}
                        onClaimTimingChange={setClaimTiming}
                        effectiveClaimTiming={effectiveClaimTiming}
                        claimTime={claimTime}
                        onChangeClaimTime={(raw) =>
                            parseInto(raw, setClaimTime)
                        }
                        evidenceUrl={evidenceUrl}
                        evidenceShowInvalid={evidenceShowInvalid}
                        onEvidenceChange={(v) => {
                            setEvidenceUrl(v);
                            setEvidenceTouched(true);
                        }}
                        onEvidenceBlur={() => setEvidenceTouched(true)}
                    />
                )}

                {error && (
                    <div className="alert alert-danger py-2 mb-0" role="alert">
                        {error}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!canSubmit}
                    >
                        {submitting
                            ? 'Submitting…'
                            : mode === 'submit'
                              ? 'Submit run'
                              : 'Submit claim'}
                    </button>
                </div>
            </form>
        </div>
    );
}

/**
 * Quiet context line for the signed-in runner's current standing on the
 * selected board. Silent when there's no standing to show.
 */
function StandingLine({
    standing,
    enteredMs,
}: {
    standing: UserRanking | null;
    enteredMs: number | undefined;
}) {
    if (!standing) return null;
    const bestMs =
        standing.primaryTiming === 'gt'
            ? (standing.gameTime ?? standing.time)
            : standing.time;
    const rankLabel =
        standing.rank != null
            ? ` (#${standing.rank} of ${standing.totalRunners})`
            : '';
    const isSlower = enteredMs !== undefined && enteredMs > bestMs;

    return (
        <div className="small text-muted">
            <div>
                Your current best on this board:{' '}
                <strong>{formatRunTimeEcho(bestMs)}</strong>
                {rankLabel}. A faster time replaces it.
            </div>
            {isSlower && (
                <div>
                    This is slower than your current best — it won't replace
                    your board entry.
                </div>
            )}
        </div>
    );
}

function renderCategoryOptions(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
) {
    if (groups.length === 0) {
        return categories.map((c) => (
            <option key={c.id} value={c.id}>
                {c.display}
            </option>
        ));
    }

    const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
    const ungrouped = categories.filter((c) => c.groupId == null);
    const nodes: React.ReactNode[] = [];

    for (const g of sortedGroups) {
        const inGroup = categories.filter((c) => c.groupId === g.id);
        if (inGroup.length === 0) continue;
        nodes.push(
            <optgroup key={`g-${g.id}`} label={g.name}>
                {inGroup.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.display}
                    </option>
                ))}
            </optgroup>,
        );
    }
    if (ungrouped.length > 0) {
        nodes.push(
            <optgroup key="g-ungrouped" label="Other">
                {ungrouped.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.display}
                    </option>
                ))}
            </optgroup>,
        );
    }
    return nodes;
}
