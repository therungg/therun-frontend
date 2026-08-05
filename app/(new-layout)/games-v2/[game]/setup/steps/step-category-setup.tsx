'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'react-bootstrap-icons';
import { boardDefaults } from '~src/lib/setup/board-defaults';
import { formatTimeInput } from '~src/lib/time-input';
import { CategoryEditor } from '../../manage/category/category-editor';
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
 * Zone 2 is variables, which cannot be a matrix column: a variable is a
 * structure (name + role + ordered alias buckets + default index), and editing
 * one moves existing runs between boards. It gets board-level palettes
 * instead, split into the two sections a moderator actually thinks in —
 * separate leaderboards and run details — see variables-grid.tsx.
 *
 * What this replaces: a hub whose every row opened the console's five-section
 * editor full-screen, turning a "step" into N nested visits with two competing
 * back buttons. That editor is still reachable per row for the deep cases, but
 * it is no longer the only way through.
 *
 * `?cat=<id>` still opens the full editor directly, so old deep links —
 * including the retired `?step=exceptions&cat=<id>` shape LEGACY_STEP_MAP
 * folds onto this step — keep landing where they always did.
 */
export function StepCategorySetup({ data, onAdvance }: StepProps) {
    const router = useRouter();
    const params = useSearchParams();
    const catId = Number(params.get('cat')) || null;

    const mains = data.categories.filter(
        (c) => !c.archived && (c.isMain ?? false),
    );
    const open = mains.find((c) => c.id === catId) ?? null;

    const base = `/games-v2/${data.game.name}/setup`;
    const openCategory = (id: number) => {
        router.replace(`${base}?step=category-setup&cat=${id}`, {
            scroll: true,
        });
    };
    const backToMatrix = () => {
        router.replace(`${base}?step=category-setup`, { scroll: true });
        // Pick up whatever the editor just saved, so the matrix cells are
        // right the moment the moderator returns to them.
        router.refresh();
    };

    if (open) {
        return (
            <section>
                <div className={styles.editorHead}>
                    <button
                        type="button"
                        className={styles.backAction}
                        onClick={backToMatrix}
                    >
                        <ArrowLeft size={14} aria-hidden />
                        All categories
                    </button>
                    <h2 className={styles.editorTitle}>{open.display}</h2>
                </div>
                <CategoryEditor
                    game={data.game}
                    category={open}
                    canConfigure
                    canModerate
                    canEditStandards={data.canEditStandards}
                    context="wizard"
                    gameTimingDefaults={{
                        primaryTiming: data.metadata.primaryTiming,
                        hideRealTime: data.metadata.hideRealTime,
                        hideGameTime: data.metadata.hideGameTime,
                    }}
                    copySources={{
                        categories: data.categories,
                        variables: data.variables,
                        policies: data.policies,
                    }}
                />
            </section>
        );
    }

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
                        onOpenEditor={openCategory}
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
