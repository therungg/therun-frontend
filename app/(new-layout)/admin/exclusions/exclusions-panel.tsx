'use client';

import { FormEvent, useState, useTransition } from 'react';
import {
    ExclusionRule,
    ExclusionType,
} from '../../../../types/exclusions.types';
import styles from '../admin.module.scss';
import { createExclusionAction } from './actions/create-exclusion.action';
import { deleteExclusionAction } from './actions/delete-exclusion.action';

const EXCLUSION_TYPES: ExclusionType[] = ['user', 'game', 'category', 'run'];

const TYPE_BADGE_STYLE: Record<ExclusionType, string> = {
    user: 'badgeDanger',
    game: 'badgeSuccess',
    category: 'badgeWarning',
    run: 'badgeInfo',
};

type FilterTab = 'all' | ExclusionType;

export const ExclusionsPanel = ({
    exclusions,
}: {
    exclusions: ExclusionRule[];
}) => {
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [type, setType] = useState<ExclusionType>('user');
    const [targetId, setTargetId] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isCreating, startCreateTransition] = useTransition();
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [_isDeleting, startDeleteTransition] = useTransition();

    const filteredExclusions =
        activeTab === 'all'
            ? exclusions
            : exclusions.filter((e) => e.type === activeTab);

    const handleCreate = (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        const parsedId = Number(targetId);
        if (!targetId || Number.isNaN(parsedId)) {
            setError('Target ID must be a valid number.');
            return;
        }

        startCreateTransition(async () => {
            try {
                await createExclusionAction(
                    type,
                    parsedId,
                    reason || undefined,
                );
                setTargetId('');
                setReason('');
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to create exclusion rule.',
                );
            }
        });
    };

    const handleDelete = (ruleId: number) => {
        if (!confirm('Are you sure you want to delete this exclusion rule?')) {
            return;
        }

        setDeletingId(ruleId);
        startDeleteTransition(async () => {
            try {
                await deleteExclusionAction(ruleId);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to delete exclusion rule.',
                );
            } finally {
                setDeletingId(null);
            }
        });
    };

    const tabs: { label: string; value: FilterTab }[] = [
        { label: 'All', value: 'all' },
        { label: 'User', value: 'user' },
        { label: 'Game', value: 'game' },
        { label: 'Category', value: 'category' },
        { label: 'Run', value: 'run' },
    ];

    return (
        <div className={styles.pageWide}>
            <h1 className={styles.pageTitle}>Exclusion Rules</h1>

            {/* Create Form */}
            <div className={styles.panel} style={{ marginBottom: '1.5rem' }}>
                <div className={styles.panelHeader}>
                    <h4 className={styles.panelTitle}>Create Exclusion Rule</h4>
                </div>
                <div className={styles.panelBody}>
                    {error && <div className={styles.alertDanger}>{error}</div>}
                    <form onSubmit={handleCreate}>
                        <div className="row g-3 align-items-end">
                            <div className="col-md-3">
                                <label className={styles.formLabel}>Type</label>
                                <select
                                    className={styles.select}
                                    value={type}
                                    onChange={(e) =>
                                        setType(e.target.value as ExclusionType)
                                    }
                                >
                                    {EXCLUSION_TYPES.map((t) => (
                                        <option key={t} value={t}>
                                            {t.charAt(0).toUpperCase() +
                                                t.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className={styles.formLabel}>
                                    Target ID
                                </label>
                                <input
                                    type="number"
                                    className={styles.formInput}
                                    value={targetId}
                                    onChange={(e) =>
                                        setTargetId(e.target.value)
                                    }
                                    placeholder="Enter target ID"
                                    required
                                />
                            </div>
                            <div className="col-md-4">
                                <label className={styles.formLabel}>
                                    Reason (optional)
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Enter reason"
                                />
                            </div>
                            <div className="col-md-2">
                                <button
                                    type="submit"
                                    className={styles.btnPrimary}
                                    disabled={isCreating}
                                    style={{ width: '100%' }}
                                >
                                    {isCreating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className={styles.filterRow}>
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        className={
                            activeTab === tab.value
                                ? styles.filterChipActive
                                : styles.filterChip
                        }
                        onClick={() => setActiveTab(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Exclusions Table */}
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h4 className={styles.panelTitle}>Exclusion Rules</h4>
                    <span className={styles.panelCount}>
                        {filteredExclusions.length} Rules
                    </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead className={styles.tableHeader}>
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Target ID</th>
                                <th>Reason</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tableBody}>
                            {filteredExclusions.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{
                                            textAlign: 'center',
                                            padding: '2rem',
                                        }}
                                    >
                                        <span className={styles.noData}>
                                            No exclusion rules found.
                                        </span>
                                    </td>
                                </tr>
                            ) : (
                                filteredExclusions.map((rule) => (
                                    <tr key={rule.id}>
                                        <td>{rule.id}</td>
                                        <td>
                                            <span
                                                className={
                                                    styles[
                                                        TYPE_BADGE_STYLE[
                                                            rule.type
                                                        ] as keyof typeof styles
                                                    ] || ''
                                                }
                                            >
                                                {rule.type}
                                            </span>
                                        </td>
                                        <td>{rule.targetId}</td>
                                        <td>{rule.reason ?? '-'}</td>
                                        <td>
                                            {new Date(
                                                rule.createdAt,
                                            ).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <button
                                                className={styles.btnDanger}
                                                disabled={
                                                    deletingId === rule.id
                                                }
                                                onClick={() =>
                                                    handleDelete(rule.id)
                                                }
                                            >
                                                {deletingId === rule.id
                                                    ? 'Deleting...'
                                                    : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
