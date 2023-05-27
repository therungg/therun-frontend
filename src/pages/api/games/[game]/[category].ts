import { getCategory } from "../../../../components/game/get-game";

export const handler = async (req: any, res: any) => {
    const gameCategory = req.url.replace("/api/games/", "").split("/");

    const game = decodeURIComponent(gameCategory[0]);
    const category = decodeURIComponent(gameCategory[1]);

    const gameData = await getCategory(game, category);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=1500");

    res.status(200).json({ ...gameData });
};

export default handler;
