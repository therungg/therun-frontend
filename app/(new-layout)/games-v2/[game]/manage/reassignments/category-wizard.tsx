'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    createCategoryAction,
    getCategoryStatusAction,
} from './reassignment-actions';
import { ReassignmentStatus } from './reassignment-status';
import styles from './reassignments.module.scss';

interface CategoryOption {
    id: number;
    display: string;
}

interface Props {
    sourceCategory: CategoryOption;
    categories: CategoryOption[];
    targetGameSlug: string;
}

export function CategoryWizard({
    sourceCategory,
    categories,
    targetGameSlug,
}: Props) {
    const [targetId, setTargetId] = useState<number | null>(null);
    const [acknowledged, setAcknowledged] = useState(false);
    const [createdId, setCreatedId] = useState<number | null>(null);
    const [isSubmitting, startSubmit] = useTransition();

    const targets = categories.filter((c) => c.id !== sourceCategory.id);

    if (createdId !== null) {
        return (
            <div className={styles.wizard}>
                <h3>Reassigning {sourceCategory.display}</h3>
                <ReassignmentStatus
                    id={createdId}
                    fetcher={getCategoryStatusAction}
                    targetGameSlug={targetGameSlug}
                    onRestart={() => {
                        setCreatedId(null);
                        setAcknowledged(false);
                        setTargetId(null);
                    }}
                />
            </div>
        );
    }

    const submit = () => {
        if (targetId === null) return;
        startSubmit(async () => {
            try {
                const res = await createCategoryAction({
                    sourceCategoryId: sourceCategory.id,
                    targetCategoryId: targetId,
                });
                setCreatedId(res.id);
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to start',
                );
            }
        });
    };

    return (
        <div className={styles.wizard}>
            <h3>Reassign category: {sourceCategory.display}</h3>

            <div className={styles.step}>
                <label htmlFor="target-cat">Target category (same game)</label>
                <select
                    id="target-cat"
                    value={targetId ?? ''}
                    onChange={(e) =>
                        setTargetId(
                            e.target.value ? Number(e.target.value) : null,
                        )
                    }
                >
                    <option value="">Select…</option>
                    {targets.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.display}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.step}>
                <label>
                    <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                    />{' '}
                    I understand the source category becomes a redirect and its
                    runs move to the target. This is reversible via the audit
                    log.
                </label>
            </div>

            <button
                type="button"
                onClick={submit}
                disabled={targetId === null || !acknowledged || isSubmitting}
            >
                {isSubmitting ? 'Starting…' : 'Confirm reassignment'}
            </button>
        </div>
    );
}
