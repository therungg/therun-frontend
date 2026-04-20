'use server';

import type { BackupVersionsResult } from 'types/backups.types';
import { getSession } from '~src/actions/session.action';

const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

export async function getBackupVersions(
    username: string,
    originalKey: string,
): Promise<BackupVersionsResult> {
    if (!BASE_URL) return { status: 'fetch-failed' };

    const session = await getSession();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (session.id) {
        headers['Authorization'] = `Bearer ${session.id}`;
    }

    // run.splitsFile arrives URL-encoded; decode before re-encoding for the
    // query param so we don't double-encode (backend wouldn't match the key).
    let decodedKey: string;
    try {
        decodedKey = decodeURIComponent(originalKey);
    } catch {
        decodedKey = originalKey;
    }

    const url = `${BASE_URL}/backups/user/${encodeURIComponent(
        username,
    )}/versions?key=${encodeURIComponent(decodedKey)}`;

    let res: Response;
    try {
        res = await fetch(url, { headers, cache: 'no-store' });
    } catch {
        return { status: 'fetch-failed' };
    }

    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'fetch-failed' };

    try {
        const data = await res.json();
        return { status: 'ok', data };
    } catch {
        return { status: 'fetch-failed' };
    }
}
