'use client';

import { useEffect, useRef, useState } from 'react';
import {
    applyArchiveBaseline,
    applyGameArchive,
    getArchiveBaseline,
    getArchivePlan,
    getGameArchive,
    setArchiveSkips,
    undoArchiveBaseline,
} from '~src/actions/src-archive.action';
import { plural } from '~src/lib/src-archive-counts';
import type {
    SrcArchiveBaseline,
    SrcArchiveGameJob,
    SrcArchivePlan,
    SrcArchiveSkips,
} from '../../../../../../types/src-import.types';
import { FormSection } from '../shared/form-kit';
import styles from './archive-card.module.scss';
import { PlanList, type PlanRow } from './plan-list';

type Kind = keyof SrcArchiveSkips;

const CONFLICT_KIND = {
    categories: 'category',
    levels: 'level',
    variables: 'variable',
} as const;

const OVERRIDE = 'operator override';

const NO_SKIPS: SrcArchiveSkips = { categories: [], levels: [], variables: [] };

function skipsOf(plan: SrcArchivePlan | null): SrcArchiveSkips {
    if (!plan) return NO_SKIPS;
    const own = (items: { srcId: string; action: string; reason?: string }[]) =>
        items
            .filter((i) => i.action === 'skip' && i.reason === OVERRIDE)
            .map((i) => i.srcId);
    return {
        categories: own(plan.categories),
        levels: own(plan.levels),
        variables: own(plan.variables),
    };
}

function longDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function ArchiveCard({
    gameId,
    canAdmin,
}: {
    gameId: number;
    canAdmin: boolean;
}) {
    const [job, setJob] = useState<SrcArchiveGameJob | null>(null);
    const [plan, setPlan] = useState<SrcArchivePlan | null>(null);
    const [baseline, setBaseline] = useState<SrcArchiveBaseline | null>(null);
    const [skips, setSkips] = useState<SrcArchiveSkips>(NO_SKIPS);
    const [saving, setSaving] = useState<string[]>([]);
    const [applying, setApplying] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [baselineError, setBaselineError] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seq = useRef(0);

    useEffect(() => {
        let live = true;
        getGameArchive(gameId).then((res) => {
            if (!live || 'error' in res) return;
            setJob(res.job);
            if (res.job?.applying) setApplying(true);
        });
        getArchivePlan(gameId).then((res) => {
            if (!live || 'error' in res) return;
            setPlan(res.plan);
            setSkips(skipsOf(res.plan));
        });
        if (canAdmin) {
            getArchiveBaseline(gameId).then((res) => {
                if (!live || 'error' in res) return;
                setBaseline(res.baseline);
            });
        }
        return () => {
            live = false;
        };
    }, [gameId, canAdmin]);

    useEffect(() => {
        if (!applying) return;
        const poll = setInterval(async () => {
            const res = await getGameArchive(gameId);
            if ('error' in res) return;
            setJob(res.job);
            if (!res.job?.applying) {
                setApplying(false);
                if (canAdmin) {
                    const next = await getArchiveBaseline(gameId);
                    if (!('error' in next)) setBaseline(next.baseline);
                }
            }
        }, 5000);
        return () => clearInterval(poll);
    }, [applying, gameId, canAdmin]);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    if (!job) return null;

    const save = async (next: SrcArchiveSkips) => {
        const mine = ++seq.current;
        const res = await setArchiveSkips(gameId, next);
        if (mine !== seq.current) return;
        setSaving([]);
        if ('error' in res) {
            setError(res.error);
            setSkips(skipsOf(plan));
            return;
        }
        setError(null);
        setPlan(res.plan);
        setSkips(skipsOf(res.plan));
    };

    const toggle = (kind: Kind, srcId: string, on: boolean) => {
        const next = {
            ...skips,
            [kind]: on
                ? [...skips[kind], srcId]
                : skips[kind].filter((id) => id !== srcId),
        };
        setSkips(next);
        setSaving((s) => [...s, `${kind}:${srcId}`]);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => save(next), 400);
    };

    const apply = async (structure: boolean) => {
        setBusy(true);
        setError(null);
        const res = await applyGameArchive(gameId, { structure });
        setBusy(false);
        setConfirming(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setApplying(true);
    };

    const runBaseline = async (
        action: () => Promise<
            { baseline: SrcArchiveBaseline } | { error: string }
        >,
    ) => {
        setBusy(true);
        setBaselineError(null);
        const res = await action();
        setBusy(false);
        if ('error' in res) {
            setBaselineError(res.error);
            return;
        }
        setBaseline(res.baseline);
    };

    const rowsOf = (
        kind: Kind,
        items: {
            srcId: string;
            name: string;
            action: string;
            therunDisplay?: string;
            reason?: string;
        }[],
    ): PlanRow[] =>
        items.map((item) => {
            const conflict = plan?.conflicts.find(
                (c) => c.kind === CONFLICT_KIND[kind] && c.srcId === item.srcId,
            );
            const skipped = skips[kind].includes(item.srcId);
            const ownSkip = item.action === 'skip' && item.reason === OVERRIDE;
            let status = 'skipped';
            if (conflict) status = conflict.message;
            else if (item.action === 'activate') status = 'turn on';
            else if (item.action === 'create') status = 'add';
            else if (item.action === 'reuse')
                status = item.therunDisplay
                    ? `already here as ${item.therunDisplay}`
                    : 'already here';
            else if (!ownSkip && item.reason)
                status = `skipped: ${item.reason}`;
            const switchable =
                canAdmin &&
                !conflict &&
                (item.action === 'activate' ||
                    item.action === 'create' ||
                    ownSkip);
            return {
                srcId: item.srcId,
                name: item.name,
                status: skipped && !conflict ? 'skipped' : status,
                skip: switchable ? skipped : null,
                saving: saving.includes(`${kind}:${item.srcId}`),
            };
        });

    const held = plan?.held ?? 0;
    const done = job.applied.done;
    const review = !done && !applying;
    const lastBaseline =
        baseline?.last && baseline.last.undoneAt === null
            ? baseline.last
            : null;

    return (
        <div>
            <FormSection title="speedrun.com archive">
                {done ? (
                    <p className={styles.counts}>
                        Already imported from the speedrun.com archive
                        {job.applied.configAt
                            ? ` on ${longDate(job.applied.configAt)}`
                            : ''}
                        .
                    </p>
                ) : applying ? (
                    <p className={styles.muted} aria-live="polite">
                        Applying. This updates on its own.
                    </p>
                ) : (
                    <p className={styles.counts}>
                        Runs from speedrun.com are on the site.
                        {held > 0 &&
                            ` ${plural(held, 'run is', 'runs are')} off the boards until the structure below is turned on.`}
                    </p>
                )}
                {review && job.applied.failed && job.applied.error && (
                    <p className={styles.muted}>{job.applied.error}</p>
                )}
                {review && (
                    <>
                        {canAdmin && (
                            <p className={styles.muted}>
                                This sets settings back to how they were on
                                speedrun.com and can override settings changes
                                made on therun.
                            </p>
                        )}
                        {plan && (
                            <div className={styles.lists}>
                                <PlanList
                                    title="Categories"
                                    kind="categories"
                                    rows={rowsOf('categories', plan.categories)}
                                    onSkip={(id, on) =>
                                        toggle('categories', id, on)
                                    }
                                />
                                <PlanList
                                    title="Levels"
                                    kind="levels"
                                    rows={rowsOf('levels', plan.levels)}
                                    onSkip={(id, on) =>
                                        toggle('levels', id, on)
                                    }
                                />
                                <PlanList
                                    title="Variables"
                                    kind="variables"
                                    rows={rowsOf('variables', plan.variables)}
                                    onSkip={(id, on) =>
                                        toggle('variables', id, on)
                                    }
                                />
                            </div>
                        )}
                        {canAdmin ? (
                            <>
                                {error && (
                                    <p className={styles.error} role="alert">
                                        {error}
                                    </p>
                                )}
                                <div className={styles.footer}>
                                    <button
                                        type="button"
                                        className={styles.apply}
                                        onClick={() => apply(true)}
                                        disabled={busy || saving.length > 0}
                                    >
                                        Apply
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.secondary}
                                        onClick={() => setConfirming(true)}
                                        disabled={busy || saving.length > 0}
                                    >
                                        Mark as done
                                    </button>
                                </div>
                                {confirming && (
                                    <div className={styles.confirm}>
                                        <p className={styles.muted}>
                                            Nothing from speedrun.com is turned
                                            on. Runs that need it stay off the
                                            boards.
                                        </p>
                                        <button
                                            type="button"
                                            className={styles.secondary}
                                            onClick={() => apply(false)}
                                            disabled={busy || saving.length > 0}
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className={styles.muted}>
                                Only a board admin can apply this.
                            </p>
                        )}
                    </>
                )}
                {canAdmin &&
                    !applying &&
                    baseline &&
                    (baseline.runs > 0 || lastBaseline) && (
                        <div className={styles.baseline}>
                            {lastBaseline && (
                                <div className={styles.baselineRow}>
                                    <p className={styles.counts}>
                                        Took{' '}
                                        {plural(
                                            lastBaseline.runs,
                                            'run',
                                            'runs',
                                        )}{' '}
                                        off the board on{' '}
                                        {longDate(lastBaseline.appliedAt)}.
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.secondary}
                                        onClick={() =>
                                            runBaseline(() =>
                                                undoArchiveBaseline(
                                                    gameId,
                                                    lastBaseline.id,
                                                ),
                                            )
                                        }
                                        disabled={busy}
                                    >
                                        Undo
                                    </button>
                                </div>
                            )}
                            {baseline.runs > 0 && (
                                <div className={styles.baselineRow}>
                                    <p className={styles.counts}>
                                        {plural(
                                            baseline.runs,
                                            'pending run',
                                            'pending runs',
                                        )}{' '}
                                        by{' '}
                                        {plural(
                                            baseline.runners,
                                            'runner',
                                            'runners',
                                        )}{' '}
                                        ended before 1 October 2026 and{' '}
                                        {baseline.runs === 1 ? 'is' : 'are'} not
                                        on speedrun.com.
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.secondary}
                                        onClick={() =>
                                            runBaseline(() =>
                                                applyArchiveBaseline(gameId),
                                            )
                                        }
                                        disabled={busy}
                                    >
                                        Take them off the board
                                    </button>
                                </div>
                            )}
                            {baselineError && (
                                <p className={styles.error} role="alert">
                                    {baselineError}
                                </p>
                            )}
                        </div>
                    )}
            </FormSection>
        </div>
    );
}
