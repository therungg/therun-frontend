import advancedUserStats from "../../../../lib/advanced-user-stats";

export const handler = async (req: any, res: any) => {
    const user = req.url.replace("/api/users/", "").replace("/advanced", "");

    const userData = await advancedUserStats(user, "0");

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=15000");

    res.status(200)
        .setHeader("Access-Control-Allow-Origin", "*")
        .json(userData);
};

export default handler;
