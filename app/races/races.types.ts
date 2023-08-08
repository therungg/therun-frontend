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
    participantCount: number;
    readyParticipantCount: number;
    startTime?: string;

    // Only best 3 participants by pb
    topParticipants: RaceParticipant[];

    // Only available in race detail, gives full list
    participants?: RaceParticipant[];
}

export type RaceParticipant = {
    raceId: string;
    user: string;
    status: RaceParticipantStatus;
    pb: string;
};

// TODO:: determine which rules are possible
export interface RaceRule {}

export interface CreateRaceInput {
    game: string;
    category: string;
    selfJoin?: boolean;
    canStartEarly?: boolean;
    customName?: string;
}

export type WebsocketRaceMessageType = "raceUpdate" | "participantUpdate";

export interface WebsocketRaceMessage<T extends Race | RaceParticipant> {
    type: WebsocketRaceMessageType;
    data: T;
}
