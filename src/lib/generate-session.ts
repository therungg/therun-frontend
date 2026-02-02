'use server';

export interface SessionPayload {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    data: {
        username: string;
        picture: string;
    };
}

export const generateSession = async (
    data: SessionPayload,
): Promise<string> => {
    const url =
        'https://6ob8kz9k4g.execute-api.eu-west-1.amazonaws.com/session';
    return (
        await (
            await fetch(url, {
                method: 'POST',
                body: JSON.stringify(data),
            })
        ).json()
    ).result;
};
