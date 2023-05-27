import { getGameGlobal } from "../../../../components/game/get-game";

export const handler = async (req: any, res: any) => {
    const game = decodeURIComponent(
        req.url
            .replace("/api/games/", "")
            .replace("global", "")
            .replace("/", "")
    );

    const gameData = await getGameGlobal(game);

    res.setHeader("Cache-Control", "s-maxage=240, stale-while-revalidate=1500");

    res.status(200).json({ ...gameData });
};

export default handler;
