'use client';

import { useEffect, useState } from 'react';
import {
    BUILT_IN_FILTERS,
    SECTION,
    type VariableRoleId,
} from '~src/lib/variables/language';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import { normalizeName, RESERVED_NAMES } from './variable-keys';
import styles from './variables-grid.module.scss';

/**
 * Creating one, without ever asking for a role: the section already answered
 * that question, so the form only collects a name and the options.
 */
export function AddVariableForm({
    role,
    busy,
    takenNames,
    categories,
    suggestedNames,
    initialName = '',
    initialRaw = '',
    initialSelectedIds,
    onCancel,
    onCreate,
}: {
    role: VariableRoleId;
    busy: boolean;
    takenNames: Set<string>;
    categories: ResolvedCategory[];
    suggestedNames: Set<string>;
    /** Prefill from a suggestion: name, the grouped `label, alias…` lines, and
     *  the categories the variable is relevant in (checked by default). */
    initialName?: string;
    initialRaw?: string;
    initialSelectedIds?: number[];
    onCancel: () => void;
    onCreate: (
        name: string,
        key: string,
        options: string[][],
        defaultIndex: number,
        showValueOnBoard: boolean,
        categoryIds: number[],
    ) => void;
}) {
    const [name, setName] = useState(initialName);
    // The LiveSplit variable name — what runs are matched on (the key). It
    // auto-follows the display name until the moderator edits it, so the common
    // case (they're the same) stays one field. A suggestion prefills it from
    // real submitted data, so it starts "touched" and won't drift.
    const [liveVar, setLiveVar] = useState(initialName);
    const [liveVarTouched, setLiveVarTouched] = useState(
        initialName.trim().length > 0,
    );
    const [raw, setRaw] = useState(initialRaw);
    const [defaultOption, setDefaultOption] = useState('');
    // Filters only: create the variable already showing its value as a board
    // column. Default off — most filters just narrow the board.
    const [showValueOnBoard, setShowValueOnBoard] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>(
        initialSelectedIds ?? categories.map((c) => c.id),
    );
    const toggleCategory = (id: number) =>
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    // One option per line, its accepted spellings after a comma:
    //
    //     Nintendo 64, n64, nin64
    //
    // Same convention the option editor already uses for aliases. Options used
    // to be created bare, so every board with spelling variants — which is
    // most of them — meant creating the group and then reopening each option
    // one at a time to add them.
    const options = raw
        .split('\n')
        .map((line) =>
            line
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean),
        )
        .filter((bucket) => bucket.length > 0);
    const labels = options.map((o) => o[0]);

    // Where unmatched runs land was silently the first option typed, stated in
    // the note under the form and choosable nowhere. It falls back to the first
    // if the chosen one is edited away, which is the same rule the grid uses.
    const defaultIndex = Math.max(0, labels.indexOf(defaultOption));

    // Until the moderator edits the LiveSplit field, it mirrors the display
    // name — so the common case (the two are the same) is still one field.
    useEffect(() => {
        if (!liveVarTouched) setLiveVar(name);
    }, [name, liveVarTouched]);

    // `name` is the DISPLAY name shown above the board's buttons; the key
    // (nameNormalized) is the normalized LiveSplit variable runs match on.
    const normalizedKey = normalizeName(liveVar);
    const collision =
        normalizedKey.length > 0 && takenNames.has(normalizedKey)
            ? BUILT_IN_FILTERS.some(
                  (f) => normalizeName(f) === normalizedKey,
              ) || RESERVED_NAMES.includes(normalizedKey)
                ? `${liveVar.trim()} is already a built-in filter.`
                : `${liveVar.trim()} already exists on this board.`
            : null;

    // Off-list warning: a variable few runners submit anywhere isn't among the
    // suggestions. Non-blocking — the moderator may know something the data
    // doesn't reflect yet (a new category, an upcoming rule).
    const offList =
        normalizedKey.length > 0 &&
        collision === null &&
        !suggestedNames.has(normalizedKey);

    const ready =
        name.trim().length > 0 &&
        normalizedKey.length > 0 &&
        options.length > 0 &&
        collision === null &&
        selectedIds.length > 0;

    return (
        <div className={styles.addForm}>
            <label className={styles.addField}>
                <span className={styles.addLabel}>
                    {role === 'subcategory'
                        ? 'Subcategory display name'
                        : 'Filter display name'}
                </span>
                <input
                    className={styles.addInput}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                        role === 'subcategory' ? 'Solo or Co-op?' : 'Controller'
                    }
                />
            </label>
            <p className={styles.addNote}>
                Shown above the board’s buttons — make it friendly.
            </p>

            <label className={styles.addField}>
                <span className={styles.addLabel}>
                    Variable name in LiveSplit
                </span>
                <input
                    className={styles.addInput}
                    value={liveVar}
                    onChange={(e) => {
                        setLiveVarTouched(true);
                        setLiveVar(e.target.value);
                    }}
                    placeholder={role === 'subcategory' ? 'coop' : 'controller'}
                />
            </label>
            <p className={styles.addNote}>
                What runners set in their splits — runs are matched on this.
                Defaults to the display name; change it only if the two differ.
            </p>

            <label className={styles.addField}>
                <span className={styles.addLabel}>
                    {SECTION[role].options}, one per line — add other accepted
                    spellings after a comma
                </span>
                <textarea
                    className={styles.addTextarea}
                    rows={4}
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder={
                        role === 'subcategory'
                            ? 'Nintendo 64, n64, nin64\nVirtual Console, vc\nEmulator, emu'
                            : 'Keyboard, kb\nController, pad'
                    }
                />
            </label>

            {/* Asked, not assumed. This was silently the first option typed —
                stated in the note underneath and choosable nowhere, so getting
                it wrong meant creating the group and then fixing it. */}
            {role === 'subcategory' && options.length > 1 && (
                <label className={styles.addField}>
                    <span className={styles.addLabel}>
                        A run that doesn&rsquo;t set this counts as
                    </span>
                    <select
                        className={styles.addInput}
                        value={labels[defaultIndex]}
                        disabled={busy}
                        onChange={(e) => setDefaultOption(e.target.value)}
                    >
                        {labels.map((o) => (
                            <option key={o} value={o}>
                                {o}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            <div className={styles.addField}>
                <span className={styles.addLabel}>
                    Add to which{' '}
                    {role === 'subcategory' ? 'boards' : 'categories'}
                </span>
                <div className={styles.addCategories}>
                    {categories.map((c) => (
                        <label key={c.id} className={styles.addCategory}>
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(c.id)}
                                disabled={busy}
                                onChange={() => toggleCategory(c.id)}
                            />
                            {c.display}
                        </label>
                    ))}
                </div>
            </div>

            <label className={styles.showValueRow}>
                <input
                    type="checkbox"
                    checked={showValueOnBoard}
                    disabled={busy}
                    onChange={(e) => setShowValueOnBoard(e.target.checked)}
                />
                <span className={styles.showValueText}>
                    Show this as a value on the leaderboard row
                    <span className={styles.showValueHint}>
                        Adds a {name.trim() || 'variable'} column to the board
                        with each runner&rsquo;s value.
                    </span>
                </span>
            </label>

            {collision && <p className={styles.addError}>{collision}</p>}
            {offList && (
                <p className={styles.addWarning}>
                    Few runners set &ldquo;{name.trim()}&rdquo; — it isn&rsquo;t
                    among the suggested variables. You can still add it.
                </p>
            )}

            <p className={styles.addNote}>
                {role === 'subcategory'
                    ? options.length > 1
                        ? `Each of the ${selectedIds.length} selected ${
                              selectedIds.length === 1
                                  ? 'category is'
                                  : 'categories are'
                          } multiplied by ${options.length} — every one splits into ${options.length} subcategories with their own records.`
                        : 'A subcategory group needs at least two options to split anything.'
                    : `Added to ${selectedIds.length} ${
                          selectedIds.length === 1 ? 'category' : 'categories'
                      }. No subcategories, no effect on records.`}
            </p>

            <div className={styles.addActions}>
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
                    onClick={() =>
                        onCreate(
                            name.trim(),
                            normalizedKey,
                            options,
                            defaultIndex,
                            showValueOnBoard,
                            selectedIds,
                        )
                    }
                >
                    {role === 'subcategory' ? 'Preview & add' : 'Add'}
                </button>
            </div>
        </div>
    );
}
