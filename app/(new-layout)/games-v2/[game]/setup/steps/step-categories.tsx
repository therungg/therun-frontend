'use client';

import { useState, useTransition } from 'react';
import Link from '~src/components/link';
import { activityShare, suggestFeaturedIds } from '~src/lib/setup/suggestions';
import { createGroupAction } from '../actions/create-group.action';
import { curateCategoryAction } from '../actions/curate-category.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

interface RowState {
    id: number;
    display: string;
    main: boolean;
    groupId: number | null;
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
            .sort(
                (a, b) =>
                    (b.totalFinishedAttemptCount ?? 0) -
                    (a.totalFinishedAttemptCount ?? 0),
            )
            .map((c) => ({
                id: c.id,
                display: c.display,
                main: hasExplicitMains
                    ? !c.archived && (c.isMain ?? false)
                    : suggested.has(c.id),
                groupId: c.groupId ?? null,
                uniqueRunners: c.uniqueRunners ?? 0,
                totalFinishedAttemptCount: c.totalFinishedAttemptCount ?? 0,
                error: null,
            })),
    );
    const [groups, setGroups] = useState(data.groups);
    const [groupName, setGroupName] = useState('');
    const [showGroups, setShowGroups] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    if (data.categories.length === 0) {
        return (
            <section>
                <StepHeader
                    num={2}
                    title="No categories yet"
                    lede="Categories appear automatically when runs are submitted or ingested from timers — there’s nothing to curate yet. Once the first runs arrive, come back here (or use the console) to choose what shows on the board."
                />
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

    const legacyHiddenCount = hasExplicitMains
        ? rows.filter((r) => {
              const orig = data.categories.find((c) => c.id === r.id);
              return (
                  orig && !orig.archived && !(orig.isMain ?? false) && !r.main
              );
          }).length
        : 0;

    const checkedCount = rows.filter((r) => r.main).length;
    const share = activityShare(
        rows.map((r) => ({
            totalFinishedAttemptCount: r.totalFinishedAttemptCount,
            active: r.main,
        })),
    );
    const maxRuns = Math.max(
        1,
        ...rows.map((r) => r.totalFinishedAttemptCount),
    );
    const mainOk = checkedCount > 0;

    const setMain = (id: number, main: boolean) =>
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, main } : r)));

    const setGroup = (id: number, groupId: number | null) =>
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, groupId } : r)));

    const addGroup = () => {
        startSaving(async () => {
            const res = await createGroupAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                name: groupName,
            });
            if ('error' in res) return;
            setGroups((gs) => [
                ...gs,
                { id: res.result.id, name: groupName.trim(), sortOrder: 99 },
            ]);
            setGroupName('');
        });
    };

    const save = () => {
        startSaving(async () => {
            // Sequential batch: report per-row failures, retry just those.
            const changed = rows.filter((r) => {
                const orig = data.categories.find((c) => c.id === r.id);
                return (
                    orig &&
                    (!orig.archived !== r.main ||
                        (orig.isMain ?? false) !== r.main ||
                        (orig.groupId ?? null) !== r.groupId)
                );
            });
            let failures = 0;
            for (let i = 0; i < changed.length; i++) {
                const r = changed[i];
                setProgress(`Saving ${i + 1} / ${changed.length}…`);
                const res = await curateCategoryAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: r.id,
                    active: r.main,
                    isMain: r.main,
                    groupId: r.groupId,
                });
                if ('error' in res) {
                    failures++;
                    setRows((rs) =>
                        rs.map((row) =>
                            row.id === r.id
                                ? { ...row, error: res.error }
                                : row,
                        ),
                    );
                }
            }
            setProgress(null);
            if (failures === 0) onAdvance();
        });
    };

    return (
        <section>
            <StepHeader
                num={2}
                title={`We found ${rows.length} categor${
                    rows.length === 1 ? 'y' : 'ies'
                } — probably too many`}
                lede="They come from ingested runs and submissions across the whole site. Pick the ones that belong on your board; the rest stay hidden, and you can bring any of them back later from the console."
            />

            <div className="d-flex gap-3 flex-wrap mb-4">
                <StatTile value={rows.length} label="categories discovered" />
                <StatTile
                    value={data.stats.uniqueRunners}
                    label="unique runners"
                />
                <StatTile
                    value={data.stats.totalFinishedAttemptCount}
                    label="finished runs"
                />
            </div>

            {legacyHiddenCount > 0 && (
                <div className={styles.warnNote}>
                    {legacyHiddenCount} previously shown categor
                    {legacyHiddenCount === 1 ? 'y' : 'ies'} will be hidden when
                    you save — check them to keep them on the board.
                </div>
            )}

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Show on board</th>
                        <th>Category</th>
                        <th>Activity</th>
                        <th className="text-end">Runners</th>
                        <th className="text-end">Runs</th>
                        {showGroups && <th>Group</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
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
                                                    (r.totalFinishedAttemptCount /
                                                        maxRuns) *
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
                            {showGroups && (
                                <td>
                                    <select
                                        className="form-select form-select-sm"
                                        aria-label={`Group for ${r.display}`}
                                        value={r.groupId ?? ''}
                                        onChange={(e) =>
                                            setGroup(
                                                r.id,
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : null,
                                            )
                                        }
                                    >
                                        <option value="">Ungrouped</option>
                                        {groups.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mb-3">
                <div className="text-muted small">
                    {checkedCount} shown · {rows.length - checkedCount} hidden ·{' '}
                    {share}% of runs covered
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

            <button
                type="button"
                className="btn btn-link btn-sm px-0"
                onClick={() => setShowGroups((v) => !v)}
            >
                {showGroups ? 'Hide groups' : 'Organize into groups (optional)'}
            </button>
            {showGroups && (
                <div className="d-flex gap-2 my-2">
                    <input
                        className="form-control form-control-sm w-auto"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="New group name (e.g. Category Extensions)"
                    />
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={isSaving || !groupName.trim()}
                        onClick={addGroup}
                    >
                        Add group
                    </button>
                </div>
            )}

            {!mainOk && (
                <div className={`${styles.warnNote} mt-2`}>
                    Keep at least one category on the board — it’s what visitors
                    see.
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

function StatTile({ value, label }: { value: number; label: string }) {
    return (
        <div className={styles.statTile}>
            <span className={styles.statValue}>{value.toLocaleString()}</span>
            <span className={styles.statLabel}>{label}</span>
        </div>
    );
}
