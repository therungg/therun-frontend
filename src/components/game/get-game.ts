const fetchData = async (url: string) => {
    const res = await fetch(url, { next: { revalidate: 60 } });
    const json = await res.json();

    return json.result;
};

export const getGame = async (game: string) => {
    game = game.replace("   ", " + ");
    game = encodeURIComponent(game);

    const promises = [
        fetchData(`${process.env.NEXT_PUBLIC_DATA_URL}/games/${game}`),
        fetchData(`${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}`),
    ];

    const [gameData, globalGameData] = await Promise.all(promises);

    if (!gameData && game.includes(" ")) {
        return getGame(game.replace(" ", "+"));
    }

    return { ...gameData, global: { ...globalGameData } };
};

export const getGameGlobal = async (game: string) => {
    game = game.replace("   ", " + ");
    game = encodeURIComponent(game);

    const globalGameData = await fetchData(
        `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}`
    );

    if (!globalGameData && game.includes(" ")) {
        return getGame(game.replace(" ", "+"));
    }

    return { ...globalGameData };
};

export const getCategory = async (game: string, category: string) => {
    game = encodeURIComponent(game);
    category = encodeURIComponent(category);

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}/${category}`;

    return fetchData(url);
};
