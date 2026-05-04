'use client';

import type { GameCategory } from '../../../../types/tournament.types';
import styles from './tournament-form.module.scss';

export function EligibleRunsEditor({
    value,
    onChange,
}: {
    value: GameCategory[];
    onChange: (next: GameCategory[]) => void;
}) {
    function update(i: number, patch: Partial<GameCategory>) {
        onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    }
    function remove(i: number) {
        onChange(value.filter((_, idx) => idx !== i));
    }
    function add() {
        onChange([...value, { game: '', category: '' }]);
    }

    return (
        <div className={styles.repeaterList}>
            {value.length === 0 && (
                <div className={styles.repeaterEmpty}>
                    Add at least one game/category combo that runs must match to
                    count.
                </div>
            )}
            {value.map((r, i) => (
                <div key={i} className={styles.repeaterRow}>
                    <div className={styles.repeaterIndex}>#{i + 1}</div>
                    <div className={styles.repeaterFields}>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>Game</label>
                            <input
                                className={styles.input}
                                placeholder="e.g. Super Mario 64"
                                value={r.game}
                                onChange={(e) =>
                                    update(i, { game: e.target.value })
                                }
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>
                                Category
                            </label>
                            <input
                                className={styles.input}
                                placeholder="e.g. 16 Star"
                                value={r.category}
                                onChange={(e) =>
                                    update(i, { category: e.target.value })
                                }
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.repeaterRemove}
                        onClick={() => remove(i)}
                    >
                        Remove
                    </button>
                </div>
            ))}
            <button type="button" className={styles.repeaterAdd} onClick={add}>
                + Add another game/category
            </button>
        </div>
    );
}
