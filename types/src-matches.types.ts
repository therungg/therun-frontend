export interface SrcMatchSuggestion {
    srcUserId: string;
    srcName: string;
    clears: number;
    alsoMatches: number;
}

export interface SrcMatchPb {
    categoryId: number;
    /** categories.display */
    category: string;
    /** '' for none, else "Name=Value|Name=Value", e.g. "Platform=PC|Glitches=No". */
    subcategoryKey: string;
    /** ms, on the clock the category ranks by */
    timeMs: number;
    timing: 'realtime' | 'gametime';
    /** 1-based position on that board */
    rank: number;
}

export interface SrcMatchRow {
    userId: number;
    username: string;
    queued: number;
    suggestions: SrcMatchSuggestion[];
    state: 'sure' | 'contested' | 'none';
    pbs: SrcMatchPb[];
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
