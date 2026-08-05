'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    normalizeVariableName,
    parseSubcategoryKey,
} from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import { loadCombinationsAction } from '../../../manage/variables/actions/load-combinations.action';
import { saveCombinationsAction } from '../../../manage/variables/actions/save-combinations.action';
import styles from './matrix.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory;
    /** This category's rows, for turning stored keys back into board words. */
    variables: VariableRow[];
}

interface Combo {
    subcategoryKey: string;
    valid: boolean;
    entryCount: number;
}

/**
 * The leaderboards this category actually ends up with, and which of them are
 * open to runners.
 *
 * Subcategories multiply: three options × two options is six leaderboards, and
 * most boards never want all six. This is the only view where that number is
 * visible next to the thing that caused it — the grid one zone down says how
 * many, this says *which*, and lets a dead combination be closed.
 *
 * Deliberately a pane on the category row rather than a section of a group:
 * the product spans every subcategory group the category carries, so it
 * belongs to the category, not to any one of them.
 */
export function LeaderboardsPanel({
    gameSlug,
    gameId,
    category,
    variables,
}: Props) {
    const [combos, setCombos] = useState<Combo[]>([]);
    const [original, setOriginal] = useState<Combo[]>([]);
    const [mode, setMode] = useState<'open' | 'managed'>('open');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, startLoad] = useTransition();
    const [isSaving, startSave] = useTransition();
    const busy = isLoading || isSaving;

    const refresh = async () => {
        const res = await loadCombinationsAction({
            gameSlug,
            gameId,
            categoryId: category.id,
        });
        if ('error' in res) {
            setError(res.error);
            setCombos([]);
            setOriginal([]);
            return;
        }
        setError(null);
        setCombos(res.result.combinations);
        setOriginal(res.result.combinations);
        setMode(res.result.mode);
    };

    useEffect(() => {
        startLoad(() => refresh());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, category.id]);

    const dirty = combos.some((c, i) => c.valid !== original[i]?.valid);
    const openCount = combos.filter((c) => c.valid).length;

    const save = () => {
        startSave(async () => {
            const res = await saveCombinationsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                subcategoryKeys: combos
                    .filter((c) => c.valid)
                    .map((c) => c.subcategoryKey),
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(`Leaderboards saved for ${category.display}.`);
            await refresh();
        });
    };

    // Stored keys carry normalized names; the board shows display names.
    const byParam = new Map(variables.map((v) => [v.nameNormalized, v]));
    const valueLabel = (param: string, value: string): string => {
        const v = byParam.get(param);
        if (!v) return value;
        const bucket = v.values.find((b) =>
            b.some((alias) => normalizeVariableName(alias) === value),
        );
        return bucket?.[0] ?? value;
    };
    const comboLabel = (key: string): string =>
        parseSubcategoryKey(key)
            .map((p) => valueLabel(p.name, p.value))
            .join(' · ');

    return (
        <div className={styles.panePad}>
            <p className={styles.paneNote}>
                {error
                    ? 'Could not load this category’s leaderboards.'
                    : isLoading
                      ? 'Loading…'
                      : combos.length === 0
                        ? 'One leaderboard. Add a subcategory group below to split it.'
                        : mode === 'open'
                          ? `${combos.length} leaderboards, all open to runners. Untick one to close it.`
                          : `${openCount} of ${combos.length} open. Runs on a closed leaderboard keep their place until the next rebuild, then move to the default.`}
            </p>

            {error && <p className={styles.paneError}>{error}</p>}

            {combos.length > 0 && (
                <>
                    <ul className={styles.boardList}>
                        {combos.map((c, idx) => (
                            <li key={c.subcategoryKey}>
                                <label className={styles.boardItem}>
                                    <input
                                        type="checkbox"
                                        checked={c.valid}
                                        disabled={busy}
                                        onChange={() =>
                                            setCombos((prev) =>
                                                prev.map((p, i) =>
                                                    i === idx
                                                        ? {
                                                              ...p,
                                                              valid: !p.valid,
                                                          }
                                                        : p,
                                                ),
                                            )
                                        }
                                    />
                                    <span
                                        className={
                                            c.valid
                                                ? styles.boardName
                                                : styles.boardClosed
                                        }
                                    >
                                        {category.display} ·{' '}
                                        {comboLabel(c.subcategoryKey)}
                                    </span>
                                    {/* An empty leaderboard nobody has ever
                                        run is the one safe to close, so the
                                        count sits next to the tick. */}
                                    <span className={styles.boardCount}>
                                        {c.entryCount === 0
                                            ? 'no runs'
                                            : `${c.entryCount} runs`}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>

                    <div className={styles.rulesFoot}>
                        <span className={styles.rulesActions}>
                            <button
                                type="button"
                                className={styles.rulesChip}
                                disabled={busy || !dirty}
                                onClick={() => setCombos(original)}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                className={styles.rulesChip}
                                disabled={busy || !dirty}
                                onClick={save}
                            >
                                {isSaving ? 'Saving…' : 'Save'}
                            </button>
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
