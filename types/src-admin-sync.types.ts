export interface SrcUsernameRequest {
    id: number;
    userId: number;
    username: string;
    srcUserId: string;
    srcUsername: string;
    knownSrcUsername: string | null;
    createdAt: string;
    runCount: number;
    matchedRuns: number | null;
}
