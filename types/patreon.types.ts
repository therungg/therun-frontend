export interface PatronPreferences {
    hide: boolean;
    featureOnOverview: boolean;
    colorPreference: number;
    featureInScrollbar: boolean;
    showIcon: boolean;
}

export interface Patron {
    preferences: PatronPreferences;
    tier: number;
}

export interface PatronMap {
    [PatronName: string]: Patron;
}

export interface FeaturedPatron {
    patronId: number;
    patreonName: string;
    tier: number;
    username: string | null;
    preferences: PatronPreferences | null;
}

export interface FeaturedPatronsResponse {
    supporterOfTheDay: FeaturedPatron | null;
    latestPatron: FeaturedPatron | null;
}
