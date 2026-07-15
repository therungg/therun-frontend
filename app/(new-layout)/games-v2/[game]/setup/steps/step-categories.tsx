'use client';

import { useState, useTransition } from 'react';
import Link from '~src/components/link';
import { activityShare } from '~src/lib/setup/suggestions';
import { createGroupAction } from '../actions/create-group.action';
import { curateCategoryAction } from '../actions/curate-category.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';

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
    // Pre-check: resolveCategory already filters low-activity categories, so
    // everything we see is worth showing; keep current flags as the baseline
    // and default the top category to main when none is set.
    const anyMain = data.categories.some(
        (c) => (c.active ?? true) && (c.isMain ?? false),
    );
    const [rows, setRows] = useState<RowState[]>(
        data.categories.map((c, i) => ({
            id: c.id,
            display: c.display,
            main:
                ((c.active ?? true) && (c.isMain ?? false)) ||
                (!anyMain && i === 0),
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
                <h2 className="h4">Categories</h2>
                <p>
                    Categories appear automatically when runs are submitted or
                    ingested from timers — there’s nothing to curate yet. Once
                    the first runs arrive, come back here (or use the console)
                    to choose what shows on the board.
                </p>
                <Link href={`/games-v2/${data.game.name}/submit`}>
                    Point runners at the submission form →
                </Link>
                <div>
                    <button
                        type="button"
                        className="btn btn-primary mt-3"
                        onClick={onAdvance}
                    >
                        Continue
                    </button>
                </div>
            </section>
        );
    }

    const legacyHiddenCount = rows.filter((r) => {
        const orig = data.categories.find((c) => c.id === r.id);
        return (
            orig && (orig.active ?? true) && !(orig.isMain ?? false) && !r.main
        );
    }).length;

    const checkedCount = rows.filter((r) => r.main).length;
    const share = activityShare(
        rows.map((r) => ({
            totalFinishedAttemptCount: r.totalFinishedAttemptCount,
            active: r.main,
        })),
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
                    ((orig.active ?? true) !== r.main ||
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
            <h2 className="h4">Categories</h2>
            <div className={styles.infoNote}>
                Checked categories are your main categories — they appear on the
                leaderboards. Unchecked categories stay hidden. Checked
                categories hold {share}% of this board’s finished runs.
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
                        <th>Show on board (main)</th>
                        <th>Category</th>
                        <th className="text-end">Runners</th>
                        <th className="text-end">Runs</th>
                        {showGroups && <th>Group</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id} className={r.main ? '' : 'text-muted'}>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={r.main}
                                    onChange={(e) =>
                                        setMain(r.id, e.target.checked)
                                    }
                                />
                            </td>
                            <td>
                                {r.display}
                                {r.error && (
                                    <div className="text-danger small">
                                        {r.error}
                                    </div>
                                )}
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
            <div className="text-muted small mb-2">
                {checkedCount} shown / {rows.length - checkedCount} hidden
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
                    Mark at least one category as main — they’re what visitors
                    see.
                </div>
            )}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className="btn btn-primary mt-2"
                disabled={isSaving || !mainOk}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}
