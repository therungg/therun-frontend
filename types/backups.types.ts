export interface BackupRecentEntry {
    uploadedAt: string;
    downloadUrl: string | null;
}

export interface BackupDailyEntry {
    date: string;
    downloadUrl: string | null;
    expiresAt: string | null;
    attemptCount: number | null;
    finishedRunCount: number | null;
    pbRealtimeMs: number | null;
    pbGametimeMs: number | null;
    sumOfBestMs: number | null;
}

export interface BackupVersionsResponse {
    recent: BackupRecentEntry[];
    daily: BackupDailyEntry[];
    canDownload: boolean;
    ownerTier: number | null;
    ownerRetentionDays: number | null;
    ownerGraceUntil: string | null;
    viewerIsOwner: boolean;
}

export type BackupVersionsResult =
    | { status: 'ok'; data: BackupVersionsResponse }
    | {
          status: 'not-found';
          viewerIsSupporter: boolean;
          viewerIsOwner: boolean;
      }
    | { status: 'fetch-failed' };
