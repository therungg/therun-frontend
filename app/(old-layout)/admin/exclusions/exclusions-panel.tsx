'use client';

import { FormEvent, useState, useTransition } from 'react';
import { Badge, Button, Form } from 'react-bootstrap';
import {
    ExclusionRule,
    ExclusionType,
} from '../../../../types/exclusions.types';
import { createExclusionAction } from './actions/create-exclusion.action';
import { deleteExclusionAction } from './actions/delete-exclusion.action';

const EXCLUSION_TYPES: ExclusionType[] = ['user', 'game', 'category', 'run'];

const TYPE_BADGE_VARIANT: Record<ExclusionType, string> = {
    user: 'danger',
    game: 'success',
    category: 'warning',
    run: 'info',
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
        <div className="container mt-5">
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">Create Exclusion Rule</h4>
                </div>
                <div className="card-body">
                    {error && (
                        <div className="alert alert-danger mb-3">{error}</div>
                    )}
                    <form onSubmit={handleCreate}>
                        <div className="row g-3 align-items-end">
                            <div className="col-md-3">
                                <Form.Label>Type</Form.Label>
                                <Form.Select
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
                                </Form.Select>
                            </div>
                            <div className="col-md-3">
                                <Form.Label>Target ID</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={targetId}
                                    onChange={(e) =>
                                        setTargetId(e.target.value)
                                    }
                                    placeholder="Enter target ID"
                                    required
                                />
                            </div>
                            <div className="col-md-4">
                                <Form.Label>Reason (optional)</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Enter reason"
                                />
                            </div>
                            <div className="col-md-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isCreating}
                                    className="w-100"
                                >
                                    {isCreating ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div className="d-flex gap-2 mb-3">
                {tabs.map((tab) => (
                    <Button
                        key={tab.value}
                        variant={
                            activeTab === tab.value
                                ? 'primary'
                                : 'outline-secondary'
                        }
                        size="sm"
                        onClick={() => setActiveTab(tab.value)}
                    >
                        {tab.label}
                    </Button>
                ))}
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">Exclusion Rules</h4>
                    <span>{filteredExclusions.length} Rules</span>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Type</th>
                                    <th>Target ID</th>
                                    <th>Reason</th>
                                    <th>Created At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExclusions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="text-center py-4 text-muted"
                                        >
                                            No exclusion rules found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExclusions.map((rule) => (
                                        <tr key={rule.id}>
                                            <td className="align-middle">
                                                {rule.id}
                                            </td>
                                            <td className="align-middle">
                                                <Badge
                                                    bg={
                                                        TYPE_BADGE_VARIANT[
                                                            rule.type
                                                        ]
                                                    }
                                                >
                                                    {rule.type}
                                                </Badge>
                                            </td>
                                            <td className="align-middle">
                                                {rule.targetId}
                                            </td>
                                            <td className="align-middle">
                                                {rule.reason ?? '-'}
                                            </td>
                                            <td className="align-middle">
                                                {new Date(
                                                    rule.createdAt,
                                                ).toLocaleDateString()}
                                            </td>
                                            <td className="align-middle">
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
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
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
