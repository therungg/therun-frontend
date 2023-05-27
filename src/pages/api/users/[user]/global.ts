import { getGlobalUser } from "../../../../lib/get-global-user";

export const handler = async (req: any, res: any) => {
    const user = req.url.replace("/api/users/", "").replace("/global", "");

    const userData = await getGlobalUser(user);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=15000");

    res.status(200)
        .setHeader("Access-Control-Allow-Origin", "*")
        .json(userData);
};

export default handler;
