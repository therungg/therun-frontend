'use client';

import { FormEvent, useEffect, useState } from 'react';
import { timeToMillis } from '~src/components/util/datetime';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';

export type FormSubmitValues = {
    subcategoryHash: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
};

interface Props {
    mode: 'create' | 'edit';
    editing: MinimumTime | null;
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

export function MinimumForm({
    mode,
    editing,
    onSubmit,
    onCancel,
    isBusy,
    error,
}: Props) {
    const [subcategoryHash, setSubcategoryHash] = useState('');
    const [rtInput, setRtInput] = useState('');
    const [gtInput, setGtInput] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (mode === 'edit' && editing) {
            setSubcategoryHash(editing.subcategoryHash);
            setRtInput(msToInput(editing.minTimeMs));
            setGtInput(msToInput(editing.minGameTimeMs));
        } else {
            setSubcategoryHash('');
            setRtInput('');
            setGtInput('');
        }
        setLocalError(null);
    }, [mode, editing]);

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

        onSubmit({ subcategoryHash, minTimeMs: rt, minGameTimeMs: gt });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="border rounded p-3 mb-3 bg-light-subtle"
        >
            <h3 className="h6 mb-3">
                {mode === 'create' ? 'Add minimum' : 'Edit minimum'}
            </h3>

            <div className="row g-2">
                <div className="col-md-4">
                    <label className="form-label small">Subcategory hash</label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={subcategoryHash}
                        onChange={(e) => setSubcategoryHash(e.target.value)}
                        placeholder="(empty = default)"
                        disabled={mode === 'edit' || isBusy}
                    />
                </div>
                <div className="col-md-3">
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
                <div className="col-md-3">
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
                <div className="col-md-2 d-flex align-items-end gap-2">
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
