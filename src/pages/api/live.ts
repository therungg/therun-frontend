import { getAllLiveRuns } from "../../lib/live-runs";

export const handler = async (req, res) => {
    if (req.method !== "GET" || !req.query.q) res.status(500);

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
