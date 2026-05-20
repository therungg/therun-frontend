'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { timeToMillis } from '~src/components/util/datetime';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type { VariableDef } from '../../../../../../types/leaderboards.types';

export type FormSubmitValues = {
    subcategoryKey: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
};

interface Props {
    mode: 'create' | 'edit';
    editing: MinimumTime | null;
    variables: VariableDef[];
    onSubmit: (values: FormSubmitValues) => void;
    onCancel: () => void;
    isBusy: boolean;
    error: string | null;
}

function msToInput(ms: number | null): string {
    if (ms === null) return '';
    const totalMs = Math.max(0, Math.round(ms));
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    const pad = (n: number, w: number) => String(n).padStart(w, '0');
    return millis === 0
        ? `${pad(minutes, 2)}:${pad(seconds, 2)}`
        : `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(millis, 3)}`;
}

function parseKey(key: string): Record<string, string> {
    if (!key) return {};
    const out: Record<string, string> = {};
    for (const pair of key.split('|')) {
        const eq = pair.indexOf('=');
        if (eq < 0) continue;
        out[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
    return out;
}

function buildKey(selections: Record<string, string>): string {
    const entries = Object.entries(selections).filter(([, v]) => v !== '');
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${k}=${v}`).join('|');
}

export function MinimumForm({
    mode,
    editing,
    variables,
    onSubmit,
    onCancel,
    isBusy,
    error,
}: Props) {
    const subcatVars = useMemo(
        () => variables.filter((v) => v.role === 'subcategory'),
        [variables],
    );
    const [manual, setManual] = useState(false);
    const [manualKey, setManualKey] = useState('');
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [rtInput, setRtInput] = useState('');
    const [gtInput, setGtInput] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (mode === 'edit' && editing) {
            setManualKey(editing.subcategoryKey);
            setSelections(parseKey(editing.subcategoryKey));
            setRtInput(msToInput(editing.minTimeMs));
            setGtInput(msToInput(editing.minGameTimeMs));
        } else {
            const seeded: Record<string, string> = {};
            for (const v of subcatVars) {
                if (v.defaultValueIndex != null) {
                    const canonical = v.values[v.defaultValueIndex]?.[0] ?? '';
                    if (canonical) seeded[v.nameNormalized] = canonical;
                }
            }
            setSelections(seeded);
            setManualKey('');
            setRtInput('');
            setGtInput('');
        }
        setManual(false);
        setLocalError(null);
    }, [mode, editing, subcatVars]);

    const effectiveKey = manual ? manualKey.trim() : buildKey(selections);

    const parse = (s: string): number | null => {
        const trimmed = s.trim();
        if (trimmed === '') return null;
        const ms = timeToMillis(trimmed);
        if (!Number.isFinite(ms) || ms <= 0) return Number.NaN;
        return ms;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        const rt = parse(rtInput);
        const gt = parse(gtInput);

        if (Number.isNaN(rt) || Number.isNaN(gt)) {
            setLocalError(
                'Times must be in m:ss or m:ss.SSS format and greater than zero.',
            );
            return;
        }
        if (rt === null && gt === null) {
            setLocalError('At least one of RT or GT minimum is required.');
            return;
        }

        onSubmit({
            subcategoryKey: effectiveKey,
            minTimeMs: rt,
            minGameTimeMs: gt,
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="border rounded p-3 mb-3 bg-light-subtle"
        >
            <div className="d-flex align-items-baseline justify-content-between mb-2">
                <h3 className="h6 mb-0">
                    {mode === 'create' ? 'Add minimum' : 'Edit minimum'}
                </h3>
                <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => {
                        if (!manual) setManualKey(buildKey(selections));
                        else setSelections(parseKey(manualKey));
                        setManual((m) => !m);
                    }}
                    disabled={isBusy || mode === 'edit'}
                >
                    {manual ? 'Pick from variables' : 'Manual entry'}
                </button>
            </div>

            {manual ? (
                <div className="mb-3">
                    <label className="form-label small">Subcategory key</label>
                    <input
                        type="text"
                        className="form-control form-control-sm font-monospace"
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value)}
                        placeholder='(empty = default — e.g. "platform=n64|region=us")'
                        disabled={mode === 'edit' || isBusy}
                    />
                </div>
            ) : (
                <div className="row g-2 mb-3">
                    {subcatVars.length === 0 ? (
                        <p className="text-muted small mb-0">
                            This category has no subcategory variables — the
                            minimum applies to the default board.
                        </p>
                    ) : (
                        subcatVars.map((v) => (
                            <div key={v.nameNormalized} className="col-md-4">
                                <label className="form-label small">
                                    {v.name}
                                </label>
                                <select
                                    className="form-select form-select-sm"
                                    value={selections[v.nameNormalized] ?? ''}
                                    onChange={(e) =>
                                        setSelections((prev) => ({
                                            ...prev,
                                            [v.nameNormalized]: e.target.value,
                                        }))
                                    }
                                    disabled={mode === 'edit' || isBusy}
                                >
                                    <option value="">(any)</option>
                                    {v.values.map((bucket, idx) => (
                                        <option key={idx} value={bucket[0]}>
                                            {bucket[0]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))
                    )}
                </div>
            )}

            <small className="text-muted d-block mb-3">
                Resulting key: <code>{effectiveKey || '(default board)'}</code>
            </small>

            <div className="row g-2">
                <div className="col-md-4">
                    <label className="form-label small">
                        Min RT (m:ss.SSS)
                    </label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={rtInput}
                        onChange={(e) => setRtInput(e.target.value)}
                        placeholder="e.g. 0:30"
                        disabled={isBusy}
                    />
                </div>
                <div className="col-md-4">
                    <label className="form-label small">
                        Min GT (m:ss.SSS)
                    </label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={gtInput}
                        onChange={(e) => setGtInput(e.target.value)}
                        placeholder="(optional)"
                        disabled={isBusy}
                    />
                </div>
                <div className="col-md-4 d-flex align-items-end gap-2">
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={isBusy}
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onCancel}
                        disabled={isBusy}
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {(localError || error) && (
                <div className="alert alert-danger mt-2 mb-0 py-2">
                    {localError ?? error}
                </div>
            )}
        </form>
    );
}
