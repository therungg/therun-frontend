'use client';

import { useState, useTransition } from 'react';
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
import styles from './variables-grid.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    /** Only the categories carrying two or more subcategory groups. */
    categories: ResolvedCategory[];
    variables: VariableRow[];
}

interface Combo {
    subcategoryKey: string;
    valid: boolean;
    entryCount: number;
}

/**
 * Which combinations of two or more subcategory groups actually exist.
 *
 * This lives at the foot of the Subcategories section rather than on a
 * category row, because it is the *consequence* of the grids above it and
 * belongs beside its cause. It renders only for categories with two or more
 * groups: with one group every leaderboard is one option, so the grid already
 * says everything, and a second surface saying it again is what made the
 * earlier row-level version redundant.
 *
 * Each category loads lazily on expand — a board with ten multi-group
 * categories would otherwise fire ten requests to render a collapsed list.
 */
export function CombinationsBlock({
    gameSlug,
    gameId,
    categories,
    variables,
}: Props) {
    if (categories.length === 0) return null;

    return (
        <div className={styles.combos}>
            <div className={styles.combosHead}>
                <span className={styles.combosTitle}>
                    Which combinations exist
                </span>
                <span className={styles.zoneCount}>
                    {categories.length}{' '}
                    {categories.length === 1 ? 'category' : 'categories'} with
                    more than one group
                </span>
            </div>
            <p className={styles.zoneBlurb}>
                Two groups multiply. Untick a combination runners should never
                see — a pairing that does not exist in the game cannot be
                removed by dropping an option, because both options are real on
                their own.
            </p>

            {categories.map((c) => (
                <CategoryCombos
                    key={c.id}
                    gameSlug={gameSlug}
                    gameId={gameId}
                    category={c}
                    variables={variables.filter((v) => v.categoryId === c.id)}
                />
            ))}
        </div>
    );
}

function CategoryCombos({
    gameSlug,
    gameId,
    category,
    variables,
}: {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory;
    variables: VariableRow[];
}) {
    const [open, setOpen] = useState(false);
    const [combos, setCombos] = useState<Combo[] | null>(null);
    const [original, setOriginal] = useState<Combo[]>([]);
    const [mode, setMode] = useState<'open' | 'managed'>('open');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, startLoad] = useTransition();
    const [isSaving, startSave] = useTransition();
    const busy = isLoading || isSaving;

    const refresh = () => {
        startLoad(async () => {
            const res = await loadCombinationsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setError(null);
            setCombos(res.result.combinations);
            setOriginal(res.result.combinations);
            setMode(res.result.mode);
        });
    };

    const expand = () => {
        const next = !open;
        setOpen(next);
        if (next && combos === null) refresh();
    };

    const dirty = (combos ?? []).some((c, i) => c.valid !== original[i]?.valid);
    const openCount = (combos ?? []).filter((c) => c.valid).length;

    const save = () => {
        startSave(async () => {
            const res = await saveCombinationsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                subcategoryKeys: (combos ?? [])
                    .filter((c) => c.valid)
                    .map((c) => c.subcategoryKey),
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(`${category.display} updated.`);
            refresh();
        });
    };

    // Stored keys carry normalized names; the board shows display names.
    const byParam = new Map(variables.map((v) => [v.nameNormalized, v]));
    const label = (key: string): string =>
        parseSubcategoryKey(key)
            .map((p) => {
                const v = byParam.get(p.name);
                const bucket = v?.values.find((b) =>
                    b.some((a) => normalizeVariableName(a) === p.value),
                );
                return bucket?.[0] ?? p.value;
            })
            .join(' · ');

    return (
        <div className={styles.comboCategory}>
            <button
                type="button"
                className={styles.paletteHead}
                aria-expanded={open}
                onClick={expand}
            >
                <span className={styles.paletteName}>{category.display}</span>
                <span className={styles.paletteMeta}>
                    {combos === null
                        ? isLoading
                            ? 'loading…'
                            : 'tap to review'
                        : mode === 'open'
                          ? `${combos.length} leaderboards, all open`
                          : `${openCount} of ${combos.length} open`}
                </span>
            </button>

            {open && (
                <div className={styles.comboBody}>
                    {error && <p className={styles.addError}>{error}</p>}

                    {combos && combos.length > 0 && (
                        <>
                            <ul className={styles.comboList}>
                                {combos.map((c, idx) => (
                                    <li key={c.subcategoryKey}>
                                        <label className={styles.comboItem}>
                                            <input
                                                type="checkbox"
                                                checked={c.valid}
                                                disabled={busy}
                                                onChange={() =>
                                                    setCombos((prev) =>
                                                        (prev ?? []).map(
                                                            (p, i) =>
                                                                i === idx
                                                                    ? {
                                                                          ...p,
                                                                          valid:
                                                                              !p.valid,
                                                                      }
                                                                    : p,
                                                        ),
                                                    )
                                                }
                                            />
                                            <span
                                                className={
                                                    c.valid
                                                        ? styles.comboName
                                                        : styles.comboClosed
                                                }
                                            >
                                                {label(c.subcategoryKey)}
                                            </span>
                                            {/* A pairing nobody has ever run
                                                is the safe one to close, so
                                                the count sits by the tick. */}
                                            <span className={styles.comboCount}>
                                                {c.entryCount === 0
                                                    ? 'no runs'
                                                    : `${c.entryCount} runs`}
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>

                            <div className={styles.comboActions}>
                                <span className={styles.pendingSpacer} />
                                <button
                                    type="button"
                                    className={styles.pendingBtn}
                                    disabled={busy || !dirty}
                                    onClick={() => setCombos(original)}
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    className={styles.pendingApply}
                                    disabled={busy || !dirty}
                                    onClick={save}
                                >
                                    {isSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
