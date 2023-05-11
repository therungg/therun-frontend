import { getLiveRunForUser } from "../../../lib/live-runs";

export const handler = async (req: any, res: any) => {
    const user = req.url.replace("/api/live/", "");

    const result = await getLiveRunForUser(user);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=1500");

    res.status(200).setHeader("Access-Control-Allow-Origin", "*").json(result);
};

export default handler;
