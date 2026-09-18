'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { MergeCategoryOption } from '../../../../../../types/reassignments.types';
import {
    createCategoryAction,
    getCategoryStatusAction,
} from './reassignment-actions';
import { ReassignmentStatus } from './reassignment-status';
import styles from './reassignments.module.scss';

interface Props {
    source: MergeCategoryOption;
    target: MergeCategoryOption;
    targetGameSlug: string;
    onRestart: () => void;
}

/**
 * The confirm step of a category merge, and the status readout once it is
 * running. Both boards are already chosen by the picker; all that is left is
 * to say plainly what will happen and take the acknowledgement.
 */
export function CategoryWizard({
    source,
    target,
    targetGameSlug,
    onRestart,
}: Props) {
    const [acknowledged, setAcknowledged] = useState(false);
    const [createdId, setCreatedId] = useState<number | null>(null);
    const [isSubmitting, startSubmit] = useTransition();

    if (createdId !== null) {
        return (
            <div className={styles.surface}>
                <div className={styles.header}>
                    <p className={styles.eyebrow}>Category merge</p>
                    <h3 className={styles.title}>
                        Merging {source.display} into {target.display}
                    </h3>
                </div>
                <ReassignmentStatus
                    id={createdId}
                    fetcher={getCategoryStatusAction}
                    targetGameSlug={targetGameSlug}
                    onRestart={() => {
                        setCreatedId(null);
                        setAcknowledged(false);
                        onRestart();
                    }}
                />
            </div>
        );
    }

    const submit = () => {
        startSubmit(async () => {
            try {
                const res = await createCategoryAction({
                    sourceCategoryId: source.id,
                    targetCategoryId: target.id,
                });
                setCreatedId(res.id);
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to start',
                );
            }
        });
    };

    const runWord = source.runs === 1 ? 'run' : 'runs';

    return (
        <div className={styles.surface}>
            <div className={styles.header}>
                <p className={styles.eyebrow}>Category merge</p>
                <h3 className={styles.title}>
                    Merge {source.display} into {target.display}
                </h3>
                <p className={styles.subtitle}>
                    {source.runs} {runWord} move from {source.display} to{' '}
                    {target.display}. {source.display} becomes a redirect, so
                    links to it land on {target.display}.
                </p>
            </div>

            <label className={styles.ack}>
                <input
                    type="checkbox"
                    className={styles.ackBox}
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>
                    I understand {source.display} becomes a redirect and its
                    runs move to {target.display}. This can be undone.
                </span>
            </label>

            <div className={styles.actions}>
                <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={onRestart}
                    disabled={isSubmitting}
                >
                    Start over
                </button>
                <span className={styles.spacer} />
                <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={submit}
                    disabled={!acknowledged || isSubmitting}
                >
                    {isSubmitting ? 'Starting…' : 'Confirm merge'}
                </button>
            </div>
        </div>
    );
}
