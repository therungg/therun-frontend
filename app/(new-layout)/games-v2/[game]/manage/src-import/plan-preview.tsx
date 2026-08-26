'use client';

import { useEffect, useRef, useState } from 'react';
import type {
    SrcCommitOverrides,
    SrcCommitPlan,
    SrcPlanAction,
    SrcPlanConflict,
} from '../../../../../../types/src-import.types';
import { InlineError } from '../shared/form-kit';
import styles from './src-import.module.scss';
import {
    getSrcImportPlanAction,
    setSrcImportOverridesAction,
} from './src-import-actions';

/** Conflict kind -> the override group that holds it. */
const GROUP_FOR_KIND: Record<
    SrcPlanConflict['kind'],
    keyof SrcCommitOverrides
> = {
    category: 'categories',
    level: 'levels',
    variable: 'variables',
};

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

/** Maps every SRC id in the plan to its human name, so conflict text can show
 * "Any%" instead of `02q0zr9k`. Covers categories, levels, and variables —
 * the three kinds an SRC id can refer to in a conflict message. */
function buildNameLookup(plan: SrcCommitPlan): Map<string, string> {
    const byId = new Map<string, string>();
    for (const c of plan.categories) byId.set(c.srcId, c.name);
    for (const l of plan.levels) byId.set(l.srcId, l.name);
    for (const v of plan.variables) byId.set(v.srcId, v.name);
    return byId;
}

/** A label for a conflict: its entity's real name where we have one, falling
 * back to the raw id so nothing silently disappears. */
function conflictLabel(c: SrcPlanConflict, names: Map<string, string>): string {
    const name = names.get(c.srcId);
    return name ? `${c.kind} “${name}”` : `${c.kind} ${c.srcId}`;
}

/** Backend conflict messages embed raw SRC ids inside quotes (e.g. `bound to
 * SRC category '02q0zr9k'`). Swap any quoted token we recognise as an SRC id
 * for its name; quoted names left as-is won't match the id map. */
function humanizeMessage(message: string, names: Map<string, string>): string {
    return message.replace(/'([^']+)'/g, (whole, token: string) => {
        const name = names.get(token);
        return name ? `“${name}”` : whole;
    });
}

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
    // srcId of the conflict currently being skipped, so its button can show a
    // spinner and the rest stay disabled while the POST is in flight.
    const [skipping, setSkipping] = useState<string | null>(null);
    const [skipError, setSkipError] = useState<string | null>(null);
    // The override set we have accumulated from Skip clicks. The backend
    // REPLACES the stored set on every POST, so we must resend the full set
    // each time. It starts empty because this is the only surface that writes
    // overrides — a fresh plan has none stored.
    const overridesRef = useRef<SrcCommitOverrides>({});

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setPlan(null);
        setSkipError(null);
        overridesRef.current = {};
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

    async function skipConflict(c: SrcPlanConflict) {
        const group = GROUP_FOR_KIND[c.kind];
        const next: SrcCommitOverrides = {
            ...overridesRef.current,
            [group]: {
                ...overridesRef.current[group],
                [c.srcId]: { action: 'skip' as SrcPlanAction },
            },
        };
        setSkipping(c.srcId);
        setSkipError(null);
        const res = await setSrcImportOverridesAction({
            gameId,
            gameSlug,
            jobId,
            overrides: next,
        });
        setSkipping(null);
        if ('error' in res) {
            setSkipError(res.error);
            return;
        }
        overridesRef.current = next;
        setPlan(res.result);
        onPlanLoaded?.(res.result);
    }

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
    const names = buildNameLookup(plan);

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
                        <p>
                            {plan.conflicts.length === 1
                                ? '1 item blocks this import'
                                : `${plan.conflicts.length} items block this import`}
                            . Each names a category, level, or variable that
                            can’t be imported as-is — usually because it points
                            at something excluded from this import. Apply stays
                            disabled until they’re cleared.
                        </p>
                        <ul className={styles.conflictList}>
                            {plan.conflicts.map((c, i) => (
                                <li key={`${c.kind}-${c.srcId}-${i}`}>
                                    <span>
                                        <strong>
                                            {conflictLabel(c, names)}
                                        </strong>
                                        : {humanizeMessage(c.message, names)}
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.conflictSkip}
                                        onClick={() => skipConflict(c)}
                                        disabled={skipping !== null}
                                    >
                                        {skipping === c.srcId ? (
                                            <>
                                                <span
                                                    className={styles.spinner}
                                                    aria-hidden
                                                />
                                                Skipping…
                                            </>
                                        ) : (
                                            'Skip & don’t import'
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {skipError ? (
                            <InlineError>{skipError}</InlineError>
                        ) : null}
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
