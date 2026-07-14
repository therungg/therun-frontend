'use client';

import { useState, useTransition } from 'react';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import { updateTimingSettingsAction } from '../../manage/timing/actions/update-timing-settings.action';
import type { StepProps } from '../types';

interface RowState {
    id: number;
    display: string;
    primaryTiming: PrimaryTiming;
    hideRealTime: boolean;
    hideGameTime: boolean;
    showMilliseconds: boolean;
    error: string | null;
}

function toPrimaryTiming(short: 'rt' | 'gt'): PrimaryTiming {
    return short === 'gt' ? 'gametime' : 'realtime';
}

export function StepTiming({ data, onAdvance }: StepProps) {
    const activeCategories = data.categories.filter((c) => c.active);
    const [rows, setRows] = useState<RowState[]>(
        activeCategories.map((c) => ({
            id: c.id,
            display: c.display,
            primaryTiming: toPrimaryTiming(c.primaryTiming),
            hideRealTime: c.hideRealTime ?? false,
            hideGameTime: c.hideGameTime ?? false,
            showMilliseconds: c.showMilliseconds ?? true,
            error: null,
        })),
    );
    const [isSaving, startSaving] = useTransition();
    const [progress, setProgress] = useState<string | null>(null);

    const rtCount = activeCategories.filter(
        (c) => c.primaryTiming === 'rt',
    ).length;

    const setAll = (patch: Partial<Omit<RowState, 'id' | 'display'>>) =>
        setRows((rs) => rs.map((r) => ({ ...r, ...patch })));

    const setRow = (
        id: number,
        patch: Partial<Omit<RowState, 'id' | 'display'>>,
    ) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

    const invalid = rows.filter((r) => r.hideRealTime && r.hideGameTime);

    const save = () => {
        startSaving(async () => {
            const changed = rows.filter((r) => {
                const orig = activeCategories.find((c) => c.id === r.id);
                return (
                    orig &&
                    (toPrimaryTiming(orig.primaryTiming) !== r.primaryTiming ||
                        (orig.hideRealTime ?? false) !== r.hideRealTime ||
                        (orig.hideGameTime ?? false) !== r.hideGameTime ||
                        (orig.showMilliseconds ?? true) !== r.showMilliseconds)
                );
            });
            let failures = 0;
            for (let i = 0; i < changed.length; i++) {
                const r = changed[i];
                setProgress(`Saving ${i + 1} / ${changed.length}…`);
                const timingRes = await updateTimingSettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: r.id,
                    primaryTiming: r.primaryTiming,
                    hideRealTime: r.hideRealTime,
                    hideGameTime: r.hideGameTime,
                });
                const msRes = await updateCategorySettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: r.id,
                    showMilliseconds: r.showMilliseconds,
                });
                if ('error' in timingRes || 'error' in msRes) {
                    failures++;
                    const msg =
                        ('error' in timingRes && timingRes.error) ||
                        ('error' in msRes && msRes.error) ||
                        'Save failed';
                    setRow(r.id, { error: msg });
                }
            }
            setProgress(null);
            if (failures === 0) onAdvance();
        });
    };

    return (
        <section>
            <h2 className="h4">Timing</h2>
            <div className="alert alert-info py-2">
                {rtCount} of {activeCategories.length} active categories default
                to real time from ingestion. Change only what your community
                actually ranks differently.
            </div>
            <table className="table align-middle">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>
                            Primary
                            <select
                                className="form-select form-select-sm mt-1"
                                onChange={(e) =>
                                    setAll({
                                        primaryTiming: e.target
                                            .value as PrimaryTiming,
                                    })
                                }
                                defaultValue=""
                            >
                                <option value="" disabled>
                                    set all…
                                </option>
                                <option value="realtime">RTA</option>
                                <option value="gametime">IGT</option>
                            </select>
                        </th>
                        <th>Show RT</th>
                        <th>Show IGT</th>
                        <th>Milliseconds</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <td>
                                {r.display}
                                {r.error && (
                                    <div className="text-danger small">
                                        {r.error}
                                    </div>
                                )}
                            </td>
                            <td>
                                <select
                                    className="form-select form-select-sm"
                                    value={r.primaryTiming}
                                    onChange={(e) =>
                                        setRow(r.id, {
                                            primaryTiming: e.target
                                                .value as PrimaryTiming,
                                        })
                                    }
                                >
                                    <option value="realtime">RTA</option>
                                    <option value="gametime">IGT</option>
                                </select>
                            </td>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={!r.hideRealTime}
                                    onChange={(e) =>
                                        setRow(r.id, {
                                            hideRealTime: !e.target.checked,
                                        })
                                    }
                                />
                            </td>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={!r.hideGameTime}
                                    onChange={(e) =>
                                        setRow(r.id, {
                                            hideGameTime: !e.target.checked,
                                        })
                                    }
                                />
                            </td>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={r.showMilliseconds}
                                    onChange={(e) =>
                                        setRow(r.id, {
                                            showMilliseconds: e.target.checked,
                                        })
                                    }
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {invalid.length > 0 && (
                <div className="alert alert-danger py-2">
                    A category can’t hide both RT and IGT:{' '}
                    {invalid.map((r) => r.display).join(', ')}
                </div>
            )}
            <button
                type="button"
                className="btn btn-primary"
                disabled={isSaving || invalid.length > 0}
                onClick={save}
            >
                {isSaving ? (progress ?? 'Saving…') : 'Save & continue'}
            </button>
        </section>
    );
}
