'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    CategoryReassignment,
    GameReassignment,
} from '../../../../types/reassignments.types';
import styles from '../admin.module.scss';
import { undoReassignmentAction } from './actions/undo-reassignment.action';

interface Props {
    games: GameReassignment[];
    categories: CategoryReassignment[];
}

type Entry =
    | { kind: 'game'; row: GameReassignment }
    | { kind: 'category'; row: CategoryReassignment };

function canUndo(entry: Entry): boolean {
    if (entry.row.status !== 'completed') return false;
    if (
        entry.kind === 'category' &&
        entry.row.parentGameReassignmentId !== null
    ) {
        return false;
    }
    return true;
}

export const AuditLogClient = ({ games, categories }: Props) => {
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [isUndoing, startUndo] = useTransition();

    const entries = useMemo<Entry[]>(() => {
        const merged: Entry[] = [
            ...games.map((row) => ({ kind: 'game' as const, row })),
            ...categories.map((row) => ({ kind: 'category' as const, row })),
        ];
        return merged.sort(
            (a, b) =>
                new Date(b.row.performedAt).getTime() -
                new Date(a.row.performedAt).getTime(),
        );
    }, [games, categories]);

    const handleUndo = (entry: Entry) => {
        if (
            !confirm(
                `Undo ${entry.kind} reassignment #${entry.row.id}? This reverses the merge.`,
            )
        ) {
            return;
        }
        startUndo(async () => {
            try {
                await undoReassignmentAction(entry.kind, entry.row.id);
                toast.success('Reassignment undone');
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Undo failed');
            }
        });
    };

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h4 className={styles.panelTitle}>
                        Reassignment audit log
                    </h4>
                    <span className={styles.panelCount}>{entries.length}</span>
                </div>
                <div className={styles.panelBody}>
                    {entries.length === 0 ? (
                        <span className={styles.noData}>
                            No reassignments recorded.
                        </span>
                    ) : (
                        <table className={styles.table}>
                            <thead className={styles.tableHeader}>
                                <tr>
                                    <th>ID</th>
                                    <th>Kind</th>
                                    <th>Source → Target</th>
                                    <th>By</th>
                                    <th>Status</th>
                                    <th>Runs</th>
                                    <th>When</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody className={styles.tableBody}>
                                {entries.map((entry) => {
                                    const key = `${entry.kind}-${entry.row.id}`;
                                    const expanded = expandedKey === key;
                                    const source =
                                        entry.kind === 'game'
                                            ? entry.row.sourceGameId
                                            : entry.row.sourceCategoryId;
                                    const target =
                                        entry.kind === 'game'
                                            ? entry.row.targetGameId
                                            : (entry.row.targetCategoryId ??
                                              '—');
                                    const detail =
                                        entry.kind === 'game'
                                            ? entry.row.categoryMapping
                                            : entry.row
                                                  .settingsDiffsAcknowledged;
                                    const showViaParent =
                                        entry.kind === 'category' &&
                                        entry.row.parentGameReassignmentId !==
                                            null;
                                    return (
                                        <Fragment key={key}>
                                            <tr
                                                onClick={() =>
                                                    setExpandedKey(
                                                        expanded ? null : key,
                                                    )
                                                }
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td>{entry.row.id}</td>
                                                <td>{entry.kind}</td>
                                                <td>
                                                    {source} → {target}
                                                </td>
                                                <td>{entry.row.performedBy}</td>
                                                <td>{entry.row.status}</td>
                                                <td>
                                                    {entry.row.runsMovedCount}
                                                </td>
                                                <td>
                                                    {new Date(
                                                        entry.row.performedAt,
                                                    ).toLocaleString()}
                                                </td>
                                                <td>
                                                    {canUndo(entry) ? (
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.btnDanger
                                                            }
                                                            disabled={isUndoing}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUndo(
                                                                    entry,
                                                                );
                                                            }}
                                                        >
                                                            Undo
                                                        </button>
                                                    ) : showViaParent ? (
                                                        <span
                                                            title="Undo via the parent game reassignment"
                                                            className={
                                                                styles.noData
                                                            }
                                                        >
                                                            via parent
                                                        </span>
                                                    ) : null}
                                                </td>
                                            </tr>
                                            {expanded && (
                                                <tr>
                                                    <td colSpan={8}>
                                                        <pre
                                                            style={{
                                                                whiteSpace:
                                                                    'pre-wrap',
                                                                margin: 0,
                                                            }}
                                                        >
                                                            {JSON.stringify(
                                                                detail,
                                                                null,
                                                                2,
                                                            )}
                                                        </pre>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
