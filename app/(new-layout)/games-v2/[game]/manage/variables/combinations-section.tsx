'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import { normalizeVariableName } from '~src/lib/variables/effective';
import { parseSubcategoryKey } from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import kit from '../shared/form-kit.module.scss';
import { loadCombinationsAction } from './actions/load-combinations.action';
import { saveCombinationsAction } from './actions/save-combinations.action';

interface Props {
    gameSlug: string;
    gameId: number;
    selectedCategory: ResolvedCategory | null;
    /** The category's merged variable list — maps the normalized values the
     *  keys are built from back to display names ("nintendo64" → "Nintendo
     *  64"), so the table reads like the board instead of like keys. */
    variables?: VariableRow[];
}

interface Combo {
    subcategoryKey: string;
    valid: boolean;
    entryCount: number;
}

/**
 * Renders as a SUBSECTION of the variables section (it is the consequence of
 * the subcategory variables directly above it), not as its own top-level
 * FormSection — one story: "one board, or several, and which are open".
 */
export function CombinationsSection({
    gameSlug,
    gameId,
    selectedCategory,
    variables = [],
}: Props) {
    const [combos, setCombos] = useState<Combo[]>([]);
    const [original, setOriginal] = useState<Combo[]>([]);
    const [mode, setMode] = useState<'open' | 'managed'>('open');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();
    const busy = isLoading || isSaving;
    const categoryId = selectedCategory?.id ?? null;
    // A null category means the backend sums entryCount across every
    // category sharing a subcategory key (and doesn't exclude categories
    // that override the variable) — not this board's count. Only render
    // counts when a real category is selected.
    const showCounts = selectedCategory != null;

    const refresh = async () => {
        const res = await loadCombinationsAction({
            gameSlug,
            gameId,
            categoryId,
        });
        if ('error' in res) {
            setLoadError(res.error);
            setCombos([]);
            setOriginal([]);
            setMode('open');
        } else {
            setLoadError(null);
            setCombos(res.result.combinations);
            setOriginal(res.result.combinations);
            setMode(res.result.mode);
        }
    };

    useEffect(() => {
        startLoadTransition(() => refresh());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, categoryId]);

    const pristine =
        combos.length === original.length &&
        combos.every((c, i) => c.valid === original[i]?.valid);

    const toggle = (idx: number) => {
        setCombos((prev) =>
            prev.map((c, i) => (i === idx ? { ...c, valid: !c.valid } : c)),
        );
    };

    const setAll = (valid: boolean) => {
        setCombos((prev) => prev.map((c) => ({ ...c, valid })));
    };

    const handleReset = () => {
        setCombos(original);
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

    // Keys carry normalized names/values; the board shows display names. Map
    // back through the variable list so the table reads like the board.
    const variableByParam = new Map(
        variables.map((v) => [v.nameNormalized, v]),
    );
    const displayName = (param: string): string =>
        variableByParam.get(param)?.name ?? param;
    const displayValue = (param: string, value: string): string => {
        const v = variableByParam.get(param);
        if (!v) return value;
        const bucket = v.values.find((b) =>
            b.some((alias) => normalizeVariableName(alias) === value),
        );
        return bucket?.[0] ?? value;
    };

    const firstParts = parseSubcategoryKey(combos[0]?.subcategoryKey ?? '');

    // Nothing to render at all when the category has no subcategory
    // variables — the band preview above already says "single board", so an
    // empty table section would just restate it.
    if (!isLoading && !loadError && combos.length === 0) {
        return null;
    }

    return (
        // id: legacy /manage/category/<id>#combinations deep links (from the
        // retired pane era) still land here now that Sub-boards is a
        // subsection of the variables section rather than its own section.
        <div className="mb-3" id="combinations">
            <div className="d-flex align-items-center justify-content-between mb-1">
                <h3 className="h6 mb-0">{CONCEPT_LABEL.combinations}</h3>
                <div className="d-flex gap-2">
                    {mode === 'managed' && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setAll(true)}
                            disabled={busy || combos.length === 0}
                        >
                            Open every board
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setAll(false)}
                        disabled={busy || combos.length === 0}
                    >
                        Uncheck all
                    </button>
                </div>
            </div>
            {/* Never assert a mode we failed to load. `mode` defaults to
                'open' and `combos` to [], so on a load error the old copy
                read "0 combinations, all live boards" — stating as fact
                something the request never told us. */}
            <p className="text-muted small mb-2">
                {loadError
                    ? 'Couldn’t load this category’s sub-boards.'
                    : isLoading
                      ? 'Loading sub-boards…'
                      : mode === 'open'
                        ? `The subcategories above produce ${combos.length} boards; runners can submit to any of them. Untick one to close it.`
                        : `${validCount} of ${combos.length} boards are open to runners. Runs on a closed board keep their spot until the next rebuild, then move to the default board.`}
            </p>

            {loadError && (
                <div className="alert alert-danger py-2" role="alert">
                    {loadError}
                    <div className="small mb-0 mt-1">
                        Sub-boards couldn’t be loaded, so this list is empty for
                        a reason we don’t know. Retry once the error clears.
                    </div>
                </div>
            )}

            {combos.length > 0 && (
                <>
                    <div className="table-responsive">
                        <table className="table table-sm align-middle">
                            <thead>
                                <tr>
                                    <th>
                                        <span className="visually-hidden">
                                            Open
                                        </span>
                                    </th>
                                    {showCounts && <th>Runs</th>}
                                    {firstParts.map((p) => (
                                        <th key={p.name}>
                                            {displayName(p.name)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {combos.map((c, idx) => {
                                    const parts = parseSubcategoryKey(
                                        c.subcategoryKey,
                                    );
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
                                                    aria-label={`Open ${parts
                                                        .map((p) =>
                                                            displayValue(
                                                                p.name,
                                                                p.value,
                                                            ),
                                                        )
                                                        .join(' · ')}`}
                                                    checked={c.valid}
                                                    onChange={() => toggle(idx)}
                                                    disabled={busy}
                                                />
                                            </td>
                                            {showCounts && (
                                                <td className="text-muted small">
                                                    {c.entryCount.toLocaleString()}
                                                </td>
                                            )}
                                            {parts.map((p) => (
                                                <td key={p.name}>
                                                    {displayValue(
                                                        p.name,
                                                        p.value,
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {showCounts &&
                        (() => {
                            const stranded = combos
                                .filter(
                                    (c, i) =>
                                        !c.valid &&
                                        original[i]?.valid &&
                                        c.entryCount > 0,
                                )
                                .reduce((sum, c) => sum + c.entryCount, 0);
                            return stranded > 0 ? (
                                <p className="text-warning small mb-2">
                                    {stranded.toLocaleString()} run
                                    {stranded === 1 ? '' : 's'} sit on boards
                                    you are closing. They move to the default
                                    board on the next rebuild.
                                </p>
                            ) : null;
                        })()}
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className={kit.saveBtn}
                            onClick={handleSave}
                            disabled={busy || pristine}
                        >
                            {isSaving ? 'Saving…' : 'Save sub-boards'}
                        </button>
                        <button
                            type="button"
                            className={kit.resetBtn}
                            onClick={handleReset}
                            disabled={busy || pristine}
                        >
                            Reset
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
