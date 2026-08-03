'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from '~src/components/link';
import { formatPlaytime } from '~src/lib/setup/board-pulse';
import { activityShare, suggestFeaturedIds } from '~src/lib/setup/suggestions';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { curateCategoryAction } from '../actions/curate-category.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { CategoryBandPreview } from './category-band-preview';
import { buildCategorySeed, computeCategoryChanges } from './category-seed';
import { StepHeader } from './step-header';

/** Rows rendered before the list is cut and search takes over. */
const VISIBLE_ROW_LIMIT = 50;

/** In-flight category writes during a save. */
const SAVE_CONCURRENCY = 6;

interface RowState {
    id: number;
    display: string;
    main: boolean;
    sortOrder: number;
    totalRunTime: number;
    uniqueRunners: number;
    totalFinishedAttemptCount: number;
    error: string | null;
}

export function StepCategories({ data, onAdvance }: StepProps) {
    // Baseline: boards that already curated keep their flags; fresh boards
    // get suggested picks (high-activity categories pre-checked).
    const hasExplicitMains = data.categories.some(
        (c) => !c.archived && (c.isMain ?? false),
    );
    const suggested = suggestFeaturedIds(
        data.categories.map((c) => ({
            id: c.id,
            totalFinishedAttemptCount: c.totalFinishedAttemptCount ?? 0,
            uniqueRunners: c.uniqueRunners ?? 0,
        })),
    );
    const [rows, setRows] = useState<RowState[]>(
        [...data.categories]
            // Runners first: how many people a category has is the better
            // signal of whether it belongs on a board than raw run count,
            // which one prolific runner can inflate on their own.
            .sort(
                (a, b) =>
                    (b.uniqueRunners ?? 0) - (a.uniqueRunners ?? 0) ||
                    (b.totalFinishedAttemptCount ?? 0) -
                        (a.totalFinishedAttemptCount ?? 0),
            )
            .map((c) => ({
                id: c.id,
                display: c.display,
                main: hasExplicitMains
                    ? !c.archived && (c.isMain ?? false)
                    : suggested.has(c.id),
                sortOrder: c.sortOrder,
                totalRunTime: c.totalRunTime ?? 0,
                uniqueRunners: c.uniqueRunners ?? 0,
                totalFinishedAttemptCount: c.totalFinishedAttemptCount ?? 0,
                error: null,
            })),
    );
    const [query, setQuery] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const shown = useMemo(() => rows.filter((r) => r.main), [rows]);

    // Big games carry a thousand-plus categories, nearly all of them junk from
    // timer splits. Rendering every row is unusable, so the table shows the
    // busiest few and search reaches the rest — but a ticked category is
    // always rendered, however far down it ranks, or you could hide something
    // from the board without ever seeing it.
    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q
            ? rows.filter((r) => r.display.toLowerCase().includes(q))
            : rows;
    }, [rows, query]);

    const visibleRows = useMemo(() => {
        if (showAll || query.trim() || matches.length <= VISIBLE_ROW_LIMIT) {
            return matches;
        }
        const head = matches.slice(0, VISIBLE_ROW_LIMIT);
        const headIds = new Set(head.map((r) => r.id));
        const tickedBelow = matches
            .slice(VISIBLE_ROW_LIMIT)
            .filter((r) => r.main && !headIds.has(r.id));
        return [...head, ...tickedBelow];
    }, [matches, query, showAll]);

    const hiddenCount = matches.length - visibleRows.length;

    // Saved group assignment per category. This step doesn't edit it — that's
    // step 3 — but a board that already has groups should preview as it
    // actually looks, not as a flat band it hasn't been in for months.
    // Categories ticked here but not yet filed show up ungrouped, which is
    // the truth until step 3 files them.
    const savedGroupIdById = useMemo(() => {
        const m = new Map<number, number | null>();
        for (const c of data.categories) m.set(c.id, c.groupId ?? null);
        return m;
    }, [data.categories]);

    // The band preview runs the public renderer, which wants ResolvedCategory.
    const previewCategories = useMemo<ResolvedCategory[]>(
        () =>
            shown.map((r) => ({
                id: r.id,
                name: String(r.id),
                display: r.display,
                primaryTiming: 'rt',
                archived: false,
                isMain: true,
                sortOrder: r.sortOrder,
                groupId: savedGroupIdById.get(r.id) ?? null,
                totalRunTime: r.totalRunTime,
            })),
        [shown, savedGroupIdById],
    );

    if (data.categories.length === 0) {
        return (
            <section>
                <StepHeader step="categories" title="No categories yet" />
                <Link href={`/games-v2/${data.game.name}/submit`}>
                    Point runners at the submission form →
                </Link>
                <div>
                    <button
                        type="button"
                        className={`${styles.primaryAction} mt-3`}
                        onClick={onAdvance}
                    >
                        Continue
                    </button>
                </div>
            </section>
        );
    }

    // Categories that are on the board right now and are about to come off it.
    // This used to count every active non-Featured category as well, which on
    // a big board meant warning that ~860 categories "will be hidden" — none
    // of which were on the board or touched by the save.
    const leavingBoardCount = rows.filter((r) => {
        const orig = data.categories.find((c) => c.id === r.id);
        return orig && !orig.archived && (orig.isMain ?? false) && !r.main;
    }).length;

    const checkedCount = shown.length;
    const share = activityShare(
        rows.map((r) => ({
            totalFinishedAttemptCount: r.totalFinishedAttemptCount,
            active: r.main,
        })),
    );
    // The bar tracks runners, matching the sort — a bar keyed to anything
    // else would read as non-monotonic and look broken.
    const maxRunners = Math.max(1, ...rows.map((r) => r.uniqueRunners));
    const mainOk = checkedCount > 0;

    const setMain = (id: number, main: boolean) =>
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, main } : r)));

    // Newly-featured categories seed from the game's defaults so a category
    // that's never been touched doesn't land on the board with no timing
    // and no rules. Re-curation (a category that was already Featured, or
    // one restored from Archived) isn't first setup, so it stays seedless.
    const seed = buildCategorySeed(data.metadata);

    const save = () => {
        startSaving(async () => {
            // The tickbox means Featured, and nothing else.
            //
            // It used to also write `active`, which made unticking archive the
            // category. Since every public surface filters `!archived &&
            // isMain`, a category that isn't Featured is already off the board,
            // so those writes changed nothing anyone could see — but on a game
            // like SM64 the first save fired ~860 of them, one per unticked
            // category, and silently swept the lot into the console's Archived
            // tab. Nobody asked for that: the boxes start unticked.
            //
            // Archiving stays a deliberate act in the console. The one time
            // `active` is written here is restoring a Featured pick that was
            // archived, which would otherwise stay invisible despite the tick.
            //
            // Group assignment belongs to the next step, so groupId is omitted
            // from the body, which leaves the column alone.
            const changed = computeCategoryChanges(rows, data.categories);

            if (changed.length === 0) {
                onAdvance();
                return;
            }

            let done = 0;
            const failures: number[] = [];
            setProgress(`Saving 0 / ${changed.length}…`);

            // Bounded parallelism: a mod re-curating a big board can still
            // change hundreds of rows, and one round trip at a time made that
            // take minutes.
            const queue = [...changed];
            const worker = async () => {
                for (;;) {
                    const next = queue.shift();
                    if (!next) return;
                    const res = await curateCategoryAction({
                        gameSlug: data.game.name,
                        gameId: data.game.id,
                        categoryId: next.id,
                        isMain: next.main,
                        ...(next.restore ? { active: true } : {}),
                        ...(next.becomingMain
                            ? {
                                  seed,
                                  currentRulesEmpty: next.currentRulesEmpty,
                              }
                            : {}),
                    });
                    done++;
                    setProgress(`Saving ${done} / ${changed.length}…`);
                    if ('error' in res) {
                        failures.push(next.id);
                        setRows((rs) =>
                            rs.map((row) =>
                                row.id === next.id
                                    ? { ...row, error: res.error }
                                    : row,
                            ),
                        );
                    }
                }
            };
            await Promise.all(
                Array.from(
                    { length: Math.min(SAVE_CONCURRENCY, changed.length) },
                    worker,
                ),
            );

            setProgress(null);
            if (failures.length === 0) onAdvance();
        });
    };

    return (
        <section>
            <StepHeader
                step="categories"
                title="Which categories belong on the board?"
            />

            <CategoryBandPreview
                categories={previewCategories}
                groups={data.groups}
            />

            {leavingBoardCount > 0 && (
                <div className={styles.warnNote}>
                    {leavingBoardCount} categor
                    {leavingBoardCount === 1 ? 'y' : 'ies'} currently on the
                    board {leavingBoardCount === 1 ? 'is' : 'are'} unticked and
                    will come off it when you save.
                </div>
            )}

            <div className="d-flex gap-2 align-items-center flex-wrap mb-2">
                <input
                    type="search"
                    className="form-control form-control-sm"
                    style={{ maxWidth: '22rem' }}
                    placeholder={`Search ${rows.length.toLocaleString()} categories…`}
                    aria-label="Search categories"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <span className="text-muted small">
                    {query.trim()
                        ? `${matches.length.toLocaleString()} match${
                              matches.length === 1 ? '' : 'es'
                          }`
                        : `showing ${visibleRows.length.toLocaleString()} of ${rows.length.toLocaleString()}`}
                </span>
            </div>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Show on board</th>
                        <th>Category</th>
                        <th>Activity</th>
                        <th className="text-end">Runners</th>
                        <th className="text-end">Finished runs</th>
                        <th className="text-end">Playtime</th>
                    </tr>
                </thead>
                <tbody>
                    {visibleRows.map((r) => (
                        <tr
                            key={r.id}
                            className={r.main ? '' : styles.rowDimmed}
                        >
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    aria-label={`Show ${r.display} on the board`}
                                    checked={r.main}
                                    onChange={(e) =>
                                        setMain(r.id, e.target.checked)
                                    }
                                />
                            </td>
                            <td>
                                {r.display}
                                {r.error && (
                                    <div
                                        className={`${styles.textDanger} small`}
                                    >
                                        {r.error}
                                    </div>
                                )}
                            </td>
                            <td>
                                <div className={styles.activityBar}>
                                    <div
                                        className={styles.activityFill}
                                        style={{
                                            width: `${Math.max(
                                                2,
                                                Math.round(
                                                    (r.uniqueRunners /
                                                        maxRunners) *
                                                        100,
                                                ),
                                            )}%`,
                                        }}
                                    />
                                </div>
                            </td>
                            <td className="text-end">
                                {r.uniqueRunners.toLocaleString()}
                            </td>
                            <td className="text-end">
                                {r.totalFinishedAttemptCount.toLocaleString()}
                            </td>
                            <PlaytimeCell ms={r.totalRunTime} />
                        </tr>
                    ))}
                </tbody>
            </table>

            {hiddenCount > 0 && (
                <div className="d-flex gap-2 align-items-center mb-3">
                    <span className="text-muted small">
                        {hiddenCount.toLocaleString()} quieter categor
                        {hiddenCount === 1 ? 'y' : 'ies'} not shown.
                    </span>
                    <button
                        type="button"
                        className="btn btn-sm btn-link px-0"
                        onClick={() => setShowAll(true)}
                    >
                        Show all
                    </button>
                </div>
            )}

            {query.trim() && matches.length === 0 && (
                <p className="text-muted small">
                    No category matches “{query.trim()}”.
                </p>
            )}

            <div className="mb-3">
                <div className="text-muted small">
                    {checkedCount} shown · {rows.length - checkedCount} hidden ·{' '}
                    {share}% of finished runs covered
                </div>
                <div
                    className={styles.meter}
                    role="progressbar"
                    aria-label="Share of finished runs covered by shown categories"
                    aria-valuenow={share}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <div
                        className={styles.meterFill}
                        style={{ width: `${share}%` }}
                    />
                </div>
            </div>

            {!mainOk && (
                <div className={`${styles.warnNote} mt-2`}>
                    Pick at least one category.
                </div>
            )}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                disabled={isSaving || !mainOk}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}

/** Compact hours, same vocabulary as the wizard header's playtime stat. */
function PlaytimeCell({ ms }: { ms: number }) {
    const hours = formatPlaytime(ms);
    return <td className="text-end">{hours ? `${hours} h` : '—'}</td>;
}
