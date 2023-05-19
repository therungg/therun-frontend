import { getTabulatedGameStats } from "../../components/game/get-tabulated-game-stats";

export const handler = async (req, res) => {
    if (req.method !== "GET" || !req.query.q) res.status(500);

    const result = await getTabulatedGameStats();

    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=1500");

    res.status(200).json(result);
};

export default handler;
