'use client';

import { useState } from 'react';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type {
    WorklistBatch,
    WorklistItem,
} from '../../../../../../../types/worklist.types';
import type { ModVerb } from '../shared/action-model';
import styles from './worklist-pane.module.scss';
import { WorklistRow } from './worklist-row';

export function WorklistBatchCard({
    batch,
    now,
    busy,
    onApproveAll,
    onApprove,
    onVerb,
    onHideIdentity,
    onInspect,
    variables,
}: {
    batch: WorklistBatch;
    variables: VariableRow[];
    now: Date;
    busy: boolean;
    onApproveAll: (batch: WorklistBatch) => void;
    onApprove: (item: WorklistItem) => void;
    onVerb: (item: WorklistItem, verb: ModVerb) => void;
    onHideIdentity: (item: WorklistItem) => void;
    onInspect: (item: WorklistItem) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <section className={styles.batch}>
            <div className={styles.batchHead}>
                <button
                    type="button"
                    className={styles.batchToggle}
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                >
                    {batch.label}
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={busy}
                    onClick={() => onApproveAll(batch)}
                >
                    Approve all {batch.runIds.length}
                </button>
            </div>
            {open && (
                <ul className={styles.rows}>
                    {batch.items.map((item) => (
                        <WorklistRow
                            variables={variables}
                            key={item.runId}
                            item={item}
                            now={now}
                            busy={busy}
                            onApprove={onApprove}
                            onVerb={onVerb}
                            onHideIdentity={onHideIdentity}
                            onInspect={onInspect}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
