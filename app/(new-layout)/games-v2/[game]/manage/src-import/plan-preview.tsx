'use client';

import { useEffect, useState } from 'react';
import type {
    SrcCommitPlan,
    SrcPlanAction,
} from '../../../../../../types/src-import.types';
import { InlineError } from '../shared/form-kit';
import styles from './src-import.module.scss';
import { getSrcImportPlanAction } from './src-import-actions';

interface Props {
    gameId: number;
    gameSlug: string;
    jobId: number;
    /** Task 5 (CommitPanel) hook: fires once the plan has loaded, so the
     * caller can gate its own Apply control on `planHasConflicts(plan)`
     * without re-fetching. */
    onPlanLoaded?: (plan: SrcCommitPlan) => void;
}

/** True when the plan has any conflict — the signal CommitPanel gates Apply
 * on. Exported so Task 5 doesn't need to re-derive it. */
export function planHasConflicts(plan: SrcCommitPlan): boolean {
    return plan.conflicts.length > 0;
}

const ACTIONS: SrcPlanAction[] = ['create', 'reuse', 'skip'];

function countByAction(
    items: Array<{ action: SrcPlanAction }>,
): Record<SrcPlanAction, number> {
    const counts: Record<SrcPlanAction, number> = {
        create: 0,
        reuse: 0,
        skip: 0,
    };
    for (const item of items) counts[item.action]++;
    return counts;
}

/**
 * Read-only render of the SRC-import commit plan: create/reuse/skip counts
 * per entity kind, the run summary, and any conflicts. Fetches the plan on
 * mount via `getSrcImportPlanAction` — simpler than threading a prop through
 * from CommitPanel since this is the only consumer today.
 */
export function PlanPreview({ gameId, gameSlug, jobId, onPlanLoaded }: Props) {
    const [plan, setPlan] = useState<SrcCommitPlan | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setPlan(null);
        getSrcImportPlanAction({ gameId, gameSlug, jobId }).then((res) => {
            if (cancelled) return;
            if ('error' in res) {
                setError(res.error);
            } else {
                setPlan(res.result);
                onPlanLoaded?.(res.result);
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
        // onPlanLoaded is a callback prop, not reactive state — including it
        // would re-fetch on every parent render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, gameSlug, jobId]);

    if (loading) {
        return (
            <div className={styles.jobHead} role="status" aria-live="polite">
                <span className={styles.spinner} aria-hidden />
                <span className={styles.muted}>Loading plan…</span>
            </div>
        );
    }

    if (error || !plan) {
        return <InlineError>{error ?? 'Failed to load the plan.'}</InlineError>;
    }

    const categoryCounts = countByAction(plan.categories);
    const levelCounts = countByAction(plan.levels);
    const variableCounts = countByAction(plan.variables);
    const hasConflicts = planHasConflicts(plan);

    return (
        <div className={styles.stack}>
            <div className={styles.counters}>
                {ACTIONS.map((action) => (
                    <Counter
                        key={`categories-${action}`}
                        label={`Categories: ${action}`}
                        value={categoryCounts[action]}
                    />
                ))}
                {ACTIONS.map((action) => (
                    <Counter
                        key={`levels-${action}`}
                        label={`Levels: ${action}`}
                        value={levelCounts[action]}
                    />
                ))}
                {ACTIONS.map((action) => (
                    <Counter
                        key={`variables-${action}`}
                        label={`Variables: ${action}`}
                        value={variableCounts[action]}
                    />
                ))}
            </div>
            <div className={styles.counters}>
                <Counter label="Runs total" value={plan.runs.total} />
                <Counter label="Verified" value={plan.runs.byStatus.verified} />
                <Counter label="New" value={plan.runs.byStatus.new} />
                <Counter label="Guests" value={plan.runs.guests} />
                <Counter label="Matched" value={plan.runs.matched} />
                <Counter label="Unmappable" value={plan.runs.unmappable} />
            </div>

            {hasConflicts ? (
                <div className={`${styles.callout} ${styles.calloutError}`}>
                    <div>
                        <ul className={styles.conflictList}>
                            {plan.conflicts.map((c) => (
                                <li key={`${c.kind}-${c.srcId}`}>
                                    {c.kind} {c.srcId}: {c.message}
                                </li>
                            ))}
                        </ul>
                        <p>Resolve these on the API before applying.</p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function Counter({ label, value }: { label: string; value: number }) {
    return (
        <div className={styles.counter}>
            <span className={styles.counterValue}>
                {value.toLocaleString()}
            </span>
            <span className={styles.counterLabel}>{label}</span>
        </div>
    );
}
