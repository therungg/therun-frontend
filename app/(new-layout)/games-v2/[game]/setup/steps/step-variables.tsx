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
 * Optional: a single-board game skips straight through. The retired
 * `?step=variables` deep link resolves here again (it is a live step id).
 */
export function StepVariables({ data, onAdvance }: StepProps) {
    const mains = data.categories.filter(
        (c) => !c.archived && (c.isMain ?? false),
    );

    return (
        <section>
            <StepHeader step="variables" title="Subcategories & filters" />

            {mains.length === 0 ? (
                <div className={styles.infoNote}>
                    Feature at least one category first — subcategories and
                    filters are configured per featured category, so there is
                    nothing to structure yet.
                </div>
            ) : (
                <VariablesGrid data={data} />
            )}

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
