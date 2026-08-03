'use client';

import type { EffectiveVariable } from '~src/lib/variables/effective';
import band from '../../header/masthead.module.scss';
import styles from './variables.module.scss';

interface Props {
    /** Effective (merged, published) rows — what the board actually renders. */
    variables: EffectiveVariable[];
    /** "Every category" (game scope) or the category's display name. */
    contextLabel: string;
}

/**
 * The result, before the theory: the subcategory tier exactly as the public
 * masthead renders it (name endcap, one pill per value, default lit), so
 * "what does a subcategory do?" is answered by looking at it instead of by
 * three paragraphs of role prose. Filters trail as ghost chips — present,
 * but visibly not board-splitting.
 */
export function VariableBandPreview({ variables, contextLabel }: Props) {
    const published = variables.filter((v) => v.published);
    const subs = published.filter((v) => v.role === 'subcategory');
    const filters = published.filter((v) => v.role === 'filter');

    const boardCount = subs.reduce(
        (n, v) => n * Math.max(1, v.values.length),
        1,
    );

    return (
        <div className={styles.bandPreview}>
            <p className={styles.bandHeadline}>
                {subs.length === 0 ? (
                    <>
                        <strong>{contextLabel}</strong> is a single leaderboard
                        — no subcategories split it
                        {filters.length > 0
                            ? '; filters below refine results within it.'
                            : '.'}
                    </>
                ) : (
                    <>
                        <strong>{contextLabel}</strong> splits into{' '}
                        <strong>{boardCount}</strong> leaderboards —{' '}
                        {subs.map((v) => v.name).join(' × ')}, one board per
                        combination. The lit value is the default.
                    </>
                )}
            </p>

            {subs.length > 0 && (
                <div className={band.tier}>
                    {subs.map((v) => (
                        <div key={v.id} className={band.block}>
                            <span className={band.endcap}>{v.name}</span>
                            <div className={band.well}>
                                <div className={band.chips}>
                                    {v.values.map((bucket, idx) => (
                                        <span
                                            key={bucket[0]}
                                            className={`${band.pill} ${
                                                idx === v.defaultValueIndex
                                                    ? band.pillActive
                                                    : ''
                                            }`}
                                        >
                                            {bucket[0]}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filters.length > 0 && (
                <div className={band.tier}>
                    {filters.map((v) => (
                        <div key={v.id} className={band.block}>
                            <span className={band.endcap}>{v.name}</span>
                            <div className={band.well}>
                                <div className={band.chips}>
                                    {v.values.map((bucket) => (
                                        <span
                                            key={bucket[0]}
                                            className={`${band.chip} ${band.chipGhost}`}
                                        >
                                            {bucket[0]}
                                        </span>
                                    ))}
                                    <span className={styles.filterTag}>
                                        filter
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
