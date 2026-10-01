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
    const at = BOARD_ROLE_ORDER.indexOf(requested);
    // A role this build doesn't know (older or newer backend) reviews as a
    // plain moderator application.
    return BOARD_ROLE_ORDER.slice(
        at === -1 ? BOARD_ROLE_ORDER.indexOf('game-mod') : at,
    );
}

/**
 * The role an application asked for. Claims filed before applicants could
 * pick a role carry none, and they were all moderator applications.
 */
export function requestedRoleOf(request: {
    requestedRole?: BoardModRole | null;
}): BoardModRole {
    const r = request.requestedRole;
    return r && BOARD_ROLE_ORDER.includes(r) ? r : 'game-mod';
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
 * What the viewer may do to one mod-team row. Anyone may step down; board
 * admins remove verifiers and moderators; only a site admin removes another
 * board admin (the backend refuses everyone else).
 */
export function teamRowAction(
    member: Pick<GameModerator, 'username' | 'role'>,
    viewer: { myUsername: string; canEdit: boolean; canRevokeAdmins: boolean },
): 'step-down' | 'remove' | null {
    if (
        viewer.myUsername &&
        member.username.toLowerCase() === viewer.myUsername.toLowerCase()
    ) {
        return 'step-down';
    }
    if (member.role === 'game-admin') {
        return viewer.canRevokeAdmins ? 'remove' : null;
    }
    return viewer.canEdit ? 'remove' : null;
}

/**
 * Whether the board has an admin. Only board admins (and site admins)
 * decide applications, so a board with mods but no admin still sends claims
 * to the site admins.
 */
export function hasBoardAdmins(team: Pick<GameModerator, 'role'>[]): boolean {
    return team.some((m) => m.role === 'game-admin');
}
