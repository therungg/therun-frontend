export type BoardClaimStatus = 'pending' | 'approved' | 'denied';

/** Per-game moderator roles as the /roles API knows them. */
export type BoardModRole = 'game-admin' | 'game-mod' | 'game-verifier';

/** Highest first; a reviewer may grant the requested role or any below it. */
export const BOARD_ROLE_ORDER: readonly BoardModRole[] = [
    'game-admin',
    'game-mod',
    'game-verifier',
];

export function rolesUpTo(requested: BoardModRole): BoardModRole[] {
    return BOARD_ROLE_ORDER.slice(BOARD_ROLE_ORDER.indexOf(requested));
}

export const BOARD_ROLE_LABEL: Record<BoardModRole, string> = {
    'game-admin': 'Board admin',
    'game-mod': 'Moderator',
    'game-verifier': 'Verifier',
};

/**
 * POST /board-claims. `autoApproved` is true when the applicant moderates the
 * same game on speedrun.com (checked through their Twitch-linked SRC profile);
 * the role is then granted on the spot instead of waiting for review.
 */
export type SubmitBoardClaimResult =
    | { id: number; autoApproved: false }
    | { id: number; autoApproved: true; role: BoardModRole };

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

/** Someone already holding a per-game role on the claimed board. */
export interface BoardClaimModerator {
    userId: number;
    username: string;
    picture?: string | null;
    role: BoardModRole;
}

export interface BoardClaimRequest {
    id: number;
    gameId: number;
    gameSlug: string;
    gameDisplay: string;
    userId: number;
    username: string;
    picture?: string | null;
    motivation: string;
    requestedRole: BoardModRole;
    status: BoardClaimStatus;
    signals: BoardClaimSignals;
    board?: BoardClaimBoardActivity;
    /** The board's current game-admins/game-mods; set on queue listings. */
    existingModerators?: BoardClaimModerator[];
    createdAt: string;
    decidedBy: number | null;
    decidedAt: string | null;
    denyReason: string | null;
}

export interface GameModerator {
    assignmentId: number;
    userId: number;
    username: string;
    /** Null for anonymized moderators and anyone without one. */
    picture?: string | null;
    role: BoardModRole;
    createdAt: string;
}

/**
 * Whether anyone on the team can approve a board application. Verifiers
 * can't — a verifier-only board still sends claims to the site admins.
 */
export function hasBoardMods(team: Pick<GameModerator, 'role'>[]): boolean {
    return team.some((m) => m.role !== 'game-verifier');
}
