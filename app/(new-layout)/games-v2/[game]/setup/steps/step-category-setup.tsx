'use client';

import { useSearchParams } from 'next/navigation';
import { boardDefaults } from '~src/lib/setup/board-defaults';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { CategoryMatrix } from './matrix/category-matrix';
import { StepHeader } from './step-header';

/**
 * Category settings: the per-category scalars for every featured category on
 * one screen — timing, minimum, rules, ranking direction, milliseconds —
 * rendered as DEVIATIONS from the board defaults set in step 1. A cell holding
 * the default renders as a dot rather than its value, so the grid is near-empty
 * on a healthy board and only the exceptions catch the eye.
 *
 * Subcategories and filters are NOT here — they are their own step now (they
 * are structures, not scalars, and editing one relocates runs, so they stage
 * and preview differently). What both steps must NOT differ on is the axis:
 * categories are rows in both.
 *
 * There is NO category detail screen. Everything scalar a category has is set
 * from this one list: the scannable settings as columns, the rest as an
 * expanding pane under the row (see row-panel.tsx). A route per category is
 * what made the old step 4 unusable — a moderator working down a board has to
 * keep their place, and every visit cost them it.
 *
 * `?cat=<id>` deep links — including the retired `?step=exceptions&cat=<id>`
 * shape LEGACY_STEP_MAP folds onto this step — now open that category's row
 * expanded instead of a separate screen.
 */
export function StepCategorySetup({ data, onAdvance }: StepProps) {
    const params = useSearchParams();
    const catId = Number(params.get('cat')) || null;

    const mains = data.categories.filter(
        (c) => !c.archived && (c.isMain ?? false),
    );

    const defaults = boardDefaults(data.metadata, data.policies);

    return (
        <section>
            <StepHeader step="category-setup" title="Category settings" />

            {mains.length === 0 ? (
                <div className={styles.infoNote}>
                    No categories are featured yet. Go back to Categories and
                    feature the ones that belong on the board. They show up here
                    to configure.
                </div>
            ) : (
                <CategoryMatrix
                    data={data}
                    defaults={defaults}
                    initialOpenCategoryId={catId}
                />
            )}

            <button
                type="button"
                className={styles.primaryAction}
                onClick={onAdvance}
            >
                Continue to subcategories
            </button>
        </section>
    );
}
