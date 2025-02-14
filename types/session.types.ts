export interface User {
    id: string;
    roles?: Role[];
    moderatedGames?: string[];
    sessionError?: string;
    pronouns?: string;

    username: string;
    createdAt: string;
    user: string;
    picture: string;
    lastLogin: string;
    login: string;
    banned: false;
    socials: { youtube: string; twitter: string; twitch: string };
    timezone: string;
    preferences: unknown;
    searchName: string;
}

export type Role =
    | "admin"
    | "patreon3"
    | "moderator"
    | "story-beta-user"
    | "board-admin"
    | "board-moderator"
    | "race-admin"
    | "patreon1"
    | "patreon2";

export interface Session {
    user: User;
    theme: "light" | "dark";
}
