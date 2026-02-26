export type ExclusionType = 'user' | 'game' | 'category' | 'run';

export interface ExclusionRule {
    id: number;
    type: ExclusionType;
    targetId: number;
    reason: string | null;
    excludedBy: number;
    createdAt: string;
}
