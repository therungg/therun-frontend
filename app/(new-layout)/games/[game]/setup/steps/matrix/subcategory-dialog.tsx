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
    findValuePlayersPolicy,
    isDefaultPlayersRange,
    minMsFromPolicy,
    playersRangeError,
    playersValueFromPolicy,
    unclaimedPlayersPolicies,
} from '~src/lib/setup/game-minimum';
import { boardNoun, type WorkspaceKind } from '~src/lib/setup/workspace';
import {
    buildSubcategoryKey,
    normalizeVariableName,
    parseSubcategoryKey,
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
    InlineError,
    type PlayersRangeDraft,
    PlayersRangeFields,
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

function sameDraft(a: PlayersRangeDraft, b: PlayersRangeDraft): boolean {
    return a.min === b.min && a.max === b.max;
}

function rawValue(
    policy: BoardPolicyRow | undefined,
): { min: number; max: number | null } | null {
    return playersValueFromPolicy(policy);
}

/** Labels a stored combination key (`mode=co-op|platform=pc`) back into
 *  display text, using the category's own variables to find each pair's
 *  label. Falls back to the raw value when a variable or bucket can't be
 *  found (a value since renamed or unpublished). */
function comboLabel(key: string, subVariables: VariableRow[]): string {
    return parseSubcategoryKey(key)
        .map(({ name, value }) => {
            const variable = subVariables.find(
                (v) => v.nameNormalized === name,
            );
            const bucket = variable?.values.find(
                (b) => b[0] && normalizeVariableName(b[0]) === value,
            );
            return bucket?.[0] ?? value;
        })
        .join(' · ');
}

/**
 * One subcategory VALUE's own runner range — the primary editing surface
 * (task: subset matching means a single `mode=co-op` row now covers every
 * combination that names it, so this is a value editor, not a per-combination
 * one).
 */
function PlayersValueRow({
    gameSlug,
    categoryId,
    label,
    variableName,
    canonicalValue,
    rows,
    /** Whether ANY value in this category (this one or a sibling) has its
     *  own players row. Decides whether an absent own setting here reads as
     *  "inherits the category" (true only when nothing in the category has
     *  ever carved out a value-level exception) or "no setting for this
     *  value" (a sibling value row exists, so the category-wide row is
     *  suppressed on some slices and this row can't say what applies
     *  without knowing which slice). */
    anyValueScoped,
    canEdit,
    onSaved,
}: {
    gameSlug: string;
    categoryId: number;
    label: string;
    variableName: string;
    canonicalValue: string;
    rows: BoardPolicyRow[];
    anyValueScoped: boolean;
    canEdit: boolean;
    onSaved: () => Promise<void>;
}) {
    const own = findValuePlayersPolicy(
        rows,
        categoryId,
        variableName,
        canonicalValue,
    );
    const ownValue = rawValue(own);
    const categoryPolicy = findCategoryPlayersPolicy(rows, categoryId);
    const categoryValue = rawValue(categoryPolicy);

    const original: PlayersRangeDraft = ownValue ?? { min: null, max: null };
    const [draft, setDraft] = useState<PlayersRangeDraft>(original);
    const [saving, setSaving] = useState(false);

    // Re-seed when the loaded value under this row actually changes — not on
    // every keystroke, which lives in `draft` itself.
    useEffect(() => {
        setDraft(ownValue ?? { min: null, max: null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ownValue?.min, ownValue?.max]);

    const dirty = !sameDraft(draft, original);
    const rangeError = dirty ? playersRangeError(draft) : null;
    const storedDefault = !!own && !dirty && isDefaultPlayersRange(original);

    const builtKey = buildSubcategoryKey([
        { name: variableName, value: canonicalValue },
    ]);
    // Always address an existing row by the key the SERVER returned, never
    // one rebuilt from display strings — the two can legitimately differ in
    // canonical form.
    const addressKey = own?.subcategoryKey ?? builtKey;

    const pendingValue = (():
        | { min: number; max: number | null }
        | null
        | undefined => {
        if (dirty && !rangeError) {
            return isDefaultPlayersRange(draft)
                ? null
                : { min: draft.min ?? 1, max: draft.max };
        }
        if (storedDefault) return null;
        return undefined;
    })();

    const write = (value: { min: number; max: number | null } | null) => {
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
            // A no-op (the draft round-tripped to what's already stored, or
            // to "nothing" with nothing to clear) isn't a save — don't claim
            // one. Re-seed the draft to what was actually intended either
            // way, rather than waiting on `rows` to come back around through
            // `onSaved` — the effect above only fires when `ownValue`
            // changes, which a no-op never does, and the draft would
            // otherwise stay dirty with Save stuck on screen.
            if (res.changed)
                toast.success(`Runners credited for ${label} saved.`);
            setDraft(value ?? { min: null, max: null });
            await onSaved();
            setSaving(false);
        })();
    };

    const handleSave = () => {
        if (rangeError) return;
        write(
            isDefaultPlayersRange(draft)
                ? null
                : { min: draft.min ?? 1, max: draft.max },
        );
    };

    const handleRemove = () => write(null);

    // What this row can honestly claim: its OWN setting, or the absence of
    // one — never a merged effective range, because that depends on which
    // OTHER value rows and exact-combination rows also address a given
    // board slice (guide §5: every matching value row merges to the
    // stricter bound, and any value row suppresses the category-wide row
    // entirely). A per-value row can't compute that without knowing the
    // slice, so it states only what's true of itself.
    const statusNote = own
        ? `Set for this value: ${describePlayersRange(ownValue)}`
        : anyValueScoped
          ? // A sibling value (or an exact-combination row) exists in this
            // category, which suppresses the category-wide row on any slice
            // it addresses — so "inherited from the category" would be
            // right on some slices and wrong on others. Say nothing more
            // specific than the fact that this value itself sets nothing.
            'No setting for this value.'
          : categoryPolicy
            ? `Inherited from the category: ${describePlayersRange(categoryValue)}`
            : 'No limit set.';

    return (
        <div className={styles.valueRulesEditor}>
            <div className={styles.sliceRow}>
                <span className={styles.sliceLabel}>{label}</span>
                {canEdit ? (
                    <PlayersRangeFields
                        idPrefix={`sub-players-${categoryId}-${variableName}-${canonicalValue}`}
                        value={draft}
                        onChange={setDraft}
                        disabled={saving}
                    />
                ) : null}
            </div>

            {storedDefault ? (
                <p className={styles.sliceNote}>
                    This value is marked for co-op with no limit on runners.
                </p>
            ) : (
                <p className={styles.sliceNote}>{statusNote}</p>
            )}

            {canEdit && (
                <PolicyPreview
                    gameSlug={gameSlug}
                    categoryId={categoryId}
                    subcategoryKey={addressKey}
                    pendingValue={pendingValue}
                />
            )}

            {dirty && rangeError && <InlineError>{rangeError}</InlineError>}

            {canEdit && (
                <div className={styles.valueRulesActions}>
                    {storedDefault && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={saving}
                            onClick={handleRemove}
                        >
                            {saving ? 'Removing…' : 'Remove'}
                        </button>
                    )}
                    {dirty && !rangeError && (
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={saving}
                            onClick={handleSave}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    )}
                </div>
            )}
        </div>
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

    // Every players row a per-value row above claims as its own — so the
    // read-only list below shows exactly what isn't shown above: an
    // exact-combination row from before subset matching, or an orphan (a
    // single-pair row whose value was renamed or removed underneath it).
    const claimedPlayersIds = useMemo(() => {
        const ids = new Set<number>();
        for (const v of subVariables) {
            for (const bucket of v.values) {
                const label = bucket?.[0];
                if (!label) continue;
                const canonical = normalizeVariableName(label);
                const claimed = findValuePlayersPolicy(
                    rows,
                    category.id,
                    v.nameNormalized,
                    canonical,
                );
                if (claimed) ids.add(claimed.id);
            }
        }
        return ids;
    }, [subVariables, rows, category.id]);

    const unclaimedPlayersRows = unclaimedPlayersPolicies(
        rows,
        category.id,
        claimedPlayersIds,
    );

    // Whether ANY value in this category has its own players row — decides
    // whether a value with no own row of its own can honestly say it
    // inherits the category's, or must say only that it has no setting (see
    // the comment on `PlayersValueRow`'s `anyValueScoped` prop).
    const anyValueScopedPlayers =
        claimedPlayersIds.size > 0 || unclaimedPlayersRows.length > 0;

    // A players setting stored for the whole category — the one an import
    // writes, whatever the category's subcategories are.
    const categoryWidePlayers =
        findCategoryPlayersPolicy(rows, category.id) != null;

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

                            <p className={styles.sliceNote}>
                                A change here re-checks the board in the
                                background: a run that stops fitting comes off
                                until its runners are fixed — it isn't rejected
                                or deleted.
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

                            {/* Runners credited — per VALUE, not per
                                combination: a single `mode=co-op` row covers
                                every board that names it, so this is the
                                whole primary editor. */}
                            <p className={styles.sliceHead}>Runners credited</p>
                            {/* A category-wide setting reaches every board
                                here, co-op or not — which is how an import
                                leaves a solo slice reading as co-op. Said
                                where the values are, because this is where it
                                gets fixed. */}
                            {categoryWidePlayers && (
                                <p className={styles.sliceNote}>
                                    {category.display} has a runner count set
                                    for the whole category, so it applies to
                                    every subcategory of it. If only some of
                                    them credit several runners, set those
                                    values their own count and set the others to
                                    1 runner.
                                </p>
                            )}
                            {(anyValueScopedPlayers ||
                                unclaimedPlayersRows.length > 0) && (
                                <p className={styles.sliceNote}>
                                    Where more than one setting applies to a
                                    board, the stricter bound wins, and any
                                    value's own setting replaces the
                                    category-wide one.
                                </p>
                            )}
                            {subVariables.map((v) => (
                                <div key={v.nameNormalized}>
                                    {v.values.map((bucket) => {
                                        const label = bucket?.[0];
                                        if (!label) return null;
                                        const canonical =
                                            normalizeVariableName(label);
                                        return (
                                            <PlayersValueRow
                                                key={`${v.nameNormalized}:${canonical}`}
                                                gameSlug={gameSlug}
                                                categoryId={category.id}
                                                label={`${v.name}: ${label}`}
                                                variableName={v.nameNormalized}
                                                canonicalValue={canonical}
                                                rows={rows}
                                                anyValueScoped={
                                                    anyValueScopedPlayers
                                                }
                                                canEdit={canEdit}
                                                onSaved={reload}
                                            />
                                        );
                                    })}
                                </div>
                            ))}

                            {unclaimedPlayersRows.length > 0 && (
                                <div className={styles.sliceSettings}>
                                    <p className={styles.sliceHead}>
                                        Set outside this editor
                                    </p>
                                    <p className={styles.sliceNote}>
                                        Stored, but not shown above — an exact
                                        combination from before, or a value
                                        that's since been renamed or removed.
                                    </p>
                                    {unclaimedPlayersRows.map((row) => (
                                        <div
                                            key={row.id}
                                            className={styles.sliceRow}
                                        >
                                            <span className={styles.sliceLabel}>
                                                {comboLabel(
                                                    row.subcategoryKey ?? '',
                                                    subVariables,
                                                )}
                                            </span>
                                            <span className={styles.sliceNote}>
                                                {describePlayersRange(
                                                    rawValue(row),
                                                )}
                                            </span>
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    className={styles.rulesChip}
                                                    disabled={busy}
                                                    onClick={() => {
                                                        setBusy(true);
                                                        void (async () => {
                                                            const res =
                                                                await setSubcategoryPlayersAction(
                                                                    {
                                                                        gameSlug,
                                                                        categoryId:
                                                                            category.id,
                                                                        subcategoryKey:
                                                                            row.subcategoryKey ??
                                                                            '',
                                                                        value: null,
                                                                    },
                                                                );
                                                            if (
                                                                'error' in res
                                                            ) {
                                                                toast.error(
                                                                    res.error,
                                                                );
                                                            } else {
                                                                await reload();
                                                            }
                                                            setBusy(false);
                                                        })();
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
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
