'use client';

import { VariablesSection } from '../../manage/variables/variables-section';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

/**
 * Step 4: game-wide subcategories and filters — the shared structure that
 * applies to every category. Category-scoped overrides live in step 5's
 * per-category editor; this is the only place shared rows are edited.
 */
export function StepVariables({ data, onAdvance }: StepProps) {
    const featuredCount = data.categories.filter(
        (c) => !c.archived && (c.isMain ?? false),
    ).length;

    return (
        <section>
            <StepHeader
                step="variables"
                title="One board per category, or several?"
            />

            {data.metadata.configured && featuredCount > 0 && (
                <div className={styles.warnNote}>
                    This board is live. Adding or removing a shared subcategory
                    restructures the boards of all {featuredCount} featured{' '}
                    {featuredCount === 1 ? 'category' : 'categories'} — every
                    run is refiled on the next rebuild.
                </div>
            )}

            <VariablesSection
                gameSlug={data.game.name}
                gameId={data.game.id}
                mode="game"
                selectedCategory={null}
            />

            <button
                type="button"
                className={styles.primaryAction}
                onClick={onAdvance}
            >
                Continue to category setup
            </button>
        </section>
    );
}
