export type Capability =
    | 'manage_runs'
    | 'manage_participants'
    | 'edit_settings'
    | 'manage_staff'
    | 'lifecycle';

export const CAPABILITIES: Capability[] = [
    'manage_runs',
    'manage_participants',
    'edit_settings',
    'manage_staff',
    'lifecycle',
];

export interface Social {
    display: string;
    urlDisplay: string;
    url: string;
}

export interface StaffEntry {
    user: string;
    capabilities: Capability[];
}

export interface DateRange {
    startDate: string;
    endDate: string;
}

export interface GameCategory {
    game: string;
    category: string;
}

export interface ExcludedRun {
    user: string;
    startedAt: string;
}

export interface CustomRun {
    user: string;
    date: string;
    time: string;
}

export interface TournamentSocials {
    twitch?: Social;
    twitter?: Social;
    youtube?: Social;
    discord?: Social;
    facebook?: Social;
    matcherino?: Social;
}

export interface Tournament {
    id?: number;
    name: string;
    description?: string;
    rules?: string[];
    socials?: TournamentSocials;
    startDate: string;
    endDate: string;
    admins: string[];
    staff: StaffEntry[];
    eligiblePeriods: DateRange[];
    eligibleUsers: string[] | null;
    eligibleRuns: GameCategory[];
    ineligibleUsers: string[] | null;
    url?: string;
    pointDistribution?: number[] | null;
    customRuns?: CustomRun[] | null;
    excludedRuns: ExcludedRun[];
    gameTime?: boolean;
    logoUrl?: string;
    minimumTimeSeconds?: number;
    shortName?: string;
    forceStream?: string;
    hide: boolean;
    qualifier?: string;
    parentTournamentName?: string;
    parentTournamentSequence?: number;
    raceId?: string;
    gameImage?: string;
    organizer?: string;
    lockedAt?: string | null;
    finalizedAt?: string | null;
    leaderboards?: unknown;
}

export type ParticipantStatus = 'eligible' | 'banned';

export interface Participants {
    eligibleUsers: string[] | null;
    ineligibleUsers: string[] | null;
}
