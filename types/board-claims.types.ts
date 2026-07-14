export type BoardClaimStatus = 'pending' | 'approved' | 'denied';

/** Per-game moderator roles as the /roles API knows them. */
export type BoardModRole = 'game-admin' | 'game-mod';

export interface BoardClaimSignals {
    runsOnGame: number;
    totalRuns: number;
    accountCreatedAt: string | null;
    priorApprovals: number;
    priorDenials: number;
}

export interface BoardClaimBoardActivity {
    uniqueRunners: number;
    totalFinishedRuns: number;
}

export interface BoardClaimRequest {
    id: number;
    gameId: number;
    gameSlug: string;
    gameDisplay: string;
    userId: number;
    username: string;
    motivation: string;
    status: BoardClaimStatus;
    signals: BoardClaimSignals;
    board?: BoardClaimBoardActivity;
    createdAt: string;
    decidedBy: number | null;
    decidedAt: string | null;
    denyReason: string | null;
}

export interface GameModerator {
    assignmentId: number;
    userId: number;
    username: string;
    role: BoardModRole;
    createdAt: string;
}
