'use client';

import { useState } from 'react';
import { createLevelTemplateAction } from '~src/actions/levels/create-level-template.action';
import type { LevelOverview } from '../../../../../../types/levels.types';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';
import { AddRowForm } from './add-row-form';
import styles from './levels.module.scss';

type Template = LevelOverview['templates'][number];

/** "3 synced, 1 overridden" — zero parts drop out; "No boards yet" if all zero. */
export function templateCoverage(t: Template): string {
    const parts: string[] = [];
    if (t.synced > 0) parts.push(`${t.synced} synced`);
    if (t.overridden > 0) parts.push(`${t.overridden} overridden`);
    if (t.excluded > 0) parts.push(`${t.excluded} excluded`);
    return parts.length > 0 ? parts.join(', ') : 'No boards yet';
}

export interface SubcategoriesTableProps {
    gameId: number;
    gameSlug: string;
    templates: Template[];
    onChanged: () => Promise<void>;
}

/**
 * Level subcategories (level templates) — the categories every level shares,
 * e.g. "Any%" across every stage. Renaming an existing one isn't supported
 * anywhere in the console yet, this pane included; removing archives it
 * (there is no un-archive path for a level template today, matching the
 * wizard's editor).
 */
export function SubcategoriesTable({
    gameId,
    gameSlug,
    templates,
    onChanged,
}: SubcategoriesTableProps) {
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
    const [addPending, setAddPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addSubcategory = async (display: string) => {
        setAddPending(true);
        setError(null);
        try {
            const res = await createLevelTemplateAction({
                gameSlug,
                gameId,
                display,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await onChanged();
        } finally {
            setAddPending(false);
        }
    };

    const removeSubcategory = async (t: Template) => {
        if (
            !window.confirm(`Remove "${t.display}"? This archives its boards.`)
        ) {
            return;
        }
        setPendingIds((prev) => new Set(prev).add(t.id));
        setError(null);
        try {
            const res = await updateVisibilityAction({
                gameSlug,
                gameId,
                categoryId: t.id,
                active: false,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await onChanged();
        } finally {
            setPendingIds((prev) => {
                const next = new Set(prev);
                next.delete(t.id);
                return next;
            });
        }
    };

    return (
        <div>
            {error && <p className={styles.error}>{error}</p>}

            <AddRowForm
                label="Add subcategory"
                placeholder="Any%"
                pending={addPending}
                onAdd={(name) => void addSubcategory(name)}
            />

            {templates.length === 0 ? (
                <p className={styles.empty}>
                    No subcategories yet — add the first one above.
                </p>
            ) : (
                <div className={styles.tableScroll}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Subcategory</th>
                                <th>Boards</th>
                                <th className={styles.colActions}>
                                    <span className="visually-hidden">
                                        Actions
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map((t) => (
                                <tr key={t.id}>
                                    <td>{t.display}</td>
                                    <td className={styles.boardsCell}>
                                        {templateCoverage(t)}
                                    </td>
                                    <td className={styles.colActions}>
                                        <button
                                            type="button"
                                            className={styles.dangerAction}
                                            aria-label={`Remove ${t.display}`}
                                            disabled={pendingIds.has(t.id)}
                                            onClick={() =>
                                                void removeSubcategory(t)
                                            }
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
