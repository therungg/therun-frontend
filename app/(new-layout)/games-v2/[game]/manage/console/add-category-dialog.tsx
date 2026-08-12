'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';
import { formatCount, formatHours } from '~src/utils/format-stats';
import { curateCategoryAction } from '../../setup/actions/curate-category.action';
import type { CategorySeed } from '../../setup/steps/category-seed';
import { BoardDialog } from '../../shared/board-dialog';
import styles from './board-categories.module.scss';

/** Rows rendered before the list is cut and search takes over. */
const VISIBLE_ROW_LIMIT = 50;

/** In-flight category writes while adding. */
const ADD_CONCURRENCY = 6;

interface Props {
    open: boolean;
    onClose: () => void;
    game: { id: number; name: string };
    /** Categories that exist but are not on the board. */
    pool: ManageCategoryRow[];
    /**
     * Game defaults to stamp onto a category as it lands on the board. Null
     * for a viewer whose console never loaded the game's metadata (moderator
     * without configure) — the category is then featured as-is.
     */
    seed: CategorySeed | null;
    /** Ids whose own rules are still empty — gates the seed's rules template. */
    rulesEmptyIds: Set<number>;
    /** Ids that landed on the board, so the caller can update its rows. */
    onAdded: (ids: number[]) => void;
}

/**
 * Picking a category to put on the board.
 *
 * The board itself is a handful of categories; the pool behind this dialog is
 * everything else the game has ever seen — hundreds of rows on a big game,
 * most of them junk harvested from LiveSplit splits. So it opens on the
 * busiest few by unique runners (a signal one prolific runner can't inflate
 * the way raw run count can) and lets search reach the rest, exactly as the
 * setup wizard's step 2 does.
 *
 * Adding here seeds the category from the game's defaults, same as the wizard:
 * a category that has never been configured should not land on the board with
 * no timing and no rules.
 */
export function AddCategoryDialog({
    open,
    onClose,
    game,
    pool,
    seed,
    rulesEmptyIds,
    onAdded,
}: Props) {
    const [query, setQuery] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [progress, setProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Every open starts clean — this instance is reused across opens.
    useEffect(() => {
        if (!open) return;
        setQuery('');
        setShowAll(false);
        setSelected(new Set());
        setProgress(null);
        setError(null);
    }, [open]);

    const ranked = useMemo(
        () =>
            [...pool].sort(
                (a, b) =>
                    b.uniqueRunners - a.uniqueRunners ||
                    b.totalFinishedAttemptCount - a.totalFinishedAttemptCount,
            ),
        [pool],
    );

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q
            ? ranked.filter((r) => r.display.toLowerCase().includes(q))
            : ranked;
    }, [ranked, query]);

    // A ticked category is always rendered, however far down it ranks, or a
    // pick could scroll out of existence between selecting and confirming.
    const visible = useMemo(() => {
        if (showAll || query.trim() || matches.length <= VISIBLE_ROW_LIMIT) {
            return matches;
        }
        const head = matches.slice(0, VISIBLE_ROW_LIMIT);
        const headIds = new Set(head.map((r) => r.id));
        const tickedBelow = matches
            .slice(VISIBLE_ROW_LIMIT)
            .filter((r) => selected.has(r.id) && !headIds.has(r.id));
        return [...head, ...tickedBelow];
    }, [matches, query, showAll, selected]);

    const hiddenCount = matches.length - visible.length;
    const maxRunners = Math.max(1, ...ranked.map((r) => r.uniqueRunners));
    const pending = progress !== null;

    const toggle = (id: number, checked: boolean) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });

    const submit = async () => {
        const ids = [...selected];
        if (ids.length === 0 || pending) return;
        setError(null);

        let done = 0;
        const added: number[] = [];
        const failed: number[] = [];
        setProgress(`Adding 0 / ${ids.length}…`);

        // Bounded parallelism: adding a dozen categories one round trip at a
        // time is a visible wait for no reason.
        const queue = [...ids];
        const worker = async () => {
            for (;;) {
                const id = queue.shift();
                if (id === undefined) return;
                const res = await curateCategoryAction({
                    gameSlug: game.name,
                    gameId: game.id,
                    categoryId: id,
                    isMain: true,
                    ...(seed
                        ? {
                              seed,
                              currentRulesEmpty: rulesEmptyIds.has(id),
                          }
                        : {}),
                });
                done++;
                setProgress(`Adding ${done} / ${ids.length}…`);
                if ('error' in res) failed.push(id);
                else added.push(id);
            }
        };
        await Promise.all(
            Array.from(
                { length: Math.min(ADD_CONCURRENCY, ids.length) },
                worker,
            ),
        );

        setProgress(null);
        if (added.length > 0) onAdded(added);
        if (failed.length > 0) {
            setSelected(new Set(failed));
            setError(
                `${failed.length} of ${ids.length} could not be added. Try again.`,
            );
            return;
        }
        onClose();
    };

    return (
        <BoardDialog
            open={open}
            onClose={() => {
                if (!pending) onClose();
            }}
            labelledBy="add-category-title"
            size="lg"
            initialFocusRef={searchRef}
            closeOnBackdropClick={!pending}
        >
            <div className={styles.dialogHeader}>
                <h5 className={styles.dialogTitle} id="add-category-title">
                    Add a category to the board
                </h5>
            </div>
            <div className={styles.dialogBody}>
                <p className={styles.dialogLede}>
                    Categories runners have already submitted to, busiest first.
                    Adding one puts it on the public board with this game's
                    default timing and rules.
                </p>

                <div className={styles.pickerSearch}>
                    <input
                        ref={searchRef}
                        type="search"
                        className={`form-control form-control-sm ${styles.searchInput}`}
                        placeholder={`Search ${pool.length.toLocaleString()} categories…`}
                        aria-label="Search categories"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <span className={styles.pickerMeta}>
                        {query.trim()
                            ? `${matches.length.toLocaleString()} match${
                                  matches.length === 1 ? '' : 'es'
                              }`
                            : `${visible.length.toLocaleString()} of ${pool.length.toLocaleString()}`}
                    </span>
                </div>

                {pool.length === 0 ? (
                    <p className={styles.pickerMeta}>
                        Every category with runs is already on the board.
                    </p>
                ) : (
                    <div className={styles.pickerList}>
                        {visible.map((r) => (
                            <label key={r.id} className={styles.pickerRow}>
                                <input
                                    type="checkbox"
                                    className="form-check-input mt-0"
                                    checked={selected.has(r.id)}
                                    disabled={pending}
                                    onChange={(e) =>
                                        toggle(r.id, e.target.checked)
                                    }
                                />
                                <span className={styles.pickerName}>
                                    {r.display}
                                    <span
                                        className={styles.bar}
                                        aria-hidden="true"
                                    >
                                        <span
                                            className={styles.barFill}
                                            style={{
                                                width: `${Math.max(
                                                    4,
                                                    Math.round(
                                                        (r.uniqueRunners /
                                                            maxRunners) *
                                                            100,
                                                    ),
                                                )}%`,
                                            }}
                                        />
                                    </span>
                                </span>
                                <span className={styles.pickerStat}>
                                    {formatCount(r.uniqueRunners)} runners
                                </span>
                                <span className={styles.pickerStat}>
                                    {formatHours(r.totalRunTime)}h
                                </span>
                            </label>
                        ))}
                    </div>
                )}

                {hiddenCount > 0 && (
                    <div className={styles.pickerFoot}>
                        <span className={styles.pickerMeta}>
                            {hiddenCount.toLocaleString()} quieter categor
                            {hiddenCount === 1 ? 'y' : 'ies'} not shown.
                        </span>
                        <button
                            type="button"
                            className={styles.showAll}
                            onClick={() => setShowAll(true)}
                        >
                            Show all
                        </button>
                    </div>
                )}

                {query.trim() && matches.length === 0 && (
                    <p className={styles.pickerMeta}>
                        No category matches “{query.trim()}”.
                    </p>
                )}

                {error && <p className={styles.pickerError}>{error}</p>}
            </div>
            <div className={styles.dialogFooter}>
                <span
                    className={styles.pickerMeta}
                    style={{ marginRight: 'auto' }}
                >
                    {progress ?? `${selected.size} selected`}
                </span>
                <button
                    type="button"
                    className={styles.cancelAction}
                    onClick={onClose}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={submit}
                    disabled={pending || selected.size === 0}
                >
                    {selected.size > 1
                        ? `Add ${selected.size} to board`
                        : 'Add to board'}
                </button>
            </div>
        </BoardDialog>
    );
}
