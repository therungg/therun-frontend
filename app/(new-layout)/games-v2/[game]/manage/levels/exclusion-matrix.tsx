'use client';

import { useState } from 'react';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import type { LevelOverview } from '../../../../../../types/levels.types';
import styles from './levels.module.scss';

type Level = LevelOverview['levels'][number];
type Template = LevelOverview['templates'][number];

/** Checked state for one (level, template) cell: true unless the instance is
 *  explicitly excluded. No instance yet means nothing has been excluded. */
export function isIncluded(level: Level, templateId: number): boolean {
    const instance = level.instances.find((i) => i.templateId === templateId);
    return instance?.state !== 'excluded';
}

export interface ExclusionMatrixProps {
    gameId: number;
    gameSlug: string;
    levels: Level[];
    templates: Template[];
    onChanged: () => Promise<void>;
}

/** Which level carries which subcategory — a level×subcategory checkbox grid. */
export function ExclusionMatrix({
    gameId,
    gameSlug,
    levels,
    templates,
    onChanged,
}: ExclusionMatrixProps) {
    const [pendingCells, setPendingCells] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    if (levels.length === 0 || templates.length === 0) return null;

    const toggle = async (
        level: Level,
        templateId: number,
        checked: boolean,
    ) => {
        const cell = `${level.id}:${templateId}`;
        setPendingCells((prev) => new Set(prev).add(cell));
        setError(null);
        try {
            // The action reports auth and API failures by *returning*
            // `{ error }` rather than throwing, so the result has to be
            // inspected — otherwise a rejected toggle just snaps back with
            // no explanation.
            const res = await levelOpAction({
                gameSlug,
                gameId,
                op: {
                    op: 'level-exclusion',
                    groupId: level.id,
                    templateId,
                    excluded: !checked,
                },
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await onChanged();
        } catch {
            setError('Something went wrong. Try again.');
        } finally {
            setPendingCells((prev) => {
                const next = new Set(prev);
                next.delete(cell);
                return next;
            });
        }
    };

    return (
        <div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.tableScroll}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Level</th>
                            {templates.map((t) => (
                                <th key={t.id} className={styles.colCenter}>
                                    {t.display}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {levels.map((level) => (
                            <tr key={level.id}>
                                <th scope="row" className={styles.rowHeader}>
                                    {level.name}
                                </th>
                                {templates.map((t) => {
                                    const cell = `${level.id}:${t.id}`;
                                    return (
                                        <td
                                            key={t.id}
                                            className={styles.colCenter}
                                        >
                                            <input
                                                type="checkbox"
                                                aria-label={`${t.display} for ${level.name}`}
                                                checked={isIncluded(
                                                    level,
                                                    t.id,
                                                )}
                                                disabled={pendingCells.has(
                                                    cell,
                                                )}
                                                onChange={(e) =>
                                                    void toggle(
                                                        level,
                                                        t.id,
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
