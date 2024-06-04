export interface User {
    id: string;
    username: string;
    picture: string;
    roles?: Role[];
    moderatedGames?: string[];
    sessionError?: string;
}

export type Role =
    | "admin"
    | "patreon3"
    | "moderator"
    | "board-admin"
    | "board-moderator"
    | "race-admin"
    | "patreon1"
    | "patreon2";

export interface Session {
    user: User;
    theme: "light" | "dark";
}
