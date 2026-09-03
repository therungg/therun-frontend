'use client';

import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';
import { VariablesGrid } from './variables/variables-grid';

/**
 * Subcategories & filters — the board's structure, split out from the scalar
 * Category settings step because it is a different kind of work: a subcategory
 * or filter is a structure (name + role + ordered alias buckets + default
 * index), and editing one relocates existing runs, so these stage and preview
 * rather than landing immediately like a scalar cell.
 *
 * The grid leads with the value-suggestions panel (what runners have actually
 * submitted) so the decision of what to bucket comes before the configuring.
 * It spans every featured category at once, matching the Category settings
 * step's categories-down-the-rows axis.
 *
 * The same grid is the console's `variables` pane — this step is the wizard's
 * frame around it (header + Continue), nothing more. The no-featured-categories
 * note lives in the grid so both surfaces show it.
 *
 * Optional: a single-board game skips straight through. The retired
 * `?step=variables` deep link resolves here again (it is a live step id).
 */
export function StepVariables({ data, onAdvance }: StepProps) {
    return (
        <section>
            <StepHeader step="variables" title="Subcategories & filters" />

            <VariablesGrid
                game={data.game}
                categories={data.categories}
                variables={data.variables}
                groups={data.groups}
            />

            <button
                type="button"
                className={styles.primaryAction}
                onClick={onAdvance}
            >
                Continue to boards
            </button>
        </section>
    );
}
