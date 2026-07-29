'use client';

import {
    describeSource,
    type EffectiveVariable,
    toEffective,
} from '~src/lib/variables/effective';
import { boardCountLabel } from '~src/lib/variables/language';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import styles from './variables.module.scss';

interface Props {
    /** Merged, published rows exactly as the public board receives them. */
    merged: VariableRow[];
    /** Admin list for categoryId=null — tells us which rows are shadowed. */
    gameWide: VariableRow[];
    categoryDisplay: string;
    onJump: (variable: EffectiveVariable) => void;
}

/**
 * Zone 1: what runners actually see on this board.
 *
 * Fed by the same merged list the public page renders, not re-derived here —
 * the panel cannot promise something the board does not do. This is the one
 * place a mod can answer "what does this board look like now?" without
 * leaving the console.
 */
export function InEffectPanel({
    merged,
    gameWide,
    categoryDisplay,
    onJump,
}: Props) {
    const effective = toEffective(merged, gameWide);

    return (
        <section className={styles.inEffect} aria-labelledby="in-effect-title">
            <header className={styles.inEffectHead}>
                <h3 id="in-effect-title" className={styles.inEffectTitle}>
                    In effect on {categoryDisplay}
                </h3>
                <span className={styles.inEffectNote}>what runners see</span>
            </header>

            {effective.length === 0 ? (
                <p className={styles.inEffectEmpty}>
                    No variables. {categoryDisplay} is a single leaderboard.
                </p>
            ) : (
                <ul className={styles.inEffectList}>
                    {effective.map((v) => (
                        <li
                            key={`${v.categoryId ?? 'game'}-${v.nameNormalized}`}
                        >
                            <button
                                type="button"
                                className={styles.inEffectRow}
                                onClick={() => onJump(v)}
                            >
                                <span className={styles.inEffectName}>
                                    {v.name}
                                </span>
                                <span className={styles.inEffectRole}>
                                    {boardCountLabel(v.role, v.values.length)}
                                </span>
                                <span
                                    className={
                                        v.source === 'category-overrides-shared'
                                            ? styles.sourceOverride
                                            : styles.source
                                    }
                                >
                                    {describeSource(
                                        v.source,
                                        categoryDisplay,
                                        v.name,
                                    )}
                                </span>
                                <span className={styles.inEffectValues}>
                                    {v.values.map((b) => b[0]).join(' · ')}
                                </span>
                                {v.role === 'subcategory' &&
                                    v.defaultValueIndex != null && (
                                        <span
                                            className={styles.inEffectDefault}
                                        >
                                            used when a run doesn&apos;t say:{' '}
                                            {v.values[v.defaultValueIndex]?.[0]}
                                        </span>
                                    )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
