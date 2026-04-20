'use client';

import moment from 'moment';
import { Table } from 'react-bootstrap';
import type { BackupRecentEntry } from 'types/backups.types';
import { DownloadButton } from './download-button';

interface RecentListProps {
    entries: BackupRecentEntry[];
    filenameBase: string;
}

export function RecentList({ entries, filenameBase }: RecentListProps) {
    if (entries.length === 0) {
        return (
            <div className="mb-3">
                <h4 className="fs-6 mb-2">Recent (last 5 uploads)</h4>
                <p className="text-muted small mb-0">
                    No recent snapshots yet.
                </p>
            </div>
        );
    }

    return (
        <div className="mb-3">
            <h4 className="fs-6 mb-2">Recent (last 5 uploads)</h4>
            <Table striped bordered hover responsive size="sm">
                <thead>
                    <tr>
                        <th style={{ width: '70%' }}>Uploaded</th>
                        <th style={{ width: '30%' }}>Download</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry) => {
                        const ts = moment(entry.uploadedAt);
                        const filename = `${filenameBase}_${ts.format(
                            'YYYY-MM-DD-HHmm',
                        )}.lss`;
                        return (
                            <tr key={entry.uploadedAt}>
                                <td>
                                    <div>{ts.format('L LT')}</div>
                                    <small className="text-muted">
                                        {ts.fromNow()}
                                    </small>
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
