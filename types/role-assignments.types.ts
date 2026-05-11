export type GameMgmtRole =
    | 'global-admin'
    | 'series-manager'
    | 'series-admin'
    | 'series-mod'
    | 'game-admin'
    | 'game-mod'
    | 'game-verifier'
    | 'category-mod'
    | 'category-verifier';

export interface RoleAssignment {
    id: number;
    userId: number;
    role: GameMgmtRole;
    seriesId: number | null;
    gameId: number | null;
    categoryId: number | null;
    assignedBy: number | null;
    createdAt: string;
}
