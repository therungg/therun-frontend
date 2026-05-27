'use client';

import { type FormEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    BoardPolicyRow,
    CreatePolicyInput,
    PolicyType,
} from '../../../../../../../types/moderation.types';
import { msToInput, parseTime } from '../configure/time-input';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from './actions/policies-actions.action';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
    policies: BoardPolicyRow[];
}

const MIN_REASON = 10;

const POLICY_TYPES: PolicyType[] = [
    'min_time',
    'max_time',
    'require_video_top_n',
    'auto_flag_pb_jump_pct',
    'auto_flag_faster_than_wr_pct',
];

const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
    min_time: 'Minimum time',
    max_time: 'Maximum time',
    require_video_top_n: 'Require video (top N)',
    auto_flag_pb_jump_pct: 'Auto-flag PB jump %',
    auto_flag_faster_than_wr_pct: 'Auto-flag faster than WR %',
};

function isTimePolicy(type: PolicyType): boolean {
    return type === 'min_time' || type === 'max_time';
}

function isPctPolicy(type: PolicyType): boolean {
    return (
        type === 'auto_flag_pb_jump_pct' ||
        type === 'auto_flag_faster_than_wr_pct'
    );
}

function num(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}

/** Human-readable rendering of a policy's value JSON. */
function renderValue(policy: BoardPolicyRow): React.ReactNode {
    const v = policy.value;
    if (isTimePolicy(policy.policyType)) {
        const rt = num(v.rtMs);
        const gt = num(v.gtMs);
        const parts: React.ReactNode[] = [];
        if (rt !== undefined) {
            parts.push(
                <span key="rt">
                    RT <DurationToFormatted duration={rt} withMillis />
                </span>,
            );
        }
        if (gt !== undefined) {
            parts.push(
                <span key="gt">
                    GT <DurationToFormatted duration={gt} withMillis />
                </span>,
            );
        }
        if (parts.length === 0) return '—';
        return parts.flatMap((p, i) =>
            i === 0 ? [p] : [<span key={`sep${i}`}> · </span>, p],
        );
    }
    if (policy.policyType === 'require_video_top_n') {
        const n = num(v.n);
        return n !== undefined ? `Top ${n}` : '—';
    }
    if (isPctPolicy(policy.policyType)) {
        const pct = num(v.pct);
        return pct !== undefined ? `${pct}%` : '—';
    }
    return JSON.stringify(v);
}

function scopeLabel(
    policy: BoardPolicyRow,
    categories: Array<{ id: number; display: string }>,
): React.ReactNode {
    let base: React.ReactNode;
    if (policy.categoryId == null) {
        base = <em>Game-wide</em>;
    } else {
        const cat = categories.find((c) => c.id === policy.categoryId);
        base = cat ? cat.display : `Category #${policy.categoryId}`;
    }
    if (policy.subcategoryKey) {
        return (
            <>
                {base}{' '}
                <span className="small text-muted">
                    · {policy.subcategoryKey}
                </span>
            </>
        );
    }
    return base;
}

// ── Value editor (shared by create form and inline edit) ─────────────────────

interface ValueEditorState {
    rtInput: string;
    gtInput: string;
    nInput: string;
    pctInput: string;
}

function emptyValueState(): ValueEditorState {
    return { rtInput: '', gtInput: '', nInput: '', pctInput: '' };
}

function valueStateFromPolicy(policy: BoardPolicyRow): ValueEditorState {
    const v = policy.value;
    return {
        rtInput: msToInput(num(v.rtMs) ?? null),
        gtInput: msToInput(num(v.gtMs) ?? null),
        nInput: num(v.n) !== undefined ? String(v.n) : '',
        pctInput: num(v.pct) !== undefined ? String(v.pct) : '',
    };
}

/**
 * Build the `value` JSON for a policy type from editor state.
 * Returns `{ error }` on invalid input, otherwise `{ value }`.
 */
function buildValue(
    type: PolicyType,
    state: ValueEditorState,
): { value: Record<string, unknown> } | { error: string } {
    if (isTimePolicy(type)) {
        const rt = parseTime(state.rtInput);
        const gt = parseTime(state.gtInput);
        if (Number.isNaN(rt) || Number.isNaN(gt)) {
            return {
                error: 'Times must be in h:mm:ss, m:ss, or m:ss.SSS format and greater than zero.',
            };
        }
        if (rt === null && gt === null) {
            return { error: 'At least one of RT or GT is required.' };
        }
        const value: Record<string, unknown> = {};
        if (rt !== null) value.rtMs = rt;
        if (gt !== null) value.gtMs = gt;
        return { value };
    }
    if (type === 'require_video_top_n') {
        const n = Number.parseInt(state.nInput.trim(), 10);
        if (!Number.isInteger(n) || n <= 0) {
            return { error: 'N must be a whole number greater than zero.' };
        }
        return { value: { n } };
    }
    // pct policies
    const pct = Number(state.pctInput.trim());
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return { error: 'Percentage must be a number between 0 and 100.' };
    }
    return { value: { pct } };
}

function ValueEditor({
    type,
    state,
    setState,
    disabled,
}: {
    type: PolicyType;
    state: ValueEditorState;
    setState: (s: ValueEditorState) => void;
    disabled?: boolean;
}) {
    if (isTimePolicy(type)) {
        return (
            <div className="row g-2">
                <div className="col">
                    <label className="form-label small mb-1">
                        RT (h:mm:ss.SSS)
                    </label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={state.rtInput}
                        onChange={(e) =>
                            setState({ ...state, rtInput: e.target.value })
                        }
                        placeholder="e.g. 0:30 or 1:23:45"
                        disabled={disabled}
                    />
                </div>
                <div className="col">
                    <label className="form-label small mb-1">
                        GT (h:mm:ss.SSS)
                    </label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={state.gtInput}
                        onChange={(e) =>
                            setState({ ...state, gtInput: e.target.value })
                        }
                        placeholder="(optional)"
                        disabled={disabled}
                    />
                </div>
            </div>
        );
    }
    if (type === 'require_video_top_n') {
        return (
            <div>
                <label className="form-label small mb-1">Top N</label>
                <input
                    type="number"
                    min={1}
                    step={1}
                    className="form-control form-control-sm"
                    value={state.nInput}
                    onChange={(e) =>
                        setState({ ...state, nInput: e.target.value })
                    }
                    placeholder="e.g. 10"
                    disabled={disabled}
                />
            </div>
        );
    }
    return (
        <div>
            <label className="form-label small mb-1">Percentage (0–100)</label>
            <input
                type="number"
                min={0}
                max={100}
                step="any"
                className="form-control form-control-sm"
                value={state.pctInput}
                onChange={(e) =>
                    setState({ ...state, pctInput: e.target.value })
                }
                placeholder="e.g. 25"
                disabled={disabled}
            />
        </div>
    );
}

// ── Existing policy row (with inline value edit + delete) ────────────────────

function PolicyRow({
    gameSlug,
    policy,
    categories,
    onUpdated,
    onDeleted,
}: {
    gameSlug: string;
    policy: BoardPolicyRow;
    categories: Array<{ id: number; display: string }>;
    onUpdated: (policy: BoardPolicyRow) => void;
    onDeleted: (id: number) => void;
}) {
    const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
    const [valueState, setValueState] = useState<ValueEditorState>(() =>
        valueStateFromPolicy(policy),
    );
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const reasonOk = reason.trim().length >= MIN_REASON;

    const reset = () => {
        setMode('view');
        setValueState(valueStateFromPolicy(policy));
        setReason('');
        setError(null);
    };

    const handleSave = () => {
        if (!reasonOk) return;
        setError(null);
        const built = buildValue(policy.policyType, valueState);
        if ('error' in built) {
            setError(built.error);
            return;
        }
        startTransition(async () => {
            const res = await updatePolicyAction(
                gameSlug,
                policy.id,
                built.value,
                reason.trim(),
            );
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Policy updated.');
            onUpdated(res.policy);
            setMode('view');
            setReason('');
        });
    };

    const handleDelete = () => {
        if (!reasonOk) return;
        setError(null);
        startTransition(async () => {
            const res = await deletePolicyAction(
                gameSlug,
                policy.id,
                reason.trim(),
            );
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Policy deleted.');
            onDeleted(policy.id);
        });
    };

    return (
        <tr>
            <td>{scopeLabel(policy, categories)}</td>
            <td>
                {POLICY_TYPE_LABELS[policy.policyType] ?? policy.policyType}
            </td>
            <td>
                {mode === 'edit' ? (
                    <ValueEditor
                        type={policy.policyType}
                        state={valueState}
                        setState={setValueState}
                        disabled={isPending}
                    />
                ) : (
                    renderValue(policy)
                )}
            </td>
            <td className="small text-muted">{policy.reason}</td>
            <td className="small text-muted">
                {new Date(policy.createdAt).toLocaleDateString()}
            </td>
            <td className="text-end" style={{ minWidth: 280 }}>
                {mode === 'view' && (
                    <div className="d-flex gap-2 justify-content-end">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                setMode('edit');
                                setError(null);
                            }}
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                                setMode('delete');
                                setError(null);
                            }}
                        >
                            Delete
                        </button>
                    </div>
                )}

                {(mode === 'edit' || mode === 'delete') && (
                    <div className="d-flex flex-column gap-1">
                        <textarea
                            className="form-control form-control-sm"
                            rows={2}
                            placeholder={`Reason (min ${MIN_REASON} chars)`}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isPending}
                        />
                        {error && (
                            <div className="text-danger small">{error}</div>
                        )}
                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={reset}
                                disabled={isPending}
                            >
                                Cancel
                            </button>
                            {mode === 'edit' ? (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={handleSave}
                                    disabled={isPending || !reasonOk}
                                >
                                    {isPending ? 'Saving…' : 'Save'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={handleDelete}
                                    disabled={isPending || !reasonOk}
                                >
                                    {isPending ? 'Deleting…' : 'Confirm delete'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </td>
        </tr>
    );
}

// ── New-policy form ──────────────────────────────────────────────────────────

function NewPolicyForm({
    gameSlug,
    categories,
    onCreated,
}: {
    gameSlug: string;
    categories: Array<{ id: number; display: string }>;
    onCreated: (policy: BoardPolicyRow) => void;
}) {
    const [policyType, setPolicyType] = useState<PolicyType>('min_time');
    const [valueState, setValueState] =
        useState<ValueEditorState>(emptyValueState);
    const [categoryId, setCategoryId] = useState<string>('');
    const [subcategoryKey, setSubcategoryKey] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const reasonOk = reason.trim().length >= MIN_REASON;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        const built = buildValue(policyType, valueState);
        if ('error' in built) {
            setError(built.error);
            return;
        }
        if (!reasonOk) {
            setError(`Reason is required (min ${MIN_REASON} characters).`);
            return;
        }

        const input: CreatePolicyInput = {
            policyType,
            value: built.value,
            reason: reason.trim(),
        };
        if (categoryId) {
            const id = Number.parseInt(categoryId, 10);
            if (Number.isFinite(id)) input.categoryId = id;
        }
        const sub = subcategoryKey.trim();
        if (sub) input.subcategoryKey = sub;

        startTransition(async () => {
            const res = await createPolicyAction(gameSlug, input);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Policy created.');
            onCreated(res.policy);
            // Reset value/scope/reason but keep the selected type for repeats.
            setValueState(emptyValueState());
            setCategoryId('');
            setSubcategoryKey('');
            setReason('');
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="border rounded p-3 bg-light-subtle"
        >
            <h2 className="h5 mb-3">New policy</h2>

            <div className="row g-3">
                <div className="col-md-4">
                    <label
                        htmlFor="policy-type"
                        className="form-label small mb-1"
                    >
                        Policy type
                    </label>
                    <select
                        id="policy-type"
                        className="form-select form-select-sm"
                        value={policyType}
                        onChange={(e) => {
                            setPolicyType(e.target.value as PolicyType);
                            setValueState(emptyValueState());
                            setError(null);
                        }}
                        disabled={isPending}
                    >
                        {POLICY_TYPES.map((t) => (
                            <option key={t} value={t}>
                                {POLICY_TYPE_LABELS[t]}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-8">
                    <span className="form-label small mb-1 d-block">Value</span>
                    <ValueEditor
                        type={policyType}
                        state={valueState}
                        setState={setValueState}
                        disabled={isPending}
                    />
                </div>
            </div>

            <div className="row g-3 mt-0">
                <div className="col-md-4">
                    <label
                        htmlFor="policy-category"
                        className="form-label small mb-1"
                    >
                        Category
                    </label>
                    <select
                        id="policy-category"
                        className="form-select form-select-sm"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        disabled={isPending}
                    >
                        <option value="">Game-wide</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.display}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-4">
                    <label
                        htmlFor="policy-subkey"
                        className="form-label small mb-1"
                    >
                        Subcategory key
                    </label>
                    <input
                        id="policy-subkey"
                        type="text"
                        className="form-control form-control-sm"
                        value={subcategoryKey}
                        onChange={(e) => setSubcategoryKey(e.target.value)}
                        placeholder="(optional — all subkeys)"
                        disabled={isPending}
                    />
                </div>
            </div>

            <div className="mt-3">
                <label
                    htmlFor="policy-reason"
                    className="form-label small mb-1"
                >
                    Reason
                </label>
                <textarea
                    id="policy-reason"
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder={`Reason (min ${MIN_REASON} chars)`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isPending}
                />
            </div>

            {error && (
                <div className="alert alert-danger mt-2 mb-0 py-2">{error}</div>
            )}

            <div className="d-flex justify-content-end mt-3">
                <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={isPending || !reasonOk}
                >
                    {isPending ? 'Creating…' : 'Create policy'}
                </button>
            </div>
        </form>
    );
}

// ── Page view ────────────────────────────────────────────────────────────────

export function PoliciesView({
    gameSlug,
    gameDisplay,
    categories,
    policies,
}: Props) {
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;
    const [list, setList] = useState(policies);

    const onCreated = (policy: BoardPolicyRow) =>
        setList((prev) => [policy, ...prev]);
    const onUpdated = (policy: BoardPolicyRow) =>
        setList((prev) => prev.map((p) => (p.id === policy.id ? policy : p)));
    const onDeleted = (id: number) =>
        setList((prev) => prev.filter((p) => p.id !== id));

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">Board policies — {gameDisplay}</h1>
                <Link
                    href={baseHref}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to moderation
                </Link>
            </div>

            <p className="text-muted small">
                Policies generalize leaderboard rules across a category or the
                whole game: minimum/maximum allowed times, video requirements
                for top ranks, and automatic flagging thresholds.
            </p>

            {list.length === 0 ? (
                <p className="text-muted">
                    No policies are configured for this game.
                </p>
            ) : (
                <div className="table-responsive mb-4">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>Scope</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Reason</th>
                                <th>Created</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((policy) => (
                                <PolicyRow
                                    key={policy.id}
                                    gameSlug={gameSlug}
                                    policy={policy}
                                    categories={categories}
                                    onUpdated={onUpdated}
                                    onDeleted={onDeleted}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <NewPolicyForm
                gameSlug={gameSlug}
                categories={categories}
                onCreated={onCreated}
            />
        </div>
    );
}
