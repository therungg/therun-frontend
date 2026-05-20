'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { VariableRow } from '../../../../../../types/leaderboards.types';

export interface VariableFormValues {
    name: string;
    role: 'subcategory' | 'filter';
    values: string[][];
    defaultValueIndex: number | null;
    sortOrder: number;
    description: string | null;
}

interface Bucket {
    canonical: string;
    aliasesText: string;
    aliasesExpanded: boolean;
}

interface Props {
    mode: 'create' | 'edit';
    editing?: VariableRow | null;
    reservedParams: string[];
    onSubmit: (values: VariableFormValues) => void;
    onCancel: () => void;
    isBusy: boolean;
    error: string | null;
}

function normalizeName(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, '').replace(/[=|]/g, '');
}

function bucketsFromRow(row: VariableRow): Bucket[] {
    return row.values.map((v) => ({
        canonical: v[0] ?? '',
        aliasesText: v.slice(1).join(', '),
        aliasesExpanded: v.length > 1,
    }));
}

function bucketsToValues(buckets: Bucket[]): string[][] {
    return buckets
        .map((b) => {
            const canonical = b.canonical.trim();
            const aliases = b.aliasesText
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean);
            return canonical ? [canonical, ...aliases] : [];
        })
        .filter((bucket) => bucket.length > 0);
}

export function VariableForm({
    mode,
    editing,
    reservedParams,
    onSubmit,
    onCancel,
    isBusy,
    error,
}: Props) {
    const [name, setName] = useState(editing?.name ?? '');
    const [role, setRole] = useState<'subcategory' | 'filter'>(
        editing?.role ?? 'subcategory',
    );
    const [buckets, setBuckets] = useState<Bucket[]>(
        editing
            ? bucketsFromRow(editing)
            : [{ canonical: '', aliasesText: '', aliasesExpanded: false }],
    );
    const [defaultIdx, setDefaultIdx] = useState<number>(
        editing?.defaultValueIndex ?? 0,
    );
    const [sortOrder, setSortOrder] = useState<number>(editing?.sortOrder ?? 0);
    const [description, setDescription] = useState<string>(
        editing?.description ?? '',
    );
    const [localError, setLocalError] = useState<string | null>(null);

    // Keep defaultIdx within range when the user removes a bucket.
    useEffect(() => {
        if (defaultIdx >= buckets.length) {
            setDefaultIdx(Math.max(0, buckets.length - 1));
        }
    }, [buckets.length, defaultIdx]);

    const reservedLower = useMemo(
        () => new Set(reservedParams.map((r) => r.toLowerCase())),
        [reservedParams],
    );
    const normalizedName = useMemo(() => normalizeName(name), [name]);
    const nameCollidesReserved =
        normalizedName.length > 0 && reservedLower.has(normalizedName);

    const setBucket = (idx: number, patch: Partial<Bucket>) => {
        setBuckets((prev) =>
            prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
        );
    };

    const removeBucket = (idx: number) => {
        setBuckets((prev) => prev.filter((_, i) => i !== idx));
    };

    const addBucket = () => {
        setBuckets((prev) => [
            ...prev,
            { canonical: '', aliasesText: '', aliasesExpanded: false },
        ]);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        const cleanName = name.trim();
        if (cleanName.length === 0) {
            setLocalError('Name is required.');
            return;
        }
        if (cleanName.length > 64) {
            setLocalError('Name must be 64 characters or fewer.');
            return;
        }
        if (!/[a-z0-9]/i.test(normalizedName)) {
            setLocalError(
                'Name must contain at least one alphanumeric character.',
            );
            return;
        }
        if (nameCollidesReserved) {
            setLocalError(
                `"${normalizedName}" is reserved. Pick a different name.`,
            );
            return;
        }

        const values = bucketsToValues(buckets);
        if (values.length === 0) {
            setLocalError('Add at least one value bucket.');
            return;
        }

        // Detect aliases that collide after normalization within or across
        // buckets — friendlier than waiting for the backend 400.
        const seen = new Map<string, number>();
        for (let i = 0; i < values.length; i++) {
            for (const v of values[i]) {
                const norm = normalizeName(v);
                if (seen.has(norm)) {
                    setLocalError(
                        `Value "${v}" collides (normalized: "${norm}") with another value.`,
                    );
                    return;
                }
                seen.set(norm, i);
            }
        }

        let resolvedDefault: number | null = null;
        if (role === 'subcategory') {
            if (defaultIdx < 0 || defaultIdx >= values.length) {
                setLocalError('Pick a default value.');
                return;
            }
            resolvedDefault = defaultIdx;
        }

        onSubmit({
            name: cleanName,
            role,
            values,
            defaultValueIndex: resolvedDefault,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
            description: description.trim() || null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="border rounded p-3 mb-3">
            <div className="row g-2">
                <div className="col-md-6">
                    <label htmlFor="var-name" className="form-label small mb-1">
                        Name
                    </label>
                    <input
                        id="var-name"
                        type="text"
                        className={`form-control form-control-sm ${nameCollidesReserved ? 'is-invalid' : ''}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Platform"
                        disabled={isBusy || mode === 'edit'}
                    />
                    <small className="text-muted d-block">
                        URL key:{' '}
                        <code>{normalizedName || '(enter a name)'}</code>
                    </small>
                    {nameCollidesReserved && (
                        <small className="text-danger d-block">
                            Reserved name. Reserved:{' '}
                            <code>{reservedParams.join(', ')}</code>
                        </small>
                    )}
                </div>
                <div className="col-md-3">
                    <label htmlFor="var-sort" className="form-label small mb-1">
                        Sort order
                    </label>
                    <input
                        id="var-sort"
                        type="number"
                        className="form-control form-control-sm"
                        value={sortOrder}
                        onChange={(e) =>
                            setSortOrder(
                                Number.parseInt(e.target.value, 10) || 0,
                            )
                        }
                        disabled={isBusy}
                    />
                </div>
            </div>

            <fieldset className="mt-3" disabled={isBusy || mode === 'edit'}>
                <legend className="form-label small mb-1">Role</legend>
                <div className="form-check">
                    <input
                        id="var-role-sub"
                        type="radio"
                        className="form-check-input"
                        name="var-role"
                        checked={role === 'subcategory'}
                        onChange={() => setRole('subcategory')}
                    />
                    <label className="form-check-label" htmlFor="var-role-sub">
                        <strong>Subcategory</strong> — splits the category into
                        separate boards (e.g. <code>platform</code> with PC vs
                        N64). Always has a default; missing values fall back.
                    </label>
                </div>
                <div className="form-check">
                    <input
                        id="var-role-filter"
                        type="radio"
                        className="form-check-input"
                        name="var-role"
                        checked={role === 'filter'}
                        onChange={() => setRole('filter')}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="var-role-filter"
                    >
                        <strong>Filter</strong> — refines results within a board
                        (e.g. <code>region</code> selectable as US/JP). Optional
                        per run.
                    </label>
                </div>
                {mode === 'edit' && (
                    <small className="text-muted d-block mt-1">
                        Role is locked once a variable exists. To change role,
                        delete and recreate.
                    </small>
                )}
            </fieldset>

            <div className="mt-3">
                <label className="form-label small mb-1">Values</label>
                <div className="d-flex flex-column gap-2">
                    {buckets.map((bucket, idx) => (
                        <div
                            key={idx}
                            className="border rounded p-2 d-flex flex-column gap-1"
                        >
                            <div className="d-flex gap-2 align-items-center">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={bucket.canonical}
                                    onChange={(e) =>
                                        setBucket(idx, {
                                            canonical: e.target.value,
                                        })
                                    }
                                    placeholder="Nintendo 64"
                                    disabled={isBusy}
                                />
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link p-0 text-nowrap"
                                    onClick={() =>
                                        setBucket(idx, {
                                            aliasesExpanded:
                                                !bucket.aliasesExpanded,
                                        })
                                    }
                                    disabled={isBusy}
                                >
                                    {bucket.aliasesExpanded
                                        ? '− aliases'
                                        : '+ aliases'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeBucket(idx)}
                                    disabled={isBusy || buckets.length <= 1}
                                    aria-label="Remove value"
                                >
                                    ×
                                </button>
                            </div>
                            {bucket.aliasesExpanded && (
                                <input
                                    type="text"
                                    className="form-control form-control-sm font-monospace"
                                    value={bucket.aliasesText}
                                    onChange={(e) =>
                                        setBucket(idx, {
                                            aliasesText: e.target.value,
                                        })
                                    }
                                    placeholder="n64, nin64 (comma-separated)"
                                    disabled={isBusy}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary mt-2"
                    onClick={addBucket}
                    disabled={isBusy}
                >
                    + Add value
                </button>
                <small className="text-muted d-block mt-1">
                    The first value in each row is the canonical display.
                    Aliases catch alternate spellings from run submissions.
                </small>
            </div>

            {role === 'subcategory' && (
                <div className="mt-3">
                    <label
                        htmlFor="var-default"
                        className="form-label small mb-1"
                    >
                        Default value
                    </label>
                    <select
                        id="var-default"
                        className="form-select form-select-sm"
                        value={defaultIdx}
                        onChange={(e) =>
                            setDefaultIdx(
                                Number.parseInt(e.target.value, 10) || 0,
                            )
                        }
                        disabled={isBusy}
                    >
                        {buckets.map((b, idx) => (
                            <option key={idx} value={idx}>
                                {b.canonical.trim() || `(value ${idx + 1})`}
                            </option>
                        ))}
                    </select>
                    <small className="text-muted">
                        Used when a run doesn't specify this variable.
                    </small>
                </div>
            )}

            <div className="mt-3">
                <label
                    htmlFor="var-description"
                    className="form-label small mb-1"
                >
                    Description (optional)
                </label>
                <textarea
                    id="var-description"
                    className="form-control form-control-sm"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mod-facing note. Not shown to runners."
                    disabled={isBusy}
                />
            </div>

            {(localError || error) && (
                <div className="alert alert-danger py-2 mb-2 mt-2" role="alert">
                    {localError ?? error}
                </div>
            )}

            <div className="d-flex gap-2 justify-content-end mt-3">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onCancel}
                    disabled={isBusy}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={isBusy}
                >
                    {isBusy
                        ? 'Saving…'
                        : mode === 'create'
                          ? 'Create variable'
                          : 'Save changes'}
                </button>
            </div>
        </form>
    );
}
