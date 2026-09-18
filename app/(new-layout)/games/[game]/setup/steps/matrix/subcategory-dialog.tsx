'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { DurationField } from '~src/components/time-input/duration-field';
import { formatDuration } from '~src/lib/duration';
import {
    findCategoryMinPolicy,
    findGameMinPolicy,
    findSubcategoryMinPolicy,
    minMsFromPolicy,
} from '~src/lib/setup/game-minimum';
import {
    buildSubcategoryKey,
    normalizeVariableName,
} from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../../types/moderation.types';
import {
    defaultCanonicalOf,
    SubcategoryBands,
    subcategoryVariablesFor,
} from '../../../manage/boards/subcategory-bands';
import { loadStandardsAction } from '../../../manage/moderation/configure/actions/standards.action';
import { setSubcategoryMinimumAction } from '../../actions/set-subcategory-minimum.action';
import styles from './matrix.module.scss';

interface Props {
    gameSlug: string;
    /** The category (or level — same thing) whose slices are being set. */
    category: ResolvedCategory;
    /** All published variables; this filters to the category's own. */
    variables: VariableRow[];
    /** The matrix's snapshot, shown until this dialog's own read lands. */
    policies: BoardPolicyRow[];
    /** Opens the category's rules editor — rules are category-wide. */
    onEditRules: () => void;
    onClose: () => void;
}

/**
 * One category's boards, one at a time.
 *
 * A category with subcategories is not one leaderboard but a product of them,
 * and some settings are really per-board: the backend resolves a minimum
 * slice-first, then category, then game. The matrix has one row per category,
 * so there is nowhere in the grid to say "this combination only". This dialog
 * is that place — the band picks the slice, and what is under it applies to
 * exactly that slice.
 *
 * The band is the same component the board itself draws (SubcategoryBands),
 * so picking a board here is the same gesture as picking one out there.
 */
export function SubcategoryDialog({
    gameSlug,
    category,
    variables,
    policies,
    onEditRules,
    onClose,
}: Props) {
    const timing: 'rt' | 'gt' = category.primaryTiming === 'gt' ? 'gt' : 'rt';
    const subVariables = useMemo(
        () => subcategoryVariablesFor(category.id, variables),
        [category.id, variables],
    );

    // The slice being configured. Seeded with each variable's default value —
    // the board a visitor lands on.
    const [selected, setSelected] = useState<Record<string, string>>(() =>
        Object.fromEntries(
            subVariables.map((v) => [v.nameNormalized, defaultCanonicalOf(v)]),
        ),
    );

    // This dialog reads its own policies: the matrix's snapshot carries the
    // category rows it needs for the grid, but a slice minimum written here
    // has to show up again without a page refresh.
    const [rows, setRows] = useState<BoardPolicyRow[]>(policies);
    const [busy, setBusy] = useState(false);

    const reload = useCallback(async () => {
        const res = await loadStandardsAction(gameSlug, category.id);
        if ('error' in res) {
            toast.error(res.error);
            return;
        }
        setRows(res.policies);
    }, [gameSlug, category.id]);

    useEffect(() => {
        void reload();
    }, [reload]);

    // Escape closes, like every other dismissible surface on the board.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const subcategoryKey = useMemo(
        () =>
            buildSubcategoryKey(
                subVariables.map((v) => ({
                    name: v.nameNormalized,
                    value: selected[v.nameNormalized] ?? defaultCanonicalOf(v),
                })),
            ),
        [subVariables, selected],
    );

    /** What the picked slice is called, in the band's own words. */
    const sliceLabel = subVariables
        .map((v) => {
            const canonical = selected[v.nameNormalized];
            const bucket = v.values.find(
                (b) => b[0] && normalizeVariableName(b[0]) === canonical,
            );
            return bucket?.[0] ?? canonical;
        })
        .filter(Boolean)
        .join(' · ');

    const own = findSubcategoryMinPolicy(rows, category.id, subcategoryKey);
    const ownMs = minMsFromPolicy(own, timing);
    // What applies when this slice sets nothing: the category's minimum, and
    // failing that the game's. Shown as the placeholder so an empty field
    // never reads as "no minimum".
    const inheritedMs =
        minMsFromPolicy(findCategoryMinPolicy(rows, category.id), timing) ??
        minMsFromPolicy(findGameMinPolicy(rows), timing);

    const saveMinimum = (ms: number | null) => {
        if (ms === ownMs) return;
        setBusy(true);
        void (async () => {
            const res = await setSubcategoryMinimumAction({
                gameSlug,
                categoryId: category.id,
                subcategoryKey,
                timing,
                minMs: ms,
            });
            if ('error' in res) toast.error(res.error);
            else await reload();
            setBusy(false);
        })();
    };

    return (
        // Backdrop dismissal is a convenience; Escape and Close are the
        // keyboard paths.
        <div className={styles.dialogBackdrop} onClick={onClose}>
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-label={`Subcategories of ${category.display}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.dialogHeader}>
                    <p className={styles.dialogTitle}>{category.display}</p>
                    <p className={styles.dialogLede}>
                        Pick a board, then set what applies to that board only.
                    </p>
                </div>

                <div className={styles.dialogBody}>
                    <SubcategoryBands
                        variables={subVariables}
                        selectedValues={selected}
                        idPrefix={`sub-settings-${category.id}`}
                        onSelect={(name, canonical) =>
                            setSelected((prev) => ({
                                ...prev,
                                [name]: canonical,
                            }))
                        }
                    />

                    <div className={styles.sliceSettings}>
                        <p className={styles.sliceHead}>
                            {sliceLabel || category.display}
                        </p>

                        <div className={styles.sliceRow}>
                            <span className={styles.sliceLabel}>Min. time</span>
                            <DurationField
                                size="sm"
                                inputClassName={`${styles.cellNoDefault} ${styles.minInput}`}
                                value={ownMs}
                                onChange={() => {
                                    // Committed on blur, like every other
                                    // minimum on this screen.
                                }}
                                onCommit={saveMinimum}
                                disabled={busy}
                                placeholder={
                                    inheritedMs !== null
                                        ? formatDuration(inheritedMs)
                                        : '—'
                                }
                                aria-label={`Minimum time for ${sliceLabel || category.display}`}
                            />
                            <span className={styles.sliceNote}>
                                {ownMs === null
                                    ? 'Empty means the category’s minimum applies.'
                                    : 'This board only.'}
                            </span>
                        </div>

                        <div className={styles.sliceRow}>
                            <span className={styles.sliceLabel}>Rules</span>
                            <button
                                type="button"
                                className={styles.rulesChip}
                                onClick={onEditRules}
                            >
                                Edit rules
                            </button>
                            <span className={styles.sliceNote}>
                                Rules are stored per category, so they cover
                                every board here.
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.dialogFooter}>
                    <span className={styles.dialogSpacer} />
                    <button
                        type="button"
                        className={styles.rulesChip}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
