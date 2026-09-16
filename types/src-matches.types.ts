export interface SrcMatchSuggestion {
    srcUserId: string;
    srcName: string;
    clears: number;
    alsoMatches: number;
}

export interface SrcMatchRow {
    userId: number;
    username: string;
    queued: number;
    suggestions: SrcMatchSuggestion[];
    state: 'sure' | 'contested' | 'none';
}

export interface SrcMatchList {
    rows: SrcMatchRow[];
    imported: boolean;
}

export interface SrcMatchLink {
    userId: number;
    srcUserId?: string;
    srcName?: string;
}

export type SrcMatchLinkResult =
    | {
          userId: number;
          ok: true;
          srcUsername: string;
          claimedRuns: number;
          mergedRuns: number;
      }
    | {
          userId: number;
          ok: false;
          code:
              | 'user-not-found'
              | 'src-not-found'
              | 'already-linked'
              | 'already-set'
              | 'not-on-game'
              | 'error';
      };
