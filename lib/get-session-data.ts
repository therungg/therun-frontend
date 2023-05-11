export const getSessionData = async (sessionId: string): Promise<string> => {
    const url = `https://6ob8kz9k4g.execute-api.eu-west-1.amazonaws.com/session?id=${sessionId}`;

    return (await (await fetch(url)).json()).result.data as string;
};
