'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Form, Spinner, Table } from 'react-bootstrap';
import type {
    SrcUserImportGameResult,
    SrcUserImportJob,
    SrcUserSyncStatus,
} from 'types/src-import.types';
import { canUndoImport } from 'types/src-import.types';
import {
    getMyImportJob,
    getMySyncStatus,
    startMyImport,
    startMyImportFromExport,
    undoMyImport,
} from '~src/actions/src-import.action';
import styles from '~src/components/css/User.module.scss';

const POLL_MS = 5000;

function isActive(job: SrcUserImportJob | null): boolean {
    return !!job && (job.status === 'queued' || job.status === 'running');
}

function outcomeVariant(outcome: SrcUserImportGameResult['outcome']): string {
    if (outcome === 'imported') return 'success';
    if (outcome === 'skipped') return 'secondary';
    return 'danger';
}

function reasonText(g: SrcUserImportGameResult): string | null {
    if (g.outcome === 'imported' || !g.reason) return null;
    if (g.reason === 'game-busy') {
        return 'Another import is running on this game — retry later.';
    }
    if (g.reason.startsWith('plan-conflicts:')) {
        const n = g.reason.split(':')[1];
        return `Needs a moderator to resolve ${n} board conflict(s) before these runs can import.`;
    }
    if (g.reason === 'staging') return 'In progress…';
    return g.reason;
}

export function SrcImportTab() {
    const [job, setJob] = useState<SrcUserImportJob | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'username' | 'export'>('username');
    const [srcUsername, setSrcUsername] = useState('');
    const [confirmUndo, setConfirmUndo] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [sync, setSync] = useState<SrcUserSyncStatus | null>(null);

    useEffect(() => {
        getMySyncStatus().then((r) => {
            if (!('error' in r)) setSync(r.status);
        });
    }, []);

    const refresh = useCallback(async () => {
        const res = await getMyImportJob();
        if ('error' in res) {
            setError(res.error);
            return null;
        }
        setJob(res.job);
        return res.job;
    }, []);

    // Initial load.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await getMyImportJob();
            if (cancelled) return;
            if ('error' in res) setError(res.error);
            else setJob(res.job);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Poll while a job is active.
    useEffect(() => {
        if (!isActive(job)) return;
        const id = setInterval(() => {
            void refresh();
        }, POLL_MS);
        return () => clearInterval(id);
    }, [job, refresh]);

    const submitUsername = async () => {
        const name = srcUsername.trim();
        if (!name) {
            setError('Enter your speedrun.com username.');
            return;
        }
        setBusy(true);
        setError(null);
        const res = await startMyImport(name);
        if ('error' in res) setError(res.error);
        else await refresh();
        setBusy(false);
    };

    const submitExport = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) {
            setError('Choose your speedrun.com export file first.');
            return;
        }
        setBusy(true);
        setError(null);
        let parsed: unknown;
        try {
            parsed = JSON.parse(await file.text());
        } catch {
            setError('That file is not valid JSON.');
            setBusy(false);
            return;
        }
        const res = await startMyImportFromExport(parsed);
        if ('error' in res) setError(res.error);
        else await refresh();
        setBusy(false);
    };

    const runUndo = async () => {
        setBusy(true);
        setError(null);
        const res = await undoMyImport();
        if ('error' in res) setError(res.error);
        else await refresh();
        setConfirmUndo(false);
        setBusy(false);
    };

    if (loading) {
        return (
            <div className="py-4">
                <Spinner animation="border" size="sm" /> Loading import status…
            </div>
        );
    }

    const active = isActive(job);

    return (
        <div className="py-2">
            <h2 className={styles.sectionHeading}>Import runs</h2>
            <p className="text-body-secondary">
                Import your full speedrun.com run history — every game and board
                — into therun.gg. Runs are matched to your account through your
                linked Twitch, so you can only import your own.
            </p>

            {sync && (
                <Alert
                    variant={sync.optOut ? 'secondary' : 'info'}
                    className="mb-3"
                >
                    <strong>Automatic sync</strong>{' '}
                    {sync.optOut
                        ? 'is off.'
                        : `runs daily. Last sync: ${sync.lastAt ? new Date(sync.lastAt).toLocaleString() : 'not yet'}.`}{' '}
                    {sync.lastJob?.summary && (
                        <span>
                            Last run: {sync.lastJob.summary.added} added,{' '}
                            {sync.lastJob.summary.linked} linked,{' '}
                            {sync.lastJob.summary.updated} updated,{' '}
                            {sync.lastJob.summary.vanished} no longer on
                            speedrun.com.
                        </span>
                    )}{' '}
                    <a href="/settings/sync">Settings</a>
                </Alert>
            )}

            {error && (
                <Alert
                    variant="danger"
                    onClose={() => setError(null)}
                    dismissible
                >
                    {error}
                </Alert>
            )}

            {job && <JobProgress job={job} />}

            {active ? (
                <div className="d-flex align-items-center gap-2 mt-3">
                    <Spinner animation="border" size="sm" />
                    <span>
                        Import running — this page updates automatically.
                    </span>
                </div>
            ) : (
                <div className="mt-3">
                    <div className="btn-group mb-3" role="group">
                        <Button
                            variant={
                                mode === 'username'
                                    ? 'primary'
                                    : 'outline-secondary'
                            }
                            onClick={() => setMode('username')}
                        >
                            By username
                        </Button>
                        <Button
                            variant={
                                mode === 'export'
                                    ? 'primary'
                                    : 'outline-secondary'
                            }
                            onClick={() => setMode('export')}
                        >
                            Upload export file
                        </Button>
                    </div>

                    {mode === 'username' ? (
                        <Form.Group className="mb-3" style={{ maxWidth: 420 }}>
                            <Form.Label>speedrun.com username</Form.Label>
                            <Form.Control
                                value={srcUsername}
                                onChange={(e) => setSrcUsername(e.target.value)}
                                placeholder="your speedrun.com username"
                                disabled={busy}
                            />
                            <Form.Text className="text-body-secondary">
                                We fetch your runs directly from speedrun.com.
                            </Form.Text>
                        </Form.Group>
                    ) : (
                        <Form.Group className="mb-3" style={{ maxWidth: 420 }}>
                            <Form.Label>
                                speedrun.com export file (JSON)
                            </Form.Label>
                            <Form.Control
                                type="file"
                                accept="application/json,.json"
                                ref={fileRef}
                                disabled={busy}
                            />
                            <Form.Text className="text-body-secondary">
                                From speedrun.com → settings → export your data.
                                Faster for large histories, but a run with both
                                RTA and IGT keeps only one clock, and unknown
                                subcategory tags are dropped.
                            </Form.Text>
                        </Form.Group>
                    )}

                    <div className="d-flex gap-2">
                        <Button
                            variant="primary"
                            disabled={busy}
                            onClick={
                                mode === 'username'
                                    ? submitUsername
                                    : submitExport
                            }
                        >
                            {busy ? 'Starting…' : 'Start import'}
                        </Button>
                        {canUndoImport(job) &&
                            (confirmUndo ? (
                                <>
                                    <Button
                                        variant="danger"
                                        disabled={busy}
                                        onClick={runUndo}
                                    >
                                        {busy ? 'Undoing…' : 'Confirm remove'}
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        disabled={busy}
                                        onClick={() => setConfirmUndo(false)}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="outline-danger"
                                    disabled={busy}
                                    onClick={() => setConfirmUndo(true)}
                                >
                                    Remove imported runs
                                </Button>
                            ))}
                    </div>

                    {confirmUndo && (
                        <Alert variant="warning" className="mt-3">
                            This removes every run from your speedrun.com
                            import. If someone else has since re-imported the
                            same runs, those stay; if you&apos;re the most
                            recent importer of a run also imported by a
                            moderator, it will be removed too and comes back the
                            next time either of you re-imports.
                        </Alert>
                    )}
                </div>
            )}
        </div>
    );
}

function JobProgress({ job }: { job: SrcUserImportJob }) {
    const statusVariant =
        job.status === 'done'
            ? 'success'
            : job.status === 'failed'
              ? 'danger'
              : 'info';
    return (
        <div className="mt-3">
            <div className="d-flex align-items-center gap-2 mb-2">
                <Badge bg={statusVariant}>{job.status}</Badge>
                <span className="text-body-secondary">phase: {job.phase}</span>
                {job.undoneAt && <Badge bg="secondary">undone</Badge>}
            </div>

            {job.error && (
                <Alert variant="danger" className="py-2">
                    {job.error}
                </Alert>
            )}

            <div className="d-flex flex-wrap gap-4 mb-2">
                <Stat
                    label="Games"
                    value={`${job.gamesDone} / ${job.gamesTotal}`}
                />
                <Stat label="Runs imported" value={job.runsImported} />
                <Stat label="Runs skipped" value={job.runsSkipped} />
                {job.phase === 'fetch' && (
                    <Stat label="Runs fetched" value={job.runsFetched} />
                )}
            </div>

            {job.gameResults.length > 0 && (
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    <Table size="sm" hover className="mb-0">
                        <thead>
                            <tr>
                                <th>Game</th>
                                <th>Result</th>
                                <th className="text-end">Imported</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {job.gameResults.map((g) => {
                                const note = reasonText(g);
                                return (
                                    <tr key={g.srcGameId}>
                                        <td>
                                            {g.srcGameName}
                                            {g.autoCreatedGame && (
                                                <Badge
                                                    bg="info"
                                                    className="ms-2"
                                                >
                                                    new
                                                </Badge>
                                            )}
                                        </td>
                                        <td>
                                            <Badge
                                                bg={outcomeVariant(g.outcome)}
                                            >
                                                {g.outcome}
                                            </Badge>
                                        </td>
                                        <td className="text-end">
                                            {g.imported}
                                        </td>
                                        <td className="text-body-secondary">
                                            {note}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div className="fs-5 fw-semibold">{value}</div>
            <div className="text-body-secondary small">{label}</div>
        </div>
    );
}
