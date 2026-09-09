'use client';

import { useState, useTransition } from 'react';
import { Check } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { setLevelVariantsAction } from '~src/actions/levels/set-level-variants.action';
import type { LevelOverview } from '../../../../../../types/levels.types';
import styles from './levels.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    overview: LevelOverview;
    onSaved: () => void | Promise<void>;
}

type Level = LevelOverview['levels'][number];

/**
 * Levels down one axis, subcategories across the other.
 *
 * A level carries its subcategories as values of its own variable, so a level
 * with a cell off simply does not have that value — that is the whole meaning
 * of "this subcategory is not on this level". Each cell is a switch; a column
 * head switches the whole column and a row's tail the whole row. The grid
 * shows its own state as soon as you click and writes behind it, reverting
 * the cell if the write fails.
 */
export function LevelSubcategoryMatrix({
    gameSlug,
    gameId,
    overview,
    onSaved,
}: Props) {
    const [pending, startTransition] = useTransition();
    const variants = [...overview.templates].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
    );
    const levels = overview.levels;
    const order = variants.map((v) => v.display);

    // What the grid shows: the overview's lists, until a click moves ahead
    // of the server. Keyed by level id, values in the game's own order.
    const [carried, setCarried] = useState<Map<number, string[]>>(
        () => new Map(levels.map((l) => [l.categoryId, l.variants])),
    );
    // A reload hands over a fresh list, and the server's word replaces
    // whatever the grid ran ahead with.
    const [seenLevels, setSeenLevels] = useState(levels);
    if (seenLevels !== levels) {
        setSeenLevels(levels);
        setCarried(new Map(levels.map((l) => [l.categoryId, l.variants])));
    }

    if (levels.length === 0 || variants.length === 0) return null;

    const has = (levelId: number, display: string) =>
        (carried.get(levelId) ?? []).includes(display);

    // Keep the game's own order rather than click order, so the board reads
    // the same however the grid was filled in.
    const withSet = (levelId: number, display: string, on: boolean) =>
        order.filter((d) =>
            d === display ? on : (carried.get(levelId) ?? []).includes(d),
        );

    const write = (changes: Array<{ level: Level; next: string[] }>) => {
        if (changes.length === 0) return;
        const before = new Map(carried);
        setCarried((prev) => {
            const map = new Map(prev);
            for (const c of changes) map.set(c.level.categoryId, c.next);
            return map;
        });
        startTransition(async () => {
            let failed = false;
            for (const c of changes) {
                const res = await setLevelVariantsAction({
                    gameSlug,
                    gameId,
                    categoryId: c.level.categoryId,
                    variants: c.next,
                });
                if ('error' in res && res.error) {
                    failed = true;
                    toast.error(`${c.level.display}: ${res.error}`);
                    setCarried((prev) => {
                        const map = new Map(prev);
                        map.set(
                            c.level.categoryId,
                            before.get(c.level.categoryId) ?? [],
                        );
                        return map;
                    });
                }
            }
            if (!failed) await onSaved();
        });
    };

    const toggleCell = (level: Level, display: string) =>
        write([
            {
                level,
                next: withSet(
                    level.categoryId,
                    display,
                    !has(level.categoryId, display),
                ),
            },
        ]);

    // A column is switched to whatever most of it is not: a full column
    // clears, anything less fills.
    const toggleColumn = (display: string) => {
        const onCount = levels.filter((l) => has(l.categoryId, display)).length;
        const fill = onCount < levels.length;
        write(
            levels
                .filter((l) => has(l.categoryId, display) !== fill)
                .map((l) => ({
                    level: l,
                    next: withSet(l.categoryId, display, fill),
                })),
        );
    };

    const toggleRow = (level: Level) => {
        const current = carried.get(level.categoryId) ?? [];
        const fill = current.length < order.length;
        write([{ level, next: fill ? [...order] : [] }]);
    };

    const columnCount = (display: string) =>
        levels.filter((l) => has(l.categoryId, display)).length;

    return (
        <section className={styles.section} aria-labelledby="level-grid-title">
            <div className={styles.sectionHead}>
                <span className={styles.sectionTitle} id="level-grid-title">
                    Subcategories per level
                </span>
                <span className={styles.sectionCount}>
                    click a cell, a column head or a row count
                </span>
            </div>
            <div className={styles.gridScroller}>
                <table className={styles.grid}>
                    <thead>
                        <tr>
                            <th scope="col" className={styles.gridCorner}>
                                Level
                            </th>
                            {variants.map((v) => {
                                const n = columnCount(v.display);
                                return (
                                    <th
                                        key={v.id}
                                        scope="col"
                                        className={styles.gridColHead}
                                    >
                                        <button
                                            type="button"
                                            className={styles.colToggle}
                                            disabled={pending}
                                            title={
                                                n === levels.length
                                                    ? `Take ${v.display} off every level`
                                                    : `Put ${v.display} on every level`
                                            }
                                            onClick={() =>
                                                toggleColumn(v.display)
                                            }
                                        >
                                            <span className={styles.colName}>
                                                {v.display}
                                            </span>
                                            <span className={styles.colCount}>
                                                {n}/{levels.length}
                                            </span>
                                        </button>
                                    </th>
                                );
                            })}
                            <th scope="col" className={styles.gridColTail}>
                                <span className="visually-hidden">
                                    Subcategories on this level
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {levels.map((l) => {
                            const count = (carried.get(l.categoryId) ?? [])
                                .length;
                            return (
                                <tr key={l.categoryId}>
                                    <th
                                        scope="row"
                                        className={styles.gridRowHead}
                                    >
                                        {l.display}
                                    </th>
                                    {variants.map((v) => {
                                        const on = has(l.categoryId, v.display);
                                        return (
                                            <td
                                                key={v.id}
                                                className={styles.gridCell}
                                            >
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={on}
                                                    aria-label={`${v.display} on ${l.display}`}
                                                    className={`${styles.toggle} ${
                                                        on
                                                            ? styles.toggleOn
                                                            : ''
                                                    }`}
                                                    disabled={pending}
                                                    onClick={() =>
                                                        toggleCell(l, v.display)
                                                    }
                                                >
                                                    <Check
                                                        size={16}
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            </td>
                                        );
                                    })}
                                    <td className={styles.gridRowTail}>
                                        <button
                                            type="button"
                                            className={styles.rowToggle}
                                            disabled={pending}
                                            title={
                                                count === order.length
                                                    ? `Clear ${l.display}`
                                                    : `Put every subcategory on ${l.display}`
                                            }
                                            onClick={() => toggleRow(l)}
                                        >
                                            {count}/{order.length}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
