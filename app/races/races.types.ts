export type RaceStatus = "pending" | "progress" | "finished" | "aborted";
export type RaceParticipantStatus =
    | "joined"
    | "started"
    | "finished"
    | "abandoned"
    | "unjoined";

export interface Race {
    raceId: string;
    creator: string;
    createdAt: string;
    startsAt?: string | null;
    startedAt?: string | null;
    game: string;
    category: string;
    canStartEarly: boolean;
    status: RaceStatus;
    customRules: RaceRule[];
    customName: string;
    visible: boolean;
}

export type RaceParticipant = {
    raceId: string;
    user: string;
    status: RaceParticipantStatus;
};

// TODO:: determine which rules are possible
export interface RaceRule {}

export interface CreateRaceInput {
    game: string;
    category: string;
    canStartEarly?: boolean;
    customName?: string;
}
