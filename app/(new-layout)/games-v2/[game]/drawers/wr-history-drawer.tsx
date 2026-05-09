'use client';

import { useEffect, useState } from 'react';
import { Modal, Table } from 'react-bootstrap';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { WrHistoryEntry } from '../../../../../types/leaderboards.types';

interface Props {
    show: boolean;
    onHide: () => void;
    gameSlug: string;
    categorySlug: string;
    categoryDisplay: string;
    subcategoryHash: string;
}

export function WrHistoryDrawer({
    show,
    onHide,
    gameSlug,
    categorySlug,
    categoryDisplay,
    subcategoryHash,
}: Props) {
    const [history, setHistory] = useState<WrHistoryEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!show) return;
        let cancelled = false;
        setHistory(null);
        setError(null);
        const url = `${process.env.NEXT_PUBLIC_DATA_URL}/v1/leaderboards/wr-history/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}?subcategory=${encodeURIComponent(subcategoryHash)}`;
        fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`${r.status}`);
                return r.json();
            })
            .then((j) => {
                if (cancelled) return;
                setHistory(j.result ?? []);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e.message ?? 'Failed to load');
            });
        return () => {
            cancelled = true;
        };
    }, [show, gameSlug, categorySlug, subcategoryHash]);

    return (
        <Modal show={show} onHide={onHide} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>
                    World record history — {categoryDisplay}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <p className="text-danger">
                        Failed to load WR history: {error}
                    </p>
                )}
                {!error && history === null && (
                    <p className="text-muted">Loading…</p>
                )}
                {history !== null && history.length === 0 && (
                    <p className="text-muted">No world record history yet.</p>
                )}
                {history !== null && history.length > 0 && (
                    <Table hover responsive>
                        <thead>
                            <tr>
                                <th>Runner</th>
                                <th>Time</th>
                                <th>Timing</th>
                                <th>Set</th>
                                <th>Superseded</th>
                                <th>Held for</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((wr) => {
                                const setAt = new Date(wr.setAt);
                                const supersededAt = wr.supersededAt
                                    ? new Date(wr.supersededAt)
                                    : null;
                                const heldMs =
                                    (supersededAt ?? new Date()).getTime() -
                                    setAt.getTime();
                                return (
                                    <tr key={`${wr.runnerName}-${wr.setAt}`}>
                                        <td>{wr.runnerName}</td>
                                        <td>
                                            <DurationToFormatted
                                                duration={wr.time}
                                            />
                                        </td>
                                        <td>{wr.timingMethod}</td>
                                        <td>{setAt.toLocaleDateString()}</td>
                                        <td>
                                            {supersededAt
                                                ? supersededAt.toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td>
                                            <DurationToFormatted
                                                duration={heldMs}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </Modal.Body>
        </Modal>
    );
}
