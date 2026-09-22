'use client';

import {
    type FocusEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { toast } from 'react-toastify';
import { DurationField } from '~src/components/time-input/duration-field';
import { formatDuration } from '~src/lib/duration';
import {
    findCategoryMinPolicy,
    findGameMinPolicy,
    findSubcategoryMinPolicy,
    findValuePlayersPolicy,
    minMsFromPolicy,
    playersRangeError,
    playersRangeShort,
    playersValueFromPolicy,
} from '~src/lib/setup/game-minimum';
import { boardNoun, type WorkspaceKind } from '~src/lib/setup/workspace';
import {
    buildSubcategoryKey,
    normalizeVariableName,
} from '~src/lib/variables/keys';
import type {
    PlayersRange,
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
    DEFAULT_PLAYERS_DRAFT,
    InlineError,
    type PlayersRangeDraft,
    PlayersRangeFields,
    playersDraftValue,
    playersPreviewValue,
    samePlayersDraft,
} from '../../../manage/shared/form-kit';
import { PolicyPreview } from '../../../manage/shared/policy-preview';
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
    /** Whether this viewer holds the right to configure this board. A
     *  moderator without it sees every write control here as a sentence,
     *  never a greyed-out box. */
    canEdit: boolean;
    /** Opens the category's rules editor — rules are category-wide. */
    onEditRules: () => void;
    /** Leaves for the Subcategories & filters screen. Offered when this board
     *  has no subcategories yet, since there is nowhere else to make one. */
    onAddSubcategories?: () => void;
    onClose: () => void;
}

function rawValue(policy: BoardPolicyRow | undefined): PlayersRange | null {
    return playersValueFromPolicy(policy);
}

/** One picked value, in both the words the band shows and the tokens the
 *  policy is stored under. */
interface PlayersTarget {
    variableName: string;
    canonicalValue: string;
    variableLabel: string;
    valueLabel: string;
}

/**
 * The picked board's player count, as one row.
 *
 * A players rule is stored per subcategory VALUE, not per combination — one
 * `mode=co-op` row covers every board that names co-op — so the row writes to
 * one of the picked values and says which one when there is more than one to
 * choose between.
 *
 * Committed on leaving the fields, like the minimum above it. Emptying both
 * and stepping away clears the rule, which is the way back to single player.
 */
function PlayersSliceRow({
    gameSlug,
    categoryId,
    target,
    /** Whether to name the value the rule lands on — only worth saying when
     *  the picked board draws its name from more than one variable. */
    showTarget,
    rows,
    canEdit,
    onSaved,
}: {
    gameSlug: string;
    categoryId: number;
    target: PlayersTarget;
    showTarget: boolean;
    rows: BoardPolicyRow[];
    canEdit: boolean;
    onSaved: () => Promise<void>;
}) {
    const own = findValuePlayersPolicy(
        rows,
        categoryId,
        target.variableName,
        target.canonicalValue,
    );
    const ownValue = rawValue(own);

    const original: PlayersRangeDraft = ownValue ?? DEFAULT_PLAYERS_DRAFT;
    const [draft, setDraft] = useState<PlayersRangeDraft>(original);
    const [saving, setSaving] = useState(false);

    // Re-seed when the loaded value under this row actually changes — not on
    // every keystroke, which lives in `draft` itself.
    useEffect(() => {
        setDraft(ownValue ?? DEFAULT_PLAYERS_DRAFT);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ownValue?.min, ownValue?.max]);

    const dirty = !samePlayersDraft(draft, original);
    const rangeError = dirty ? playersRangeError(draft) : null;

    // Always address an existing row by the key the SERVER returned, never
    // one rebuilt from display strings — the two can legitimately differ in
    // canonical form.
    const addressKey =
        own?.subcategoryKey ??
        buildSubcategoryKey([
            { name: target.variableName, value: target.canonicalValue },
        ]);

    const commit = () => {
        if (!dirty || rangeError || saving) return;
        const value = playersDraftValue(draft);
        setSaving(true);
        void (async () => {
            const res = await setSubcategoryPlayersAction({
                gameSlug,
                categoryId,
                subcategoryKey: addressKey,
                value,
            });
            if ('error' in res) {
                toast.error(res.error);
                setSaving(false);
                return;
            }
            // Re-seed to what was actually intended rather than waiting on
            // `rows` to come back around through `onSaved` — a write that
            // changed nothing never moves `ownValue`, and the draft would
            // otherwise stay dirty forever.
            setDraft(value ?? DEFAULT_PLAYERS_DRAFT);
            await onSaved();
            setSaving(false);
        })();
    };

    const note = own
        ? 'This board only.'
        : 'Empty means the category’s count applies.';
    const storedOn = showTarget
        ? ` Stored on "${target.variableLabel}: ${target.valueLabel}".`
        : '';

    return (
        <>
            <div className={styles.sliceRow}>
                <span className={styles.sliceLabel}>Players</span>
                {canEdit ? (
                    // Leaving the pair of fields is the save, so the commit
                    // hangs off the group and not off either input: a tab
                    // from the minimum to the maximum is still editing.
                    <div
                        onBlur={(e: FocusEvent<HTMLDivElement>) => {
                            if (e.currentTarget.contains(e.relatedTarget)) {
                                return;
                            }
                            commit();
                        }}
                    >
                        <PlayersRangeFields
                            idPrefix={`sub-players-${categoryId}-${target.variableName}-${target.canonicalValue}`}
                            value={draft}
                            onChange={setDraft}
                            disabled={saving}
                            compact
                        />
                    </div>
                ) : (
                    <span className={styles.sliceNote}>
                        {own ? playersRangeShort(ownValue) : '—'}
                    </span>
                )}
                <span className={styles.sliceNote}>{`${note}${storedOn}`}</span>
            </div>

            {dirty && rangeError && <InlineError>{rangeError}</InlineError>}

            {canEdit && dirty && !rangeError && (
                <PolicyPreview
                    gameSlug={gameSlug}
                    categoryId={categoryId}
                    subcategoryKey={addressKey}
                    pendingValue={playersPreviewValue(draft, {
                        dirty,
                        storedDefault: false,
                    })}
                />
            )}
        </>
    );
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
    canEdit,
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

    // Which picked value the player count is written to. A players rule
    // belongs to a VALUE, and the picked board can name several (Console: PC
    // AND Solo or Co-op?: Solo), so: the one that already carries a rule when
    // exactly one does, otherwise the last variable's — the most specific,
    // and the one that usually asks how many players a run has.
    const playersTarget: PlayersTarget | null = useMemo(() => {
        const picked = subVariables.map((v) => {
            const canonical =
                selected[v.nameNormalized] ?? defaultCanonicalOf(v);
            const bucket = v.values.find(
                (b) => b[0] && normalizeVariableName(b[0]) === canonical,
            );
            return {
                variableName: v.nameNormalized,
                canonicalValue: canonical,
                variableLabel: v.name,
                valueLabel: bucket?.[0] ?? canonical,
            };
        });
        if (picked.length === 0) return null;
        const stored = picked.filter((p) =>
            findValuePlayersPolicy(
                rows,
                category.id,
                p.variableName,
                p.canonicalValue,
            ),
        );
        if (stored.length === 1) return stored[0];
        return picked[picked.length - 1];
    }, [subVariables, selected, rows, category.id]);

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

                            {playersTarget && (
                                <PlayersSliceRow
                                    key={`${playersTarget.variableName}:${playersTarget.canonicalValue}`}
                                    gameSlug={gameSlug}
                                    categoryId={category.id}
                                    target={playersTarget}
                                    showTarget={subVariables.length > 1}
                                    rows={rows}
                                    canEdit={canEdit}
                                    onSaved={reload}
                                />
                            )}

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
