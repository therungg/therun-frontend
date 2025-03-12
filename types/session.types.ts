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
    | "admin" // Global admin, can do everything
    | "role-admin" // Can give people roles like event-admin, but not admin/role-admin
    | "patreon3"
    | "moderator"
    | "story-beta-user"
    | "board-admin"
    | "board-moderator"
    | "race-admin"
    | "event-admin"
    | "event-creator"
    | "patreon1"
    | "patreon2";

export interface Session {
    user: User;
    theme: "light" | "dark";
}
