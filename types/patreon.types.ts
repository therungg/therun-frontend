export interface PerMode<T> {
    dark: T;
    light: T;
}

export interface TextShadowSpec {
    color: string;
    blur: number;
}

export interface OutlineSpec {
    color: string;
    width: number;
}

export interface PatronPreferences {
    hide: boolean;
    featureInScrollbar: boolean;
    featureOnOverview: boolean;
    showIcon: boolean;

    /** @deprecated Legacy preset id. Read for rendering; never written by new UI. */
    colorPreference?: number;

    customColor?: PerMode<string> | null;
    customGradient?: PerMode<string[]> | null;

    bold?: boolean;
    italic?: boolean;

    textShadow?: PerMode<TextShadowSpec> | null;
    outline?: PerMode<OutlineSpec> | null;

    gradientAngle?: PerMode<number> | null;
    gradientAnimated?: boolean;
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
    picture: string | null;
}

export interface FeaturedPatronsResponse {
    supporterOfTheDay: FeaturedPatron | null;
    latestPatron: FeaturedPatron | null;
}
