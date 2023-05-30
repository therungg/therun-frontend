import { NextResponse } from "next/server";
import { getTabulatedGameStats } from "../../components/game/get-tabulated-game-stats";

export const handler = async (req, res) => {
    if (req.method !== "GET") {
        return NextResponse.json(
            {
                error: "Must be GET request and supply `q` parameter",
            },
            { status: 400 }
        );
    }

    const result = await getTabulatedGameStats();

    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=1500");

    res.status(200).json(result);
};

export default handler;
