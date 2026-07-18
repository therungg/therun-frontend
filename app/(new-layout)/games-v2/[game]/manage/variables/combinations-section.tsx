'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { loadCombinationsAction } from './actions/load-combinations.action';
import { saveCombinationsAction } from './actions/save-combinations.action';

interface Props {
    gameSlug: string;
    gameId: number;
    selectedCategory: ResolvedCategory | null;
}

interface Combo {
    subcategoryKey: string;
    valid: boolean;
}

function parseKey(key: string): { name: string; value: string }[] {
    if (!key) return [];
    return key.split('|').map((pair) => {
        const eq = pair.indexOf('=');
        return eq < 0
            ? { name: pair, value: '' }
            : { name: pair.slice(0, eq), value: pair.slice(eq + 1) };
    });
}

export function CombinationsSection({
    gameSlug,
    gameId,
    selectedCategory,
}: Props) {
    const [combos, setCombos] = useState<Combo[]>([]);
    const [mode, setMode] = useState<'open' | 'managed'>('open');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pristine, setPristine] = useState(true);
    const [isLoading, startLoadTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();
    const busy = isLoading || isSaving;
    const categoryId = selectedCategory?.id ?? null;

    const refresh = async () => {
        const res = await loadCombinationsAction({
            gameSlug,
            gameId,
            categoryId,
        });
        if ('error' in res) {
            setLoadError(res.error);
            setCombos([]);
            setMode('open');
        } else {
            setLoadError(null);
            setCombos(res.result.combinations);
            setMode(res.result.mode);
        }
        setPristine(true);
    };

    useEffect(() => {
        startLoadTransition(() => refresh());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, categoryId]);

    const toggle = (idx: number) => {
        setCombos((prev) =>
            prev.map((c, i) => (i === idx ? { ...c, valid: !c.valid } : c)),
        );
        setPristine(false);
    };

    const setAll = (valid: boolean) => {
        setCombos((prev) => prev.map((c) => ({ ...c, valid })));
        setPristine(false);
    };

    const handleSave = () => {
        startSaveTransition(async () => {
            const res = await saveCombinationsAction({
                gameSlug,
                gameId,
                categoryId,
                subcategoryKeys: combos
                    .filter((c) => c.valid)
                    .map((c) => c.subcategoryKey),
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Valid combinations saved');
            await refresh();
        });
    };

    const validCount = combos.filter((c) => c.valid).length;

    const firstParts = useMemo(
        () => parseKey(combos[0]?.subcategoryKey ?? ''),
        [combos],
    );

    return (
        <section className="border rounded p-3 mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h2 className="h5 mb-1">Sub-boards</h2>
                    <p className="text-muted small mb-0">
                        {mode === 'open' ? (
                            <>
                                <span className="badge text-bg-secondary me-1">
                                    Open
                                </span>
                                — runners can submit any combination. Every
                                combination is a real leaderboard; mark rows
                                invalid below to switch to managed mode.
                            </>
                        ) : (
                            <>
                                <span className="badge text-bg-primary me-1">
                                    Managed
                                </span>
                                — only listed sub-boards are valid leaderboards.
                                Runs in unchecked combos keep their stale key
                                until a re-resolve runs.
                            </>
                        )}
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setAll(true)}
                        disabled={busy || combos.length === 0}
                    >
                        Check all
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setAll(false)}
                        disabled={busy || combos.length === 0}
                    >
                        Uncheck all
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleSave}
                        disabled={busy || pristine}
                    >
                        {isSaving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="alert alert-danger py-2" role="alert">
                    {loadError}
                </div>
            )}

            {combos.length === 0 ? (
                <p className="text-muted">
                    No subcategory variables in scope — no combinations to
                    manage.
                </p>
            ) : (
                <>
                    <div className="d-flex justify-content-between mb-2 small text-muted">
                        <span>
                            {validCount} valid of {combos.length}
                        </span>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-sm align-middle">
                            <thead>
                                <tr>
                                    <th />
                                    {firstParts.map((p) => (
                                        <th key={p.name}>{p.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {combos.map((c, idx) => {
                                    const parts = parseKey(c.subcategoryKey);
                                    return (
                                        <tr
                                            key={c.subcategoryKey}
                                            className={
                                                c.valid
                                                    ? undefined
                                                    : 'text-muted'
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={c.valid}
                                                    onChange={() => toggle(idx)}
                                                    disabled={busy}
                                                />
                                            </td>
                                            {parts.map((p) => (
                                                <td key={p.name}>{p.value}</td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}
