'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { slugifyVariableKey } from '~src/lib/variables/keys';
import {
    capitalize,
    ROLE_LABEL,
    roleConsequence,
} from '~src/lib/variables/language';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import { InlineError, SegmentedControl } from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import styles from './variables.module.scss';

export interface VariableFormValues {
    name: string;
    /** The URL/storage key, slugged from the name but independently editable. */
    nameNormalized: string;
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
    /** Scope captured when the form opened, e.g. "Any% only". Printed in the header. */
    scopeLabel: string;
    categoryDisplay: string;
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
    scopeLabel,
    categoryDisplay,
    onSubmit,
    onCancel,
    isBusy,
    error,
}: Props) {
    const [name, setName] = useState(editing?.name ?? '');
    // The key (web address) auto-follows the name via slug until the moderator
    // edits it directly; after that it stays put. In edit mode it is locked to
    // the row's existing identity (like the name), so it never auto-follows.
    const [key, setKey] = useState(editing?.nameNormalized ?? '');
    const [keyTouched, setKeyTouched] = useState(mode === 'edit');
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

    // Auto-suggest the key from the name until the moderator takes it over.
    useEffect(() => {
        if (!keyTouched) setKey(slugifyVariableKey(name));
    }, [name, keyTouched]);

    const reservedLower = useMemo(
        () => new Set(reservedParams.map((r) => r.toLowerCase())),
        [reservedParams],
    );
    // The stored key is the slug of whatever is in the key field.
    const normalizedKey = useMemo(() => slugifyVariableKey(key), [key]);
    const keyCollidesReserved =
        normalizedKey.length > 0 && reservedLower.has(normalizedKey);

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
        if (!normalizedKey) {
            setLocalError('Key must contain at least one letter or number.');
            return;
        }
        if (keyCollidesReserved) {
            setLocalError(
                `"${normalizedKey}" is reserved — pick a different key.`,
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
            nameNormalized: normalizedKey,
            role,
            values,
            defaultValueIndex: resolvedDefault,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
            description: description.trim() || null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="border rounded p-3 mb-3">
            <p className={styles.formScope}>
                {mode === 'create'
                    ? `New variable — ${scopeLabel}`
                    : `Editing ${editing?.name} — ${scopeLabel}`}
            </p>

            <div className="row g-2">
                <div className="col-md-6">
                    <label htmlFor="var-name" className="form-label small mb-1">
                        Display name
                    </label>
                    <input
                        id="var-name"
                        type="text"
                        className="form-control form-control-sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Solo or Co-op?"
                        disabled={isBusy || mode === 'edit'}
                    />
                    <small className="text-muted d-block">
                        Shown to runners. Can be anything.
                    </small>
                </div>
                <div className="col-md-6">
                    <label htmlFor="var-key" className="form-label small mb-1">
                        Key (web address)
                    </label>
                    <input
                        id="var-key"
                        type="text"
                        className={`form-control form-control-sm font-monospace ${keyCollidesReserved ? 'is-invalid' : ''}`}
                        value={key}
                        onChange={(e) => {
                            setKeyTouched(true);
                            setKey(e.target.value);
                        }}
                        onBlur={() => setKey(normalizedKey)}
                        placeholder="coop"
                        disabled={isBusy || mode === 'edit'}
                    />
                    <small className="text-muted d-block">
                        Used in the URL: <code>?{normalizedKey || '…'}=…</code>
                        {mode === 'create' && (
                            <>
                                {' '}
                                Auto-filled from the name — edit for a cleaner
                                address. Can’t change later.
                            </>
                        )}
                    </small>
                    {keyCollidesReserved && (
                        <small className="text-danger d-block">
                            "{normalizedKey}" is reserved — pick a different
                            key.
                        </small>
                    )}
                </div>
            </div>

            <div className="mt-3">
                <SegmentedControl
                    label="Role"
                    value={role}
                    options={[
                        {
                            value: 'subcategory',
                            label: capitalize(ROLE_LABEL.subcategory),
                        },
                        {
                            value: 'filter',
                            label: capitalize(ROLE_LABEL.filter),
                        },
                    ]}
                    onChange={(v) => setRole(v as 'subcategory' | 'filter')}
                    disabled={isBusy || mode === 'edit'}
                />
                <ul className="list-unstyled small text-muted mt-2 mb-0">
                    <li>
                        <strong>{capitalize(ROLE_LABEL.subcategory)}</strong>{' '}
                        (subcategory) — each answer gets its own board (e.g.{' '}
                        <code>platform</code> with PC vs N64). Always has a
                        default; missing values fall back.
                    </li>
                    <li className="mt-1">
                        <strong>{capitalize(ROLE_LABEL.filter)}</strong>{' '}
                        (filter) — refines results within a board (e.g.{' '}
                        <code>region</code> selectable as US/JP). Optional per
                        run.
                    </li>
                </ul>
                <small className="text-muted d-block mt-1">
                    {mode === 'edit'
                        ? 'This can’t be changed. To switch, delete the variable and make a new one.'
                        : 'Choose carefully — this can’t be changed later without deleting the variable and making a new one.'}
                </small>
            </div>

            <p className={styles.roleConsequence}>
                {roleConsequence({
                    role,
                    variableName: name.trim() || 'this variable',
                    categoryDisplay,
                    valueCount: bucketsToValues(buckets).length,
                })}
            </p>

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
                                        ? '− also accept'
                                        : '+ also accept'}
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
                        Used when a run doesn't say
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
                        Runs that don't specify {name.trim() || 'this variable'}{' '}
                        land on this board.
                    </small>
                </div>
            )}

            <details className={styles.more}>
                <summary>More</summary>
                <div className="mt-3">
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
            </details>

            <InlineError>{localError ?? error}</InlineError>

            <div className="d-flex gap-2 justify-content-end mt-3">
                <button
                    type="button"
                    className={kit.resetBtn}
                    onClick={onCancel}
                    disabled={isBusy}
                >
                    Cancel
                </button>
                <button type="submit" className={kit.saveBtn} disabled={isBusy}>
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
