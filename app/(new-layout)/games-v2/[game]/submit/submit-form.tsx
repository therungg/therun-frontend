'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { submitRunAction } from '~src/actions/submit-run.action';
import Link from '~src/components/link';
import { describeSubmitWarning } from '~src/lib/run-view/submit-warnings';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import { parseTimeInput } from '~src/lib/time-input';
import type {
    ResolvedCategory,
    ResolvedGroup,
    SubmitRunInput,
    SubmitRunResult,
    ValidCombinations,
    VariableDef,
} from '../../../../../types/leaderboards.types';
import { RulesBody, RulesPanel } from '../rules/rules-panel';
import { loadVariablesAction } from './load-variables.action';

interface Props {
    game: { id: number; name: string; display: string };
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
}

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

// Canonical subcategory key: sorted `name=value|...`. Mirrors
// `canonicalSubcategoryFragment` in src/lib/leaderboards-v1.ts (the board
// picker) so managed-combination validity matches the board exactly.
function buildSubcategoryKey(values: Record<string, string>): string {
    return Object.keys(values)
        .sort()
        .map((k) => `${k}=${values[k]}`)
        .join('|');
}

function isValidHttpUrl(raw: string): boolean {
    try {
        const u = new URL(raw);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

interface TimeField {
    raw: string;
    ms?: number;
    error: boolean;
}

const EMPTY_TIME: TimeField = { raw: '', ms: undefined, error: false };

export function SubmitForm({ game, categories, groups }: Props) {
    const [categoryId, setCategoryId] = useState<number>(categories[0].id);
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

    const [rt, setRt] = useState<TimeField>(EMPTY_TIME);
    const [gt, setGt] = useState<TimeField>(EMPTY_TIME);
    const [runDate, setRunDate] = useState<string>(todayISODate());
    const [vodUrl, setVodUrl] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SubmitRunResult | null>(null);
    const [vodTouched, setVodTouched] = useState(false);
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);

    const today = todayISODate();

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
                        sub[def.nameNormalized] = canonicalDefault(def);
                    }
                }
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
    }, [game.name, category.name]);

    const subcatDefs = variables.filter((v) => v.role === 'subcategory');
    const filterDefs = variables.filter((v) => v.role === 'filter');

    const displayNames = useMemo(() => {
        const map: Record<string, string> = {};
        for (const v of variables) map[v.nameNormalized] = v.name;
        return map;
    }, [variables]);

    const combinationInvalid =
        validCombinations.mode === 'managed' &&
        !validCombinations.keys.includes(buildSubcategoryKey(subcategory));

    const showRt = !category.hideRealTime;
    const showGt = !category.hideGameTime;
    const primaryIsRt = category.primaryTiming !== 'gt';

    const parseInto = (raw: string, set: (v: TimeField) => void): void => {
        const trimmed = raw.trim();
        if (trimmed.length === 0) {
            set({ raw, ms: undefined, error: false });
            return;
        }
        const ms = parseTimeInput(trimmed);
        set({ raw, ms, error: ms === undefined });
    };

    const primaryMissing = primaryIsRt
        ? rt.ms === undefined
        : gt.ms === undefined;

    const vodRequired = category.requireVideo === true;
    const vodInvalid =
        vodUrl.trim().length > 0 && !isValidHttpUrl(vodUrl.trim());
    const vodMissing = vodRequired && vodUrl.trim().length === 0;
    // Only surface the inline error once the user has interacted with the
    // field (or tried to submit) — the disabled submit button plus the
    // passive hint already cover the untouched, pre-interaction state.
    const vodShowInvalid =
        (vodTouched || attemptedSubmit) && (vodInvalid || vodMissing);

    const canSubmit =
        !submitting &&
        !varsLoading &&
        !combinationInvalid &&
        !primaryMissing &&
        !rt.error &&
        !gt.error &&
        !vodInvalid &&
        !vodMissing &&
        runDate.length > 0;

    const reset = () => {
        setRt(EMPTY_TIME);
        setGt(EMPTY_TIME);
        setRunDate(todayISODate());
        setVodUrl('');
        setVodTouched(false);
        setAttemptedSubmit(false);
        setError(null);
        setResult(null);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAttemptedSubmit(true);
        if (!canSubmit) return;
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
        setResult(res);
    };

    if (result) {
        const statusLine =
            result.applied === 'instant'
                ? 'Your run is on the board.'
                : 'Your run is submitted and awaiting verification — it appears on the board marked unverified.';
        const warningMessages = result.warnings
            .map((w) => describeSubmitWarning(w, displayNames))
            .filter((m): m is string => m !== null);

        return (
            <div className="border rounded p-4">
                <h2 className="h5 mb-2">Run submitted</h2>
                <p className="mb-3">{statusLine}</p>
                {warningMessages.length > 0 && (
                    <ul className="small text-warning-emphasis mb-3">
                        {warningMessages.map((m) => (
                            <li key={m}>{m}</li>
                        ))}
                    </ul>
                )}
                <div className="d-flex gap-2">
                    <Link
                        href={`/games-v2/${game.name}/run/${result.id}`}
                        className="btn btn-sm btn-primary"
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

    return (
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
                    Could not load variables for this category. You can still
                    submit; variables will use their defaults.
                </div>
            )}

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

            {filterDefs.map((def) => (
                <div key={def.nameNormalized}>
                    <label
                        htmlFor={`filter-${def.nameNormalized}`}
                        className="form-label"
                    >
                        {def.name}{' '}
                        <span className="text-muted small">(optional)</span>
                    </label>
                    <select
                        id={`filter-${def.nameNormalized}`}
                        className="form-select"
                        value={filters[def.nameNormalized] ?? ''}
                        onChange={(e) =>
                            setFilters((prev) => ({
                                ...prev,
                                [def.nameNormalized]: e.target.value,
                            }))
                        }
                    >
                        <option value="">—</option>
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
                    combination to submit.
                </div>
            )}

            {showRt && (
                <TimeInput
                    id="submit-rt"
                    label="Real time (RTA)"
                    required={primaryIsRt}
                    field={rt}
                    onChange={(raw) => parseInto(raw, setRt)}
                />
            )}
            {showGt && (
                <TimeInput
                    id="submit-gt"
                    label="Game time (IGT)"
                    required={!primaryIsRt}
                    field={gt}
                    onChange={(raw) => parseInto(raw, setGt)}
                />
            )}

            <div>
                <label htmlFor="submit-date" className="form-label">
                    Date achieved
                </label>
                <input
                    id="submit-date"
                    type="date"
                    className="form-control"
                    value={runDate}
                    max={today}
                    onChange={(e) => setRunDate(e.target.value)}
                    required
                />
            </div>

            <div>
                <label htmlFor="submit-vod" className="form-label">
                    Video URL
                    <span className="text-muted small">
                        {' '}
                        {vodRequired ? '(required)' : '(optional)'}
                    </span>
                </label>
                <input
                    id="submit-vod"
                    type="url"
                    className={`form-control ${vodShowInvalid ? 'is-invalid' : ''}`}
                    value={vodUrl}
                    onChange={(e) => {
                        setVodUrl(e.target.value);
                        setVodTouched(true);
                    }}
                    onBlur={() => setVodTouched(true)}
                    placeholder="https://..."
                    required={vodRequired}
                />
                {vodShowInvalid &&
                    (vodInvalid ? (
                        <div className="invalid-feedback">
                            Enter a valid http(s) URL.
                        </div>
                    ) : (
                        <div className="invalid-feedback">
                            Video URL is required for this category.
                        </div>
                    ))}
                {vodRequired && (
                    <div className="form-text">
                        This category requires video for verification.
                    </div>
                )}
            </div>

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
                    {submitting ? 'Submitting…' : 'Submit run'}
                </button>
            </div>
        </form>
    );
}

function TimeInput({
    id,
    label,
    required,
    field,
    onChange,
}: {
    id: string;
    label: string;
    required: boolean;
    field: TimeField;
    onChange: (raw: string) => void;
}) {
    return (
        <div>
            <label htmlFor={id} className="form-label">
                {label}
                {required && <span className="text-danger"> *</span>}
            </label>
            <input
                id={id}
                type="text"
                inputMode="numeric"
                className={`form-control ${field.error ? 'is-invalid' : ''}`}
                value={field.raw}
                placeholder="h:mm:ss or mm:ss"
                required={required}
                onChange={(e) => onChange(e.target.value)}
                onBlur={(e) => onChange(e.target.value)}
            />
            {field.error ? (
                <div className="invalid-feedback">Unrecognized time.</div>
            ) : field.ms !== undefined ? (
                <div className="form-text">{formatTimeMs(field.ms)}</div>
            ) : null}
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
