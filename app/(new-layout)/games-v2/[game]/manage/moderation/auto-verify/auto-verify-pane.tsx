'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import type {
    AutoVerifyPolicyValue,
    AutoVerifyPreset,
    BoardPolicyRow,
    CreatePolicyInput,
} from '../../../../../../../types/moderation.types';
import { FormSection, InlineError, SectionFooter } from '../../shared/form-kit';
import kit from '../../shared/form-kit.module.scss';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../policies/actions/policies-actions.action';
import { loadAutoVerifyAction } from './actions/load-auto-verify.action';
import styles from './auto-verify-pane.module.scss';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
}

const PRESET_OPTIONS: Array<{ value: AutoVerifyPreset; label: string }> = [
    { value: 'off', label: 'Off' },
    { value: 'lenient', label: 'Lenient' },
    { value: 'standard', label: 'Standard' },
    { value: 'strict', label: 'Strict' },
];

const DEFAULT_NEVER_TOP_N = 10;

interface FormState {
    preset: AutoVerifyPreset;
    /** Raw text of the "never auto-verify top" input. Held as a string so a
     * momentarily-blank field (the moderator clearing it to retype) doesn't
     * coerce to 0 and silently turn the top-N guard off. Parsed to a number
     * only when saving — see parseNeverTopN. */
    neverTopN: string;
    requireLive: boolean;
}

/** Parses the top-N field's raw text into a valid non-negative integer, or
 * null when the text isn't one (including the blank string) — the caller
 * must treat null as "can't save yet", never as 0. */
function parseNeverTopN(text: string): number | null {
    if (text.trim() === '') return null;
    const n = Number(text);
    return Number.isInteger(n) && n >= 0 ? n : null;
}

function defaultState(): FormState {
    return {
        preset: 'off',
        neverTopN: String(DEFAULT_NEVER_TOP_N),
        requireLive: false,
    };
}

function stateFromPolicy(policy: BoardPolicyRow): FormState {
    const v = policy.value as Partial<AutoVerifyPolicyValue>;
    return {
        preset:
            v.preset === 'off' ||
            v.preset === 'lenient' ||
            v.preset === 'standard' ||
            v.preset === 'strict'
                ? v.preset
                : 'off',
        neverTopN: String(
            typeof v.neverTopN === 'number' && Number.isFinite(v.neverTopN)
                ? v.neverTopN
                : DEFAULT_NEVER_TOP_N,
        ),
        requireLive: v.requireLive === true,
    };
}

function sameState(a: FormState, b: FormState): boolean {
    return (
        a.preset === b.preset &&
        a.neverTopN === b.neverTopN &&
        a.requireLive === b.requireLive
    );
}

const BACKFILL_NOTE =
    'Turning this on evaluates up to the 100 most recent pending runs in this scope. A successful save doesn’t guarantee every one was judged.';

function PolicyControls({
    idPrefix,
    state,
    onChange,
    disabled,
}: {
    idPrefix: string;
    state: FormState;
    onChange: (state: FormState) => void;
    disabled: boolean;
}) {
    return (
        <div className={styles.fieldCol}>
            <div>
                <label
                    htmlFor={`${idPrefix}-preset`}
                    className="form-label small mb-1"
                >
                    Preset
                </label>
                <select
                    id={`${idPrefix}-preset`}
                    className="form-select form-select-sm"
                    style={{ maxWidth: '14rem' }}
                    value={state.preset}
                    disabled={disabled}
                    onChange={(e) =>
                        onChange({
                            ...state,
                            preset: e.target.value as AutoVerifyPreset,
                        })
                    }
                >
                    {PRESET_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <p className="text-muted small mb-0 mt-1">{BACKFILL_NOTE}</p>
            </div>

            <div>
                <label
                    htmlFor={`${idPrefix}-top-n`}
                    className="form-label small mb-1"
                >
                    Never auto-verify top
                </label>
                <input
                    id={`${idPrefix}-top-n`}
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    className="form-control form-control-sm"
                    style={{ maxWidth: '10rem' }}
                    value={state.neverTopN}
                    disabled={disabled}
                    onChange={(e) =>
                        onChange({ ...state, neverTopN: e.target.value })
                    }
                />
                {parseNeverTopN(state.neverTopN) === null && (
                    <p className="text-danger small mb-0 mt-1">
                        A number is required.
                    </p>
                )}
                {parseNeverTopN(state.neverTopN) === 0 && (
                    <div className={styles.warning}>
                        Any run — a would-be world record included — can
                        auto-verify.
                    </div>
                )}
            </div>

            <div className="form-check">
                <input
                    id={`${idPrefix}-require-live`}
                    type="checkbox"
                    className="form-check-input"
                    checked={state.requireLive}
                    disabled={disabled}
                    onChange={(e) =>
                        onChange({ ...state, requireLive: e.target.checked })
                    }
                />
                <label
                    htmlFor={`${idPrefix}-require-live`}
                    className="form-check-label small"
                >
                    Require live tracking
                </label>
            </div>
        </div>
    );
}

function GameWideSection({
    gameSlug,
    policy,
    onSaved,
}: {
    gameSlug: string;
    policy: BoardPolicyRow | undefined;
    onSaved: () => Promise<void>;
}) {
    const original = policy ? stateFromPolicy(policy) : defaultState();
    const [state, setState] = useState<FormState>(original);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    useEffect(() => {
        setState(policy ? stateFromPolicy(policy) : defaultState());
    }, [policy]);

    const dirty = !sameState(state, original);
    const neverTopN = parseNeverTopN(state.neverTopN);
    const invalid = neverTopN === null;

    const handleSave = () => {
        if (neverTopN === null) return;
        setError(null);
        const wasOff = !policy || original.preset === 'off';
        startSaving(async () => {
            const value: AutoVerifyPolicyValue = {
                preset: state.preset,
                neverTopN,
                requireLive: state.requireLive,
            };
            const res = policy
                ? await updatePolicyAction(gameSlug, policy.id, value)
                : await createPolicyAction(gameSlug, {
                      policyType: 'auto_verify',
                      value,
                  } satisfies CreatePolicyInput);

            if ('error' in res) {
                setError(res.error);
                return;
            }

            if (wasOff && state.preset !== 'off') {
                toast.success(`Auto-verify saved. ${BACKFILL_NOTE}`);
            } else {
                toast.success('Auto-verify saved.');
            }
            await onSaved();
        });
    };

    const handleReset = () => {
        setState(original);
        setError(null);
    };

    return (
        <FormSection
            title="Game-wide"
            status={policy && original.preset !== 'off' ? 'done' : undefined}
            lede="Applies to every category on this board unless a category has its own override below."
        >
            <PolicyControls
                idPrefix="av-game"
                state={state}
                onChange={setState}
                disabled={isSaving}
            />
            <div className="mt-3">
                <SectionFooter>
                    <button
                        type="button"
                        className={kit.saveBtn}
                        onClick={handleSave}
                        disabled={isSaving || !dirty || invalid}
                    >
                        {isSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className={kit.resetBtn}
                        onClick={handleReset}
                        disabled={isSaving || !dirty}
                    >
                        Reset
                    </button>
                </SectionFooter>
                <InlineError>{error}</InlineError>
            </div>
        </FormSection>
    );
}

function CategoryOverrideRow({
    gameSlug,
    category,
    policy,
    onSaved,
}: {
    gameSlug: string;
    category: { id: number; display: string };
    policy: BoardPolicyRow | undefined;
    onSaved: () => Promise<void>;
}) {
    const [expanded, setExpanded] = useState(false);
    const [state, setState] = useState<FormState>(
        policy ? stateFromPolicy(policy) : defaultState(),
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    useEffect(() => {
        setState(policy ? stateFromPolicy(policy) : defaultState());
    }, [policy]);

    const neverTopN = parseNeverTopN(state.neverTopN);
    const invalid = neverTopN === null;

    const handleSave = () => {
        if (neverTopN === null) return;
        setError(null);
        const wasOff = !policy || stateFromPolicy(policy).preset === 'off';
        startSaving(async () => {
            const value: AutoVerifyPolicyValue = {
                preset: state.preset,
                neverTopN,
                requireLive: state.requireLive,
            };
            const res = policy
                ? await updatePolicyAction(gameSlug, policy.id, value)
                : await createPolicyAction(gameSlug, {
                      policyType: 'auto_verify',
                      value,
                      categoryId: category.id,
                  } satisfies CreatePolicyInput);

            if ('error' in res) {
                setError(res.error);
                return;
            }

            if (wasOff && state.preset !== 'off') {
                toast.success(`Override saved. ${BACKFILL_NOTE}`);
            } else {
                toast.success('Override saved.');
            }
            setExpanded(false);
            await onSaved();
        });
    };

    const handleRemove = () => {
        if (!policy) return;
        setError(null);
        startSaving(async () => {
            const res = await deletePolicyAction(gameSlug, policy.id);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success(
                'Override removed — this category inherits the game-wide policy again.',
            );
            setExpanded(false);
            await onSaved();
        });
    };

    const overrideSummary = policy ? stateFromPolicy(policy) : null;

    return (
        <div className={styles.overrideRow}>
            <div className={styles.overrideHead}>
                <span className={styles.overrideName}>{category.display}</span>
                <span className={styles.overrideSummary}>
                    {overrideSummary
                        ? `${overrideSummary.preset} · top ${overrideSummary.neverTopN} · ${overrideSummary.requireLive ? 'live required' : 'live optional'}`
                        : '(inherits game)'}
                </span>
                {!expanded && (
                    <button
                        type="button"
                        className={styles.overrideToggle}
                        onClick={() => setExpanded(true)}
                    >
                        {policy ? 'Edit' : 'Add override'}
                    </button>
                )}
            </div>

            {expanded && (
                <div className={styles.overrideBody}>
                    <PolicyControls
                        idPrefix={`av-cat-${category.id}`}
                        state={state}
                        onChange={setState}
                        disabled={isSaving}
                    />
                    <div className="mt-3">
                        <SectionFooter>
                            <button
                                type="button"
                                className={kit.saveBtn}
                                onClick={handleSave}
                                disabled={isSaving || invalid}
                            >
                                {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                                type="button"
                                className={kit.resetBtn}
                                onClick={() => {
                                    setState(
                                        policy
                                            ? stateFromPolicy(policy)
                                            : defaultState(),
                                    );
                                    setExpanded(false);
                                    setError(null);
                                }}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            {policy && (
                                <button
                                    type="button"
                                    className={styles.removeBtn}
                                    onClick={handleRemove}
                                    disabled={isSaving}
                                >
                                    Remove override
                                </button>
                            )}
                        </SectionFooter>
                        <InlineError>{error}</InlineError>
                    </div>
                </div>
            )}
        </div>
    );
}

export function AutoVerifyPane({ gameSlug, gameDisplay, categories }: Props) {
    const [policies, setPolicies] = useState<BoardPolicyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [overridesOpen, setOverridesOpen] = useState(false);

    const load = useCallback(async () => {
        const res = await loadAutoVerifyAction(gameSlug);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setError(null);
        setPolicies(res.policies);
        setHasLoaded(true);
    }, [gameSlug]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        load().finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [load]);

    const handleRetry = () => {
        setLoading(true);
        load().finally(() => setLoading(false));
    };

    const gamePolicy = policies.find((p) => p.categoryId === null);
    const policyByCategory = new Map(
        policies
            .filter((p) => p.categoryId !== null)
            .map((p) => [p.categoryId as number, p]),
    );

    return (
        <div className={consoleStyles.surface}>
            <header className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Moderation</div>
                    <h2 className={consoleStyles.paneTitle}>Auto-verify</h2>
                </div>
            </header>
            <p className={consoleStyles.paneLede}>
                Automatically verifies timer runs whose split data passes a set
                of checks for {gameDisplay}. Everything except the live receive
                times comes from the runner&apos;s own splits file and attempt
                history — live match proves the timer didn&apos;t run faster
                than wall-clock time between splits, but it can&apos;t detect a
                paused timer or spliced footage, which always passes. Gold-beat
                and PB-jump are weak signals for a fresh splits file with little
                history. A minimum-time policy and the top-N guard below remain
                the backstops. Auto-verified is not the same as checked by a
                human.
            </p>

            {loading && !hasLoaded ? (
                <p className="text-muted">Loading auto-verify settings…</p>
            ) : error && !hasLoaded ? (
                <InlineError>{error}</InlineError>
            ) : (
                <>
                    {error && (
                        <div className="mb-3">
                            <InlineError>{error}</InlineError>
                            <button
                                type="button"
                                className={kit.resetBtn}
                                onClick={handleRetry}
                                disabled={loading}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    <GameWideSection
                        gameSlug={gameSlug}
                        policy={gamePolicy}
                        onSaved={load}
                    />

                    <details
                        className={styles.overridesSection}
                        open={overridesOpen}
                        onToggle={(e) =>
                            setOverridesOpen(
                                (e.target as HTMLDetailsElement).open,
                            )
                        }
                    >
                        <summary className={styles.overridesSummary}>
                            Per-category overrides
                        </summary>
                        <div className={styles.overridesList}>
                            {categories.length === 0 ? (
                                <p className="text-muted small mb-0">
                                    No categories yet.
                                </p>
                            ) : (
                                categories.map((category) => (
                                    <CategoryOverrideRow
                                        key={category.id}
                                        gameSlug={gameSlug}
                                        category={category}
                                        policy={policyByCategory.get(
                                            category.id,
                                        )}
                                        onSaved={load}
                                    />
                                ))
                            )}
                        </div>
                    </details>
                </>
            )}
        </div>
    );
}
