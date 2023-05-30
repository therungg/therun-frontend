import { getAllLiveRuns } from "../../lib/live-runs";
import { NextResponse } from "next/server";

export const handler = async (req, res) => {
    if (req.method !== "GET") {
        return NextResponse.json(
            {
                error: "Must be GET request and supply `q` parameter",
            },
            { status: 400 }
        );
    }

    const result = await getAllLiveRuns(req.query.game, req.query.category);

    if (req.query.game) {
        res.setHeader(
            "Cache-Control",
            "s-maxage=7200, stale-while-revalidate=12000"
        );
    } else {
        res.setHeader(
            "Cache-Control",
            "s-maxage=180, stale-while-revalidate=12000"
        );
    }

    res.status(200).json(result);
};

export default handler;
