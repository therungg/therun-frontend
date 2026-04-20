export interface BackupRecentEntry {
    uploadedAt: string;
    downloadUrl: string | null;
}

export interface BackupDailyEntry {
    date: string;
    downloadUrl: string | null;
    expiresAt: string | null;
}

export interface BackupVersionsResponse {
    recent: BackupRecentEntry[];
    daily: BackupDailyEntry[];
    canDownload: boolean;
}

export type BackupVersionsResult =
    | { status: 'ok'; data: BackupVersionsResponse }
    | { status: 'not-found' }
    | { status: 'fetch-failed' };
