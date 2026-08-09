'use client';

import { useState } from 'react';
import type { BoardBucket, VariableGroup } from '~src/lib/setup/variable-view';
import { driftSides } from '~src/lib/setup/variable-view';
import {
    conversionLabel,
    conversionNote,
    driftNotice,
    SECTION,
    type VariableRoleId,
} from '~src/lib/variables/language';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import { GroupNote } from './group-note';
import { OptionEditor } from './option-editor';
import { TriCheckbox } from './tri-checkbox';
import { normalizeName } from './variable-keys';
import styles from './variables-grid.module.scss';

/**
 * The group's note, read board-level: the first category that has one wins.
 * Writes always fan out to every carrier, so a disagreement here can only
 * come from rows written before the note became board-level.
 */
function noteOf(group: VariableGroup): string | null {
    for (const state of group.byCategory.values()) {
        if (state.row.description) return state.row.description;
    }
    return null;
}

/**
 * One variable, as an object: its name, its options, and the category x option
 * grid saying where each option applies.
 *
 * Split out of variables-grid.tsx — this is the per-variable editor, and the
 * grid file is now the axis and the sections around it.
 */
export function VariablePalette({
    group,
    role,
    categories,
    busy,
    isTarget,
    pendingCount,
    cellOn,
    onToggle,
    onRemoveCategory,
    onToggleColumn,
    onToggleAll,
    onApply,
    onDiscard,
    onConvert,
    onBuckets,
    onDefault,
    onDefaultAll,
    onMove,
    position,
    total: groupTotal,
    onAddOption,
    onRename,
    onNote,
    onDelete,
    showValueOnBoard,
    onShowValue,
    takenNames,
}: {
    group: VariableGroup;
    role: VariableRoleId;
    categories: ResolvedCategory[];
    busy: boolean;
    isTarget: boolean;
    pendingCount: number;
    cellOn: (categoryId: number, bucketKey: string) => boolean;
    onToggle: (categoryId: number, bucketKey: string, on: boolean) => void;
    onRemoveCategory: (categoryId: number) => void;
    onToggleColumn: (bucketKey: string, on: boolean) => void;
    onToggleAll: (on: boolean) => void;
    onApply: () => void;
    onDiscard: () => void;
    onConvert: (to: VariableRoleId) => void;
    onBuckets: (boardBuckets: BoardBucket[]) => void;
    onDefault: (categoryId: number, bucketKey: string) => void;
    onDefaultAll: (bucketKey: string) => void;
    onMove: (delta: number) => void;
    position: number;
    total: number;
    onAddOption: (bucket: BoardBucket) => void;
    onRename: (nextName: string) => void;
    onNote: (note: string | null) => void;
    onDelete: () => void;
    showValueOnBoard: boolean;
    onShowValue: (show: boolean) => void;
    takenNames: Set<string>;
}) {
    const [open, setOpen] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [renaming, setRenaming] = useState(false);
    // A new option is edited by the same editor that edits an existing one —
    // it is the same three questions (name, spellings, where in the order).
    const [addingOption, setAddingOption] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const onCount = categories.filter((c) => group.byCategory.has(c.id)).length;
    const displayOf = (id: number) =>
        categories.find((c) => c.id === id)?.display ?? `#${id}`;
    const sides = driftSides(group);
    const editingBucket = group.buckets.find((b) => b.key === editing) ?? null;

    /**
     * The default every category agrees on, or null when they disagree.
     *
     * A board that splits by Platform almost always wants a run with no
     * platform on the same platform everywhere, so the column rendered the
     * same answer eight times as eight separate dropdowns. When they agree it
     * becomes one control above the grid; the column only comes back once
     * there is a disagreement for it to show.
     */
    const carriers = categories.filter((c) => group.byCategory.has(c.id));
    const sharedDefault =
        role === 'subcategory' &&
        carriers.length > 0 &&
        carriers.every(
            (c) =>
                group.byCategory.get(c.id)?.defaultBucket ===
                group.byCategory.get(carriers[0].id)?.defaultBucket,
        )
            ? (group.byCategory.get(carriers[0].id)?.defaultBucket ?? null)
            : null;

    const showsDefaultColumn = role === 'subcategory' && sharedDefault === null;
    // Category + one per option + the add-an-option column + the default
    // column, when there is one.
    const columnCount = 2 + group.buckets.length + (showsDefaultColumn ? 1 : 0);

    // Bulk-selection state for the matrix. When every option is on for every
    // category the grid says nothing a one-line summary can't — so it collapses
    // to that summary until the moderator asks to adjust it.
    const [adjusting, setAdjusting] = useState(false);
    const columnOnCount = (bucketKey: string) =>
        categories.filter((c) => cellOn(c.id, bucketKey)).length;
    const onCellCount = group.buckets.reduce(
        (sum, b) => sum + columnOnCount(b.key),
        0,
    );
    const totalCells = categories.length * group.buckets.length;
    const allOn = group.buckets.length > 0 && onCellCount === totalCells;
    const someOn = onCellCount > 0;
    // Collapse to the summary only when the grid truly says nothing more: every
    // cell on AND no per-category default column to show (that column carries
    // real meaning even when membership is uniform).
    const showGrid = !allOn || adjusting || showsDefaultColumn;

    return (
        <div className={styles.palette}>
            {/* The head is a row of separate controls, not one big button. It
                used to be a single collapse button wrapping everything, which
                is why the name could never become editable — a button cannot
                live inside a button, and the group's own name was the one
                thing on this panel with no way to change it.

                Splitting it cost the bar its click, though: an accordion head
                collapses when you hit the bar, not only when you hit the
                chevron. So the bar handles the click itself and every real
                control inside it stops the event, which is the only part a
                button-in-a-button could not have done. Keyboard users get the
                chevron, which is a real button. */}
            <div
                className={styles.paletteHead}
                onClick={() => !renaming && setOpen((v) => !v)}
            >
                {renaming ? (
                    <RenameGroup
                        role={role}
                        current={group.name}
                        busy={busy}
                        takenNames={takenNames}
                        onCancel={() => setRenaming(false)}
                        onRename={(next) => {
                            setRenaming(false);
                            onRename(next);
                        }}
                    />
                ) : (
                    <>
                        {/* Click the thing to edit the thing — the same rule
                            the option column headers follow. */}
                        <button
                            type="button"
                            className={styles.paletteName}
                            disabled={busy}
                            title={`Rename ${group.name}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setRenaming(true);
                            }}
                        >
                            {group.name}
                        </button>
                        <span className={styles.paletteMeta}>
                            on {onCount} of {categories.length} ·{' '}
                            {group.buckets.length}{' '}
                            {SECTION[role].options.toLowerCase()}
                        </span>
                        {pendingCount > 0 && (
                            <span className={styles.pendingBadge}>
                                {pendingCount} pending
                            </span>
                        )}
                        {/* Delete lives with the group's identity in the head,
                            not buried under the matrix. The two-step confirm
                            renders as a banner below, so it has room the head
                            row doesn't. */}
                        <button
                            type="button"
                            className={styles.headDelete}
                            disabled={busy}
                            aria-label={`Delete ${group.name}`}
                            title={`Delete ${group.name}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpen(true);
                                setConfirmDelete(true);
                            }}
                        >
                            Delete
                        </button>
                        <button
                            type="button"
                            className={styles.collapse}
                            aria-expanded={open}
                            aria-label={`${open ? 'Collapse' : 'Expand'} ${group.name}`}
                            onClick={(e) => {
                                // The bar handles this; without stopping it
                                // here the click would toggle twice and the
                                // panel would never move.
                                e.stopPropagation();
                                setOpen((v) => !v);
                            }}
                        />
                    </>
                )}
            </div>

            {/* Destructive confirm as a banner directly under the head, where
                Delete was clicked — not at the foot of the panel. */}
            {confirmDelete && (
                <div className={styles.deleteBanner}>
                    <span className={styles.deleteWarning}>
                        Delete {group.name} from all {onCount}{' '}
                        {onCount === 1 ? 'category' : 'categories'}?
                        {role === 'subcategory' &&
                            ' Their subcategories collapse back into one leaderboard each.'}
                    </span>
                    <button
                        type="button"
                        className={styles.pendingBtn}
                        disabled={busy}
                        onClick={() => setConfirmDelete(false)}
                    >
                        Keep it
                    </button>
                    <button
                        type="button"
                        className={styles.deleteConfirm}
                        disabled={busy}
                        onClick={() => {
                            setConfirmDelete(false);
                            onDelete();
                        }}
                    >
                        Delete
                    </button>
                </div>
            )}

            {/* A role disagreement means this makes subcategories on part of
                the board and only filters the rest. Stated, with both ways
                out — it used to be a badge reading "roles differ". */}
            {group.roleDrift && (
                <div className={styles.drift}>
                    <p className={styles.driftText}>
                        {driftNotice({
                            name: group.name,
                            splitOn: sides.subcategory.map(displayOf),
                            filterOn: sides.filter.map(displayOf),
                        })}
                    </p>
                    <div className={styles.driftActions}>
                        <button
                            type="button"
                            className={styles.pendingBtn}
                            disabled={busy}
                            onClick={() => onConvert('subcategory')}
                        >
                            Subcategories everywhere
                        </button>
                        <button
                            type="button"
                            className={styles.pendingBtn}
                            disabled={busy}
                            onClick={() => onConvert('filter')}
                        >
                            Filter everywhere
                        </button>
                    </div>
                </div>
            )}

            {open && (
                <>
                    {/* The whole of what used to be a column and a footnote:
                        one sentence with the control inside it, stating both
                        that runs arrive without a Platform and where those go.
                        The column comes back below the moment two categories
                        want different answers. */}
                    {/* Both group-level settings live together, above the
                        grid: where unmatched runs land, and whether the value
                        shows as a board column. Neither is per-category, so
                        neither belongs in the matrix. */}
                    <div className={styles.groupSettings}>
                        {sharedDefault !== null && (
                            <p className={styles.groupSetting}>
                                A run that doesn&rsquo;t set this counts as{' '}
                                <select
                                    className={styles.defaultSelect}
                                    value={sharedDefault}
                                    disabled={busy}
                                    aria-label={`Where a run with no ${group.name} goes, on all ${carriers.length} categories`}
                                    onChange={(e) =>
                                        onDefaultAll(e.target.value)
                                    }
                                >
                                    {group.buckets.map((b) => (
                                        <option key={b.key} value={b.key}>
                                            {b.label}
                                        </option>
                                    ))}
                                </select>
                                .
                            </p>
                        )}

                        {/* Set any time, for either role. Display-only, so it
                            writes straight through (onShowValue → applyNow) and
                            never stages or moves a run. */}
                        <label className={styles.showValueRow}>
                            <input
                                type="checkbox"
                                checked={showValueOnBoard}
                                disabled={busy}
                                onChange={(e) => onShowValue(e.target.checked)}
                            />
                            <span className={styles.showValueText}>
                                Show this as a value on the leaderboard row
                                <span className={styles.showValueHint}>
                                    Adds a {group.name} column to the board with
                                    each runner&rsquo;s value.
                                </span>
                            </span>
                        </label>
                    </div>

                    {/* The all-on case is the common one and says nothing a
                        line can't. Collapse the wall of identical checkboxes to
                        a summary until the moderator asks to narrow it. */}
                    {!showGrid && (
                        <div className={styles.gridSummary}>
                            <span className={styles.gridSummaryText}>
                                On all {categories.length}{' '}
                                {categories.length === 1
                                    ? 'category'
                                    : 'categories'}{' '}
                                · {group.buckets.length}{' '}
                                {SECTION[role].options.toLowerCase()}
                            </span>
                            <button
                                type="button"
                                className={styles.gridAdjust}
                                disabled={busy}
                                onClick={() => setAdjusting(true)}
                            >
                                Adjust…
                            </button>
                        </div>
                    )}

                    {showGrid && (
                        <div className={styles.scroller}>
                            <table className={styles.grid}>
                                <thead>
                                    <tr>
                                        <th className={styles.corner}>
                                            Category
                                        </th>
                                        {/* The option's own column header is how
                                        you edit the option. Same rule as the
                                        category matrix: click the thing to
                                        edit the thing, and never leave the
                                        grid to do it. */}
                                        {group.buckets.map((bucket) => (
                                            <th key={bucket.key}>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.optionButton
                                                    }
                                                    aria-expanded={
                                                        editing === bucket.key
                                                    }
                                                    onClick={() =>
                                                        setEditing(
                                                            editing ===
                                                                bucket.key
                                                                ? null
                                                                : bucket.key,
                                                        )
                                                    }
                                                >
                                                    {bucket.label}
                                                    {bucket.aliases.length >
                                                        0 && (
                                                        <span
                                                            className={
                                                                styles.aliasCount
                                                            }
                                                            title={`${bucket.aliases.length} other ${
                                                                bucket.aliases
                                                                    .length ===
                                                                1
                                                                    ? 'spelling'
                                                                    : 'spellings'
                                                            } resolve here: ${bucket.aliases.join(', ')}`}
                                                        >
                                                            +
                                                            {
                                                                bucket.aliases
                                                                    .length
                                                            }
                                                        </span>
                                                    )}
                                                </button>
                                            </th>
                                        ))}

                                        {/* A new option is a new column, so the
                                        control that makes one sits where the
                                        column will appear. There was no way to
                                        add an option at all once the group
                                        existed — you could rename, reorder and
                                        remove them, but never add. */}
                                        <th className={styles.addOptionHead}>
                                            <button
                                                type="button"
                                                className={styles.addOption}
                                                disabled={busy}
                                                aria-expanded={addingOption}
                                                onClick={() => {
                                                    setEditing(null);
                                                    setAddingOption((v) => !v);
                                                }}
                                            >
                                                + Option
                                            </button>
                                        </th>

                                        {/* Where unmatched runs land — per
                                        category by nature, so a column beside
                                        the options rather than a value shared
                                        across the board.

                                        Named with the group's own word. "Runs
                                        that don't say" left the reader to
                                        supply the missing half of the sentence
                                        — don't say WHAT — and the only place
                                        that ever answered it was a tooltip on
                                        a marker that no longer exists. */}
                                        {showsDefaultColumn && (
                                            <th
                                                className={styles.defaultHead}
                                                title={`A run submitted without a ${group.name} goes to the subcategory picked here.`}
                                            >
                                                No {group.name} given
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {editingBucket && (
                                        <tr className={styles.editorRow}>
                                            <td colSpan={columnCount}>
                                                <OptionEditor
                                                    bucket={editingBucket}
                                                    index={group.buckets.indexOf(
                                                        editingBucket,
                                                    )}
                                                    total={group.buckets.length}
                                                    role={role}
                                                    busy={busy}
                                                    onCancel={() =>
                                                        setEditing(null)
                                                    }
                                                    onApply={(next) => {
                                                        setEditing(null);
                                                        onBuckets(next);
                                                    }}
                                                    buckets={group.buckets}
                                                />
                                            </td>
                                        </tr>
                                    )}

                                    {addingOption && (
                                        <tr className={styles.editorRow}>
                                            <td colSpan={columnCount}>
                                                <OptionEditor
                                                    bucket={NEW_BUCKET}
                                                    index={group.buckets.length}
                                                    total={
                                                        group.buckets.length + 1
                                                    }
                                                    role={role}
                                                    busy={busy}
                                                    isNew
                                                    onCancel={() =>
                                                        setAddingOption(false)
                                                    }
                                                    onApply={(next) => {
                                                        setAddingOption(false);
                                                        // The editor hands back
                                                        // the whole list; the new
                                                        // one is the one it added.
                                                        onAddOption(
                                                            next[
                                                                next.length - 1
                                                            ],
                                                        );
                                                    }}
                                                    buckets={group.buckets}
                                                />
                                            </td>
                                        </tr>
                                    )}

                                    {/* Bulk toggles live in the body, not the
                                    header: a first row whose checkboxes sit in
                                    the same columns as the cells they act on,
                                    so alignment is free and the header stays
                                    the option's name. Only when there's enough
                                    grid for "all" to mean something. */}
                                    {categories.length > 1 && (
                                        <tr className={styles.allRow}>
                                            <th
                                                scope="row"
                                                className={styles.allRowName}
                                            >
                                                <span
                                                    className={
                                                        styles.allRowNameInner
                                                    }
                                                >
                                                    <TriCheckbox
                                                        className={styles.cell}
                                                        checked={allOn}
                                                        indeterminate={someOn}
                                                        disabled={busy}
                                                        ariaLabel={`Toggle every option on every category for ${group.name}`}
                                                        onChange={(on) =>
                                                            onToggleAll(on)
                                                        }
                                                    />
                                                    <span>All categories</span>
                                                </span>
                                            </th>
                                            {group.buckets.map((bucket) => (
                                                <td key={bucket.key}>
                                                    <TriCheckbox
                                                        className={styles.cell}
                                                        checked={
                                                            columnOnCount(
                                                                bucket.key,
                                                            ) ===
                                                            categories.length
                                                        }
                                                        indeterminate={
                                                            columnOnCount(
                                                                bucket.key,
                                                            ) > 0
                                                        }
                                                        disabled={busy}
                                                        ariaLabel={`Toggle ${bucket.label} on every category`}
                                                        onChange={(on) =>
                                                            onToggleColumn(
                                                                bucket.key,
                                                                on,
                                                            )
                                                        }
                                                    />
                                                </td>
                                            ))}
                                            <td
                                                className={styles.rowRemoveCell}
                                            />
                                            {showsDefaultColumn && (
                                                <td
                                                    className={
                                                        styles.defaultCell
                                                    }
                                                />
                                            )}
                                        </tr>
                                    )}

                                    {categories.map((c) => {
                                        const state = group.byCategory.get(
                                            c.id,
                                        );
                                        // Effective membership, staged edits
                                        // included: a category is in the group when
                                        // any of its options is on.
                                        const inGroup = group.buckets.some(
                                            (b) => cellOn(c.id, b.key),
                                        );
                                        return (
                                            <tr key={c.id}>
                                                <th
                                                    scope="row"
                                                    className={styles.rowName}
                                                >
                                                    {c.display}
                                                </th>

                                                {group.buckets.map((bucket) => {
                                                    const on = cellOn(
                                                        c.id,
                                                        bucket.key,
                                                    );
                                                    // Staged, not yet written:
                                                    // drawn provisional so a grid
                                                    // mid-edit never looks
                                                    // already-applied.
                                                    const isPending =
                                                        on !==
                                                        (state?.buckets.has(
                                                            bucket.key,
                                                        ) ?? false);
                                                    return (
                                                        <td key={bucket.key}>
                                                            {/* A checkbox, because
                                                            a checkbox needs no
                                                            key. These were a
                                                            filled dot and an
                                                            empty one, which
                                                            needed a line of
                                                            prose under the
                                                            grid to say which
                                                            was which — and a
                                                            grid that has to be
                                                            annotated to be
                                                            read is a grid that
                                                            does not read. */}
                                                            <input
                                                                type="checkbox"
                                                                className={`${styles.cell} ${
                                                                    isPending
                                                                        ? styles.cellPending
                                                                        : ''
                                                                }`}
                                                                disabled={busy}
                                                                checked={on}
                                                                aria-label={`${bucket.label} on ${c.display}`}
                                                                onChange={(e) =>
                                                                    onToggle(
                                                                        c.id,
                                                                        bucket.key,
                                                                        e.target
                                                                            .checked,
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                    );
                                                })}

                                                {/* Under the "+ Option" head: the
                                                row's own remove control, so a
                                                category can leave the group in
                                                one click instead of unticking
                                                every option. */}
                                                <td
                                                    className={
                                                        styles.rowRemoveCell
                                                    }
                                                >
                                                    {inGroup && (
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.rowRemove
                                                            }
                                                            disabled={busy}
                                                            title={`Remove ${group.name} from ${c.display}`}
                                                            aria-label={`Remove ${group.name} from ${c.display}`}
                                                            onClick={() =>
                                                                onRemoveCategory(
                                                                    c.id,
                                                                )
                                                            }
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </td>

                                                {showsDefaultColumn && (
                                                    <td
                                                        className={
                                                            styles.defaultCell
                                                        }
                                                    >
                                                        {state ? (
                                                            <select
                                                                className={
                                                                    styles.defaultSelect
                                                                }
                                                                value={
                                                                    state.defaultBucket ??
                                                                    ''
                                                                }
                                                                disabled={busy}
                                                                aria-label={`On ${c.display}, a run with no ${group.name} goes to`}
                                                                onChange={(e) =>
                                                                    onDefault(
                                                                        c.id,
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            >
                                                                {group.buckets
                                                                    .filter(
                                                                        (b) =>
                                                                            state.buckets.has(
                                                                                b.key,
                                                                            ),
                                                                    )
                                                                    .map(
                                                                        (b) => (
                                                                            <option
                                                                                key={
                                                                                    b.key
                                                                                }
                                                                                value={
                                                                                    b.key
                                                                                }
                                                                            >
                                                                                {
                                                                                    b.label
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
                                                            </select>
                                                        ) : (
                                                            <span
                                                                className={
                                                                    styles.defaultNone
                                                                }
                                                            >
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Board order, in words. Reordering is rare; the head
                        carries the frequent controls (rename, delete, collapse)
                        and this stays at the foot. Only shown when there's more
                        than one group to order. */}
                    {groupTotal > 1 && (
                        <div className={styles.paletteFoot}>
                            <button
                                type="button"
                                className={styles.orderAction}
                                disabled={busy || position === 0}
                                onClick={() => onMove(-1)}
                            >
                                Move up
                            </button>
                            <button
                                type="button"
                                className={styles.orderAction}
                                disabled={busy || position === groupTotal - 1}
                                onClick={() => onMove(1)}
                            >
                                Move down
                            </button>
                        </div>
                    )}

                    {/* The mod-facing note. It came over when the per-category
                        variable form was retired — the field is stored per row
                        and had nowhere else left to be written. */}
                    <GroupNote
                        note={noteOf(group)}
                        busy={busy}
                        onSave={onNote}
                    />

                    {/* Only when the categories disagree, because only then is
                        there a column to explain. When they agree the sentence
                        above the grid carries this and the column is gone. */}
                    {showsDefaultColumn && (
                        <p className={styles.gridNote}>
                            These categories want different answers for a run
                            that doesn&rsquo;t set this, so each one names its
                            own.
                        </p>
                    )}

                    {/* Conversion runs one way only, and only from here.
                        Promoting a filter is additive — the board gains
                        leaderboards it did not have. The reverse deletes them,
                        along with every record they held, and it sat at the
                        foot of every subcategory group as a chip you could
                        reach by accident. A demotion that destructive is not a
                        routine action; the only place it stays offered is the
                        drift strip above, where it repairs a contradiction
                        rather than creating one. */}
                    {role === 'filter' && (
                        <div className={styles.paletteFoot}>
                            <button
                                type="button"
                                className={styles.convertAction}
                                disabled={busy}
                                onClick={() => onConvert('subcategory')}
                            >
                                {conversionLabel('subcategory')}
                            </button>
                            {/* The label names the destination; this names what
                                it does to the board. */}
                            <span className={styles.convertNote}>
                                {conversionNote('subcategory')}
                            </span>
                            {isTarget && (
                                <span className={styles.savingNote}>
                                    Saving…
                                </span>
                            )}
                        </div>
                    )}

                    {/* Only splits stage. Details have already been written by
                        the time this would render. */}
                    {role === 'subcategory' && pendingCount > 0 && (
                        <div className={styles.pendingBar}>
                            <span className={styles.pendingLabel}>
                                {pendingCount}{' '}
                                {pendingCount === 1 ? 'category' : 'categories'}{' '}
                                changed, not applied yet
                            </span>
                            <span className={styles.pendingSpacer} />
                            <button
                                type="button"
                                className={styles.pendingBtn}
                                disabled={busy}
                                onClick={onDiscard}
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                className={styles.pendingApply}
                                disabled={busy}
                                onClick={onApply}
                            >
                                Preview &amp; apply
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/** The blank an "+ Option" editor starts from. */
const NEW_BUCKET: BoardBucket = { key: '', label: '', aliases: [] };

/**
 * Renaming the group, in the head, where its name is.
 *
 * Board-level by necessity: a name that drifted per category is how a board
 * ends up with "Platform" on half of it and "System" on the rest, which reads
 * as two groups and is one.
 */
function RenameGroup({
    role,
    current,
    busy,
    takenNames,
    onCancel,
    onRename,
}: {
    role: VariableRoleId;
    current: string;
    busy: boolean;
    takenNames: Set<string>;
    onCancel: () => void;
    onRename: (next: string) => void;
}) {
    const [name, setName] = useState(current);
    const trimmed = name.trim();
    const normalized = normalizeName(trimmed);
    // Its own current name is not a collision with itself.
    const collision =
        trimmed.length > 0 &&
        normalized !== normalizeName(current) &&
        takenNames.has(normalized)
            ? `${trimmed} already exists on this board.`
            : null;
    const ready =
        trimmed.length > 0 && trimmed !== current && collision === null;

    return (
        // Stops clicks reaching the bar behind it, which would collapse the
        // panel mid-rename.
        <div className={styles.renameRow} onClick={(e) => e.stopPropagation()}>
            <label className={styles.renameField}>
                <span className="visually-hidden">
                    {role === 'subcategory'
                        ? 'Subcategory group name'
                        : 'Filter name'}
                </span>
                <input
                    className={styles.renameInput}
                    value={name}
                    disabled={busy}
                    aria-label={`Rename ${current}`}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && ready) onRename(trimmed);
                        if (e.key === 'Escape') onCancel();
                    }}
                />
            </label>
            {collision && <span className={styles.addError}>{collision}</span>}
            <span className={styles.pendingSpacer} />
            <button
                type="button"
                className={styles.pendingBtn}
                disabled={busy}
                onClick={onCancel}
            >
                Cancel
            </button>
            <button
                type="button"
                className={styles.pendingApply}
                disabled={busy || !ready}
                onClick={() => onRename(trimmed)}
            >
                Rename
            </button>
        </div>
    );
}
