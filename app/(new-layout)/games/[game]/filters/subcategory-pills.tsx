'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import { resolveSubcategoryDisplayMode } from '../header/category-visibility';
import styles from '../header/masthead.module.scss';
import { useBoardNav } from './use-board-nav';

interface Props {
    defs: VariableRow[];
    selected: Record<string, string>;
    /** `nameNormalized -> canonicalValue -> runners`; see GamePageData. */
    counts: Record<string, Record<string, number>>;
}

function canonicalOf(def: VariableRow, idx: number): string {
    const bucket = def.values[idx];
    return bucket?.[0] ?? '';
}

function pendingKeyFor(def: VariableRow, value: string): string {
    return `subcat:${def.nameNormalized}:${value}`;
}

/**
 * Moderators name these variables however they like, and a good many arrive
 * phrased as the question the mod was asking ("Solo or co-op?"). As a caption
 * sitting *in front of* its own answers the question mark is noise — the
 * control already reads as a question. Trim it; leave the rest of the name
 * exactly as written.
 */
function captionOf(def: VariableRow): string {
    return def.name.replace(/\s*\?+\s*$/, '');
}

/**
 * The subcategory tier: one inline segmented control per variable.
 *
 * Each variable used to own a full labeled rail row, which made two axes look
 * like two more category bands stacked under the real one — same left label
 * gutter, same detached chips, same solid-green active state. They are not
 * peers of the category rail: the category picks *which* board, these narrow
 * the one you already picked. So they read as controls, not as a band —
 * joined segments in a track, caption inline, and the whole tier flows on one
 * wrapping line however many variables a game defines.
 */
export function SubcategoryPills({ defs, selected, counts }: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    const subcatDefs = defs.filter((d) => d.role === 'subcategory');
    if (subcatDefs.length === 0) return null;

    const onPick = (def: VariableRow, value: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set(def.nameNormalized, value);
        sp.delete('page');
        sp.delete('combined');
        navigate(`${pathname}?${sp.toString()}`, pendingKeyFor(def, value));
    };

    return (
        <>
            {subcatDefs.map((def) => {
                const defaultCanonical =
                    def.defaultValueIndex != null
                        ? canonicalOf(def, def.defaultValueIndex)
                        : '';
                const activeValue =
                    selected[def.nameNormalized] ?? defaultCanonical;
                // Optimistic selection: while this def's value-swap nav is
                // in flight, the clicked value renders active immediately,
                // and the previous value drops to rest — an in-flight nav
                // for a *different* def leaves this control untouched.
                const pendingValue = def.values
                    .map((bucket) => bucket[0])
                    .find(
                        (canonical) =>
                            isPending &&
                            pendingKey === pendingKeyFor(def, canonical),
                    );
                const optimisticActiveValue = pendingValue ?? activeValue;
                const capId = `subcat-${def.nameNormalized}`;
                const defCounts = counts[def.nameNormalized];
                // A variable with many values is a wall of segments across
                // the whole tier. Its own setting decides; 'auto' (the
                // default) draws segments until there are too many of them.
                const mode = resolveSubcategoryDisplayMode(
                    def.displayMode,
                    def.values.length,
                );
                return (
                    <div
                        key={def.nameNormalized}
                        className={styles.control}
                        role="group"
                        aria-labelledby={capId}
                        aria-busy={isPending || undefined}
                    >
                        <span className={styles.controlCap} id={capId}>
                            {captionOf(def)}
                        </span>
                        {mode === 'dropdown' ? (
                            // The same control the category rail reaches for
                            // when its pills stop fitting: a native select,
                            // already correct with a keyboard, a screen reader
                            // and a thumb. The tier is a row of small
                            // controls, so it is sized down to sit in it.
                            <select
                                className={`${styles.categorySelect} ${styles.controlSelect}`}
                                value={optimisticActiveValue}
                                onChange={(e) => onPick(def, e.target.value)}
                                aria-labelledby={capId}
                            >
                                {/* A value the URL names that this variable
                                    doesn't have: without a slot of its own the
                                    select would silently display its first
                                    option as chosen. */}
                                {!def.values.some(
                                    (bucket) =>
                                        bucket[0] === optimisticActiveValue,
                                ) && (
                                    <option value={optimisticActiveValue}>
                                        {optimisticActiveValue || 'Pick one…'}
                                    </option>
                                )}
                                {def.values.map((bucket, idx) => {
                                    const canonical = bucket[0];
                                    const count = defCounts?.[canonical];
                                    return (
                                        <option
                                            key={`${def.nameNormalized}-${idx}`}
                                            value={canonical}
                                        >
                                            {canonical}
                                            {count == null
                                                ? ''
                                                : ` · ${count.toLocaleString()} ${count === 1 ? 'runner' : 'runners'}`}
                                        </option>
                                    );
                                })}
                            </select>
                        ) : (
                            <div className={styles.segTrack}>
                                {def.values.map((bucket, idx) => {
                                    const canonical = bucket[0];
                                    const isActive =
                                        optimisticActiveValue === canonical;
                                    const count = defCounts?.[canonical];
                                    return (
                                        <button
                                            key={`${def.nameNormalized}-${idx}`}
                                            type="button"
                                            onClick={() =>
                                                onPick(def, canonical)
                                            }
                                            aria-pressed={isActive}
                                            aria-label={
                                                count == null
                                                    ? undefined
                                                    : `${canonical}, ${count} runners`
                                            }
                                            className={`${styles.seg} ${isActive ? styles.segOn : ''}`}
                                            title={
                                                bucket.length > 1
                                                    ? `Aliases: ${bucket.slice(1).join(', ')}`
                                                    : undefined
                                            }
                                        >
                                            {canonical}
                                            {count != null && (
                                                <span
                                                    aria-hidden
                                                    className={styles.segCount}
                                                >
                                                    {count.toLocaleString()}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}
