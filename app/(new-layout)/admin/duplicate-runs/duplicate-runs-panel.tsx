'use client';

import { useState, useTransition } from 'react';
import type {
    DuplicateFindingSignals,
    DuplicateFindingState,
    DuplicateRunFinding,
    DuplicateRunListResponse,
    DuplicateScanInfo,
} from '../../../../types/duplicate-runs.types';
import adminStyles from '../admin.module.scss';
import {
    getLatestScanAction,
    listDuplicateFindingsAction,
    startFullScanAction,
} from './actions/duplicate-runs-actions';
import styles from './duplicate-runs.module.scss';
import { FindingDetail } from './finding-detail';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function signalSummary(signals: DuplicateFindingSignals): {
    label: string;
    className: string;
} {
    const { a, b } = signals;
    if (a.minCreatedAt && b.minCreatedAt) {
        const diffMs = Math.abs(
            new Date(a.minCreatedAt).getTime() -
                new Date(b.minCreatedAt).getTime(),
        );
        if (diffMs > SEVEN_DAYS_MS) {
            return {
                label: 'first-seen decisive',
                className: styles.signalDecisive,
            };
        }
    }
    const aOrganic = a.organicNearCount > 0;
    const bOrganic = b.organicNearCount > 0;
    if (aOrganic !== bOrganic) {
        return {
            label: 'one-sided continuity',
            className: styles.signalContinuity,
        };
    }
    return { label: 'undecided', className: styles.signalChip };
}

const STATE_TABS: { label: string; value: DuplicateFindingState }[] = [
    { label: 'Open', value: 'open' },
    { label: 'Dismissed', value: 'dismissed' },
    { label: 'Actioned', value: 'actioned' },
];

const PAGE_SIZE = 25;

export function DuplicateRunsPanel({
    initialFindings,
    initialScan,
}: {
    initialFindings: DuplicateRunListResponse;
    initialScan: DuplicateScanInfo | null;
}) {
    const [activeState, setActiveState] =
        useState<DuplicateFindingState>('open');
    const [page, setPage] = useState(1);
    const [listResult, setListResult] =
        useState<DuplicateRunListResponse>(initialFindings);
    const [latestScan, setLatestScan] = useState<DuplicateScanInfo | null>(
        initialScan,
    );
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();
    const [isScanning, startScanTransition] = useTransition();

    const refetchList = (state: DuplicateFindingState, nextPage: number) => {
        setError(null);
        startLoadTransition(async () => {
            const res = await listDuplicateFindingsAction({
                state,
                page: nextPage,
                pageSize: PAGE_SIZE,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setListResult(res.result);
        });
    };

    const handleTab = (state: DuplicateFindingState) => {
        setActiveState(state);
        setPage(1);
        setExpandedId(null);
        refetchList(state, 1);
    };

    const handlePage = (nextPage: number) => {
        setPage(nextPage);
        setExpandedId(null);
        refetchList(activeState, nextPage);
    };

    const handleRowToggle = (findingId: number) => {
        setExpandedId((current) => (current === findingId ? null : findingId));
    };

    const handleVerdictSubmitted = () => {
        setExpandedId(null);
        refetchList(activeState, page);
    };

    const handleRunScan = () => {
        const confirmed = confirm(
            'Scans every game for cross-user duplicate runs. Runs in the background; refresh for results.',
        );
        if (!confirmed) return;

        setError(null);
        startScanTransition(async () => {
            const res = await startFullScanAction();
            if ('error' in res) {
                setError(res.error);
                return;
            }
            const scanRes = await getLatestScanAction();
            if ('result' in scanRes) {
                setLatestScan(scanRes.result);
            }
        });
    };

    const totalPages = Math.max(
        1,
        Math.ceil(listResult.total / listResult.pageSize),
    );

    return (
        <div className={adminStyles.pageWide}>
            <h1 className={adminStyles.pageTitle}>Duplicate runs</h1>
            <p className={adminStyles.pageSubtitle}>
                Runs submitted by different accounts that look like the same
                attempt.
            </p>

            {latestScan && (
                <p className={styles.scanLine}>
                    Last scan: {latestScan.status} · started{' '}
                    {new Date(latestScan.startedAt).toLocaleString()}
                    {latestScan.finishedAt
                        ? ` · finished ${new Date(latestScan.finishedAt).toLocaleString()}`
                        : ' · running'}
                    {' · '}
                    {latestScan.findingsTouched} findings touched
                </p>
            )}

            {error && <div className={adminStyles.alertDanger}>{error}</div>}

            <div className={adminStyles.filterRow}>
                {STATE_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        className={
                            activeState === tab.value
                                ? adminStyles.filterChipActive
                                : adminStyles.filterChip
                        }
                        onClick={() => handleTab(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
                <button
                    className={adminStyles.btnOutline}
                    style={{ marginLeft: 'auto' }}
                    disabled={isScanning}
                    onClick={handleRunScan}
                >
                    {isScanning ? 'Starting…' : 'Run full scan'}
                </button>
            </div>

            <div className={adminStyles.panel}>
                <div className={adminStyles.panelHeader}>
                    <h4 className={adminStyles.panelTitle}>Findings</h4>
                    <span className={adminStyles.panelCount}>
                        {listResult.total} findings
                    </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className={adminStyles.table}>
                        <thead className={adminStyles.tableHeader}>
                            <tr>
                                <th>Pair</th>
                                <th>Game</th>
                                <th>Duplicates</th>
                                <th>PB</th>
                                <th>Date range</th>
                                <th>Signal</th>
                            </tr>
                        </thead>
                        <tbody className={adminStyles.tableBody}>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{
                                            textAlign: 'center',
                                            padding: '2rem',
                                        }}
                                    >
                                        <span className={adminStyles.noData}>
                                            Loading…
                                        </span>
                                    </td>
                                </tr>
                            ) : listResult.items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{
                                            textAlign: 'center',
                                            padding: '2rem',
                                        }}
                                    >
                                        <span className={adminStyles.noData}>
                                            No {activeState} findings.
                                        </span>
                                    </td>
                                </tr>
                            ) : (
                                listResult.items.map((finding) => (
                                    <FindingRow
                                        key={finding.id}
                                        finding={finding}
                                        expanded={expandedId === finding.id}
                                        onToggle={() =>
                                            handleRowToggle(finding.id)
                                        }
                                        onVerdictSubmitted={
                                            handleVerdictSubmitted
                                        }
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={adminStyles.pagination}>
                    <span className={adminStyles.paginationInfo}>
                        Page {listResult.page} of {totalPages}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className={adminStyles.btnOutline}
                            disabled={page <= 1 || isLoading}
                            onClick={() => handlePage(page - 1)}
                        >
                            Previous
                        </button>
                        <button
                            className={adminStyles.btnOutline}
                            disabled={page >= totalPages || isLoading}
                            onClick={() => handlePage(page + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FindingRow({
    finding,
    expanded,
    onToggle,
    onVerdictSubmitted,
}: {
    finding: DuplicateRunFinding;
    expanded: boolean;
    onToggle: () => void;
    onVerdictSubmitted: () => void;
}) {
    const summary = signalSummary(finding.signals);

    return (
        <>
            <tr className={styles.rowClickable} onClick={onToggle}>
                <td>
                    {finding.userA.username ?? `User ${finding.userAId}`} /{' '}
                    {finding.userB.username ?? `User ${finding.userBId}`}
                </td>
                <td>{finding.gameName}</td>
                <td>{finding.duplicateCount}</td>
                <td>
                    {finding.involvesPb ? (
                        <span className={adminStyles.badgeWarning}>PB</span>
                    ) : (
                        '-'
                    )}
                </td>
                <td>
                    {new Date(finding.firstDupEndedAt).toLocaleDateString()} –{' '}
                    {new Date(finding.lastDupEndedAt).toLocaleDateString()}
                </td>
                <td>
                    <span className={summary.className}>{summary.label}</span>
                </td>
            </tr>
            {expanded && (
                <tr className={styles.detailRow}>
                    <td colSpan={6}>
                        <FindingDetail
                            findingId={finding.id}
                            state={finding.state}
                            onVerdictSubmitted={onVerdictSubmitted}
                        />
                    </td>
                </tr>
            )}
        </>
    );
}
