'use client';

import { useTransition } from 'react';
import { toast } from 'react-toastify';
import { setLevelVariantsAction } from '~src/actions/levels/set-level-variants.action';
import type { LevelOverview } from '../../../../../../types/levels.types';
import styles from '../../setup/steps/matrix/matrix.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    overview: LevelOverview;
    onSaved: () => void | Promise<void>;
}

/**
 * Subcategories down one axis, levels across the other.
 *
 * A level carries its subcategories as values of its own variable, so a level
 * with a box unticked simply does not have that value — that is the whole
 * meaning of "this subcategory is not on this level". Ticking writes the
 * level's list back, so the grid is the list.
 */
export function LevelSubcategoryMatrix({
    gameSlug,
    gameId,
    overview,
    onSaved,
}: Props) {
    const [pending, startTransition] = useTransition();
    const variants = overview.templates;
    const levels = overview.levels;

    if (levels.length === 0 || variants.length === 0) return null;

    const toggle = (
        level: LevelOverview['levels'][number],
        variant: string,
        on: boolean,
    ) => {
        // Keep the game's own order rather than click order, so the board
        // reads the same however the grid was filled in.
        const next = variants
            .map((v) => v.display)
            .filter((d) => (d === variant ? on : level.variants.includes(d)));
        startTransition(async () => {
            const res = await setLevelVariantsAction({
                gameSlug,
                gameId,
                categoryId: level.categoryId,
                variants: next,
            });
            if ('error' in res && res.error) {
                toast.error(res.error);
                return;
            }
            await onSaved();
        });
    };

    return (
        <div className={styles.panel}>
            <div className={styles.head}>
                <div className={styles.headTitle}>Subcategories per level</div>
                <div className={styles.headCount}>
                    Untick to leave a subcategory off one level
                </div>
            </div>
            <div className={styles.scroller}>
                <table className={styles.grid}>
                    <thead>
                        <tr>
                            <th>Level</th>
                            {variants.map((v) => (
                                <th key={v.id}>{v.display}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {levels.map((l) => (
                            <tr key={l.categoryId}>
                                <td className={styles.nameCell}>
                                    <span className={styles.nameInner}>
                                        {l.display}
                                    </span>
                                </td>
                                {variants.map((v) => {
                                    const on = l.variants.includes(v.display);
                                    return (
                                        <td
                                            key={v.id}
                                            className={styles.cellControl}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={on}
                                                disabled={pending}
                                                aria-label={`${v.display} on ${l.display}`}
                                                onChange={(e) =>
                                                    toggle(
                                                        l,
                                                        v.display,
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
