import { encodeURI } from "~src/utils/uri";

const fetchData = async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export const getGame = async (game: string) => {
    game = game.replace("   ", " + ");
    game = encodeURI(game);

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
    game = encodeURI(game);

    const globalGameData = await fetchData(
        `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}`
    );

    if (!globalGameData && game.includes(" ")) {
        return getGame(game.replace(" ", "+"));
    }

    return { ...globalGameData };
};

export const getCategory = async (game: string, category: string) => {
    game = encodeURI(game);
    category = encodeURI(category);

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}/${category}`;

    return fetchData(url);
};
