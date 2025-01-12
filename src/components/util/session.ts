import { generateSession } from "~src/lib/generate-session";
import { getSessionData } from "~src/lib/get-session-data";
import type { SessionPayload } from "~src/lib/generate-session";

export const getSession = async (sessionId: string) => {
    return getSessionData(sessionId);
};

export const createNewSession = async (
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    data: SessionPayload["data"],
): Promise<string> => {
    return generateSession({
        accessToken,
        refreshToken,
        expiresIn,
        data: {
            ...data,
        },
    });
};
