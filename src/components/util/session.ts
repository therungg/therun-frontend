import { generateSession } from "../../lib/generate-session";
import { getSessionData } from "../../lib/get-session-data";

export const getSession = async (sessionId: string): Promise<any> => {
    return getSessionData(sessionId);
};

export const createNewSession = async (
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    data: any
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
