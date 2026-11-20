export type SrcRunConflict = {
    id: number;
    ours: Record<string, unknown>;
    theirs: Record<string, unknown>;
    createdAt: string;
};

export type SrcConflictChoice = 'ours' | 'theirs';
