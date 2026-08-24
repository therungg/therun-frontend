'use client';

import { useEffect, useState, useTransition } from 'react';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type {
    DuplicateRunDetail,
    DuplicateRunDetailRow,
    DuplicateRunDetailSide,
    DuplicateVerdictInput,
} from '../../../../types/duplicate-runs.types';
import adminStyles from '../admin.module.scss';
import {
    getDuplicateFindingAction,
    submitVerdictAction,
} from './actions/duplicate-runs-actions';
import styles from './duplicate-runs.module.scss';

function spanLabel(spanMs: number | null): string {
    if (spanMs === null) return 'unknown span';
    const days = spanMs / (24 * 60 * 60 * 1000);
    if (days < 1) return 'less than a day';
    if (days < 2) return '1 day';
    return `${Math.round(days)} days`;
}

function firstSeenLine(minCreatedAt: string | null): string {
    if (!minCreatedAt) return 'predates ingest tracking';
    return `first ingested ${new Date(minCreatedAt).toLocaleString()}`;
}

function DupRow({
    row,
    categoryNames,
}: {
    row: DuplicateRunDetailRow;
    categoryNames: Map<number, string>;
}) {
    const categoryLabel =
        categoryNames.get(row.categoryId) ?? `Category ${row.categoryId}`;
    return (
        <li
            className={`${styles.dupRowItem} ${row.excluded ? styles.dupRowExcluded : ''}`}
        >
            <span>
                {categoryLabel} · {formatTimeMs(row.time)}
                {row.isPb ? ' · PB' : ''}
            </span>
            <span>{new Date(row.endedAt).toLocaleDateString()}</span>
        </li>
    );
}

export function FindingDetail({
    findingId,
    state,
    onVerdictSubmitted,
}: {
    findingId: number;
    state: 'open' | 'dismissed' | 'actioned';
    onVerdictSubmitted: () => void;
}) {
    const [detail, setDetail] = useState<DuplicateRunDetail | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [verdictError, setVerdictError] = useState<string | null>(null);
    const [isSubmitting, startSubmit] = useTransition();

    useEffect(() => {
        let cancelled = false;
        getDuplicateFindingAction({ findingId }).then((res) => {
            if (cancelled) return;
            if ('error' in res) {
                setLoadError(res.error);
            } else {
                setDetail(res.result);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [findingId]);

    const submit = (verdict: DuplicateVerdictInput) => {
        setVerdictError(null);
        startSubmit(async () => {
            const res = await submitVerdictAction({ findingId, verdict });
            if ('error' in res) {
                setVerdictError(res.error);
                return;
            }
            onVerdictSubmitted();
        });
    };

    if (loadError) {
        return (
            <div className={styles.detailWrap}>
                <div className={adminStyles.alertDanger}>{loadError}</div>
            </div>
        );
    }

    if (!detail) {
        return (
            <div className={styles.detailWrap}>
                <span className={adminStyles.noData}>Loading…</span>
            </div>
        );
    }

    const { sides } = detail;
    const isOpen = state === 'open';
    const categoryNames = new Map(
        detail.categories.map((c) => [c.id, c.display]),
    );

    const renderSide = (
        side: DuplicateRunDetailSide,
        signalsForSide: DuplicateRunDetail['finding']['signals']['a'],
    ) => (
        <div className={styles.sideCol}>
            <h5 className={styles.sideUsername}>
                {side.user.username ?? `User ${side.user.id}`}
            </h5>
            <p className={styles.sideLine}>
                {firstSeenLine(signalsForSide.minCreatedAt)}
            </p>
            <p className={styles.sideLine}>
                {side.dupRows.length} attempts arrived over{' '}
                {spanLabel(signalsForSide.blockArrivalSpanMs)}
            </p>
            <p className={styles.sideLine}>
                {signalsForSide.organicNearCount} other attempts near the block
                {signalsForSide.lastOrganicEndedAt
                    ? ` · last active ${new Date(signalsForSide.lastOrganicEndedAt).toLocaleDateString()}`
                    : ''}
            </p>
            <ul className={styles.dupRowList}>
                {side.dupRows.map((row) => (
                    <DupRow
                        key={row.id}
                        row={row}
                        categoryNames={categoryNames}
                    />
                ))}
            </ul>
        </div>
    );

    return (
        <div className={styles.detailWrap}>
            <div className={styles.sideGrid}>
                {renderSide(sides.a, detail.finding.signals.a)}
                {renderSide(sides.b, detail.finding.signals.b)}
            </div>

            <div className={styles.verdictSection}>
                {verdictError && (
                    <div className={adminStyles.alertDanger}>
                        {verdictError}
                    </div>
                )}
                <label
                    className={adminStyles.formLabel}
                    htmlFor={`note-${findingId}`}
                >
                    Verdict note (required)
                </label>
                <textarea
                    id={`note-${findingId}`}
                    className={styles.verdictTextarea}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain the decision…"
                />
                <div className={styles.verdictButtons}>
                    <button
                        type="button"
                        className={adminStyles.btnOutline}
                        disabled={!isOpen || isSubmitting || !note.trim()}
                        onClick={() =>
                            submit({ action: 'dismiss', note: note.trim() })
                        }
                    >
                        Dismiss
                    </button>
                    <button
                        type="button"
                        className={adminStyles.btnDanger}
                        disabled={!isOpen || isSubmitting || !note.trim()}
                        onClick={() =>
                            submit({
                                action: 'exclude',
                                side: 'a',
                                note: note.trim(),
                            })
                        }
                    >
                        Exclude{' '}
                        {sides.a.user.username ?? `User ${sides.a.user.id}`}
                    </button>
                    <button
                        type="button"
                        className={adminStyles.btnDanger}
                        disabled={!isOpen || isSubmitting || !note.trim()}
                        onClick={() =>
                            submit({
                                action: 'exclude',
                                side: 'b',
                                note: note.trim(),
                            })
                        }
                    >
                        Exclude{' '}
                        {sides.b.user.username ?? `User ${sides.b.user.id}`}
                    </button>
                    <button
                        type="button"
                        className={adminStyles.btnDanger}
                        disabled={!isOpen || isSubmitting || !note.trim()}
                        onClick={() =>
                            submit({
                                action: 'exclude',
                                side: 'both',
                                note: note.trim(),
                            })
                        }
                    >
                        Exclude both
                    </button>
                </div>
            </div>
        </div>
    );
}
