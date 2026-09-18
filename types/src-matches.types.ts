export interface SrcMatchSuggestion {
    srcUserId: string;
    srcName: string;
    clears: number;
    alsoMatches: number;
    /** 'guest-merge' when it clears queued runs; 'times' when it rests on matching board placements instead. */
    origin: 'guest-merge' | 'times';
    /** Boards the suggestion agrees on, for a 'times' suggestion. */
    boards: number;
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
    override?: boolean;
}

export type SrcMatchLinkResult =
    | {
          userId: number;
          ok: true;
          srcUsername: string;
          claimedRuns: number;
          mergedRuns: number;
          /** True when their speedrun.com runs are being pulled in the background. */
          syncQueued: boolean;
      }
    | {
          userId: number;
          ok: false;
          code: 'already-linked';
          linkedTo: { userId: number; username: string } | null;
          canOverride: boolean;
      }
    | {
          userId: number;
          ok: false;
          code:
              | 'user-not-found'
              | 'src-not-found'
              | 'already-set'
              | 'not-on-game'
              | 'error';
      };
