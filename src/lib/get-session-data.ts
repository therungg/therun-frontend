import { SessionError } from "~src/common/session.error";

export const getSessionData = async (sessionId: string): Promise<unknown> => {
    if (!sessionId) {
        return {};
    }

    const url = `https://6ob8kz9k4g.execute-api.eu-west-1.amazonaws.com/session?id=${sessionId}&returnUser=true`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 60 * 60 * 2 },
        });
        const result = await response.json();
        const session = result?.result?.data;

        if (!session) {
            throw new SessionError("Session not found");
        }

        return session;
    } catch (error) {
        throw new SessionError("An error occurred recovering session data");
    }
};
