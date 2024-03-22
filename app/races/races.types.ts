import { PaginatedData } from "~src/components/pagination/pagination.types";

export type RaceStatus =
    | "pending"
    | "starting"
    | "progress"
    | "finished"
    | "aborted";
export type RaceParticipantStatus =
    | "joined"
    | "ready"
    | "started"
    | "finished"
    | "confirmed"
    | "abandoned"
    | "unjoined";

export type RaceStartMethodType = "everyone-ready" | "datetime" | "moderator";

export interface Race {
    raceId: string;
    creator: string;
    createdAt: string;
    game: string;
    displayGame: string;
    category: string;
    displayCategory: string;
    gameImage: string;
    description: string;
    canStartEarly: boolean;
    status: RaceStatus;
    customRules: RaceRule[];
    customName: string;
    visible: boolean;
    // Not available in paginated races due to too much data
    participants?: RaceParticipantWithLiveData[];
    // Only available in paginated races because pending races have no results yet
    results: RaceResult[] | null;
    moderators: string[];
    participantCount: number;
    readyParticipantCount: number;
    finishedParticipantCount: number;
    prizepool?: number;
    prizepoolDistribution?: number[];
    startTime: string | null;
    endTime: string | null;
    firstFinishedParticipantTime: number | null;
    isTestRace: boolean;
    increment?: number;
    gameIncrement?: number;
    isFeatured: boolean;
    nextRaceId?: string;
    previousRaceId?: string;
    forceStream?: string;
    requiresPassword?: boolean;
    ranked: boolean;
    autoConfirm: boolean;
    countdownSeconds: number;
    startMethod: RaceStartMethodType;
    willStartAt?: string | null;
    timeLeaderboards: RaceTimeStat[];
    mmrLeaderboards: RaceMmrStat[];
}

export interface RaceResult {
    position: number;
    name: string;
    status: RaceParticipantStatus;
    finalTime: number | null;
}

export type RaceParticipant = {
    raceId: string;
    user: string;
    status: RaceParticipantStatus;
    pb: string;
    disqualified: boolean;
    disqualifiedBy: string | null;
    disqualifiedReason: string | null;
    finalTime: number | null;
    joinedAtDate: string | null;
    readyAtDate: string | null;
    finishedAtDate: string | null;
    confirmedAtDate: string | null;
    abandondedAtDate: string | null;
    ratingBefore: number;
    ratingAfter: number | null;
    comment?: string | null;
};

export interface RaceParticipantWithLiveData extends RaceParticipant {
    liveData?: RaceLiveData;
}

export interface RaceLiveData {
    // How far along is a runner if you look at the split amount (useful when theres no pb yet, to at least have an indication)
    runPercentageSplits: number;
    // How far along is a runner compared to pb (best way to see how far someone is). Can be null if runner has no pb yet
    runPercentageTime: number | null;
    currentSplitIndex: number;
    totalSplits: number;
    currentTime: number;
    gameTime: boolean;
    // Important: with this info we can know how far into a split the runner is. Useful to infer percentage in between splits.
    startedAt: number;
    splitStartedAt: number;
    currentSplitName: string;
    // Not very stable, but can use it
    currentPrediction: number | null;
    streaming: boolean;
    // +- to pb currently
    delta: number;
    runFinished: boolean;
    bestPossibleTime: number | null;
    timeToNextSplit?: number;
}

// TODO:: determine which rules are possible
export interface RaceRule {}

export interface CreateRaceInput {
    game: string;
    category: string;
    id?: string;
    description?: string;
    selfJoin?: boolean;
    canStartEarly?: boolean;
    customName?: string;
    previousRaceId?: string;
    password?: string;
    forceStream?: string;
    ranked?: boolean;
    autoConfirm?: boolean;
    countdown?: number;
    startMethod?: RaceStartMethodType;
    startTime?: string;
}

export interface EditRaceInput {
    description?: string;
    customName?: string;
    forceStream?: string;
}

export type WebsocketRaceMessageType =
    | "raceUpdate"
    | "participantUpdate"
    | "message";

export interface WebsocketRaceMessage<
    T extends Race | RaceParticipant | RaceMessage,
> {
    type: WebsocketRaceMessageType;
    data: T;
}

export type PaginatedRaces = PaginatedData<Race>;

export type RaceStatType =
    | "global"
    | "game"
    | "game#category"
    | "user"
    | "game#user"
    | "game#category#user";

export interface Stats {
    type: RaceStatType;
    value: string;
    totalRaces: number;
    finishPercentage: number;
    totalRaceTime: number;
    averageRaceTime: number;
}

export interface GlobalStats extends Stats {
    type: "global";
    value: "global";
    totalParticipations: number;
    totalFinishedParticipations: number;
}

export interface SpecificStats extends Stats {
    displayValue: string;
}

export interface GameStats extends SpecificStats {
    type: "game" | "game#category";
    image: string;
    totalParticipations: number;
    totalFinishedParticipations: number;
}

export interface CategoryStats extends GameStats {
    bestMmrs: RaceMmrStat[];
    bestTimes: RaceTimeStat[];
}

export interface UserStats extends SpecificStats {
    totalFinishedRaces: number;
    rating: number;
    racePb: number;
    image: string;
    rankings: [
        RaceRanking<"mmr">,
        RaceRanking<"time">,
        RaceRanking<"timeMonth">,
    ];
}

export interface RaceMessage<T = RaceMessageData> {
    raceId: string;
    time: string;
    message?: string;
    data?: T;
    type: RaceMessageType;
}

export interface RaceMessageData {}

export interface RaceMessageUserData {
    user: string;
}

export interface RaceMessageParticipantCommentData extends RaceMessageUserData {
    comment: string;
}

export interface RaceMessageParticipantSplitData extends RaceMessageUserData {
    splitName: string;
    time: number;
    percentage: number;
}

export interface RaceMessageParticipantTimeData extends RaceMessageUserData {
    time: number;
}

export interface RaceMessageModeratorData extends RaceMessageData {
    moderator: string;
}

export type RaceMessageType =
    | "race-created"
    | "race-edited"
    | "race-starting"
    | "race-start-canceled"
    | "race-started"
    | "race-abort"
    | "race-finish"
    | "race-rated"
    | "race-stats-parsed"
    | "race-leaderboards-updated"
    | "race-reset"
    | "race-moderator-start"
    | "race-moderator-start-fail"
    | "race-admin-kick"
    | "participant-join"
    | "participant-unjoin"
    | "participant-ready"
    | "participant-unready"
    | "participant-split"
    | "participant-abandon"
    | "participant-disqualified"
    | "participant-undo-abandon"
    | "participant-finish"
    | "participant-undo-finish"
    | "participant-confirm"
    | "participant-undo-confirm"
    | "participant-comment"
    | "chat";

/**
 * -------------- RESPONSES ------------------
 */

export interface RaceGameStatsByGame {
    stats: GameStats;
    categories: GameStats[];
}

export interface RaceGameStatsByGameWithCategoryStats
    extends RaceGameStatsByGame {
    categories: CategoryStats[];
}

export interface RaceGameStatsByCategory {
    stats: GameStats;
    users: UserStats[];
}

export interface DetailedUserStats {
    globalStats: UserStats;
    categoryStats: UserStats[];
}

export type PaginatedRaceTimeStats = PaginatedData<RaceTimeStat>;
export type PaginatedRaceMmrStats = PaginatedData<RaceMmrStat>;

export interface RaceTimeStat {
    user: string;
    time: number;
}

export interface RaceMmrStat {
    user: string;
    mmr: number;
}

export interface RaceRanking<T extends "mmr" | "time" | "timeMonth"> {
    score: number;
    rank: number;
    type: T;
}
