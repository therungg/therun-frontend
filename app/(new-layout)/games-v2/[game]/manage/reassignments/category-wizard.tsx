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
            <div className={styles.surface}>
                <div className={styles.header}>
                    <p className={styles.eyebrow}>Category reassignment</p>
                    <h3 className={styles.title}>
                        Reassigning {sourceCategory.display}
                    </h3>
                </div>
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
        <div className={styles.surface}>
            <div className={styles.header}>
                <p className={styles.eyebrow}>Category reassignment</p>
                <h3 className={styles.title}>
                    Reassign category: {sourceCategory.display}
                </h3>
                <p className={styles.subtitle}>
                    Merge this category's runs into another category in the same
                    game.
                </p>
            </div>

            <div className={styles.step}>
                <label htmlFor="target-cat" className={styles.label}>
                    Target category
                </label>
                <select
                    id="target-cat"
                    className={styles.select}
                    value={targetId ?? ''}
                    onChange={(e) =>
                        setTargetId(
                            e.target.value ? Number(e.target.value) : null,
                        )
                    }
                >
                    <option value="">Select a category…</option>
                    {targets.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.display}
                        </option>
                    ))}
                </select>
            </div>

            <label className={styles.ack}>
                <input
                    type="checkbox"
                    className={styles.ackBox}
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>
                    I understand the source category becomes a redirect and its
                    runs move to the target. This is reversible via the audit
                    log.
                </span>
            </label>

            <div className={styles.actions}>
                <span className={styles.spacer} />
                <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={submit}
                    disabled={
                        targetId === null || !acknowledged || isSubmitting
                    }
                >
                    {isSubmitting ? 'Starting…' : 'Confirm reassignment'}
                </button>
            </div>
        </div>
    );
}
