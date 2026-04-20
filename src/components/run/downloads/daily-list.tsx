'use client';

import moment from 'moment';
import { Table } from 'react-bootstrap';
import type { BackupDailyEntry } from 'types/backups.types';
import { DownloadButton } from './download-button';

interface DailyListProps {
    entries: BackupDailyEntry[];
    filenameBase: string;
}

export function DailyList({ entries, filenameBase }: DailyListProps) {
    if (entries.length === 0) {
        return (
            <div className="mb-3">
                <h4 className="fs-6 mb-2">Daily snapshots</h4>
                <p className="text-muted small mb-0">No daily snapshots yet.</p>
            </div>
        );
    }

    return (
        <div className="mb-3">
            <h4 className="fs-6 mb-2">Daily snapshots</h4>
            <Table striped bordered hover responsive size="sm">
                <thead>
                    <tr>
                        <th style={{ width: '40%' }}>Date</th>
                        <th style={{ width: '30%' }}>Expires</th>
                        <th style={{ width: '30%' }}>Download</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry) => {
                        const filename = `${filenameBase}_${entry.date}.lss`;
                        return (
                            <tr key={entry.date}>
                                <td>{entry.date}</td>
                                <td>
                                    {entry.expiresAt === null ? (
                                        <span className="text-muted">
                                            never
                                        </span>
                                    ) : (
                                        <>
                                            <div>
                                                {moment(entry.expiresAt).format(
                                                    'L',
                                                )}
                                            </div>
                                            <small className="text-muted">
                                                {moment(
                                                    entry.expiresAt,
                                                ).fromNow()}
                                            </small>
                                        </>
                                    )}
                                </td>
                                <td>
                                    <DownloadButton
                                        downloadUrl={entry.downloadUrl}
                                        filename={filename}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
}
