interface PatronPreferences {
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
