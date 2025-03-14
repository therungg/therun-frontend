import { SessionError } from "~src/common/session.error";

export interface UserData {
    username: string;
    createdAt: string;
    user: string;
    picture: string;
    lastLogin: string;
    login: string;
    roles: string[];
    banned: false;
    moderatedGames: string[];
    pronouns: string;
    socials: { youtube: string; twitter: string; twitch: string };
    timezone: string;
    preferences: unknown;
    searchName: string;
}

export const getSessionData = async (sessionId: string) => {
    if (!sessionId) {
        return {} as UserData;
    }

    const url = `https://6ob8kz9k4g.execute-api.eu-west-1.amazonaws.com/session?id=${sessionId}&returnUser=true`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 0 },
        });
        const result = await response.json();
        const session = result?.result?.data as UserData;

        if (!session) {
            throw new SessionError("Session not found");
        }

        return session;
    } catch (_error) {
        throw new SessionError("An error occurred recovering session data");
    }
};
