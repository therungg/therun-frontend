'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { DurationField } from '~src/components/time-input/duration-field';
import { formatDuration } from '~src/lib/duration';
import {
    findCategoryMinPolicy,
    findCategoryPlayersPolicy,
    findGameMinPolicy,
    findSubcategoryMinPolicy,
    findSubcategoryPlayersPolicy,
    isDefaultPlayersRange,
    minMsFromPolicy,
    playersRangeError,
    playersValueFromPolicy,
} from '~src/lib/setup/game-minimum';
import { boardNoun, type WorkspaceKind } from '~src/lib/setup/workspace';
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
import {
    describePlayersRange,
    type PlayersRangeDraft,
    PlayersRangeFields,
} from '../../../manage/shared/form-kit';
import { setSubcategoryMinimumAction } from '../../actions/set-subcategory-minimum.action';
import { setSubcategoryPlayersAction } from '../../actions/set-subcategory-players.action';
import { setValueRulesAction } from '../../actions/set-value-rules.action';
import styles from './matrix.module.scss';
import { ValueRulesRow } from './value-rules-row';

interface Props {
    gameSlug: string;
    gameId: number;
    /** What this board is called in copy: a category or a level. */
    kind: WorkspaceKind;
    /** The category (or level — same thing) whose slices are being set. */
    category: ResolvedCategory;
    /** All published variables; this filters to the category's own. */
    variables: VariableRow[];
    /** The matrix's snapshot, shown until this dialog's own read lands. */
    policies: BoardPolicyRow[];
    /** Opens the category's rules editor — rules are category-wide. */
    onEditRules: () => void;
    /** Leaves for the Subcategories & filters screen. Offered when this board
     *  has no subcategories yet, since there is nowhere else to make one. */
    onAddSubcategories?: () => void;
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
    gameId,
    kind,
    category,
    variables,
    policies,
    onEditRules,
    onAddSubcategories,
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

    // Same shape as the minimum above, one scope lower: this slice's own
    // players policy, falling back to the category's and then the game's for
    // the placeholder. A draft that isn't committed until blur, seeded from
    // the loaded value and reset whenever the slice or its saved value moves
    // underneath it.
    const ownPlayers = findSubcategoryPlayersPolicy(
        rows,
        category.id,
        subcategoryKey,
    );
    const ownPlayersValue = playersValueFromPolicy(ownPlayers);
    // The category is the only scope above this one that anything writes, so
    // it is the only one this falls back to — see game-minimum.ts.
    const inheritedPlayersValue = playersValueFromPolicy(
        findCategoryPlayersPolicy(rows, category.id),
    );

    const [playersDraft, setPlayersDraft] = useState<PlayersRangeDraft>({
        min: ownPlayersValue?.min ?? null,
        max: ownPlayersValue?.max ?? null,
    });

    useEffect(() => {
        setPlayersDraft({
            min: ownPlayersValue?.min ?? null,
            max: ownPlayersValue?.max ?? null,
        });
        // Re-seed only when the slice or its own saved value actually moves —
        // not on every keystroke, which lives in playersDraft itself.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subcategoryKey, ownPlayersValue?.min, ownPlayersValue?.max]);

    const savePlayers = (draft: PlayersRangeDraft) => {
        const rangeError = playersRangeError(draft);
        if (rangeError) {
            toast.error(rangeError);
            return;
        }
        // Blank fields, or the permissive default typed out, clear this
        // slice's own policy and defer to whatever the category (or game) has
        // — the same "clear means inherit" rule as the minimum above.
        //
        // `isDefaultPlayersRange`, not a blank/blank test: a stored
        // `{min:1,max:null}` limits nothing, but it makes the slice read as
        // CONFIGURED, which is exactly what turns the co-op controls on. A
        // moderator typing a minimum of 1 has not made the board co-op.
        if (isDefaultPlayersRange(draft)) {
            if (!ownPlayersValue) return;
            setBusy(true);
            void (async () => {
                const res = await setSubcategoryPlayersAction({
                    gameSlug,
                    categoryId: category.id,
                    subcategoryKey,
                    value: null,
                });
                if ('error' in res) toast.error(res.error);
                else await reload();
                setBusy(false);
            })();
            return;
        }

        const value = { min: draft.min ?? 1, max: draft.max };
        if (
            ownPlayersValue &&
            ownPlayersValue.min === value.min &&
            ownPlayersValue.max === value.max
        ) {
            return;
        }

        setBusy(true);
        void (async () => {
            const res = await setSubcategoryPlayersAction({
                gameSlug,
                categoryId: category.id,
                subcategoryKey,
                value,
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
                        {subVariables.length === 0
                            ? `This ${boardNoun(kind)} is one leaderboard. A subcategory splits it into several, each with its own record.`
                            : 'Pick a board, then set what applies to that board only.'}
                    </p>
                </div>

                {subVariables.length === 0 ? (
                    <div className={styles.dialogBody}>
                        <div className={styles.sliceSettings}>
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
                                    Rules are stored per {boardNoun(kind)}.
                                </span>
                            </div>

                            {onAddSubcategories && (
                                <div className={styles.sliceRow}>
                                    <span className={styles.sliceLabel}>
                                        Subcategories
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.rulesChip}
                                        onClick={onAddSubcategories}
                                    >
                                        Add a subcategory
                                    </button>
                                    <span className={styles.sliceNote}>
                                        Subcategories are made once and put on
                                        the {boardNoun(kind, 2)} that need them.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
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
                                <span className={styles.sliceLabel}>
                                    Min. time
                                </span>
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
                                <span className={styles.sliceLabel}>
                                    Runners credited
                                </span>
                                <PlayersRangeFields
                                    idPrefix={`sub-players-${category.id}`}
                                    value={playersDraft}
                                    onChange={setPlayersDraft}
                                    onCommit={savePlayers}
                                    disabled={busy}
                                />
                                <span className={styles.sliceNote}>
                                    {playersDraft.min === null &&
                                    playersDraft.max === null
                                        ? inheritedPlayersValue
                                            ? `Empty means the category’s policy applies (${describePlayersRange(inheritedPlayersValue).toLowerCase()})`
                                            : 'Empty means no limit applies.'
                                        : 'This board only.'}
                                </span>
                            </div>
                            <p className={styles.sliceNote}>
                                A run whose roster no longer fits is taken off
                                this board — not rejected, not deleted — until
                                its runners are filled in again.
                            </p>

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

                            {/* What the picked values add on top. A value's
                                rules belong to the value, so they follow it
                                onto every board it is part of — and an
                                imported board already has the source's. */}
                            {subVariables.map((v) => {
                                const canonical =
                                    selected[v.nameNormalized] ??
                                    defaultCanonicalOf(v);
                                const bucket = v.values.find(
                                    (b) =>
                                        b[0] &&
                                        normalizeVariableName(b[0]) ===
                                            canonical,
                                );
                                const label = bucket?.[0];
                                if (!label) return null;
                                return (
                                    <ValueRulesRow
                                        key={`${v.nameNormalized}:${canonical}`}
                                        label={label}
                                        rules={v.valueRules?.[canonical] ?? ''}
                                        disabled={busy}
                                        onSave={(text) =>
                                            setValueRulesAction({
                                                gameSlug,
                                                gameId,
                                                categorySlug: category.name,
                                                variable: v,
                                                valueLabel: label,
                                                rules: text,
                                            })
                                        }
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

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
