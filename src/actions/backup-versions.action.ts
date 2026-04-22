'use server';

import type {
    BackupVersionsResponse,
    BackupVersionsResult,
} from 'types/backups.types';
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

    const versionsUrl = `${BASE_URL}/backups/user/${encodeURIComponent(
        username,
    )}/versions?key=${encodeURIComponent(decodedKey)}`;
    const listingUrl = `${BASE_URL}/backups/user/${encodeURIComponent(
        username,
    )}`;
    const myUrl = `${BASE_URL}/backups/my`;

    let versionsRes: Response;
    let listingRes: Response;
    let myRes: Response | null = null;
    try {
        const reqs: Promise<Response>[] = [
            fetch(versionsUrl, { headers, cache: 'no-store' }),
            fetch(listingUrl, { headers, cache: 'no-store' }),
        ];
        if (session.id) {
            reqs.push(fetch(myUrl, { headers, cache: 'no-store' }));
        }
        const results = await Promise.all(reqs);
        versionsRes = results[0];
        listingRes = results[1];
        myRes = results[2] ?? null;
    } catch {
        return { status: 'fetch-failed' };
    }

    const viewerIsOwner =
        !!session.username &&
        session.username.toLowerCase() === username.toLowerCase();
    // /backups/my returns 200 for active patrons and grace-window users;
    // 403 for non-patrons; we skip the call entirely for anonymous viewers.
    const viewerIsSupporter = !!myRes && myRes.ok;

    if (versionsRes.status === 404) {
        return {
            status: 'not-found',
            viewerIsSupporter,
            viewerIsOwner,
        };
    }
    if (!versionsRes.ok) return { status: 'fetch-failed' };

    let versionsData: Omit<
        BackupVersionsResponse,
        'ownerTier' | 'ownerRetentionDays' | 'ownerGraceUntil' | 'viewerIsOwner'
    >;
    try {
        versionsData = await versionsRes.json();
    } catch {
        return { status: 'fetch-failed' };
    }

    let ownerTier: number | null = null;
    let ownerRetentionDays: number | null = null;
    let ownerGraceUntil: string | null = null;
    if (listingRes.ok) {
        try {
            const listingData = await listingRes.json();
            ownerTier = listingData.tier ?? null;
            ownerRetentionDays = listingData.retentionDays ?? null;
            ownerGraceUntil = listingData.graceUntil ?? null;
        } catch {
            // Tier info is best-effort; ignore parse failures.
        }
    }

    return {
        status: 'ok',
        data: {
            ...versionsData,
            ownerTier,
            ownerRetentionDays,
            ownerGraceUntil,
            viewerIsOwner,
        },
    };
}
