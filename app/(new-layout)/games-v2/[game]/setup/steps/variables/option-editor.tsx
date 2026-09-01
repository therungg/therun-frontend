'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'react-bootstrap-icons';
import type { BoardBucket } from '~src/lib/setup/variable-view';
import { SECTION, type VariableRoleId } from '~src/lib/variables/language';
import styles from './variables-grid.module.scss';

/**
 * What an option *is*, edited in place under its own row.
 *
 * Everything here is board-level and fans out to every category carrying the
 * option: a rename means the same rename everywhere, and letting a name drift
 * per category is how a board ends up with two options that are the same
 * option. Which categories carry it stays the grid's job, one row up.
 *
 * Nothing writes on keystroke — a rename relocates runs, so the whole edit is
 * one previewed change.
 *
 * The same editor creates one (`isNew`): a new option asks the same three
 * questions an existing one does, so it gets the same form rather than a
 * second one that drifts from it. Reordering and removing are hidden there,
 * because there is nothing yet to move or remove.
 */
export function OptionEditor({
    bucket,
    index,
    total,
    role,
    busy,
    buckets,
    isNew = false,
    onCancel,
    onApply,
}: {
    bucket: BoardBucket;
    index: number;
    total: number;
    role: VariableRoleId;
    busy: boolean;
    buckets: BoardBucket[];
    isNew?: boolean;
    onCancel: () => void;
    onApply: (next: BoardBucket[]) => void;
}) {
    const [label, setLabel] = useState(bucket.label);
    const [aliasText, setAliasText] = useState(bucket.aliases.join(', '));

    const aliases = aliasText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

    const trimmed = label.trim();

    const replaced = (): BoardBucket[] =>
        isNew
            ? [
                  ...buckets,
                  { key: trimmed.toLowerCase(), label: trimmed, aliases },
              ]
            : buckets.map((b) =>
                  b.key === bucket.key ? { ...b, label: trimmed, aliases } : b,
              );

    // A second option spelled the same as an existing one would silently merge
    // into it on the next read, so it is caught here instead.
    const duplicate =
        isNew &&
        trimmed.length > 0 &&
        buckets.some((b) => b.key === trimmed.toLowerCase());

    const move = (delta: number) => {
        const next = [...buckets];
        const [moved] = next.splice(index, 1);
        next.splice(index + delta, 0, moved);
        onApply(next);
    };

    const dirty =
        label.trim() !== bucket.label ||
        // A separator no alias can contain. Written as an escape, not a
        // literal NUL: a raw one in the source makes git and grep treat
        // this whole file as binary.
        aliases.join('\u0000') !== bucket.aliases.join('\u0000');

    return (
        <div className={styles.optionEditor}>
            <label className={styles.optionField}>
                <span className={styles.addLabel}>Name</span>
                <input
                    className={styles.addInput}
                    value={label}
                    disabled={busy}
                    onChange={(e) => setLabel(e.target.value)}
                />
            </label>

            <label className={styles.optionField}>
                <span className={styles.addLabel}>
                    Also accepted, comma separated
                </span>
                <input
                    className={styles.addInput}
                    value={aliasText}
                    disabled={busy}
                    placeholder="n64, nin64"
                    onChange={(e) => setAliasText(e.target.value)}
                />
            </label>

            {duplicate && (
                <p className={styles.addError}>
                    {trimmed} is already an option here.
                </p>
            )}

            <div className={styles.optionActions}>
                {!isNew && (
                    <>
                        {/* Options became COLUMNS when this grid was
                            transposed; these still said up and down, which
                            pointed at an axis the options no longer sit on. */}
                        <button
                            type="button"
                            className={styles.pendingBtn}
                            disabled={busy || index === 0}
                            aria-label={`Move ${bucket.label} left`}
                            onClick={() => move(-1)}
                        >
                            <ArrowLeft size={16} aria-hidden />
                        </button>
                        <button
                            type="button"
                            className={styles.pendingBtn}
                            disabled={busy || index === total - 1}
                            aria-label={`Move ${bucket.label} right`}
                            onClick={() => move(1)}
                        >
                            <ArrowRight size={16} aria-hidden />
                        </button>
                        <button
                            type="button"
                            className={styles.optionRemove}
                            disabled={busy}
                            onClick={() =>
                                onApply(
                                    buckets.filter((b) => b.key !== bucket.key),
                                )
                            }
                        >
                            Remove from every category
                        </button>
                    </>
                )}
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
                    disabled={
                        busy || !dirty || duplicate || trimmed.length === 0
                    }
                    onClick={() => onApply(replaced())}
                >
                    {isNew ? 'Preview & add' : 'Preview & apply'}
                </button>
            </div>

            <p className={styles.optionNote}>
                {role === 'subcategory'
                    ? 'Renaming moves every run in this subcategory. Left to right is the order runners see.'
                    : 'Spellings runners have used are matched against this list, so old runs keep resolving.'}
            </p>
        </div>
    );
}
