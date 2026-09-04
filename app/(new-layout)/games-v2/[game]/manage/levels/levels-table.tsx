'use client';

import { useEffect, useRef, useState } from 'react';
import { deleteGroupAction } from '~src/actions/category-group/delete-group.action';
import { createLevelAction } from '~src/actions/levels/create-level.action';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import { updateLevelAction } from '~src/actions/levels/update-level.action';
import type { LevelOverview } from '../../../../../../types/levels.types';
import { InlineError } from '../shared/form-kit';
import { AddRowForm } from './add-row-form';
import styles from './levels.module.scss';

type Level = LevelOverview['levels'][number];
type Template = LevelOverview['templates'][number];

/**
 * How many of `templates` this level actually has a board for. Only
 * template-backed instances count: a level-only board carries no
 * `templateId` and matches no column, so counting raw instances would
 * report "3 of 2".
 */
export function levelBoardSummary(
    level: Level,
    templates: Template[],
): { have: number; total: number } {
    const have = level.instances.filter((i) =>
        templates.some((t) => t.id === i.templateId),
    ).length;
    return { have, total: templates.length };
}

/** True when some level is missing a board for some template. */
export function needsMaterialise(
    levels: Level[],
    templates: Template[],
): boolean {
    if (templates.length === 0) return false;
    return levels.some((l) =>
        templates.some((t) => !l.instances.some((i) => i.templateId === t.id)),
    );
}

export interface LevelsTableProps {
    gameId: number;
    gameSlug: string;
    levels: Level[];
    templates: Template[];
    onChanged: () => Promise<void>;
}

export function LevelsTable({
    gameId,
    gameSlug,
    levels,
    templates,
    onChanged,
}: LevelsTableProps) {
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
    const [addPending, setAddPending] = useState(false);
    const [materialisePending, setMaterialisePending] = useState(false);
    const [openRules, setOpenRules] = useState<Set<number>>(new Set());
    const [draftRules, setDraftRules] = useState<Map<number, string>>(
        new Map(),
    );
    const [error, setError] = useState<string | null>(null);

    // Opening and closing the rules editor swaps one control for another, so
    // focus has to be carried across by hand or a keyboard user is dropped to
    // <body>. Each side registers its element, and a one-shot state flag says
    // which one to focus after the next commit.
    const rulesTextareas = useRef(new Map<number, HTMLTextAreaElement>());
    const rulesTriggers = useRef(new Map<number, HTMLButtonElement>());
    const [focusTextareaId, setFocusTextareaId] = useState<number | null>(null);
    const [focusTriggerId, setFocusTriggerId] = useState<number | null>(null);

    useEffect(() => {
        if (focusTextareaId === null) return;
        rulesTextareas.current.get(focusTextareaId)?.focus();
        setFocusTextareaId(null);
    }, [focusTextareaId]);

    useEffect(() => {
        if (focusTriggerId === null) return;
        rulesTriggers.current.get(focusTriggerId)?.focus();
        setFocusTriggerId(null);
    }, [focusTriggerId]);

    const openRulesEditor = (levelId: number) => {
        setOpenRules((prev) => new Set(prev).add(levelId));
        setFocusTextareaId(levelId);
    };

    const closeRules = (levelId: number) => {
        setOpenRules((prev) => {
            const next = new Set(prev);
            next.delete(levelId);
            return next;
        });
        setFocusTriggerId(levelId);
        // Drop the draft too, or reopening the editor and hitting Save would
        // re-submit the text that was just cancelled.
        setDraftRules((prev) => {
            const next = new Map(prev);
            next.delete(levelId);
            return next;
        });
    };

    /**
     * Runs one row's action. These actions report auth and API failures by
     * *returning* `{ error }` rather than throwing, so the result has to be
     * inspected — only a genuine success reloads the overview. Resolves true
     * when the write went through.
     */
    const withPending = async (
        id: number,
        fn: () => Promise<{ result: unknown } | { error: string }>,
    ): Promise<boolean> => {
        setPendingIds((prev) => new Set(prev).add(id));
        setError(null);
        try {
            const res = await fn();
            if ('error' in res) {
                setError(res.error);
                return false;
            }
            await onChanged();
            return true;
        } catch {
            setError('Something went wrong. Try again.');
            return false;
        } finally {
            setPendingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const addLevel = async (name: string) => {
        setAddPending(true);
        setError(null);
        try {
            const res = await createLevelAction({ gameSlug, gameId, name });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await onChanged();
        } catch {
            setError('Something went wrong. Try again.');
        } finally {
            setAddPending(false);
        }
    };

    const renameLevel = async (level: Level, input: HTMLInputElement) => {
        const trimmed = input.value.trim();
        if (!trimmed) {
            // Nothing to save, and an empty box misrepresents the level —
            // put the current name back.
            input.value = level.name;
            return;
        }
        if (trimmed === level.name) return;
        const ok = await withPending(level.id, () =>
            updateLevelAction({
                gameSlug,
                gameId,
                groupId: level.id,
                name: trimmed,
            }),
        );
        // The box is uncontrolled, so a rejected rename would otherwise sit
        // there looking saved. Put the real name back.
        if (!ok) input.value = level.name;
    };

    const saveRules = async (level: Level) => {
        const rules = draftRules.get(level.id) ?? level.rules ?? '';
        const ok = await withPending(level.id, () =>
            updateLevelAction({ gameSlug, gameId, groupId: level.id, rules }),
        );
        // Keep the editor open on failure so the draft isn't thrown away.
        if (ok) closeRules(level.id);
    };

    const removeLevel = (level: Level) => {
        if (
            !window.confirm(`Remove "${level.name}"? This archives its boards.`)
        ) {
            return;
        }
        void withPending(level.id, () =>
            deleteGroupAction({ gameSlug, gameId, groupId: level.id }),
        );
    };

    const materialise = async () => {
        setMaterialisePending(true);
        setError(null);
        try {
            const res = await levelOpAction({
                gameSlug,
                gameId,
                op: { op: 'level-materialise' },
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await onChanged();
        } catch {
            setError('Something went wrong. Try again.');
        } finally {
            setMaterialisePending(false);
        }
    };

    return (
        <div>
            {needsMaterialise(levels, templates) && (
                <div className={styles.banner}>
                    <span>
                        Some levels are missing boards for a subcategory.
                    </span>
                    <button
                        type="button"
                        className={styles.bannerAction}
                        disabled={materialisePending}
                        onClick={() => void materialise()}
                    >
                        {materialisePending
                            ? 'Creating…'
                            : 'Create missing boards'}
                    </button>
                </div>
            )}

            <InlineError>{error}</InlineError>

            <AddRowForm
                label="Add level"
                placeholder="E1M1"
                pending={addPending}
                onAdd={(name) => void addLevel(name)}
            />

            {levels.length === 0 ? (
                <p className={styles.empty}>
                    No levels yet — add the first one above.
                </p>
            ) : (
                <div className={styles.tableScroll}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Level</th>
                                <th>Rules</th>
                                <th>Boards</th>
                                <th className={styles.colActions}>
                                    <span className="visually-hidden">
                                        Actions
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {levels.map((level) => {
                                const pending = pendingIds.has(level.id);
                                const summary = levelBoardSummary(
                                    level,
                                    templates,
                                );
                                const rulesOpen = openRules.has(level.id);
                                return (
                                    <tr key={level.id}>
                                        <td>
                                            <input
                                                type="text"
                                                className={styles.rowInput}
                                                aria-label={`Level name: ${level.name}`}
                                                defaultValue={level.name}
                                                disabled={pending}
                                                onBlur={(e) =>
                                                    void renameLevel(
                                                        level,
                                                        e.target,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td>
                                            {rulesOpen ? (
                                                <div
                                                    className={styles.rulesEdit}
                                                >
                                                    <textarea
                                                        ref={(el) => {
                                                            if (el) {
                                                                rulesTextareas.current.set(
                                                                    level.id,
                                                                    el,
                                                                );
                                                            } else {
                                                                rulesTextareas.current.delete(
                                                                    level.id,
                                                                );
                                                            }
                                                        }}
                                                        className={
                                                            styles.rulesTextarea
                                                        }
                                                        rows={3}
                                                        aria-label={`Rules for ${level.name}`}
                                                        defaultValue={
                                                            level.rules ?? ''
                                                        }
                                                        disabled={pending}
                                                        onChange={(e) =>
                                                            setDraftRules(
                                                                (prev) =>
                                                                    new Map(
                                                                        prev,
                                                                    ).set(
                                                                        level.id,
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                            )
                                                        }
                                                    />
                                                    <div
                                                        className={
                                                            styles.rulesActions
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.quietAction
                                                            }
                                                            disabled={pending}
                                                            onClick={() =>
                                                                void saveRules(
                                                                    level,
                                                                )
                                                            }
                                                        >
                                                            Save rules
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.quietAction
                                                            }
                                                            onClick={() =>
                                                                closeRules(
                                                                    level.id,
                                                                )
                                                            }
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    ref={(el) => {
                                                        if (el) {
                                                            rulesTriggers.current.set(
                                                                level.id,
                                                                el,
                                                            );
                                                        } else {
                                                            rulesTriggers.current.delete(
                                                                level.id,
                                                            );
                                                        }
                                                    }}
                                                    className={
                                                        styles.quietAction
                                                    }
                                                    onClick={() =>
                                                        openRulesEditor(
                                                            level.id,
                                                        )
                                                    }
                                                >
                                                    {level.rules?.trim()
                                                        ? 'Edit rules'
                                                        : 'Add rules'}
                                                </button>
                                            )}
                                        </td>
                                        <td className={styles.boardsCell}>
                                            {summary.have} of {summary.total}
                                        </td>
                                        <td className={styles.colActions}>
                                            <button
                                                type="button"
                                                className={styles.dangerAction}
                                                aria-label={`Remove ${level.name}`}
                                                disabled={pending}
                                                onClick={() =>
                                                    removeLevel(level)
                                                }
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
