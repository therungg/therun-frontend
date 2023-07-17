export const getSessionData = async (sessionId: string): Promise<unknown> => {
    if (!sessionId) {
        return {};
    }
    const url = `https://6ob8kz9k4g.execute-api.eu-west-1.amazonaws.com/session?id=${sessionId}`;

    return (
        await (await fetch(url, { next: { revalidate: 60 * 60 * 2 } })).json()
    )?.result?.data;
};
