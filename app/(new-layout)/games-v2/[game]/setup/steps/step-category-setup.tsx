'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { boardDefaults } from '~src/lib/setup/board-defaults';
import { formatTimeInput } from '~src/lib/time-input';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { CategoryMatrix } from './matrix/category-matrix';
import matrixStyles from './matrix/matrix.module.scss';
import { StepHeader } from './step-header';
import { VariablesGrid } from './variables/variables-grid';

/**
 * Step 4 configures every featured category on one screen, in two zones,
 * because the work has two different shapes.
 *
 * Zone 1 is a matrix of scalars — timing, minimum, rules, ranking direction,
 * milliseconds — rendered as DEVIATIONS from the board defaults set in step 1.
 * A category on the default draws quiet, so the grid is near-empty on a
 * healthy board and only the exceptions catch the eye.
 *
 * Zone 2 is subcategories and filters, which cannot be matrix columns: each is
 * a structure (name + role + ordered alias buckets + default index), and
 * editing one moves existing runs between leaderboards. They get board-level
 * palettes instead — see variables-grid.tsx.
 *
 * There is NO category detail screen. Everything a category has is set from
 * this one list: the scannable settings as columns, the rest as an expanding
 * pane under the row (see row-panel.tsx). A route per category is what made
 * the old step 4 unusable — a moderator working down a board has to keep their
 * place, and every visit cost them it.
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

    const base = `/games-v2/${data.game.name}/setup`;

    const defaults = boardDefaults(data.metadata, data.policies);

    return (
        <section>
            <StepHeader step="category-setup" title="Set up each category" />

            {mains.length === 0 ? (
                <div className={styles.infoNote}>
                    No categories are featured yet. Go back to Categories and
                    feature the ones that belong on the board — they show up
                    here to configure.
                </div>
            ) : (
                <>
                    <div className={matrixStyles.defaultsStrip}>
                        <span className={matrixStyles.defaultsLabel}>
                            Board defaults
                        </span>
                        <DefaultsSummary defaults={defaults} />
                        <Link
                            href={`${base}?step=details`}
                            className={matrixStyles.defaultsChange}
                        >
                            Change in step 1 →
                        </Link>
                    </div>

                    <CategoryMatrix
                        data={data}
                        defaults={defaults}
                        initialOpenCategoryId={catId}
                    />

                    <VariablesGrid data={data} />
                </>
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

/**
 * The board defaults every matrix cell is measured against. Read-only here:
 * step 1 owns them, so there is exactly one place to edit them and no second
 * surface to drift.
 */
function DefaultsSummary({
    defaults,
}: {
    defaults: ReturnType<typeof boardDefaults>;
}) {
    const parts: string[] = [];
    if (defaults.primaryTiming) {
        parts.push(defaults.primaryTiming === 'gt' ? 'IGT' : 'RTA');
    }
    if (defaults.minMs !== null) {
        parts.push(`min ${formatTimeInput(defaults.minMs)}`);
    }
    if ((defaults.rulesTemplate ?? '').trim()) parts.push('rules template');
    if (defaults.sortAscending !== null) {
        parts.push(defaults.sortAscending ? 'lowest wins' : 'highest wins');
    }
    if (defaults.showMilliseconds !== null) {
        parts.push(defaults.showMilliseconds ? 'ms shown' : 'ms hidden');
    }

    if (parts.length === 0) {
        return (
            <span className={matrixStyles.defaultsUnset}>
                none set — every category keeps its own values
            </span>
        );
    }
    return (
        <>
            {parts.map((p) => (
                <span key={p} className={matrixStyles.defaultsValue}>
                    {p}
                </span>
            ))}
        </>
    );
}
