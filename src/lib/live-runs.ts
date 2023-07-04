export const liveRunUrl =
    "https://pokzhwoycl3uo7n5lzh6iltyoq0iaibq.lambda-url.eu-west-1.on.aws/";

export const getAllLiveRuns = async (game = null, category = null) => {
    let url = liveRunUrl;

    if (game) {
        url += `?game=${encodeURIComponent(game)}`;
        if (category) {
            url += `&category=${encodeURIComponent(category)}`;
        }
    }

    const result = await fetch(url, { next: { revalidate: 60 } });

    return result.json();
};

export const getLiveRunsForGameCategory = async (
    game: string,
    category: string
) => {
    const result = await fetch(
        `${liveRunUrl}?game=${encodeURIComponent(
            game
        )}&category=${encodeURIComponent(category)}`,
        { next: { revalidate: 60 } }
    );

    return result.json();
};

export const getLiveRunForUser = async (username: string) => {
    const result = await fetch(`${liveRunUrl}?username=${username}`, {
        next: { revalidate: 60 },
    });

    return result.json();
};
