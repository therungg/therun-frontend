const fetchData = async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export const getTabulatedGameStats = async () => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games/`;

    return fetchData(url);
};

export const getTabulatedGameStatsPopular = async () => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games/stats/`;

    return fetchData(url);
};
